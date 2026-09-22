# 评测预算、置信区间与污染候选

## 输入来自哪里

本实验为 40 个合成任务各生成 8 次 Bernoulli completion 成败，shape `[40,8]`，成功概率随任务编号变化。这些是用于验证统计实现的合成观察，不是 LLM benchmark 成绩。污染语料与评测题也全部为代码内的合成字符串。

```bash
python3 -m labs.run --experiment evaluation --output /tmp/evaluation.json
```

## pass@k 的实现

一个任务采样 n 次，其中 c 次通过，则 `pass@k = 1-C(n-c,k)/C(n,k)`。代码用乘积计算失败概率，避免巨大组合数。要求 `1<=k<=n`；n<k 不能靠填值计算。对任务分别计算后再取均值，避免样本多的任务获得更高权重。

该估计通常用于同一 prompt、同一采样策略下的独立生成样本。相关采样、自适应搜索或跨任务共享策略状态会改变含义。它估计 k 个候选至少一个正确的概率，不包含生产中从 k 个答案选出正确答案的能力，也不等同部署成功率。

默认 pass@1=.48125、pass@2=.6875、pass@4≈.86143、pass@8=.975。增长发生在采样预算增长时，不能当作模型权重变好。

## Bootstrap 与污染

Bootstrap 每次有放回地重采样整个 task score，共 1000 次；默认 pass@1 的 percentile 95% 区间约 `[.396875,.559375]`。重采样单位是任务而不是单个 completion。此区间条件于本次已生成的 completion，未覆盖训练随机种子、grader 错误、任务相关聚类或新任务分布的不确定性。

污染检测使用 NFKC、大小写归一化、空白合并做 exact match，再用 word 3-shingle Jaccard 提出近重复候选。默认阈值 .55，eval-a 命中 normalized exact；eval-b 的 Jaccard≈.5714，是近重复候选。输出提供 training/evaluation ID、Jaccard 与规范化评测文本 SHA256，以便追踪排除记录。

调高 `contamination_threshold` 到 .7，观察近重复是否漏检。调低到 .2，加入通用模板句，观察误报。大小写归一化可能错误合并区分大小写的代码标识符；词级 shingles 对中文无空格句子尤其粗糙。这个实验是可审计原型，未实现 MinHash、LSH、语义检索或溯源授权，不能声称“未命中就是无污染”。

## 工程任务

将每题 completions 减少，比较区间；按 repository 给 task 分组后实现 cluster bootstrap，解释为什么同仓库任务不能总被看作独立。给 grader 注入 2% false-positive，比较 pass@1 与 pass@8 的偏差。真实评测必须固定模型、harness、工具协议、grader、token/tool budget 与测试版本；不要把更大的预算或更聪明的 harness 当作模型能力增长。
