"""Regenerate the compact baseline report from actual experiment calculations."""

import argparse
import json
from pathlib import Path

from .run import EXPERIMENTS, load_config


def generate(seed=7):
    results = {name: run(load_config(name), seed) for name, run in EXPERIMENTS.items()}
    g, m, e = results["gradients"], results["mixture"], results["evaluation"]
    return {
        "seed": seed,
        "generator": "python3 -m labs.report --seed 7 --output labs/expected/seed7.json",
        "notice": "Original educational computations; no LLM training or real hardware throughput measurements.",
        "gradients": {key: g[key] for key in ("initial_loss", "final_loss", "max_gradient_error")},
        "mixture": {key: {field: m[key][field] for field in ("weight", "validation_mse", "sample_counts")}
                    for key in ("base", "focused_mid_training", "mid_training_with_replay")},
        "moe": {key: results["moe"][key] for key in ("biased_router", "bias_removed_router")},
        "preference": {key: results["preference"][key] for key in ("initial_loss", "final_loss", "gradient_error")},
        "agent": {key: results["agent"][key] for key in ("before", "after", "train_episodes")},
        "rollout": {key: {field: value for field, value in results["rollout"][key].items() if field != "trajectories"}
                    for key in ("synchronous", "asynchronous")},
        "evaluation": {key: e[key] for key in ("pass_at_k", "pass1_task_bootstrap", "contamination")},
        "systems": {key: results["systems"][key] for key in ("units", "memory", "step_time", "roofline")},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--output")
    arguments = parser.parse_args()
    text = json.dumps(generate(arguments.seed), ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if arguments.output:
        path = Path(arguments.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        print(f"Wrote {path}")
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
