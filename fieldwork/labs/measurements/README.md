# 本工作区实际 profiler 观察

此目录保留本次实现验证时产生的 CPU/CUDA 原始 JSON 与 Chrome trace。它们属于小型 MLP 前向/反向冒烟记录，不是标准化硬件评测，也不是大模型训练吞吐。完整输入、shape、torch 版本、设备、warmup、测量步数都在原始报告中。

最初文件在 `/tmp/llm-webset-profile-*.json` 生成后原样复制，因此原报告中的 `trace_path` 仍保留最初路径；本目录中同名设备的 `*.trace.json` 是对应 trace 的完整副本。

可在本机重新生成（CUDA 命令要求实际可用 GPU）：

```bash
python3 -m labs.torch_profile --device cpu --operation mlp --output labs/measurements/cpu.json --trace labs/measurements/cpu.trace.json
python3 -m labs.torch_profile --device cuda --operation mlp --output labs/measurements/cuda.json --trace labs/measurements/cuda.trace.json
python3 -m labs.profile_report --output labs/expected/profile-validation.json
```

摘要不展示耗时排行，仅保留可验证的设备、算子、shape、梯度检查与原报告 SHA256。新的运行可能选择不同 kernel，或因设备不同无法运行 CUDA；不要把旧设备观察伪装为新环境结果。
