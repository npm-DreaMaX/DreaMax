import figureData from "./paper-figures.json";

export type Stage =
  "pretraining" | "midtraining" | "posttraining" | "agentic" | "systems";
export interface ReadingSection {
  id: string;
  title: string;
  stage: Stage;
  locator: string;
  essential: boolean;
  body: string;
  figures?: { id: string; title: string; notes: string[] }[];
}
export interface Paper {
  id: string;
  title: string;
  subtitle: string;
  organization: string;
  year: string;
  kind: "frontier" | "bridge" | "foundation";
  stages: Stage[];
  tags: string[];
  question: string;
  why: string;
  minutes: number;
  sourceId: string;
  cover: string;
  sections: ReadingSection[];
  takeaways: string[];
  connections: { id: string; reason: string }[];
  lab: string;
  codeChapter: string;
}
export interface ReadingPath {
  id: Stage;
  index: string;
  name: string;
  en: string;
  headline: string;
  intro: string;
  question: string;
  color: string;
  items: { id: string; section: string; focus: string; shift: string }[];
}
const modules = import.meta.glob("../papers/*.json", {
  eager: true,
  import: "default",
});
export const papers = Object.values(modules) as Paper[];
export const paperById = (id: string) => papers.find((p) => p.id === id);
export const figures = figureData;
export const paths: ReadingPath[] = [
  {
    id: "pretraining",
    index: "01",
    name: "预训练",
    en: "Pre-training",
    color: "#c58251",
    headline: "模型的能力，\n从什么地方长出来？",
    intro:
      "沿着计算预算、数据配方、稀疏架构与训练稳定性，读懂基础模型是怎样炼成的。",
    question: "固定一笔算力预算，应该增加参数、增加数据，还是改变计算方式？",
    items: [
      {
        id: "chinchilla",
        section: "budget",
        focus: "固定 FLOPs，寻找参数与 token 的最优分配。",
        shift: "建立基线",
      },
      {
        id: "deepseek-v3",
        section: "pretraining",
        focus: "将稀疏计算、数据与 FP8 组成真正可训练的系统。",
        shift: "从公式到集群",
      },
      {
        id: "qwen3",
        section: "data",
        focus: "实例级数据标注与三个训练阶段如何相互配合。",
        shift: "从静态配比到分阶段训练",
      },
      {
        id: "kimi-k3",
        section: "pretraining",
        focus: "混合注意力与数据配方如何改变 scaling 曲线。",
        shift: "重新设计计算方式",
      },
      {
        id: "deepseek-v41",
        section: "pretraining",
        focus: "长上下文、检索式记忆与编码解码分工。",
        shift: "训练与服务共同设计",
      },
      {
        id: "qwen38",
        section: "optimizer",
        focus: "同样叫 Muon，哪些矩阵用、怎么分片、为什么会失败？",
        shift: "读懂负面实验",
      },
    ],
  },
  {
    id: "midtraining",
    index: "02",
    name: "中训练",
    en: "Mid-training",
    color: "#b17e58",
    headline: "从通用底座，\n走向下一阶段的能力。",
    intro:
      "不是每个团队都叫它 Mid-Training。把报告中的数据、上下文和优化器切换放在一起，理解能力塑形。",
    question: "什么能力需要先写入模型，才值得用昂贵的 RL 去探索？",
    items: [
      {
        id: "qwen3",
        section: "midtraining",
        focus: "报告称之为 S2 / Long Context Stage；我们为何将它们对照中训练。",
        shift: "先建立术语边界",
      },
      {
        id: "glm5",
        section: "midtraining",
        focus: "32K → 128K → 200K 与软件工程数据同步扩展。",
        shift: "把仓库放进上下文",
      },
      {
        id: "kimi-k3",
        section: "midtraining",
        focus:
          "预训练的 context extension 与 cooldown，和后训练 QAT 分别发生在哪。",
        shift: "逐项对齐训练阶段",
      },
      {
        id: "mimo-v26",
        section: "midtraining",
        focus: "Agent 轨迹、Muon 变体和 MXFP4 怎样为大 batch RL 做准备。",
        shift: "直接连接后训练",
      },
      {
        id: "qwen38",
        section: "negative",
        focus: "预训练 loss 近似不变，为什么后训练能力可能受损。",
        shift: "检验阶段接口",
      },
    ],
  },
  {
    id: "posttraining",
    index: "03",
    name: "后训练",
    en: "Post-training",
    color: "#6882a6",
    headline: "从模仿答案，\n到优化解决问题的方式。",
    intro:
      "从人类偏好到可验证奖励，再到在线蒸馏。读清楚每一步换了什么数据、目标和计算代价。",
    question: "奖励来自哪里，优化的是谁的分布，提升又该归因给谁？",
    items: [
      {
        id: "instructgpt",
        section: "pipeline",
        focus: "区分示范、偏好排序和策略采样这三种数据。",
        shift: "建立 RLHF 参照系",
      },
      {
        id: "dpo",
        section: "objective",
        focus: "沿公式推导，看奖励模型怎样被重参数化掉。",
        shift: "离线偏好优化",
      },
      {
        id: "process-supervision",
        section: "experiment",
        focus: "比较结果奖励与过程奖励，先看实验究竟测了什么。",
        shift: "监督粒度",
      },
      {
        id: "deepseek-math",
        section: "grpo",
        focus: "GRPO 的组内基线与省掉 critic 的代价。",
        shift: "可验证任务上的 RL",
      },
      {
        id: "deepseek-r1",
        section: "pipeline",
        focus: "R1-Zero 与 R1 为什么是两个不同的实验问题。",
        shift: "推理能力与训练配方",
      },
      {
        id: "kimi-k3",
        section: "posttraining",
        focus: "专家 RL、多教师在线蒸馏和量化感知训练。",
        shift: "整合专家策略",
      },
      {
        id: "mimo-v26",
        section: "distillation",
        focus: "MOPD2 为什么需要前缀条件下的单轮采样。",
        shift: "长轨迹蒸馏的接口",
      },
    ],
  },
  {
    id: "agentic",
    index: "04",
    name: "Agentic RL",
    en: "Agentic post-training",
    color: "#ce704f",
    headline: "让模型进入环境，\n让经验回到训练。",
    intro:
      "把任务合成、沙箱、长轨迹、评分和策略更新连成一条真实的数据流。这是整条阅读路线的重心。",
    question: "一个持续行动的模型，如何从失败和成功中获得可靠的训练信号？",
    items: [
      {
        id: "kimi-k2",
        section: "synthesis",
        focus: "工具库 → agent → 任务 → 轨迹；先拆开合成环境和真实执行。",
        shift: "构造训练分布",
      },
      {
        id: "glm5",
        section: "agentic",
        focus: "异步 rollout 如何改变 policy lag、token 对齐与优化。",
        shift: "把长轨迹装进系统",
      },
      {
        id: "deepseek-v41",
        section: "agentic",
        focus: "真实环境数据、长前缀复用与异步后训练的关系。",
        shift: "扩展环境与上下文",
      },
      {
        id: "mimo-v26",
        section: "agentic",
        focus: "从通过单测到 groupwise agentic grading，逐图拆解 RL 全流程。",
        shift: "规模、奖励和稳定性一起看",
      },
    ],
  },
  {
    id: "systems",
    index: "05",
    name: "算子与集群",
    en: "Kernels & systems",
    color: "#64887d",
    headline: "论文里的 FLOPs，\n怎样变成卡上的时间？",
    intro:
      "从 HBM 与 SRAM 到多卡通信，再到 rollout 调度。每篇都回答一个真实的瓶颈在哪里。",
    question: "GPU 是在算、在搬数据、在等通信，还是在等环境？",
    items: [
      {
        id: "flashattention",
        section: "io",
        focus: "不改变精确注意力，为什么减少 IO 就能更快。",
        shift: "先看一张卡",
      },
      {
        id: "deepseek-v3",
        section: "systems",
        focus: "2048 张 H800 如何组织 EP、PP 与通信重叠。",
        shift: "再看多卡集群",
      },
      {
        id: "kimi-k3",
        section: "systems",
        focus: "流水线不同阶段怎样安排计算、通信与 offload。",
        shift: "显存与带宽一起算",
      },
      {
        id: "qwen38",
        section: "optimizer",
        focus: "矩阵优化器如何跨分片恢复完整算子，以及小 kernel 的开销。",
        shift: "算法反过来约束系统",
      },
      {
        id: "glm5",
        section: "systems",
        focus: "PD 分离和 MTP 为什么对 rollout 长尾格外有价值。",
        shift: "训练时间被谁决定",
      },
      {
        id: "mimo-v26",
        section: "systems",
        focus: "Trainer、Rollout、Grader 三种计算的吞吐协调。",
        shift: "看完整 RL 工厂",
      },
    ],
  },
];
export function searchPapers(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return papers
    .map((p) => {
      const title = [p.title, p.subtitle, p.organization, ...p.tags]
        .join(" ")
        .toLowerCase();
      const body = p.sections
        .map((s) => s.title + " " + s.body)
        .join(" ")
        .toLowerCase();
      return {
        paper: p,
        score: words.reduce(
          (n, w) => n + (title.includes(w) ? 10 : body.includes(w) ? 1 : -100),
          0,
        ),
      };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((p) => p.paper);
}
