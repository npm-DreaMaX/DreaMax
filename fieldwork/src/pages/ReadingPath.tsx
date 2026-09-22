import { Link, useParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { paths, paperById } from "../data/readings";
import { useLearning } from "../state";
import TrainingTimeline from "../components/TrainingTimeline";
export default function ReadingPath() {
  const { stage } = useParams();
  const path = paths.find((p) => p.id === stage) || paths[0];
  const { progress } = useLearning();
  return (
    <div className="reading-path-page">
      <nav
        className="stage-navigation editorial-width"
        aria-label="阅读路线阶段"
      >
        {paths.map((p) => (
          <Link
            key={p.id}
            className={p.id === path.id ? "active" : ""}
            to={`/paths/${p.id}`}
          >
            <span>{p.index}</span>
            {p.name}
          </Link>
        ))}
      </nav>
      <section className="path-page-intro editorial-width">
        <span className="micro-label">
          READING PATH {path.index} / {path.en}
        </span>
        <h1>{path.headline}</h1>
        <p>{path.intro}</p>
        <div className="path-question">
          <span>带着这个问题读</span>
          <strong>{path.question}</strong>
        </div>
      </section>
      {(path.id === "pretraining" || path.id === "midtraining") && (
        <TrainingTimeline />
      )}
      <div className="path-sequence editorial-width">
        <div className="sequence-heading">
          <span>THE READING ORDER</span>
          <span>{path.items.length} 篇 · 同一问题，不同解法</span>
        </div>
        {path.items.map((item, i) => {
          const p = paperById(item.id)!;
          return (
            <article className="sequence-item" key={item.id}>
              <span className="sequence-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="sequence-title">
                <span>{item.shift}</span>
                <h2>{p.title}</h2>
                <p>
                  {p.organization} / {p.year}
                </p>
                {progress.completed.includes("paper:" + p.id) && (
                  <span className="sequence-done">
                    <Check size={14} />
                    已完成阅读
                  </span>
                )}
              </div>
              <div className="sequence-focus">
                <h3>{item.focus}</h3>
                <p>{p.why}</p>
                <div>
                  <Link
                    to={`/papers/${p.id}#${item.section}`}
                    className="text-action"
                  >
                    读本阶段重点 <ArrowRight size={17} />
                  </Link>
                  <Link to={`/papers/${p.id}`} className="subtle-link">
                    从头精读 <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="path-next editorial-width">
        <span className="micro-label">CONTINUE EXPLORING</span>
        <h2>
          方法会迭代，
          <br />
          判断的方法会留下。
        </h2>
        <p>读完一篇，试着写下：作者改变了什么，固定了什么，证据支持到哪里。</p>
        <Link
          className="pill-button dark-pill"
          to={`/paths/${paths[(paths.indexOf(path) + 1) % paths.length].id}`}
        >
          下一条路线：{paths[(paths.indexOf(path) + 1) % paths.length].name}
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
