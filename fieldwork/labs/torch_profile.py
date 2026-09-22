"""Optional real PyTorch operator profiling. No installation is performed.

CPU is the explicit default. CUDA measurements exist only when --device cuda
is requested and available; a missing GPU is an error, never a silent fallback.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path


def profile_workload(torch, *, device="cpu", operation="mlp", tokens=128, hidden=256,
                     steps=3, warmup=2, threads=1, seed=7, dtype="float32", trace=None):
    if any(type(value) is not int or value < 1 for value in (tokens, hidden, steps, warmup, threads)):
        raise ValueError("tokens, hidden, steps, warmup, and threads must be positive integers")
    if operation not in ("matmul", "softmax", "mlp") or device not in ("cpu", "cuda"):
        raise ValueError("operation must be matmul/softmax/mlp and device must be cpu/cuda")
    if dtype not in ("float32", "bfloat16"):
        raise ValueError("dtype must be float32 or bfloat16")
    if device == "cuda" and not torch.cuda.is_available():
        raise ValueError("CUDA was requested but is unavailable. Use --device cpu to observe CPU operators.")
    if device == "cuda" and dtype == "bfloat16" and not torch.cuda.is_bf16_supported():
        raise ValueError("This CUDA device does not report BF16 support; use --dtype float32.")
    torch.manual_seed(seed)
    torch.set_num_threads(threads)
    tensor_dtype = getattr(torch, dtype)
    inputs = torch.randn(tokens, hidden, device=device, dtype=tensor_dtype, requires_grad=True)
    parameters = []
    if operation in ("matmul", "mlp"):
        width = hidden if operation == "matmul" else 4 * hidden
        parameters.append((torch.randn(hidden, width, device=device, dtype=tensor_dtype) / math.sqrt(hidden)).requires_grad_())
        if operation == "mlp":
            parameters.append((torch.randn(width, hidden, device=device, dtype=tensor_dtype) / math.sqrt(width)).requires_grad_())

    def synchronize():
        if device == "cuda":
            torch.cuda.synchronize()

    def step():
        inputs.grad = None
        for parameter in parameters:
            parameter.grad = None
        with torch.profiler.record_function("teaching_forward"):
            if operation == "matmul":
                result = inputs @ parameters[0]
                loss = result.float().square().mean()
            else:
                logits = inputs
                if operation == "mlp":
                    logits = torch.nn.functional.gelu(inputs @ parameters[0]) @ parameters[1]
                probabilities = torch.softmax(logits, dim=-1)
                # Float loss arithmetic keeps the tiny demonstration stable.
                loss = -probabilities[:, 0].float().clamp_min(1e-12).log().mean()
        with torch.profiler.record_function("teaching_backward"):
            loss.backward()
        return loss

    for _ in range(warmup):
        step()
    synchronize()
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    start = time.perf_counter()
    for _ in range(steps):
        loss = step()
    synchronize()
    unprofiled_seconds = time.perf_counter() - start
    baseline_peak = torch.cuda.max_memory_allocated() if device == "cuda" else None
    # Free the preceding step's temporary tensors before memory recording starts.
    # Otherwise a deallocation can appear with no matching recorded allocation.
    loss = None
    inputs.grad = None
    for parameter in parameters:
        parameter.grad = None
    synchronize()
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    activities = [torch.profiler.ProfilerActivity.CPU]
    if device == "cuda":
        activities.append(torch.profiler.ProfilerActivity.CUDA)
    with torch.profiler.profile(activities=activities, record_shapes=True, profile_memory=True, with_flops=True, acc_events=True) as profiler:
        for _ in range(steps):
            loss = step()
        synchronize()
    if trace:
        path = Path(trace)
        path.parent.mkdir(parents=True, exist_ok=True)
        profiler.export_chrome_trace(str(path))
    events = []
    averages = sorted(profiler.key_averages(group_by_input_shape=True), key=lambda event: event.self_cpu_time_total, reverse=True)
    for event in averages:
        events.append({"operator": event.key, "calls": event.count, "input_shapes": event.input_shapes,
                       "self_cpu_time_us": event.self_cpu_time_total, "cpu_time_total_us": event.cpu_time_total,
                       "self_device_time_us": getattr(event, "self_device_time_total", 0.0) if device == "cuda" else None,
                       "self_cpu_memory_bytes": event.self_cpu_memory_usage,
                       "estimated_flops_for_supported_ops": getattr(event, "flops", 0)})
    gradients_finite = all(bool(torch.isfinite(tensor.grad).all().item()) for tensor in [inputs, *parameters])
    return {"kind": "actual local operator measurements with optional PyTorch; no distributed benchmark",
            "torch_version": torch.__version__, "device": device,
            "device_name": torch.cuda.get_device_name() if device == "cuda" else "CPU",
            "dtype": dtype, "threads": threads, "seed": seed, "operation": operation,
            "shape": {"inputs": [tokens, hidden], "weights": [list(parameter.shape) for parameter in parameters]},
            "warmup_steps": warmup, "measured_steps": steps,
            "wall_seconds_without_profiler": unprofiled_seconds,
            "mean_step_seconds_without_profiler": unprofiled_seconds / steps,
            "cuda_peak_allocated_bytes_without_profiler": baseline_peak,
            "cuda_peak_allocated_bytes_with_profiler": torch.cuda.max_memory_allocated() if device == "cuda" else None,
            "final_loss": float(loss.item()), "all_gradients_finite": gradients_finite,
            "trace_path": str(Path(trace).resolve()) if trace else None,
            "events": events,
            "limits": "Small forward/backward only; no optimizer, network, NCCL, training convergence, or end-to-end model throughput. Timings depend on this host, warmup, precision and contention. Profiler adds overhead; use separate unprofiled wall time. CPU self-memory is net allocation, not peak; CUDA peak is PyTorch tensor allocation, not all device memory. Operator FLOPs are estimates for supported operators only."}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--device", choices=("cpu", "cuda"), default="cpu")
    parser.add_argument("--operation", choices=("matmul", "softmax", "mlp"), default="mlp")
    parser.add_argument("--tokens", type=int, default=128)
    parser.add_argument("--hidden", type=int, default=256)
    parser.add_argument("--steps", type=int, default=3)
    parser.add_argument("--warmup", type=int, default=2)
    parser.add_argument("--threads", type=int, default=1)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--dtype", choices=("float32", "bfloat16"), default="float32")
    parser.add_argument("--output", help="Write JSON report; otherwise print full JSON")
    parser.add_argument("--trace", help="Write an actual Chrome trace JSON file")
    arguments = parser.parse_args(argv)
    try:
        import torch
    except ImportError:
        print("Optional dependency PyTorch is not installed. The eight core labs need no dependencies. "
              "To enable profiling, install an appropriate torch build (python3 -m pip install torch), "
              "then rerun this command. Nothing was installed automatically.", file=sys.stderr)
        return 2
    try:
        kwargs = vars(arguments).copy()
        output_path = kwargs.pop("output")
        result = profile_workload(torch, **kwargs)
        serialized = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        if output_path:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(serialized, encoding="utf-8")
            print(json.dumps({"device": result["device"], "torch_version": result["torch_version"],
                              "output": str(path.resolve()), "trace": result["trace_path"]}, ensure_ascii=False))
        else:
            print(serialized, end="")
    except (ValueError, RuntimeError, OSError) as error:
        print(f"profiling error: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
