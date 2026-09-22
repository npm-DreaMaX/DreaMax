import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search, Check } from "lucide-react";
import { papers, paths, searchPapers } from "../data/readings";
import { useLearning } from "../state";
const order = [
  "mimo-v26",
  "deepseek-v41",
  "kimi-k3",
  "qwen38",
  "glm5",
  "deepseek-v3",
  "qwen3",
  "kimi-k2",
  "deepseek-r1",
  "deepseek-math",
  "dpo",
  "process-supervision",
  "instructgpt",
  "flashattention",
  "chinchilla",
];
export default function PaperLibrary() {
  const [stage, setStage] = useState("all");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const { progress } = useLearning();
  const found = (query.trim() ? searchPapers(query) : papers)
    .filter(
      (p) =>
        (stage === "all" || p.stages.includes(stage as never)) &&
        (kind === "all" || p.kind === kind),
    )
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return (
    <div className="library-page editorial-width">
      <div className="page-intro">
        <span className="micro-label">THE READING COLLECTION</span>
        <h1>
          值得读，
          <br />
          <span>也值得读透。</span>
        </h1>
        <p>
          前沿报告与关键范式论文，在这里连成一条路。
          <br />
          保留原图、证据与实验条件，把注意力放在真正改变的方法上。
        </p>
      </div>
      <div className="library-controls">
        <div
          className="library-stages"
          role="group"
          aria-label="按训练阶段筛选"
        >
          <button
            aria-pressed={stage === "all"}
            onClick={() => setStage("all")}
          >
            全部阶段
          </button>
          {paths.map((p) => (
            <button
              key={p.id}
              aria-pressed={stage === p.id}
              onClick={() => setStage(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="library-filter-row">
          <div className="kind-filter">
            {[
              ["all", "全部论文"],
              ["frontier", "前沿报告"],
              ["bridge", "关键承接"],
              ["foundation", "范式原点"],
            ].map(([id, name]) => (
              <button
                key={id}
                aria-pressed={kind === id}
                onClick={() => setKind(id)}
              >
                {name}
              </button>
            ))}
          </div>
          <label className="library-search">
            <Search size={17} />
            <input
              aria-label="筛选论文"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="模型、方法或正文关键词"
            />
          </label>
        </div>
      </div>
      <div className="library-count">
        <span>{String(found.length).padStart(2, "0")} PAPERS</span>
        <span>按阅读价值精选 · 资料查阅 2026.09.22</span>
      </div>
      <div className="paper-list">
        {found.map((p) => (
          <Link key={p.id} className="paper-list-row" to={`/papers/${p.id}`}>
            <span className="paper-list-year">
              {p.year}
              <small>
                {p.kind === "frontier"
                  ? "FRONTIER"
                  : p.kind === "bridge"
                    ? "CONNECTION"
                    : "FOUNDATION"}
              </small>
            </span>
            <div className="paper-list-title">
              <h2>
                {p.title}
                {progress.completed.includes("paper:" + p.id) && (
                  <Check size={19} aria-label="已读" />
                )}
              </h2>
              <p>{p.subtitle}</p>
              <div>
                {p.tags.slice(0, 3).map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
            <p className="paper-list-why">{p.why}</p>
            <ArrowUpRight className="paper-list-arrow" size={23} />
          </Link>
        ))}
        {!found.length && (
          <div className="paper-empty">
            没有匹配的论文。
            <button
              onClick={() => {
                setStage("all");
                setKind("all");
                setQuery("");
              }}
            >
              清除筛选
            </button>
          </div>
        )}
      </div>
      <div className="selection-note">
        <h3>为什么不只读最新的？</h3>
        <p>
          新报告通常默认你已经了解旧方法。这里保留 DeepSeek-V3、Qwen3、Kimi K2
          等关键承接，再用 Chinchilla、DPO、GRPO 和 FlashAttention
          补齐范式的来路。GLM 选用披露充分的 GLM-5
          报告，不将它的训练细节自动外推给更新版本。
        </p>
        <Link to="/paths/pretraining" className="text-action">
          按问题选择阅读顺序 <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
