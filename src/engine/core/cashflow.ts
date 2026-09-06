/**
 * Uniform cash-flow model shared by every TrueCost calculator.
 *
 * Every option a user compares is reduced to:
 *  - a series of monthly cash outflows (index 0 = money paid up front, index t = end of month t)
 *  - an optional per-category split of those outflows (for "why" breakdowns)
 *  - the net value you would walk away with if you exited at each month (e.g. resale value
 *    minus loan payoff, or home equity minus selling costs)
 *
 * From that, the comparison engine derives nominal totals, cost-to-date curves, crossover
 * (break-even) timing, and the signature "what if I invested the difference" projection.
 */

import { investMonthlyRate, projectInvestment, sum } from './money';

export interface CashflowSeries {
  /** Number of months in the analysis horizon. */
  months: number;
  /** outflows[t], t in 0..months. Positive = money leaving your pocket. */
  outflows: number[];
  /**
   * Net amount you'd receive if you exited at month t (0..months). For an asset: resale value
   * minus remaining loan. For a pure expense (rent): zeros. exitValue[months] is the terminal value.
   */
  exitValue: number[];
  /** Optional named category totals over the whole horizon. Must sum to nominal cost. */
  categories?: CategoryTotal[];
}

export interface CategoryTotal {
  key: string;
  label: string;
  amount: number;
  /** Whether this is a recoverable / equity-like amount (shown differently). */
  kind?: 'cost' | 'recovered';
}

export interface CostCurvePoint {
  month: number;
  year: number;
  /** Money spent so far minus what you'd get back if you exited now. */
  a: number;
  b: number;
}

export interface CrossoverInfo {
  /** Month index of the last time the cheaper option changed, or null if no change. */
  month: number | null;
  year: number | null;
  /** Which option is cheaper at the horizon on a cost-to-date basis. */
  cheaperAtEnd: 'a' | 'b' | 'tie';
  /** Which option is cheaper at the very start (upfront only). */
  cheaperAtStart: 'a' | 'b' | 'tie';
  /** True if the cheaper option never changes across the horizon. */
  stable: boolean;
}

export interface InvestDifferenceProjection {
  /** Effective annual return used. */
  annualReturn: number;
  /** Which option is the "saver" (the one that spends less and invests the difference). */
  saver: 'a' | 'b' | 'tie';
  /** Value of the invested differences at the horizon (before adding terminal values). */
  balanceAtHorizon: number;
  /** Net contributions (differences in cash outflow, summed). */
  contributionsAtHorizon: number;
  growthAtHorizon: number;
  /** Projection to fixed milestones (5, 10, 20, 30 years). Includes terminal-value difference once reached. */
  milestones: InvestMilestone[];
  /** Balance of the difference account for each month (0..months). */
  balances: number[];
}

export interface InvestMilestone {
  years: number;
  /** Whether this milestone is beyond the decision horizon (pure growth after that). */
  beyondHorizon: boolean;
  value: number;
  contributions: number;
  growth: number;
}

export interface ComparisonResult {
  months: number;
  years: number;
  nominalA: number;
  nominalB: number;
  /** nominalA - nominalB. Positive means B is cheaper (A costs more). */
  nominalDifference: number;
  cheaper: 'a' | 'b' | 'tie';
  /** Wealth-based difference including invested differences and terminal values. Positive = B leaves you wealthier. */
  wealthDifference: number;
  curve: CostCurvePoint[];
  crossover: CrossoverInfo;
  invest: InvestDifferenceProjection;
  totalOutflowsA: number;
  totalOutflowsB: number;
  terminalA: number;
  terminalB: number;
}

export const MILESTONE_YEARS = [5, 10, 20, 30] as const;

/** Total nominal cost = all money out minus what you get back at the end. */
export function nominalCost(s: CashflowSeries): number {
  return sum(s.outflows) - (s.exitValue[s.months] ?? 0);
}

/** Cost-to-date at each month (money spent so far minus exit value now). */
export function costToDate(s: CashflowSeries): number[] {
  const out: number[] = new Array(s.months + 1);
  let spent = 0;
  for (let t = 0; t <= s.months; t++) {
    spent += s.outflows[t] ?? 0;
    out[t] = spent - (s.exitValue[t] ?? 0);
  }
  return out;
}

function tieAware(diff: number, tol = 0.5): 'a' | 'b' | 'tie' {
  if (Math.abs(diff) <= tol) return 'tie';
  return diff > 0 ? 'b' : 'a';
}

/**
 * Compare two options with the same horizon.
 * Invests the month-by-month difference in outflows at `annualReturn` to produce the
 * "what if I invested the difference" projection.
 */
