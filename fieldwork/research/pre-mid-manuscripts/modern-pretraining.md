## 为什么目标函数没有变，训练范式却变了
next-token 交叉熵仍然是重要的基础目标，变化发生在“什么分布、什么表示、什么成本、什么时刻学习”。一个可用的现代训练方案同时控制数据质量和配比、稀疏或稠密架构、长度分布、学习率、数值格式、恢复语义和评测反馈。只写 `loss.backward(); optimizer.step()`，这些关键决策几乎一个也没表达。

**课程分析**：预训练的交付物应是“适合继续塑形与后训练的基础分布”，而不仅是一条低 loss 曲线。数学领域有正确续写概率，却完全无法生成可验证候选，和已经具备较高 pass@k 的基础模型，给后续 RL 留出的可学习空间不同。不要把所有不足留给 SFT 或 RL 修复。

## 以头部路线提问题，用透明框架读实现
DeepSeek-V3 展示了 MoE、MLA、MTP 与 FP8 的协同设计；Qwen3 的公开方案展示了通用知识、推理数据重平衡和长上下文的阶段组合。这两种路线让我们追问不同问题：一边关注每单位算力承载的容量，一边关注同一模型怎样按阶段吸收不同数据。[V3 技术报告](/sources#deepseek-v3-report) [Qwen3 技术报告](/sources#qwen3-report)

截至本次查阅，DeepSeek-V4.1-Flash 官方模型卡进一步报告原生图文联合预训练、45T token 语料和面向输入密集 Agent 工作负载的 CED 结构。**官方事实边界**：这些是模型卡陈述；不代表完整数据配方和训练流水线都已开源，也不能把前代 V3 的超参数直接套给 V4.1。[官方模型卡与固定版本](/sources#deepseek-v41)

**课程分析**：现代预训练还在与任务负载一起演进。若训练目标包含视觉工具操作，纯文本配方无法覆盖全部观察空间；若 Agent 的输入远多于输出，prefill 和持久上下文成本会反过来影响架构。当前 DeepSeek、Kimi、Qwen、GLM、MiMo 的资料边界在 [技术演进与公开性地图](/models) 并列核对。下文 OLMo-core 只作为可完整阅读的训练接口对照，不代表我们把课程主线转成某个模型品牌。

## 最新配方提醒：架构和优化器会改变预算最优点
Qwen3.8-Flash-Next 报告把QSA、残差门控、n-gram容量与优化器一起研究，并重新拟合batch/LR关系。[当前报告](/sources#qwen38-report) **课程分析**：旧架构的最优batch、warmup或参数/token比例不能原封不动地迁移。将论文超参数视为一个联合条件下的实验结果，比把它复制成全局默认值更可靠。其残差分支消融还揭示：预训练指标近似无损的修改，可能在后训练生成上失败；完整接口测试见 [最新机制阅读](/learn/frontier-reading)。

## 三个相互约束的预算
第一是独有数据与重复暴露预算；第二是训练 FLOPs 与墙钟时间；第三是后续部署与 rollout 的成本。Chinchilla 研究的是固定训练算力下参数规模和训练 token 的联合分配，不是对所有部署条件通用的 token/parameter 魔法比例。[论文实验](/sources#chinchilla)

常见粗估 $C\approx6NT$ 适用于以参数乘法为主的稠密训练估算。它没有完整计入长序列 attention、激活重计算、通信、padding 和数据等待。MoE 还必须区分总参数、激活参数与路由/通信开销。预算表至少给出 **预计 GPU 小时、有效 token/s、checkpoint 时间和失败重算余量**，不能只写 FLOPs。

```flow
能力与部署需求
数据池与清洗／去重策略
小规模配方消融、稳定性和评测校准
确定模型／token／长度／并行预算
带观测与恢复的大规模训练
阶段性评测与数据重平衡
可追溯基础 checkpoint → Mid-training → Post-training
```

## 拆解一份真实配置：数字要放回上下文
固定版本 OLMo 3 7B `pretrain-2.py` 不是抽象示例，而是官方训练配置。默认序列长度 8,192，全局批为 `8192 * 512` **tokens**，rank 微批也是 token 单位；参数 BF16、梯度 reduction FP32；此脚本关闭 Float8；同时配置了梯度范数限制和 z-loss。第二段训练恢复 trainer 与 optimizer state，并修改学习率时间表。[源码观察：预训练配置](/sources#olmo3-pretrain)

这里有三个值得迁移的工程规律。首先，batch 单位必须确认：4M tokens 不是 4M sequences。其次，恢复包含数据与调度的时间坐标，只加载模型权重不足以续跑。最后，源码中的预算字段是“计划怎样跑”，实际跑了多少还要核对 checkpoint 和日志，不能从一个 `max_duration` 推导发布模型的完整成本。

对照 [官方 midtrain 脚本](/sources#olmo3-midtrain)，同一模型构造器可以接不同 mixture、global batch、学习率计划和恢复规则。阶段差别不一定需要更换网络结构。Olmo 3 报告也明确把基础模型训练分为预训练、中训练和长上下文扩展；其他团队的术语不一定相同。[官方报告](/sources#olmo3)

## 从 batch 到参数：源码真正承载了什么
入口 `TransformerTrainModule.train_batch` 收到包含 `input_ids` 的字典，缺少 labels 时生成标签，按非 ignore 标签计算 loss token 数，然后拆成 microbatch。每个微批前向采用 sum reduction，并通过共同分母归一化，反向累积梯度，优化器更新位于独立的 `optim_step`。[源码观察](/sources#olmo-core)

源码还有一个值得保留的边界：使用 instance filter 时，该实现会把被屏蔽实例按零 loss 的 token 计入分母，注释明确提醒这会让报告 loss 人为偏低。因此下面是理想有效 token 目标的教学表达，具体日志口径必须继续对照 mask 分支，不能看到数值变好就判断能力提高。

这一层的目标可用下面的公式理解：
$$\mathcal L=\frac{\sum_{r,m,t} M_{rmt}\,\ell_{rmt}}{\sum_{r,m,t}M_{rmt}}.$$
$r$ 是数据并行 rank，$m$ 是微批，$t$ 是 token，$M$ 是有效标签 mask。各 rank 有效 token 数不等时，“每个 rank 平均 loss 再平均”可能不等价于全局 token 平均；还要检查框架梯度 reduction 的缩放约定。只看本地 loss 写法不能断言分布式目标正确。

**快速补充**：梯度是本批目标对共享参数的敏感度，反向传播只是高效计算它的方法，optimizer 再决定如何移动参数。若你脑中还没有这张图，可先用 [梯度与反向传播实验](/learn/gradient-bridge)，然后回来看“mask/分母不同会让梯度指向哪里”。

## Dense 与 MoE：把收益放在系统里比较
Dense 的路径规则、计算密度和分片较直接；MoE 增大总参数容量，同时只激活部分专家，但引入路由不均、all-to-all、容量和推理部署复杂度。不能只用激活参数说 MoE 一定便宜，也不能因通信代价认定它一定低效。正确比较应固定能力目标、硬件与实际吞吐，同时报告显存和 serving 成本。[MoE 深入](/learn/moe-training)

类似地，长上下文不能只是把最大长度调大：数据中是否有远距离依赖，文档是否正确打包，位置编码怎样扩展，长序列怎样并行，都影响最终能力。[长上下文](/learn/long-context) 应该作为训练配方的独立轴。

## 训练评测必须能改变决策
**课程建议**：建立三层信号。每若干 step 看 loss、梯度、吞吐、数据等待、学习率与数值异常；按固定 token 间隔看域级 held-out loss 和小型能力集；阶段边界再看较贵的推理/工具能力与回归测试。评测频率按 token 而不是只按 step，才能比较不同 batch 的实验。

当全局 loss 变坏时，先看 mixture 是否切换；当单域 loss 下降但生成能力没变，检查评测格式、长度预算和 tokenization；当下游收益小于方差，不能立刻投入更大规模。训练评测的用途是排除方案和识别代价，不是每次保存 checkpoint 都制造一个“最好模型”。

## 失败案例与可运行缩小实验
```bash
python3 -m labs.run --experiment mixture --seed 7
python3 -m labs.run --experiment moe --seed 7
```
两个课程实验分别暴露数据目标竞争和专家负载失衡，不声称复现 7B 训练。真正扩展到单卡 Transformer 时，保持实验语义：记录实际有效 token、每域 loss、参数更新次数和 checkpoint 恢复后的样本顺序；新增 GPU 并不改变这些检查的必要性。

| 症状 | 假设 | 判断办法 |
| --- | --- | --- |
| loss spike 与超长文档同时出现 | 长度／数值问题 | 按 source_id、长度、logit 范数定位 |
| GPU 利用高、有效 token/s 低 | 重计算、padding 或通信开销 | profiler 对齐 step 时间，分解关键路径 |
| 扩机器后训练变慢 | 并行组/网络拓扑不合适 | 固定总 batch 的 weak/strong scaling 分开测 |
| 重启后 loss 台阶变化 | optimizer／scheduler／数据位置不一致 | 同一 checkpoint 的连续与恢复对照 |
| 中期提升、末期退步 | 过量重复、域间竞争或评测噪声 | 固定 token 的分域曲线，保留早期 checkpoint |

工程任务：给一份未来拿到的新模型报告写出“已公开—源码确认—未知”三列表，随后画出 token 从原始 shard 到 loss 分母的路径。若你不能定位恢复状态和评测触发条件，就还没有读懂它的训练系统。下一站用 [算力预算](/learn/compute-budget) 和 [稳定性](/learn/training-stability) 把这一图景落到成本与故障处理。
