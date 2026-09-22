# Fieldwork · 前沿论文精读

以原始技术报告为中心的中文学习网站。15 篇精读、63 个带页码的阅读段落、22 幅可放大的论文原图，沿预训练、中训练、后训练、Agentic RL、算子与集群五条路线组织。

最新报告包含 DeepSeek-V4.1、Kimi K3、Qwen3.8-Flash-Next、MiMo-V2.6；通过 DeepSeek-V3、Qwen3、Kimi K2、GLM-5 连接技术演进，并选读 Chinchilla、DPO、GRPO、R1、InstructGPT、过程监督与 FlashAttention 等范式论文。原有 21 篇工程补充和 8 个真实计算实验保留为按需深入入口。

## 在 DreaMax 中运行

本目录已集成进 DreaMax，不再单独启动 Vite。从 **DreaMax 仓库根目录**运行：

```bash
npm ci
npm run dev
npm run build
npm run preview
```

打开 `http://localhost:4321/llm-training/` 进入栏目，或 `/fieldwork/` 进入阅读室。下表中的阅读路由统一加 `/fieldwork` 前缀。Node.js 需要 22.12+，Python 实验需要 3.10+。学习区无需服务端、模型密钥或 GPU；进度和笔记保存在同源浏览器存储。

## 网站里的主要入口

| 路由                  | 用途                                               |
| --------------------- | -------------------------------------------------- |
| `/`                   | 官网式首页、动态曲线场、阶段探索与前沿报告         |
| `/papers`             | 全文搜索、阶段和阅读类型组合筛选                   |
| `/papers/:id`         | 论文精读、原图放大、公式、原文页码、重点模式与笔记 |
| `/paths/pretraining`  | 预训练论文顺序、阶段配方交互对照                   |
| `/paths/midtraining`  | 中训练与能力塑形，对齐报告的正式术语               |
| `/paths/posttraining` | 从偏好到推理 RL、在线蒸馏                          |
| `/paths/agentic`      | 任务合成、异步 rollout、环境与 grader              |
| `/paths/systems`      | 从单卡 IO 与 kernel 到多卡训练与 rollout 系统      |
| `/labs/:experiment`   | 八个机制实验，含对应源码、配置和运行指南           |
| `/sources`            | 官方来源、冻结版本、调用链与引用反向链接           |
| `/notebook`           | 论文进度、笔记和 Markdown 导出                     |
| `/learn/:slug`        | 按需打开原有工程与数学补充                         |
| `/models`             | 辅助模型代际与披露程度对照                         |

`/roadmap` 兼容旧链接并跳转预训练路线。`Ctrl+K` / `⌘K` 搜索论文全文，`Esc` 关闭搜索与原图弹窗。手机使用顶部展开导航。支持深浅色、键盘和减少动态效果偏好。canvas 在屏外暂停，无运行时外部图片或字体 CDN 依赖。

## 可运行实验

先进入本目录：`cd fieldwork`（从 DreaMax 仓库根目录开始）。

八个核心实验使用 **Python 标准库**，不需要安装 PyTorch，不下载模型权重。它们计算实际结果而非返回预置数字。

```bash
python3 -m labs.run --experiment gradients
python3 -m labs.run --experiment mixture
python3 -m labs.run --experiment moe
python3 -m labs.run --experiment preference
python3 -m labs.run --experiment agent
python3 -m labs.run --experiment rollout
python3 -m labs.run --experiment evaluation
python3 -m labs.run --experiment systems
```

```bash
# 固定 seed、自定义配置、导出原始轨迹
python3 -m labs.run --experiment agent --seed 7 \
  --config labs/configs/agent.json \
  --output artifacts/agent.json --trajectories artifacts/agent-trajectories.jsonl

# 重新生成默认实验的可复现结果
python3 -m labs.report --seed 7 --output labs/expected/seed7.json
```

详细说明、shape、预期输出、常见错误、生产实现差异见 [labs/README.md](labs/README.md) 及 `labs/guides/`。

