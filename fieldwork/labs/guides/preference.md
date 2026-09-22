# DPO 的数值与梯度检查

## 一个可以完整算清的 policy

每个 prompt 只有两个候选回答，`pi(y|x) ∝ exp(theta*feature(y))`。因此两个回答的 log-probability 差恰好是 `theta*(feature(chosen)-feature(rejected))`，softmax 的归一化项会相消。配置中 `feature_deltas` shape `[5]`，相当于五组 `[chosen,rejected]` 数据；theta 与 reference_theta 都是标量。

这使简化 policy 的 DPO objective 仍是精确目标，不需要伪造语言模型序列 log-probability。令 `delta=feature_chosen-feature_rejected`，`margin=beta*(theta-reference_theta)*delta`，则 `loss=softplus(-margin)`，`dL/dtheta=-beta*delta*sigmoid(-margin)`。负 delta 引入与其他数据相冲突的偏好，避免假装所有偏好一定能同时满足。

```bash
python3 -m labs.run --experiment preference --seed 7 --output /tmp/preference.json
```

## 查看什么

`dpo_loss_gradient → objective → theta update` 是完整调用链。默认 loss 从 .724995 降到 .656529；初始解析梯度约 -.04699256，与中心差分相差约 `7.01e-13`。当当前策略等于 reference 时，所有 margin 为 0，loss 应为 log(2)，但梯度通常不为零。

`softplus(x)=max(x,0)+log1p(exp(-abs(x)))` 避免直接 `exp(1000)` 溢出。JSON 中 ±1000 的稳定性检查是数值验证，不是模型采样。`pairs` 展示每个候选对的 margin 和 chosen probability，避免只盯平均 loss。

## 失败注入与生产差异

将 beta 改为 .02 或 2，比较梯度尺度和训练曲线；不要把 beta 简化理解成独立于 reference 与优化的“对齐强度旋钮”。将所有 delta 取反，预期 theta 的更新方向翻转。将 reference_theta 改成较大正值，观察初始 loss 与偏好 margin。配置 beta≤0 会被拒绝。

本实验没有 tokenizer、completion mask、长度归一化、packing、padding、reference policy forward 或分布式模型。真实源码导读时应首先核对 chosen/rejected 的排列和 prompt token 是否被排除；数值正确的小目标不能证明真实数据管道正确。偏好 loss 下降也不能证明语言能力、推理能力或安全行为提升，需要独立评测。

