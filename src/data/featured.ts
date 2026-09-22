export interface FeaturedResearch {
  title: string;
  venue: string;
  year: number;
  description: string;
  link?: string;
}

export interface FeaturedProject {
  title: string;
  description: string;
  tags: string[];
  link?: string;
}

export const featuredResearch: FeaturedResearch[] = [
  {
    title: "Deep Residual Learning for Image Recognition",
    venue: "CVPR 2016 / arXiv:1512.03385",
    year: 2015,
    description:
      "Proposed residual learning framework that enables training of substantially deeper networks by reformulating layers as learning residual functions with reference to layer inputs.",
    link: "https://arxiv.org/abs/1512.03385",
  },
  {
    title:
      "NeoVerse: Enhancing 4D World Model with in-the-wild Monocular Videos",
    venue: "Preprint",
    year: 2025,
    description:
      "A novel framework that leverages diverse monocular video data to improve 4D world model generalization across complex dynamic scenes.",
    link: "https://arxiv.org/abs/2506.04132",
  },
  {
    title:
      "MegaSaM: Accurate, Fast and Robust Structure and Motion from Casual Dynamic Videos",
    venue: "Preprint / arXiv",
    year: 2024,
    description:
      "A robust system for recovering accurate camera parameters and dense scene structure from casually captured dynamic videos with fast inference speed.",
    link: "https://arxiv.org/abs/2412.04463",
  },
];

// Descriptions checked against pinned official README snapshots in research/projects/.
export const featuredProjects: FeaturedProject[] = [
  {
    title: "Triple-pi",
    description:
      "基于 Pi 的编程 Agent，把跨会话记忆与项目规则审查接入日常开发流程。让上下文积累下来，让每次修改都有据可查。",
    tags: ["TypeScript", "Pi Agent", "Memory", "Code Review"],
    link: "https://github.com/npm-DreaMaX/Triple-pi",
  },
  {
    title: "TripleTeam",
    description:
      "面向长程软件工程任务的 Agent 终端工作台，围绕目标、预算、协作与验证组织执行，用持久化产物和 Git 证据完成交付。",
    tags: ["Agent Orchestration", "Terminal", "Git"],
    link: "https://github.com/npm-DreaMaX/TripleTeam",
  },
  {
    title: "TokenCircuit",
    description:
      "从 Transformer 数学组件到完整 LLM，用 Notebook、PyTorch 实现和真实模型源码，串起训练、推理与技术报告的学习路径。",
    tags: ["Python", "PyTorch", "Notebook", "LLM"],
    link: "https://github.com/npm-DreaMaX/TokenCircuit",
  },
];
