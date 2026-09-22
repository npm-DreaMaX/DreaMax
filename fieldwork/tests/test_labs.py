"""Numerical, state-boundary, and scheduling invariants for teaching experiments."""

import contextlib
import io
import json
import math
import random
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from labs import agent, evaluation, gradients, mixture, moe, preference, rollout, systems, torch_profile
from labs.common import softmax, softplus
from labs.run import load_config, main


class NumericalTests(unittest.TestCase):
    def test_softmax_and_softplus_extreme_inputs(self):
        probabilities = softmax([1000, 1001, -1000])
        self.assertAlmostEqual(sum(probabilities), 1)
        self.assertTrue(all(math.isfinite(value) for value in probabilities))
        self.assertEqual(softplus(-1000), 0)
        self.assertEqual(softplus(1000), 1000)

    def test_reverse_mode_matches_finite_difference_and_reduces_loss(self):
        result = gradients.run(load_config("gradients"), 7)
        self.assertLess(result["max_gradient_error"], 1e-8)
        self.assertLess(result["final_loss"], result["initial_loss"] / 10)
        self.assertEqual(result["graph"][-1]["gradient"], 1)

    def test_shared_node_accumulates_both_gradient_paths(self):
        x = gradients.Value(3)
        shared = x * x
        loss = shared + shared
        loss.backward()
        self.assertEqual(x.grad, 12)
        loss.backward()  # This implementation resets, rather than accumulating, between calls.
        self.assertEqual(x.grad, 12)

    def test_dpo_derivative_and_reference_identity(self):
        for theta, reference_theta, delta, beta in [(-0.4, 0.1, 2, 0.2), (1.1, -0.2, -0.8, 0.7), (0, 0, 0, 1)]:
            loss, derivative, _ = preference.dpo_loss_gradient(theta, reference_theta, delta, beta)
            epsilon = 1e-5
            numerical = (preference.dpo_loss_gradient(theta + epsilon, reference_theta, delta, beta)[0]
                         - preference.dpo_loss_gradient(theta - epsilon, reference_theta, delta, beta)[0]) / (2 * epsilon)
            self.assertAlmostEqual(derivative, numerical, places=8)
            self.assertGreaterEqual(loss, 0)
        self.assertAlmostEqual(preference.dpo_loss_gradient(0.2, 0.2, 4, 0.1)[0], math.log(2))

    def test_dpo_rejects_negative_beta(self):
        with self.assertRaises(ValueError):
            preference.dpo_loss_gradient(0, 0, 1, -0.1)

    def test_dpo_real_parameter_update_reduces_objective(self):
        result = preference.run(load_config("preference"), 7)
        self.assertLess(result["gradient_error"], 1e-8)
        self.assertLess(result["final_loss"], result["initial_loss"])
        self.assertGreater(result["final_theta"], -0.5)


class DataAndRoutingTests(unittest.TestCase):
    def test_domain_focus_changes_capability_and_replay_trades_it_off(self):
        result = mixture.run(load_config("mixture"), 7)
        base = result["base"]["validation_mse"]
        focused = result["focused_mid_training"]["validation_mse"]
        replay = result["mid_training_with_replay"]["validation_mse"]
        self.assertLess(focused["A"], base["A"])
        self.assertGreater(focused["B"], base["B"])
        self.assertLess(replay["B"], focused["B"])
        self.assertGreater(replay["A"], focused["A"])
        self.assertEqual(sum(result["base"]["sample_counts"].values()), 120 * 64)

    def test_probability_outside_simplex_rejected(self):
        with self.assertRaises(ValueError):
            mixture.run({"base_probability_a": 1.2}, 7)

    def test_expert_capacity_conservation_and_partial_drop(self):
        result = moe.route([[10.0, 0.0]] * 4, top_k=1, capacity_factor=1)
        self.assertEqual(result["requested_assignments"], [4, 0])
        self.assertEqual(result["accepted_assignments"], [2, 0])
        self.assertEqual(result["dropped_assignments"], 2)
        self.assertEqual(result["fully_dropped_tokens"], 2)
        self.assertEqual(sum(result["accepted_assignments"]) + result["dropped_assignments"], 4)

    def test_bias_intervention_reduces_hotspot(self):
        result = moe.run(load_config("moe"), 7)
        self.assertLess(result["bias_removed_router"]["dropped_assignments"], result["biased_router"]["dropped_assignments"])
        self.assertLess(result["bias_removed_router"]["max_to_mean_load"], result["biased_router"]["max_to_mean_load"])

    def test_invalid_router_shape_rejected(self):
        with self.assertRaises(ValueError):
            moe.route([[1, 2], [1]], 1, 1)
        with self.assertRaises(ValueError):
            moe.route([[1, 2]], 3, 1)


