# Agentic 源码核验记录

查阅日期：2026-09-22。这里的原始文件用于离线核对路径、符号和接口，网站文章只摘述必要实现，并在来源页给出少量摘录。

每个同名 JSON 保存 repository、完整 commit SHA、原始路径及永久链接。文章中的事实以这些固定版本为准，不保证以后主分支仍使用相同 API。

| 本地文件 | 官方来源 | 许可证 |
| --- | --- | --- |
| `verl.py`、`verl-agent-loop.py`、`verl-async.md` | verl-project/verl | Apache-2.0 |
| `trl-dpo.py` | huggingface/trl | Apache-2.0 |
| `swe-agent.py` | SWE-agent/SWE-agent | MIT |
| `swebench.py` | SWE-bench/SWE-bench | MIT |
| `humaneval.py` | openai/human-eval | MIT |

原始代码的版权归各上游作者所有；文件中保留上游版权头。许可证完整内容可从各上游固定 commit 的 `LICENSE` 获取。这里的源码核验不等于已运行该上游分布式系统；本站实际运行的是独立编写的 CPU 教学实验。

`../generate_agentic_content.py` 是八篇人工编写文章的可重建源；运行它会重新生成对应 `src/content/*.json`。修改文章时请同步修改该源文件，避免下次生成覆盖修改。
