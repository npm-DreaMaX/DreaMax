import type { Article, Source, TrackId } from "../types";
export const tracks: {
  id: TrackId;
  number: string;
  name: string;
  en: string;
  description: string;
}[] = [
  {
    id: "data",
    number: "01",
    name: "数据工程",
    en: "Data",
    description: "把数据质量、配比与预算变成可验证的训练决策。",
  },
  {
    id: "pretraining",
    number: "02",
    name: "现代预训练",
    en: "Modern Pretraining",
    description: "从计算预算到 MoE、训练精度与稳定性。",
  },
  {
    id: "midtraining",
    number: "03",
    name: "中训练与能力塑形",
    en: "Mid-Training",
    description: "在分布切换中建立能力，也守住已有能力。",
  },
  {
    id: "posttraining",
    number: "04",
    name: "现代后训练",
    en: "Post-Training",
    description: "从监督信号到偏好、可验证奖励与推理强化。",
  },
  {
    id: "agentic",
    number: "05",
    name: "Agentic 后训练",
    en: "Agentic Post-Training",
    description: "让策略在环境中行动，从完整轨迹中学习。",
  },
  {
    id: "evaluation",
    number: "06",
    name: "评测与实验",
    en: "Evaluation",
    description: "用可信的测量区分能力提升与评测捷径。",
  },
  {
    id: "serving",
    number: "07",
    name: "推理与部署",
    en: "Inference & Serving",
    description: "围绕 KV cache、调度和延迟设计推理服务。",
  },
  {
    id: "systems",
    number: "08",
    name: "训练与推理系统",
    en: "Systems",
    description: "把算法放进通信、容错与资源约束之中。",
  },
  {
    id: "foundations",
    number: "↳",
    name: "数学与直觉补充",
    en: "Mental Models",
    description: "只补需要的那一块：梯度、计算图与参数更新。",
  },
];
const modules = import.meta.glob("../content/*.json", {
  eager: true,
  import: "default",
});
export const articles = Object.values(modules)
  .map((x) => x as Article)
  .sort(
    (a, b) =>
      tracks.findIndex((t) => t.id === a.track) -
        tracks.findIndex((t) => t.id === b.track) || a.order - b.order,
  );
const sourceFiles = import.meta.glob("./sources*.json", {
  eager: true,
  import: "default",
});
export const sources = Object.values(sourceFiles).flat() as Source[];
export const getTrack = (id: TrackId) => tracks.find((t) => t.id === id)!;
export const byTrack = (id: TrackId) => articles.filter((a) => a.track === id);
export function searchArticles(query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return articles
    .map((article) => {
      const title = (
        article.title +
        " " +
        article.subtitle +
        " " +
        article.description
      ).toLowerCase();
      const body = article.body.toLowerCase();
      return {
        article,
        score: words.reduce(
          (n, w) => n + (title.includes(w) ? 10 : body.includes(w) ? 1 : -100),
          0,
        ),
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.article);
}
