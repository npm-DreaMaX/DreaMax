# 数据配比改变了哪个目标？

## 实验设计

两个数据域都输入一个 x，A 的目标为 y=x，B 的目标为 y=-x。模型只有一个参数 `prediction=w*x`，且看不到 domain tag，所以两个任务存在不可消除的共享参数冲突。这是刻意可解释的容量限制，不表示真实 LLM 的不同数据域必然冲突。

每个 SGD batch 的 shape 为 `[64,1]`；先按 mixture 概率选择数据域，再从 Uniform[-1,1] 生成 x，平均真实的 MSE 导数并更新 w。留出 1024 个 x，用固定验证集分别计算两个域的 MSE。默认先用 A50% 训练 120 步，再从同一 checkpoint 分叉：一条改成 A95%，另一条改成 A65%/B35% 回放，各训练 120 步。

```bash
python3 -m labs.run --experiment mixture --seed 7 --output /tmp/mixture.json
python3 -m labs.run --experiment data-mixture --config labs/configs/mixture.json
```

## 可验证的结论

若 A 比例为 p，期望目标是 `p E[(wx-x)^2] + (1-p) E[(wx+x)^2]`，其最优解 `w*=2p-1`。输出 `population_optimum_weight` 可与 SGD 的有限样本结果比较；曲线来自真正随机采样，不是用解析解填入。

seed 7 下，基座 w≈.00694，A/B MSE≈.32233/.33140。A95% 分叉 w≈.90464，A 降到 .00297，B 上升到 1.18570；A65% 分叉 w≈.34048，A/B≈.14217/.58731。回放改善保留域，但付出了目标域收益；这里不存在让两个域同时归零的单参数解。两条分叉使用相同随机种子，尽量控制外生抽样差异。

## 调参与诊断

查看 `sample_counts`，不要用配置概率代替实际暴露比例。查看每 10 步的 `history`，不要只比较终点；loss 的变化既可能来自参数，也可能来自分布切换，不能把两条不同 mixture 的训练 loss 直接并列。

复制配置到 `/tmp/mixture.json`，扫 `focused_probability_a` 为 .55/.75/.95；每个比例至少跑 5 个 seed，画 A/B 验证 MSE 的 Pareto 曲线。再固定配比，扫 learning rate 和 phase_steps，区分未收敛与目标本身的取舍。无效概率、零 batch 或零步数会被拒绝。

## 映射到现代 pre/mid-training

`base` 对应切换前 checkpoint，分叉对应可控制的实验对照，两个独立验证 loss 对应能力保留账本。真实训练需要 token 而非样本的预算、数据去重、质量和难度分层、多任务评测、学习率退火、优化器状态和分布式数据加载。该实验没有语言数据、持续学习基准或 tokenization；它只演示改变 mixture 如何改变期望梯度，以及为什么必须同时观察目标域与保留域。

