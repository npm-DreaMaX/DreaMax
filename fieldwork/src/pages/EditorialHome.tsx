import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, ChevronRight, MoveDown } from "lucide-react";
import FieldVisual from "../components/FieldVisual";
import { papers, paths, paperById, figures } from "../data/readings";
import { useLearning } from "../state";

export default function EditorialHome() {
  const [selected, setSelected] = useState(3);
  const { progress } = useLearning();
  const path = paths[selected];
  const last = paperById(progress.lastRead.replace("paper:", ""));
  return (
    <div className="editorial-home">
      <section className="editorial-intro editorial-width">
        <div className="intro-kicker">
          <span className="live-dot" /> A READING SPACE FOR FRONTIER AI{" "}
          <span>VOL. 01 / 2026</span>
        </div>
        <div className="intro-heading">
          <h1>
            把前沿论文，
            <br />
            读成自己的能力<span className="title-period">。</span>
          </h1>
          <div>
            <p>
              从一张图、一组实验，
              <br />
              走进大模型训练的真实现场。
            </p>
            <a href="#reading-path" className="text-action">
              找到你的阅读起点 <MoveDown size={17} />
            </a>
          </div>
        </div>
      </section>
      <section
        className="field-feature editorial-width"
        aria-label="训练阶段交互导航"
      >
        <FieldVisual phase={selected} />
        <div className="field-top">
          <span>
            THE IDEAS BEHIND
            <br />
            THE INTELLIGENCE.
          </span>
          <span>
            01—05
            <br />
            EXPLORE THE PIPELINE
          </span>
        </div>
        <div className="field-caption">
          <div>
            <span className="micro-label">{path.index} / IN FOCUS</span>
            <h2>{path.en}</h2>
            <p>{path.question}</p>
          </div>
          <Link
            to={`/paths/${path.id}`}
            className="round-link"
            aria-label={`探索${path.name}阅读路线`}
          >
            <ArrowUpRight size={27} />
          </Link>
        </div>
        <div
          className="field-stage-switch"
          role="tablist"
          aria-label="探索训练阶段"
        >
          {paths.map((p, i) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={selected === i}
              onClick={() => setSelected(i)}
            >
              <span>{p.index}</span>
              {p.name}
            </button>
          ))}
        </div>
      </section>
      <div className="home-meta editorial-width">
        <span>
          精选 {papers.length} 篇原始论文 · {figures.length} 幅原图逐图解读
        </span>
        <span>DeepSeek / Kimi / Qwen / GLM / MiMo / OpenAI / DeepMind</span>
      </div>
      <section className="latest-section editorial-width">
        <div className="editorial-section-heading">
          <div>
            <span className="micro-label">THE CURRENT FRONTIER</span>
            <h2>正在发生的变化。</h2>
          </div>
          <Link to="/papers" className="text-action">
            全部论文 <ArrowUpRight size={18} />
          </Link>
        </div>
        <Link to="/papers/mimo-v26" className="lead-story">
          <div className="lead-story-copy">
            <div className="story-label">
              旗舰精读 <span>SEPTEMBER 2026</span>
            </div>
            <h3>MiMo-V2.6</h3>
            <p className="lead-story-deck">
              真正值得放大的，
              <br />
              不只是模型。
            </p>
            <p>
              从中训练到长轨迹
              RL。沿着成本、环境和评分三条线，读懂一场大规模后训练实验。
            </p>
            <span className="pill-button">
              进入精读 <ArrowUpRight size={17} />
            </span>
          </div>
          <div className="lead-story-visual">
            <img
              src="/figures/mimo-grader.webp"
              alt="MiMo-V2.6 报告原图：GRS 与 GAR 的两条训练监督路径"
              loading="lazy"
            />
            <span>ORIGINAL FIGURE 7 / GROUPWISE AGENTIC GRADING</span>
          </div>
        </Link>
        <div className="frontier-stories">
          {["deepseek-v41", "kimi-k3", "qwen38"].map((id, i) => {
            const p = paperById(id)!;
            const f = figures.find((f) => f.id === p.cover)!;
            return (
              <Link key={id} to={`/papers/${id}`} className="frontier-story">
                <div className={`story-image story-image-${i}`}>
                  <img
                    src={f.src}
                    alt={`${p.title} 报告架构原图`}
                    loading="lazy"
                  />
                  <ArrowUpRight />
                </div>
                <span className="micro-label">
                  {p.organization} / {p.year}
                </span>
                <h3>{p.title}</h3>
                <p>{p.subtitle}</p>
              </Link>
            );
          })}
        </div>
      </section>
      <section id="reading-path" className="path-explorer">
        <div className="editorial-width">
          <div className="editorial-section-heading">
            <div>
              <span className="micro-label">FOLLOW THE IDEAS</span>
              <h2>先懂来路，再看前沿。</h2>
            </div>
            <p>
              不用从第一代读到最后一代。
              <br />
              沿一个问题，读它真正改变的地方。
            </p>
          </div>
          <div
            className="path-tabs"
            role="tablist"
            aria-label="按训练阶段选择论文"
          >
            {paths.map((p, i) => (
              <button
                role="tab"
                aria-selected={i === selected}
                key={p.id}
                onClick={() => setSelected(i)}
              >
                <span>{p.index}</span>
                {p.name}
              </button>
            ))}
          </div>
          <div className="path-explorer-body" key={path.id}>
            <div className="path-explorer-intro">
              <span className="micro-label">{path.en}</span>
              <h3>{path.headline}</h3>
              <p>{path.intro}</p>
              <Link to={`/paths/${path.id}`} className="pill-button dark-pill">
                沿这条路线阅读 <ArrowRight size={17} />
              </Link>
            </div>
            <div className="path-preview-list">
              {path.items.slice(0, 4).map((item, i) => (
                <Link key={item.id} to={`/papers/${item.id}#${item.section}`}>
                  <span className="path-step">0{i + 1}</span>
                  <div>
                    <span>{item.shift}</span>
                    <strong>{paperById(item.id)?.title}</strong>
                    <p>{item.focus}</p>
                  </div>
                  <ArrowUpRight size={20} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="reading-invitation editorial-width">
        <span className="micro-label">LESS SKIMMING. MORE UNDERSTANDING.</span>
        <h2>
          不止看见一个结论。
          <br />
          <span>看懂它如何成立。</span>
        </h2>
        <div className="reading-promises">
          <div>
            <span>01</span>
            <h3>带着原图读</h3>
            <p>放大论文原图，逐项理解坐标、对照组和数据流；每处都有页码。</p>
          </div>
          <div>
            <span>02</span>
            <h3>沿着问题走</h3>
            <p>在同一训练阶段比较不同报告，分清沿用的方法与真正的改变。</p>
          </div>
          <div>
            <span>03</span>
            <h3>把想法跑起来</h3>
            <p>用计算图、策略更新与调度实验验证直觉，再定位关键源码。</p>
          </div>
        </div>
        <Link
          to={last ? `/papers/${last.id}` : "/papers/deepseek-v3"}
          className="pill-button dark-pill"
        >
          {last ? `继续阅读 ${last.title}` : "从 DeepSeek-V3 开始"}{" "}
          <ChevronRight size={18} />
        </Link>
      </section>
    </div>
  );
}
