import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Braces,
  ChevronDown,
  GitCommitHorizontal,
  Search,
} from "lucide-react";
import { articles, sources } from "../data/catalog";
import { papers } from "../data/readings";
import paperManifests from "../../research/papers/manifest.json";
import { Markdown } from "../components/Markdown";
export default function Sources() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("全部");
  const { hash } = useLocation();
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      setQuery("");
      setType("全部");
      setExpanded((e) => (e.includes(id) ? e : [...e, id]));
      setTimeout(
        () =>
          document
            .getElementById(id)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100,
      );
    }
  }, [hash]);
  const types = ["全部", "官方源码", "技术报告", "论文", "官方文档", "模型卡"];
  const shown = sources.filter(
    (s) =>
      (type === "全部" || s.type === type) &&
      `${s.title} ${s.organization} ${s.file || ""} ${s.symbol || ""} ${s.supports.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="page source-page page-enter">
      <div className="page-kicker">
        <span className="eyebrow">THE EVIDENCE REGISTER</span>
        <span className="edition-tag">核验日期 · 2026.09.22</span>
      </div>
      <h1>每个结论，都有来处。</h1>
      <p className="page-lead">
        从论述追到论文，从算法追到函数。固定源码版本，保留信息边界。
      </p>
      <div className="source-principles">
        <div>
          <span className="evidence-badge">官方事实</span>
          <p>官方文档与报告明确陈述</p>
        </div>
        <div>
          <span className="evidence-badge blue">源码观察</span>
          <p>仅对指定版本中的实现负责</p>
        </div>
        <div>
          <span className="evidence-badge amber">论文实验</span>
          <p>结论受实验条件与预算约束</p>
        </div>
        <div>
          <span className="evidence-badge muted">课程分析</span>
          <p>综合推理，明确区分未公开信息</p>
        </div>
      </div>
      <div className="source-filters">
        <div className="filter-tabs">
          {types.map((t) => (
            <button
              onClick={() => setType(t)}
              className={t === type ? "active" : ""}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="inline-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="筛选仓库、函数或主题"
            aria-label="筛选来源"
          />
        </label>
      </div>
      <div className="source-count">
        {shown.length} 项可追溯来源 <span>Open weight ≠ 完整训练过程开源</span>
      </div>
      <div className="source-register">
        {shown.map((s, i) => {
          const opened = expanded.includes(s.id);
          return (
            <section
              id={s.id}
              className={`source-record ${hash === `#${s.id}` ? "is-target" : ""}`}
              key={s.id}
            >
              <button
                className="source-record-header"
                onClick={() =>
                  setExpanded((e) =>
                    opened ? e.filter((x) => x !== s.id) : [...e, s.id],
                  )
                }
                aria-expanded={opened}
              >
                <span className="source-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="source-type">
                    {s.type} · {s.evidence}
                  </span>
                  <h2>{s.title}</h2>
                  <p>
                    {s.organization}
                    {s.version && (
                      <>
                        <GitCommitHorizontal size={13} />
                        <code>{s.version.slice(0, 12)}</code>
                      </>
                    )}
                  </p>
                </div>
                <ChevronDown className={opened ? "rotated" : ""} size={18} />
              </button>
              <ul className="source-supports">
                {s.supports.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              {opened && (
                <div className="source-detail">
                  <dl>
                    <div>
                      <dt>发布日期</dt>
                      <dd>{s.published}</dd>
                    </div>
                    <div>
                      <dt>查阅日期</dt>
                      <dd>{s.accessed}</dd>
                    </div>
                    <div>
                      <dt>License</dt>
                      <dd>{s.license}</dd>
                    </div>
                    {s.version && (
                      <div className="wide">
                        <dt>Version / Commit</dt>
                        <dd>
                          <code>{s.version}</code>
                        </dd>
                      </div>
                    )}
                    {s.file && (
                      <div className="wide">
                        <dt>File / Symbol</dt>
                        <dd>
                          <code>{s.file}</code>
                          <br />
                          <strong>{s.symbol}</strong>
                        </dd>
                      </div>
                    )}
                  </dl>
                  {s.callChain && (
                    <div>
                      <h3>调用链</h3>
                      <p>{s.callChain}</p>
                    </div>
                  )}
                  {s.inputOutput && (
                    <div>
                      <h3>输入与输出</h3>
                      <p>{s.inputOutput}</p>
                    </div>
                  )}
                  {s.excerpt && (
                    <>
                      <h3>
                        <Braces size={16} />
                        固定版本源码摘录{" "}
                        {s.excerptStart ? `· L${s.excerptStart}` : ""}
                      </h3>
                      <Markdown body={"```python\n" + s.excerpt + "\n```"} />
                      <p className="source-license">
                        摘录版权归原作者 · {s.license} · 以固定链接完整文件为准
                      </p>
                    </>
                  )}
                  {s.notes && (
                    <div className="callout">
                      <strong>阅读边界</strong>
                      <p>{s.notes}</p>
                    </div>
                  )}
                  <div className="source-links">
                    <a
                      className="button primary"
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开原始来源 <ArrowUpRight size={14} />
                    </a>
                    {s.repository && (
                      <a href={s.repository} target="_blank" rel="noreferrer">
                        官方仓库 ↗
                      </a>
                    )}
                  </div>
                  <div className="source-used">
                    论文精读
                    {papers
                      .filter((p) => p.sourceId === s.id)
                      .map((p) => (
                        <Link key={p.id} to={`/papers/${p.id}`}>
                          {p.title} · 原图与逐段解读 ↗
                        </Link>
                      ))}
                  </div>
                  {paperManifests
                    .filter((p) => p.sourceId === s.id)
                    .map((p) => (
                      <div className="source-paper-snapshot" key={p.id}>
                        <span>
                          精读 PDF 快照 · {p.pages} 页 · {p.accessed}
                        </span>
                        <code>SHA-256: {p.sha256}</code>
                      </div>
                    ))}
                  <div className="source-used">
                    引用章节
                    {articles
                      .filter((a) => a.sources.includes(s.id))
                      .map((a) => (
                        <Link key={a.slug} to={`/learn/${a.slug}`}>
                          {a.title} ↗
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
        {shown.length === 0 && (
          <div className="empty-state">没有匹配的来源，请调整筛选条件。</div>
        )}
      </div>
    </div>
  );
}
