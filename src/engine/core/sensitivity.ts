/**
 * Generic sensitivity + break-even tooling.
 *
 * A calculator exposes a `metric(inputs)` (e.g. "how much cheaper is B") and a list of
 * variables with plausible low/high values. We re-run the model at each bound and rank
 * variables by how far they swing the metric. Break-even solves for the value of a single
 * variable that makes the metric zero, using bracketing + bisection (robust to non-linear models).
 */

export interface SensitivityVariable<I> {
  key: string;
  label: string;
  /** Read the current value. */
  get: (inputs: I) => number;
  /** Return a copy of the inputs with the variable changed. */
  set: (inputs: I, value: number) => I;
  /** Lower / upper test values (absolute). May be functions of the base value. */
  low: number | ((base: number) => number);
  high: number | ((base: number) => number);
  /** Format the variable's value for display. */
  format: (v: number) => string;
  /** Optional description of what the variable represents. */
  hint?: string;
  /** Plausible bounds used when searching for a break-even value. */
  bounds?: [number, number];
}

export interface SensitivityRow {
  key: string;
  label: string;
  base: number;
  low: number;
  high: number;
  metricBase: number;
  metricLow: number;
  metricHigh: number;
  /** |metricHigh - metricLow| — the total swing. */
  swing: number;
  /** True if the sign of the metric changes between low and high (the answer could flip). */
  flips: boolean;
  format: (v: number) => string;
  hint?: string;
}

function resolve(v: number | ((b: number) => number), base: number): number {
  return typeof v === 'function' ? v(base) : v;
}

export function runSensitivity<I>(inputs: I, metric: (i: I) => number, variables: SensitivityVariable<I>[]): SensitivityRow[] {
  const metricBase = metric(inputs);
  const rows: SensitivityRow[] = variables.map((v) => {
    const base = v.get(inputs);
    const low = resolve(v.low, base);
    const high = resolve(v.high, base);
    const metricLow = safeMetric(metric, v.set(inputs, low), metricBase);
    const metricHigh = safeMetric(metric, v.set(inputs, high), metricBase);
    const swing = Math.abs(metricHigh - metricLow);
    const flips = Math.sign(metricLow) !== Math.sign(metricHigh) && Math.abs(metricLow) > 0.01 && Math.abs(metricHigh) > 0.01;
    return { key: v.key, label: v.label, base, low, high, metricBase, metricLow, metricHigh, swing, flips, format: v.format, hint: v.hint };
  });
  rows.sort((x, y) => y.swing - x.swing);
  return rows;
}

function safeMetric<I>(metric: (i: I) => number, inputs: I, fallback: number): number {
  try {
    const v = metric(inputs);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export interface BreakEvenResult {
  /** Value at which the metric crosses zero, or null if none in bounds. */
  value: number | null;
  /** Whether the metric is positive above the break-even value. */
  positiveAbove: boolean | null;
  lo: number;
  hi: number;
}

/**
 * Find the value of one variable at which `metric` = 0 within [lo, hi].
 * Scans for a sign change (so non-monotonic models still find the crossing nearest the base value),
 * then bisects.
 */
export function findBreakEven<I>(
  inputs: I,
  metric: (i: I) => number,
  variable: SensitivityVariable<I>,
  bounds?: [number, number],
  steps = 24,
): BreakEvenResult {
  const [lo, hi] = bounds ?? variable.bounds ?? [resolve(variable.low, variable.get(inputs)), resolve(variable.high, variable.get(inputs))];
  if (!(hi > lo)) return { value: null, positiveAbove: null, lo, hi };
  const f = (x: number) => safeMetric(metric, variable.set(inputs, x), NaN);
  const base = variable.get(inputs);

  // Scan for bracket(s); choose the bracket closest to the base value.
  let best: [number, number] | null = null;
  let bestDist = Infinity;
  let prevX = lo;
  let prevF = f(lo);
  for (let i = 1; i <= steps; i++) {
    const x = lo + ((hi - lo) * i) / steps;
    const fx = f(x);
    if (Number.isFinite(prevF) && Number.isFinite(fx) && Math.sign(prevF) !== Math.sign(fx) && (prevF !== 0 || fx !== 0)) {
      const mid = (prevX + x) / 2;
      const dist = Math.abs(mid - base);
      if (dist < bestDist) {
        bestDist = dist;
        best = [prevX, x];
      }
    }
    prevX = x;
    prevF = fx;
  }
  if (!best) return { value: null, positiveAbove: null, lo, hi };

  let [a, b] = best;
  let fa = f(a);
  for (let i = 0; i < 60; i++) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (!Number.isFinite(fm)) break;
    if (Math.sign(fm) === Math.sign(fa)) {
      a = mid;
      fa = fm;
    } else {
      b = mid;
    }
    if (Math.abs(b - a) < 1e-7 * Math.max(1, Math.abs(hi - lo))) break;
  }
  const value = (a + b) / 2;
  const positiveAbove = f(Math.min(hi, value + (hi - lo) * 0.01)) > 0;
  return { value, positiveAbove, lo, hi };
}
