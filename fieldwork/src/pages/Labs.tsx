import { lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Terminal,
} from "lucide-react";
import {
  gradient,
  passAtK,
  preference,
  routeTokens,
  scheduleRollouts,
} from "../data/labMath";
const LabSource = lazy(() => import("../components/LabSource"));
const experiments = [
  {
    id: "systems",
    title: "一张卡到一个集群",
    en: "GPU MEMORY & COMMUNICATION",
    desc: "看清参数状态如何占显存，以及梯度如何穿过多卡网络。",
    chapter: "distributed-training",
    command: "systems",
  },
  {
    id: "gradients",
    title: "让梯度变得可见",
    en: "BACKPROPAGATION",
    desc: "拖动参数，逐步看误差如何沿计算图返回。",
    chapter: "gradient-bridge",
    command: "gradients",
  },
  {
    id: "data-mixture",
    title: "数据配比与能力遗忘",
    en: "DATA MIXTURE",
    desc: "改变训练分布，观察两个任务之间的能力权衡。",
    chapter: "data-mixture",
    command: "mixture",
  },
  {
    id: "preference",
    title: "偏好目标与参考策略",
    en: "PREFERENCE OPTIMIZATION",
    desc: "从 log probability margin 看 DPO 的真实更新方向。",
    chapter: "preference-optimization",
    command: "preference",
  },
  {
    id: "agent-loop",
    title: "一条轨迹，哪些 token 被训练？",
    en: "AGENT TRAJECTORY",
    desc: "区分策略动作、工具观测、终止条件与奖励。",
    chapter: "agent-rollout",
    command: "agent",
  },
  {
    id: "rollout",
    title: "吞吐、长尾与策略滞后",
    en: "ROLLOUT SCHEDULING",
    desc: "把同步和异步调度放在同一条时间轴上比较。",
    chapter: "agent-rollout",
    command: "rollout",
  },
  {
    id: "moe",
    title: "MoE 路由压力台",
    en: "EXPERT ROUTING",
    desc: "制造专家热点，观察容量上限与 token 丢弃。",
    chapter: "moe-training",
    command: "moe",
  },
  {
    id: "evaluation",
    title: "pass@k 不等于单次成功率",
    en: "EVALUATION",
    desc: "在固定样本中计算无偏估计，理解采样预算。",
    chapter: "evaluation",
    command: "evaluation",
  },
];
function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <label className="range-control">
      <span>
        {label}
        <b>
          {Number(value.toFixed(3))}
          {suffix}
        </b>
      </span>
      <input
        aria-label={label}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="range-bounds">
        <small>{min}</small>
        <small>{max}</small>
      </span>
    </label>
  );
}
function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="lab-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}
function LabFrame({
  children,
  explanation,
}: {
  children: ReactNode;
  explanation: ReactNode;
}) {
  return (
    <>
      <div className="lab-board">{children}</div>
      <div className="lab-explanation">
        <span className="eyebrow">WHAT TO NOTICE</span>
        {explanation}
      </div>
    </>
  );
}
export default function Labs() {
  const [showSource, setShowSource] = useState(false);
  const { experiment } = useParams();
  const aliases: Record<string, string> = {
    agent: "agent-loop",
    mixture: "data-mixture",
  };
  const selected = experiments.find(
    (x) => x.id === (aliases[experiment || ""] || experiment || "gradients"),
  );
  return (
    <div className="page labs-page page-enter">
      <div className="page-kicker">
        <span className="eyebrow">THE INTERACTIVE WORKBENCH</span>
        <span className="live-tag">
          <span className="status-dot" />
          LIVE COMPUTATION
        </span>
      </div>
      <h1>
        调整一个变量。
        <br />
        看见背后的机制。
      </h1>
      <p className="page-lead">
        浏览器里建立直觉，本地实验里验证假设。所有交互实时计算，无需 GPU 或 API
        密钥。
      </p>
      <nav className="lab-tabs" aria-label="实验选择">
        {experiments.map((e, i) => (
          <Link
            className={selected?.id === e.id ? "active" : ""}
            key={e.id}
            to={`/labs/${e.id}`}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {e.title.split("，")[0]}
          </Link>
        ))}
      </nav>
      {selected ? (
        <>
          <div className="lab-heading">
            <div>
              <span className="eyebrow">{selected.en}</span>
              <h2>{selected.title}</h2>
              <p>{selected.desc}</p>
            </div>
            <Link className="text-link" to={`/learn/${selected.chapter}`}>
              回到原理 <ArrowUpRight size={15} />
            </Link>
          </div>
          <div key={selected.id}>
            {selected.id === "systems" ? (
              <SystemsLab />
            ) : selected.id === "gradients" ? (
              <GradientLab />
            ) : selected.id === "data-mixture" ? (
              <MixtureLab />
            ) : selected.id === "preference" ? (
              <PreferenceLab />
            ) : selected.id === "agent-loop" ? (
              <AgentLab />
            ) : selected.id === "rollout" ? (
              <RolloutLab />
            ) : selected.id === "moe" ? (
              <MoeLab />
            ) : (
              <EvalLab />
            )}
          </div>
          <div className="local-experiment">
            <Terminal size={23} />
            <div>
              <h3>继续到可运行的 Python 实验</h3>
              <code>python3 -m labs.run --experiment {selected.command}</code>
              <p>
                在项目根目录运行 · Python 3.10+ · 纯标准库 · 配置与预期输出见
                labs/README.md
              </p>
            </div>
          </div>
          <section className="lab-source-section">
            <button
              className="source-reveal"
              aria-expanded={showSource}
              onClick={() => setShowSource((v) => !v)}
            >
              <Terminal size={16} />
              {showSource ? "收起实验源码" : "展开实验源码、配置与调试指南"}
              <ChevronRight size={15} className={showSource ? "rotated" : ""} />
            </button>
            {showSource && (
              <Suspense fallback={<p>正在打开教学源码…</p>}>
                <LabSource key={selected.id} experiment={selected.command} />
              </Suspense>
            )}
          </section>
          <p className="lab-disclosure">
            教学边界：这些是机制实验和离散事件模拟，不是完整 LLM
            训练，也不代表任何模型或硬件的真实性能。
          </p>
        </>
      ) : (
        <div className="empty-state">实验不存在，请从上方选择一个实验。</div>
      )}
    </div>
  );
}
function GradientLab() {
  const [w, setW] = useState(0.5);
  const [b, setB] = useState(0);
  const [lr, setLr] = useState(0.1);
  const [phase, setPhase] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const g = gradient(w, b);
  const step = () => {
    if (phase < 2) setPhase((p) => p + 1);
    else {
      setHistory((h) => [...h, g.loss]);
      setW(w - lr * g.dw);
      setB(b - lr * g.db);
      setPhase(0);
    }
  };
  useEffect(() => {
    if (!playing) return;
    if (!Number.isFinite(g.loss) || Math.abs(w) > 10000) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(step, 900);
    return () => clearTimeout(timer);
  }, [playing, phase, w, b, lr]);
  const reset = () => {
    setW(0.5);
    setB(0);
    setPhase(0);
    setHistory([]);
    setPlaying(false);
  };
  return (
    <LabFrame
      explanation={
        <>
          <h3>反向传播计算方向，梯度下降执行更新。</h3>
          <p>
            固定 x = 2，目标 y = 5。误差 e = ŷ − y，损失 L =
            ½e²。误差沿链式法则返回：∂L/∂w = e · x = <b>{g.dw.toFixed(3)}</b>
            。更新 w ← w − η∂L/∂w，所以负梯度会让 w 增大。
          </p>
          <p>
            这张图把工具包里的 <code>loss.backward()</code> 和{" "}
            <code>optimizer.step()</code> 分开了。把学习率调到
            0.5，观察为什么算对了梯度仍可能震荡或发散。
          </p>
        </>
      }
    >
      <div className="lab-controls">
        <Range
          label="权重 w"
          value={w}
          min={-2}
          max={4}
          step={0.05}
          onChange={(v) => {
            setW(v);
            setHistory([]);
            setPlaying(false);
          }}
        />
        <Range
          label="偏置 b"
          value={b}
          min={-2}
          max={4}
          step={0.05}
          onChange={(v) => {
            setB(v);
            setHistory([]);
            setPlaying(false);
          }}
        />
        <Range
          label="学习率 η"
          value={lr}
          min={0.01}
          max={0.6}
          step={0.01}
          onChange={setLr}
        />
        <button
          className="button primary"
          onClick={step}
          disabled={!Number.isFinite(g.loss) || Math.abs(w) > 10000}
        >
          {phase === 0
            ? "① 前向计算"
            : phase === 1
              ? "② 反向传播"
              : "③ 更新参数"}
          <ChevronRight size={15} />
        </button>
        <div className="lab-small-actions">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={!Number.isFinite(g.loss) || Math.abs(w) > 10000}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}{" "}
            {playing ? "暂停" : "自动运行"}
          </button>
          <button onClick={reset}>
            <RotateCcw size={13} />
            重置
          </button>
        </div>
      </div>
      <div className="gradient-canvas">
        <div className="canvas-label">
          <span>COMPUTATIONAL GRAPH</span>
          <b>
            {phase === 0
              ? "参数已就绪"
              : phase === 1
                ? "FORWARD →"
                : "← BACKWARD"}
          </b>
        </div>
        <svg viewBox="0 0 650 285" role="img" aria-label="前向和反向计算图">
          <defs>
            <marker
              id="arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0 0L6 3L0 6" fill="currentColor" />
            </marker>
          </defs>
          <g className={`graph-lines phase-${phase}`}>
            <path d="M95 80 L185 145M95 205L185 145M230 145H305M355 145H435M485 145H560" />
            <path d="M330 65V120" />
          </g>
          {[
            { x: 55, y: 55, label: "x = 2", v: "输入" },
            { x: 55, y: 180, label: `w = ${w.toFixed(2)}`, v: "可学习参数" },
            { x: 165, y: 120, label: "×", v: (2 * w).toFixed(2) },
            { x: 290, y: 35, label: `b = ${b.toFixed(2)}`, v: "可学习参数" },
            { x: 290, y: 120, label: "+", v: g.prediction.toFixed(2) },
            { x: 420, y: 120, label: "− y", v: (g.prediction - 5).toFixed(2) },
            { x: 545, y: 120, label: "½ e²", v: g.loss.toFixed(2) },
          ].map((n, i) => (
            <g
              key={i}
              className={`graph-node ${phase === 2 && (i === 1 || i === 3) ? "backward" : ""}`}
            >
              <rect x={n.x - 12} y={n.y - 5} width={90} height={55} rx={7} />
              <text x={n.x + 33} y={n.y + 17}>
                {n.label}
              </text>
              <text className="node-small" x={n.x + 33} y={n.y + 36}>
                {n.v}
              </text>
            </g>
          ))}
          {phase === 2 && (
            <g className="gradient-labels">
              <text x="190" y="225">
                ∂L/∂w = {g.dw.toFixed(2)}
              </text>
              <text x="400" y="225">
                ∂L/∂b = {g.db.toFixed(2)}
              </text>
              <path d="M510 250H170" markerEnd="url(#arrow)" />
            </g>
          )}
        </svg>
        <div className="lab-metrics">
          <Metric label="当前损失 L" value={g.loss.toFixed(4)} />
          <Metric label="权重梯度" value={g.dw.toFixed(4)} />
          <Metric label="已更新" value={`${history.length} 次`} />
        </div>
        {history.length > 0 && (
          <div className="loss-history">
            损失轨迹{" "}
            {history.slice(-8).map((l, i) => (
              <span key={i}>{l.toFixed(3)} → </span>
            ))}
            <b>{g.loss.toFixed(3)}</b>
          </div>
        )}
        {Math.abs(w) > 10000 && (
          <p className="warning-text">
            参数已明显发散，暂停更新。降低学习率并重置。
          </p>
        )}
      </div>
    </LabFrame>
  );
}
function MixtureLab() {
  const [ratio, setRatio] = useState(70);
  const p = ratio / 100;
  const optimum = 2 * p;
  return (
    <LabFrame
      explanation={
        <>
          <h3>配比改变的不只是见到什么，也改变梯度朝哪里走。</h3>
          <p>
            教学模型只有一个参数 θ。通用任务希望 θ = 0，领域任务希望 θ = 2：L =
            (1−p)θ² + p(θ−2)²，最优 θ =
            2p。这是刻意构造的冲突任务，不是语言模型能力预测器。
          </p>
          <p>
            提高领域数据占比，领域误差下降、通用误差上升。真实中训练需要保留集评测与
            replay 来判断遗忘，而不能只盯新领域 loss。Python
            实验进一步运行分阶段 SGD。
          </p>
        </>
      }
    >
      <div className="lab-controls">
        <Range
          label="领域数据占比"
          value={ratio}
          min={0}
          max={100}
          onChange={setRatio}
          suffix="%"
        />
        <div className="mix-legend">
          <span>
            <i />
            通用数据 {100 - ratio}%
          </span>
          <span>
            <i />
            领域数据 {ratio}%
          </span>
        </div>
        <div className="mix-bar">
          <i style={{ width: `${100 - ratio}%` }} />
          <i style={{ width: `${ratio}%` }} />
        </div>
      </div>
      <div className="mixture-canvas">
        <div className="canvas-label">两种任务的损失与混合目标</div>
        <svg
          viewBox="0 0 620 260"
          role="img"
          aria-label="随数据比例变化的损失曲线"
        >
          <g className="chart-grid">
            {[50, 100, 150, 200].map((y) => (
              <path key={y} d={`M50 ${y}H590`} />
            ))}
          </g>
          {[
            { fn: (x: number) => x * x, color: "var(--blue)" },
            { fn: (x: number) => (x - 2) ** 2, color: "var(--accent)" },
            {
              fn: (x: number) => (1 - p) * x * x + p * (x - 2) ** 2,
              color: "var(--gold)",
            },
          ].map((f, i) => (
            <path
              key={i}
              fill="none"
              stroke={f.color}
              strokeWidth="2.5"
              d={Array.from({ length: 101 }, (_, j) => {
                const x = j / 50;
                return `${j ? "L" : "M"}${60 + x * 250} ${225 - f.fn(x) * 48}`;
              }).join(" ")}
            />
          ))}
          <line
            x1={60 + optimum * 250}
            x2={60 + optimum * 250}
            y1={25}
            y2={225}
            className="chart-indicator"
          />
          <text x={60 + optimum * 250} y={249} textAnchor="middle">
            θ* = {optimum.toFixed(2)}
          </text>
        </svg>
        <div className="chart-legend">
          <span>蓝：通用任务</span>
          <span>绿：领域任务</span>
          <span>金：混合目标</span>
        </div>
        <div className="lab-metrics">
          <Metric label="通用误差" value={(optimum ** 2).toFixed(3)} />
          <Metric label="领域误差" value={((optimum - 2) ** 2).toFixed(3)} />
          <Metric label="最优参数 θ*" value={optimum.toFixed(3)} />
        </div>
      </div>
    </LabFrame>
  );
}
function PreferenceLab() {
  const [beta, setBeta] = useState(0.2);
  const [margin, setMargin] = useState(1);
  const [ref, setRef] = useState(0);
  const r = preference(beta, margin, ref);
  return (
    <LabFrame
      explanation={
        <>
          <h3>比较的是相对参考模型的偏好变化。</h3>
          <p>
            DPO 在本实验中的 margin = log π(y⁺|x) − log π(y⁻|x)。有效 logit 是
            β(margin − reference margin)，因此参考模型也更偏好 chosen
            时，当前策略必须进一步增加相对 margin。
          </p>
          <p>
            β 既进入目标中的偏好 logit，也关联原始推导的 KL 权衡；在固定 logits
            上提高 β
            与重新训练后模型的偏离程度，是两个不同的问题。不要从一个静态曲线推断最终
            KL。
          </p>
        </>
      }
    >
      <div className="lab-controls">
        <Range
          label="策略 log-prob margin"
          value={margin}
          min={-8}
          max={8}
          step={0.1}
          onChange={setMargin}
        />
        <Range
          label="参考 log-prob margin"
          value={ref}
          min={-5}
          max={5}
          step={0.1}
          onChange={setRef}
        />
        <Range
          label="β"
          value={beta}
          min={0.05}
          max={2}
          step={0.05}
          onChange={setBeta}
        />
      </div>
      <div className="preference-canvas">
        <div className="equation-display">
          L = −log σ[β(Δlog π − Δlog π<sub>ref</sub>)]
        </div>
        <div className="preference-scale">
          <span>rejected</span>
          <div>
            <i style={{ width: `${r.prob * 100}%` }} />
          </div>
          <span>chosen</span>
        </div>
        <div className="lab-metrics">
          <Metric
            label="隐式偏好概率"
            value={`${(r.prob * 100).toFixed(1)}%`}
          />
          <Metric label="DPO loss" value={r.loss.toFixed(4)} />
          <Metric label="∂L / ∂margin" value={r.derivative.toFixed(4)} />
        </div>
        <p className="canvas-note">
          梯度为负：梯度下降会增大 chosen 相对 rejected 的 margin。
          <br />
          这里没有独立 reward model，也没有在线采样 worker。
        </p>
      </div>
    </LabFrame>
  );
}
const trajectory = [
  {
    role: "task",
    label: "任务",
    body: "读取环境中的两个数，使用 add 工具得到它们的和。",
    mask: "—",
  },
  {
    role: "assistant",
    label: "策略动作",
    body: '{"tool": "read", "arguments": {}}',
    mask: "1",
  },
  { role: "tool", label: "环境观测", body: '{"a": 17, "b": 25}', mask: "0" },
  {
    role: "assistant",
    label: "策略动作",
    body: '{"tool": "add", "arguments": {"a":17,"b":25}}',
    mask: "1",
  },
  { role: "tool", label: "环境观测", body: '{"result":42}', mask: "0" },
  { role: "assistant", label: "最终响应", body: '{"answer":42}', mask: "1" },
  {
    role: "verifier",
    label: "独立验证",
    body: "读取独立任务真值 → answer == 42 → outcome reward = 1",
    mask: "—",
  },
];
function AgentLab() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [weak, setWeak] = useState(false);
  useEffect(() => {
    if (!running) return;
    if (step >= 6) {
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [running, step]);
  return (
    <LabFrame
      explanation={
        <>
          <h3>工具输出参与上下文，却不应被当作策略动作优化。</h3>
          <p>
            环境返回的 42
            改变下一步条件分布，但它不是策略采样出来的动作。教学轨迹用 response
            mask = 0 排除其直接策略损失；assistant token 的 mask =
            1。真实实现还必须处理截断、attention mask、position 和每步行为策略
            log-prob。
          </p>
          <p>
            打开“弱验证器”会暴露只检查是否包含数字的漏洞：回答 999
            也可能获奖。成功的环境交互和可信的奖励是两套必须分别验证的逻辑。此浏览器轨迹用于分步讲解；Python
            实验包含真正学习的有限策略。
          </p>
        </>
      }
    >
      <div className="lab-controls">
        <p className="eyebrow">STEP {String(step + 1).padStart(2, "0")} / 07</p>
        <h3>{trajectory[step].label}</h3>
        <p className="control-description">
          跟踪每次状态变化，检查哪一段数据进入训练目标。
        </p>
        <button
          className="button primary"
          onClick={() => setStep((s) => Math.min(6, s + 1))}
          disabled={step === 6}
        >
          执行下一步 <ArrowRight size={15} />
        </button>
        <div className="lab-small-actions">
          <button
            onClick={() => {
              if (step === 6) setStep(0);
              setRunning((p) => !p);
            }}
          >
            {running ? <Pause size={13} /> : <Play size={13} />}播放
          </button>
          <button
            onClick={() => {
              setStep(0);
              setRunning(false);
            }}
          >
            <RotateCcw size={13} />
            重置
          </button>
        </div>
        <label className="checkbox-control">
          <input
            type="checkbox"
            checked={weak}
            onChange={(e) => setWeak(e.target.checked)}
          />
          开启弱验证器
        </label>
        {weak && (
          <p className="warning-text">
            只检查答案里有没有数字：错误答案 999 也会被接受。
          </p>
        )}
      </div>
      <div className="trajectory-canvas">
        <div className="canvas-label">
          <span>TRAJECTORY / 单条轨迹</span>
          <span>LOSS MASK</span>
        </div>
        {trajectory.map((s, i) => (
          <div
            className={`trajectory-event ${i <= step ? "revealed" : ""} ${i === step ? "current" : ""}`}
            key={i}
          >
            <span className={`role-chip ${s.role}`}>{s.label}</span>
            <code>{i <= step ? s.body : "等待上一步完成…"}</code>
            <b>{i <= step ? s.mask : "·"}</b>
          </div>
        ))}
        <div className="trajectory-result">
          {step === 6 ? (
            <>
              <Check size={14} />
              终止 · {weak
                ? "验证器不可靠，奖励不能证明成功"
                : "严格验证通过"}{" "}
              · 写入轨迹存储
            </>
          ) : (
            <>等待环境 / 策略完成下一步…</>
          )}
        </div>
      </div>
    </LabFrame>
  );
}
function RolloutLab() {
  const [workers, setWorkers] = useState(4);
  const [threshold, setThreshold] = useState(1);
  const [async, setAsync] = useState(true);
  const data = scheduleRollouts(workers, threshold, async);
  const sync = scheduleRollouts(workers, threshold, false);
  return (
    <LabFrame
      explanation={
        <>
          <h3>异步消除了等待屏障，也引入了数据新鲜度问题。</h3>
          <p>
            16
            个任务使用相同固定耗时。同步每批等待最慢任务；异步谁空闲谁领下一个任务。模拟异步
            trainer 每 10 个时间单位更新一次，lag = 完成时版本 −
            开始时版本；超过阈值的轨迹被拒收。
          </p>
          <p>
            绿色是可用轨迹，橙色是陈旧轨迹。调大滞后阈值可能增加可用吞吐，却不能证明训练稳定。本模型未计参数同步、CPU/GPU争用或重试；同步模式的更新发生在屏障，不使用异步版本时钟。
          </p>
        </>
      }
    >
      <div className="lab-controls">
        <div className="segmented">
          <button
            className={!async ? "selected" : ""}
            onClick={() => setAsync(false)}
          >
            同步
          </button>
          <button
            className={async ? "selected" : ""}
            onClick={() => setAsync(true)}
          >
            异步
          </button>
        </div>
        <Range
          label="Rollout workers"
          value={workers}
          min={1}
          max={8}
          onChange={setWorkers}
        />
        <Range
          label="允许的策略版本差"
          value={threshold}
          min={0}
          max={3}
          onChange={setThreshold}
        />
        <p className="control-description">
          固定任务集 / 耗时单位为模拟 tick / 不对应真实硬件
        </p>
      </div>
      <div className="rollout-canvas">
        <div className="canvas-label">
          <span>WORKER TIMELINE</span>
          <span>0 → {data.duration} ticks</span>
        </div>
        <div className="worker-timeline">
          {Array.from({ length: workers }, (_, i) => (
            <div className="worker-row" key={i}>
              <label>W{i}</label>
              <div>
                {data.events
                  .filter((e) => e.worker === i)
                  .map((e) => (
                    <span
                      key={e.task}
                      title={`Task ${e.task + 1}: ${e.start}–${e.end}, lag=${e.lag}, ${e.accepted ? "accepted" : "rejected"}`}
                      className={e.accepted ? "accepted" : "stale"}
                      style={{
                        left: `${(e.start / data.duration) * 100}%`,
                        width: `${((e.end - e.start) / data.duration) * 100}%`,
                      }}
                    >
                      T{e.task + 1}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="lab-metrics">
          <Metric
            label="总完成时间"
            value={`${data.duration}`}
            sub={`同步基线 ${sync.duration} ticks`}
          />
          <Metric
            label="worker 忙碌率"
            value={`${(data.utilization * 100).toFixed(1)}%`}
          />
          <Metric
            label="可接收轨迹"
            value={`${data.accepted} / 16`}
            sub={`有效吞吐 ${(data.accepted / data.duration).toFixed(3)}/tick`}
          />
        </div>
      </div>
    </LabFrame>
  );
}
function MoeLab() {
  const [skew, setSkew] = useState(0.5);
  const [cap, setCap] = useState(1.25);
  const r = routeTokens(skew, cap);
  return (
    <LabFrame
      explanation={
        <>
          <h3>路由不均衡，会把稀疏计算变成通信与容量问题。</h3>
          <p>
            64 个 token，各选择 2 个专家，共 128 次分配。每个专家容量 C =
            ceil(capacity factor × 128 / 8)。给 Expert 0 的分数加偏置后，更多
            token 涌向同一个专家。
          </p>
          <p>
            本实验采用超容量丢弃来展示损失，不是 dropless
            调度。生产中还要区分辅助负载均衡损失、路由 bias 更新、专家并行
            all-to-all、padding 与 grouped GEMM 的不同代价。
          </p>
        </>
      }
    >
      <div className="lab-controls">
        <Range
          label="Expert 0 路由偏置"
          value={skew}
          min={0}
          max={3}
          step={0.05}
          onChange={setSkew}
        />
        <Range
          label="Capacity factor"
          value={cap}
          min={0.5}
          max={3}
          step={0.05}
          onChange={setCap}
        />
        <p className="control-description">
          Top-2 · 8 experts · 64 tokens
          <br />
          固定确定性分数，拖动参数可复现。
        </p>
      </div>
      <div className="moe-canvas">
        <div className="canvas-label">
          <span>EXPERT TOKEN LOAD</span>
          <span>容量 {r.capacity} / expert</span>
        </div>
        <div className="expert-bars">
          {r.demand.map((d, i) => (
            <div key={i}>
              <div className="bar-space">
                <div
                  className="expert-bar"
                  style={{ height: `${(d / 64) * 100}%` }}
                >
                  <i
                    style={{
                      height: `${d ? (Math.max(0, d - r.capacity) / d) * 100 : 0}%`,
                    }}
                  />
                  <b>{d}</b>
                </div>
                <span
                  className="capacity-line"
                  style={{
                    bottom: `${Math.min(100, (r.capacity / 64) * 100)}%`,
                  }}
                />
              </div>
              <span>E{i}</span>
            </div>
          ))}
        </div>
        <div className="lab-metrics">
          <Metric label="超容量分配" value={`${r.dropped} / 128`} />
          <Metric label="最大负载 / 均值" value={r.ratio.toFixed(2)} />
          <Metric label="实际接收" value={String(128 - r.dropped)} />
        </div>
      </div>
    </LabFrame>
  );
}
function EvalLab() {
  const [n, setN] = useState(20);
  const [c, setC] = useState(4);
  const [k, setK] = useState(5);
  const prob = passAtK(n, c, k);
  return (
    <LabFrame
      explanation={
        <>
          <h3>更多尝试可以提高“至少成功一次”，不能替代 pass@1。</h3>
          <p>
            给定 n 个独立采样、c 个正确，pass@k 的组合估计为 1 − C(n−c,k) /
            C(n,k)，要求 n ≥ k。多个任务应先分别估计，再做任务级平均。
          </p>
          <p>
            曲线来自当前这一个任务的样本；不是新模型的泛化置信区间。浏览器展示组合公式，Python
            实验提供任务级 bootstrap
            和去重/污染检查。评测预算、采样温度、harness 和 verifier
            都必须记录。
          </p>
        </>
      }
    >
      <div className="lab-controls">
        <Range
          label="总采样数 n"
          value={n}
          min={2}
          max={100}
          onChange={(v) => {
            setN(v);
            setC((x) => Math.min(x, v));
            setK((x) => Math.min(x, v));
          }}
        />
        <Range label="成功样本数 c" value={c} min={0} max={n} onChange={setC} />
        <Range label="尝试预算 k" value={k} min={1} max={n} onChange={setK} />
      </div>
      <div className="eval-canvas">
        <div className="canvas-label">同一任务，在不同采样预算下的估计</div>
        <svg
          viewBox="0 0 600 220"
          role="img"
          aria-label="pass@k随采样预算变化曲线"
        >
          <g className="chart-grid">
            {[30, 80, 130, 180].map((y) => (
              <path key={y} d={`M40 ${y}H580`} />
            ))}
          </g>
          <path
            className="pass-curve"
            d={Array.from(
              { length: n },
              (_, i) =>
                `${i ? "L" : "M"}${40 + (i / (n - 1)) * 520} ${190 - passAtK(n, c, i + 1) * 160}`,
            ).join(" ")}
          />
          <circle
            cx={40 + ((k - 1) / (n - 1)) * 520}
            cy={190 - prob * 160}
            r="6"
            fill="var(--accent)"
          />
          <text x="40" y="213">
            k = 1
          </text>
          <text x="530" y="213">
            k = {n}
          </text>
        </svg>
        <div className="lab-metrics">
          <Metric label="pass@1" value={`${((c / n) * 100).toFixed(1)}%`} />
          <Metric label={`pass@${k}`} value={`${(prob * 100).toFixed(1)}%`} />
          <Metric label="评测预算倍数" value={`${k}×`} />
        </div>
      </div>
    </LabFrame>
  );
}
function SystemsLab() {
  const [gpus, setGpus] = useState(8);
  const [params, setParams] = useState(7);
  const [bandwidth, setBandwidth] = useState(100);
  const [shard, setShard] = useState(false);
  const [hop, setHop] = useState(0);
  const [playing, setPlaying] = useState(false);
  const p = params * 1e9;
  const gradientBytes = p * 4;
  const traffic = ((2 * (gpus - 1)) / gpus) * gradientBytes;
  const seconds = traffic / (bandwidth * 1e9);
  const memory = (p * 18) / (shard ? gpus : 1) / 2 ** 30;
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setHop((h) => (h + 1) % (2 * (gpus - 1))), 650);
    return () => clearInterval(t);
  }, [playing, gpus]);
  return (
    <LabFrame
      explanation={
        <>
          <h3>“模型有 7B 参数”和“用多大的卡”之间，还差一张内存账本。</h3>
          <p>
            此教学账本每参数计 BF16 权重 2 bytes、FP32 主权重 4、FP32 梯度
            4、Adam 两个 FP32 moment 共 8，合计 18 bytes。DDP
            每卡复制；理想完全分片除以卡数。真实实现可能省略某份副本，且还要加上激活、临时
            all-gather、kernel workspace 与碎片。
          </p>
          <p>
            Ring all-reduce 对大小 S 的梯度，每 rank 理论发送 2(N−1)S/N
            bytes。图中前 N−1 步是 reduce-scatter、后 N−1 步是
            all-gather，实际各 rank
            同时流水通信。这里计算梯度的纯链路时间下界；不包含延迟、争用、算法切换或重叠。FSDP
            另有参数 all-gather，不能把这一项当成它的完整通信成本。
          </p>
          <p>
            带宽是你填入的单向有效 GB/s，并非某型号宣传的双向聚合带宽。Python
            systems 实验进一步分解 DP/FSDP/TP 与跨机链路，profiler
            脚本提供算子实测。
          </p>
        </>
      }
    >
      <div className="lab-controls">
        <Range
          label="GPU 数量"
          value={gpus}
          min={2}
          max={16}
          step={2}
          onChange={(n) => {
            setGpus(n);
            setHop(0);
          }}
        />
        <Range
          label="参数量（B）"
          value={params}
          min={1}
          max={70}
          step={1}
          onChange={setParams}
        />
        <Range
          label="有效链路 GB/s"
          value={bandwidth}
          min={10}
          max={400}
          step={10}
          onChange={setBandwidth}
        />
        <label className="checkbox-control">
          <input
            type="checkbox"
            checked={shard}
            onChange={(e) => setShard(e.target.checked)}
          />
          查看完全分片状态内存
        </label>
        <button
          className="button primary"
          onClick={() => {
            setPlaying(false);
            setHop((h) => (h + 1) % (2 * (gpus - 1)));
          }}
        >
          推进一个通信 step <ArrowRight size={14} />
        </button>
        <div className="lab-small-actions">
          <button onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={13} /> : <Play size={13} />}{" "}
            {playing ? "暂停" : "自动播放"}
          </button>
          <button
            onClick={() => {
              setHop(0);
              setPlaying(false);
            }}
          >
            <RotateCcw size={13} />
            重置
          </button>
        </div>
      </div>
      <div className="system-canvas">
        <div className="canvas-label">
          <span>RING ALL-REDUCE / 逻辑环示意</span>
          <span>
            {hop < gpus - 1 ? "REDUCE-SCATTER" : "ALL-GATHER"} · {hop + 1}/
            {2 * (gpus - 1)}
          </span>
        </div>
        <svg
          viewBox="0 0 600 320"
          role="img"
          aria-label={`${gpus}个GPU的环形集合通信拓扑`}
        >
          <circle
            cx="300"
            cy="154"
            r="111"
            fill="none"
            stroke="var(--line)"
            strokeWidth="2"
          />
          {Array.from({ length: gpus }, (_, i) => {
            const angle = (i / gpus) * Math.PI * 2 - Math.PI / 2;
            const next = ((i + 1) / gpus) * Math.PI * 2 - Math.PI / 2;
            const x = 300 + Math.cos(angle) * 111,
              y = 154 + Math.sin(angle) * 111;
            const nx = 300 + Math.cos(next) * 111,
              ny = 154 + Math.sin(next) * 111;
            return (
              <g key={i}>
                <path
                  d={`M${x} ${y}L${nx} ${ny}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeDasharray="5 7"
                  className={playing ? "system-packet-animation" : ""}
                />
                <rect
                  x={x - 26}
                  y={y - 18}
                  width="52"
                  height="36"
                  rx="5"
                  fill={
                    (i + hop) % gpus === 0 ? "var(--accent)" : "var(--panel)"
                  }
                  stroke="var(--accent)"
                />
                <text
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fontSize="10"
                  fill={(i + hop) % gpus === 0 ? "var(--bg)" : "var(--accent)"}
                >
                  GPU {i}
                </text>
              </g>
            );
          })}
          <text
            x="300"
            y="145"
            textAnchor="middle"
            fill="var(--ink)"
            fontSize="17"
          >
            {(gradientBytes / 1e9).toFixed(0)} GB
          </text>
          <text
            x="300"
            y="166"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="9"
          >
            完整梯度 · 切成 {gpus} 块
          </text>
          <text
            x="300"
            y="186"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="9"
          >
            当前跟踪块 #{hop % gpus}
          </text>
        </svg>
        <div className="lab-metrics">
          <Metric
            label={`${shard ? "分片" : "DDP"}每卡参数状态`}
            value={`${memory.toFixed(1)} GiB`}
            sub="未计激活与临时buffer"
          />
          <Metric
            label="每 rank 发送量"
            value={`${(traffic / 1e9).toFixed(1)} GB`}
          />
          <Metric
            label="通信时间下界"
            value={`${(seconds * 1000).toFixed(0)} ms`}
            sub="无延迟、无计算重叠"
          />
        </div>
      </div>
    </LabFrame>
  );
}
