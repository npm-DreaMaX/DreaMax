# DreaMax

个人主页 + LLM Training。保留原有首页结构、Selected Research、Agentic Scholar、Algorithm 和七个工具；新增与这些栏目平级的 `/llm-training/`。完整的论文阅读与实验网站在 `/fieldwork/`。

## 运行

需要 Node.js **22.12+**、npm。Python 实验需要 Python **3.10+**。

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

打开 `http://localhost:4321/`；学习栏目是 `http://localhost:4321/llm-training/`。

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

输出 `dist/`，可部署为静态网站。学习区不需要模型 API、数据库或 GPU。原有邮箱、文件分享等工具保留原来的后端依赖；构建成功不代表第三方服务可用。

## 结构

```text
src/pages/index.astro             原有个人主页，微调视觉
src/pages/llm-training/           独立学习入口与交互雕塑
src/pages/fieldwork/[...path].astro 预渲染全部学习页面
src/components/navigation/       全站导航、搜索和转场
src/components/home/             首页原有内容与学习入口
src/data/                        简介、项目、栏目与动态
src/styles/portfolio.css          个人主页微调和共享导航
src/styles/experience.css         LLM Training 的视觉系统
src/scripts/                     搜索、导航、转场与 Three.js
fieldwork/src/papers/             15 篇论文精读，63 个带页码段落
fieldwork/src/content/            工程补充内容（见实际目录）
fieldwork/src/data/               来源、版本、路线、原图归属
fieldwork/labs/                   8 个 Python 教学实验
fieldwork/research/               来源登记与关键源码快照
public/figures/                   22 幅有来源记录的论文原图
research/projects/               三个项目的 README 版本证据
```

论文精读、21 篇工程补充、8 个交互实验共用阅读进度、笔记、主题与搜索。`fieldwork/src/Fieldwork.tsx` 在服务端使用 StaticRouter 生成正文，在浏览器使用带 `/fieldwork` basename 的 BrowserRouter。文章直接访问、刷新和无 JavaScript 阅读都可用。

原始独立学习项目仍在工作区 `LLM_Webset/`；本仓库的 `fieldwork/` 是随个人网站一起构建的集成版本，不依赖工作区外文件。

## 导航与动态效果

- 六个平级栏目；全屏导航中直接进入五条学习路线。
- `Ctrl+K` / `⌘K` 搜索栏目、项目、论文和工具，方向键选择，Esc 关闭。
- 原生跨页链接使用可取消的幕布转场，浏览器前进/返回正常；减少动态效果时直接导航。
- Three.js 雕塑支持拖动、方向键、三种形态、暂停与重置。无 WebGL 时显示自绘 SVG；屏外/后台暂停，限制像素比和帧率。
- 学习区的原图放大、阶段对照、实验参数与笔记保留；内部 React 路由不被跨页转场拦截。

## 更新内容

个人简介改 `src/data/profile.ts`，项目改 `src/data/featured.ts`，共享栏目改 `src/data/navigation.ts`。三个项目的描述已对照官方 README，不把计划中的功能写成已实现能力。

新增论文：在 `fieldwork/src/papers/` 按现有 JSON 结构添加正文，在 `fieldwork/src/data/readings.ts` 注册导入和路线，在 `sources*.json` 登记原文、查阅日期和支持的结论。图像需记录 PDF 页码、来源及 SHA-256。论文事实、源码观察和作者分析分开标注。新增实验同时提供 Python 实现、配置、运行说明和行为测试。详见 `fieldwork/README.md`。

```bash
npm run check:content
npm run test:unit
npm run test:labs
npm run check:types
npm run build
npx playwright install chromium
npm run test:web
```

`npm run check` 合并内容检查、单元测试、Python 实验和生产构建。浏览器测试包含桌面/手机导航、跨页返回、搜索、阅读笔记、实验、原有工具和无 JavaScript 正文。工具测试拦截外部请求，不登录或写入线上服务。类型检查覆盖新集成与学习站；原有七个工具、分享页及三个未使用的旧视觉脚本沿用原始 JavaScript，明确排除在严格类型检查之外。

图标、分享图和几何图形为项目自绘。运行 `node scripts/generate-brand-assets.mjs` 从 SVG 生成 ICO/PNG，需要 Playwright Chromium。论文图像的归属见 `fieldwork/THIRD_PARTY_NOTICES.md`；不将论文资产纳入项目自身授权。

## Cloudflare Pages

生产域名为 `https://dreamax.pages.dev`。沿用仓库的 Git 集成时，配置：

- 仓库：`npm-DreaMaX/DreaMax`，生产分支 `main`。
- 根目录：仓库根目录；构建命令 `npm run build`；输出目录 `dist`。
- Node 版本至少 22.12，建议 `NODE_VERSION=22`。

推送到生产分支后由 Cloudflare 构建发布；本地修改和本地 commit 不会更新线上。最终以 Cloudflare 部署成功并访问线上 `/llm-training/` 为准。`public/_redirects` 兼容被移除的 Magic Corner、Machine Learning 及旧文章 URL。

导航与动效设计采用 [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) 的交互、键盘、性能和减少动态效果指南。记录见 `design-system/dreamax/MASTER.md`。
