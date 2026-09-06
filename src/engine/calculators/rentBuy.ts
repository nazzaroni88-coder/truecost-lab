/**
 * Rent vs Buy engine.
 *
 * Both paths are modeled as monthly cash flows for up to 40 years, then compared with the
 * shared comparison engine at the user's horizon. The renter invests every dollar the buyer
 * spends that they don't (down payment, closing costs, the gap between owner costs and rent).
 * The buyer walks away with home equity net of selling costs.
 *
 * Assumptions:
 * - Rent grows once a year. Renter's insurance and owner insurance/HOA grow with inflation.
 * - Property tax and maintenance are a percent of the home's *current* value each year.
 * - PMI applies when the down payment is under 20% and drops off once the loan balance falls
 *   below 80% of the original price (the common conventional-loan rule).
 * - No mortgage-interest tax deduction is assumed. Most households now take the standard
 *   deduction, so this keeps the model honest by default. (Noted in the methodology.)
 * - If the horizon exceeds the mortgage term, the buyer's payment drops to zero afterward.
 */

import type { CashflowSeries, CategoryTotal } from '../core/cashflow';
import { compareCashflows, type ComparisonResult, yearIndexOfMonth } from '../core/cashflow';
import { amortizationSchedule, inflate, paymentForLoan, pct, projectInvestment } from '../core/money';
import { findBreakEven, isRealistic, runSensitivity, type SensitivityRow, type SensitivityVariable } from '../core/sensitivity';
import { fmtMoney, fmtNumber, fmtPct } from '../../lib/format';

export interface RentBuyInputs {
  // Renting
  monthlyRent: number;
  rentGrowth: number; // %/yr
  rentersInsuranceAnnual: number;
  // Buying
  homePrice: number;
  downPaymentPct: number; // %
  mortgageApr: number; // %
  mortgageTermYears: number;
  propertyTaxRate: number; // % of value / yr
  homeInsuranceAnnual: number;
  hoaMonthly: number;
  maintenanceRate: number; // % of value / yr
  closingCostsPct: number; // % of price (buying)
  sellingCostsPct: number; // % of value (selling)
  appreciation: number; // %/yr
  pmiRate: number; // % of loan / yr while LTV > 80%
  // Economics
  horizonYears: number;
  investmentReturn: number; // %
  inflation: number; // %
}

export interface RentBuyPathResult {
  series: CashflowSeries;
  categories: CategoryTotal[];
  totalOutflows: number;
  nominalCost: number;
  firstYearMonthly: number;
}

export interface RentBuyResult {
  rent: RentBuyPathResult & { totalRent: number; totalInsurance: number; investedPortfolio: number };
  buy: RentBuyPathResult & {
    downPayment: number;
    closingCosts: number;
    loanAmount: number;
    monthlyPayment: number;
    totalInterest: number;
    totalPrincipal: number;
    totalPropertyTax: number;
    totalInsurance: number;
    totalHoa: number;
    totalMaintenance: number;
    totalPmi: number;
    homeValueAtEnd: number;
    sellingCosts: number;
    loanBalanceAtEnd: number;
    netEquityAtEnd: number;
    unrecoverableCosts: number;
    monthlyOwnerCostYear1: number;
    appreciationGain: number;
  };
  comparison: ComparisonResult;
  /** Wealth difference (buy − rent) at each year 1..40, for the break-even curve. */
  wealthByYear: { year: number; buy: number; rent: number; diff: number }[];
  breakEvenYear: number | null;
  sensitivity: SensitivityRow[];
  breakEvens: { key: string; label: string; text: string; value: number | null }[];
  warnings: string[];
}

const MAX_YEARS = 40;

