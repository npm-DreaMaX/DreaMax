"""Explicit byte accounting, ring collective simulation, and idealized roofline.

All timings here are calculated estimates, NOT measurements of any hardware.
GB/s is decimal (10**9 bytes/s); GiB is binary (2**30 bytes).
"""

from __future__ import annotations

import math

from .common import positive_float, positive_int


GB = 10 ** 9
GIB = 2 ** 30


def nonnegative_float(config, key, default):
    value = config.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError(f"{key} must be a finite nonnegative number")
    return float(value)


def ring_collective(message_bytes, rank_ids, gpus_per_node, intra_gbps, inter_gbps,
                    latency_us=5.0, collective="all_reduce"):
    """Homogeneous chunks, simultaneous edge transfers, round barrier.

    message_bytes is the logical FULL tensor size for all three collectives.
    A rank starts all-gather with message_bytes/p and reduce-scatter with the
    full message_bytes. Values are not allocated by this timing model.
    """
    if collective not in ("all_reduce", "all_gather", "reduce_scatter"):
        raise ValueError("unknown collective")
    if not rank_ids or len(set(rank_ids)) != len(rank_ids) or any(type(rank) is not int or rank < 0 for rank in rank_ids):
        raise ValueError("rank_ids must contain unique nonnegative integers")
    if (not math.isfinite(message_bytes) or message_bytes < 0 or type(gpus_per_node) is not int or gpus_per_node < 1
            or not math.isfinite(intra_gbps) or intra_gbps <= 0 or not math.isfinite(inter_gbps) or inter_gbps <= 0
            or not math.isfinite(latency_us) or latency_us < 0):
        raise ValueError("require nonnegative bytes/latency, positive bandwidth, and gpus_per_node >= 1")
    ranks = len(rank_ids)
    phases = ("reduce_scatter", "all_gather") if collective == "all_reduce" else (collective,)
    chunk_bytes = message_bytes / ranks
    edges = []
    if ranks > 1:
        for index, source in enumerate(rank_ids):
            destination = rank_ids[(index + 1) % ranks]
            local = source // gpus_per_node == destination // gpus_per_node
            bandwidth = intra_gbps if local else inter_gbps
            edges.append({"source": source, "destination": destination,
                          "link": "intra_node" if local else "inter_node",
                          "bandwidth_bytes_per_second": bandwidth * GB,
                          "chunk_bytes_per_round": chunk_bytes,
                          "transfer_seconds_per_round": latency_us * 1e-6 + chunk_bytes / (bandwidth * GB)})
    round_seconds = max((edge["transfer_seconds_per_round"] for edge in edges), default=0.0)
    rounds = len(phases) * (ranks - 1)
    per_rank_send = rounds * chunk_bytes
    return {"collective": collective, "ranks": rank_ids, "logical_tensor_bytes": message_bytes,
            "chunk_bytes": chunk_bytes, "rounds_per_phase": ranks - 1, "total_rounds": rounds,
            "phases": [{"phase": phase, "rounds": ranks - 1, "seconds": (ranks - 1) * round_seconds} for phase in phases],
            "edges": edges, "bottleneck_links": [f"{edge['source']}→{edge['destination']}" for edge in edges
                                                    if edge["transfer_seconds_per_round"] == round_seconds],
            "per_rank_send_bytes": per_rank_send, "total_network_send_bytes": ranks * per_rank_send,
            "estimated_seconds": rounds * round_seconds,
            "model": "Each round costs the slowest directed edge; one channel, no overlap, routing contention, or shared-NIC limits."}


def ring_allreduce_values(rank_values):
    """Actually execute reduce-scatter + all-gather with scalar chunks.

    Input/output shape [ranks, chunks=ranks]. Copies for each round ensure
    simultaneous transfers do not accidentally see updates from that round.
    """
    ranks = len(rank_values)
    if not ranks or any(len(row) != ranks for row in rank_values):
        raise ValueError("ring demo requires a nonempty square [ranks, chunks] matrix")
    if any(not isinstance(value, (int, float)) or not math.isfinite(value) for row in rank_values for value in row):
        raise ValueError("ring demo values must be finite")
    buffers, hops = [list(row) for row in rank_values], []
    for phase in ("reduce_scatter", "all_gather"):
        for step in range(ranks - 1):
            transfers = []
            for rank in range(ranks):
                chunk = (rank - step) % ranks if phase == "reduce_scatter" else (rank + 1 - step) % ranks
                transfers.append({"source": rank, "destination": (rank + 1) % ranks,
                                  "chunk": chunk, "value": buffers[rank][chunk]})
            for transfer in transfers:
                destination, chunk = transfer["destination"], transfer["chunk"]
                if phase == "reduce_scatter":
                    buffers[destination][chunk] += transfer["value"]
                else:
                    buffers[destination][chunk] = transfer["value"]
            hops.append({"phase": phase, "round": step, "transfers": transfers})
    expected = [sum(row[column] for row in rank_values) for column in range(ranks)]
    return {"inputs": rank_values, "outputs": buffers, "expected_sum": expected,
            "all_ranks_equal_expected": all(row == expected for row in buffers), "hops": hops}


