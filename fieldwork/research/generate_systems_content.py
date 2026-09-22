"""Rebuild the manually authored GPU and distributed training chapters."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def write(slug, title, subtitle, order, description, goals, sources, body):
    article = dict(slug=slug, title=title, subtitle=subtitle, track='systems', order=order,
                   minutes=45, difficulty='进阶', description=description,
                   prerequisites=['矩阵乘法与张量 shape', '梯度链式法则；可先看梯度旁路'],
                   learningGoals=goals, sources=sources, lab='systems', body=body.strip())
    (ROOT / 'src' / 'content' / (slug + '.json')).write_text(json.dumps(article, ensure_ascii=False, indent=2) + '\n')


write('gpu-kernels', 'GPU 如何训练模型：从算子到 Kernel',
      '把一次 optimizer step 画成真实的数据移动与计算，再判断哪里值得优化。', 1,
      '贯通训练 step、算子、CUDA kernel、SM、Tensor Core 和 HBM，用 roofline 与真实 profiler 建立性能直觉。',
      ['把前向与反向映射到矩阵乘与显存读写', '区分算力、内存带宽和启动开销瓶颈', '读懂 profiler 与 MFU，设计可信的算子优化实验'],
      ['gpu-architecture', 'gemm-roofline', 'torch-profiler', 'nvidia-smi-util', 'triton-vector', 'flashattention', 'flashattention-code'], r'''
## GPU 不会收到一句“把模型训练好”

Python 训练代码决定做哪些运算，框架把运算派发给设备实现，GPU 执行一批批 kernel。`loss.backward()` 也不是特殊硬件指令：autograd 沿计算依赖找到反向算子，继续启动矩阵乘、归约、逐元素运算和必要的通信。不熟悉这条梯度路径，可以先走[梯度与反向传播旁路](/learn/gradient-bridge)。

**课程分析**：理解性能的第一张图是数据什么时候在哪里，而非显卡型号排行榜。一个 step 的墙钟时间可能被数据加载、CPU 派发、HBM 访问、计算、跨卡等待或 checkpoint 拖慢；仅看到 GPU 利用率接近 100%，不能判断瓶颈。

```flow
CPU：准备 batch、组织计算图、启动设备任务
GPU 显存：参数、输入、激活、梯度与优化器状态
Forward kernels：矩阵乘、attention、归一化、损失
Autograd：按依赖启动 backward kernels
Gradient communication：多卡时同步或分片归约
Optimizer kernels：读取梯度与状态，写入新参数
下一个 batch：复用显存与执行计划
```

这是一条逻辑依赖链。真实系统允许数据传输、部分计算与通信重叠，不能将它误解为每一阶段必然串行。

## 算子、Kernel、SM 和 Tensor Core 各是哪一层

| 层次 | 具体对象 | 为什么影响性能 |
| --- | --- | --- |
| 算子 | `matmul`、softmax、RMSNorm、loss | 描述要算什么，带 shape、dtype 与 layout |
| Kernel | 一次设备程序的执行 | 一个算子可能启动多个 kernel；多个算子也能融合 |
| Thread block / SM | kernel 的工作块分配到多个流式多处理器 | 工作太少、尾部不均会让部分 SM 空闲 |
| Tensor Core | SM 内处理支持格式的矩阵块运算单元 | 不是每个算子都能用；精度与尺寸影响实现选择 |
| Register / shared memory | 片上临时数据与线程协作 | 容量有限，过大占用可降低并发 |
| L2 / 显存 | 缓存与 HBM 或 GDDR 中的大规模张量 | 搬运速度和数据复用经常比算术更关键 |

上述硬件层级与执行模型由 NVIDIA 官方性能文档说明；具体容量、支持精度和峰值需按目标硬件核验，本站不把某一代设备数字当成普遍规律。[官方硬件背景](/sources#gpu-architecture)

HBM 不是所有显存的统一名称：数据中心卡常见 HBM，消费卡也常用 GDDR。下文的 HBM 带宽模型描述设备外部显存的数据流，应用到具体卡时必须填入实际内存类型和有效带宽。

## 一个线性层，前向和反向到底在算什么

将 batch 与序列维合并，设 $X\in\mathbb R^{M\times K}$、$W\in\mathbb R^{K\times N}$，前向 $Y=XW$。来自上游的梯度 $G=\partial L/\partial Y$ 给出：

$$
\frac{\partial L}{\partial X}=GW^T,\qquad
\frac{\partial L}{\partial W}=X^TG.
$$

这三次主要计算都是 GEMM。按一次乘和一次加计两个 FLOP，单个前向约为 $2MKN$ FLOP。反向还需输入/参数梯度的矩阵乘，以及其他算子的反向；是否需要 $\partial L/\partial X$ 取决于上游是否训练。张量转置常能由 stride/库接口表达，并不意味着一定物理复制；真正的 `contiguous` 转换需要 profiler 确认。[GEMM 计数依据](/sources#gemm-roofline)

**课程分析**：BF16 参数只占每元素两字节，不代表训练只用两字节。梯度、FP32 累积或主副本、Adam 一二阶状态、保存激活及临时 buffer 共同占显存。MoE 的 active 参数适合估算部分计算量，驻留总参数才影响权重容量。先把这两本账分开。

## Roofline：先判断“算不动”还是“搬不动”

设一次操作需要 $F$ FLOP、从 HBM 移动 $Q$ byte，GPU 对应精度峰值为 $P$ FLOP/s、有效内存带宽为 $B$ byte/s：

$$
I=F/Q,\qquad \mathrm{throughput}\le\min(P,BI),\qquad
t\ge\max(F/P,Q/B).
$$

这只是理想下界，不含启动、同步、地址计算、低占用和访存不合并等开销。GEMM 的理想最少张量读写估算是 $Q=b(MK+KN+MN)$，其中 $b$ 是元素字节数；实际可能读写更多。[强度与瓶颈方法](/sources#gemm-roofline)

**课程算例**：BF16、$K=N=4096$ 时，$M=32$ 的理想算术强度约 31.5 FLOP/byte；把 $M$ 增至 2048，理想强度变为 1024 FLOP/byte。增加 token batch 可复用同一权重，提高矩阵乘效率，但也增加激活显存与端到端延迟。因此“小 batch 用不满卡”不必是 CUDA 配置出错。

对逐元素 `y=x+b`，每个元素少量计算却需要读取输入并写输出，通常更容易受访存影响。把一个 memory-bound 算子的数学表达减少一次加法，可能远不如避免一次中间张量写回有效。

## 融合与 FlashAttention：减少什么，没减少什么

**课程分析**：bias、activation、dropout、residual 若分别物化中间张量，会重复写 HBM 再读回。融合让中间结果尽可能留在片上，减少启动与流量；但过度融合可能增加寄存器压力、降低并发或阻碍其他并行。因此“kernel 数更少”不是最终验收指标，step 时间与数值一致性才是。

FlashAttention 的核心是分块计算精确 attention，通过在线 softmax 统计等手段避免把完整 $N\times N$ 注意力矩阵反复物化到 HBM；反向可以利用保存统计重算。它改善 IO 与存储，并没有把 dense attention 的数学计算复杂度自动从二次变成线性。[论文依据](/sources#flashattention)

**源码导读**：固定 `Dao-AILab/flash-attention` 的 `edb5c76ee329b18ed95d1f7ea9aa522a1331ab7d`，读取 `flash_attn/flash_attn_interface.py`：`flash_attn_func → FlashAttnFunc.apply → forward → _wrapped_flash_attn_forward`，底层转入设备实现。前向上下文保存 Q、K、V、output、softmax LSE 与 RNG 状态，反向入口调用 `_wrapped_flash_attn_backward`。[源码与 BSD-3-Clause 许可证](/sources#flashattention-code)

Q 的接口形状为 `[batch,seqlen,nheads,headdim]`，K/V 可以有更少 heads。由此检查 GQA 头数整除、causal mask 对齐、dropout 与梯度是否可用。该文件是一个具体接口路径，不能据此认定 PyTorch SDPA 在所有设备、dtype 与 mask 下都会选择同一 kernel。真实分派必须看 trace。

## 实机实验：先看测到了什么

项目不强制安装 PyTorch；已有 PyTorch 时运行下面的 CPU 观测：

```bash
python3 -m labs.torch_profile --device cpu --operation mlp --output /tmp/profile.json --trace /tmp/profile.trace.json
```

确认设备支持后可明确选择 CUDA：

```bash
python3 -m labs.torch_profile --device cuda --operation mlp --output /tmp/profile-cuda.json --trace /tmp/profile-cuda.trace.json
```

这是本站编写的微型算子实验。命令输出记录实际设备和 PyTorch 版本；没有 CUDA 时不能把 CPU 时间改名为 GPU 时间。`matmul`、`softmax`、`mlp` 用来对照计算密集、归约和多个算子串联。配置与环境问题见 `labs/README.md`；成本模型另运行 `python3 -m labs.run --experiment systems`。

**本工作区实际验证**：在 PyTorch `2.11.0+cu128`、CPU 和 `NVIDIA GeForce RTX 4060 Laptop GPU` 上分别执行了 FP32、输入 `[128,256]`、权重 `[256,1024]` 与 `[1024,256]` 的微型 MLP。实际日志包含 `aten::mm`、GELU/softmax 及反向运算，梯度有限。这里只测前向和反向，没有 optimizer、NCCL 或完整语言模型；短时单机结果不能代替数据中心硬件 benchmark。

PyTorch profiler 支持 CPU/CUDA activities、shape、memory 和用户标记。[接口来源](/sources#torch-profiler) 看表时先区分 self 时间与包含子调用的 total 时间：把父算子和子 kernel 全部求和会重复计算。CPU 启动时间也不等于 GPU 完成时间。CUDA 异步执行时用未同步的 Python 计时只测到派发；实验将计时与 profiler 开销分开，实际吞吐应看未开启 profiler 的稳定测量。

**课程分析**：先看时间线里的空洞，再看最长 kernel 和对应 shape。首次编译、autotune 与缓存预热应单列；内存测量区分 allocated 与 reserved。用 profiler 找假设，再关闭 profiler 验证优化，避免观测本身改变了被测对象。

## MFU 与“GPU 利用率”为什么不一样

`nvidia-smi` 的 GPU utilization 表示采样时间内至少有 kernel 执行的时间比例，不等于 Tensor Core 达到峰值的比例。[指标定义](/sources#nvidia-smi-util)

$$
\mathrm{MFU}=\frac{\text{每步模型有效 FLOP}/\text{step 秒数}}{\text{GPU 数}\times\text{对应精度峰值 FLOP/s}}.
$$

**课程分析**：必须声明模型 FLOP 公式、精度峰值是否稀疏、是否计重计算、padding 和 attention。粗略 $6NT$ 适合某些 dense Transformer 估算，不能照搬到所有 MoE、超长上下文或混合注意力。持续执行访存 kernel 可以让利用率很高而 MFU 很低；这未必意味着程序有错，可能是硬件与工作负载的匹配问题。

## 调试任务：每次只改变一个瓶颈

| 现象 | 假设 | 验证方法 |
| --- | --- | --- |
| 大量短 kernel，中间很多空洞 | CPU 派发或同步开销 | 看 `.item()`、频繁日志与小算子；再试编译/融合 |
| GEMM 很小且碎片多 | token batch 或专家 batch 不足 | 分桶 shape，比较更大 batch 的吞吐与峰值显存 |
| kernel 时间降，step 不变 | 原本不在关键路径 | 看数据等待、通信或 optimizer 占比 |
| 新 kernel 更快却 loss 变坏 | 精度、mask、dropout或梯度错误 | 对照 forward 与 backward 数值误差 |

**工程任务**：保留相同输入与损失，对三个 shape 测 matmul/softmax/MLP，提交未开启 profiler 的时间、实际设备、dtype、峰值显存和时间线解释。然后从 Triton 官方向量加法教程定位 `program_id`、`load`、`store` 的边界 mask；解释尾块为何必须 mask。[可选源码练习](/sources#triton-vector) 不需要为了这门课先重写高性能 GEMM；只有确认瓶颈、正确性与目标 shape，定制 kernel 才有明确目标。
''')


write('distributed-training', '多卡训练：参数在哪里，数据怎样流动',
      '从两张卡的梯度同步，推演到 FSDP、Tensor Parallel 与集群拓扑。', 2,
      '建立显存、通信量和关键路径三本账，理解 DP/TP/PP/CP/EP/FSDP、ring collective 与跨机带宽。',
      ['画出每个rank的参数、激活与梯度位置', '按byte推导collective成本和并行组', '用小规模基线排查带宽、overlap与恢复故障'],
      ['nccl-bandwidth', 'nccl-collectives', 'nccl-diagnostics', 'torch-fsdp-code', 'fsdp2-doc', 'megatron-parallel-guide', 'torch-distributed-checkpoint'], r'''
## 多买几张卡，不会自动形成一个更大的 GPU

每张卡有自己的显存、计算与通信路径。训练程序中的 rank 是一个通信参与者，常见部署是一进程一卡。多卡训练要回答三个问题：每个 rank 持有什么张量、执行哪些算子、何时必须等别人。模型放得下只是第一关；通信使它能共同更新，调度决定它是否有效率。

**课程分析**：先学[GPU 内的一步](/learn/gpu-kernels)，再看 GPU 之间的依赖。数据并行可以让不同卡处理不同样本，但没有减少每份模型的显存；张量并行拆算子，FSDP 拆存储，两者解决的问题不同。

## 从两张卡的同一次更新开始

设两个 rank 各持有相同参数，分别计算局部 batch 的平均梯度 $g_0,g_1$。若局部有效样本数相等，全局平均梯度为 $(g_0+g_1)/2$。AllReduce(sum) 使每个 rank 得到和，再按约定归一化；不是所有库都以同一个地方、同一个规则除 world size。

如果各 rank 的有效 token 数不同，简单平均局部 token 均值通常不等于全局 token 均值。应对分子和有效 token 分母作一致处理。梯度累积还要检查跨 microbatch 的权重。这个统计问题与 NCCL 的网络速度无关，但能让“分布式版”训练出不同结果。

```flow
相同初始参数，rank 0 与 rank 1 各取不同数据
各自 forward：保存各自激活
各自 backward：得到局部梯度
Collective：归约梯度或梯度分片
各 rank 更新自己拥有的参数/状态
下一步需要时重新同步或重建完整参数
```

## 六种并行，拆的是不同轴

| 路线 | 分给不同 rank 的对象 | 主要通信与权衡 |
| --- | --- | --- |
| DP / DDP | 不同样本；通常各持完整模型 | 梯度 AllReduce，显存重复 |
| FSDP | 参数、梯度、优化器状态分片 | 参数 AllGather、梯度 ReduceScatter，换通信省显存 |
| TP | 同一层权重/中间维度 | 每层频繁归约或汇集，偏好高速互联 |
| PP | 不同层/阶段 | 激活和梯度 send/recv，microbatch 调度与空泡 |
| CP | 同一序列不同区段 | 跨区段交换 attention 所需信息，适合长上下文 |
| EP | 不同 expert | token dispatch/combine，负载与 AlltoAll 开销 |

Megatron Core 官方指南列出这些维度及组合；具体实现中的分片布局和通信并不由缩写唯一决定。[官方并行指南](/sources#megatron-parallel-guide) EP 也不一定是额外独立乘数：不同框架可重用 DP 等物理 rank，必须读 process group 和并行配置。

**课程拓扑例子，不是任何模型的官方配置**：两台机器、每台四卡，取 TP=4、DP=2。rank 0–3 组成机器 A 的 TP group，4–7 组成 B 的 TP group；对应分片的 DP groups 是 `[0,4]`、`[1,5]`、`[2,6]`、`[3,7]`。TP 通信留在机内，DP 跨机。把 rank 顺序换错，就可能让高频 TP 跨慢链路。

全局 batch 通常与 microbatch、梯度累积和独立数据副本数有关；不能直接乘所有 GPU 数，因为 TP/PP/CP 中多张卡可能共同处理同一批样本。

## 第一笔账：显存是峰值，不只是平均分片

**课程预算假设**：BF16 参数 2 byte、BF16 梯度 2、FP32 主参数 4、Adam 两个 FP32 moment 8，共 16 byte/参数。某些实现的梯度或主副本不同，不能把 16 当通用常数。还要加激活、临时 buffer、通信桶与 allocator 余量。

FSDP 的持久状态大致随分片数下降，但某一层计算前需要重建该层参数，prefetch 可能让相邻层同时占用内存。一次调用把整个模型放入一个巨大的 AllGather group，峰值与按 block 分组完全不同。显存不足时先定位 OOM 在 forward、backward、optimizer 还是保存阶段，再决定分片、重计算或减 batch。

## 真实源码：FSDP2 的生命周期

固定 PyTorch commit `a402343453f89b31a2ec8372b304accdc5b78e5f`，文件 `torch/distributed/fsdp/_fully_shard/_fully_shard.py::fully_shard`。它接收 module、DeviceMesh、mixed precision、reshard 等配置，初始化状态和参数组，并在 module 上接入 FSDP 行为。[固定源码](/sources#torch-fsdp-code)

源码明确描述：forward 前 AllGather 参数；若 `reshard_after_forward=True` 则用后释放完整参数；backward 前再次 AllGather；梯度计算后 ReduceScatter。参数分片表示为 DTensor。输入不是“把整个训练循环自动分布式化”，而是 module 与 mesh；数据采样、loss 归一化、优化器和 checkpoint 仍需协同。[接口文档](/sources#fsdp2-doc)

**课程分析**：这一调用链解释为什么 FSDP 的通信不能简单等同于 DDP 的一次梯度 AllReduce。是否重分片、分组粒度和预取决定通信次数与峰值；本站成本实验明确采用“前向后重分片、反向再聚合”的一种路径，不宣称覆盖全部策略。

## 第二笔账：Ring AllReduce 传多少 Byte

设 $p$ 个 rank，每个待归约张量为 $M$ byte。教学 ring 分为 ReduceScatter 和 AllGather，每阶段 $p-1$ 轮，每轮每 rank 发送 $M/p$ byte，因此：

$$
V_{\mathrm{send/rank}}=2\frac{p-1}{p}M,
\quad t_{\mathrm{ring}}\approx2(p-1)\alpha+2\frac{p-1}{p}\frac{M}{B}.
$$

$\alpha$ 是每轮启动/延迟项，$B$ 是模型假设的有效单向带宽。接收量与发送量同阶；不要把“发送+接收”重复当成单向链路流量。NCCL 实际会根据拓扑和消息大小选算法、协议及通道，未必就是这个单 ring。[官方带宽口径](/sources#nccl-bandwidth)

**手算**：四 rank、每卡 1 GiB 梯度，发送量为 1.5 GiB/卡。若有效带宽是假设的 50 GB/s，忽略延迟得到约 32.2 ms 下界。GiB 是 $2^{30}$ byte；GB/s 是 $10^9$ byte/s；400 Gb/s 的原始 bit rate 除以八才是 50 GB/s，协议、共享链路和竞争还会降低有效值。

NCCL tests 的 `algbw=M/t`，AllReduce 的 `busbw=algbw·2(p-1)/p`。busbw 是便于解释 collective 的归一化指标，不是直接读取每条物理线的计数器，也不是简单与整机所有端口标称带宽相加比较。[定义](/sources#nccl-bandwidth)

## 集合通信与物理网络怎样相遇

AllGather 把各 rank 分片汇集到每人，ReduceScatter 先归约再各留一片，AlltoAll 交换面向不同目标的不同分片。所有成员必须按协议参与；count、dtype 或调用次序不匹配可能挂住。[NCCL 语义](/sources#nccl-collectives)

**课程分析**：PCIe 是常见设备总线，NVLink/NVSwitch 组成 GPU 高带宽互联，InfiniBand 或以太网/RoCE 常承担网络连接。现代系统也存在跨节点 NVLink，不能把“跨机必然只有 IB”当规则。瓶颈应由实际路径确定：GPU 到 NIC 是否跨 CPU socket、NIC 是否共享、交换网络是否过订阅、同一节点是否存在慢链路。

在准备好的 GPU 机器上先看 `nvidia-smi topo -m`。先测单机两卡，再测目标进程映射下的跨机 collective；若单机正常跨机慢，先定位网卡选择、路径和带宽基线，不要立即降低学习率。官方 NCCL 故障指南也区分 GPU、网络、运行时和拓扑诊断。[排查依据](/sources#nccl-diagnostics)

## 第三笔账：Overlap 能隐藏多少通信

反向按层产生梯度，早完成的 bucket 可以先通信，同时计算更早层的反向。理想重叠时部分时间接近两者最大值，但存在依赖的尾部必须暴露。bucket 太小，启动开销多；太大，等待梯度集齐才开始通信。FSDP prefetch 用显存换等待时间，也可能争用计算所需带宽。

**课程分析**：优化目标是 critical path。trace 中通信 kernel 与计算同时存在，不证明通信已完全隐藏；它们可能争抢 SM 或 HBM，使计算变慢。按 rank 比较 step 时间、可隐藏区间和尾部等待。最慢一个 rank 决定同步步长，数据加载、专家负载和故障网卡都可能制造慢 rank。

## 可运行预算实验与真实机器检查

```bash
python3 -m labs.run --experiment systems --config labs/configs/systems.json --seed 7
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

课程实现输出显存账本、ring 的逐轮传输事件及 DP/FSDP/TP 通信估计。它是可核查的字节/时序模型，不会启动真实多机集群。改变 GPU 数、每节点卡数、带宽和消息大小，观察为什么增加卡数可能省显存却增加延迟项。字段说明与默认假设见 `labs/README.md`。

默认保持卡数和每个副本的 token 数时，TP 消耗多张卡协同处理同一批数据，因此 DP 与 TP 的全局 token 数不同。不能只凭输出的 step 时间判定谁更快；先对齐任务量，再比较 token/s、每 token 成本、显存和数值目标。activation 预算是可调假设，显示“能放下”不等于通过了真实 OOM 测试。

已有 CUDA、NCCL 与编译好的官方 nccl-tests，并且当前机器至少有两张可见 GPU 时，可在该上游仓库执行：

```bash
./build/all_reduce_perf -b 8M -e 128M -f 2 -g 2
```

这是上游真实 benchmark 命令形式，不是本站已完成的集群测量。比较多种消息大小的时间和 `busbw`，不要拿小消息延迟区间预测巨大梯度的带宽。跨机启动还需正确 MPI/集群配置，不能把单机 `-g` 增大就视为跨机测试。[官方测试仓库](/sources#nccl-bandwidth)

## 保存、恢复与故障定位

checkpoint 至少要保持参数、优化器、scheduler、随机状态、数据游标与 step 的一致性；异步保存还要明确哪个 step 的状态已持久化。PyTorch DCP 提供分布式模型与 optimizer state 的保存/加载接口，但数据队列与训练作业恢复逻辑仍需应用负责。[官方 DCP](/sources#torch-distributed-checkpoint)

**工程任务**：用两节点八卡的假设拓扑，画出 TP/DP groups，手算每层激活与每步梯度消息字节数。分别注入慢网络、慢数据 rank、全模型一次 AllGather、保存阶段显存峰值四种问题，为每个问题写出观测指标与反证实验。最后设计“某rank保存失败”和“恢复到不同world size”的验收条件；没有完成一致性测试，就不能把能加载权重等同于训练可恢复。
''')