function buildSeries(i: RentBuyInputs, years: number) {
  const months = years * 12;
  const infl = pct(i.inflation);
  const rentGrowth = pct(i.rentGrowth);
  const appr = pct(i.appreciation);

  // Renter
  const rentOut: number[] = new Array(months + 1).fill(0);
  const rentExit: number[] = new Array(months + 1).fill(0);
  let totalRent = 0;
  let totalRentIns = 0;
  for (let t = 1; t <= months; t++) {
    const y = yearIndexOfMonth(t);
    const rent = inflate(i.monthlyRent, rentGrowth, y);
    const ins = inflate(i.rentersInsuranceAnnual, infl, y) / 12;
    rentOut[t] = rent + ins;
    totalRent += rent;
    totalRentIns += ins;
  }

  // Buyer
  const downPayment = i.homePrice * pct(i.downPaymentPct);
  const closingCosts = i.homePrice * pct(i.closingCostsPct);
  const loanAmount = Math.max(0, i.homePrice - downPayment);
  const termMonths = Math.max(1, Math.round(i.mortgageTermYears * 12));
  const monthlyPayment = paymentForLoan(loanAmount, pct(i.mortgageApr), termMonths);
  const schedule = amortizationSchedule(loanAmount, pct(i.mortgageApr), termMonths);
  const buyOut: number[] = new Array(months + 1).fill(0);
  const buyExit: number[] = new Array(months + 1).fill(0);
  buyOut[0] = downPayment + closingCosts;
  let balance = loanAmount;
  let totalInterest = 0,
    totalPrincipal = 0,
    totalTax = 0,
    totalIns = 0,
    totalHoa = 0,
    totalMaint = 0,
    totalPmi = 0;
  const pmiThreshold = 0.8 * i.homePrice;
  buyExit[0] = i.homePrice * (1 - pct(i.sellingCostsPct)) - loanAmount;
  for (let t = 1; t <= months; t++) {
    const y = yearIndexOfMonth(t);
    const value = i.homePrice * Math.pow(1 + appr, t / 12);
    const valueYearStart = i.homePrice * Math.pow(1 + appr, y);
    let payment = 0;
    if (t <= termMonths && schedule.length) {
      const row = schedule[t - 1];
      payment = row.payment;
      totalInterest += row.interest;
      totalPrincipal += row.principal;
      balance = row.balance;
    }
    const tax = (valueYearStart * pct(i.propertyTaxRate)) / 12;
    const ins = inflate(i.homeInsuranceAnnual, infl, y) / 12;
    const hoa = inflate(i.hoaMonthly, infl, y);
    const maint = (valueYearStart * pct(i.maintenanceRate)) / 12;
    const pmi = i.pmiRate > 0 && balance > pmiThreshold ? (loanAmount * pct(i.pmiRate)) / 12 : 0;
    totalTax += tax;
    totalIns += ins;
    totalHoa += hoa;
    totalMaint += maint;
    totalPmi += pmi;
    buyOut[t] = payment + tax + ins + hoa + maint + pmi;
    buyExit[t] = value * (1 - pct(i.sellingCostsPct)) - balance;
  }
  const homeValueAtEnd = i.homePrice * Math.pow(1 + appr, years);
  const sellingCosts = homeValueAtEnd * pct(i.sellingCostsPct);

  return {
    months,
    rent: { outflows: rentOut, exitValue: rentExit, totalRent, totalRentIns },
    buy: {
      outflows: buyOut,
      exitValue: buyExit,
      downPayment,
      closingCosts,
      loanAmount,
      monthlyPayment,
      totalInterest,
      totalPrincipal,
      totalTax,
      totalIns,
      totalHoa,
      totalMaint,
      totalPmi,
      homeValueAtEnd,
      sellingCosts,
      balanceAtEnd: balance,
    },
  };
}

/** Metric for sensitivity: wealth difference at the horizon, positive = buying leaves you wealthier. */
export function rentBuyMetric(i: RentBuyInputs): number {
  const years = clampYears(i.horizonYears);
  const s = buildSeries(i, years);
  const rentSeries: CashflowSeries = { months: s.months, outflows: s.rent.outflows, exitValue: s.rent.exitValue };
  const buySeries: CashflowSeries = { months: s.months, outflows: s.buy.outflows, exitValue: s.buy.exitValue };
  // Option A = rent, Option B = buy → positive wealthDifference means B (buy) wealthier.
  return compareCashflows(rentSeries, buySeries, pct(i.investmentReturn)).wealthDifference;
}

function clampYears(y: number): number {
  return Math.min(MAX_YEARS, Math.max(1, Math.round(y)));
}

