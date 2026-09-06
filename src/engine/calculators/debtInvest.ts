/**
 * Debt vs Invest engine.
 *
 * Both strategies deploy the same monthly budget (minimum payment + extra) for the whole horizon:
 *  - "Pay debt first": minimum + extra goes to the debt until it's gone, then the full budget is invested.
 *  - "Invest the extra": only the minimum goes to the debt; the extra is invested from day one.
 *    Once the debt is paid off on minimums alone, the freed-up minimum is invested too.
 * Net worth at the horizon = investments − remaining debt. Higher is better.
 *
 * Assumptions:
 * - Interest accrues monthly at APR / 12. Payments are applied at the end of each month.
 * - Investment return is an effective annual rate; no taxes or fees are modeled.
 * - The minimum payment is a fixed dollar amount (many cards use a percent of balance; use
 *   your current statement's minimum for a reasonable approximation).
 */

import { investMonthlyRate, pct } from '../core/money';
import { findBreakEven, runSensitivity, type SensitivityRow, type SensitivityVariable } from '../core/sensitivity';
import { fmtMoney, fmtNumber, fmtPct } from '../../lib/format';

export interface DebtInvestInputs {
  debtBalance: number;
  apr: number; // %
  minimumPayment: number;
  extraMonthly: number;
  investmentReturn: number; // %
  horizonYears: number;
}

export interface StrategyResult {
  key: 'payDebt' | 'invest';
  label: string;
  payoffMonth: number | null; // month index when balance hits zero (null if not within horizon)
  totalInterest: number;
  totalPaidToDebt: number;
  investmentBalance: number;
  investmentContributions: number;
  investmentGrowth: number;
  remainingDebt: number;
  netWorth: number;
  /** Per-month snapshots for charting: index 0..months */
  debtByMonth: number[];
  investByMonth: number[];
  netWorthByMonth: number[];
}

export interface DebtInvestResult {
  payDebt: StrategyResult;
  invest: StrategyResult;
  /** netWorth(invest) − netWorth(payDebt); positive means investing the extra is ahead. */
  difference: number;
  winner: 'payDebt' | 'invest' | 'tie';
  interestAvoided: number;
  monthsSaved: number | null;
  breakEvenReturn: number | null; // percent
  /** What the debt costs in total if you only ever pay the minimum (interest). */
  minimumOnlyInterest: number;
  minimumOnlyPayoffMonth: number | null;
  sensitivity: SensitivityRow[];
  returnScenarios: { returnPct: number; difference: number; winner: 'payDebt' | 'invest' | 'tie' }[];
  warnings: string[];
}

function simulate(i: DebtInvestInputs, strategy: 'payDebt' | 'invest'): StrategyResult {
  const months = Math.max(1, Math.round(i.horizonYears * 12));
  const r = pct(i.apr) / 12;
  const m = investMonthlyRate(pct(i.investmentReturn));
  const budget = Math.max(0, i.minimumPayment) + Math.max(0, i.extraMonthly);
  let debt = Math.max(0, i.debtBalance);
  let invest = 0;
  let contributions = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  let payoffMonth: number | null = debt <= 0 ? 0 : null;
  const debtByMonth = [debt];
  const investByMonth = [0];
  const netWorthByMonth = [-debt];

  for (let t = 1; t <= months; t++) {
    // Investment grows on last month's balance.
    invest *= 1 + m;
    let toDebt = 0;
    if (debt > 0) {
      const interest = debt * r;
      totalInterest += interest;
      debt += interest;
      const target = strategy === 'payDebt' ? budget : Math.max(0, i.minimumPayment);
      toDebt = Math.min(debt, target);
      debt -= toDebt;
      totalPaid += toDebt;
      if (debt <= 1e-6) {
        debt = 0;
        payoffMonth = t;
      }
    }
    const toInvest = Math.max(0, budget - toDebt);
    invest += toInvest;
    contributions += toInvest;
    debtByMonth.push(debt);
    investByMonth.push(invest);
    netWorthByMonth.push(invest - debt);
  }
  return {
    key: strategy,
    label: strategy === 'payDebt' ? 'Pay off debt first' : 'Invest the extra',
    payoffMonth,
    totalInterest,
    totalPaidToDebt: totalPaid,
    investmentBalance: invest,
    investmentContributions: contributions,
    investmentGrowth: invest - contributions,
    remainingDebt: debt,
    netWorth: invest - debt,
    debtByMonth,
    investByMonth,
    netWorthByMonth,
  };
}