class AgentTests(unittest.TestCase):
    def test_environment_protocol_and_separate_verifier(self):
        task = agent.Task("test", 8, 3, "difference")
        environment = agent.ArithmeticEnvironment(task)
        self.assertNotIn("operands", environment.observe())
        for action in ("read", "subtract", "submit"):
            response = environment.step(action)
            self.assertNotIn("reward", response)
            self.assertNotIn("target", response["observation"])
        self.assertTrue(environment.done)
        self.assertEqual(agent.verify(task, environment.answer), 1)
        self.assertEqual(agent.verify(task, 11), 0)
        self.assertEqual(agent.verify(task, True), 0)
        with self.assertRaises(ValueError):
            environment.step("read")

    def test_invalid_actions_and_timeout_do_not_submit(self):
        task = agent.Task("test", 8, 3, "sum")
        environment = agent.ArithmeticEnvironment(task)
        response = environment.step("arbitrary_shell_command")
        self.assertEqual(response["status"], "invalid_action")
        self.assertTrue(response["done"])
        policy = agent.make_policy()
        policy[("sum", "start")] = [100, -100, -100, -100]
        result = agent.rollout(policy, task, random.Random(1), max_steps=1)
        self.assertEqual(result["terminal_reason"], "timeout")
        self.assertIsNone(result["submission"])
        self.assertEqual(result["reward"], 0)

    def test_advantage_handles_all_failure_without_nan(self):
        self.assertEqual(agent.group_advantages([0, 0, 0]), [0, 0, 0])
        self.assertEqual(agent.group_advantages([1, 1]), [0, 0])
        advantage = agent.group_advantages([0, 0, 1, 1])
        self.assertEqual(sum(advantage), 0)
        self.assertEqual(advantage, [-1, -1, 1, 1])

    def test_policy_actually_learns_and_transfers_operand_values(self):
        result = agent.run(load_config("agent"), 7)
        self.assertLess(result["before"]["success_rate"], 0.1)
        self.assertGreater(result["after"]["success_rate"], 0.8)
        self.assertEqual(result["train_episodes"], 100 * 12 * 16)
        for trajectory in result["trajectories"]:
            self.assertEqual(trajectory["policy_version"], 100)
            for decision in trajectory["decisions"]:
                if "operands" in decision["observation"]:
                    self.assertTrue(all(101 <= operand <= 200 for operand in decision["observation"]["operands"]))


class SchedulingTests(unittest.TestCase):
    def test_simple_sync_schedule_is_analytically_known(self):
        result = rollout.synchronous([2, 2, 2, 2], workers=2, batch_size=2, training_seconds=1)
        self.assertEqual(result["simulated_seconds"], 6)
        self.assertEqual(result["accepted_trajectories"], 4)
        self.assertEqual(result["accepted_max_lag"], 0)

    def test_async_rejects_stale_and_accounts_for_every_task(self):
        result = rollout.asynchronous([30, 1, 1, 1, 1, 1, 1, 1], workers=2, batch_size=1,
                                      training_seconds=0.1, max_policy_lag=0)
        self.assertGreater(result["rejected_stale_trajectories"], 0)
        self.assertEqual(result["accepted_max_lag"], 0)
        self.assertEqual(result["accepted_trajectories"] + result["rejected_stale_trajectories"], 8)
        self.assertEqual(len({row["task"] for row in result["trajectories"]}), 8)
        self.assertTrue(all(row["lag"] <= 0 for row in result["trajectories"] if row["status"] == "accepted"))

    def test_final_partial_batch_is_trained(self):
        result = rollout.asynchronous([1, 1, 1], workers=2, batch_size=8, training_seconds=1, max_policy_lag=1)
        self.assertEqual(result["accepted_trajectories"], 3)
        self.assertEqual(result["policy_updates"], 1)


