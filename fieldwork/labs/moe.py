"""Top-k routing and finite expert capacity; a simulator, not MoE training."""

from __future__ import annotations

import math
import random

from .common import mean, positive_float, positive_int, softmax


def route(logits: list[list[float]], top_k: int, capacity_factor: float) -> dict:
    if not logits or not logits[0] or any(len(row) != len(logits[0]) for row in logits):
        raise ValueError("logits must be a nonempty rectangular [tokens, experts] matrix")
    experts, tokens = len(logits[0]), len(logits)
    if not isinstance(top_k, int) or not 1 <= top_k <= experts or capacity_factor <= 0:
        raise ValueError("require 1 <= top_k <= experts and capacity_factor > 0")
    capacity = math.ceil(capacity_factor * tokens * top_k / experts)
    requested, accepted = [0] * experts, [0] * experts
    probabilities, fully_dropped = [], 0
    for row in logits:
        probabilities.append(softmax(row))
        chosen = sorted(range(experts), key=lambda index: row[index], reverse=True)[:top_k]
        kept = 0
        for expert in chosen:
            requested[expert] += 1
            if accepted[expert] < capacity:
                accepted[expert] += 1
                kept += 1
        fully_dropped += kept == 0
    frequency = [count / (tokens * top_k) for count in requested]
    average_probability = [mean([row[index] for row in probabilities]) for index in range(experts)]
    return {"capacity_per_expert": capacity, "requested_assignments": requested, "accepted_assignments": accepted,
            "dropped_assignments": tokens * top_k - sum(accepted), "fully_dropped_tokens": fully_dropped,
            "max_to_mean_load": max(requested) / mean(requested),
            "balance_auxiliary": experts * sum(f * p for f, p in zip(frequency, average_probability)),
            "mean_router_entropy": mean([-sum(p * math.log(max(p, 1e-300)) for p in row) for row in probabilities])}


def run(config: dict, seed: int) -> dict:
    tokens = positive_int(config, "tokens", 256)
    experts = positive_int(config, "experts", 4)
    top_k = positive_int(config, "top_k", 2)
    capacity_factor = positive_float(config, "capacity_factor", 1.1)
    bias = config.get("hot_expert_bias", 3.0)
    if not isinstance(bias, (int, float)) or not math.isfinite(bias):
        raise ValueError("hot_expert_bias must be finite")
    rng = random.Random(seed)
    angles = [rng.uniform(0, 2 * math.pi) for _ in range(tokens)]
    balanced = [[math.cos(angle - 2 * math.pi * expert / experts) for expert in range(experts)] for angle in angles]
    biased = [[value + (bias if expert == 0 else 0) for expert, value in enumerate(row)] for row in balanced]
    return {"experiment": "moe", "seed": seed, "kind": "routing/capacity simulator; no expert networks or training",
            "shape": {"router_logits": [tokens, experts], "selected_experts": [tokens, top_k]},
            "biased_router": route(biased, top_k, capacity_factor), "bias_removed_router": route(balanced, top_k, capacity_factor),
            "capacity_factor": capacity_factor, "top_k": top_k,
            "auxiliary_definition": "E * sum_e(f_e * mean_p_e); f is the normalized pre-capacity top-k assignment frequency. Other implementations may use another top-k scale.",
            "production_gap": "Bias removal is a controlled intervention, not a learned load-balancing algorithm. No all-to-all, expert gradients, node-local routing, dropless kernels, or distributed wall-clock prediction."}
