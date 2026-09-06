import { describe, expect, it } from 'vitest';
import {
  amortizationSchedule,
  growLumpSum,
  inflate,
  investMonthlyRate,
  paymentForLoan,
  projectInvestment,
  remainingBalance,
  toTodaysDollars,
  totalInterest,
} from '../core/money';

describe('paymentForLoan', () => {
  it('matches the textbook amortization payment', () => {
    // $30,000 at 6% for 60 months → $579.98
    expect(paymentForLoan(30000, 0.06, 60)).toBeCloseTo(579.98, 2);
    // $400,000 mortgage at 6.5% for 360 months → $2,528.27
    expect(paymentForLoan(400000, 0.065, 360)).toBeCloseTo(2528.27, 2);
  });
  it('handles 0% APR as simple division', () => {
    expect(paymentForLoan(12000, 0, 24)).toBe(500);
  });
  it('returns 0 for zero principal or term', () => {
    expect(paymentForLoan(0, 0.05, 60)).toBe(0);
    expect(paymentForLoan(1000, 0.05, 0)).toBe(0);
  });
});

describe('amortizationSchedule', () => {
  it('pays the loan to exactly zero with interest summing correctly', () => {
    const rows = amortizationSchedule(30000, 0.06, 60);
    expect(rows).toHaveLength(60);
    expect(rows[59].balance).toBeCloseTo(0, 6);
    const interest = rows.reduce((p, r) => p + r.interest, 0);
    const principal = rows.reduce((p, r) => p + r.principal, 0);
    expect(principal).toBeCloseTo(30000, 4);
    expect(interest).toBeCloseTo(4799.04, 0); // 579.98 * 60 - 30000 ≈ 4,798.8
    expect(rows[0].interest).toBeCloseTo(150, 6); // 30000 * 0.005
  });
  it('remainingBalance closed form agrees with the schedule', () => {
    const rows = amortizationSchedule(250000, 0.07, 360);
    expect(remainingBalance(250000, 0.07, 360, 60)).toBeCloseTo(rows[59].balance, 4);
    expect(remainingBalance(250000, 0.07, 360, 360)).toBe(0);
    expect(remainingBalance(250000, 0.07, 360, 0)).toBe(250000);
  });
  it('totalInterest through N months agrees with the schedule', () => {
    const rows = amortizationSchedule(250000, 0.07, 360);
    const first60 = rows.slice(0, 60).reduce((p, r) => p + r.interest, 0);
    expect(totalInterest(250000, 0.07, 360, 60)).toBeCloseTo(first60, 4);
  });
  it('0% loans have zero interest', () => {
    const rows = amortizationSchedule(12000, 0, 24);
    expect(rows.every((r) => r.interest === 0)).toBe(true);
    expect(rows[23].balance).toBeCloseTo(0, 8);
  });
});

describe('investment growth', () => {
  it('effective annual rate: a lump sum grows by exactly r per year', () => {
    expect(growLumpSum(10000, 0.07, 10)).toBeCloseTo(19671.51, 2);
    const m = investMonthlyRate(0.07);
    expect(Math.pow(1 + m, 12)).toBeCloseTo(1.07, 10);
  });
  it('projectInvestment with only an upfront amount equals growLumpSum', () => {
    const p = projectInvestment([10000], 0.07, 120);
    expect(p.finalBalance).toBeCloseTo(growLumpSum(10000, 0.07, 10), 6);
    expect(p.totalContributions).toBe(10000);
    expect(p.totalGrowth).toBeCloseTo(9671.51, 2);
  });
  it('monthly contributions at 0% return just sum', () => {
    const contributions = [0, ...new Array(120).fill(100)];
    const p = projectInvestment(contributions, 0);
    expect(p.finalBalance).toBeCloseTo(12000, 8);
    expect(p.totalGrowth).toBeCloseTo(0, 8);
  });
  it('monthly contributions match the ordinary annuity future value formula', () => {
    const contributions = [0, ...new Array(360).fill(500)];
    const p = projectInvestment(contributions, 0.07);
    const m = investMonthlyRate(0.07);
    const fv = (500 * (Math.pow(1 + m, 360) - 1)) / m;
    expect(p.finalBalance).toBeCloseTo(fv, 4);
  });
  it('withdrawals reduce the balance', () => {
    const p = projectInvestment([1000, -500], 0);
    expect(p.finalBalance).toBe(500);
  });
});

describe('inflation helpers', () => {
  it('inflate and deflate are inverses', () => {
    const future = inflate(1000, 0.03, 10);
    expect(toTodaysDollars(future, 0.03, 10)).toBeCloseTo(1000, 8);
  });
  it('year 0 is not inflated', () => {
    expect(inflate(1000, 0.03, 0)).toBe(1000);
  });
});
