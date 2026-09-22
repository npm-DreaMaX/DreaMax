import { describe, it, expect } from "vitest";
import {
  gradient,
  passAtK,
  preference,
  routeTokens,
  scheduleRollouts,
} from "../src/data/labMath";
describe("mechanism experiments", () => {
  it("backprop gradients agree with independent finite differences and decrease loss", () => {
    const w = 0.5,
      b = 0,
      h = 1e-5;
    const g = gradient(w, b);
    expect(g.dw).toBeCloseTo(
      (gradient(w + h, b).loss - gradient(w - h, b).loss) / (2 * h),
      7,
    );
    expect(g.db).toBeCloseTo(
      (gradient(w, b + h).loss - gradient(w, b - h).loss) / (2 * h),
      7,
    );
    expect(gradient(w - 0.1 * g.dw, b - 0.1 * g.db).loss).toBeCloseTo(2);
  });
  it("large step can diverge despite correct gradients", () => {
    const g = gradient(0.5, 0);
    expect(gradient(0.5 - 0.5 * g.dw, -0.5 * g.db).loss).toBeGreaterThan(
      g.loss,
    );
  });
  it("DPO remains numerically stable for extreme margins", () => {
    for (const m of [-10000, 10000])
      expect(Number.isFinite(preference(1, m).loss)).toBe(true);
    const h = 1e-5;
    expect(preference(0.2, 1, 0.1).derivative).toBeCloseTo(
      (preference(0.2, 1 + h, 0.1).loss - preference(0.2, 1 - h, 0.1).loss) /
        (2 * h),
      8,
    );
  });
  it("pass@k agrees with exact enumeration for 2 successes in 4 samples", () => {
    expect(passAtK(4, 2, 2)).toBeCloseTo(5 / 6);
    expect(passAtK(20, 4, 1)).toBeCloseTo(0.2);
    expect(passAtK(20, 0, 20)).toBe(0);
    expect(passAtK(20, 4, 20)).toBe(1);
    expect(() => passAtK(3, 2, 4)).toThrow();
  });
  it("scheduler never overlaps tasks on the same worker", () => {
    for (const mode of [false, true])
      for (const w of [1, 2, 4, 8]) {
        const s = scheduleRollouts(w, 1, mode);
        expect(s.events.length).toBe(16);
        expect(s.utilization).toBeLessThanOrEqual(1);
        for (let i = 0; i < w; i++) {
          const e = s.events.filter((x) => x.worker === i);
          for (let j = 1; j < e.length; j++)
            expect(e[j].start).toBeGreaterThanOrEqual(e[j - 1].end);
        }
      }
  });
  it("freshness thresholds change admitted samples, not task completion time", () => {
    const strict = scheduleRollouts(4, 0, true),
      loose = scheduleRollouts(4, 3, true);
    expect(loose.duration).toBe(strict.duration);
    expect(loose.accepted).toBeGreaterThan(strict.accepted);
    expect(loose.accepted).toBe(16);
  });
  it("MoE capacity accounts for all token-expert assignments", () => {
    for (const skew of [0, 1, 3])
      for (const cap of [0.5, 1.25, 3]) {
        const r = routeTokens(skew, cap);
        expect(r.demand.reduce((a, b) => a + b, 0)).toBe(128);
        expect(r.accepted.reduce((a, b) => a + b, 0) + r.dropped).toBe(128);
        expect(Math.max(...r.accepted)).toBeLessThanOrEqual(r.capacity);
      }
  });
});
