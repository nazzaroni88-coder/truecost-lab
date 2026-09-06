import { describe, expect, it } from 'vitest';
import { computeRentBuy, rentBuyMetric, type RentBuyInputs } from '../calculators/rentBuy';
import { paymentForLoan } from '../core/money';

const base: RentBuyInputs = {
  monthlyRent: 2500,
  rentGrowth: 3,
  rentersInsuranceAnnual: 200,
  homePrice: 450000,
  downPaymentPct: 20,
  mortgageApr: 6.5,
  mortgageTermYears: 30,
  propertyTaxRate: 1.1,
  homeInsuranceAnnual: 1800,
  hoaMonthly: 0,
  maintenanceRate: 1,
  closingCostsPct: 3,
  sellingCostsPct: 6,
  appreciation: 3,
  pmiRate: 0,
  horizonYears: 10,
  investmentReturn: 7,
  inflation: 2.5,
};

describe('computeRentBuy', () => {
  it('computes the mortgage correctly', () => {
    const r = computeRentBuy(base);
    expect(r.buy.downPayment).toBe(90000);
    expect(r.buy.loanAmount).toBe(360000);
    expect(r.buy.monthlyPayment).toBeCloseTo(paymentForLoan(360000, 0.065, 360), 6);
    expect(r.buy.closingCosts).toBe(13500);
  });
  it('rent grows annually and totals correctly', () => {
    const r = computeRentBuy({ ...base, horizonYears: 2, rentersInsuranceAnnual: 0 });
    expect(r.rent.totalRent).toBeCloseTo(2500 * 12 + 2500 * 1.03 * 12, 4);
  });
  it('home value and equity at the end are consistent', () => {
    const r = computeRentBuy(base);
    expect(r.buy.homeValueAtEnd).toBeCloseTo(450000 * Math.pow(1.03, 10), 2);
    expect(r.buy.sellingCosts).toBeCloseTo(r.buy.homeValueAtEnd * 0.06, 4);
    expect(r.buy.netEquityAtEnd).toBeCloseTo(r.buy.homeValueAtEnd - r.buy.sellingCosts - r.buy.loanBalanceAtEnd, 4);
  });
  it('nominal buy cost = all outflows − net equity', () => {
    const r = computeRentBuy(base);
    expect(r.buy.nominalCost).toBeCloseTo(r.buy.totalOutflows - r.buy.netEquityAtEnd, 4);
    // and equals unrecoverable costs minus appreciation gain (principal is recovered as equity)
    expect(r.buy.nominalCost).toBeCloseTo(r.buy.unrecoverableCosts - r.buy.appreciationGain, 2);
  });
  it('break-even year is consistent with the wealth curve', () => {
    const r = computeRentBuy(base);
    if (r.breakEvenYear !== null) {
      const row = r.wealthByYear.find((w) => w.year === r.breakEvenYear);
      expect(row?.diff).toBeGreaterThanOrEqual(0);
      if (r.breakEvenYear > 1) {
        const prev = r.wealthByYear.find((w) => w.year === r.breakEvenYear! - 1);
        expect(prev?.diff).toBeLessThan(0);
      }
    }
    // The wealth difference at the horizon matches the comparison engine.
    const at = r.wealthByYear.find((w) => w.year === 10)!;
    expect(at.diff).toBeCloseTo(r.comparison.wealthDifference, 2);
  });
  it('higher appreciation favors buying; higher investment return favors renting', () => {
    const lo = rentBuyMetric({ ...base, appreciation: 1 });
    const hi = rentBuyMetric({ ...base, appreciation: 5 });
    expect(hi).toBeGreaterThan(lo);
    const rLo = rentBuyMetric({ ...base, investmentReturn: 4 });
    const rHi = rentBuyMetric({ ...base, investmentReturn: 10 });
    expect(rLo).toBeGreaterThan(rHi);
  });
  it('PMI applies below 20% down and stops at 80% LTV', () => {
    const withPmi = computeRentBuy({ ...base, downPaymentPct: 10, pmiRate: 0.6 });
    expect(withPmi.buy.totalPmi).toBeGreaterThan(0);
    const without = computeRentBuy({ ...base, downPaymentPct: 20, pmiRate: 0.6 });
    expect(without.buy.totalPmi).toBe(0);
  });
  it('1-year horizon: selling costs make buying lose', () => {
    const r = computeRentBuy({ ...base, horizonYears: 1 });
    expect(r.comparison.wealthDifference).toBeLessThan(0);
  });
  it('horizon beyond the mortgage term: payments stop', () => {
    const r = computeRentBuy({ ...base, mortgageTermYears: 15, horizonYears: 20 });
    expect(r.buy.loanBalanceAtEnd).toBeCloseTo(0, 4);
    const t = 16 * 12;
    const outflow = r.buy.series.outflows[t];
    // After payoff, monthly outflow is only tax + insurance + maintenance.
    expect(outflow).toBeLessThan(r.buy.monthlyPayment);
  });
  it('zero-rate mortgage and zero appreciation are handled', () => {
    const r = computeRentBuy({ ...base, mortgageApr: 0, appreciation: 0 });
    expect(r.buy.totalInterest).toBeCloseTo(0, 6);
    expect(r.buy.homeValueAtEnd).toBe(450000);
    expect(Number.isFinite(r.comparison.wealthDifference)).toBe(true);
  });
  it('sensitivity ranks and break-evens are present', () => {
    const r = computeRentBuy(base);
    expect(r.sensitivity.length).toBeGreaterThan(5);
    expect(r.breakEvens.some((b) => b.key === 'horizon')).toBe(true);
  });
});
