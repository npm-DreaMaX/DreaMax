"""Reverse-mode automatic differentiation on a scalar computation graph."""

from __future__ import annotations

import math

from .common import positive_float, positive_int


class Value:
    """A scalar and its local derivative closure; parents form a DAG."""

    def __init__(self, data: float, parents=(), op="leaf", label=""):
        self.data = float(data)
        self.grad = 0.0
        self.parents = tuple(parents)
        self.op = op
        self.label = label
        self._backward = lambda: None

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), "+")

        def backward():
            self.grad += out.grad
            other.grad += out.grad

        out._backward = backward
        return out

    __radd__ = __add__

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), "×")

        def backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad

        out._backward = backward
        return out

    __rmul__ = __mul__

    def __neg__(self):
        return self * -1.0

    def __sub__(self, other):
        return self + (-other)

    def tanh(self):
        out = Value(math.tanh(self.data), (self,), "tanh")

        def backward():
            self.grad += (1.0 - out.data ** 2) * out.grad

        out._backward = backward
        return out

    def topology(self):
        order, visited = [], set()

        def visit(node):
            if node not in visited:
                visited.add(node)
                for parent in node.parents:
                    visit(parent)
                order.append(node)

        visit(self)
        return order

    def backward(self):
        # One backward call computes fresh gradients. Reused nodes receive a SUM.
        order = self.topology()
        for node in order:
            node.grad = 0.0
        self.grad = 1.0
        for node in reversed(order):
            node._backward()


def loss_graph(parameters, inputs, target):
    weights = [Value(value, label=f"w{index}") for index, value in enumerate(parameters[:-1])]
    bias = Value(parameters[-1], label="b")
    features = [Value(value, label=f"x{index}") for index, value in enumerate(inputs)]
    activation = sum((weight * feature for weight, feature in zip(weights, features)), bias)
    activation.label = "z"
    prediction = activation.tanh()
    prediction.label = "prediction"
    residual = prediction - Value(target, label="target")
    residual.label = "residual"
    loss = 0.5 * residual * residual
    loss.label = "loss"
    return loss, weights + [bias]


def run(config: dict, seed: int) -> dict:
    inputs = config.get("inputs", [1.5, -2.0])
    parameters = config.get("parameters", [0.3, -0.2, 0.1])
    target = config.get("target", 0.7)
    if not inputs or len(parameters) != len(inputs) + 1:
        raise ValueError("parameters shape must equal [len(inputs) + 1], including bias")
    if not all(isinstance(x, (int, float)) and math.isfinite(x) for x in [*inputs, *parameters, target]):
        raise ValueError("inputs, parameters, and target must be finite numbers")
    learning_rate = positive_float(config, "learning_rate", 0.1)
    steps = positive_int(config, "steps", 40)
    loss, leaves = loss_graph(parameters, inputs, target)
    loss.backward()
    gradients = [leaf.grad for leaf in leaves]
    epsilon = 1e-5
    numerical = []
    for index in range(len(parameters)):
        plus, minus = list(parameters), list(parameters)
        plus[index] += epsilon
        minus[index] -= epsilon
        numerical.append((loss_graph(plus, inputs, target)[0].data - loss_graph(minus, inputs, target)[0].data) / (2 * epsilon))
    nodes = loss.topology()
    ids = {node: index for index, node in enumerate(nodes)}
    graph = [{"id": ids[node], "label": node.label or node.op, "operation": node.op,
              "value": node.data, "gradient": node.grad, "parents": [ids[parent] for parent in node.parents]}
             for node in nodes]
    trained = list(parameters)
    history = []
    for step in range(steps):
        current_loss, current_leaves = loss_graph(trained, inputs, target)
        current_loss.backward()
        history.append({"step": step, "loss": current_loss.data})
        trained = [parameter - learning_rate * leaf.grad for parameter, leaf in zip(trained, current_leaves)]
    final_loss = loss_graph(trained, inputs, target)[0].data
    return {"experiment": "gradients", "seed": seed, "kind": "scalar reverse-mode autodiff; original teaching code",
            "shape": {"x": [len(inputs)], "w": [len(inputs)], "bias": [], "loss": []},
            "initial_parameters": parameters, "autodiff_gradients": gradients,
            "finite_difference_gradients": numerical, "max_gradient_error": max(abs(a - b) for a, b in zip(gradients, numerical)),
            "initial_loss": loss.data, "final_loss": final_loss, "final_parameters": trained,
            "graph": graph, "history": history,
            "production_gap": "Scalar graph, one sample, no tensor broadcasting, mixed precision, optimizer state, or distributed reduction."}

