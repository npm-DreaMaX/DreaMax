"""Discrete-event rollout/trainer scheduling simulator; no real performance claim."""

from __future__ import annotations

import heapq
import math
import random
from collections import Counter, deque

from .common import positive_float, positive_int


def synchronous(durations, workers, batch_size, training_seconds):
    now, version, trace, training_busy = 0.0, 0, [], 0.0
    for offset in range(0, len(durations), batch_size):
        availability = [now] * workers
        heapq.heapify(availability)
        batch = durations[offset:offset + batch_size]
        for index, duration in enumerate(batch):
            start = heapq.heappop(availability)
            end = start + duration
            heapq.heappush(availability, end)
            trace.append({"task": offset + index, "start": start, "end": end, "policy_version": version,
                          "ingest_version": version, "lag": 0, "status": "accepted"})
        now = max(availability) + training_seconds
        training_busy += training_seconds
        version += 1
    return metrics("synchronous", now, trace, durations, workers, training_busy, version)


def asynchronous(durations, workers, batch_size, training_seconds, max_policy_lag):
    if max_policy_lag < 0:
        raise ValueError("max_policy_lag must be >= 0")
    events, pending, trace = [], deque(), []
    now, version, next_task, completed, serial = 0.0, 0, 0, 0, 0
    training_busy, trainer_running = 0.0, False

    def launch(worker):
        nonlocal next_task, serial
        if next_task >= len(durations):
            return
        task = next_task
        next_task += 1
        record = {"task": task, "worker": worker, "start": now, "end": now + durations[task], "policy_version": version}
        serial += 1
        heapq.heappush(events, (record["end"], serial, "rollout_done", record))

    def maybe_train():
        nonlocal trainer_running, training_busy, serial
        if trainer_running:
            return
        # Check version at TRAINER INGESTION, not merely at rollout completion.
        valid = deque()
        while pending:
            record = pending.popleft()
            record["lag"] = version - record["policy_version"]
            record["ingest_version"] = version
            if record["lag"] > max_policy_lag:
                record["status"] = "rejected_stale"
                trace.append(record)
            else:
                valid.append(record)
        pending.extend(valid)
        if len(pending) < batch_size and completed < len(durations):
            return
        if not pending:
            return
        batch = [pending.popleft() for _ in range(min(batch_size, len(pending)))]
        for record in batch:
            record["status"] = "accepted"
            record["train_start"] = now
            trace.append(record)
        trainer_running = True
        training_busy += training_seconds
        serial += 1
        heapq.heappush(events, (now + training_seconds, serial, "train_done", None))

    for worker in range(min(workers, len(durations))):
        launch(worker)
    while events:
        now, _, kind, record = heapq.heappop(events)
        if kind == "rollout_done":
            completed += 1
            pending.append(record)
            launch(record["worker"])
        else:
            version += 1
            trainer_running = False
        maybe_train()
    assert not pending and len(trace) == len(durations), "all completed trajectories must be accounted for"
    return metrics("asynchronous", now, trace, durations, workers, training_busy, version)


def metrics(mode, makespan, trace, durations, workers, training_busy, versions):
    accepted = [record for record in trace if record["status"] == "accepted"]
    rejected = [record for record in trace if record["status"] != "accepted"]
    return {"mode": mode, "simulated_seconds": makespan, "completed_trajectories": len(trace),
            "accepted_trajectories": len(accepted), "rejected_stale_trajectories": len(rejected),
            "accepted_per_simulated_second": len(accepted) / makespan,
            "environment_worker_busy_fraction": sum(durations) / (workers * makespan),
            "trainer_busy_fraction": training_busy / makespan, "policy_updates": versions,
            "accepted_max_lag": max((record["lag"] for record in accepted), default=0),
            "all_ingest_lag_histogram": dict(sorted(Counter(record["lag"] for record in trace).items())),
            "trajectories": sorted(trace, key=lambda record: record["task"])}


def run(config: dict, seed: int) -> dict:
    tasks = positive_int(config, "tasks", 96)
    workers = positive_int(config, "workers", 4)
    batch_size = positive_int(config, "batch_size", 8)
    training_seconds = positive_float(config, "training_seconds", 2.0)
    duration_mean = positive_float(config, "duration_mean", 3.0)
    max_policy_lag = config.get("max_policy_lag", 1)
    if isinstance(max_policy_lag, bool) or not isinstance(max_policy_lag, int) or max_policy_lag < 0:
        raise ValueError("max_policy_lag must be a nonnegative integer")
    rng = random.Random(seed)
    durations = [rng.lognormvariate(math.log(duration_mean) - 0.5, 1.0) * (5 if index % 13 == 0 else 1)
                 for index in range(tasks)]
    sync = synchronous(durations, workers, batch_size, training_seconds)
    async_result = asynchronous(durations, workers, batch_size, training_seconds, max_policy_lag)
    return {"experiment": "rollout", "seed": seed, "kind": "discrete-event simulator; synthetic task durations",
            "shape": {"task_durations": [tasks], "environment_workers": workers, "trainer_batch": batch_size},
            "synchronous": sync, "asynchronous": async_result,
            "accepted_throughput_ratio": async_result["accepted_per_simulated_second"] / sync["accepted_per_simulated_second"],
            "comparison": "Both schedules execute the same task-duration list. Async can discard stale samples, so optimizer updates and accepted datasets differ.",
            "production_gap": "One fixed-time trainer, instant policy publication, no GPU memory, KV cache, network, environment startup, or quality-vs-lag model. These times are not wall-clock benchmarks."}

