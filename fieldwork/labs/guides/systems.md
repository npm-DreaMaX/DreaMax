# 从算子、显存到多卡通信

## 两类结果要分开读

`python3 -m labs.run --experiment systems` 是纯标准库的**成本账本与通信模拟**，不调用 GPU，默认速率不对应某个显卡型号。`python3 -m labs.torch_profile` 则调用本机 PyTorch，记录真实执行的算子与时间。先用账本建立假设，再用 profiler 和分布式 benchmark 验证；不得把公式估算称为硬件测量。

```bash
python3 -m labs.run --experiment systems --config labs/configs/systems.json --output /tmp/systems.json
python3 -m labs.torch_profile --device cpu --operation mlp --output /tmp/profile.json --trace /tmp/profile.trace.json
```

## 先建立 bytes 账本

默认参数量 P=7,000,000,000，8 GPU、每节点 4 GPU，TP=4。每 replica 处理 T=2048 个 token，hidden H=4096，L=32 层。这里 P 是独立输入，不是由 H/L 推算的精确模型结构。

每参数状态示意：BF16 参数 2 bytes、BF16 梯度 2、FP32 master parameter 4、Adam 一阶/二阶矩合计 8，共 16 bytes。不同框架可能不保存 master、以 FP32 累积梯度或分片优化器，配置必须与真实实现核对。`optimizer_moments_bytes` 只算 m/v，不重复包含 master。

因此完整状态为 112,000,000,000 bytes。`GB=10^9 bytes`，`GiB=2^30 bytes`，不能混用。DP 每卡持有全部状态；FSDP 示意将全部持久状态除以 8，另留一层完整参数/梯度缓冲；TP 将持久状态除以 4。激活用 `T*H*L*saved_activation_factor*activation_bytes` 的可调经验账本，默认 4 GiB，**没有声称准确预测所有 Transformer 激活**。

默认计入账本的每卡显存约为 DP 108.308 GiB、FSDP 17.853 GiB、TP 30.077 GiB。TP 默认未将激活除以 TP；`sequence_parallel=true` 仅改变此教学账本的激活假设，没有自动更改通信算法。`activation_checkpoint_fraction` 只缩小保存激活的估计，不计重计算成本。结果里的 fit flag 不包含 allocator reserve、碎片、attention score、prefetch、NCCL buffer、logits 或 kernel workspace，**不能承诺实际训练不会 OOM**。

## Ring 的数据搬运真的发生了什么

`ring_allreduce_values` 实际执行小数组的 reduce-scatter 与 all-gather，shape `[rank,chunk]`。每轮先快照所有发送消息，再同时更新接收方，避免就地更新导致“后一条消息读到了本轮新值”。输出 `ring_value_demo.hops` 保留 phase、round、source、destination、chunk、value；所有 rank 最终得到逐元素全局和。此示范最多 4 ranks；成本模型使用配置中的全部 GPU。

对于 p ranks、完整张量大小 M bytes，等分 chunk 为 M/p。Reduce-scatter 需要 p−1 轮，all-gather 也需要 p−1 轮，因此每 rank **发送量**为 `2*(p-1)/p*M`，全网络发送量还要乘 p。不要再次把收和发相加，误认为这里的 M 已表示双向流量。

每条环边根据物理 rank 与 `gpus_per_node` 判断节点内/节点间。每轮耗时为最慢边的 `alpha + (M/p)/bandwidth`。全同带宽时得到 `2*(p-1)*alpha + 2*(p-1)/p*M/B`。这里 B 是单条方向链路的有效 bytes/s，不是 NCCL-tests 的 busbw，也不是厂家双向聚合带宽。实际 NCCL 可选 tree、ring、分层或多通道算法，本模型没有声称复现 NCCL 策略。[NCCL collective 官方语义](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html)支持 reduce-scatter 后接 all-gather 与 all-reduce 的结果等价；上述时间模型属于课程推导。

## DP、FSDP、TP 交换的东西不同

| 路线 | 实验采用的通信假设 | 首先检查 |
| --- | --- | --- |
| DP | 每步完整梯度 all-reduce | gradient dtype、bucket、梯度累积、通信重叠 |
| FSDP | 每层前向参数 all-gather，reshard 后反向再 all-gather，最后梯度 reduce-scatter | wrap 粒度、reshard 策略、prefetch、瞬时峰值 |
| TP + DP | 每层两组 column/row 配对，前后向合计 4 次激活 all-reduce；另跨 replicas 同 shard 做梯度 all-reduce | TP 是否跨慢链路、激活大小、sequence parallel 实际 collectives |

FSDP 的每 rank 总发送量为 `(p-1)/p * (2P*b_parameter + P*b_gradient)`；每层一次 collective 的 latency 不能因只看总字节而忽略。TP 的模型内 group 默认 `[0,1,2,3]` 位于一节点；相同 shard 的 replica group `[0,4]` 跨节点。输出保留每条 edge，方便追踪真正的慢边。

