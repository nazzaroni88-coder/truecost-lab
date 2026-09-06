import { describe, expect, it } from 'vitest';
import { computePurchaseInvest, type PurchaseInvestInputs } from '../calculators/purchaseInvest';
import { computeCustom, computeCustomOption, type CustomInputs, type CustomOption } from '../calculators/custom';
import { growLumpSum, investMonthlyRate } from '../core/money';

describe('computePurchaseInvest', () => {
  const base: PurchaseInvestInputs = { oneTimeAmount: 10000, monthlyAmount: 0, monthlyYears: 0, investmentReturn: 7, inflation: 3, resaleValue: 0, resaleYear: 0 };
  it('a one-time amount grows like a lump sum', () => {
    const r = computePurchaseInvest(base);
    expect(r.totalSpent).toBe(10000);
    const m30 = r.milestones.find((m) => m.years === 30)!;
    expect(m30.value).toBeCloseTo(growLumpSum(10000, 0.07, 30), 4);
    expect(m30.contributions).toBe(10000);
    expect(m30.growth).toBeCloseTo(m30.value - 10000, 6);
    expect(m30.realValue).toBeCloseTo(m30.value / Math.pow(1.03, 30), 4);
    expect(r.multiplier30).toBeCloseTo(Math.pow(1.07, 30), 8);
  });
  it('recurring spending contributes monthly for the given years', () => {
    const r = computePurchaseInvest({ ...base, oneTimeAmount: 0, monthlyAmount: 100, monthlyYears: 5 });
    expect(r.totalSpent).toBe(6000);
    const m5 = r.milestones.find((m) => m.years === 5)!;
    const m = investMonthlyRate(0.07);
    const fv = (100 * (Math.pow(1 + m, 60) - 1)) / m;
    expect(m5.value).toBeCloseTo(fv, 4);
    expect(m5.contributions).toBe(6000);
    const m10 = r.milestones.find((m) => m.years === 10)!;
    expect(m10.contributions).toBe(6000); // no more contributions after year 5
    expect(m10.value).toBeCloseTo(fv * Math.pow(1.07, 5), 3);
  });
  it('resale value reduces the opportunity cost from the resale year on', () => {
    const r = computePurchaseInvest({ ...base, resaleValue: 4000, resaleYear: 5 });
    const m5 = r.milestones.find((m) => m.years === 5)!;
    expect(m5.netOfResale).toBeCloseTo(m5.value - 4000, 6);
    const m10 = r.milestones.find((m) => m.years === 10)!;
    expect(m10.netOfResale).toBeCloseTo(m10.value - 4000 * Math.pow(1.07, 5), 3);
  });
  it('zero spend warns and returns zeros', () => {
    const r = computePurchaseInvest({ ...base, oneTimeAmount: 0 });
    expect(r.warnings.length).toBe(1);
    expect(r.milestones.every((m) => m.value === 0)).toBe(true);
  });
  it('0% return yields no growth', () => {
    const r = computePurchaseInvest({ ...base, investmentReturn: 0 });
    expect(r.milestones.every((m) => Math.abs(m.growth) < 1e-9)).toBe(true);
  });
});

