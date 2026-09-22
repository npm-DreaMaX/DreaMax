# 为什么快的 rollout 也可能是无效数据

## 明确这是离散事件模拟

本实验不启动 GPU、不调用模型、不真实睡眠。`durations` 是固定 seed 生成的 96 个 lognormal 任务耗时，并给每 13 个任务加入长尾。两种调度读取完全相同的耗时列表。输出“秒”只是模拟时钟，不能当成 vLLM、verl 或任何真实集群的吞吐测量。

```bash
python3 -m labs.run --experiment rollout --seed 7 --output /tmp/rollout.json --trajectories /tmp/rollout-traces.jsonl
```

## 两个调度器

同步调度每批收集 8 条轨迹，4 个 environment workers 动态分配该批任务，等待全批结束，再用固定 2 秒训练；训练时停止新 rollout。异步调度持续给空闲 worker 发任务，trainer 取得足够数据就训练，和其他环境任务重叠。训练完成时版本加一，模拟器假设权重发布无成本。

每条轨迹保存开始时的 `policy_version`。关键检查发生在 **trainer ingestion**：`lag=current_version-behavior_version`，不是只在任务完成时检查；完成后在队列里继续等待也会变旧。lag 超出 `max_policy_lag` 就拒收。最后一个不足 batch 的尾批仍会训练，避免数据静默消失。

## 默认结果

seed 7，同步模拟 170.369 秒接收 96 条轨迹。异步模拟 93.860 秒接收 88 条，拒收 8 条；有效样本吞吐从 .5635 到 .9376 条/模拟秒，比例约 1.664。异步接收轨迹最大 lag 为 1，符合配置；所有轨迹的 ingestion lag 分布为 `{0:38,1:50,2:5,3:2,4:1}`。

别把 96/93.860 当作异步有效吞吐：其中有 8 条不能训练。别只比较 makespan：两种方式训练的数据和 optimizer update 数不同，模拟器也没有定义过期导致的学习质量损失。

## 工程任务与限制

将 `max_policy_lag` 设为 0/1/3；比较完成量、拒收量、接收量和接收吞吐。将 `training_seconds` 设为 10，让 trainer 变为瓶颈，检查队列等待导致的版本老化。记录每条轨迹 `train_start-end`，把 rollout 时长与排队时长分开分析。

测试要求每条任务恰好被接收或拒收一次，接收 lag 不越界，尾批不丢失。真实系统还需考虑 GPU 内存、权重同步延迟、KV cache、CPU sandbox 初始化、工具限流、token 长度的批处理效果与错误重试。本模拟只有一个 trainer；不能推断真实设备利用率，`trainer_busy_fraction` 只是虚拟 trainer 在模拟时钟上的占用比例。

