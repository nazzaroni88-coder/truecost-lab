/**
 * Custom TrueCost Comparison engine — a flexible Option A vs Option B model.
 *
 * Each option is described by upfront, monthly, annual, and one-time future costs, optional
 * recurring savings (money the option earns or saves you), a resale value, and a lifespan.
 * If the lifespan is shorter than the horizon, the item is replaced at each lifespan
 * (the replacement price inflates), and the old one is sold for its resale value.
 * The value you could get back by exiting at any point is the resale value you entered (grown with
 * inflation for replacement units). Upfront costs are otherwise treated as spent, which keeps the
 * "when does the pricier option pay for itself" question intuitive.
 *
 * Assumptions:
 * - Monthly and annual costs (and savings) grow with inflation each year when "grow with inflation" is on.
 * - Annual costs are charged at the end of each year; one-time costs at the end of the given year.
 * - Savings are treated as negative costs (they reduce the outflow that month).
 */

import type { CashflowSeries, CategoryTotal } from '../core/cashflow';
import { compareCashflows, type ComparisonResult, yearIndexOfMonth } from '../core/cashflow';
import { inflate, pct } from '../core/money';
import { findBreakEven, runSensitivity, type SensitivityRow, type SensitivityVariable } from '../core/sensitivity';
import { fmtMoney, fmtNumber, fmtPct } from '../../lib/format';

export interface FutureCost {
  id: string;
  label: string;
  amount: number;
  year: number; // end of year N (1 = after first year)
}

export interface CustomOption {
  name: string;
  upfront: number;
  monthly: number;
  annual: number;
  oneTime: FutureCost[];
  monthlySavings: number;
  annualSavings: number;
  resaleValue: number;
  /** 0 = lasts the whole horizon */
  lifespanYears: number;
}

export interface CustomInputs {
  a: CustomOption;
  b: CustomOption;
  horizonYears: number;
  investmentReturn: number; // %
  inflation: number; // %
  growWithInflation: boolean;
}

export interface CustomOptionResult {
  name: string;
  series: CashflowSeries;
  categories: CategoryTotal[];
  upfront: number;
  replacements: number;
  monthly: number;
  annual: number;
  oneTime: number;
  savings: number;
  terminalValue: number;
  totalCost: number;
  monthlyCost: number;
  annualCost: number;
}

export interface CustomResult {
  a: CustomOptionResult;
  b: CustomOptionResult;
  comparison: ComparisonResult;
  sensitivity: SensitivityRow[];
  breakEvens: { key: string; label: string; text: string; value: number | null }[];
  warnings: string[];
}

