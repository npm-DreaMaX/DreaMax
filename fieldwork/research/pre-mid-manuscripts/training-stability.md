## 先判断异常发生在哪一层
一条突然升高的 loss 曲线不能直接告诉你“学习率太大”。异常可能来自数据分布切换、损坏文本、标签错位、极长序列、activation outlier、梯度 reduction 错误、优化器状态损坏，甚至日志聚合口径变化。**课程分析**：排查的核心是找到第一个发生偏离的量，而不是第一个被监控系统报警的量。

建立四层时间轴：输入批次及来源；前向的 logits/激活/loss；反向的梯度与更新；设备/网络/存储事件。所有日志用同一个 global step、有效 token 累计量和 checkpoint ID 对齐。只有保存 batch ID，才有机会在单卡缩小重放同一故障。

## 梯度范数到底告诉你什么
设总梯度为 $g$，global norm clipping 一种形式为
$$g'=g\min\left(1,\frac{\tau}{\|g\|_2+\epsilon}\right).$$
它限制一次更新的梯度尺度，但无法修复错误的标签、持续偏移的分布或 NaN。记录 clipped 之前的范数、裁剪比例与参数更新比率 $\|\Delta\theta\|/(\|\theta\|+\epsilon)$。如果长期每一步都重度裁剪，稳定的表面曲线可能掩盖配方问题。

分片训练还要确认“global”的范围：本 rank 只持有部分参数或梯度，局部 norm 不是完整模型 norm。对数据并行、专家并行和流水线并行，归约范围和重复计数都可能不同。把单卡函数直接包进分布式并不自动得到正确 clipping。[分布式系统](/learn/distributed-training)

若反向传播仍然缺乏直觉，先读 [梯度桥接](/learn/gradient-bridge)：前向保存中间值，反向传递局部敏感度，优化器消费累积梯度。这里最危险的错误是把“backward 成功执行”当作“优化目标一定正确”。

## BF16 与 FP8：低精度是一套分工
BF16 保留较宽的指数范围，但尾数较短；FP8 的可表示范围与精度更依赖具体格式和缩放粒度。两者都不意味着所有状态、累积和算子用同一种 dtype。矩阵乘法输入格式、累加精度、master weights、optimizer moments、通信格式应分别列在配置表。

DeepSeek-V3 的 FP8 方案使用细粒度缩放并为部分敏感模块保留更高精度；其报告把低精度计算与高精度累积联合设计，不能概括成“把模型 `.to(float8)`”。报告还记录了不同量化分组导致的不稳定性。[论文实验：V3 §3.3、附录 B](/sources#deepseek-v3-report)

**课程分析**：假设一个张量只有少量很大的 outlier，按全张量最大值缩放会压缩多数普通元素的有效分辨率。按更小分组缩放能缓解这个问题，却增加 scale 的存储、计算和通信，也要求 kernel 正确处理转置与反向的分组规则。FP8 值得测试的条件是硬件和 kernel 能把这些额外工作融合起来，而不仅是名义算力更高。

| 部位 | 需要观察 | 可能的排查动作 |
| --- | --- | --- |
| embedding / output logits | 最大绝对值、分位数、logsumexp | 比较高精度前向，检查异常 token |
| GEMM 输入和输出 | scale、饱和率、相对误差 | 固定输入，对照 BF16/FP32 路径 |
| gradient accumulation | finite 比例、微批数量、归一化 | 与单个等价大批梯度比较 |
| optimizer state | moments 范数、更新范数 | 同 checkpoint 保留／重置状态对照 |
| collective | rank 间有限值、耗时尾部 | 定位第一个产生异常的 rank |

## 真实代码里的防线和它们的限度
OLMo-core 的 `train_batch` 统计有效 label token、拆分微批并累积梯度；官方预训练脚本显式配置参数 BF16、reduction FP32、`max_grad_norm` 与 z-loss，同时没有启用 Float8。长上下文脚本则启用另一 Float8 配置。[源码：训练微批](/sources#olmo-core) [预训练配置](/sources#olmo3-pretrain) [长上下文配置](/sources#olmo3-longcontext)

这是透明实现的对照材料，**不是把 OLMo 作为头部能力主线，也不是说该配置复现了 DeepSeek 的 FP8 系统**。相同“FP8”标签可对应不同算子、缩放和硬件路径。z-loss 通常用于约束 logit 的归一化尺度，但系数是否合适仍要靠实验；不能看到配置有它就断言训练不会发散。

## Loss spike 的诊断决策树
```flow
出现 spike：先冻结 batch ID 与状态，不覆盖最后好 checkpoint
检查 finite：loss／logit／gradient／optimizer state
若非有限：定位最早异常算子与 rank，重放高精度路径
若有限：按来源、长度、mask、重复簇拆分 loss
检查 LR／batch／数据／长度是否在该步切换
比较异常批前后更新范数与恢复 checkpoint
最小单变量修复 → 短跑验证 → 回归评测
```
一次坏 batch 后自然恢复，和状态已经被 NaN 污染，需要不同处理。跳过 step 可能是容错策略，但必须计入日志，确认 optimizer、scheduler、token 计数是否同步推进；静默跳过大量难数据会改变训练分布。若同一批每次重放都失败，应保留样本调查，而不是反复换 seed 直到“不报错”。

## Checkpoint 是一个一致性协议
可恢复状态至少包括模型、optimizer、scheduler、global step、累计 token、随机数、dataloader/采样位置和数据 manifest 版本。分布式保存还要避免某些 rank 已写新版本、某些 rank 仍指向旧版本；通过完整性标志或原子发布让读取方只看到完整快照。异步 checkpoint 必须明确复制发生的时间点，后台写盘不能读取正被更新的参数而制造混合版本。

恢复验证应比较“连续运行 A+B 步”与“运行 A 步、保存、重新启动、再跑 B 步”的样本序列、LR、loss 与参数差异。浮点归约顺序改变时不一定逐 bit 一致，但数值偏差应在预设容差内。世界大小改变、数据变更和纯续跑应作为三种不同恢复场景。

## 最小实验与工程任务
```bash
python3 -m labs.run --experiment gradients --seed 7
python3 -m labs.run --experiment mixture --seed 7
```
自动微分实验用有限差分校验梯度，数据实验让你区分“目标改变”与“优化故障”。它们不模拟 FP8 kernel。进阶 GPU 任务是对同一组张量运行 BF16 与目标低精度 GEMM，记录相对误差分位数、outlier 与 backward 误差，再做 100–1000 step 小模型对照。

最终交付一份故障报告：最早异常、可重现 batch、状态和环境版本、被否定的两个假设、一个单变量修复以及能力回归结果。只有“把 LR 调低以后不报错”不构成完整诊断。