class EvaluationTests(unittest.TestCase):
    def test_pass_at_k_matches_combinatorial_formula(self):
        for n in range(1, 12):
            for correct in range(n + 1):
                for k in range(1, n + 1):
                    exact = 1 - (math.comb(n - correct, k) if n - correct >= k else 0) / math.comb(n, k)
                    self.assertAlmostEqual(evaluation.pass_at_k(n, correct, k), exact, places=12)

    def test_pass_at_k_rejects_more_samples_than_available(self):
        with self.assertRaises(ValueError):
            evaluation.pass_at_k(4, 2, 8)

    def test_bootstrap_resamples_task_scores(self):
        result = evaluation.bootstrap_mean_interval([0.5] * 4, random.Random(7), 100)
        self.assertEqual(result["lower"], 0.5)
        self.assertEqual(result["upper"], 0.5)
        self.assertEqual(result["resampling_unit"], "task")

    def test_contamination_normalizes_unicode_and_whitespace(self):
        result = evaluation.contamination_report({"training": "ＡＢＣ   task one"}, {"eval": "abc task one", "clean": "unrelated content"})
        self.assertEqual(result["flagged_evaluation_ids"], ["eval"])
        self.assertEqual(result["matches"][0]["kind"], "normalized_exact")
        self.assertEqual(len(result["matches"][0]["evaluation_sha256"]), 64)

    def test_default_contamination_finds_both_exact_and_review_candidate(self):
        result = evaluation.run(load_config("evaluation"), 7)
        self.assertEqual(result["contamination"]["flagged_evaluation_ids"], ["eval-a", "eval-b"])
        self.assertEqual({match["kind"] for match in result["contamination"]["matches"]}, {"normalized_exact", "shingle_candidate"})


