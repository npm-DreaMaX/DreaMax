# 真正学习一条三步工具协议

## 系统边界

本实验使用一个可学习的表格策略，shape `[2,3,4]`：2 种任务操作、3 个观察阶段、4 个动作，共 24 个 logits。动作是 `read / add / subtract / submit`。训练并没有用规则替策略选择动作；四个动作在每一步均由当前 softmax 策略采样，选错阶段会得到无效动作终态。

环境只执行有限白名单：`read` 获取操作数，`add/subtract` 写入 scratchpad，`submit` 提交。环境不返回 reward 或正确 target。策略循环结束后，独立函数 `verify(task, submission)` 重新计算预期值并打 0/1 分。Harness 只把观察映射为 `(operation,stage)` 的查表键，不选择工具，不替模型做算术。

```bash
python3 -m labs.run --experiment agent --seed 7 --output /tmp/agent.json --trajectories /tmp/agent-traces.jsonl
```

## 轨迹变成梯度

每次更新，12 个任务各产生 16 条轨迹，shape `[12,16,<=4]`；所有轨迹来自更新前的同一 policy version。每个 task 的奖励先计算组均值与标准差，再得 `A=(r-mean)/std`。全对或全错的组返回全 0，防止零方差产生 NaN。

每个决策的梯度是 `A * (one_hot(action)-probabilities)`，对应 `A ∇ log pi(action|observation)`。一条轨迹的终态 advantage 分配给所有动作；这是长程信用分配的一种粗粒度估计，并没有识别哪个动作最有贡献。整个 batch 收完才更新一次，保证此处是 on-policy。加了按全部表格状态平均的弱 entropy regularizer；它与按实际访问频率的状态熵正则不同。

这是 **group-normalized REINFORCE**，不是完整 GRPO/PPO 复现。没有 clipping、importance sampling、reference KL、token mask 或 value network；组内均值/标准差也会使估计与标准无偏 REINFORCE 存在差别。

## 默认结果与日志

100 次更新共产生 19,200 条训练轨迹。训练操作数在 `[1,20]`，400 个 held-out 评测任务使用 `[101,200]`。默认 seed 7 的采样成功率由 2.0% 到 97.5%；invalid action rate 从 95.25% 到 2.25%。这说明策略学会了已定义任务协议，并向不同数值迁移；没有证明它能处理新运算、新工具或自然语言任务。

`history` 记录训练成功率、状态熵和全同奖励组数量。初期没有成功，组优势为 0，就没有有用学习信号；后期全成功组多也不一定坏。必须结合成功率解释。`policy` 展示每个状态的动作概率。`trajectories` 保留前 8 条最终评测轨迹，每步含 observation、action、behavior log-probability 和 policy version。

## 调试任务

将 max_steps=2，三步协议不可能完成；检查成功率保持 0、组优势全为 0。将 group_size=2 与 16 对比，在相同总 rollout 预算下比较信号覆盖。将 entropy_coefficient 增大到 1，检查探索保留与最终精度的取舍。新增一个“multiply”任务时，必须同时修改环境协议、policy 状态、grader 和评测；不能只更改 reward。

未知动作只返回 invalid_action，不被当作 Python、shell 或 SQL 执行。逻辑 verifier 与环境虽然分离，仍处于同一进程，不是 OS sandbox。生产软件工程 Agent 必须另外隔离文件系统、网络、凭证与隐藏测试；工具输出中的提示注入也需要独立防护，本小环境没有模拟这些攻击。

