# 来源、素材与第三方许可

网站自己的动态曲线场、计算图、通信拓扑与 favicon 使用 Canvas / SVG / CSS 绘制，没有使用无来源网络图片。界面字体来自系统字体；KaTeX 数学字体由 npm 依赖随构建提供。Lucide 图标、React、Vite、KaTeX、highlight.js 等包的完整许可保存在相应 `node_modules` 包内，精确版本见 `package-lock.json`。

`src/data/sources*.json` 为每条外部来源记录组织、URL、版本、许可与支持的结论。源码页面只展示必要的短摘录，版权与原许可归上游作者。MIT/Apache/BSD 标签只作用于核验到的对应仓库或文件，不自动覆盖关联的数据、权重或商标。Kimi、GLM、Gemma、Qwen 某些分支采用自定义许可，必须查看相应固定版本的许可证。

`research/source-cache/`、`research/verified-agentic/`、`research/verified-systems/` 和 `research/frontier/` 内的外部文件是研究与复核快照。上游 LICENSE 文件及固定版本链接保留在缓存或来源记录中。本站没有将这些文件重新许可，也没有声称报告所述完整训练过程已开源。若公开分发研究快照，应遵守各自原始许可；仅部署 `dist/` 不会发布整份研究缓存或完整 PDF。

浏览器和 Python 教学实验明确标记为本站教学实现，不冒充任何公司发布的训练源码。完整模型权重未下载或包含在项目中。

## 论文原图

新版在对应论文评析中摘录 22 幅原图。版权归各论文作者或所属机构，不能将本站代码的许可套用到论文图像。具体来源及原图编号见 `src/data/paper-figures.json`，许可范围以 `src/data/sources*.json` 登记和原报告为准；未确认的独立图像许可不被推定为开源。

图像由官方 PDF 的指定区域渲染生成，保留原图内容，不重写标签或数值。每幅都附论文编号、PDF 页码、原文链接和读图说明；原 PDF 的 SHA-256、裁剪坐标和导出图像 SHA-256 可重算。HTML 的米色封面背景是展示样式，放大原图为白底。完整 PDF 与机器提取文字留在研究目录，生产构建不发布整篇论文正文或 PDF。

MiMo、Kimi 与 OpenAI 官网只作为视觉研究参考，未复制其官网品牌、源代码或装饰素材。此网站是独立学习项目，与所引机构无隶属关系。