describe('computeCustom', () => {
  const opt = (over: Partial<CustomOption>): CustomOption => ({
    name: 'Opt',
    upfront: 0,
    monthly: 0,
    annual: 0,
    oneTime: [],
    monthlySavings: 0,
    annualSavings: 0,
    resaleValue: 0,
    lifespanYears: 0,
    ...over,
  });
  const inputs = (a: Partial<CustomOption>, b: Partial<CustomOption>, over: Partial<CustomInputs> = {}): CustomInputs => ({
    a: opt({ name: 'A', ...a }),
    b: opt({ name: 'B', ...b }),
    horizonYears: 10,
    investmentReturn: 7,
    inflation: 0,
    growWithInflation: true,
    ...over,
  });

  it('sums upfront + monthly + annual − resale', () => {
    const r = computeCustomOption(opt({ upfront: 1000, monthly: 10, annual: 100, resaleValue: 200 }), inputs({}, {}));
    expect(r.totalCost).toBeCloseTo(1000 + 1200 + 1000 - 200, 6);
    expect(r.terminalValue).toBeCloseTo(200, 6);
  });
  it('one-time future costs land in the right year', () => {
    const i = inputs({ upfront: 0, oneTime: [{ id: '1', label: 'Battery', amount: 500, year: 3 }] }, {});
    const r = computeCustomOption(i.a, i);
    expect(r.series.outflows[36]).toBeCloseTo(500, 8);
    expect(r.oneTime).toBe(500);
  });
  it('savings offset costs', () => {
    const i = inputs({ monthly: 100, monthlySavings: 30 }, {});
    const r = computeCustomOption(i.a, i);
    expect(r.totalCost).toBeCloseTo(70 * 120, 6);
  });
  it('lifespan shorter than horizon triggers replacements', () => {
    // $1000 item lasting 5 years over a 10-year horizon at 0% inflation: buy twice, resale $100 each at end.
    const i = inputs({ upfront: 1000, lifespanYears: 5, resaleValue: 100 }, {});
    const r = computeCustomOption(i.a, i);
    expect(r.replacements).toBeCloseTo(900, 6); // second unit net of first resale
    expect(r.terminalValue).toBeCloseTo(100, 6);
    expect(r.totalCost).toBeCloseTo(1000 + 900 - 100, 6);
  });
  it('exit value is the stated resale value at any point (upfront is otherwise sunk)', () => {
    const i = inputs({ upfront: 1000, lifespanYears: 10, resaleValue: 200 }, {}, { horizonYears: 5 });
    const r = computeCustomOption(i.a, i);
    expect(r.terminalValue).toBeCloseTo(200, 6);
    expect(r.series.exitValue[1]).toBeCloseTo(200, 6);
    // Replacement cycle: with 5% inflation and a 2-year lifespan over 5 years, the third unit is owned at the end.
    const j = inputs({ upfront: 1000, lifespanYears: 2, resaleValue: 200 }, {}, { horizonYears: 5, inflation: 5 });
    const r2 = computeCustomOption(j.a, j);
    expect(r2.terminalValue).toBeCloseTo(200 * Math.pow(1.05, 4), 6);
    expect(r2.series.exitValue[24]).toBeCloseTo(200 * Math.pow(1.05, 2), 6); // just bought unit 2
    expect(r2.series.exitValue[23]).toBeCloseTo(200, 6); // still on unit 1
    // Horizon landing exactly on a lifespan end: no replacement is bought.
    const k = inputs({ upfront: 1000, lifespanYears: 2, resaleValue: 200 }, {}, { horizonYears: 4, inflation: 5 });
    const r3 = computeCustomOption(k.a, k);
    expect(r3.terminalValue).toBeCloseTo(200 * Math.pow(1.05, 2), 6);
    expect(r3.replacements).toBeCloseTo(1000 * Math.pow(1.05, 2) - 200, 6);
  });
  it('payback: pricier upfront option crosses over once savings accumulate', () => {
    // A: nothing upfront, $150/mo. B: $10,000 upfront, $0/mo → pays back after 66.7 months.
    const r = computeCustom(inputs({ monthly: 150 }, { upfront: 10000 }));
    expect(r.comparison.cheaper).toBe('b');
    expect(r.comparison.crossover.month).toBe(67);
  });
  it('inflation grows monthly costs only when enabled', () => {
    const on = computeCustomOption(opt({ monthly: 100 }), inputs({}, {}, { inflation: 5, growWithInflation: true }));
    const off = computeCustomOption(opt({ monthly: 100 }), inputs({}, {}, { inflation: 5, growWithInflation: false }));
    expect(on.monthly).toBeGreaterThan(off.monthly);
    expect(off.monthly).toBeCloseTo(12000, 6);
  });
  it('compares two options and finds the crossover', () => {
    // A: cheap upfront, pricey monthly. B: pricey upfront, cheap monthly.
    const r = computeCustom(inputs({ upfront: 100, monthly: 50 }, { upfront: 2000, monthly: 10 }));
    expect(r.comparison.cheaper).toBe('b');
    expect(r.comparison.crossover.month).toBe(48); // (2000 − 100) / 40 = 47.5 → B cheaper from month 48
    expect(r.breakEvens[0].key).toBe('crossover');
    expect(r.sensitivity.length).toBeGreaterThan(0);
  });
});
