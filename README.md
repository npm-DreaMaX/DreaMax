# DreaMax

个人主页 + LLM Training。首页按 Adventure X 的沉浸式方向重新设计：全屏封面、逐屏探索、可切换训练阶段、Agent 轨迹回放、个人算法笔记、项目展示与工具作品。LLM Training、Agentic Scholar、Algorithm 和七个工具仍是独立入口；完整的论文阅读与实验网站在 `/fieldwork/`。

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
src/pages/index.astro             全新沉浸式个人主页
src/pages/llm-training/           独立学习入口与交互雕塑
src/pages/fieldwork/[...path].astro 预渲染全部学习页面
src/components/navigation/       全站导航、搜索和转场
src/components/home/             全屏封面、探索分区、项目舞台与工具作品
src/data/                        简介、项目、栏目与动态
src/styles/portfolio.css          个人主页配色、字体和响应式布局
src/styles/navigation.css         导航结构、学习路线展开和全站目录
src/styles/expedition.css         Adventure X 参考方向、全屏首屏与黑白橙主题
src/styles/home-stages.css        全幅栏目、交互展示与响应式布局
src/scripts/home-stages.ts        训练阶段、Agent 轨迹、项目切换与三维状态联动
src/components/experience/SpatialScene.astro  可复用三维图形与控制栏
src/scripts/spatial-*.ts          懒加载、渲染生命周期与三种三维模型
src/components/experience/SortingScene.astro  可逐步播放的立体冒泡排序
src/scripts/depth-effects.ts      工具透视交互与导航阅读进度
src/styles/collections.css        Scholar、工具作品集与个人介绍的统一排版
src/pages/join.astro              研究方向、Agentic RL、RSI、军旅梦与联系方式
src/styles/about.css              Join Us 的叙事排版与手机适配
src/data/scholar.ts               研究阅读入口、原始来源与核对日期
src/data/algorithms.ts            我的 CSDN 算法笔记分组与阅读提示
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

- 浮动导航直达主要栏目；学习路线支持点击展开、方向键进入、Esc 和外部点击关闭。全屏导航保留六个平级栏目，直接进入五条学习路线。
- 全屏暖色光轨首屏，使用用户提供背景和开源 Orbix 字标及其特殊 X；自托管字体并保留 OFL 授权。原有跳动标语移至 Join Us；首页保留点击掉落 HTML 字符串、涟漪与背景视差。首页两行英文名言使用自托管 Cormorant Garamond 斜体，入场后保持静止；减少动态效果时停用装饰运动。全站主色为黑、白、橙，Agentic Scholar 使用整块橙色背景，个人方向为 `LLM training & RSI`。
- `Ctrl+K` / `⌘K` 搜索栏目、项目、论文和工具，方向键选择，Esc 关闭。
- 原生跨页链接使用可取消的幕布转场，浏览器前进/返回正常；减少动态效果时直接导航。
- 首页增加三个 WebGL 场景：训练阶段切换体素形态、Agent 轨道节点、项目堆叠 / 协作节点 / 波动方阵；Scholar 页面使用同系列轨道。支持拖动、方向键、暂停、展开、重置，以及金属 / 磨砂材质、打光方向和运动速度调节，按可见区域加载，最高 30fps / DPR 1.5，屏外和后台停止，缺少 WebGL 时显示 SVG。
- 算法区的冒泡排序支持单步、播放、重排；工具支持指针控制的透视倾斜。Join Us 合照保持完整比例，静态展示，不支持点击放大。
- LLM Training 原有的 Three.js 雕塑支持拖动、方向键、三种形态、暂停与重置。无 WebGL 时显示自绘 SVG；屏外/后台暂停，限制像素比和帧率。
- 学习区的原图放大、阶段对照、实验参数与笔记保留；内部 React 路由不被跨页转场拦截。

## 更新内容

个人简介改 `src/data/profile.ts`，项目改 `src/data/featured.ts`，共享栏目改 `src/data/navigation.ts`。三个项目的描述已对照官方 README，不把计划中的功能写成已实现能力。

Join Us 的介绍和照片说明维护在 `profile.ts`；合照原文件为 `public/images/about/military-dream.jpg`。自述与致敬语合成一段正文，合照显示宽度不超过 320px，保留完整构图、原有跳动文字和联系方式。

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

`npm run check` 合并内容检查、单元测试、Python 实验和生产构建。浏览器测试包含桌面/手机导航、跨页返回、搜索、阅读笔记、实验、原有工具和无 JavaScript 正文。工具测试拦截外部请求，不登录或写入线上服务。类型检查覆盖新集成与学习站；原有七个工具、分享页及一个未使用的旧视觉脚本沿用原始 JavaScript，明确排除在严格类型检查之外。

图标、分享图和几何图形为项目自绘。运行 `node scripts/generate-brand-assets.mjs` 从 SVG 生成 ICO/PNG，需要 Playwright Chromium。论文图像的归属见 `fieldwork/THIRD_PARTY_NOTICES.md`；不将论文资产纳入项目自身授权。

## Cloudflare Pages

生产域名为 `https://dreamax.pages.dev`。沿用仓库的 Git 集成时，配置：

- 仓库：`npm-DreaMaX/DreaMax`，生产分支 `main`。
- 根目录：仓库根目录；构建命令 `npm run build`；输出目录 `dist`。
- Node 版本至少 22.12，建议 `NODE_VERSION=22`。

推送到生产分支后由 Cloudflare 构建发布；本地修改和本地 commit 不会更新线上。最终以 Cloudflare 部署成功并访问线上 `/llm-training/` 为准。`public/_redirects` 兼容被移除的 Magic Corner、Machine Learning 及旧文章 URL。

导航与动效设计采用 [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) 的交互、键盘、性能和减少动态效果指南。记录见 `design-system/dreamax/MASTER.md`。

## 同步我的算法文章

Algorithm 展示账号 `2401_88204232` 的 11 篇原创算法文章，保留标题、更新时间与 CSDN 原文入口，支持分类、搜索、排序和 URL 状态。

```bash
node scripts/sync-csdn.mjs
# 本机代理连接 CSDN 失败时，可对这一次公开请求使用直连：
node scripts/sync-csdn.mjs --direct
# 或解析已保存的公开主页：
node scripts/sync-csdn.mjs --input /path/to/public-profile.html
```

脚本只读取公开主页，失败时不覆盖已有数据。原始元数据在 `src/data/sources/csdn-public-index.json`；新增文章后在 `src/data/algorithms.ts` 补充分组和阅读提示，再构建发布。原文与代码仍通过 CSDN 阅读。

## 视觉素材与再生成

来源与授权见 [docs/visual-sources.md](docs/visual-sources.md)。背景原图、字体、字体 OFL 授权、SVG 与生成脚本均保存在项目中。

```bash
node scripts/generate-hero-assets.mjs
# 字标 SVG 再生成需要 Python fonttools[woff]，网站运行不需要 Python：
python3 scripts/generate-wordmark.py
node scripts/generate-brand-assets.mjs
```

首页动效与交互说明见 [docs/motion-art-direction.md](docs/motion-art-direction.md)。首屏光场、材质与光线、前后对比和减少动态偏好的回归测试在 `tests/motion-studio.spec.ts`，与 `tests/spatial.spec.ts` 一起运行。首屏背景支持暂停，原有点击字符串效果继续保留。

按用户反馈，三维图案与排序柱图已恢复到 `5e39c50` 的实现；保留新版摄影棚光照、首页光场、字体、背景与调节控件。