Agent 实验是一个真正更新有限动作策略参数的缩小环境；它不是训练完整 LLM。Rollout 是离散事件模拟，systems 是成本与拓扑模型；两者的数值不能当成某型号 GPU 或真实集群性能。浏览器与 Python 有些实验使用不同的简化粒度，页面会明确说明，不要求数字一致。

### 可选：实际测量 PyTorch 算子

已有 PyTorch 时可直接运行；未安装时请按 [PyTorch 官方安装页](https://pytorch.org/get-started/locally/) 选择与设备相容的版本。网页与核心实验不依赖它。

```bash
python3 -m labs.torch_profile --device cpu --operation mlp \
  --tokens 128 --hidden 256 --steps 3 --output artifacts/profile-cpu.json

# CUDA 可用时执行真实的前向、反向与 profiler
python3 -m labs.torch_profile --device cuda --operation mlp \
  --tokens 128 --hidden 256 --steps 3 \
  --output artifacts/profile-cuda.json --trace artifacts/profile-cuda.trace.json
```

也可选择 `--operation matmul` / `softmax`。脚本会记录真实设备、版本、dtype 和梯度检查；未发现 torch/CUDA 时给出明确错误，不会伪造 GPU 结果。Trace 可在 Perfetto 或 Chrome tracing 工具查看。这里是小算子观测，不是 MFU 基准或集群压测。

## 验证

集成后的验证命令从 DreaMax 仓库根目录执行；Python 研究脚本从本目录执行。

```bash
# TypeScript 与生产构建
npm run build

# 数学机制单元测试 + Python 实验正确性测试
npm run test:unit
npm run test:labs

# 章节结构、内部链接、来源 ID、代码围栏
npm run check:content

# 桌面与手机 Chromium 交互测试
npx playwright install chromium
npm run test:web

# 官方来源版本/符号/摘录核验
python3 scripts/verify_sources.py
python3 scripts/verify_sources.py --network
```

浏览器测试覆盖全文搜索、移动导航、数学渲染、笔记/进度持久化、下载、主题、真实实验交互和所有章节的横向溢出检查。Playwright 配置会为本地服务设置 `NO_PROXY`，避免当前机器的代理把 localhost 请求发到远端。测试报告在 `playwright-report/`，失败 trace 在 `test-results/`。

已完成一次真实 CPU/CUDA 小型 MLP 测量，设备为 NVIDIA GeForce RTX 4060 Laptop GPU、PyTorch 2.11.0+cu128；原始输出和 trace 在 `labs/measurements/`，摘要在 `labs/expected/profile-validation.json`。它验证了算子及前反向可执行，不代表完整模型或多机训练验证。

原始验证结果与范围见 [research/README.md](research/README.md)、`research/source-audit.json` 及补充审计文件。审计报告的数量和 scope 是实际通过范围；网络不可达不记为核验成功。最新 HF 报告/源码另保留在 `research/frontier/` 和对应登记中。

## 代码与内容结构

```text
src/
  papers/                    每篇一个精读 JSON；每节包含 Markdown 与原文页码
  data/readings.ts            五条路径、论文 schema 和全文索引
  data/paper-figures.json     原图来源、页码、裁剪和双重 SHA-256
  data/training-timelines.json  已核验阶段配方原始转录
  data/sources*.json          全站来源登记
  components/EditorialShell.tsx  顶部导航与搜索
  components/FieldVisual.tsx  原创动态曲线场
  components/TrainingTimeline.tsx  报告阶段交互
  pages/PaperReader.tsx       精读、原图、重点阅读与笔记
  pages/EditorialHome.tsx     新首页
  content/                   保留的工程与数学补充
  editorial.css              新版视觉、响应式与打印
  styles.css                 实验与补充阅读的基础样式
  state.tsx                  持久化进度、笔记和主题
public/figures/               22 幅自托管论文原图，无运行时网络依赖
research/papers/              PDF 冻结清单、逐页提取文本与原文快照
labs/                        可运行实验、配置、指南与实测
scripts/                     内容、来源及原图生成工具
tests/                       数学、Python 与桌面/手机浏览器验证
```

技术栈：React 19、TypeScript、Astro、React Router、react-markdown、KaTeX、highlight.js、Lucide；Vitest、unittest、Playwright。网页由 Astro 预渲染，并在浏览器中增强交互，无模型服务或 GPU 要求。

## 新增论文精读

1. 在 `src/data/sources*.json` 登记原始报告：组织、标题、URL、日期、版本、许可和支持的结论。
2. 冻结 PDF 元数据到 `research/papers/manifest.json`。引用 PDF 页序号从 1 开始，不能混用期刊页码。
3. 在 `src/papers/` 新增 JSON，可参考 `qwen3.json`。字段类型见 `src/data/readings.ts` 的 `Paper` / `ReadingSection`。每节必须包含 `id / title / stage / locator / essential / body`。
4. 在 `scripts/extract_paper_figures.py` 添加必要原图的页和 PDF point 裁剪框。为该节写出至少两条读图说明；不要把示意图解释成实测曲线。
5. 更新 `src/data/readings.ts` 的路线 `items`，选择先后顺序、重点锚点、阅读理由。全文搜索和论文库自动纳入新 JSON；首页精选需要明确编辑。
6. 运行 `npm run check:content`、`npm run test:unit`、`npm run test:labs`、`npm run build`；改了交互再运行 `npm run test:web`。

图文提取是可选维护步骤，正常安装网站无需 Python 研究依赖：

```bash
python3 -m pip install -r requirements-research.txt
python3 scripts/extract_paper_figures.py
```

脚本保留原始 PDF、逐页文本、图框与 hash。已有快照会被复用；刷新上游版本需要显式更新 URL / revision 并重新审查页码和裁剪。不要直接把 PDF 机器提取的公式文本当成正确公式。

`src/papers/` 是精读内容的维护源，不要运行旧 `research/generate_*_content.py` 来修改它们。原有补充仍在 `src/content/`，其 schema 见 `src/types.ts`。论文正文支持 GFM、公式、代码块；每节和每图自动渲染来源入口。

## 研究与更新原则

- 首先检查官方发布页、官方 HF 组织和仓库文件树、技术报告，再按问题精读关键 GitHub 或 HF 函数。无需遍历整个仓库。
- 记录发布日期与查阅日期，避免把 HF 文件更新时间当模型发布日期。固定 commit/revision；保留 SHA-256 和取证路径。
- 模型卡、架构推理代码、训练代码、后训练代码、完整数据配方分别记录。开权重不等于完整训练配方开源。
- 报告自述与论文实验、源码观察、课程分析、未证实推断明确区分。没有代码证据时不写“源码证明”。
- “Mid-Training”是课程组织概念，不强行改称团队自己的阶段名称。
- `scripts/research_frontier.py` 只获取模型元数据、卡片和小型实现文件，不下载权重；进一步报告核验由 `research/` 内的明确脚本和审计记录管理。
- 上游源码与报告仅用于来源研究。外部摘录、许可和原作者归属见登记及 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 部署与常见问题

由 DreaMax 的 Astro 构建统一生成静态 HTML，每个论文、路线、章节与实验都有对应页面。部署仓库根目录的 `dist/`，无需将学习链接回退到个人主页。Cloudflare 配置见仓库根目录 README。

- `python: command not found`：这里的命令使用 `python3`。
- `npm ci` 失败：检查 Node 版本与 npm 网络；不要删除 lockfile 来掩盖版本问题。
- `clipboard` 不可用：使用 localhost/HTTPS；UI 会提示手动选择复制。
- 看不到先前笔记：它保存在原浏览器、原站点 origin；更换端口/设备不会同步，建议及时导出。
- GPU trace 和算子耗时：驱动、功耗、预热、profiler 开销都会影响结果，不跨机器直接排名。
