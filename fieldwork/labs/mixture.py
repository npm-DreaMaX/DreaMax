"""Actual SGD demonstrates data weighting and shared-parameter interference."""

from __future__ import annotations

import math
import random

from .common import mean, positive_float, positive_int


def validation(weight, examples):
    return {domain: mean([(weight * x - sign * x) ** 2 for x in examples])
            for domain, sign in (("A", 1.0), ("B", -1.0))}


def train_phase(weight, probability_a, steps, learning_rate, batch_size, rng, validation_x):
    if not isinstance(probability_a, (float, int)) or not math.isfinite(probability_a) or not 0 <= probability_a <= 1:
        raise ValueError("mixture probability must be between 0 and 1")
    history, counts = [], {"A": 0, "B": 0}
    for step in range(steps):
        gradient = 0.0
        for _ in range(batch_size):
            is_a = rng.random() < probability_a
            domain, sign = ("A", 1.0) if is_a else ("B", -1.0)
            x = rng.uniform(-1.0, 1.0)
            # Scalar y_hat = w*x. d[(y_hat-y)^2]/dw = 2*(w*x-y)*x.
            gradient += 2.0 * (weight * x - sign * x) * x
            counts[domain] += 1
        weight -= learning_rate * gradient / batch_size
        if step % 10 == 0 or step == steps - 1:
            history.append({"step": step, "weight": weight, **validation(weight, validation_x)})
    return {"weight": weight, "validation_mse": validation(weight, validation_x), "sample_counts": counts,
            "probability_a": probability_a, "population_optimum_weight": 2 * probability_a - 1, "history": history}


def run(config: dict, seed: int) -> dict:
    steps = positive_int(config, "phase_steps", 120)
    batch_size = positive_int(config, "batch_size", 64)
    learning_rate = positive_float(config, "learning_rate", 0.08)
    validation_rng = random.Random(seed + 10000)
    validation_x = [validation_rng.uniform(-1, 1) for _ in range(1024)]
    base = train_phase(0.0, config.get("base_probability_a", 0.5), steps, learning_rate, batch_size, random.Random(seed), validation_x)
    focused = train_phase(base["weight"], config.get("focused_probability_a", 0.95), steps, learning_rate,
                          batch_size, random.Random(seed + 1), validation_x)
    replay = train_phase(base["weight"], config.get("replay_probability_a", 0.65), steps, learning_rate,
                         batch_size, random.Random(seed + 1), validation_x)
    return {"experiment": "mixture", "seed": seed, "kind": "stochastic optimization / deliberately conflicting domains",
            "shape": {"batch_x": [batch_size, 1], "weight": [1], "prediction": [batch_size, 1]},
            "task": "Domain A: y=x; domain B: y=-x. The scalar policy receives x without a domain tag, so the objectives conflict.",
            "base": base, "focused_mid_training": focused, "mid_training_with_replay": replay,
            "forgetting_delta_B": focused["validation_mse"]["B"] - base["validation_mse"]["B"],
            "retention_tradeoff_B": focused["validation_mse"]["B"] - replay["validation_mse"]["B"],
            "production_gap": "An intentionally capacity-limited regression toy: this demonstrates gradient interference, not a claim that all language-model domains are incompatible or that replay always fixes forgetting."}

