"""CLI: python3 -m labs.run --experiment agent --seed 7."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import agent, evaluation, gradients, mixture, moe, preference, rollout, systems


EXPERIMENTS = {"gradients": gradients.run, "mixture": mixture.run, "moe": moe.run,
               "preference": preference.run, "agent": agent.run, "rollout": rollout.run, "evaluation": evaluation.run,
               "systems": systems.run}
ALIASES = {"data-mixture": "mixture", "agent-loop": "agent"}


def load_config(experiment, config_path=None):
    path = Path(config_path) if config_path else Path(__file__).parent / "configs" / f"{experiment}.json"
    with path.open(encoding="utf-8") as handle:
        config = json.load(handle)
    if not isinstance(config, dict):
        raise ValueError("configuration root must be a JSON object")
    return config


def main(argv=None):
    parser = argparse.ArgumentParser(description="LLM training mechanisms: reproducible, CPU-only teaching experiments.")
    parser.add_argument("--experiment", required=True, choices=[*EXPERIMENTS, *ALIASES])
    parser.add_argument("--config", help="JSON configuration; defaults to labs/configs/<experiment>.json")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--output", help="Write full JSON result here; stdout then contains a short file receipt")
    parser.add_argument("--trajectories", help="For agent/rollout only: also save trajectory records as JSONL")
    parser.add_argument("--compact", action="store_true", help="Use compact JSON output")
    arguments = parser.parse_args(argv)
    experiment = ALIASES.get(arguments.experiment, arguments.experiment)
    try:
        if arguments.trajectories and experiment not in ("agent", "rollout"):
            raise ValueError("--trajectories is available only for agent and rollout")
        config = load_config(experiment, arguments.config)
        result = EXPERIMENTS[experiment](config, arguments.seed)
        result["config"] = config
        output = json.dumps(result, ensure_ascii=False, indent=None if arguments.compact else 2, allow_nan=False)
        if arguments.trajectories:
            records = result["trajectories"] if experiment == "agent" else result["asynchronous"]["trajectories"]
            path = Path(arguments.trajectories)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("".join(json.dumps(record, ensure_ascii=False, allow_nan=False) + "\n" for record in records), encoding="utf-8")
        if arguments.output:
            path = Path(arguments.output)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(output + "\n", encoding="utf-8")
            print(json.dumps({"experiment": experiment, "seed": arguments.seed, "output": str(path.resolve())}, ensure_ascii=False))
        else:
            print(output)
    except (ValueError, TypeError, OSError, OverflowError) as error:
        print(f"experiment error: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