const set = (k: keyof RentBuyInputs) => (i: RentBuyInputs, v: number): RentBuyInputs => ({ ...i, [k]: v });

export function rentBuySensitivityVariables(): SensitivityVariable<RentBuyInputs>[] {
  return [
    { key: 'appreciation', label: 'Home appreciation', get: (i) => i.appreciation, set: set('appreciation'), low: (b) => b - 2, high: (b) => b + 2, format: (v) => `${fmtPct(v, 1)}/yr`, bounds: [-5, 15] },
    { key: 'investmentReturn', label: 'Investment return', get: (i) => i.investmentReturn, set: set('investmentReturn'), low: (b) => Math.max(0, b - 3), high: (b) => b + 3, format: (v) => `${fmtPct(v, 1)}/yr`, bounds: [0, 20] },
    { key: 'rentGrowth', label: 'Rent growth', get: (i) => i.rentGrowth, set: set('rentGrowth'), low: (b) => Math.max(0, b - 2), high: (b) => b + 2, format: (v) => `${fmtPct(v, 1)}/yr`, bounds: [0, 15] },
    { key: 'mortgageApr', label: 'Mortgage rate', get: (i) => i.mortgageApr, set: set('mortgageApr'), low: (b) => Math.max(0, b - 1.5), high: (b) => b + 1.5, format: (v) => fmtPct(v, 2), bounds: [0, 20] },
    { key: 'horizonYears', label: 'Years you stay', get: (i) => i.horizonYears, set: set('horizonYears'), low: (b) => Math.max(1, Math.round(b * 0.5)), high: (b) => Math.min(MAX_YEARS, Math.round(b * 1.5)), format: (v) => `${fmtNumber(v, 0)} yr`, bounds: [1, MAX_YEARS] },
    { key: 'monthlyRent', label: 'Monthly rent', get: (i) => i.monthlyRent, set: set('monthlyRent'), low: (b) => b * 0.85, high: (b) => b * 1.15, format: (v) => `${fmtMoney(v, 0)}/mo`, bounds: [100, 50000] },
    { key: 'homePrice', label: 'Home price', get: (i) => i.homePrice, set: set('homePrice'), low: (b) => b * 0.9, high: (b) => b * 1.1, format: (v) => fmtMoney(v, 0), bounds: [10000, 20_000_000] },
    { key: 'maintenanceRate', label: 'Maintenance rate', get: (i) => i.maintenanceRate, set: set('maintenanceRate'), low: (b) => Math.max(0, b - 0.5), high: (b) => b + 0.5, format: (v) => `${fmtPct(v, 1)}/yr`, bounds: [0, 5] },
    { key: 'propertyTaxRate', label: 'Property tax rate', get: (i) => i.propertyTaxRate, set: set('propertyTaxRate'), low: (b) => Math.max(0, b - 0.5), high: (b) => b + 0.5, format: (v) => `${fmtPct(v, 2)}/yr`, bounds: [0, 5] },
    { key: 'sellingCostsPct', label: 'Selling costs', get: (i) => i.sellingCostsPct, set: set('sellingCostsPct'), low: (b) => Math.max(0, b - 2), high: (b) => b + 2, format: (v) => fmtPct(v, 1), bounds: [0, 15] },
  ];
}

