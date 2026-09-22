import { useEffect, useRef } from "react";

/** An original, code-drawn field: each ribbon is a computational path.
 * Animation is capped at 30 fps, paused off screen, and respects reduced motion. */
export default function FieldVisual({ phase = 0 }: { phase?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0,
      h = 0,
      frame = 0,
      last = 0,
      visible = true,
      px = 0,
      py = 0;
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      w = box.width;
      h = box.height;
      const dpr = Math.min(devicePixelRatio || 1, 1.6);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);
    const pointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      px = (e.clientX - r.left) / w - 0.5;
      py = (e.clientY - r.top) / h - 0.5;
    };
    canvas.addEventListener("pointermove", pointer);
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (
        !visible ||
        document.hidden ||
        time - last < (motion.matches ? 300 : 33)
      )
        return;
      last = time;
      const t = motion.matches ? 0 : time * 0.00009;
      ctx.fillStyle = "#1b1b1a";
      ctx.fillRect(0, 0, w, h);
      const spread = phaseRef.current * 0.1;
      for (let j = 0; j < 76; j++) {
        const v = j / 75;
        ctx.beginPath();
        for (let k = 0; k < 132; k++) {
          const u = k / 131;
          const angle = u * Math.PI * 2.35 + v * 1.18 + t * 0.45 + spread;
          const envelope = Math.pow(Math.sin(u * Math.PI), 0.65);
          const x =
            w * (0.29 + u * 0.56) +
            Math.sin(angle) * w * 0.087 * envelope +
            (v - 0.5) * w * 0.21 +
            px * 14 * envelope;
          const y =
            h * 0.5 +
            Math.cos(angle) * h * 0.33 * envelope +
            (v - 0.5) * h * 0.43 +
            Math.sin(u * 6.3 + t) * h * 0.12 +
            py * 12;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${23 + v * 14},${38 + v * 22}%,${34 + v * 42}%,${0.24 + Math.sin(v * Math.PI) * 0.66})`;
        ctx.lineWidth = 0.65 + Math.sin(v * Math.PI) * 0.65;
        ctx.stroke();
      }
      // Small ticks expose structure without pretending to be measured results.
      ctx.fillStyle = "#c3ac9860";
      for (let i = 0; i < 42; i++) {
        const x = w * 0.29 + i * w * 0.014;
        ctx.fillRect(x, h * 0.9, 1, i % 5 === 0 ? 7 : 3);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", pointer);
    };
  }, []);
  return <canvas ref={ref} className="field-canvas" aria-hidden="true" />;
}
