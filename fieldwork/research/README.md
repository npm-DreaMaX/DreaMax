# 研究与证据维护

本项目按训练问题组织章节；模型只作为公开方案的案例，框架作为实现机制的可定位对照。头部模型的最新发布与证据见 `frontier/`，本目录的固定框架代码用于源码阅读，不代表其能力优于头部模型，也不表示头部模型使用相同训练器。

## 记录结构

- `src/data/sources.json`：课程与框架来源，记录标题、组织、日期、类型、URL、完整 commit、文件、符号、调用链、输入输出、许可证、支持结论和引用章节。
- `src/data/sources-frontier.json`：最新模型资料，由模型研究流程维护。
- `source-cache/`：从官方固定 commit 下载的源码、许可证与论文元数据页。`*-tree.json` 记录发现文件时的官方仓库 tree 与完整 SHA。
- `source-audit.json`：覆盖全部64项来源的审计脚本网络访问状态、源码 SHA-256、AST 符号与摘录行验证结果。它说明“访问并核验了什么”，不声称复现了大型训练或穷尽全部论文结论。
- `source-requests-*.json`：内容作者提出的新增来源请求，需合并并核验后才能当作登记来源。
- `verified-agentic/`：Agent 内容作者的独立源码阅读快照。

## 可重复审计

```bash
python3 scripts/verify_sources.py
python3 scripts/verify_sources.py --network
# 从冻结的注册表重建源码缓存（保持 SHA；不查询浮动 main）
python3 scripts/fetch_source_snapshots.py
```

默认审计本地快照、完整 SHA、真实 Python 符号和摘录，并检查所有章节引用 ID。`--network` 重新获取固定源码计算 SHA-256，检查论文/文档 URL 可访问性。网络失败会记录错误并以非零退出，不会标成通过。默认审计 `sources*.json` 的全部注册表（课程、systems、frontier）。固定源码/PDF/模型卡快照均比较远端SHA-256，Python源码额外核验AST符号与摘录。`--catalog main` 可限定为课程主表。frontier同时保留最初下载日志，模型页面schema可用 `python3 scripts/verify_model_catalog.py` 重验。

不把“URL 可访问”当作“内容正确”。正文仍须把具体结论紧邻引用，并标明证据层级：官方事实、论文实验、源码观察、课程分析、尚待确认。模型卡给出的性能只代表所报告评测协议，不能推断通用优势。

## 已发现的边界

- TRL 固定版本的 DPO 入口是 `DPOTrainer._compute_loss`，旧教程的 `dpo_loss` 不适用于此快照。
- OLMo 3 长上下文脚本含疑似沿用的预算/停止注释。本课程只引用核实过的长度、RoPE、packing 和并行配置，不用其中 `max_duration` 推断实际发布模型的训练量。
- Dolma 的这里定位的是 Bloom filter 去重，不把它说成 MinHash 实现；工具许可证不能推出所有输入语料的许可证。
- Qwen3 官方把 Reasoning Stage 放在 pretraining 内。课程的 Mid-training 是跨项目的能力塑形抽象，不替官方改名。
- 教学 CPU 实验展示机制，不能预测真实大模型能力增益、FP8 数值表现、GPU MFU 或真实 all-to-all 吞吐。

## 来源版权

下载的源码保留原始文件头和各仓库 `LICENSE`；网页只展示短摘录与来源。Apache-2.0 的框架包括 OLMo-core、Dolma、verl、TRL、vLLM；SWE-bench、SWE-agent、Agent Lightning、HumanEval 主许可证为 MIT；Megatron-LM 默认文件使用其顶层 BSD-3-Clause 条款，部分文件另有声明，以固定文件头为准。论文许可证单独记录，不能与相关代码或模型权重混同。本站原创解释与教学实验不是这些项目的官方实现。

## 编辑与重建

前中训练章节的原稿在 `pre-mid-manuscripts/*.md`，用 `python3 research/generate_pre_mid_content.py` 重建JSON；最新机制章节用 `python3 research/generate_frontier_reading.py` 重建。最新模型数据和来源的人工研究注释在 `scripts/research_frontier_catalog.py`，原始官方卡、config、源码及四份PDF在 `frontier/`，可用 `scripts/research_frontier_reports.py` 下载指定公开材料（不会下载权重）。
