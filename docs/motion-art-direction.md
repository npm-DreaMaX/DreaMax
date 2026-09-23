# 三维与交互改版 · 2026-09-23

用户要求：保留黑白橙与原首页，替换简单方块、圆球和堆叠，增加能直接操控的三维和动态交互。LLM Training 独立入口的既有布局与雕塑保留。

## 参考与取舍

- [Lusion / Devin AI](https://lusion.co/projects/devin_ai/)：官方案例说明包含 3D Design、WebGL、动画与交互设计。查阅官方页面并在浏览器查看案例展示；借鉴空间留白和克制的视觉层次，没有复制其素材。
- [Lusion / Synthetic Human](https://lusion.co/projects/synthetic_human/)：官方说明使用 Houdini FX 工作流优化实时 Web 三维资产，以及程序动画。参考其对形体、材质和运动统一处理的方向；本站没有使用其资产或宣称达到相同制作规格。
- [Three.js / MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)：PBR、clearcoat 与环境反射的实现依据。本站使用已安装 Three.js 0.180 系列。
- [Three.js / PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html)：本地生成的摄影棚柔光环境，不请求外部 HDRI。
- UI UX Pro Max：沿用已记录版本，参考 reduced motion、交互反馈、键盘和触屏要求；视觉决策以用户要求和浏览器实测为准。

连续金属曲面、机械光圈和线束属于本站的设计推导，并非上述工作室的原始模型，也不是模型架构或训练指标的可视化。

## 实现与可操作内容

| 区域 | 三维 / 动效 | 直接操作 |
| --- | --- | --- |
| 首页 | 原背景上的局部折射、缓慢流动的光场 | 移动鼠标、点击拨动、暂停 / 播放 |
| LLM 首页栏目 | 连续扭转曲面，橙色边缘与中性金属表面 | 阶段切换连续变形；拖动、方向键、展开 |
| Agentic Scholar | 带刻度与曲面叶片的机械光圈 | 四步回放改变开合；点击外围标记；旋转、展开 |
| Triple-pi | 连续螺旋带 | 拖动观察与展开 |
| TripleTeam | 三个互锁的圆角金属环 | 拖动、分离结构 |
| TokenCircuit | 44 股曲面线束，GPU 位移及法线修正 | 鼠标局部扰动、展开 |
| 三维调节面板 | 本地摄影棚环境、PBR | 金属 / 磨砂、光向、速度、暂停 |
| 工具 | 图像分屏对比、棋子深度、透视 | 鼠标或滑块调整对比，键盘方向键同样可用 |
| 页面细节 | 标题遮罩入场、磁性箭头、页尾字标扫光 | 悬停触发；链接命中区域不移动 |
| Algorithm | 细金属立柱排序，橙色表示当前比较 | 真实冒泡排序单步 / 播放 / 重置 |

## 性能与降级

- 首屏照片和文字直接输出，不等待 WebGL；背景在空闲期增强，原图一直保留。
- 各栏目按距离视口加载。共用 Three.js bundle，三维场景上限 30fps / DPR 1.5，首屏光场上限 DPR 1.25。
- 屏外、后台停止 RAF；页面释放时清理材质、几何、纹理和观察器。浏览器前进后退缓存恢复时恢复调度。
- reduced motion 使用静态照片，三维初始暂停；显式旋转、材质与灯光操作仍然工作。图像对比滑块在触屏和键盘下可用。
- WebGL 不可用或 context lost 时显示原图 / 本地 SVG，禁用无法使用的三维控制；其他导航和内容仍可用。
- 不监听滚轮来缩放三维，不劫持页面滚动，不添加全屏加载门槛。
- 自动化验证包括真实渲染像素变化、暂停后画面稳定、材质 / 光线控制、原图降级、动态偏好切换、键盘与手机视口；它不等于真实低端手机的 GPU 帧率测试。

相关源码：`src/scripts/spatial-models.ts`、`spatial-scenes.ts`、`studio-environment.ts`、`hero-optics.ts`、`studio-interactions.ts`。没有新增三维资源依赖。
