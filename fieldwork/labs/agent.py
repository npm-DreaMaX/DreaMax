"""A real, tiny, on-policy tool-use learner with a separate outcome verifier.

The policy is a table of 2 operations × 3 observation stages × 4 action logits.
There is no language model, shell interpreter, network, or external executable.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

from .common import mean, positive_float, positive_int, softmax


ACTIONS = ("read", "add", "subtract", "submit")
STAGES = ("start", "ready", "computed")
OPERATIONS = ("sum", "difference")


@dataclass(frozen=True)
class Task:
    task_id: str
    left: int
    right: int
    operation: str


class ArithmeticEnvironment:
    """Executes a bounded whitelist. Never grades or exposes a target answer.

    `read` reveals operands; arithmetic writes an answer to scratchpad; `submit`
    terminates. An action at the wrong stage terminates as invalid. This strict
    protocol makes errors inspectable and avoids hiding recovery in a harness.
    """

    def __init__(self, task: Task):
        if task.operation not in OPERATIONS:
            raise ValueError("unknown task operation")
        self.task = task
        self.stage = "start"
        self.answer = None
        self.done = False
        self.error = None

    def observe(self) -> dict:
        observation = {"operation": self.task.operation, "stage": self.stage}
        if self.stage != "start":
            observation["operands"] = [self.task.left, self.task.right]
        if self.stage in ("computed", "submitted"):
            observation["scratchpad"] = self.answer
        return observation

    def step(self, action: str) -> dict:
        if self.done:
            raise ValueError("cannot step a terminal environment")
        allowed = {"start": ("read",), "ready": ("add", "subtract"), "computed": ("submit",)}
        if action not in allowed[self.stage]:
            self.error = "invalid_action"
            self.done = True
            return {"status": "invalid_action", "observation": self.observe(), "done": True}
        if action == "read":
            self.stage = "ready"
        elif action in ("add", "subtract"):
            self.answer = self.task.left + self.task.right if action == "add" else self.task.left - self.task.right
            self.stage = "computed"
        elif action == "submit":
            self.stage = "submitted"
            self.done = True
        return {"status": "ok", "observation": self.observe(), "done": self.done}


def verify(task: Task, submission) -> float:
    """Separate outcome verifier, independent of the environment's scratchpad.

    In a real service this belongs behind a process/container boundary. Here it
    is module-level separation only: Python callers can inspect all memory.
    """
    if type(submission) is not int:
        return 0.0
    target = sum((task.left, task.right)) if task.operation == "sum" else task.left + (-task.right)
    return float(submission == target)


def make_policy():
    return {(operation, stage): [0.0] * len(ACTIONS) for operation in OPERATIONS for stage in STAGES}


def feature(observation):
    # The harness discards operand values for policy lookup; it does NOT choose
    # an action or perform arithmetic. The policy learns an operation protocol.
    return observation["operation"], observation["stage"]


def sample_action(probabilities, rng):
    draw, cumulative = rng.random(), 0.0
    for index, probability in enumerate(probabilities):
        cumulative += probability
        if draw < cumulative:
            return index
    return len(probabilities) - 1


def rollout(policy, task, rng, max_steps=4, version=0):
    environment = ArithmeticEnvironment(task)
    decisions = []
    for step in range(max_steps):
        observation = environment.observe()
        key = feature(observation)
        probabilities = softmax(policy[key])
        selected = sample_action(probabilities, rng)
        response = environment.step(ACTIONS[selected])
        decisions.append({"step": step, "observation": observation, "policy_state": list(key),
                          "action": ACTIONS[selected], "action_index": selected,
                          "log_probability": math.log(probabilities[selected]), "probabilities": probabilities,
                          "response": response})
        if environment.done:
            break
    reason = environment.error or ("submitted" if environment.stage == "submitted" else "timeout")
    submission = environment.answer if reason == "submitted" else None
    # Reward arrives after the policy/environment loop. It is never an input
    # observation and cannot influence actions within the same trajectory.
    return {"task_id": task.task_id, "policy_version": version, "decisions": decisions,
            "terminal_reason": reason, "submission": submission, "reward": verify(task, submission)}


def group_advantages(rewards):
    average = mean(rewards)
    variance = mean([(reward - average) ** 2 for reward in rewards])
    if variance < 1e-12:
        return [0.0] * len(rewards)
    standard_deviation = math.sqrt(variance)
    return [(reward - average) / standard_deviation for reward in rewards]


def evaluate(policy, rng, episodes, max_steps, version):
    trajectories = []
    for index in range(episodes):
        # Evaluation operand interval is disjoint from training. The task schema
        # remains the same: this tests program transfer, not novel reasoning.
        task = Task(f"heldout-{index}", rng.randint(101, 200), rng.randint(101, 200), OPERATIONS[index % 2])
        trajectories.append(rollout(policy, task, rng, max_steps, version))
    rewards = [trajectory["reward"] for trajectory in trajectories]
    return {"success_rate": mean(rewards), "episodes": episodes,
            "mean_actions": mean([len(trajectory["decisions"]) for trajectory in trajectories]),
            "invalid_rate": mean([float(trajectory["terminal_reason"] == "invalid_action") for trajectory in trajectories])}, trajectories


def run(config: dict, seed: int) -> dict:
    updates = positive_int(config, "updates", 100)
    groups_per_update = positive_int(config, "groups_per_update", 12)
    group_size = positive_int(config, "group_size", 16)
    if group_size < 2:
        raise ValueError("group_size must be >= 2 for a group-relative baseline")
    max_steps = positive_int(config, "max_steps", 4)
    learning_rate = positive_float(config, "learning_rate", 0.8)
    evaluation_episodes = positive_int(config, "evaluation_episodes", 400)
    entropy_coefficient = config.get("entropy_coefficient", 0.01)
    if not isinstance(entropy_coefficient, (float, int)) or not math.isfinite(entropy_coefficient) or entropy_coefficient < 0:
        raise ValueError("entropy_coefficient must be finite and nonnegative")
    rng = random.Random(seed)
    policy = make_policy()
    before, _ = evaluate(policy, random.Random(seed + 10000), evaluation_episodes, max_steps, 0)
    history, train_episodes = [], 0
    for update in range(updates):
        gradients = {key: [0.0] * len(ACTIONS) for key in policy}
        batch_rewards, degenerate_groups = [], 0
        for group in range(groups_per_update):
            task = Task(f"train-{update}-{group}", rng.randint(1, 20), rng.randint(1, 20), OPERATIONS[group % 2])
            trajectories = [rollout(policy, task, rng, max_steps, update) for _ in range(group_size)]
            rewards = [trajectory["reward"] for trajectory in trajectories]
            advantages = group_advantages(rewards)
            degenerate_groups += all(advantage == 0 for advantage in advantages)
            batch_rewards.extend(rewards)
            # All rollouts are generated with the SAME pre-update parameters.
            # For logits z, d log pi(a)/dz_j = 1[j=a] - pi(j).
            for trajectory, advantage in zip(trajectories, advantages):
                for decision in trajectory["decisions"]:
                    key = tuple(decision["policy_state"])
                    for action in range(len(ACTIONS)):
                        score_gradient = float(action == decision["action_index"]) - decision["probabilities"][action]
                        gradients[key][action] += advantage * score_gradient
        batch_size = groups_per_update * group_size
        entropies = []
        for key, logits in policy.items():
            probabilities = softmax(logits)
            entropy = -sum(p * math.log(p) for p in probabilities)
            entropies.append(entropy)
            for action in range(len(ACTIONS)):
                # This regularizer averages entropy over all table rows, rather
                # than using the production distribution of visited states.
                entropy_gradient = -probabilities[action] * (math.log(probabilities[action]) + entropy)
                logits[action] += learning_rate * (gradients[key][action] / batch_size + entropy_coefficient * entropy_gradient / len(policy))
        train_episodes += batch_size
        if update % 10 == 0 or update == updates - 1:
            history.append({"update": update + 1, "train_success_rate": mean(batch_rewards),
                            "mean_state_entropy": mean(entropies), "zero_advantage_groups": degenerate_groups,
                            "groups": groups_per_update})
    after, final_trajectories = evaluate(policy, random.Random(seed + 10000), evaluation_episodes, max_steps, updates)
    policies = [{"operation": key[0], "stage": key[1], "action_probabilities": dict(zip(ACTIONS, softmax(logits)))}
                for key, logits in policy.items()]
    return {"experiment": "agent", "seed": seed, "kind": "learned finite-action policy; group-normalized on-policy REINFORCE",
            "shape": {"policy_logits": [2, 3, 4], "rollout_batch": [groups_per_update, group_size, "<=max_steps"]},
            "before": before, "after": after, "train_episodes": train_episodes, "policy_versions": updates,
            "history": history, "policy": policies, "trajectories": final_trajectories[:8],
            "security_boundary": "No untrusted code is executed. Verifier separation is logical within one Python process, not an OS sandbox.",
            "production_gap": "Not a language model or a full GRPO implementation: no PPO clipping, importance ratios, reference-policy KL, token masks, value network, distributed rollout, or novel-task generalization claim."}

