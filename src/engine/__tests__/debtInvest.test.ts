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
    expect(r.returnScenarios).toHaveLength(5);
    expect(r.returnScenarios[0].winner).toBe('payDebt');
    expect(r.returnScenarios[4].winner).toBe('invest');
  });
});
