# 可执行机制实验

这里是网站的原创教学实现，不是第三方仓库源码的副本。8 个核心实验全部使用 Python 标准库，建议 Python 3.10+；无需 GPU、PyTorch、模型权重、API Key 或额外依赖。实验会真实计算梯度、更新参数或运行离散事件；其中的吞吐与评测模拟明确不代表任何真实模型或硬件成绩。另有独立的可选 PyTorch profiler，用于观测本机真实算子，详见下文。

所有命令都在项目根目录 `LLM_Webset/` 执行：

```bash
python3 -m labs.run --experiment gradients
python3 -m labs.run --experiment mixture --seed 7
python3 -m labs.run --experiment moe
python3 -m labs.run --experiment preference
python3 -m labs.run --experiment agent --output /tmp/agent.json --trajectories /tmp/agent-traces.jsonl
python3 -m labs.run --experiment rollout --output /tmp/rollout.json --trajectories /tmp/rollout-traces.jsonl
python3 -m labs.run --experiment evaluation
python3 -m labs.run --experiment systems --output /tmp/systems.json
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

默认读 `labs/configs/<experiment>.json`，默认 `--seed 7`。用 `--config /path/config.json` 替换配置，缺省字段仍有安全的实验默认值。没有 `--output` 时 stdout 输出完整 JSON；指定时将完整 JSON 写入文件，stdout 返回文件回执。`--compact` 取消缩进。配置错误会给出提示并退出为 2。网页名称 `data-mixture` 和 `agent-loop` 分别是 CLI `mixture`、`agent` 的别名。

`--trajectories` 仅适用于 `agent` 与 `rollout`。Agent 保存最后一次 held-out 评测的前 8 条轨迹，不是全部 19,200 条训练轨迹；rollout 保存全部异步模拟轨迹。结构中保留行为策略版本，便于检查过期接收。每个实验 JSON 均包含 `kind`、`shape`、`seed` 和 `production_gap`。

| 实验 | 需要看懂的机制 | 阅读与任务 |
| --- | --- | --- |
| `gradients` | 计算图、共享节点梯度累加、链式法则、参数更新 | [计算图实验](guides/gradients.md) |
| `mixture` | 分布切换、数据权重、共享参数干扰、回放权衡 | [Mixture 实验](guides/mixture.md) |
| `moe` | Top-k 路由、容量、热专家、assignment 与 token 的区别 | [MoE 实验](guides/moe.md) |
| `preference` | DPO 的 reference log-ratio、稳定损失与解析梯度 | [偏好优化实验](guides/preference.md) |
| `agent` | 环境协议、轨迹、终态奖励、组优势、真正的策略更新 | [Agent 实验](guides/agent.md) |
| `rollout` | 同步屏障、异步队列、策略滞后、trainer ingestion | [Rollout 实验](guides/rollout.md) |
| `evaluation` | pass@k、按 task 重采样、污染候选与误差 | [评测实验](guides/evaluation.md) |
| `systems` | 显存 bytes 账本、实际 ring 求和步骤、DP/FSDP/TP 通信与 roofline 成本模型 | [系统与算子实验](guides/systems.md) |

## 默认输出与再生成

运行 `python3 -m labs.report --seed 7 --output labs/expected/seed7.json` 会从原始配置实际运行全部实验，再生成 [默认结果](expected/seed7.json)。生成器是 `labs/report.py`，算法源码、配置和随机种子全部保留。末位浮点数可能因平台略有不同；测试检查数值误差和机制不变量，不逐字断言完整输出。

| seed 7 默认设置 | 结果摘要 |
| --- | --- |
| 自动微分 | 与中心差分最大误差约 `1.18e-10`；40 步后 loss 约 `7.67e-11` |
| Mixture | A95% 阶段 A/B MSE 约 `.00297 / 1.18570`；A65% 回放约 `.14217 / .58731` |
| MoE | 热专家路由丢弃 115 个 assignment；移除偏置后为 0；二者完全丢失的 token 均为 0 |
| DPO | loss 从 `.724995` 降到 `.656529`；梯度差约 `7.01e-13` |
| Agent | 400 个 held-out 任务的采样成功率由 `.020` 提高到 `.975` |
| Rollout | 同步模拟 170.369 秒接收 96 条；异步模拟 93.860 秒接收 88 条、拒收 8 条过期轨迹 |
| Evaluation | 模拟 pass@1 `.48125`；按 task bootstrap 95% 区间约 `[.396875, .559375]` |
| Systems | 假想 7B 配置的每 GPU 显存账本：DP `108.31 GiB`，FSDP `17.85 GiB`，TP `30.08 GiB`；不是 OOM 保证或实测 |

## 可选：在本机观察真实算子

已有 PyTorch 时可运行下列命令。没有安装时脚本会友好退出；本项目不自动下载大型依赖。可自行使用 `python3 -m pip install torch` 安装适合平台的版本；CUDA 构建须与实际运行环境匹配。CPU 是显式默认值，CUDA 不可用时不会悄悄退回 CPU 后把结果标成 GPU。

```bash
python3 -m labs.torch_profile --device cpu --operation mlp --output /tmp/profile-cpu.json --trace /tmp/profile-cpu.trace.json
python3 -m labs.torch_profile --device cuda --operation mlp --output /tmp/profile-cuda.json --trace /tmp/profile-cuda.trace.json
python3 -m labs.torch_profile --device cpu --operation softmax --tokens 128 --hidden 256
```

`--operation` 支持 `matmul / softmax / mlp`，支持 `--dtype float32|bfloat16`、`--tokens`、`--hidden`、`--steps`、`--warmup`、`--threads`。输出报告实际 `torch_version`、device、输入 shape、算子调用和 self time；Chrome trace 保留调用时间线。无 profiler 的独立 wall time 与 profiler 内事件分开记录，CPU memory delta 与 CUDA allocator peak 分开标记。测试环境已有 PyTorch `2.11.0+cu128`，CPU/CUDA 小 MLP forward/backward 都实际验证通过；这些观察不代表集群训练吞吐。

本次实际观察的[摘要](expected/profile-validation.json)、[原始报告与 trace](measurements/README.md)已经保留。摘要生成器为 `python3 -m labs.profile_report --output labs/expected/profile-validation.json`；原始报告包含机器相关耗时，摘要有意只呈现设备、shape、实际算子与梯度有限性。

## 阅读顺序与工程边界

如果脑中还没有反向传播的图，从 `gradients.py` 的 `loss_graph → Value.backward → 参数更新` 读起，然后看 `preference.py` 如何只替换损失，最后看 `agent.py` 如何通过轨迹构建梯度估计。生产大模型会把标量替换为张量、把单进程替换为多个 worker，但“前向结果 → 局部导数 → 链式累加 → 更新”的机制仍能对应。

这些实验刻意缩小了规模。没有任何一个实验声称复现论文训练结果；没有网络请求、任意 shell 执行或隐藏在线服务。Agent 的 verifier 与 environment 在代码责任上分离，仍处于同一 Python 进程，不构成安全沙箱。生产系统应通过独立进程或容器、私有测试与权限隔离提供真实边界。

测试覆盖中心差分、共享 DAG 的梯度累加、数值极值、学习结果、环境终态与无效动作、容量守恒、队列轨迹守恒、过期拒收、尾批处理、组合公式、ring 真实求和、通信量纲、单 rank 边界、带宽瓶颈、缺失 PyTorch 提示与 CLI 配置错误。它们验证这些小实验的正确性，不验证第三方框架或大规模训练性能。
