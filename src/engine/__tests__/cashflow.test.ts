import { describe, expect, it } from 'vitest';
import { compareCashflows, costToDate, detectCrossover, emptySeries, nominalCost, yearIndexOfMonth } from '../core/cashflow';
import { growLumpSum } from '../core/money';
import { findBreakEven, runSensitivity, type SensitivityVariable } from '../core/sensitivity';

describe('cashflow basics', () => {
  it('nominal cost = outflows − terminal value', () => {
    const s = emptySeries(12);
    s.outflows[0] = 1000;
    for (let t = 1; t <= 12; t++) s.outflows[t] = 100;
    s.exitValue[12] = 500;
    expect(nominalCost(s)).toBe(1000 + 1200 - 500);
  });
  it('cost-to-date subtracts the exit value at each point', () => {
    const s = emptySeries(2);
    s.outflows = [100, 10, 10];
    s.exitValue = [80, 70, 60];
    expect(costToDate(s)).toEqual([20, 40, 60]);
  });
  it('yearIndexOfMonth maps months 1-12 to 0 and 13-24 to 1', () => {
    expect(yearIndexOfMonth(1)).toBe(0);
    expect(yearIndexOfMonth(12)).toBe(0);
    expect(yearIndexOfMonth(13)).toBe(1);
    expect(yearIndexOfMonth(24)).toBe(1);
    expect(yearIndexOfMonth(0)).toBe(0);
  });
});

describe('compareCashflows', () => {
  it('identifies the cheaper option and the nominal difference', () => {
    const a = emptySeries(12);
    const b = emptySeries(12);
    a.outflows[0] = 10000;
    b.outflows[0] = 8000;
    const r = compareCashflows(a, b, 0.07);
    expect(r.cheaper).toBe('b');
    expect(r.nominalDifference).toBe(2000);
    // invest the $2,000 difference for a year at 7% → $2,140
    expect(r.wealthDifference).toBeCloseTo(growLumpSum(2000, 0.07, 1), 6);
    expect(r.invest.saver).toBe('b');
    expect(r.invest.milestones.map((m) => m.years)).toEqual([5, 10, 20, 30]);
    expect(r.invest.milestones[0].beyondHorizon).toBe(true);
    expect(r.invest.milestones[0].value).toBeCloseTo(growLumpSum(2000, 0.07, 5), 4);
    expect(r.invest.milestones[3].value).toBeCloseTo(growLumpSum(2000, 0.07, 30), 4);
    expect(r.invest.milestones[3].contributions).toBeCloseTo(2000, 8);
    expect(r.invest.milestones[3].growth).toBeCloseTo(growLumpSum(2000, 0.07, 30) - 2000, 4);
  });
  it('presents the invested pile from the winner perspective even when A wins', () => {
    const a = emptySeries(12);
    const b = emptySeries(12);
    a.outflows[0] = 8000;
    b.outflows[0] = 10000;
    const r = compareCashflows(a, b, 0.05);
    expect(r.cheaper).toBe('a');
    expect(r.invest.saver).toBe('a');
    expect(r.invest.balanceAtHorizon).toBeGreaterThan(0);
    expect(r.invest.milestones[0].value).toBeGreaterThan(0);
  });
  it('timing matters: paying later beats paying now when returns are positive', () => {
    // A pays $12,000 now; B pays $1,000/month for 12 months. Same nominal cost.
    const a = emptySeries(12);
    const b = emptySeries(12);
    a.outflows[0] = 12000;
    for (let t = 1; t <= 12; t++) b.outflows[t] = 1000;
    const r = compareCashflows(a, b, 0.07);
    expect(r.nominalDifference).toBeCloseTo(0, 8);
    expect(r.cheaper).toBe('tie');
    expect(r.wealthDifference).toBeGreaterThan(0); // B (pay later) ends up wealthier
  });
  it('terminal values flow into the wealth difference', () => {
    const a = emptySeries(12);
    const b = emptySeries(12);
    a.outflows[0] = 10000;
    b.outflows[0] = 10000;
    b.exitValue[12] = 3000;
    const r = compareCashflows(a, b, 0.07);
    expect(r.nominalDifference).toBe(3000);
    expect(r.wealthDifference).toBeCloseTo(3000, 8);
    expect(r.terminalB).toBe(3000);
  });
  it('throws on mismatched horizons', () => {
    expect(() => compareCashflows(emptySeries(12), emptySeries(24), 0.05)).toThrow();
  });
});

describe('detectCrossover', () => {
  it('finds the month the cheaper option flips', () => {
    // A: cheap upfront, expensive monthly. B: expensive upfront, cheap monthly.
    const ctdA = [0, 100, 200, 300, 400, 500];
    const ctdB = [250, 260, 270, 280, 290, 300];
    const x = detectCrossover(ctdA, ctdB);
    expect(x.cheaperAtStart).toBe('a');
    expect(x.cheaperAtEnd).toBe('b');
    expect(x.month).toBe(3);
    expect(x.stable).toBe(false);
  });
  it('reports stable when there is no flip', () => {
    const x = detectCrossover([0, 10, 20], [5, 15, 25]);
    expect(x.stable).toBe(true);
    expect(x.month).toBeNull();
  });
});

describe('sensitivity + break-even', () => {
  type I = { x: number; y: number };
  const metric = (i: I) => i.x * 2 - i.y; // zero when y = 2x
  const vars: SensitivityVariable<I>[] = [
    { key: 'x', label: 'X', get: (i) => i.x, set: (i, v) => ({ ...i, x: v }), low: (b) => b - 1, high: (b) => b + 1, format: String, bounds: [0, 100] },
    { key: 'y', label: 'Y', get: (i) => i.y, set: (i, v) => ({ ...i, y: v }), low: (b) => b - 1, high: (b) => b + 1, format: String, bounds: [0, 100] },
  ];
  it('ranks variables by swing', () => {
    const rows = runSensitivity({ x: 10, y: 5 }, metric, vars);
    expect(rows[0].key).toBe('x'); // ±1 in x swings metric by 4; y swings by 2
    expect(rows[0].swing).toBe(4);
    expect(rows[1].swing).toBe(2);
  });
  it('detects when the answer can flip', () => {
    const rows = runSensitivity({ x: 10, y: 19.5 }, metric, vars);
    expect(rows.find((r) => r.key === 'y')?.flips).toBe(true);
  });
  it('solves a break-even value by bisection', () => {
    const be = findBreakEven({ x: 10, y: 5 }, metric, vars[1]);
    expect(be.value).toBeCloseTo(20, 4);
    expect(be.positiveAbove).toBe(false); // metric = 20 − y, negative above 20
  });
  it('returns null when no crossing exists in bounds', () => {
    const be = findBreakEven({ x: 10, y: 5 }, (i) => i.x + i.y + 1, vars[1]);
    expect(be.value).toBeNull();
  });
});
