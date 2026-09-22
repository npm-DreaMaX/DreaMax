import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Clock,
  FlaskConical,
  GitCommitHorizontal,
} from "lucide-react";
import { articles, getTrack, sources } from "../data/catalog";
import { useLearning } from "../state";
import { Markdown } from "../components/Markdown";
export default function ArticlePage() {
  const { slug } = useParams();
  const article = articles.find((a) => a.slug === slug);
  const { progress, toggle, visit, note } = useLearning();
  const [toc, setToc] = useState<{ id: string; text: string }[]>([]);
  const [active, setActive] = useState("");
  const [readPercent, setReadPercent] = useState(0);
  const { hash } = useLocation();
  useEffect(() => {
    if (slug) visit(slug);
  }, [slug]);
  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} · LLM Fieldwork`;
    const nodes = [...document.querySelectorAll<HTMLElement>(".prose h2")];
    setToc(nodes.map((n) => ({ id: n.id, text: n.innerText })));
    const observer = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    nodes.forEach((n) => observer.observe(n));
    const scroll = () => {
      const el = document.querySelector(".article-body");
      if (el) {
        const r = el.getBoundingClientRect();
        setReadPercent(
          Math.min(
            100,
            Math.max(
              0,
              ((100 - r.top) /
                Math.max(1, r.height - window.innerHeight + 100)) *
                100,
            ),
          ),
        );
      }
    };
    window.addEventListener("scroll", scroll, { passive: true });
    scroll();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
    };
  }, [article]);
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  }, [hash, article]);
  if (!article)
    return (
      <div className="page empty-state">
        <h1>未找到这篇章节</h1>
        <Link to="/roadmap">查看完整学习路线</Link>
      </div>
    );
  const done = progress.completed.includes(article.slug);
  const index = articles.indexOf(article);
  const track = getTrack(article.track);
  return (
    <div className="article-layout page-enter">
      <div className="reading-progress" style={{ width: `${readPercent}%` }} />
      <article className="article-body">
        <div className="article-kicker">
          <Link to={`/roadmap#${track.id}`}>
            {track.number} / {track.en}
          </Link>
          <span>{article.difficulty}</span>
        </div>
        <h1>{article.title}</h1>
        <p className="article-subtitle">{article.subtitle}</p>
        <div className="article-meta">
          <span>
            <Clock size={13} />
            {article.minutes} 分钟阅读
          </span>
          <span>
            <GitCommitHorizontal size={15} />
            来源与版本可追溯
          </span>
          <button
            className={done ? "complete active" : "complete"}
            onClick={() => toggle(article.slug)}
          >
            <Check size={14} />
            {done ? "已完成阅读" : "标记已读"}
          </button>
        </div>
        <p className="article-description">{article.description}</p>
        <div className="learning-objectives">
          <span className="eyebrow">READ WITH A QUESTION</span>
          <h2>读完这一章，你应该能够</h2>
          <ul>
            {article.learningGoals.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          {article.prerequisites.length > 0 && (
            <div className="prerequisites">
              前置理解 <span>{article.prerequisites.join(" · ")}</span>
            </div>
          )}
        </div>
        <div className="mobile-toc">
          <details>
            <summary>本章目录 · {toc.length} 个小节</summary>
            {toc.map((t) => (
              <a href={`#${t.id}`} key={t.id}>
                {t.text}
              </a>
            ))}
          </details>
        </div>
        <div className="prose">
          <Markdown body={article.body} />
        </div>
        {article.lab && (
          <div className="article-lab">
            <FlaskConical size={27} />
            <div>
              <span className="eyebrow">MAKE IT RUN</span>
              <h3>把这一章放进实验里</h3>
              <p>调整变量，观察机制，再运行本地 Python 实验验证。</p>
            </div>
            <Link className="button primary" to={`/labs/${article.lab}`}>
              进入实验 <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <section className="article-references">
          <h2>本章证据与源码</h2>
          <p>引用代表相应来源支持的结论，不意味着公开了完整训练配方。</p>
          {article.sources.map((id) => {
            const s = sources.find((s) => s.id === id);
            return s ? (
              <Link to={`/sources#${id}`} key={id}>
                <span className="source-type">{s.evidence}</span>
                <span>
                  {s.title}
                  <small>
                    {s.organization}
                    {s.version ? ` · ${s.version.slice(0, 12)}` : ""}
                  </small>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            ) : null;
          })}
        </section>
        <section className="notes-box">
          <h2>
            <Bookmark size={18} />
            留下你的工程判断
          </h2>
          <p>
            记录一个还没有解释清楚的现象，或下一次实验要控制的变量。笔记仅保存在当前浏览器。
          </p>
          <textarea
            aria-label="本章学习笔记"
            placeholder="我的假设是……可以通过……实验验证。"
            value={progress.notes[article.slug] || ""}
            onChange={(e) => note(article.slug, e.target.value)}
          />
          <span className="notes-saved">
            自动保存在本机 · 可在“我的学习笔记”导出
          </span>
        </section>
        <div className="chapter-end">
          <button
            className={`button ${done ? "secondary" : "primary"}`}
            onClick={() => toggle(article.slug)}
          >
            <Check size={15} />
            {done ? "已完成 · 点击撤销" : "完成这一章"}
          </button>
          <span>理解机制，比记住结论更重要。</span>
        </div>
        <nav className="article-pagination" aria-label="相邻章节">
          {articles[index - 1] ? (
            <Link to={`/learn/${articles[index - 1].slug}`}>
              <small>
                <ArrowLeft size={12} />
                上一章
              </small>
              {articles[index - 1].title}
            </Link>
          ) : (
            <span />
          )}
          {articles[index + 1] && (
            <Link to={`/learn/${articles[index + 1].slug}`}>
              <small>
                下一章
                <ArrowRight size={12} />
              </small>
              {articles[index + 1].title}
            </Link>
          )}
        </nav>
      </article>
      <aside className="article-toc">
        <span className="eyebrow">ON THIS PAGE</span>
        <div className="toc-line">
          {toc.map((t) => (
            <a
              className={active === t.id ? "active" : ""}
              href={`#${t.id}`}
              key={t.id}
            >
              {t.text}
            </a>
          ))}
        </div>
        <div className="toc-note">
          <BracesIcon />
          <strong>沿着证据阅读</strong>
          <p>
            公式 → 数据结构
            <br />
            调用链 → 系统行为
          </p>
          <Link to="/sources">打开源码索引 ↗</Link>
        </div>
      </aside>
    </div>
  );
}
function BracesIcon() {
  return <span className="braces-icon">{"{ }"}</span>;
}
