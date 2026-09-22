export function gradient(w: number, b: number, x = 2, target = 5) {
  const prediction = w * x + b;
  const error = prediction - target;
  return {
    prediction,
    loss: (error * error) / 2,
    dw: error * x,
    db: error,
    dx: error * w,
  };
}
export function preference(
  beta: number,
  policyMargin: number,
  referenceMargin = 0,
) {
  const z = beta * (policyMargin - referenceMargin);
  return {
    loss: Math.max(-z, 0) + Math.log1p(Math.exp(-Math.abs(z))),
    prob: 1 / (1 + Math.exp(-z)),
    derivative: -beta / (1 + Math.exp(z)),
  };
}
export function passAtK(n: number, c: number, k: number) {
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(c) ||
    !Number.isInteger(k) ||
    n < 1 ||
    c < 0 ||
    c > n ||
    k < 1 ||
    k > n
  )
    throw new Error("Invalid pass@k inputs");
  if (n - c < k) return 1;
  let p = 1;
  for (let i = 0; i < k; i++) p *= (n - c - i) / (n - i);
  return 1 - p;
}
export interface Event {
  task: number;
  worker: number;
  start: number;
  end: number;
  version: number;
  lag: number;
  accepted: boolean;
}
export function scheduleRollouts(
  workers: number,
  threshold: number,
  async: boolean,
) {
  const times = [4, 9, 5, 17, 3, 8, 6, 13, 4, 7, 19, 5, 3, 10, 6, 12];
  const free = Array(workers).fill(0) as number[];
  const events: Event[] = [];
  let barrier = 0;
  for (let i = 0; i < times.length; i++) {
    const worker = async ? free.indexOf(Math.min(...free)) : i % workers;
    const start = async ? free[worker] : barrier;
    const end = start + times[i];
    const version = Math.floor(start / 10);
    const lag = async ? Math.floor(end / 10) - version : 0;
    events.push({
      task: i,
      worker,
      start,
      end,
      version,
      lag,
      accepted: lag <= threshold,
    });
    free[worker] = end;
    if (!async && (i % workers === workers - 1 || i === times.length - 1))
      barrier = Math.max(...free);
  }
  const duration = Math.max(...free);
  return {
    events,
    duration,
    utilization: times.reduce((a, b) => a + b, 0) / (duration * workers),
    accepted: events.filter((e) => e.accepted).length,
  };
}
export function routeTokens(skew: number, capacityFactor: number) {
  const experts = 8,
    tokens = 64,
    k = 2;
  const capacity = Math.ceil(((tokens * k) / experts) * capacityFactor);
  const demand = Array(experts).fill(0) as number[];
  for (let t = 0; t < tokens; t++) {
    const ranked = Array.from({ length: experts }, (_, e) => ({
      e,
      score:
        ((Math.sin((t + 1) * 12.9898 + (e + 1) * 78.233) * 437.5453) % 1) +
        (e === 0 ? skew : 0),
    })).sort((a, b) => b.score - a.score);
    ranked.slice(0, k).forEach((x) => demand[x.e]++);
  }
  const accepted = demand.map((v) => Math.min(v, capacity));
  return {
    demand,
    accepted,
    capacity,
    dropped: demand.reduce((s, v, i) => s + v - accepted[i], 0),
    ratio: Math.max(...demand) / ((tokens * k) / experts),
  };
}
