# 论文精读版本：选择与核验方法

查阅日期：2026-09-22。此版本响应“按顶尖模型报告与范式论文精读，保留 pre/mid/post 阅读主线”的内容调整。

## 选择依据

- 最新报告：DeepSeek-V4.1-Flash、MiMo-V2.6、Kimi K3、Qwen3.8-Flash-Next。来源包括官方 Hugging Face 和官方仓库的 PDF；不按 GitHub 有没有 README 判断报告是否公开。
- 关键承接：DeepSeek-V3、Qwen3、Kimi K2、GLM-5。GLM-5 的中训练与异步 RL 披露适合精读；不将 GLM-5 的细节标为 GLM-5.3 的公开事实。
- 范式原点：Chinchilla、InstructGPT、DPO、DeepSeekMath / GRPO、DeepSeek-R1、Let’s Verify Step by Step、FlashAttention。
- 这 15 篇不是完整领域书目，也不代表“最新模型一定最值得先学”。路径按问题、依赖和证据选择次序。

## 证据与原文

`research/papers/manifest.json` 冻结 PDF URL、SHA-256、页数、查阅时间。每篇子目录保存 `pages.json`（逐页机器提取文本）与 `paper.txt`。提取文字用于查找原文，不直接作为高质量中文解释；数学符号和图内文字以原 PDF 为准。

`src/papers/*.json` 是独立维护的中文精读稿，不是整篇逐句翻译。每节有原文 section / PDF 页码，区分报告陈述、团队实验、自述观点与本站建议。篇幅重点放在数据、目的、阶段接口、实验依据及失败路线。未知的 token 配比、模型训练配置不补造。

`src/data/paper-figures.json` 为每一幅原图记录 figure 编号、PDF 页、裁剪区域、原 PDF 和导出资产的哈希。`scripts/extract_paper_figures.py` 从原 PDF 渲染局部区域，不重绘或改动原图中的数值。网站的读图旁注独立于原图。放大视图支持滚动看完整分辨率。

`src/data/training-timelines.json` 仅手工转录已核验的 Qwen3、GLM-5 和 MiMo-V2.6-Flash 阶段信息；阶段宽度不是 token 或耗时比例。MiMo 中训练 token 数在引用段落未给出，明确保留未知。

## 视觉参考

- https://mimo.xiaomi.com/zh/mimo-v2-6 ：实际浏览截图存于 `artifacts/mimo-reference.png`。参考其克制导航、居中标题、原始研究图和大段阅读节奏。
- Kimi 官方研究发布页面：浏览截图 `artifacts/kimi-reference.png`。参考图像主导的叙事与横向顶部导航。
- OpenAI research 页面也做了访问；浏览器截图仅得到加载态，因此不将其作为已完整观察的页面样式证据。

未复制这些站点的品牌、页面源码或装饰性图片。首页曲线场由 `FieldVisual.tsx` 原创 canvas 绘制，带阶段交互、屏外暂停与 reduced-motion 适配。论文原图仅用于对应论文的讲解并保留归属。
