"""Numerical primitives shared by the CPU-only laboratories."""

from __future__ import annotations

import math
from typing import Sequence


def softmax(logits: Sequence[float]) -> list[float]:
    if not logits or not all(math.isfinite(x) for x in logits):
        raise ValueError("softmax requires a nonempty list of finite logits")
    maximum = max(logits)
    weights = [math.exp(x - maximum) for x in logits]
    denominator = sum(weights)
    return [weight / denominator for weight in weights]


def softplus(value: float) -> float:
    return max(value, 0.0) + math.log1p(math.exp(-abs(value)))


def sigmoid(value: float) -> float:
    if value >= 0:
        return 1.0 / (1.0 + math.exp(-value))
    exp_value = math.exp(value)
    return exp_value / (1.0 + exp_value)


def mean(values: Sequence[float]) -> float:
    if not values:
        raise ValueError("mean requires at least one observation")
    return sum(values) / len(values)


def positive_int(config: dict, key: str, default: int) -> int:
    value = config.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{key} must be a positive integer")
    return value


def positive_float(config: dict, key: str, default: float) -> float:
    value = config.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or value <= 0:
        raise ValueError(f"{key} must be a positive finite number")
    return float(value)

