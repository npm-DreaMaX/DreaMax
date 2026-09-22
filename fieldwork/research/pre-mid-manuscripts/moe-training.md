## 为什么“更少激活参数”不是完整答案
MoE 希望在每个 token 不访问全部参数的情况下增加模型容量。给定 token 表示 $h_t$，router 选择少数专家，专家计算后按权重组合。相同 token 的算术量可能下降，但模型仍要存储全部专家，并把 token 发到正确设备。**课程分析**：MoE 同时改变优化问题、通信模式和部署方式，不能只按一个参数量做预算。

这里用 Megatron Core 的路由实现解释机制，不声称所有开放权重 MoE 都采用同一配方。固定源码提供 `TopKRouter.routing`，包含 score function、top-k、group、容量丢弃、辅助损失等可选分支；真实行为由配置决定。[源码观察](/sources#megatron-moe)

## 代表性路线：auxiliary-loss-free 的精确含义
DeepSeek-V3 通过动态专家偏置做主要负载控制，同时仍保留小权重的 sequence-wise 辅助项，并用节点限制路由约束通信。把它简化为“没有任何辅助 loss”会误读报告。[V3 §2.1.2](/sources#deepseek-v3-report) 本章用 Megatron 的可读源码解释同类控制接口，但不声称它就是 DeepSeek 未公开的完整训练器。

## 一次前向中，token 到底去了哪里
```flow
hidden states [S,B,H]
router logits [S,B,E] → score 与 top-k
routing_map / weights [S×B,E]
permute + token dispatch（可能跨 rank all-to-all）
每个专家对收到的 token 做 FFN
inverse dispatch + unpermute
按路由权重组合回 [S,B,H]
```
$E$ 为专家数，$k$ 为每 token 激活专家数。用 top-k 后归一化权重的一种简化写法是
$$y_t=\sum_{e\in\mathrm{TopK}(s_t)}\frac{\exp(s_{te})}{\sum_{j\in\mathrm{TopK}(s_t)}\exp(s_{tj})}f_e(h_t).$$
这是**教学公式**。实际实现可能先 softmax 再选取、采用 sigmoid、额外 scaling 或共享专家，不能用这一个式子替代全部生产路由语义。读源码时必须核对 `use_pre_softmax` 和 `score_function`。

## 真实源码：路由表不是专家输出
`TopKRouter.routing` 先将 logits 展平为 `[num_tokens,num_experts]`，处理可选 padding mask 与 z-loss，再调用 `topk_routing_with_score_function`；如果设置 capacity factor，还会调用 `apply_router_token_dropping`。函数返回概率与 routing map，后面的 dispatcher 才负责搬运 hidden states。[源码：调用链、SHA 与片段](/sources#megatron-moe)

这个分界非常重要。只看 router 代码只能确认“计划把 token 送去哪”，不能证明通信已经 overlap、专家已经计算，也不能推断端到端吞吐。源码阅读下一步应在同一 commit 搜索 routing map 的消费者，分别检查 dispatch、专家 GEMM、combine。生产环境还要记录并行组：tensor、expert、data、context 可能是不同拓扑维度。

## 负载均衡为何直接影响训练
设 $n_e$ 是一个 step 分配给专家 $e$ 的 token 数，平均为 $Tk/E$。如果大部分 token 都选同一个专家，那个专家的计算与通信成为尾部，其他设备等待。负载不均还意味着一些专家收到很少学习信号，进一步造成路由偏好固化。

一种常见辅助损失形式为 $E\sum_e f_ep_e$，其中 $f_e$ 是实际选中频率，$p_e$ 是平均路由概率；它鼓励更均衡的路由。其他路线使用动态 expert bias 或不同分配约束。**课程分析**：辅助损失改变训练目标，动态偏置改变选择行为，两者都不能单凭“aux-free”或“balanced”标签评价，必须看语言模型质量、负载曲线和通信代价。

建议同时记录 max/mean expert load、专家利用率、router entropy、top-k margin、每专家梯度范数、token drop rate 和 all-to-all p95 延迟。只有 entropy 高并不说明均匀：不同 token 可能都拥有相同、略微偏向某专家的分布，top-k 仍然拥挤。

## Capacity、dropless 与组路由的权衡
| 路线 | 好处 | 代价／失败条件 |
| --- | --- | --- |
| 每专家固定 capacity | 形状与内存较容易控制 | 超过容量的 token 需要丢弃或其他处理，带来偏差 |
| dropless | 保留被路由的 token | 变长分配更复杂，尾部专家影响时间与显存 |
| grouped / locality-aware 路由 | 控制 token 可去的专家集合 | 限制搜索空间，需评估质量与拓扑收益 |
| 更多专家并行 | 单设备专家存储减少 | 跨设备流量和并发协调可能增加 |

若 capacity 近似取 $cTk/E$，当 $k$ 增大时，通信与专家计算通常也增加，不能只解释成“模型多想了一点”。跨节点网络带宽不足时，增加专家数可能使计算节省被数据搬运抵消。

## 可运行实验：亲眼看到负载塌缩
```bash
python3 -m labs.run --experiment moe --seed 7
```
课程 CPU 实验生成 top-k 路由和专家容量统计，比较均衡与偏置路由，展示 overflow 与负载集中。它**不训练 Transformer，也没有真实 all-to-all**。你能验证的是容量、计数和路由不均的机制，不能从它宣称某个生产模型的 MFU。

默认 seed=7 的 256-token、4-expert、top-2 实验中，带热点偏置的负载为 `[256,107,60,89]`，capacity=141 时丢弃 115 项专家分配；移除该偏置后负载为 `[139,137,117,119]`，无溢出。这是预设控制干预，不是训练学出来的均衡策略。

改变专家数、top-k、capacity factor 后，先预测 max load 与 dropped assignments 如何变化，再运行。注意 assignment drop 和 unique token drop 不是同一个指标：一个 top-2 token 只丢一个专家分支，仍可能经过另一专家。解释输出时保持统计口径一致。

## 常见故障的排查顺序
训练 loss spike 与 router load spike 同时出现：先对齐时间轴，判断路由不均发生在 loss 异常之前还是之后，再抽查 token 的 source/长度。若只少数 rank OOM，先看最忙专家和接收 buffer，而不是整体缩小模型。如果 loss 正常但吞吐降低，检查 all-to-all 尾延迟、跨节点专家比例、GEMM 形状和 dispatcher 的 padding。

增加均衡项后，load 平滑但能力下降，可能是均衡与任务学习产生冲突；应固定算力、数据和激活专家数，比较不同系数，而不是把均衡本身当最终目标。恢复后专家分布突变，检查 router/optimizer state 是否完整载入，尤其不要只恢复专家权重而遗漏路由状态。

工程任务：画出一个 8-rank 的专家分配图，给定不同 token 热点，计算每条链路的 token 传输量；提出一种减少跨节点通信的放置方案，并说明它可能如何损害专家多样性。最后报告 time-to-quality，和 [分布式系统](/learn/distributed-training) 中的通信关键路径一起判断 MoE 是否值得采用。
