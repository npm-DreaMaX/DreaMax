"""DPO in an exact two-response exponential-family policy, without an LLM."""

from __future__ import annotations

import math

from .common import mean, positive_float, positive_int, sigmoid, softplus


def dpo_loss_gradient(theta: float, reference_theta: float, feature_delta: float, beta: float):
    """pi(response|x) ∝ exp(theta * feature(response)); log-ratio = theta * delta.

    Loss = -log sigmoid(beta * (log pi_c/pi_r - log ref_c/ref_r)).
    Returns the loss, exact derivative d(loss)/d(theta), and signed margin.
    """
    if beta <= 0 or not all(math.isfinite(value) for value in (theta, reference_theta, feature_delta, beta)):
        raise ValueError("DPO requires finite scalars and beta > 0")
    margin = beta * (theta - reference_theta) * feature_delta
    return softplus(-margin), -beta * feature_delta * sigmoid(-margin), margin


def run(config: dict, seed: int) -> dict:
    theta = config.get("theta", -0.5)
    reference_theta = config.get("reference_theta", 0.2)
    deltas = config.get("feature_deltas", [1.0, 0.8, 0.5, 0.3, -0.4])
    if not deltas:
        raise ValueError("feature_deltas must contain at least one preference pair")
    beta = positive_float(config, "beta", 0.2)
    learning_rate = positive_float(config, "learning_rate", 0.3)
    steps = positive_int(config, "steps", 120)

    def objective(parameter):
        results = [dpo_loss_gradient(parameter, reference_theta, delta, beta) for delta in deltas]
        return mean([row[0] for row in results]), mean([row[1] for row in results])

    initial_loss, gradient = objective(theta)
    epsilon = 1e-5
    numerical = (objective(theta + epsilon)[0] - objective(theta - epsilon)[0]) / (2 * epsilon)
    history = []
    for step in range(steps):
        loss, update = objective(theta)
        if step % 10 == 0 or step == steps - 1:
            history.append({"step": step, "loss": loss, "theta": theta, "gradient": update})
        theta -= learning_rate * update
    pairs = [{"feature_delta": delta, "margin": dpo_loss_gradient(theta, reference_theta, delta, beta)[2],
              "chosen_probability": sigmoid(theta * delta), "reference_chosen_probability": sigmoid(reference_theta * delta)}
             for delta in deltas]
    return {"experiment": "preference", "seed": seed, "kind": "exact two-response DPO objective; original teaching code",
            "shape": {"preference_pairs": [len(deltas), 2], "parameter": [], "loss": []},
            "beta": beta, "reference_theta": reference_theta, "initial_loss": initial_loss,
            "initial_gradient": gradient, "finite_difference_gradient": numerical,
            "gradient_error": abs(gradient - numerical), "final_theta": theta, "final_loss": objective(theta)[0],
            "pairs": pairs, "history": history,
            "stability_check": {"positive_margin_1000_loss": softplus(-1000.0), "negative_margin_1000_loss": softplus(1000.0)},
            "production_gap": "No tokenization, sequence log-probability masking, reference-model inference, distributed training, or generation evaluation. Preference fit does not prove capability gain."}

