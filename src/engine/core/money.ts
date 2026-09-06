/**
 * Core money math for TrueCost Lab.
 *
 * Conventions (documented in the Methodology page):
 * - Loan APRs are nominal annual rates compounded monthly (rate / 12 per month),
 *   which is how U.S. auto loans and mortgages are quoted.
 * - Investment returns are *effective* annual rates converted to a monthly rate of
 *   (1 + r)^(1/12) - 1, so "7% per year" grows a lump sum by exactly 7% each year.
 * - Contributions to an investment happen at the end of each month, after that
 *   month's growth is applied. Time-zero (upfront) amounts are invested immediately.
 * - All amounts are nominal dollars unless a function explicitly says "real".
 */

export const EPS = 1e-9;

/** Nominal APR (as a decimal, e.g. 0.065) → monthly loan rate. */
export function loanMonthlyRate(apr: number): number {
  return apr / 12;
}

/** Effective annual return (decimal) → equivalent monthly growth rate. */
export function investMonthlyRate(annualReturn: number): number {
  if (annualReturn <= -1) return -1;
  return Math.pow(1 + annualReturn, 1 / 12) - 1;
}

/**
 * Level monthly payment for a fully amortizing loan.
 * @param principal loan amount
 * @param apr nominal annual rate as decimal
 * @param months term in months
 */
export function paymentForLoan(principal: number, apr: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = loanMonthlyRate(apr);
  if (Math.abs(r) < EPS) return principal / months;
  const pow = Math.pow(1 + r, -months);
  return (principal * r) / (1 - pow);
}

export interface AmortizationRow {
  month: number; // 1-based
  payment: number;
  interest: number;
  principal: number;
  balance: number; // remaining after this payment
}

/**
 * Full amortization schedule. Handles a final payment that is smaller than the level
 * payment because of rounding, and never lets the balance go negative.
 */
export function amortizationSchedule(principal: number, apr: number, months: number): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  if (principal <= 0 || months <= 0) return rows;
  const r = loanMonthlyRate(apr);
  const pmt = paymentForLoan(principal, apr, months);
  let balance = principal;
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    let principalPaid = pmt - interest;
    let payment = pmt;
    if (principalPaid > balance - EPS || m === months) {
      principalPaid = balance;
      payment = balance + interest;
    }
    balance = Math.max(0, balance - principalPaid);
    rows.push({ month: m, payment, interest, principal: principalPaid, balance });
    if (balance <= EPS) {
      balance = 0;
      // Loan is done early (only happens with degenerate inputs). Remaining rows are zeros.
      for (let k = m + 1; k <= months; k++) rows.push({ month: k, payment: 0, interest: 0, principal: 0, balance: 0 });
      break;
    }
  }
  return rows;
}

/** Remaining balance after `paidMonths` level payments (closed form). */
export function remainingBalance(principal: number, apr: number, months: number, paidMonths: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (paidMonths >= months) return 0;
  if (paidMonths <= 0) return principal;
  const r = loanMonthlyRate(apr);
  if (Math.abs(r) < EPS) return principal * (1 - paidMonths / months);
  const pmt = paymentForLoan(principal, apr, months);
  const g = Math.pow(1 + r, paidMonths);
  return principal * g - (pmt * (g - 1)) / r;
}

/** Total interest paid over the first `throughMonths` months of a loan (default: whole term). */
export function totalInterest(principal: number, apr: number, months: number, throughMonths = months): number {
  const n = Math.min(months, Math.max(0, Math.floor(throughMonths)));
  if (n === 0 || principal <= 0) return 0;
  const pmt = paymentForLoan(principal, apr, months);
  const paid = pmt * n;
  const bal = remainingBalance(principal, apr, months, n);
  return Math.max(0, paid - (principal - bal));
}

/** Future value of a lump sum after `years` at an effective annual return. */
export function growLumpSum(amount: number, annualReturn: number, years: number): number {
  if (years <= 0) return amount;
  return amount * Math.pow(1 + annualReturn, years);
}

export interface InvestmentProjection {
  /** balance at end of each month, index 0 = time zero (after the upfront amount is invested) */
  balances: number[];
  finalBalance: number;
  totalContributions: number;
  totalGrowth: number;
}

/**
 * Project an investment account fed by a contribution schedule.
 * @param contributions contributions[t] is added at month t (t = 0 is invested immediately;
 *        t >= 1 is added at the end of month t after growth). Negative values are withdrawals.
 * @param annualReturn effective annual return as decimal
 * @param months total months to project (defaults to contributions.length - 1). If longer than
 *        the schedule, the balance keeps compounding with no new contributions.
 */
export function projectInvestment(contributions: number[], annualReturn: number, months?: number): InvestmentProjection {
  const m = investMonthlyRate(annualReturn);
  const n = months ?? Math.max(0, contributions.length - 1);
  const balances: number[] = new Array(n + 1);
  let balance = contributions[0] ?? 0;
  let contrib = balance;
  balances[0] = balance;
  for (let t = 1; t <= n; t++) {
    balance = balance * (1 + m) + (contributions[t] ?? 0);
    contrib += contributions[t] ?? 0;
    balances[t] = balance;
  }
  return { balances, finalBalance: balance, totalContributions: contrib, totalGrowth: balance - contrib };
}

/** Convert a nominal amount `years` in the future into today's dollars. */
export function toTodaysDollars(nominal: number, inflation: number, years: number): number {
  if (years <= 0) return nominal;
  return nominal / Math.pow(1 + inflation, years);
}

/** Inflate an annual cost to year index `yearIndex` (0 = first year, no inflation). */
export function inflate(amount: number, rate: number, yearIndex: number): number {
  if (yearIndex <= 0 || rate === 0) return amount;
  return amount * Math.pow(1 + rate, yearIndex);
}

/** Percent input (e.g. 6.5) → decimal (0.065). Tolerant of NaN. */
export function pct(p: number): number {
  return Number.isFinite(p) ? p / 100 : 0;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function sum(arr: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}