def gemm_roofline(m, n, k, element_bytes, compute_tflops, hbm_gbps):
    """Compulsory input/output traffic only; multiply-add counts as two FLOPs."""
    if any(type(value) is not int or value < 1 for value in (m, n, k)):
        raise ValueError("GEMM dimensions must be positive integers")
    if any(not isinstance(value, (float, int)) or not math.isfinite(value) or value <= 0
           for value in (element_bytes, compute_tflops, hbm_gbps)):
        raise ValueError("element bytes and hardware rates must be positive finite values")
    flops = 2 * m * n * k
    traffic_bytes = (m * k + k * n + m * n) * element_bytes
    compute_seconds = flops / (compute_tflops * 10 ** 12)
    memory_seconds = traffic_bytes / (hbm_gbps * GB)
    intensity = flops / traffic_bytes
    return {"a_shape": [m, k], "b_shape": [k, n], "output_shape": [m, n], "flops": flops,
            "compulsory_hbm_bytes": traffic_bytes, "arithmetic_intensity_flops_per_byte": intensity,
            "compute_lower_bound_seconds": compute_seconds, "memory_lower_bound_seconds": memory_seconds,
            "ideal_lower_bound_seconds": max(compute_seconds, memory_seconds),
            "limiting_roof": "compute" if compute_seconds >= memory_seconds else "memory_bandwidth",
            "attainable_tflops_upper_bound": min(compute_tflops, hbm_gbps * GB * intensity / 10 ** 12),
            "assumptions": "Each matrix read/written once; no cache tiling inefficiency, launch, layout conversion, occupancy loss, or synchronization."}