export function computeRentBuy(i: RentBuyInputs): RentBuyResult {
  const warnings: string[] = [];
  const years = clampYears(i.horizonYears);
  if (years !== i.horizonYears) warnings.push(`Horizon adjusted to ${years} years (whole years between 1 and ${MAX_YEARS}).`);
  if (i.downPaymentPct < 20 && i.pmiRate <= 0) warnings.push('Down payments under 20% usually require PMI. Set a PMI rate to include it.');
  if (i.downPaymentPct >= 100) warnings.push('A 100% down payment means no mortgage — the purchase is all cash.');

  const s = buildSeries(i, years);
  const rentSeries: CashflowSeries = { months: s.months, outflows: s.rent.outflows, exitValue: s.rent.exitValue };
  const buySeries: CashflowSeries = { months: s.months, outflows: s.buy.outflows, exitValue: s.buy.exitValue };
  const comparison = compareCashflows(rentSeries, buySeries, pct(i.investmentReturn));

  const b = s.buy;
  const netEquityAtEnd = b.exitValue[s.months];
  const unrecoverable = b.totalInterest + b.totalTax + b.totalIns + b.totalHoa + b.totalMaint + b.totalPmi + b.closingCosts + b.sellingCosts;
  const buyCategories: CategoryTotal[] = [
    { key: 'interest', label: 'Mortgage interest', amount: b.totalInterest },
    { key: 'propertyTax', label: 'Property tax', amount: b.totalTax },
    { key: 'insurance', label: 'Home insurance', amount: b.totalIns },
    { key: 'maintenance', label: 'Maintenance', amount: b.totalMaint },
    { key: 'hoa', label: 'HOA', amount: b.totalHoa },
    { key: 'pmi', label: 'PMI', amount: b.totalPmi },
    { key: 'closing', label: 'Closing costs', amount: b.closingCosts },
    { key: 'selling', label: 'Selling costs', amount: b.sellingCosts },
    { key: 'appreciation', label: 'Appreciation gained', amount: -(b.homeValueAtEnd - i.homePrice), kind: 'recovered' as const },
  ].filter((c) => Math.abs(c.amount) > 0.5);
  const rentCategories: CategoryTotal[] = [
    { key: 'rent', label: 'Rent', amount: s.rent.totalRent },
    { key: 'insurance', label: "Renter's insurance", amount: s.rent.totalRentIns },
  ].filter((c) => Math.abs(c.amount) > 0.5);

  // The renter's invested portfolio at the horizon = FV of (buy outflows − rent outflows), floored at zero for display.
  const diffs = b.outflows.map((v, t) => v - s.rent.outflows[t]);
  const investedPortfolio = projectInvestment(diffs, pct(i.investmentReturn), s.months).finalBalance;

  // Wealth by year: compute once to 40 years; the diff at each year is FV(differences to t) + exit diff at t.
  const full = buildSeries(i, MAX_YEARS);
  const fullDiffs = full.buy.outflows.map((v, t) => v - full.rent.outflows[t]);
  const proj = projectInvestment(fullDiffs, pct(i.investmentReturn), MAX_YEARS * 12);
  const wealthByYear: RentBuyResult['wealthByYear'] = [];
  let breakEvenYear: number | null = null;
  for (let y = 1; y <= MAX_YEARS; y++) {
    const t = y * 12;
    const rentWealth = proj.balances[t];
    const buyWealth = full.buy.exitValue[t];
    const diff = buyWealth - rentWealth;
    wealthByYear.push({ year: y, buy: buyWealth, rent: rentWealth, diff });
  }
  // Break-even: first year where buying is ahead and stays ahead through the horizon window (or for good).
  for (let idx = 0; idx < wealthByYear.length; idx++) {
    if (wealthByYear[idx].diff >= 0) {
      const staysAhead = wealthByYear.slice(idx).every((w) => w.diff >= 0);
      if (staysAhead) {
        breakEvenYear = wealthByYear[idx].year;
        break;
      }
    }
  }

  const vars = rentBuySensitivityVariables();
  const sensitivity = runSensitivity(i, rentBuyMetric, vars);
  const breakEvens: RentBuyResult['breakEvens'] = [];
  const buyingWins = comparison.wealthDifference > 0;
  /**
   * @param realistic values outside this range are not stated as advice — solving for a 0.9%
   *        mortgage rate is arithmetically true and practically useless.
   */
  const tryVar = (key: string, build: (v: number, posAbove: boolean) => string, label: string, realistic: [number, number], unreachable?: string) => {
    const v = vars.find((x) => x.key === key);
    if (!v) return;
    const be = findBreakEven(i, rentBuyMetric, v);
    if (be.value === null || be.positiveAbove === null) return;
    if (!isRealistic(be.value, realistic)) {
      if (unreachable) breakEvens.push({ key, label, value: null, text: unreachable });
      return;
    }
    breakEvens.push({ key, label, value: be.value, text: build(be.value, be.positiveAbove) });
  };
  if (breakEvenYear !== null) {
    breakEvens.push({
      key: 'horizon',
      label: 'Years you stay',
      value: breakEvenYear,
      text: breakEvenYear <= 1 ? 'Buying comes out ahead from the first year onward under these assumptions.' : `You would need to stay about ${breakEvenYear} years before buying beats renting. Sell sooner and the closing and selling costs outweigh the equity you build.`,
    });
  } else {
    breakEvens.push({ key: 'horizon', label: 'Years you stay', value: null, text: `Under these assumptions renting stays ahead for at least ${MAX_YEARS} years. The renter's invested savings outgrow the home equity.` });
  }
  tryVar(
    'appreciation',
    (v, posAbove) => (posAbove ? `Buying wins if the home appreciates faster than about ${fmtPct(v, 1)} per year; renting wins below that.` : `Buying wins if appreciation stays below about ${fmtPct(v, 1)} per year.`),
    'Home appreciation',
    [-2, 12],
    buyingWins ? 'Buying stays ahead across every appreciation rate we tested, from −2% to 12% a year.' : 'Even at 12% a year appreciation, buying does not catch up over this time frame.',
  );
  tryVar(
    'investmentReturn',
    (v, posAbove) => (posAbove ? `Buying wins if the renter's investments earn more than ${fmtPct(v, 1)} — unusual; check your assumptions.` : `Renting wins if the money you would put into the home can earn more than about ${fmtPct(v, 1)} per year invested. Below that, buying wins.`),
    'Investment return',
    [1, 15],
    buyingWins ? 'Buying stays ahead even if the renter earns 15% a year on their investments.' : 'Renting stays ahead even if the renter earns as little as 1% a year.',
  );
  tryVar('monthlyRent', (v, posAbove) => (posAbove ? `Buying wins once comparable rent is above about ${fmtMoney(v, 0)}/month.` : `Buying wins only if comparable rent is below about ${fmtMoney(v, 0)}/month.`), 'Monthly rent', [i.monthlyRent * 0.4, i.monthlyRent * 2.5]);
  // A mortgage below ~2% or above ~12% is not something a buyer can go and get, so we say nothing
  // rather than printing a technically-true but useless number.
  tryVar('mortgageApr', (v, posAbove) => (posAbove ? `Buying wins if the mortgage rate is above ${fmtPct(v, 2)} — check your assumptions.` : `Buying wins if you can get a mortgage rate below about ${fmtPct(v, 2)}.`), 'Mortgage rate', [2, 12]);

  return {
    rent: {
      series: { ...rentSeries, categories: rentCategories },
      categories: rentCategories,
      totalOutflows: comparison.totalOutflowsA,
      nominalCost: comparison.nominalA,
      firstYearMonthly: i.monthlyRent + i.rentersInsuranceAnnual / 12,
      totalRent: s.rent.totalRent,
      totalInsurance: s.rent.totalRentIns,
      investedPortfolio,
    },
    buy: {
      series: { ...buySeries, categories: buyCategories },
      categories: buyCategories,
      totalOutflows: comparison.totalOutflowsB,
      nominalCost: comparison.nominalB,
      firstYearMonthly: b.outflows[1] ?? 0,
      downPayment: b.downPayment,
      closingCosts: b.closingCosts,
      loanAmount: b.loanAmount,
      monthlyPayment: b.monthlyPayment,
      totalInterest: b.totalInterest,
      totalPrincipal: b.totalPrincipal,
      totalPropertyTax: b.totalTax,
      totalInsurance: b.totalIns,
      totalHoa: b.totalHoa,
      totalMaintenance: b.totalMaint,
      totalPmi: b.totalPmi,
      homeValueAtEnd: b.homeValueAtEnd,
      sellingCosts: b.sellingCosts,
      loanBalanceAtEnd: b.balanceAtEnd,
      netEquityAtEnd,
      unrecoverableCosts: unrecoverable,
      monthlyOwnerCostYear1: b.outflows[1] ?? 0,
      appreciationGain: b.homeValueAtEnd - i.homePrice,
    },
    comparison,
    wealthByYear,
    breakEvenYear,
    sensitivity,
    breakEvens,
    warnings,
  };
}
