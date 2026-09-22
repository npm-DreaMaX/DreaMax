import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  BookOpen,
  Maximize2,
  X,
  ListFilter,
  FlaskConical,
} from "lucide-react";
import {
  papers,
  paperById,
  figures,
  paths,
  type Paper,
} from "../data/readings";
import { sources } from "../data/catalog";
import { Markdown } from "../components/Markdown";
import { useLearning } from "../state";
import manifests from "../../research/papers/manifest.json";

function OriginalFigure({
  id,
  title,
  notes,
}: {
  id: string;
  title: string;
  notes: string[];
}) {
  const f = figures.find((f) => f.id === id)!;
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <figure className="original-figure">
      <div className="figure-title">
        <span>
          {f.label.toUpperCase()} / PDF P.{f.page}
        </span>
        <span>论文原图</span>
      </div>
      <button
        className="figure-open"
        onClick={() => dialog.current?.showModal()}
        aria-label={`放大原图：${title}`}
      >
        <img
          src={f.src}
          width={f.width}
          height={f.height}
          loading="lazy"
          alt={title}
        />
        <span>
          <Maximize2 size={16} /> 放大查看
        </span>
      </button>
      <figcaption>
        <strong>{title}</strong>
        <a href={f.url} target="_blank" rel="noreferrer">
          原文第 {f.page} 页 <ArrowUpRight size={13} />
        </a>
      </figcaption>
      <div className="figure-reading">
        <span className="micro-label">HOW TO READ THIS FIGURE</span>
        {notes.map((n, i) => (
          <p key={n}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {n}
          </p>
        ))}
      </div>
      <p className="figure-attribution">{f.attribution}</p>
      <dialog
        ref={dialog}
        className="figure-dialog"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div>
          <header>
            <span>
              {title} · {f.label}
            </span>
            <button
              aria-label="关闭原图"
              onClick={() => dialog.current?.close()}
            >
              <X />
            </button>
          </header>
          <div className="figure-zoom-scroll">
            <img src={f.src} alt={title} />
          </div>
          <p>
            可滚动查看原图 ·{" "}
            <a href={f.url} target="_blank" rel="noreferrer">
              打开论文对应页 ↗
            </a>
          </p>
        </div>
      </dialog>
    </figure>
  );
}
export default function PaperReader() {
  const { id } = useParams();
  const p = paperById(id || "");
  return p ? (
    <Reading key={p.id} paper={p} />
  ) : (
    <div className="paper-empty editorial-width">
      <h1>没有找到这篇论文</h1>
      <Link to="/papers">返回论文库</Link>
    </div>
  );
}
function Reading({ paper: p }: { paper: Paper }) {
  const [focus, setFocus] = useState(false);
  const [active, setActive] = useState(p.sections[0].id);
  const [percent, setPercent] = useState(0);
  const { progress, toggle, visit, note } = useLearning();
  const { hash } = useLocation();
  const key = "paper:" + p.id;
  const source = sources.find((s) => s.id === p.sourceId)!;
  const manifest = manifests.find((m) => m.id === p.id)!;
  const pdf = manifest.url
    .replace("github.com/", "raw.githubusercontent.com/")
    .replace("/blob/", "");
  const sections = focus ? p.sections.filter((s) => s.essential) : p.sections;
  useEffect(() => {
    visit(key);
    document.title = `${p.title} · 论文精读 · Fieldwork`;
  }, [key]);
  useEffect(() => {
    if (hash) {
      setFocus(false);
      setTimeout(
        () =>
          document
            .getElementById(decodeURIComponent(hash.slice(1)))
            ?.scrollIntoView(),
        150,
      );
    }
  }, [hash]);
  useEffect(() => {
    const scroll = () => {
      const root = document.querySelector<HTMLElement>(".paper-sections");
      if (!root) return;
      const r = root.getBoundingClientRect();
      setPercent(
        Math.max(
          0,
          Math.min(
            100,
            ((-r.top + 160) / Math.max(1, r.height - innerHeight + 180)) * 100,
          ),
        ),
      );
      const nodes = [...root.querySelectorAll<HTMLElement>(".paper-section")];
      let current = nodes[0]?.id;
      for (const n of nodes)
        if (n.getBoundingClientRect().top < 230) current = n.id;
      if (current) setActive(current);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    scroll();
    return () => window.removeEventListener("scroll", scroll);
  }, [focus]);
  const cover = figures.find((f) => f.id === p.cover)!;
  return (
    <article className="paper-reader">
      <div className="paper-top editorial-width">
        <Link to="/papers">论文精读</Link>
        <span>/</span>
        <span>{p.organization}</span>
      </div>
      <header className="paper-header">
        <span className="micro-label">
          {p.kind === "frontier"
            ? "FRONTIER REPORT"
            : p.kind === "bridge"
              ? "THE CONNECTION"
              : "PARADIGM PAPER"}{" "}
          · {p.year}
        </span>
        <h1>{p.title}</h1>
        <p className="paper-subtitle">{p.subtitle}</p>
        <div className="paper-stages">
          {p.stages.map((stage) => (
            <Link key={stage} to={`/paths/${stage}`}>
              {paths.find((s) => s.id === stage)?.name}
            </Link>
          ))}
        </div>
        <div className="paper-header-actions">
          <a
            className="pill-button dark-pill"
            href={pdf}
            target="_blank"
            rel="noreferrer"
          >
            阅读原始报告 <ArrowUpRight size={16} />
          </a>
          <button
            className={`pill-button ${progress.completed.includes(key) ? "is-complete" : ""}`}
            onClick={() => toggle(key)}
          >
            <Check size={16} />
            {progress.completed.includes(key) ? "已完成阅读" : "标记已读"}
          </button>
          <span>{p.minutes} 分钟精读</span>
        </div>
      </header>
      <div className="paper-hero-figure editorial-width">
        <img
          src={cover.src}
          alt={`${p.title} ${cover.label} 论文原图`}
          width={cover.width}
          height={cover.height}
        />
        <span>
          {p.organization} / {cover.label} / PDF P.{cover.page} · 下文逐图讲解
        </span>
      </div>
      <section className="paper-opening">
        <span className="micro-label">BEFORE YOU READ</span>
        <h2>{p.question}</h2>
        <p>{p.why}</p>
        <div className="paper-evidence-key">
          <span>
            <i />
            报告陈述：有原文页码
          </span>
          <span>
            <i />
            综合分析：在正文中明示
          </span>
        </div>
        <details className="paper-publication">
          <summary>
            原始论文与资料范围 <ArrowUpRight size={14} />
          </summary>
          <p>{source.title}</p>
          <p>
            {source.organization} · 发布 {source.published} · 查阅{" "}
            {source.accessed}
          </p>
          <p>{source.notes || source.evidence}</p>
          <p>
            本文选读 {manifest.pages}{" "}
            页报告中的关键部分；中文说明是本站解读，原图来自对应报告。开放权重、推理代码与完整训练配方是不同的披露范围。
          </p>
          <Link to={`/sources#${p.sourceId}`}>查看来源、版本与许可记录 ↗</Link>
        </details>
      </section>
      <nav className="paper-section-nav" aria-label="本篇精读章节">
        <div>
          <div className="section-nav-links">
            {sections.map((s, i) => (
              <a
                key={s.id}
                className={active === s.id ? "active" : ""}
                href={`#${s.id}`}
                onClick={() => setActive(s.id)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {s.title.split("：")[0]}
              </a>
            ))}
          </div>
          <button
            aria-pressed={focus}
            className={focus ? "focus-on" : ""}
            onClick={() => setFocus(!focus)}
          >
            <ListFilter size={16} />
            {focus ? "显示全文" : "只看重点"}
          </button>
        </div>
        <span
          className="paper-scroll-progress"
          style={{ width: percent + "%" }}
        />
      </nav>
      <div className="paper-sections">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="paper-section">
            <div className="paper-editorial-section-heading">
              <span className="micro-label">
                {String(i + 1).padStart(2, "0")} /{" "}
                {paths.find((t) => t.id === s.stage)?.en}{" "}
                {s.essential && <b>重点</b>}
              </span>
              <h2>{s.title}</h2>
              <a
                href={`${pdf}#page=${s.locator.match(/p\.(\d+)/)?.[1] || 1}`}
                target="_blank"
                rel="noreferrer"
                className="source-locator"
              >
                <BookOpen size={14} />
                {s.locator}
                <ArrowUpRight size={13} />
              </a>
            </div>
            <div className="paper-prose prose">
              <Markdown body={s.body} />
            </div>
            {s.figures?.map((f) => (
              <OriginalFigure key={f.id} {...f} />
            ))}
            <div className="section-source">
              <span>原文依据</span>
              <a
                href={`${pdf}#page=${s.locator.match(/p\.(\d+)/)?.[1] || 1}`}
                target="_blank"
                rel="noreferrer"
              >
                {p.title} · {s.locator} ↗
              </a>
            </div>
          </section>
        ))}
      </div>
      {focus && p.sections.some((s) => !s.essential) && (
        <div className="focus-end">
          <p>
            已收起 {p.sections.filter((s) => !s.essential).length} 段延伸阅读。
          </p>
          <button className="pill-button" onClick={() => setFocus(false)}>
            展开完整精读 <ArrowRight size={15} />
          </button>
        </div>
      )}
      <section className="paper-reflection">
        <div className="paper-reflection-inner">
          <span className="micro-label">MAKE IT YOUR OWN</span>
          <h2>
            合上论文后，
            <br />
            留下这几件事。
          </h2>
          <ol>
            {p.takeaways.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <div className="paper-lab-links">
            <Link to={`/labs/${p.lab}`}>
              <FlaskConical size={20} />
              <div>
                <strong>把直觉放进实验</strong>
                <span>可交互、可运行的教学实现</span>
              </div>
              <ArrowUpRight size={20} />
            </Link>
            <Link to={`/learn/${p.codeChapter}`}>
              <BookOpen size={20} />
              <div>
                <strong>需要时，再看源码</strong>
                <span>已核验的关键路径与工程补充</span>
              </div>
              <ArrowUpRight size={20} />
            </Link>
          </div>
          <label htmlFor="paper-note">用自己的话，写下一个改变了的理解。</label>
          <textarea
            id="paper-note"
            aria-label="本篇论文笔记"
            placeholder="作者改变了什么？哪组实验最有说服力？还有什么没被证明？"
            value={progress.notes[key] || ""}
            onChange={(e) => note(key, e.target.value)}
          />
          <div className="note-status">
            <span>自动保存在当前浏览器，可在“我的阅读”中导出。</span>
            <button onClick={() => toggle(key)}>
              <Check size={15} />
              {progress.completed.includes(key) ? "已完成阅读" : "标记已读"}
            </button>
          </div>
        </div>
      </section>
      <section className="paper-connections editorial-width">
        <div className="editorial-section-heading">
          <div>
            <span className="micro-label">ONE PAPER LEADS TO ANOTHER</span>
            <h2>接下来，为什么读它？</h2>
          </div>
          <Link to="/papers" className="text-action">
            全部论文 <ArrowUpRight size={17} />
          </Link>
        </div>
        <div>
          {p.connections.map((c) => {
            const next = papers.find((n) => n.id === c.id)!;
            return (
              <Link to={`/papers/${c.id}`} key={c.id}>
                <span className="micro-label">
                  {next.organization} / {next.year}
                </span>
                <h3>
                  {next.title}
                  <ArrowUpRight size={24} />
                </h3>
                <p>{c.reason}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </article>
  );
}
