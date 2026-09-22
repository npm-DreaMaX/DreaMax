"""Author-owned chapter sources; regenerate only these two JSON documents."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def write(slug,title,subtitle,track,minutes,description,goals,sources,lab,body):
    data=dict(slug=slug,title=title,subtitle=subtitle,track=track,order=1,minutes=minutes,difficulty='快速补充' if track=='foundations' else '进阶',description=description,prerequisites=['Python / PyTorch','基本微积分'] if track=='foundations' else ['训练与推理的区别','注意力与张量 shape'],learningGoals=goals, sources=sources,lab=lab,body=body,)
    (root/'src/content'/f'{slug}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
write('gradient-bridge','梯度如何穿过计算图','把 backward、optimizer.step 和训练系统放在同一张图里','foundations',25,'你可以熟练调用工具包，却仍不确定训练究竟改变了什么。这一章只补上那张必要的图：前向保存什么，反向返回什么，参数又在哪一步发生变化。',['手算一条计算图中每条边的局部梯度','解释反向传播与梯度下降的不同职责','识别梯度累积、mask 和 detach 导致的训练异常'],['torch-autograd','olmo-core','verl-agent-loop'],'gradients',r'''
## 一步训练，其实是三件不同的事

先给结论：**前向传播算输出和损失，反向传播算损失对参数的导数，优化器根据导数更新参数。** `loss.backward()` 本身通常不会改变参数。调用优化器后，下一次前向才用上新参数。PyTorch 的 autograd 在前向构建操作图，再根据链式法则累积叶子张量梯度。[官方文档与源码入口](/sources#torch-autograd)

```flow
样本 x、目标 y 与当前参数 θ
前向：保存需要的中间结果，得到损失 L
反向：从 L 出发，沿计算图累积 ∂L/∂θ
优化器：结合梯度、学习率与优化器状态，更新 θ
下一批数据：使用新参数重新构建图
```

这里的“反向”不是把句子倒着读，也不是重新生成一个答案。它是在回答：**刚才的误差，如果某个参数稍微改变，会增加还是减少、改变多少？**

## 用一个参数，把整张图算出来

设输入 $x=2$，目标 $y=5$，模型 $\hat y=wx+b$，当前 $w=0.5,b=0$。损失选最简单的平方误差：

$$L=\frac12(\hat y-y)^2=\frac12(wx+b-y)^2.$$

前向得到：乘法输出 1，加法输出 1，误差 -4，损失 8。接着反向走同样的边：

| 节点 | 本节点的局部导数 | 从后面传回的梯度 | 送给前一节点的梯度 |
| --- | --- | --- | --- |
| $L=\frac12e^2$ | $\partial L/\partial e=e$ | 1 | -4 |
| $e=\hat y-y$ | $\partial e/\partial\hat y=1$ | -4 | -4 |
| $\hat y=z+b$ | 对 z、b 都为 1 | -4 | z 与 b 各得到 -4 |
| $z=wx$ | 对 w 为 x=2 | -4 | w 得到 -8 |

所以 $\partial L/\partial w=-8$，$\partial L/\partial b=-4$。取学习率 0.1，梯度下降更新为 $w=1.3,b=0.4$。下一次预测变成 3，损失变成 2。**减去负梯度，参数反而增大。** 打开[梯度实验室](/labs/gradients)，按前向、反向、更新三个按钮逐步确认。

## 为什么一条路径相乘，多条路径相加

想象同一个参数被两个分支使用：一个影响注意力输出，另一个影响辅助损失。沿一个分支逐层“变化率相乘”；如果两条路径都影响最终损失，就把两条贡献相加。反向自动微分因此需要拓扑顺序，并累计到同一个叶子的梯度中。

一个极小反例：$L=w^2+w$，第一条路径返回 $2w$，第二条返回 1，最后是 $2w+1$。若实现用赋值覆盖而不是累加，就会静默丢掉一条路径。这也是教学自动微分实验需要测试共享子图的原因。

矩阵形式没有改变原则。对于 $Y=XW$，若 $X:[B,D]$、$W:[D,H]$、输出梯度 $G:[B,H]$，则 $\nabla_WL=X^\top G:[D,H]$，$\nabla_XL=GW^\top:[B,D]$。shape 是读反向代码时最实用的第一项检查。

## backward 不等于梯度下降

**课程分析**：梯度是测量局部变化率的结果；SGD、AdamW 等优化器决定如何使用它。梯度算得完全正确，也可能因为学习率过高而训练失败。对于这个 toy，Hessian 的非零特征值为 $x^2+1=5$；沿有效方向，固定步长梯度下降需要 $0<\eta<2/5$ 才收敛。界限只属于当前二次目标，不能搬成 LLM 学习率。

把交互实验的学习率调到 0.5，会观察到震荡发散。此时“再算精确一点梯度”解决不了更新步长问题；换成真实训练，要把梯度异常、优化器状态异常与数据异常分别检查。

```python
# 教学 PyTorch 对照；本章纯标准库实验无需安装 torch
import torch
w = torch.tensor(0.5, requires_grad=True)
b = torch.tensor(0.0, requires_grad=True)
optimizer = torch.optim.SGD([w, b], lr=0.1)
optimizer.zero_grad(set_to_none=True)
loss = 0.5 * (w * 2 + b - 5).square()
loss.backward()                 # w.grad=-8, b.grad=-4；参数未改变
optimizer.step()               # w=1.3, b=0.4
```

`zero_grad` 清理上一轮累计结果。它的位置要与 microbatch 累积策略配套：每个 microbatch 都清理，会破坏累积；更新后一直不清理，又会把跨更新的梯度混在一起。[PyTorch autograd](/sources#torch-autograd)

## 从一条图走到真实训练 step

生产模型有数十亿参数，但仍然执行同一组职责。变复杂的是中间激活存在哪里、何时重算、梯度在哪个 rank、哪些 token 应该计入 loss。OLMo-core 的 `TransformerTrainModule.train_batch` 展示有效标签统计、microbatch 与反向入口；优化器步骤独立执行。这是透明实现对照，不是对其模型能力排名的判断。[固定源码与调用链](/sources#olmo-core)

| 机制 | 为何出现 | 对计算图和更新的影响 |
| --- | --- | --- |
| Activation checkpointing | 激活显存不足 | 反向时重新计算部分前向，换显存但增加算量 |
| 梯度累积 | 单卡放不下整个 batch | 多个 microbatch 累积梯度后只更新一次 |
| 数据并行 | 多卡处理不同样本 | 梯度需要归约，保证副本执行相同更新 |
| 参数分片 | 参数与 optimizer state 太大 | 前向/反向前收集参数，反向后归约并分片梯度 |
| Token mask | padding、工具观测不该直接成为优化动作 | 决定哪些位置参与损失及分母 |

特别留意平均方式：先对每个不同长度的样本取平均，再对样本平均，不等于对全 batch 有效 token 统一平均。这不是一个无关紧要的数值误差，而是改变样本权重。

## Agent RL 里的梯度为什么不会穿过终端

环境执行工具、运行测试、返回奖励，通常不在 PyTorch 可微图内。策略梯度使用采样动作的 log-prob 和 advantage，改变以后选中这些动作的概率；它不需要对“编译器”求导。

教学目标可写为 $L=-A\sum_t m_t\log\pi_\theta(a_t|h_t)$。$m_t$ 把工具观察等非策略 token 排除；这里假定 A 已作为固定权重，不让梯度穿过 advantage。真实 PPO/GRPO 还包含 old log-prob、概率比、clipping、KL 等机制。[Agent rollout 中的 response mask](/sources#verl-agent-loop)

这个连接很重要：反向图只包含策略更新所需的张量计算，**训练数据流**还包含远处的 CPU 环境、验证器和轨迹存储。下一步阅读[一条 rollout 如何变成训练样本](/learn/agent-rollout)。

## 运行、核对，然后故意破坏它

```bash
python3 -m labs.run --experiment gradients
python3 -m unittest discover -s tests -p 'test_*.py'
```

`labs/gradients.py` 是本站原创的标量自动微分教学实现。输入和输出都是标量节点；实验把解析梯度与中央有限差分相比较。它没有 GPU tensor、并行反向引擎、mixed precision 或 Adam 状态；不要把其运行时间当成生产性能。

预期观察：初始 loss=8，w 梯度=-8、b 梯度=-4，学习率 0.1 更新后的 loss=2。小步长中央差分应与自动微分相近。差分步长过小会受浮点消减误差影响，过大则不是局部导数。

| 现象 | 首先检查 | 可验证动作 |
| --- | --- | --- |
| 参数一直没变 | 是否执行 optimizer.step、是否加入 optimizer | 保存更新前后参数差范数 |
| 梯度为 None | 图是否被 detach/no_grad 打断、是否叶子 | 检查 requires_grad 与 grad_fn |
| 梯度越来越大 | 是否忘了清理、loss分母改变 | 固定同一批重放并记录逐层范数 |
| loss下降却没有任务收益 | loss覆盖的token是否符合目标 | 可视化mask并检查独立评测 |
| 单卡好、多卡坏 | 归约与有效token分母是否一致 | 对齐一个等价全局batch的梯度 |

工程任务：用共享参数构造 $L=w^2+w$，写出两条反向路径；再把一个长度为 1、另一个长度为 100 的样本放在同一 batch，解释两种平均损失的权重差异。你能够画出并验证这两件事，就已经拥有阅读后续训练代码所需的核心直觉。
''')
write('inference-serving','推理服务也是训练系统的一部分','从 KV cache 与调度预算，理解 rollout 为什么等不到下一批数据','serving',35,'现代 RL 把生成放进训练内循环。一次服务优化会影响吞吐、行为策略分布、数据新鲜度和学习效率，不能只用 tokens/s 判断。',['估算 KV cache 的内存随上下文和并发增长的方式','沿 Scheduler 的预算与队列解释连续批处理','设计包含数值一致性和有效轨迹吞吐的服务评测'],['vllm-scheduler','pagedattention-paper','flashattention','verl-agent-loop'],'rollout',r'''
## 从在线服务，回到训练内循环

传统预训练读取现成 token；在线 RL 要先让当前策略生成答案或完成 Agent 轨迹。推理不仅服务用户，也在生产下一次梯度更新所需的数据。**课程分析**：当 rollout 的生产速度比 trainer 消费速度慢，再优化一次反向 GEMM，可能只会让 trainer 更早进入等待。

训练需要的不只是文本，还包括 token IDs、行为策略版本、生成边界、必要的 log-prob、停止原因与工具观测。把这些内容仅序列化成对话字符串，再重新 tokenize，可能破坏动作位置与 loss mask 的对应。[verl AgentLoop 数据接口](/sources#verl-agent-loop)

```flow
任务队列：prompt / tool schema / generation config
推理队列：prefill → decode → 工具调用暂停
环境队列：CPU执行 → 新observation
恢复推理：追加token或重建上下文
轨迹完成：保存版本、log-prob、mask、stop reason
trainer：接收、过滤、重算必要概率、更新策略
```

## 为什么 prefill 和 decode 的瓶颈不同

Prefill 对输入序列进行大块计算；decode 常常每次只增加一个 token，但要读取已有参数和注意力状态。实际瓶颈取决于 batch、sequence length、架构、kernel 和设备，不能把“prefill 永远 compute-bound”当定律。

**课程分析**：使用 roofline 时先估算 arithmetic intensity：有效 FLOPs 除以从主存移动的 bytes。小 batch decode 可能低强度、带宽受限；更大 batch 增加权重复用，但 KV 内存也增加。长 prefill 则会挤占调度 token 预算、抬高短请求的 TTFT。应按 prefill 和 decode 分段看 profiler。

| 指标 | 回答的问题 | 单独看会误判什么 |
| --- | --- | --- |
| TTFT | 从提交到第一个token等多久 | 包含排队，不全是prefill计算 |
| ITL / TPOT | 生成过程是否流畅 | 不能代表整条Agent完成时间 |
| Output tokens/s | decoder吞吐 | 可能在生产过长、无效的轨迹 |
| Accepted trajectories/s | 训练实际接收速度 | 还需看质量、难度、policy lag |
| Task success / wall time | 同等时间内是否更有效 | 必须控制任务分布和预算 |

## 先算 KV，再谈并发

对标准全注意力 decoder，忽略 padding、元数据与分片，KV 内存可近似写为：

$$M_{KV}=2\times L\times B\times S\times H_{kv}\times d_h\times b.$$

2 代表 K 与 V，L 是层数，B 是并发序列数，S 是已缓存长度，$H_{kv}$ 是 KV head 数，$d_h$ 是 head dimension，b 是每个元素的 bytes。GQA 用 KV head 而不是 query head；MLA、共享KV、滑窗、混合线性注意力需要重写公式，不能机械套用。

教学例子：L=32、B=8、S=8192、$H_{kv}=8$、$d_h=128$、BF16 两字节，得到 8 GiB KV。这里 **GiB=2³⁰ bytes**；设备标称带宽通常用十进制 GB/s。若只看模型权重大小来决定能开多少并发，很容易误判显存余量。

PagedAttention 把逻辑序列 KV 分成块来管理，减少连续预留带来的碎片和复制。它不会消除 KV 的所有内存，也不意味着改变注意力数学定义。[论文及实验边界](/sources#pagedattention-paper)

## 精读调度器，只追一条调用链

本课把 vLLM 调度器固定到来源登记中的 commit，不跟随移动的 main。重点读 `vllm/v1/core/sched/scheduler.py` 中 `Scheduler.schedule`，再沿 `KVCacheManager` 的块分配接口确认预算与状态迁移。[固定源码、符号与摘录](/sources#vllm-scheduler)

按三轮阅读：

1. 找等待队列、运行队列与 preempted 状态，理解请求什么时候被接纳。
2. 跟踪 `token_budget`、每请求需要的 token 数和 KV 分配失败路径，理解谁占掉了剩余预算。
3. 追到 scheduler output 与 worker execution 的交接，检查完成结果如何更新请求状态。

**源码观察**：本次固定实现用统一的 token 数量和已计算数量安排执行；你应把“连续批处理”理解为反复重新组织活跃请求的工作，而不是等一整个静态 batch 全部结束。源码所支持的配置项不等于所有部署都启用它们。

输入是请求状态与资源预算，输出是本轮调度决定；调度函数自身不执行所有 GPU kernel。读到 Python 队列，就要继续问实际计算在哪个 worker、哪个 stream，以及延迟是否来自 host scheduling。

## 四条优化路线，各自解决什么

| 路线 | 目标 | 代价与需要验证的条件 |
| --- | --- | --- |
| Continuous batching | 减少完成长度不齐造成的空位 | 调度开销、KV压力和排队公平性 |
| Chunked prefill | 让大prompt与decode共享迭代预算 | 长prompt TTFT可能上升；chunk越小不一定越好 |
| Prefix caching | 复用相同前缀的已算KV | 必须精确匹配token/模板/相关配置，不能复用不同语义状态 |
| Prefill/decode分离 | 分别配置适合的资源并减少干扰 | KV迁移网络流量、队列协调与额外故障面 |

这些路线的选择属于系统设计；不要通过看到一个旗标就断言某头部模型使用了相同生产部署。

FlashAttention 通过改变注意力计算的 IO 安排避免显式落地大注意力矩阵，与 serving 的分页管理是不同层次。两者可以协作，但“使用 FlashAttention”既不自动产生连续批处理，也不自动解决 KV 分配。[官方实现与论文入口](/sources#flashattention)

## 推理快了，RL 为什么反而不稳定

**课程分析**：低精度权重、不同 sampling 实现、tokenizer/chat template 变化、停止规则与训练重算的 log-prob 差异，会影响实际行为策略。若 log-prob 来自另一版本或另一序列边界，importance ratio 会错误，即使吞吐显著变好也不代表更有效学习。

建议一次性能变更至少报告四组对照：

- 固定 prompt 与 seed 的分布诊断：log-prob 差异分位数、停止原因、输出长度。不要要求不同 kernel 必须逐 token 完全一致，先定义容差和统计比较。
- 资源诊断：KV 使用、排队时间、prefill/decode 时长、每卡负载，记录 p50/p95 而不只均值。
- 训练接口：mask、version、behavior log-prob 是否完整；拒收比例是否变化。
- 任务诊断：相同 budget 和 harness 下的成功率与 cost per success。

长 Agent 任务可以在工具执行时释放 GPU 的执行位置，但仍需管理上下文状态与前缀生命周期。没有活跃 kernel，不代表这条任务不占 KV 或 CPU 环境资源。

## 运行调度实验，识别它没有模拟什么

```bash
python3 -m labs.run --experiment rollout
python3 -m labs.run --experiment rollout --output rollout.json --trajectories trajectories.jsonl
```

本地实验把任务时长、worker 与 trainer 消费显式建模，并在 ingest 时检查版本差。[浏览器时间线](/labs/rollout) 用更小的固定任务集帮助观察屏障；二者模型假设与默认参数不同，数字不应直接对齐。它们都是离散事件仿真，不是 GPU benchmark。

先固定任务集比较同步与异步，再收紧 freshness 阈值，观察“完成吞吐”和“接收吞吐”分离。如果仅提高 worker 数，却导致更多陈旧轨迹被丢掉，就需要重新调节训练/推理资源比例和参数同步频率。

## 一份能落地的排障顺序

| 现象 | 可疑位置 | 下一项观测 |
| --- | --- | --- |
| GPU闲但队列长 | CPU调度、tokenization、环境阻塞 | host profile、队列年龄、tool p95 |
| 输出t/s高但训练等待 | 轨迹长尾、grader、数据打包 | episode完成率、各阶段队列深度 |
| KV不断preempt | 并发或context预算超出容量 | 活跃token数、recompute次数、free blocks |
| 权重同步后质量跳变 | 版本不一致、partial轨迹混版 | rank checksum、trajectory分段version |
| 单请求快、多请求抖 | admission与batching策略 | latency随并发曲线、token budget使用率 |
| agent benchmark突然变好 | harness、tools或budget改变 | 冻结模型做harness消融 |

工程任务：设计一个输入长、输出短的 Agent 工作负载和一个输入短、输出长的推理负载。不要预先选相同优化配置。画出 KV 生命周期与三个队列，写出能证伪“瓶颈是 GPU 算力”的实验。再去[多卡训练](/learn/distributed-training)理解这些推理 worker 如何与 trainer 争用网络和设备。
''')
