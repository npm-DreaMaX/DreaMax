"""pass@k estimator, task-level bootstrap, and transparent contamination checks."""

from __future__ import annotations

import hashlib
import math
import random
import unicodedata

from .common import mean, positive_int


def pass_at_k(n: int, correct: int, k: int) -> float:
    """Unbiased estimator 1 - C(n-c,k)/C(n,k), given n exchangeable samples."""
    if not all(isinstance(value, int) and not isinstance(value, bool) for value in (n, correct, k)):
        raise ValueError("n, correct, and k must be integers")
    if not 0 <= correct <= n or not 1 <= k <= n:
        raise ValueError("require 0 <= correct <= n and 1 <= k <= n")
    if n - correct < k:
        return 1.0
    failure_probability = 1.0
    for index in range(k):
        failure_probability *= (n - correct - index) / (n - index)
    return 1.0 - failure_probability


def bootstrap_mean_interval(task_scores, rng, repetitions=1000, confidence=0.95):
    if not task_scores or repetitions < 1 or not 0 < confidence < 1:
        raise ValueError("bootstrap requires observations, repetitions >= 1, and 0 < confidence < 1")
    if not all(math.isfinite(score) for score in task_scores):
        raise ValueError("task scores must be finite")
    estimates = sorted(mean([rng.choice(task_scores) for _ in task_scores]) for _ in range(repetitions))
    tail = (1.0 - confidence) / 2
    lower = min(repetitions - 1, int(tail * repetitions))
    upper = min(repetitions - 1, int((1.0 - tail) * repetitions))
    return {"mean": mean(task_scores), "lower": estimates[lower], "upper": estimates[upper],
            "confidence": confidence, "resampling_unit": "task", "repetitions": repetitions}


def normalize(text):
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def shingles(text, width=3):
    words = normalize(text).split()
    if len(words) < width:
        return {tuple(words)} if words else set()
    return {tuple(words[index:index + width]) for index in range(len(words) - width + 1)}


def contamination_report(training_records, evaluation_records, threshold=0.7):
    if not 0 <= threshold <= 1:
        raise ValueError("Jaccard threshold must be between 0 and 1")
    matches = []
    for evaluation_id, evaluation_text in evaluation_records.items():
        normalized_evaluation = normalize(evaluation_text)
        evaluation_shingles = shingles(evaluation_text)
        for training_id, training_text in training_records.items():
            normalized_training = normalize(training_text)
            training_shingles = shingles(training_text)
            union = evaluation_shingles | training_shingles
            similarity = len(evaluation_shingles & training_shingles) / len(union) if union else 0.0
            exact = bool(normalized_evaluation) and normalized_evaluation == normalized_training
            if exact or similarity >= threshold:
                matches.append({"evaluation_id": evaluation_id, "training_id": training_id,
                                "kind": "normalized_exact" if exact else "shingle_candidate", "jaccard": similarity,
                                "evaluation_sha256": hashlib.sha256(normalized_evaluation.encode()).hexdigest()})
    return {"matches": matches, "flagged_evaluation_ids": sorted({match["evaluation_id"] for match in matches}),
            "method": "NFKC + casefold + whitespace normalization; word 3-shingle Jaccard candidates require manual review",
            "limits": "Cannot establish absence of semantic/paraphrase leakage. Shared boilerplate can cause false positives; code casefolding can merge distinct identifiers."}


def run(config: dict, seed: int) -> dict:
    tasks = positive_int(config, "tasks", 40)
    samples = positive_int(config, "samples_per_task", 8)
    repetitions = positive_int(config, "bootstrap_repetitions", 1000)
    ks = config.get("k_values", [1, 2, 4, 8])
    if not ks:
        raise ValueError("k_values must not be empty")
    for k in ks:
        pass_at_k(samples, 0, k)
    rng = random.Random(seed)
    observations = []
    for task in range(tasks):
        success_probability = 0.1 + 0.75 * task / max(tasks - 1, 1)
        outcomes = [int(rng.random() < success_probability) for _ in range(samples)]
        observations.append({"task_id": f"task-{task}", "outcomes": outcomes, "correct": sum(outcomes), "n": samples})
    scores = {str(k): mean([pass_at_k(row["n"], row["correct"], k) for row in observations]) for k in ks}
    task_pass1 = [pass_at_k(row["n"], row["correct"], 1) for row in observations]
    corpus = {"doc-1": "Return the sum of two positive integers without using external libraries.",
              "doc-2": "Sort a list of integers and return the median value with exact arithmetic.",
              "doc-3": "Calculate the length of a Unicode string."}
    benchmark = {"eval-a": "RETURN  the sum of two positive integers without using external libraries.",
                 "eval-b": "Sort a list of integers and return the median value using exact arithmetic.",
                 "eval-c": "Find the longest path in a directed acyclic graph."}
    return {"experiment": "evaluation", "seed": seed, "kind": "estimator calculation on simulated Bernoulli completions; not a model benchmark",
            "shape": {"outcomes": [tasks, samples]}, "pass_at_k": scores,
            "pass1_task_bootstrap": bootstrap_mean_interval(task_pass1, random.Random(seed + 1), repetitions),
            "contamination": contamination_report(corpus, benchmark, config.get("contamination_threshold", 0.55)), "task_results": observations,
            "production_gap": "Real evaluations need pinned policy/harness/grader, task clusters, multiple training seeds, matched token/tool budgets, hidden tests, and uncertainty about the grader. This bootstrap conditions on already sampled completions."}