默认 DP 通信代理值约 .98007 秒、FSDP 1.47336 秒、TP+DP .159956 秒。它们只由假定带宽与消息量计算，**不是测量结果**。固定 8 GPU 时，DP 每步全局 token 为 16,384，TP=4 时只有 2 replicas、全局 token 为 4096；因此不能把 step 秒数直接相除来宣布 TP 加速。先统一 token budget、global batch 与累积步数。

`step_time` 使用近似 dense 参数计算量 `6PT`，并列报告 compute+communication 和 max(compute,communication) 两种重叠假设。它没计算长序列二次 attention、optimizer、重计算或加载开销，后者也不是有保证的真实性能下界。越接近训练瓶颈，越要回到 profiler 与 trace。

## Roofline 如何指导算子实验

示范 GEMM 为 `[T,H] @ [H,4H]`。乘加算 2 FLOPs，计算量 `2*T*H*4H`，强制 HBM 读写下限 `bytes*(T*H + H*4H + T*4H)`。算术强度为 FLOPs/bytes；理想耗时下限为 `max(FLOPs/peak_FLOPs, bytes/HBM_bandwidth)`。默认大 GEMM 在假定速率下受 compute roof 限制；改成 T=1 后权重复用降低，可能转为带宽受限。

Softmax 单列读写的 memory floor，避免把 exp/reduction 当成普通 Tensor Core FLOPs 套入同一峰值。Roofline 忽略 launch overhead、布局转换、tiling、occupancy、寄存器压力与缓存命中；它是排查方向，不是 kernel 调优结果。

## 真实 profiler 的用法

```bash
python3 -m labs.torch_profile --device cpu --operation matmul --tokens 128 --hidden 256 --steps 3
python3 -m labs.torch_profile --device cuda --operation mlp --dtype float32 --output /tmp/profile-cuda.json --trace /tmp/profile-cuda.trace.json
python3 -m labs.torch_profile --device cuda --operation softmax --tokens 128 --hidden 256 --dtype bfloat16
```

输入默认 `[128,256]`，MLP 权重 `[256,1024]` 与 `[1024,256]`。每步执行 matmul、GELU、matmul、softmax、loss 和 backward，真实计算 `.grad`；没有 optimizer update，也不测试收敛。所有操作先 warmup，再单独测不带 profiler 的 wall time，之后用 `record_function` 标注 forward/backward，记录 shapes、memory 与支持算子的 FLOPs，并导出 Chrome trace。[PyTorch Profiler API](https://docs.pytorch.org/docs/stable/profiler.html)与[官方教程](https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html)说明这些接口与 CPU/CUDA activity 的含义。

测试机器已有 PyTorch `2.11.0+cu128`，CPU 与 NVIDIA GeForce RTX 4060 Laptop GPU 上的小 MLP 前反向均执行成功，所有梯度有限。实际观察到 `aten::mm`、`aten::gelu`、`aten::_softmax` 及 backward；CUDA trace 还记录了具体 GEMM/softmax kernel。不同 PyTorch、dtype、shape 和设备会选不同 kernel，不能把这些名字当成固定契约。

输出 `wall_seconds_without_profiler` 与 profiler 的 `self_cpu_time_us`/`self_device_time_us` 不应相加：CPU launch 与 GPU 执行可能重叠，嵌套 total time 也会重复计数。CPU self memory 是净分配量，不是峰值；CUDA peak 只覆盖 PyTorch allocator 的 tensor allocation，不代表进程或设备全部显存。CPU 报告的 CUDA 字段为 null；CUDA 不可用时请求 CUDA 会直接给出说明。

## 练习与故障排查

1. 固定消息量，将节点间带宽翻倍，确认 ring 的瓶颈仍在跨节点边时传输项减半；latency 不随带宽减半。
2. 将 TP 跨两节点，查看慢边与通信时间；再调整 rank group，说明 placement 为什么属于算法实现的一部分。
3. 将 GPU 数改成 1、TP 改成 1：通信量必须为 0；显存不能凭空因“开启分布式”下降。
4. 用 profiler 扫 T=1/16/128/512，记录算子 shape、wall time、memory 与 kernel 名称。CPU/GPU 同时有其他负载时重跑多次，不用单次小耗时判定升级收益。
5. 在真实多卡框架中加一项 overlap trace，验证“理论可重叠”是否实际发生；不能只看带宽利用率或 MFU 单项下结论。

缺失 torch 时核心 8 实验仍可运行；可选脚本返回如何安装的提示而不自动安装。非法 TP/GPU 配比、非正带宽、重复 rank、非法矩阵维度都会明确拒绝。测试验证量纲、守恒、ring 求和与边界，不硬编码任何机器的测量耗时。