export function debtInvestMetric(i: DebtInvestInputs): number {
  return simulate(i, 'invest').netWorth - simulate(i, 'payDebt').netWorth;
}

const set = (k: keyof DebtInvestInputs) => (i: DebtInvestInputs, v: number): DebtInvestInputs => ({ ...i, [k]: v });

export function debtInvestSensitivityVariables(): SensitivityVariable<DebtInvestInputs>[] {
  return [
    { key: 'investmentReturn', label: 'Investment return', get: (i) => i.investmentReturn, set: set('investmentReturn'), low: (b) => Math.max(0, b - 3), high: (b) => b + 3, format: (v) => `${fmtPct(v, 1)}/yr`, bounds: [0, 60] },
    { key: 'apr', label: 'Debt APR', get: (i) => i.apr, set: set('apr'), low: (b) => Math.max(0, b - 2), high: (b) => b + 2, format: (v) => fmtPct(v, 1), bounds: [0, 60] },
    { key: 'extraMonthly', label: 'Extra per month', get: (i) => i.extraMonthly, set: set('extraMonthly'), low: (b) => b * 0.5, high: (b) => b * 1.5, format: (v) => `${fmtMoney(v, 0)}/mo`, bounds: [0, 50000] },
    { key: 'horizonYears', label: 'Time horizon', get: (i) => i.horizonYears, set: set('horizonYears'), low: (b) => Math.max(1, Math.round(b * 0.5)), high: (b) => Math.min(40, Math.round(b * 1.5)), format: (v) => `${fmtNumber(v, 0)} yr`, bounds: [1, 40] },
  ];
}

export function computeDebtInvest(i: DebtInvestInputs): DebtInvestResult {
  const warnings: string[] = [];
  const monthlyInterest = (i.debtBalance * pct(i.apr)) / 12;
  if (i.debtBalance > 0 && i.minimumPayment <= monthlyInterest) {
    warnings.push(`Your minimum payment (${fmtMoney(i.minimumPayment, 0)}) doesn't cover the monthly interest (${fmtMoney(monthlyInterest, 0)}), so the balance grows if you only pay the minimum.`);
  }
  if (i.extraMonthly <= 0) warnings.push('Add an extra monthly amount to compare the two strategies.');

  const payDebt = simulate(i, 'payDebt');
  const invest = simulate(i, 'invest');
  const difference = invest.netWorth - payDebt.netWorth;
  const winner: DebtInvestResult['winner'] = Math.abs(difference) < 1 ? 'tie' : difference > 0 ? 'invest' : 'payDebt';
  const interestAvoided = invest.totalInterest - payDebt.totalInterest;
  const monthsSaved = payDebt.payoffMonth !== null && invest.payoffMonth !== null ? invest.payoffMonth - payDebt.payoffMonth : null;

  const minOnly = simulate({ ...i, extraMonthly: 0 }, 'payDebt');

  const vars = debtInvestSensitivityVariables();
  const returnVar = vars[0];
  const be = findBreakEven(i, debtInvestMetric, returnVar, [0, 60], 60);
  const breakEvenReturn = be.value;

  const sensitivity = runSensitivity(i, debtInvestMetric, vars);
  const returnScenarios = [4, 6, 8, 10, 12].map((rp) => {
    const d = debtInvestMetric({ ...i, investmentReturn: rp });
    return { returnPct: rp, difference: d, winner: (Math.abs(d) < 1 ? 'tie' : d > 0 ? 'invest' : 'payDebt') as DebtInvestResult['winner'] };
  });

  return {
    payDebt,
    invest,
    difference,
    winner,
    interestAvoided,
    monthsSaved,
    breakEvenReturn,
    minimumOnlyInterest: minOnly.totalInterest,
    minimumOnlyPayoffMonth: minOnly.payoffMonth,
    sensitivity,
    returnScenarios,
    warnings,
  };
}
