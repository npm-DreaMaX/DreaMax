"""Summarize saved actual profiler observations without presenting timing claims."""

import argparse
import hashlib
import json
from pathlib import Path


def summarize(directory):
    directory = Path(directory)
    observations = []
    for device in ("cpu", "cuda"):
        source = directory / f"{device}.json"
        if not source.exists():
            continue
        raw = source.read_bytes()
        result = json.loads(raw)
        record = {key: result[key] for key in ("torch_version", "device", "device_name", "dtype", "operation",
                                              "shape", "warmup_steps", "measured_steps", "all_gradients_finite")}
        record["raw_report"] = str(source)
        record["raw_sha256"] = hashlib.sha256(raw).hexdigest()
        record["preserved_trace"] = str(directory / f"{device}.trace.json")
        record["observed_operators"] = sorted({event["operator"] for event in result["events"]
                                                if any(term in event["operator"] for term in ("mm", "softmax", "gelu"))})
        observations.append(record)
    if not observations:
        raise ValueError(f"No cpu.json or cuda.json found in {directory}")
    return {"kind": "Observed local smoke validation, not a portable performance benchmark",
            "generator": "python3 -m labs.profile_report --output labs/expected/profile-validation.json",
            "regenerate_measurements": [
                "python3 -m labs.torch_profile --device cpu --operation mlp --output labs/measurements/cpu.json --trace labs/measurements/cpu.trace.json",
                "python3 -m labs.torch_profile --device cuda --operation mlp --output labs/measurements/cuda.json --trace labs/measurements/cuda.trace.json"],
            "observations": observations,
            "limits": "CUDA observation exists only for a real available device. Raw timings are machine-specific and intentionally omitted from this summary. No optimizer or multi-GPU collective was measured."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", default="labs/measurements")
    parser.add_argument("--output")
    arguments = parser.parse_args()
    serialized = json.dumps(summarize(arguments.directory), ensure_ascii=False, indent=2) + "\n"
    if arguments.output:
        path = Path(arguments.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(serialized, encoding="utf-8")
        print(f"Wrote {path}")
    else:
        print(serialized, end="")


if __name__ == "__main__":
    main()
