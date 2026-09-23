# DreaMax 视觉来源 · 2026-09-23

## 字标与 X 字形

- 原始项目：[AdventureX-RGE / Orbix](https://github.com/AdventureX-RGE/Orbix)
- 设计：Barry Shawn / Besign Foundry，为 AdventureX 制作。
- 固定版本：`16bc8241dde1b94f62650a520939ccd0a275f68b`。
- 原始文件：`WOFF2/Orbix-Regular.woff2`，未修改，保存在 `public/fonts/orbix/`。
- 授权：SIL Open Font License 1.1；完整原始版权与授权文本在同目录 `LICENSE.txt`。
- 字标使用 `ss01` 样式集；X 使用字体公开提供的 `ss02`。图标生成使用同字体的 U+F8FF 字形。
- SVG、favicon、分享图均由项目脚本生成；未复制 AdventureX 的整页源代码。
- 字体适合字标，正文仍使用 Inter / Noto Sans SC，标题使用 Outfit。

## 首页背景

- 用户于 2026-09-23 在对话中提供的原始 2048 × 954 JPG，用户说明来自 Adventure X 首页。
- 原图保存在 `public/images/hero/adventure-light-original.jpg`；没有把该图片标为本站原创或开源图片。
- `scripts/generate-hero-assets.mjs` 仅生成 WebP 与手机尺寸版本。网页的遮罩、指针视差、滚动变化由 CSS / TypeScript 实现。
- 参考站：https://www.adventure-x.cn/zh/ 。本次读取到的页面标题为 AdventureX 2026 活动回顾；布局参考其沉浸首屏与顺序滚动结构。
- 字体的官方设计说明：https://besign.co/en/news/besign-empowers-adventurex-2025 。

## 算法文章

- 公开主页：https://blog.csdn.net/2401_88204232 ，公开昵称「我不是小菠萝」。
- 读取公开主页的 12 篇原创文章，排除软件综合实训文章后，Algorithm 展示 11 篇算法笔记。
- 真实标题、文章 URL、更新时间与公开摘要记录在 `src/data/sources/csdn-public-index.json`。
- 分组、标签与简短阅读提示维护在 `src/data/algorithms.ts`；与原始数据分离。
- 正文和代码通过原文链接在 CSDN 阅读。本站没有捏造原文或复制未能读取的正文，也不读取私信、后台草稿或登录凭据。

## 其他栏目与示意图

- 训练环面、Agent 轨迹和项目图形由本地 SVG / CSS 绘制；环面参数在 `TrainingField.astro`，不是实际训练结果或损失曲线。
- 点击涟漪、HTML 字符串掉落与跳动文字保留原实现。减少动态效果的系统偏好会停用装饰运动。
- 个人照片与简历沿用原仓库文件。研究阅读存档迁至 Agentic Scholar 的折叠区域。
- Agentic Scholar 的阅读提示由本站编写，原始材料于 2026-09-23 核对；条目级来源保存在 `src/data/scholar.ts`：
  - [MCP 官方架构文档](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)：协议职责、Host / Client / Server 与上下文边界。
  - [CWM 技术报告](https://arxiv.org/abs/2510.02387)：代码生成与世界模型的研究入口。
  - [VAGEN 论文](https://arxiv.org/abs/2510.16907)：多轮视觉 Agent、状态推理与强化学习。
- 原页面未附来源的性能数字不再沿用；当前栏目是有原文入口的阅读索引，不宣称包含尚未编写的论文精读。
