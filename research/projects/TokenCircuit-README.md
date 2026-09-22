<div align="center">
  <img src="assets/token-circuit-hero.svg" width="100%" alt="TokenCircuit — 从手写 Transformer 到真实 LLM" />

  <br />

  **大模型算法原理、源码、推理系统与 Post-Training 学习路线**

  <br />

  [学习路线](#学习路线) · [Qwen3 源码实验](#qwen3-源码实验) · [推理与训练](#推理与训练实验) · [技术报告](#技术报告阅读) · [目录](#仓库结构)
</div>

---

TokenCircuit 将大模型算法知识组织为一条连续主线：从 Transformer 数学组件出发，构造完整 Decoder-only LLM；进入 Qwen3 工业源码观察真实 Tensor 与 KV Cache；继续学习推理系统、训练与 Post-Training；最终回到官方 Technical Report 判断架构创新与实验依据。

`01_Core_Components` 包含 8 份手搓 Jupyter Notebook。公式推导、PyTorch 实现、Tensor shape 与运行输出共同构成整条路线的数学锚点。

## 学习路线

```text
01  CORE COMPONENTS
    Softmax · LayerNorm · RMSNorm · FFN · SwiGLU · MHA · RoPE
                              │
                              ▼
02  COMPLETE LLM
    Token Embedding → N × Decoder Block → LM Head → CE → Generation
                              │
                              ▼
03  QWEN3 SOURCE
    手写组件 ↔ Qwen3-0.6B ↔ Layer 0 Tensor Trace ↔ KV Cache
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
04  INFERENCE                     05  TRAINING
    GQA · KV Cache · Flash            LoRA · AdamW · Scheduler
    Long Context · Systems             Norm · Information Theory
                  └───────────┬───────────┘
                              ▼
06  POST-TRAINING
    SFT → Preference → DPO / PPO / GRPO → Data & Evaluation
                              │
                              ▼
07  MODERN REPORTS
    Qwen3.8 Guided Reading → DeepSeek / Kimi / GLM
```

每一层都为下一层提供必要前置：公式落到 Tensor，Tensor 组成模型，模型映射到工业源码，源码进入推理与训练系统，最后用这些知识阅读一手技术报告。

## 模块地图

|  | 模块 | 核心问题 | 掌握要求 |
| :---: | --- | --- | --- |
| `01` | [Core Components](01_Core_Components/) | Attention、RoPE、Norm、FFN 如何从公式变成 Tensor | 核心 Notebook 可独立复现 |
| `02` | [Complete LLM](02_Complete_LLM/) | Decoder Block 如何堆叠为 next-token Language Model | Model、CE、Generation 会手写 |
| `03` | [Qwen3 Walkthrough](03_OpenSource_Model_Walkthrough/) | 教学实现如何映射到 `modeling_qwen3.py` | 能沿 forward 解释每个 shape |
| `04` | [Inference](04_Inference/) | Prefill、Decode、KV memory 与吞吐瓶颈分别是什么 | GQA/KV Cache 会写，系统原理会讲 |
| `05` | [Training](05_Training/) | 参数怎样更新，LoRA 怎样适配 pretrained Linear | LoRA 会写，优化原理会推 |
| `06` | [Post-Training](06_PostTraining/) | SFT、preference 与 reward 如何改变 policy | 能区分 DPO/PPO/GRPO 的数据与目标 |
| `07` | [Modern Reports](07_Modern_LLM_Reports/) | 新架构解决了什么 bottleneck，证据是否充分 | 回到 Equation、Figure、Table 核验 |

> `★★★★★` 表示大模型算法面试核心；`手撕：核心版` 表示需要写出数学关键逻辑，不要求复刻工业框架。

## 三条核心链路

<table>
  <tr>
    <td width="33%" valign="top">
      <strong>Ⅰ · 从公式到模型</strong><br /><br />
      Softmax、Norm、RoPE、Attention 与 SwiGLU 先在手搓 Notebook 中独立成立，再进入 Decoder Block 和完整 Causal LM。
    </td>
    <td width="33%" valign="top">
      <strong>Ⅱ · 从模型到系统</strong><br /><br />
      使用真实 Qwen3 观察 projection、GQA、RoPE、Cache、Prefill 与 Decode，把教学实现映射到工业调用链。
    </td>
    <td width="33%" valign="top">
      <strong>Ⅲ · 从结论到证据</strong><br /><br />
      技术报告阅读围绕 bottleneck、数学变化、trade-off、ablation 与 kernel/system evidence 展开。
    </td>
  </tr>
</table>

## Qwen3 源码实验

第一次工业源码选择 Dense `Qwen/Qwen3-0.6B`。模型尺寸适合普通游戏本，同时完整保留 RMSNorm、RoPE、GQA、SwiGLU、DecoderLayer、KV Cache 与 CausalLM 主链路。

```text
input_ids [B,L]
    ↓
Token Embedding [B,L,D]
    ↓
Layer 0: RMSNorm → Q/K/V → QK Norm → RoPE → GQA → MLP
    ↓
28 × DecoderLayer → Final RMSNorm → LM Head
    ↓
logits [B,L,V] → sampling → next token
```

- [Qwen3 源码主讲义](03_OpenSource_Model_Walkthrough/Qwen3_SourceWalkthrough.md)：从 `Qwen3Config` 一直追到 `GenerationMixin`。
- [RunAndTrace_Qwen3.py](03_OpenSource_Model_Walkthrough/RunAndTrace_Qwen3.py)：使用 forward hook 观察第 0 层真实 Tensor。
- Cache 实验：`Prefill L → Decode L+1`，并比较 cached logits 与 full forward logits。

```bash
python3 03_OpenSource_Model_Walkthrough/RunAndTrace_Qwen3.py
```

脚本观察官方模型组件，不修改 Qwen3 的 Attention、RoPE、GQA、MLP 或 DecoderLayer。

### 当前实践覆盖

- Qwen3-0.6B 的加载、forward、Layer 0 Tensor Trace、Prefill、单 token Decode、KV Cache 长度变化与 `generate()` 已由 `RunAndTrace_Qwen3.py` 覆盖。
- 真实 Qwen3 LoRA/SFT 实验与 inference benchmark 仍保留在 Training Lab / Inference Lab 路线中，当前仓库尚未实现对应训练或性能评测脚本。

## 推理与训练实验

### Inference Lab

```text
GQA / MQA
→ RoPE-aware KV Cache
→ Prefill vs Decode
→ FlashAttention / PagedAttention
→ TTFT / TPOT
→ Continuous Batching / Prefix Cache
→ vLLM / Quantization / Parallelism
```

在真实 Qwen3 上进一步研究 context length、KV memory、TTFT、TPOT、latency 与 throughput，建立从 Attention kernel 到 serving scheduler 的完整视角。

### Training Lab

```text
Pretrained Qwen3-0.6B
→ Freeze base parameters
→ Insert LoRA
→ Instruction data + chat template
→ labels / response mask
→ Train → Save adapter → Reload
→ Generation comparison + failure analysis
```

训练主线从 Cross Entropy、AdamW、warmup、gradient clipping 进入 LoRA 与 SFT，再衔接 Preference Optimization 和 Reasoning RL。

## 架构专题

MoE、MLA、MTP 不脱离具体模型做孤立名词解释，而是在对应官方 Technical Report 中系统学习：

| 专题 | 主报告 | 知识链 |
| --- | --- | --- |
| **MoE** | DeepSeek-V2 → DeepSeek-V3 → Kimi K3 | Dense FFN → experts → router → top-k → load balancing → Expert Parallel |
| **MLA** | DeepSeek-V2 → DeepSeek-V3 → Kimi K3 | MHA → GQA → KV Cache bottleneck → latent compression → decoupled RoPE |
| **MTP** | DeepSeek-V3 → DeepSeek-V3.2 | next-token objective → auxiliary heads/loss → multi-token objective → speculative decoding |

完整章节与报告边界见 [Modern LLM Reports Reading Guide](07_Modern_LLM_Reports/ReadingGuide.md#架构级技术在哪里学)。

## 技术报告阅读

[Qwen3.8-Flash-Next Guided Reading](07_Modern_LLM_Reports/Qwen3.8_Flash_Next_GuidedReading.md) 是第一篇完整报告带读，严格对应官方章节、Equation、Figure 与 Table：

| Architecture | Efficiency | Stability |
| --- | --- | --- |
| Gated DeltaNet | Qwen Sparse Attention | Gated Residual |
| N-gram Embedding | QSA / MTP index reuse | Muon + stress tests |

阅读目标不是记住模块名称，而是回答五个问题：

1. 原架构的 bottleneck 是什么？
2. 新设计改变了哪条数学或数据流？
3. 节省了 compute、memory 还是 communication？
4. 为效率、容量或稳定性付出了什么代价？
5. 哪个 Equation、ablation 或 kernel benchmark 支持结论？

其余官方报告按学习目的排列在 [ReadingGuide.md](07_Modern_LLM_Reports/ReadingGuide.md)：Qwen3 源码基础、DeepSeek-R1 Reasoning RL、DeepSeek-V2/V3 架构专题、Kimi K3 frontier architecture、DeepSeek-V3.2 与 GLM 系列。

## 仓库结构

<details>
<summary><strong>展开 TokenCircuit</strong></summary>

```text
TokenCircuit/
├── README.md
├── LICENSE
├── assets/
│   └── token-circuit-hero.svg
├── 01_Core_Components/
│   ├── SoftMax.ipynb
│   ├── LayerNorm.ipynb
│   ├── RMSNorm.ipynb
│   ├── FFN.ipynb
│   ├── SwiGLU.ipynb
│   ├── MHA.ipynb
│   ├── RoPE.ipynb
│   └── Decoder_Block.ipynb
├── 02_Complete_LLM/
│   ├── DecoderOnlyLLM.py
│   ├── CrossEntropy.py
│   └── Generation.py
├── 03_OpenSource_Model_Walkthrough/
│   ├── README.md
│   ├── Qwen3_SourceWalkthrough.md
│   └── RunAndTrace_Qwen3.py
├── 04_Inference/
│   ├── GQA.py
│   ├── KVCache.py
│   ├── MQA.md
│   ├── CrossAttention.md
│   ├── AbsolutePositionEncoding.md
│   ├── FlashAttention.md
│   ├── LongContext.md
│   └── InferenceSystems.md
├── 05_Training/
│   ├── LoRA.py
│   ├── AdamW.md
│   ├── GradientClipping_and_LRScheduler.md
│   ├── InformationTheory.md
│   ├── BatchNorm_vs_LayerNorm.md
│   └── ContrastiveLoss.md
├── 06_PostTraining/
│   ├── RL_Fundamentals.md
│   ├── SFT.md
│   ├── DPO.md
│   ├── PPO.md
│   ├── GRPO.md
│   └── Data_and_Evaluation.md
└── 07_Modern_LLM_Reports/
    ├── ReadingGuide.md
    └── Qwen3.8_Flash_Next_GuidedReading.md
```

</details>

## 面试使用方法

1. **公式层**：先说数学定义、归一化维度和复杂度。
2. **Tensor 层**：给出每一步 shape，说明 reshape、transpose 和 broadcast。
3. **源码层**：定位真实 class/function，区分核心数学与工业兼容逻辑。
4. **系统层**：说明训练、Prefill、Decode 的瓶颈为什么不同。
5. **证据层**：技术结论回到官方 Equation、Figure、Table 与实验设置。

---

<div align="center">
  <sub>FORMULA → TENSOR → SOURCE → SYSTEM → EVIDENCE</sub>
</div>