export function compareCashflows(a: CashflowSeries, b: CashflowSeries, annualReturn: number): ComparisonResult {
  if (a.months !== b.months) throw new Error('Cashflow horizons must match');
  const months = a.months;
  const years = months / 12;
  const nominalA = nominalCost(a);
  const nominalB = nominalCost(b);
  const nominalDifference = nominalA - nominalB;
  const cheaper = tieAware(nominalDifference);

  // Cost-to-date curves and crossover detection.
  const ctdA = costToDate(a);
  const ctdB = costToDate(b);
  const curve: CostCurvePoint[] = [];
  for (let t = 0; t <= months; t++) curve.push({ month: t, year: t / 12, a: ctdA[t], b: ctdB[t] });
  const crossover = detectCrossover(ctdA, ctdB);

  // Invest the difference: d[t] = outflowA - outflowB (positive → B's chooser has spare cash to invest)
  const diffs: number[] = new Array(months + 1);
  for (let t = 0; t <= months; t++) diffs[t] = (a.outflows[t] ?? 0) - (b.outflows[t] ?? 0);
  const proj = projectInvestment(diffs, annualReturn, months);
  const terminalA = a.exitValue[months] ?? 0;
  const terminalB = b.exitValue[months] ?? 0;
  const terminalDiff = terminalB - terminalA; // positive → B gets more back at the end
  const wealthDifference = proj.finalBalance + terminalDiff;
  const saver = tieAware(wealthDifference);

  // Sign convention for presenting the invested pile: always show it from the winner's perspective.
  const sign = saver === 'a' ? -1 : 1;
  const m = investMonthlyRate(annualReturn);
  const milestones: InvestMilestone[] = MILESTONE_YEARS.map((y) => {
    const t = y * 12;
    if (t <= months) {
      // Inside the horizon: the advantage if you exited at this point (invested differences + exit-value difference now).
      const exitDiffT = (b.exitValue[t] ?? 0) - (a.exitValue[t] ?? 0);
      const val = proj.balances[t] + exitDiffT;
      const contrib = sum(diffs.slice(0, t + 1)) + exitDiffT;
      return { years: y, beyondHorizon: false, value: sign * val, contributions: sign * contrib, growth: sign * (val - contrib) };
    }
    const extra = t - months;
    const val = wealthDifference * Math.pow(1 + m, extra);
    const contrib = sum(diffs) + terminalDiff;
    return { years: y, beyondHorizon: true, value: sign * val, contributions: sign * contrib, growth: sign * (val - contrib) };
  });

  const invest: InvestDifferenceProjection = {
    annualReturn,
    saver,
    balanceAtHorizon: sign * wealthDifference,
    contributionsAtHorizon: sign * (sum(diffs) + terminalDiff),
    growthAtHorizon: sign * (wealthDifference - (sum(diffs) + terminalDiff)),
    milestones,
    balances: proj.balances.map((v) => sign * v),
  };

  return {
    months,
    years,
    nominalA,
    nominalB,
    nominalDifference,
    cheaper,
    wealthDifference,
    curve,
    crossover,
    invest,
    totalOutflowsA: sum(a.outflows),
    totalOutflowsB: sum(b.outflows),
    terminalA,
    terminalB,
  };
}

export function detectCrossover(ctdA: number[], ctdB: number[]): CrossoverInfo {
  const n = ctdA.length - 1;
  const at = (t: number) => tieAware(ctdA[t] - ctdB[t], 1);
  const cheaperAtStart = at(0);
  const cheaperAtEnd = at(n);
  let lastChange: number | null = null;
  let prev = cheaperAtStart;
  for (let t = 1; t <= n; t++) {
    const cur = at(t);
    if (cur !== 'tie' && prev !== 'tie' && cur !== prev) lastChange = t;
    if (cur !== 'tie') prev = cur;
  }
  // If the end state differs from the start, the last change is the meaningful "becomes cheaper after" point.
  return {
    month: lastChange,
    year: lastChange === null ? null : lastChange / 12,
    cheaperAtEnd,
    cheaperAtStart,
    stable: lastChange === null,
  };
}

/** Utility: build an empty series of a given length. */
export function emptySeries(months: number): CashflowSeries {
  return { months, outflows: new Array(months + 1).fill(0), exitValue: new Array(months + 1).fill(0) };
}

/** Utility: month t → 0-based year index (months 1-12 → 0). */
export function yearIndexOfMonth(t: number): number {
  return Math.max(0, Math.ceil(t / 12) - 1);
}
