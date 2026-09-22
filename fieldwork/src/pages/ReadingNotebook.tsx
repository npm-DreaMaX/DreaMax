import { Link } from "react-router-dom";
import { ArrowUpRight, Download, Check } from "lucide-react";
import { papers } from "../data/readings";
import { articles } from "../data/catalog";
import { useLearning } from "../state";
export default function ReadingNotebook() {
  const { progress } = useLearning();
  const readings = papers.filter(
    (p) =>
      progress.completed.includes("paper:" + p.id) ||
      progress.notes["paper:" + p.id] ||
      progress.lastRead === "paper:" + p.id,
  );
  const oldNotes = articles.filter((p) => progress.notes[p.slug]);
  const exportNotes = () => {
    const content =
      "# Fieldwork 阅读记录\n\n" +
      readings
        .map(
          (p) =>
            `## ${p.title}${progress.completed.includes("paper:" + p.id) ? " · 已读" : ""}\n\n${progress.notes["paper:" + p.id] || "尚无笔记"}\n`,
        )
        .join("\n") +
      oldNotes
        .map((p) => `## ${p.title}\n\n${progress.notes[p.slug]}\n`)
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "fieldwork-notes.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="notebook-page editorial-width">
      <div className="page-intro">
        <span className="micro-label">YOUR READING, YOUR THINKING</span>
        <h1>
          读过的，
          <br />
          <span>慢慢成为自己的。</span>
        </h1>
        <p>
          阅读进度和笔记保存在当前浏览器。
          <br />
          把重要的理解导出，留给下一个问题。
        </p>
        <button className="pill-button dark-pill" onClick={exportNotes}>
          <Download size={16} />
          导出学习记录
        </button>
      </div>
      <div className="notebook-summary">
        <strong>
          {
            papers.filter((p) => progress.completed.includes("paper:" + p.id))
              .length
          }
          <span> / {papers.length}</span>
        </strong>
        <span>篇论文已完成阅读</span>
      </div>
      <div className="notebook-entries">
        {readings.map((p) => (
          <article key={p.id}>
            <Link to={`/papers/${p.id}`}>
              <span>{p.organization}</span>
              <h2>
                {p.title}
                <ArrowUpRight size={22} />
              </h2>
            </Link>
            {progress.completed.includes("paper:" + p.id) && (
              <span className="notebook-done">
                <Check size={14} />
                已读
              </span>
            )}
            <p className="saved-note">
              {progress.notes["paper:" + p.id] ||
                "还没有笔记。重新打开精读，记下一个你自己的问题。"}
            </p>
          </article>
        ))}
        {oldNotes.map((p) => (
          <article key={p.slug}>
            <Link to={`/learn/${p.slug}`}>
              <h2>
                {p.title}
                <ArrowUpRight size={22} />
              </h2>
            </Link>
            <p className="saved-note">{progress.notes[p.slug]}</p>
          </article>
        ))}
        {!readings.length && !oldNotes.length && (
          <div className="notebook-empty">
            <BookSymbol />
            <h2>从一篇好论文开始。</h2>
            <p>你读过的论文和写下的笔记，会在这里相遇。</p>
            <Link to="/papers" className="text-action">
              选择第一篇 <ArrowUpRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
function BookSymbol() {
  return (
    <span className="notebook-symbol" aria-hidden="true">
      ↗
    </span>
  );
}