export function computeCustomOption(o: CustomOption, i: CustomInputs): CustomOptionResult {
  const years = Math.max(1, Math.round(i.horizonYears));
  const months = years * 12;
  const infl = i.growWithInflation ? pct(i.inflation) : 0;
  const priceInfl = pct(i.inflation);
  const outflows: number[] = new Array(months + 1).fill(0);
  const exitValue: number[] = new Array(months + 1).fill(0);
  const life = o.lifespanYears > 0 ? o.lifespanYears : years;
  const lifeMonths = Math.max(1, Math.round(life * 12));

  let upfront = 0,
    replacements = 0,
    monthly = 0,
    annual = 0,
    oneTime = 0,
    savings = 0;

  outflows[0] = o.upfront;
  upfront = o.upfront;
  const resale = Math.min(Math.max(0, o.resaleValue), Math.max(0, o.upfront));

  for (let t = 1; t <= months; t++) {
    const y = yearIndexOfMonth(t);
    const mCost = inflate(o.monthly, infl, y);
    const mSave = inflate(o.monthlySavings, infl, y);
    let flow = mCost - mSave;
    monthly += mCost;
    savings += mSave;
    if (t % 12 === 0) {
      const aCost = inflate(o.annual, infl, y);
      const aSave = inflate(o.annualSavings, infl, y);
      flow += aCost - aSave;
      annual += aCost;
      savings += aSave;
      const yearNum = t / 12;
      for (const oc of o.oneTime) {
        if (Math.round(oc.year) === yearNum) {
          flow += oc.amount;
          oneTime += oc.amount;
        }
      }
    }
    // Replacement cycle: at the end of each lifespan (if before the horizon), sell the old one and buy new.
    if (o.lifespanYears > 0 && t % lifeMonths === 0 && t < months) {
      const cycle = t / lifeMonths;
      const newPrice = o.upfront * Math.pow(1 + priceInfl, cycle * life);
      const oldResale = resale * Math.pow(1 + priceInfl, (cycle - 1) * life);
      flow += newPrice - oldResale;
      replacements += newPrice - oldResale;
    }
    outflows[t] = flow;
    // Value if you exited now: the resale value of the unit you currently own (inflated per replacement cycle).
    // Unit index: replacements happen at t = k·lifeMonths (k ≥ 1, t < months), so at that moment you own unit k.
    let unit = 0;
    if (o.lifespanYears > 0) {
      unit = Math.floor(t / lifeMonths);
      if (t % lifeMonths === 0 && t >= lifeMonths && t >= months) unit -= 1; // horizon lands on a lifespan end: no replacement bought
    }
    exitValue[t] = resale * Math.pow(1 + priceInfl, unit * life);
  }
  exitValue[0] = resale;

  const terminalValue = exitValue[months];
  const totalCost = outflows.reduce((p, c) => p + c, 0) - terminalValue;
  const categories: CategoryTotal[] = [
    { key: 'upfront', label: 'Upfront cost', amount: upfront },
    { key: 'replacements', label: 'Replacements (net of resale)', amount: replacements },
    { key: 'monthly', label: 'Monthly costs', amount: monthly },
    { key: 'annual', label: 'Annual costs', amount: annual },
    { key: 'oneTime', label: 'One-time future costs', amount: oneTime },
    { key: 'savings', label: 'Savings earned', amount: -savings, kind: 'recovered' as const },
    { key: 'resale', label: 'Value at end (recovered)', amount: -terminalValue, kind: 'recovered' as const },
  ].filter((c) => Math.abs(c.amount) > 0.5);

  return {
    name: o.name,
    series: { months, outflows, exitValue, categories },
    categories,
    upfront,
    replacements,
    monthly,
    annual,
    oneTime,
    savings,
    terminalValue,
    totalCost,
    monthlyCost: totalCost / months,
    annualCost: totalCost / years,
  };
}

export function customMetric(i: CustomInputs): number {
  return computeCustomOption(i.a, i).totalCost - computeCustomOption(i.b, i).totalCost;
}

const setTop = (k: 'horizonYears' | 'investmentReturn' | 'inflation') => (i: CustomInputs, v: number): CustomInputs => ({ ...i, [k]: v });
const setOpt = (side: 'a' | 'b', k: 'upfront' | 'monthly' | 'annual' | 'resaleValue' | 'lifespanYears' | 'monthlySavings') => (i: CustomInputs, v: number): CustomInputs => ({ ...i, [side]: { ...i[side], [k]: v } });

