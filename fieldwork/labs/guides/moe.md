# 路由均衡、容量与丢弃

## 先分清计量单位

默认路由 logits shape `[256,4]`，每个 token 选择 2 个专家，因此总计 512 个 assignment。每专家容量为 `ceil(capacity_factor*tokens*top_k/experts)`，默认 141。一个 assignment 被丢弃不等于整个 token 被丢弃；只要另一个专家仍接收，token 仍有一条计算路径。

```bash
python3 -m labs.run --experiment moe --output /tmp/moe.json
```

生成器给每个 token 一个圆周角度，以与专家方向的余弦作为基础 logits。第一组给专家 0 加偏置 3，第二组对完全相同的 tokens 移除这个偏置。`route` 先统计 top-k requested load，再按输入顺序裁剪容量；容量满后不重新路由。

## 默认观测

热专家请求 `[256,107,60,89]`，接收 `[141,107,60,89]`，丢 115 个 assignment，但完全丢弃 token 为 0。移除偏置后请求 `[139,137,117,119]`，无容量溢出。max/mean load 从 2.0 降到约 1.086。

`balance_auxiliary = E * Σ(f_e * mean_p_e)`，这里 f 使用归一化的“容量裁剪之前 top-k assignment 频率”，所有 f 之和为 1。不同项目的 top-k、group 或 token 归一化约定可能有额外系数，不能只按公式名字抄数值。均衡附近约为 1，不应期望为 0。熵、溢出和 max/mean 都要看；高熵不自动保证实际 top-k 均衡。

## 工程任务

将 `capacity_factor` 扫为 .5/1/1.5/2。检查守恒式 `sum(accepted)+dropped=tokens*top_k`，同时记录 `fully_dropped_tokens`。再令 top_k=1，比较“丢 assignment”和“丢 token”是否一致。对每组条件固定 seed，避免把输入变化误判为路由机制变化。

本实验移除偏置是控制干预，并没有训练 router，也没有实现某个项目的 auxiliary-loss-free 动态 expert bias。没有 expert MLP、all-to-all、Expert Parallel、节点拓扑或 kernel，因此不能从输出推断真实 GPU 吞吐；容量扩大会提高接收比例，但其显存/通信成本必须在生产框架中另测。无效矩阵 shape 或 top_k>experts 会被拒绝。

