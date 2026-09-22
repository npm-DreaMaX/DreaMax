import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import timelines from "../data/training-timelines.json";
export default function TrainingTimeline() {
  const [model, setModel] = useState(0);
  const [phase, setPhase] = useState(1);
  const recipe = timelines[model];
  const selected = recipe.phases[phase];
  return (
    <section className="timeline-comparison editorial-width">
      <div className="timeline-heading">
        <span className="micro-label">READ THE RECIPE, STAGE BY STAGE</span>
        <h2>
          把阶段拆开，
          <br />
          变化就看得见了。
        </h2>
        <p>
          选择一份报告，再点一个阶段。对照数据、长度和优化设置，找出变化发生在哪里。
        </p>
      </div>
      <div
        className="timeline-models"
        role="group"
        aria-label="选择要比较的训练配方"
      >
        {timelines.map((t, i) => (
          <button
            key={t.id}
            aria-pressed={model === i}
            onClick={() => {
              setModel(i);
              setPhase(0);
            }}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="timeline-phases" role="group" aria-label="训练阶段">
        {recipe.phases.map((s, i) => (
          <button
            key={s.name}
            aria-pressed={phase === i}
            onClick={() => setPhase(i)}
          >
            <span>
              0{i + 1} <ChevronRight size={13} />
            </span>
            <strong>{s.name}</strong>
            <p>{s.tokens}</p>
          </button>
        ))}
      </div>
      <div className="timeline-detail">
        <div className="timeline-detail-key">
          <span className="micro-label">CONTEXT / OBJECTIVE</span>
          <strong>{selected.context}</strong>
          <p>{selected.objective}</p>
        </div>
        <div>
          <dl>
            <div>
              <dt>训练数据</dt>
              <dd>{selected.data}</dd>
            </div>
            <div>
              <dt>优化与切换</dt>
              <dd>{selected.optimization}</dd>
            </div>
          </dl>
          <p className="timeline-emphasis">{selected.read}</p>
        </div>
      </div>
      <div className="timeline-insight">
        <p>{recipe.insight}</p>
        <Link to={`/papers/${recipe.id}#${recipe.section}`}>
          {recipe.locator}
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <span className="timeline-scale">
        阶段顺序示意 · 宽度不表示 token 数或计算量
      </span>
    </section>
  );
}