export function customSensitivityVariables(i: CustomInputs): SensitivityVariable<CustomInputs>[] {
  const vars: SensitivityVariable<CustomInputs>[] = [
    { key: 'horizonYears', label: 'Time horizon', get: (x) => x.horizonYears, set: setTop('horizonYears'), low: (b) => Math.max(1, Math.round(b * 0.5)), high: (b) => Math.min(40, Math.round(b * 1.5)), format: (v) => `${fmtNumber(v, 0)} yr`, bounds: [1, 40] },
    { key: 'inflation', label: 'Inflation', get: (x) => x.inflation, set: setTop('inflation'), low: (b) => Math.max(0, b - 2), high: (b) => b + 2, format: (v) => fmtPct(v, 1), bounds: [0, 15] },
  ];
  (['a', 'b'] as const).forEach((side) => {
    const o = i[side];
    if (o.upfront > 0) vars.push({ key: `${side}.upfront`, label: `${o.name}: upfront cost`, get: (x) => x[side].upfront, set: setOpt(side, 'upfront'), low: (b) => b * 0.8, high: (b) => b * 1.2, format: (v) => fmtMoney(v, 0), bounds: [0, o.upfront * 5 + 1000] });
    if (o.monthly > 0) vars.push({ key: `${side}.monthly`, label: `${o.name}: monthly cost`, get: (x) => x[side].monthly, set: setOpt(side, 'monthly'), low: (b) => b * 0.8, high: (b) => b * 1.2, format: (v) => `${fmtMoney(v, 0)}/mo`, bounds: [0, o.monthly * 5 + 100] });
    if (o.annual > 0) vars.push({ key: `${side}.annual`, label: `${o.name}: annual cost`, get: (x) => x[side].annual, set: setOpt(side, 'annual'), low: (b) => b * 0.8, high: (b) => b * 1.2, format: (v) => `${fmtMoney(v, 0)}/yr`, bounds: [0, o.annual * 5 + 100] });
    if (o.resaleValue > 0) vars.push({ key: `${side}.resaleValue`, label: `${o.name}: resale value`, get: (x) => x[side].resaleValue, set: setOpt(side, 'resaleValue'), low: (b) => b * 0.5, high: (b) => Math.min(o.upfront, b * 1.5), format: (v) => fmtMoney(v, 0), bounds: [0, o.upfront] });
    if (o.lifespanYears > 0) vars.push({ key: `${side}.lifespanYears`, label: `${o.name}: lifespan`, get: (x) => x[side].lifespanYears, set: setOpt(side, 'lifespanYears'), low: (b) => Math.max(1, b * 0.7), high: (b) => b * 1.3, format: (v) => `${fmtNumber(v, 1)} yr`, bounds: [0.5, 40] });
    if (o.monthlySavings > 0) vars.push({ key: `${side}.monthlySavings`, label: `${o.name}: monthly savings`, get: (x) => x[side].monthlySavings, set: setOpt(side, 'monthlySavings'), low: (b) => b * 0.7, high: (b) => b * 1.3, format: (v) => `${fmtMoney(v, 0)}/mo`, bounds: [0, o.monthlySavings * 5 + 100] });
  });
  return vars;
}

export function computeCustom(i: CustomInputs): CustomResult {
  const warnings: string[] = [];
  const a = computeCustomOption(i.a, i);
  const b = computeCustomOption(i.b, i);
  const comparison = compareCashflows(a.series, b.series, pct(i.investmentReturn));
  const vars = customSensitivityVariables(i);
  const sensitivity = runSensitivity(i, customMetric, vars);
  const breakEvens: CustomResult['breakEvens'] = [];
  const cheaperName = comparison.cheaper === 'b' ? i.b.name : i.a.name;
  const otherName = comparison.cheaper === 'b' ? i.a.name : i.b.name;
  if (comparison.cheaper !== 'tie') {
    const x = comparison.crossover;
    if (x.year !== null) {
      breakEvens.push({ key: 'crossover', label: 'Time', value: x.year, text: `${cheaperName} becomes the cheaper choice after about ${fmtNumber(x.year, 1)} years. Before that, ${otherName} is ahead.` });
    } else {
      breakEvens.push({ key: 'crossover', label: 'Time', value: null, text: `${cheaperName} is cheaper at every point over the ${Math.round(i.horizonYears)}-year horizon.` });
    }
    for (const v of vars) {
      if (v.key === 'horizonYears' || v.key === 'inflation') continue;
      const be = findBreakEven(i, customMetric, v);
      if (be.value === null) continue;
      breakEvens.push({ key: v.key, label: v.label, value: be.value, text: `If ${v.label.toLowerCase()} were about ${v.format(be.value)} instead of ${v.format(v.get(i))}, the two options would cost the same.` });
      if (breakEvens.length >= 4) break;
    }
  }
  if (a.totalCost === 0 && b.totalCost === 0) warnings.push('Add some costs to each option to see a comparison.');
  return { a, b, comparison, sensitivity, breakEvens, warnings };
}

export function swapCustomInputs(i: CustomInputs): CustomInputs {
  return { ...i, a: i.b, b: i.a };
}
