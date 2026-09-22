import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, GitBranch } from "lucide-react";
import { articles, sources } from "../data/catalog";
interface ModelCase {
  id: string;
  name: string;
  organization: string;
  current: string;
  generations: string[];
  takeaway: string;
  changes: string[];
  questions: string[];
  limits: string;
  disclosure: Record<string, string>;
  sourceIds: string[];
  chapters: string[];
  reported: string;
}
const modules = import.meta.glob("../data/models.json", {
  eager: true,
  import: "default",
});
const models = Object.values(modules).flat() as ModelCase[];
export default function Models() {
  const [selected, setSelected] = useState(models[0]?.id || "");
  const model = models.find((m) => m.id === selected) || models[0];
  return (
    <div className="page page-enter">
      <div className="page-kicker">
        <span className="eyebrow">FRONTIER MODELS / TRANSFERABLE IDEAS</span>
        <span className="edition-tag">官方资料核验 · 2026.09.22</span>
      </div>
      <h1>
        学技术转折，
        <br />
        不追逐每一个版本号。
      </h1>
      <p className="page-lead">
        从当前公开方案进入，回看关键代际。以 DeepSeek、Kimi、Qwen、GLM、MiMo
        的真实报告与实现，检验你对训练范式的理解。
      </p>
      <div className="model-tabs" role="group" aria-label="模型系列">
        {models.map((m) => (
          <button
            className={m.id === model?.id ? "active" : ""}
            onClick={() => setSelected(m.id)}
            key={m.id}
          >
            {m.name.split(" · ")[0]}
          </button>
        ))}
      </div>
      {model && (
        <section className="model-feature" key={model.id}>
          <div className="model-feature-header">
            <div>
              <span className="eyebrow">{model.organization}</span>
              <h2>{model.name}</h2>
              <p className="model-current">{model.current}</p>
              <p>{model.takeaway}</p>
            </div>
            <span className="evidence-badge">
              本次核验快照 · {model.reported}
            </span>
          </div>
          <div className="evolution-chain" aria-label="选择性技术演进">
            {model.generations.map((g, i) => (
              <span key={g}>
                {i > 0 && <ArrowRight size={10} />} {g}
              </span>
            ))}
          </div>
          <div className="model-claims">
            <div>
              <h3>从这一代，研究什么变化</h3>
              <ul>
                {model.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <h3>带着这些问题读报告</h3>
              <ol>
                {model.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
              <div className="model-lessons">
                {model.chapters.map((slug) => {
                  const a = articles.find((a) => a.slug === slug);
                  return a ? (
                    <Link key={slug} to={`/learn/${slug}`}>
                      {a.title} ↗
                    </Link>
                  ) : null;
                })}
              </div>
            </div>
            <div>
              <h3>公开到了哪一步</h3>
              <div className="disclosure-grid">
                {Object.entries(model.disclosure).map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
              <div className="callout">
                <strong>证据边界</strong>
                <p>{model.limits}</p>
              </div>
            </div>
          </div>
          <div className="model-evidence">
            {model.sourceIds.map((id) => {
              const s = sources.find((s) => s.id === id);
              return s ? (
                <Link key={id} to={`/sources#${id}`}>
                  {s.type} · {s.title}
                  <ArrowUpRight size={11} />
                </Link>
              ) : null;
            })}
          </div>
        </section>
      )}
      <section className="reading-strategy">
        <h2>
          <GitBranch size={18} /> 从最新模型到可迁移能力
        </h2>
        <ol>
          <li>
            <strong>先定问题。</strong>它是在降低 KV 成本、扩大有效数据、稳定
            MoE，还是让长任务奖励更可信？
          </li>
          <li>
            <strong>再找技术转折。</strong>
            只回看解释变化所必需的前代；结构、数据、目标函数和系统实现分别比较。
          </li>
          <li>
            <strong>区分三种证据。</strong>
            报告说明作者做了什么；模型实现说明推理怎么算；训练源码才能直接展示怎么更新权重。三者不能相互替代。
          </li>
          <li>
            <strong>最后做迁移实验。</strong>
            在小规模条件下还原一个机制，写出生产规模下增加的显存、通信、环境和验证成本。
          </li>
        </ol>
        <Link className="text-link" to="/learn/frontier-reading">
          打开完整报告阅读方法 <ArrowRight size={14} />
        </Link>
      </section>
      <p className="lab-disclosure">
        这里是技术案例索引，不是能力排行榜。模型卡中的成绩属于发布方报告；本项目没有复训这些完整模型。版本与开放状态以本次核验的具体分支、许可和文件为准。
      </p>
    </div>
  );
}
