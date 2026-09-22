export interface TimelineEntry {
  date: string;
  title: string;
  description: string;
  link?: string;
  module: "llm-training" | "projects" | "agentic-scholar" | "algorithms";
}
export const timeline: TimelineEntry[] = [
  {
    date: "2026-09-22",
    title: "LLM Training · 一个新的学习空间",
    description:
      "论文精读、源码与交互实验，在独立栏目里连成完整的训练学习路线。",
    link: "/llm-training/",
    module: "llm-training",
  },
  {
    date: "2026-09-22",
    title: "从想法到开源项目",
    description: "项目栏加入 Triple-pi、TripleTeam 与 TokenCircuit。",
    link: "/#projects",
    module: "projects",
  },
];