class SystemsTests(unittest.TestCase):
    def test_ring_bytes_and_seconds_have_correct_units(self):
        result = systems.ring_collective(4000, [0, 1, 2, 3], 4, 1, 1, latency_us=0)
        self.assertEqual(result["chunk_bytes"], 1000)
        self.assertEqual(result["total_rounds"], 6)
        self.assertEqual(result["per_rank_send_bytes"], 6000)
        self.assertEqual(result["total_network_send_bytes"], 24000)
        self.assertAlmostEqual(result["estimated_seconds"], 6000 / 10**9, places=15)

    def test_one_rank_has_no_communication(self):
        result = systems.ring_collective(1000, [0], 1, 1, 1)
        self.assertEqual(result["estimated_seconds"], 0)
        self.assertEqual(result["per_rank_send_bytes"], 0)
        self.assertEqual(result["edges"], [])

    def test_actual_ring_reduction_matches_direct_sum(self):
        rng = random.Random(7)
        for ranks in range(1, 7):
            values = [[rng.randint(-100, 100) for _ in range(ranks)] for _ in range(ranks)]
            result = systems.ring_allreduce_values(values)
            expected = [sum(row[index] for row in values) for index in range(ranks)]
            self.assertEqual(result["outputs"], [expected] * ranks)
            self.assertEqual(len(result["hops"]), 2 * (ranks - 1))
            for hop in result["hops"]:
                self.assertEqual(len(hop["transfers"]), ranks)

    def test_inter_node_bandwidth_controls_ring_bottleneck(self):
        slow = systems.ring_collective(8000, [0, 1, 2, 3], 2, 100, 10, latency_us=0)
        fast = systems.ring_collective(8000, [0, 1, 2, 3], 2, 100, 20, latency_us=0)
        self.assertEqual(slow["bottleneck_links"], ["1→2", "3→0"])
        self.assertAlmostEqual(slow["estimated_seconds"], 2 * fast["estimated_seconds"])
        self.assertEqual(slow["per_rank_send_bytes"], fast["per_rank_send_bytes"])

    def test_gemm_roofline_count_and_bandwidth_limit(self):
        result = systems.gemm_roofline(1, 64, 64, 2, 1000, 10)
        faster = systems.gemm_roofline(1, 64, 64, 2, 1000, 20)
        self.assertEqual(result["flops"], 8192)
        self.assertEqual(result["compulsory_hbm_bytes"], (64 + 4096 + 64) * 2)
        self.assertEqual(result["limiting_roof"], "memory_bandwidth")
        self.assertAlmostEqual(result["ideal_lower_bound_seconds"], 2 * faster["ideal_lower_bound_seconds"])

    def test_fsdp_memory_and_collective_volume(self):
        config = {"parameters": 320, "layers": 4, "gpu_count": 4, "tensor_parallel": 1}
        result = systems.run(config, 7)
        self.assertEqual(result["memory"]["bytes_per_parameter_state"], 16)
        self.assertEqual(result["memory"]["estimates"]["dp"]["persistent_state_bytes_per_gpu"], 320 * 16)
        self.assertEqual(result["memory"]["estimates"]["fsdp"]["persistent_state_bytes_per_gpu"], 320 * 16 / 4)
        self.assertEqual(result["communication"]["fsdp"]["per_rank_send_bytes_per_step"], 0.75 * 320 * (2 * 2 + 2))
        self.assertEqual(result["memory"]["estimates"]["tp"], result["memory"]["estimates"]["dp"])
        self.assertEqual(result["step_time"]["tp"], result["step_time"]["dp"])

    def test_invalid_topology_and_bandwidth_rejected(self):
        with self.assertRaises(ValueError):
            systems.run({"gpu_count": 8, "tensor_parallel": 3}, 7)
        with self.assertRaises(ValueError):
            systems.ring_collective(4000, [0, 0], 2, 1, 1)
        with self.assertRaises(ValueError):
            systems.ring_collective(4000, [0, 1], 2, 0, 1)

    def test_optional_profiler_missing_torch_is_actionable(self):
        with mock.patch.dict("sys.modules", {"torch": None}):
            with contextlib.redirect_stderr(io.StringIO()) as error:
                status = torch_profile.main([])
        self.assertEqual(status, 2)
        self.assertIn("Optional dependency PyTorch is not installed", error.getvalue())
        self.assertIn("Nothing was installed automatically", error.getvalue())


class CliTests(unittest.TestCase):
    def test_cli_json_and_custom_config(self):
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "config.json"
            config.write_text('{"steps": 2}', encoding="utf-8")
            output = Path(directory) / "out.json"
            with contextlib.redirect_stdout(io.StringIO()) as receipt:
                exit_code = main(["--experiment", "gradients", "--config", str(config), "--output", str(output), "--seed", "42"])
            self.assertEqual(exit_code, 0)
            self.assertEqual(json.loads(receipt.getvalue())["seed"], 42)
            self.assertEqual(json.loads(output.read_text())["seed"], 42)

    def test_invalid_configuration_has_actionable_exit(self):
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "config.json"
            config.write_text('{"steps": 0}', encoding="utf-8")
            with contextlib.redirect_stderr(io.StringIO()) as error:
                exit_code = main(["--experiment", "gradients", "--config", str(config)])
            self.assertEqual(exit_code, 2)
            self.assertIn("steps must be a positive integer", error.getvalue())


if __name__ == "__main__":
    unittest.main()
