/**
 * Large Purchase vs Invest engine ("opportunity cost of spending").
 *
 * A purchase can be a one-time amount, a recurring monthly amount for a number of years, or both.
 * We project what the same money would become if invested instead, at 5/10/20/30 years, and split
 * contributions from growth. If the purchase keeps some resale value, that is subtracted from the
 * opportunity cost at the year it would be sold.
 *
 * Assumptions:
 * - The one-time amount is invested immediately; recurring amounts at the end of each month.
 * - Values are nominal; the "today's dollars" view deflates by the inflation assumption.
 * - No taxes on investment gains are modeled.
 */

import { investMonthlyRate, pct, projectInvestment, toTodaysDollars } from '../core/money';
import { MILESTONE_YEARS } from '../core/cashflow';
import { fmtMoney } from '../../lib/format';

export interface PurchaseInvestInputs {
  oneTimeAmount: number;
  monthlyAmount: number;
  monthlyYears: number; // how long the recurring spend lasts
  investmentReturn: number; // %
  inflation: number; // %
  resaleValue: number; // what you could sell the purchase for
  resaleYear: number; // when you'd sell it
}

export interface PurchaseMilestone {
  years: number;
  value: number; // nominal future value of the money if invested
  contributions: number;
  growth: number;
  realValue: number; // today's dollars
  /** Value net of the purchase's resale value (if sold by then, grown at the same return afterward). */
  netOfResale: number;
}

export interface PurchaseInvestResult {
  totalSpent: number;
  milestones: PurchaseMilestone[];
  /** Balance per month to 30 years, for charting. */
  balances: number[];
  /** For a $1 today, the multiplier at 30 years. */
  multiplier30: number;
  /** Monthly savings that would grow to the same 30-year value — a "what it's worth" framing. */
  equivalentMonthlyOver30: number;
  warnings: string[];
}

const HORIZON_MONTHS = 30 * 12;

export function computePurchaseInvest(i: PurchaseInvestInputs): PurchaseInvestResult {
  const warnings: string[] = [];
  const r = pct(i.investmentReturn);
  const contributions: number[] = new Array(HORIZON_MONTHS + 1).fill(0);
  contributions[0] = Math.max(0, i.oneTimeAmount);
  const recurringMonths = Math.min(HORIZON_MONTHS, Math.max(0, Math.round(i.monthlyYears * 12)));
  for (let t = 1; t <= recurringMonths; t++) contributions[t] = Math.max(0, i.monthlyAmount);
  const proj = projectInvestment(contributions, r, HORIZON_MONTHS);
  const totalSpent = contributions.reduce((p, c) => p + c, 0);
  if (totalSpent <= 0) warnings.push('Enter a one-time amount or a monthly amount to see the projection.');
  // A monthly amount with no duration would otherwise vanish from the model without a word.
  if (i.monthlyAmount > 0 && recurringMonths === 0) warnings.push(`Your ${fmtMoney(i.monthlyAmount)}/month amount is not counted because "for how long" is set to 0 years. Set the number of years it continues.`);

  const resaleYear = Math.max(0, i.resaleYear);
  // You cannot get back more than you put in, so a resale above the amount spent is capped
  // rather than producing a nonsensical negative opportunity cost.
  const resaleRequested = Math.max(0, i.resaleValue);
  const resale = Math.min(resaleRequested, totalSpent);
  if (resaleRequested > totalSpent + 0.5) warnings.push(`A resale value of ${fmtMoney(resaleRequested)} is more than the ${fmtMoney(totalSpent)} you would spend, so we capped it at what you paid.`);
  const m = investMonthlyRate(r);
  const milestones: PurchaseMilestone[] = MILESTONE_YEARS.map((y) => {
    const t = y * 12;
    const value = proj.balances[t];
    const contrib = contributions.slice(0, t + 1).reduce((p, c) => p + c, 0);
    let resaleGrown = 0;
    if (resale > 0 && resaleYear <= y) {
      // The resale money comes back at resaleYear and is invested from then on.
      resaleGrown = resale * Math.pow(1 + m, (y - resaleYear) * 12);
    }
    return {
      years: y,
      value,
      contributions: contrib,
      growth: value - contrib,
      realValue: toTodaysDollars(value, pct(i.inflation), y),
      netOfResale: value - resaleGrown,
    };
  });

  const multiplier30 = Math.pow(1 + r, 30);
  const monthlyFactor = m > 0 ? (Math.pow(1 + m, HORIZON_MONTHS) - 1) / m : HORIZON_MONTHS;
  const equivalentMonthlyOver30 = monthlyFactor > 0 ? proj.finalBalance / monthlyFactor : 0;

  return { totalSpent, milestones, balances: proj.balances, multiplier30, equivalentMonthlyOver30, warnings };
}