def run(config: dict, seed: int) -> dict:
    gpus = positive_int(config, "gpu_count", 8)
    per_node = positive_int(config, "gpus_per_node", 4)
    tp = positive_int(config, "tensor_parallel", 4)
    if tp > gpus or gpus % tp:
        raise ValueError("tensor_parallel must divide gpu_count")
    parameters = positive_int(config, "parameters", 7_000_000_000)
    tokens = positive_int(config, "tokens_per_replica", 2048)
    hidden = positive_int(config, "hidden_size", 4096)
    layers = positive_int(config, "layers", 32)
    parameter_bytes = positive_float(config, "parameter_bytes", 2)
    gradient_bytes = positive_float(config, "gradient_bytes", 2)
    master_bytes = nonnegative_float(config, "master_parameter_bytes", 4)
    optimizer_bytes = nonnegative_float(config, "optimizer_moments_bytes", 8)
    activation_bytes = positive_float(config, "activation_bytes", 2)
    saved_factor = positive_float(config, "saved_activation_factor", 8)
    intra = positive_float(config, "intra_bandwidth_GBps", 200)
    inter = positive_float(config, "inter_bandwidth_GBps", 25)
    latency = nonnegative_float(config, "link_latency_us", 5)
    peak_tflops = positive_float(config, "compute_TFLOPs", 600)
    hbm = positive_float(config, "hbm_bandwidth_GBps", 2000)
    capacity_gib = positive_float(config, "gpu_memory_GiB", 80)
    checkpoint_factor = positive_float(config, "activation_checkpoint_fraction", 1)
    if checkpoint_factor > 1:
        raise ValueError("activation_checkpoint_fraction must be in (0, 1]")
    sequence_parallel = config.get("sequence_parallel", False)
    if not isinstance(sequence_parallel, bool):
        raise ValueError("sequence_parallel must be boolean")
    state_components = {"parameters": parameters * parameter_bytes, "gradients": parameters * gradient_bytes,
                        "master_parameters": parameters * master_bytes, "optimizer_moments": parameters * optimizer_bytes}
    state_bytes = sum(state_components.values())
    activation_estimate = tokens * hidden * layers * saved_factor * activation_bytes * checkpoint_factor
    unit_parameters = parameters / layers  # Equal-sized wrapping units are an explicit simplification.
    fsdp_extra = unit_parameters * (parameter_bytes + gradient_bytes) if gpus > 1 else 0
    memory = {}
    for name, state_divisor, activation_divisor, extra in (
        ("dp", 1, 1, 0), ("fsdp", gpus, 1, fsdp_extra), ("tp", tp, tp if sequence_parallel else 1, 0)
    ):
        accounted = state_bytes / state_divisor + activation_estimate / activation_divisor + extra
        memory[name] = {"persistent_state_bytes_per_gpu": state_bytes / state_divisor,
                        "saved_activation_bytes_per_gpu": activation_estimate / activation_divisor,
                        "assumed_extra_unit_buffers_bytes": extra, "accounted_bytes_per_gpu": accounted,
                        "accounted_GiB_per_gpu": accounted / GIB,
                        "below_configured_capacity_in_this_model": accounted <= capacity_gib * GIB}

    def collective(size, ranks, kind="all_reduce"):
        return ring_collective(size, ranks, per_node, intra, inter, latency, kind)

    all_ranks = list(range(gpus))
    dp_gradient = collective(parameters * gradient_bytes, all_ranks)
    fsdp_gather = collective(unit_parameters * parameter_bytes, all_ranks, "all_gather")
    fsdp_scatter = collective(unit_parameters * gradient_bytes, all_ranks, "reduce_scatter")
    fsdp_time = layers * (2 * fsdp_gather["estimated_seconds"] + fsdp_scatter["estimated_seconds"])
    fsdp_send = layers * (2 * fsdp_gather["per_rank_send_bytes"] + fsdp_scatter["per_rank_send_bytes"])
    tp_activation = collective(tokens * hidden * activation_bytes, list(range(tp)))
    tp_replica_dp = collective(parameters / tp * gradient_bytes, list(range(0, gpus, tp)))
    tp_time = 4 * layers * tp_activation["estimated_seconds"] + tp_replica_dp["estimated_seconds"]
    tp_send = 4 * layers * tp_activation["per_rank_send_bytes"] + tp_replica_dp["per_rank_send_bytes"]
    compute_proxy_flops = 6 * parameters * tokens
    compute_time = compute_proxy_flops / (peak_tflops * 10 ** 12)
    breakdown = {}
    for mode, work_divisor, communication_seconds in (("dp", 1, dp_gradient["estimated_seconds"]),
                                                     ("fsdp", 1, fsdp_time), ("tp", tp, tp_time)):
        compute = compute_time / work_divisor
        breakdown[mode] = {"compute_proxy_seconds": compute, "communication_proxy_seconds": communication_seconds,
                           "no_overlap_proxy_seconds": compute + communication_seconds,
                           "perfect_overlap_proxy_seconds": max(compute, communication_seconds),
                           "global_tokens_per_step": tokens * gpus / work_divisor}
    demo_ranks = min(gpus, 4)
    demo = ring_allreduce_values([[rank * 10 + chunk for chunk in range(demo_ranks)] for rank in range(demo_ranks)])
    return {"experiment": "systems", "seed": seed, "kind": "byte accounting / simulated ring / analytical cost model; NO hardware timing",
            "units": {"GB": GB, "GiB": GIB, "TFLOP": 10 ** 12, "FMA_flops": 2},
            "shape": {"logical_parameters": [parameters], "replica_tokens": [tokens, hidden], "layers": layers,
                      "gpus": gpus, "nodes": math.ceil(gpus / per_node), "tensor_parallel_group": tp},
            "memory": {"model_state_components_bytes": state_components, "bytes_per_parameter_state": parameter_bytes + gradient_bytes + master_bytes + optimizer_bytes,
                       "gpu_capacity_bytes": capacity_gib * GIB, "estimates": memory,
                       "omitted": "Attention score tensors, fragmentation, allocator reserve, NCCL buffers, prefetch overlap, kernel workspace, logits, optimizer temporaries; fit flag is NOT an OOM guarantee."},
            "communication": {"dp_gradient_allreduce": dp_gradient,
                              "fsdp": {"all_gather_per_unit": fsdp_gather, "reduce_scatter_per_unit": fsdp_scatter,
                                       "units": layers, "all_gathers_per_unit": 2, "reduce_scatters_per_unit": 1,
                                       "per_rank_send_bytes_per_step": fsdp_send, "estimated_seconds_per_step": fsdp_time,
                                       "assumption": "Full reshard after forward; one parameter all-gather for forward and one for backward per equal-sized layer."},
                              "tp": {"activation_allreduce": tp_activation, "activation_allreduces_per_step": 4 * layers,
                                     "replica_gradient_allreduce": tp_replica_dp, "per_rank_send_bytes_per_step": tp_send,
                                     "estimated_seconds_per_step": tp_time,
                                     "assumption": "Two column/row-parallel pairs per layer, forward + backward => four activation all-reduces; optional DP between same-shard replicas. Sequence-parallel flag changes memory only, NOT collective schedule."}},
            "step_time": breakdown,
            "roofline": {"representative_gemm": gemm_roofline(tokens, 4 * hidden, hidden, activation_bytes, peak_tflops, hbm),
                         "softmax": {"shape": [tokens, hidden], "minimum_read_write_bytes": 2 * tokens * hidden * activation_bytes,
                                     "memory_lower_bound_seconds": 2 * tokens * hidden * activation_bytes / (hbm * GB),
                                     "note": "A memory traffic floor only: exponentials/reductions need their own throughput model."}},
            "ring_value_demo": demo,
            "production_gap": "Rates are hypothetical configuration inputs, not a GPU SKU. 6PT omits quadratic attention, optimizer and recomputation; memory uses a configurable activation multiplier. Compare equal token budgets explicitly; TP reduces replicas at fixed GPU count. No NCCL algorithm selection, topology discovery, contention, hierarchical collectives, or measured MFU."}
