import { describe, expect, it } from 'vitest';
import { computeDebtInvest, debtInvestMetric, type DebtInvestInputs } from '../calculators/debtInvest';

const base: DebtInvestInputs = {
  debtBalance: 20000,
  apr: 9,
  minimumPayment: 300,
  extraMonthly: 400,
  investmentReturn: 7,
  horizonYears: 10,
};

describe('computeDebtInvest', () => {
  it('pay-debt-first pays off sooner and pays less interest', () => {
    const r = computeDebtInvest(base);
    expect(r.payDebt.payoffMonth).not.toBeNull();
    expect(r.invest.payoffMonth).not.toBeNull();
    expect(r.payDebt.payoffMonth!).toBeLessThan(r.invest.payoffMonth!);
    expect(r.payDebt.totalInterest).toBeLessThan(r.invest.totalInterest);
    expect(r.interestAvoided).toBeCloseTo(r.invest.totalInterest - r.payDebt.totalInterest, 8);
    expect(r.monthsSaved).toBe(r.invest.payoffMonth! - r.payDebt.payoffMonth!);
  });
  it('both strategies deploy the same total cash', () => {
    const r = computeDebtInvest(base);
    const budget = 700 * 120;
    expect(r.payDebt.totalPaidToDebt + r.payDebt.investmentContributions).toBeCloseTo(budget, 4);
    expect(r.invest.totalPaidToDebt + r.invest.investmentContributions).toBeCloseTo(budget, 4);
  });
  it('a 9% guaranteed cost beats a 7% expected return', () => {
    const r = computeDebtInvest(base);
    expect(r.winner).toBe('payDebt');
    expect(r.difference).toBeLessThan(0);
  });
  it('break-even return is approximately the debt APR', () => {
    const r = computeDebtInvest(base);
    expect(r.breakEvenReturn).not.toBeNull();
    // Effective annual vs nominal monthly compounding: (1 + 0.09/12)^12 − 1 ≈ 9.38%
    expect(r.breakEvenReturn!).toBeGreaterThan(8.8);
    expect(r.breakEvenReturn!).toBeLessThan(9.8);
  });
  it('investing wins when the return clearly exceeds the APR', () => {
    const d = debtInvestMetric({ ...base, apr: 3, investmentReturn: 8 });
    expect(d).toBeGreaterThan(0);
  });
  it('warns when the minimum does not cover interest', () => {
    const r = computeDebtInvest({ ...base, apr: 24, minimumPayment: 100 });
    expect(r.warnings.some((w) => w.includes("doesn't cover"))).toBe(true);
    expect(r.invest.payoffMonth).toBeNull();
    expect(r.invest.remainingDebt).toBeGreaterThan(20000);
  });
  it('zero debt: both strategies just invest the budget', () => {
    const r = computeDebtInvest({ ...base, debtBalance: 0 });
    expect(r.payDebt.payoffMonth).toBe(0);
    expect(r.payDebt.netWorth).toBeCloseTo(r.invest.netWorth, 6);
    expect(r.winner).toBe('tie');
  });
  it('0% APR debt: investing wins with any positive return', () => {
    const r = computeDebtInvest({ ...base, apr: 0 });
    expect(r.winner).toBe('invest');
    expect(r.payDebt.totalInterest).toBe(0);
  });
  it('interest on $20k at 9% for the first month is $150', () => {
    const r = computeDebtInvest({ ...base, horizonYears: 1 });
    // debt after month 1 with pay-debt: 20000 + 150 − 700
    expect(r.payDebt.debtByMonth[1]).toBeCloseTo(19450, 6);
  });
  it('return scenarios span the winner flip', () => {
    const r = computeDebtInvest(base);
    // Length is not fixed: the user's own return joins the sampled set unless it is already one of
    // the fixed points, so this asserts the property that matters — the range brackets the flip —
    // rather than a count that changes with the inputs.
    expect(r.returnScenarios.length).toBeGreaterThanOrEqual(5);
    expect(r.returnScenarios[0].winner).toBe('payDebt');
    expect(r.returnScenarios[r.returnScenarios.length - 1].winner).toBe('invest');
    expect(r.returnScenarios.map((s) => s.returnPct)).toContain(base.investmentReturn);
  });
});

describe('the return-scenarios table always contains the reader', () => {
  const base = {
    debtBalance: 40000,
    apr: 7.3,
    minimumPayment: 400,
    extraMonthly: 500,
    investmentReturn: 7,
    horizonYears: 10,
  } as Parameters<typeof computeDebtInvest>[0];

  it("includes the user's own expected return, which the fixed samples missed", () => {
    // 7% is the app's default, and the fixed set is [4,6,8,10,12] — so before this the table had no
    // row matching the reader and the "you are here" marker could never fire at default settings.
    const r = computeDebtInvest(base);
    const rates = r.returnScenarios.map((s) => s.returnPct);
    expect(rates).toContain(7);
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
  });

  it('does not duplicate a return that is already one of the fixed samples', () => {
    const r = computeDebtInvest({ ...base, investmentReturn: 8 });
    const rates = r.returnScenarios.map((s) => s.returnPct);
    expect(rates).toEqual([4, 6, 8, 10, 12]);
    expect(new Set(rates).size).toBe(rates.length);
  });

  it('keeps the exact value so the UI can match it, not a rounded one', () => {
    const r = computeDebtInvest({ ...base, investmentReturn: 7.25 });
    expect(r.returnScenarios.map((s) => s.returnPct)).toContain(7.25);
  });

  it("the row for the user's rate agrees with the headline result", () => {
    // The sampled row at the user's own return must be the same comparison the answer reports,
    // otherwise the table would quietly contradict the headline.
    const r = computeDebtInvest(base);
    const own = r.returnScenarios.find((s) => s.returnPct === 7)!;
    expect(own.difference).toBeCloseTo(r.difference, 6);
    expect(own.winner).toBe(r.winner);
  });
});
