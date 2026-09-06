/**
 * Vehicle True Cost engine.
 *
 * Models a single vehicle as a cash-flow series (see core/cashflow.ts) and compares two of them.
 *
 * Key assumptions (surfaced in the UI methodology panel):
 * - Sales tax applies to (price − trade-in), the rule in most U.S. states.
 * - When financing, taxes and fees are rolled into the loan; cash due at signing = down payment.
 *   When paying cash, everything is paid up front.
 * - A trade-in counts as money you put in, because you could have sold it for cash instead.
 * - Vehicle value follows a geometric curve: a first-year drop, then a steady annual rate.
 *   Users can override the expected resale value directly.
 * - Recurring costs (insurance, maintenance, repairs, registration, tires) inflate annually at the
 *   "cost inflation" rate. Fuel and electricity prices grow at their own rate.
 * - If you sell before the loan is repaid, the remaining balance is paid off from the sale proceeds.
 */

import type { CashflowSeries, CategoryTotal } from '../core/cashflow';
import { compareCashflows, type ComparisonResult, yearIndexOfMonth } from '../core/cashflow';
import { amortizationSchedule, EPS, inflate, paymentForLoan, pct } from '../core/money';
import { findBreakEven, runSensitivity, type SensitivityRow, type SensitivityVariable } from '../core/sensitivity';
import { fmtMoney, fmtNumber, fmtPct } from '../../lib/format';

export type FuelType = 'gas' | 'electric';
export type PaymentMethod = 'cash' | 'finance';

export interface VehicleOption {
  name: string;
  price: number;
  paymentMethod: PaymentMethod;
  downPayment: number;
  tradeInValue: number;
  salesTaxRate: number; // percent
  fees: number; // doc/title/dealer fees
  apr: number; // percent
  termMonths: number;
  fuelType: FuelType;
  mpg: number; // gas only
  milesPerKwh: number; // electric only
  insuranceAnnual: number;
  registrationAnnual: number;
  maintenanceAnnual: number;
  repairsAnnual: number;
  tireSetCost: number;
  tireIntervalMiles: number;
  firstYearDepreciation: number; // percent
  annualDepreciation: number; // percent, years 2+
  /** If set, pins the value at the end of ownership to this amount (0 = scrap). */
  resaleOverride: number | null;
  /**
   * Purchase incentives: federal/state tax credits, manufacturer or utility rebates.
   * Modelled as cash received at purchase. Does not reduce the sales-tax base (most states tax the
   * full sale price) and does not change the car's resale value.
   */
  purchaseIncentive: number;
  /** One-time setup cost, e.g. installing a home charger for an EV. */
  chargerCost: number;
}

export interface VehicleShared {
  annualMiles: number;
  gasPrice: number; // $/gal
  electricityRate: number; // $/kWh
  ownershipYears: number;
  investmentReturn: number; // percent
  costInflation: number; // percent
  fuelPriceGrowth: number; // percent
}

export interface VehicleInputs {
  a: VehicleOption;
  b: VehicleOption;
  shared: VehicleShared;
}

export interface VehicleOptionResult {
  name: string;
  series: CashflowSeries;
  categories: CategoryTotal[];
  cashAtSigning: number;
  initialOutlay: number; // cash + the part of the trade-in actually used on this car
  /** Incentives actually applied (clamped to the price you pay). */
  purchaseIncentive: number;
  chargerCost: number;
  /** What leaves your pocket at purchase: initial outlay + charger − incentives. */
  netUpfront: number;
  /** Trade-in value beyond what the purchase absorbs — the dealer hands this back to you. */
  tradeInSurplus: number;
  loanAmount: number;
  monthlyPayment: number;
  salesTax: number;
  fees: number;
  totalInterest: number;
  depreciation: number;
  resaleValue: number;
  loanBalanceAtExit: number;
  /** Resale minus any remaining loan. Negative means you must bring cash to sell. */
  netProceedsAtExit: number;
  underwaterAtExit: boolean;
  /** First month the car is worth at least the loan balance, or null if never within ownership. */
  monthAboveWater: number | null;
  /** Deepest negative equity during ownership (0 if never underwater). */
  worstNegativeEquity: number;
  fuel: number;
  insurance: number;
  maintenance: number;
  tires: number;
  repairs: number;
  registration: number;
  totalCost: number;
  monthlyCost: number;
  annualCost: number;
  costPerMile: number;
  /** Average monthly out-of-pocket while owning (payments + running costs), excluding upfront. */
  monthlyOutOfPocket: number;
  totalMiles: number;
  valueByYear: number[];
  warnings: string[];
}

export interface VehicleResult {
  a: VehicleOptionResult;
  b: VehicleOptionResult;
  comparison: ComparisonResult;
  sensitivity: SensitivityRow[];
  breakEvens: VehicleBreakEven[];
  warnings: string[];
}

export interface VehicleBreakEven {
  key: string;
  label: string;
  /** Plain-English sentence. */
  text: string;
  value: number | null;
}

/** The plain depreciation curve: a first-year drop, then a steady annual rate. */
function naturalValue(price: number, d1: number, d: number, t: number): number {
  if (t <= 0) return price;
  if (t <= 12) return price * Math.pow(1 - d1, t / 12);
  return price * (1 - d1) * Math.pow(1 - d, (t - 12) / 12);
}

/**
 * Vehicle value at month `t`.
 *
 * When the user states an expected resale value, that number must be honoured exactly at the end of
 * the ownership period — it is their own estimate, and quietly ignoring it would be worse than not
 * offering the field. Two ways to land on it:
 *
 *  1. Preferred: keep the stated first-year drop and solve for the annual rate that reaches the
 *     target over the remaining years. Only possible when the target is at or below the value after
 *     the first year (cars do not appreciate back).
 *  2. Otherwise (target above the after-first-year value, or a scrap value of zero): scale the whole
 *     curve toward the target. value(t) = price + (natural(t) − price) × k, with k chosen so the end
 *     lands exactly on the target. This keeps the curve's shape and monotonicity while pinning both
 *     ends, and correctly implies a gentler first year when you expect a high resale.
 */
export function vehicleValueAtMonth(o: VehicleOption, ownershipYears: number, t: number): number {
  const d1 = pct(o.firstYearDepreciation);
  const d = pct(o.annualDepreciation);
  const price = o.price;
  if (price <= 0) return 0;
  if (t <= 0) return price;

  const override = o.resaleOverride;
  if (override === null || !Number.isFinite(override) || ownershipYears <= 0) {
    return naturalValue(price, d1, d, t);
  }

  const target = Math.min(Math.max(0, override), price);
  const months = ownershipYears * 12;
  const afterFirst = price * (1 - d1);

  // 1. Keep the first-year drop and re-solve the later years.
  if (ownershipYears > 1 && target > 0 && target <= afterFirst && afterFirst > 0) {
    const solved = 1 - Math.pow(target / afterFirst, 1 / (ownershipYears - 1));
    return naturalValue(price, d1, solved, t);
  }

  // 2. Scale the natural curve so it lands exactly on the target.
  const natEnd = naturalValue(price, d1, d, months);
  const drop = price - natEnd;
  if (drop <= EPS) {
    // A flat natural curve gives nothing to scale, so fall back to a straight line.
    return price - (price - target) * Math.min(1, t / months);
  }
  const k = (price - target) / drop;
  return price + (naturalValue(price, d1, d, t) - price) * k;
}

export function computeVehicleOption(o: VehicleOption, s: VehicleShared): VehicleOptionResult {
  const warnings: string[] = [];
  const years = Math.max(1, Math.round(s.ownershipYears));
  const months = years * 12;
  const taxable = Math.max(0, o.price - o.tradeInValue);
  const salesTax = taxable * pct(o.salesTaxRate);
  const fees = Math.max(0, o.fees);
  const gross = o.price + salesTax + fees;

  // A trade-in can only offset what you owe on this car; anything beyond that comes back to you as cash.
  const tradeIn = Math.max(0, o.tradeInValue);
  const tradeInApplied = Math.min(tradeIn, gross);
  const tradeInSurplus = tradeIn - tradeInApplied;
  if (tradeInSurplus > 0.5) warnings.push(`${o.name}: your trade-in is worth ${fmtMoney(tradeInSurplus)} more than this car costs, so that surplus comes back to you and is not counted as money spent.`);

  let cashAtSigning: number;
  let loanAmount = 0;
  let monthlyPayment = 0;
  let schedule: ReturnType<typeof amortizationSchedule> = [];
  const down = Math.min(Math.max(0, o.downPayment), Math.max(0, gross - tradeInApplied));
  if (o.paymentMethod === 'finance') {
    loanAmount = Math.max(0, gross - down - tradeInApplied);
    cashAtSigning = down;
    if (loanAmount > 0) {
      monthlyPayment = paymentForLoan(loanAmount, pct(o.apr), o.termMonths);
      schedule = amortizationSchedule(loanAmount, pct(o.apr), o.termMonths);
    }
    if (o.termMonths > months) warnings.push(`${o.name}: the loan term is longer than your ownership period, so the remaining balance is paid off when you sell.`);
  } else {
    cashAtSigning = Math.max(0, gross - tradeInApplied);
  }
  const initialOutlay = cashAtSigning + tradeInApplied;

  // Incentives are cash back at purchase; a rebate larger than the car itself is not meaningful.
  const purchaseIncentive = Math.min(Math.max(0, o.purchaseIncentive), gross);
  if (o.purchaseIncentive > gross + 0.5) warnings.push(`${o.name}: the incentive of ${fmtMoney(o.purchaseIncentive)} is more than the ${fmtMoney(gross)} price with tax and fees, so we capped it.`);
  const chargerCost = Math.max(0, o.chargerCost);

  const outflows: number[] = new Array(months + 1).fill(0);
  const exitValue: number[] = new Array(months + 1).fill(0);
  const netUpfront = initialOutlay + chargerCost - purchaseIncentive;
  outflows[0] = netUpfront;

  const tiresPerYear = o.tireIntervalMiles > 0 ? (s.annualMiles / o.tireIntervalMiles) * o.tireSetCost : 0;
  const monthlyMiles = s.annualMiles / 12;
  const inflation = pct(s.costInflation);
  const fuelGrowth = pct(s.fuelPriceGrowth);

  let fuel = 0,
    insurance = 0,
    maintenance = 0,
    tires = 0,
    repairs = 0,
    registration = 0,
    totalInterest = 0;

  const valueByYear: number[] = [o.price];
  let loanBalance = loanAmount;
  let monthAboveWater: number | null = loanAmount > 0 ? null : 0;
  let worstNegativeEquity = 0;
  for (let t = 1; t <= months; t++) {
    const y = yearIndexOfMonth(t);
    let fuelMonth = 0;
    if (o.fuelType === 'gas') {
      const gallons = o.mpg > 0 ? monthlyMiles / o.mpg : 0;
      fuelMonth = gallons * inflate(s.gasPrice, fuelGrowth, y);
    } else {
      const kwh = o.milesPerKwh > 0 ? monthlyMiles / o.milesPerKwh : 0;
      fuelMonth = kwh * inflate(s.electricityRate, fuelGrowth, y);
    }
    const insMonth = inflate(o.insuranceAnnual, inflation, y) / 12;
    const regMonth = inflate(o.registrationAnnual, inflation, y) / 12;
    const maintMonth = inflate(o.maintenanceAnnual, inflation, y) / 12;
    const repMonth = inflate(o.repairsAnnual, inflation, y) / 12;
    const tireMonth = inflate(tiresPerYear, inflation, y) / 12;

    let payment = 0;
    if (schedule.length && t <= o.termMonths) {
      const row = schedule[t - 1];
      payment = row.payment;
      totalInterest += row.interest;
      loanBalance = row.balance;
    }

    fuel += fuelMonth;
    insurance += insMonth;
    registration += regMonth;
    maintenance += maintMonth;
    repairs += repMonth;
    tires += tireMonth;
    outflows[t] = payment + fuelMonth + insMonth + regMonth + maintMonth + repMonth + tireMonth;

    const value = vehicleValueAtMonth(o, years, t);
    exitValue[t] = value - loanBalance;
    if (exitValue[t] < 0) {
      worstNegativeEquity = Math.min(worstNegativeEquity, exitValue[t]);
    } else if (monthAboveWater === null) {
      monthAboveWater = t;
    }
    if (t % 12 === 0) valueByYear.push(value);
  }
  exitValue[0] = o.price - loanAmount; // notional: sell immediately for the same price
  if (exitValue[0] < 0) worstNegativeEquity = Math.min(worstNegativeEquity, exitValue[0]);

  const resaleValue = vehicleValueAtMonth(o, years, months);
  const loanBalanceAtExit = loanBalance;
  const netProceedsAtExit = resaleValue - loanBalanceAtExit;
  const underwaterAtExit = netProceedsAtExit < -0.5;
  if (underwaterAtExit) {
    warnings.push(`${o.name}: after ${years === 1 ? '1 year' : `${years} years`} you would still owe ${fmtMoney(loanBalanceAtExit)} on a car worth ${fmtMoney(resaleValue)} — you would need to bring ${fmtMoney(-netProceedsAtExit)} of your own cash to sell it.`);
  }
  const depreciation = o.price - resaleValue;
  const totalCost = outflows.reduce((p, c) => p + c, 0) - exitValue[months];
  const totalMiles = s.annualMiles * years;

  const categories: CategoryTotal[] = [
    { key: 'depreciation', label: 'Depreciation', amount: depreciation },
    { key: 'interest', label: 'Loan interest', amount: totalInterest },
    { key: 'taxesFees', label: 'Sales tax & fees', amount: salesTax + fees },
    // Only shown when used, so a normal gas-vs-gas comparison keeps a clean breakdown.
    ...(chargerCost > 0.5 ? [{ key: 'charger', label: 'Home charger install', amount: chargerCost }] : []),
    ...(purchaseIncentive > 0.5 ? [{ key: 'incentives', label: 'Tax credits & rebates', amount: -purchaseIncentive, kind: 'recovered' as const }] : []),
    { key: 'fuel', label: o.fuelType === 'electric' ? 'Electricity' : 'Fuel', amount: fuel },
    { key: 'insurance', label: 'Insurance', amount: insurance },
    { key: 'maintenance', label: 'Maintenance & tires', amount: maintenance + tires },
    { key: 'repairs', label: 'Repairs', amount: repairs },
    { key: 'registration', label: 'Registration', amount: registration },
  ];

  if (o.fuelType === 'gas' && o.mpg <= 0) warnings.push(`${o.name}: MPG must be greater than zero to estimate fuel cost.`);
  if (o.fuelType === 'electric' && o.milesPerKwh <= 0) warnings.push(`${o.name}: efficiency (miles per kWh) must be greater than zero.`);
  if (o.paymentMethod === 'finance' && o.downPayment + o.tradeInValue > gross) warnings.push(`${o.name}: your down payment and trade-in cover the whole price, so no loan is needed.`);

  const runningTotal = fuel + insurance + registration + maintenance + repairs + tires + schedule.slice(0, Math.min(months, o.termMonths)).reduce((p, r) => p + r.payment, 0);

  return {
    name: o.name,
    series: { months, outflows, exitValue, categories },
    categories,
    cashAtSigning,
    initialOutlay,
    purchaseIncentive,
    chargerCost,
    netUpfront,
    tradeInSurplus,
    loanAmount,
    monthlyPayment,
    salesTax,
    fees,
    totalInterest,
    depreciation,
    resaleValue,
    loanBalanceAtExit,
    netProceedsAtExit,
    underwaterAtExit,
    monthAboveWater,
    worstNegativeEquity,
    fuel,
    insurance,
    maintenance,
    tires,
    repairs,
    registration,
    totalCost,
    monthlyCost: totalCost / months,
    annualCost: totalCost / years,
    costPerMile: totalMiles > 0 ? totalCost / totalMiles : 0,
    monthlyOutOfPocket: runningTotal / months,
    totalMiles,
    valueByYear,
    warnings,
  };
}

/** Metric used by sensitivity/break-even: positive means B is cheaper (A − B). */
export function vehicleMetric(inputs: VehicleInputs): number {
  const a = computeVehicleOption(inputs.a, inputs.shared);
  const b = computeVehicleOption(inputs.b, inputs.shared);
  return a.totalCost - b.totalCost;
}

const setShared = (k: keyof VehicleShared) => (i: VehicleInputs, v: number): VehicleInputs => ({ ...i, shared: { ...i.shared, [k]: v } });
const setOpt = (side: 'a' | 'b', k: keyof VehicleOption) => (i: VehicleInputs, v: number): VehicleInputs => ({ ...i, [side]: { ...i[side], [k]: v } });

export function vehicleSensitivityVariables(inputs: VehicleInputs): SensitivityVariable<VehicleInputs>[] {
  const vars: SensitivityVariable<VehicleInputs>[] = [];
  const anyGas = inputs.a.fuelType === 'gas' || inputs.b.fuelType === 'gas';
  const anyEv = inputs.a.fuelType === 'electric' || inputs.b.fuelType === 'electric';
  const anyLoan = inputs.a.paymentMethod === 'finance' || inputs.b.paymentMethod === 'finance';

  vars.push({
    key: 'ownershipYears',
    label: 'Ownership period',
    get: (i) => i.shared.ownershipYears,
    set: setShared('ownershipYears'),
    low: (b) => Math.max(1, Math.round(b * 0.5)),
    high: (b) => Math.min(20, Math.round(b * 1.5)),
    format: (v) => `${fmtNumber(v, 0)} yr`,
    bounds: [1, 20],
  });
  vars.push({
    key: 'annualMiles',
    label: 'Miles per year',
    get: (i) => i.shared.annualMiles,
    set: setShared('annualMiles'),
    low: (b) => b * 0.6,
    high: (b) => b * 1.4,
    format: (v) => `${fmtNumber(v, 0)} mi`,
    bounds: [1000, 60000],
  });
  if (anyGas) {
    vars.push({
      key: 'gasPrice',
      label: 'Gas price',
      get: (i) => i.shared.gasPrice,
      set: setShared('gasPrice'),
      low: (b) => b * 0.7,
      high: (b) => b * 1.3,
      format: (v) => `${fmtMoney(v, 2)}/gal`,
      bounds: [0.5, 12],
    });
  }
  if (anyEv) {
    vars.push({
      key: 'electricityRate',
      label: 'Electricity rate',
      get: (i) => i.shared.electricityRate,
      set: setShared('electricityRate'),
      low: (b) => b * 0.7,
      high: (b) => b * 1.3,
      format: (v) => `${fmtMoney(v, 2)}/kWh`,
      bounds: [0.03, 1],
    });
  }
  (['a', 'b'] as const).forEach((side) => {
    const o = inputs[side];
    if (o.resaleOverride !== null && o.resaleOverride > 0) {
      vars.push({
        key: `${side}.resaleOverride`,
        label: `${o.name}: resale value`,
        get: (i) => i[side].resaleOverride ?? 0,
        set: (i, v) => ({ ...i, [side]: { ...i[side], resaleOverride: Math.max(0, Math.min(i[side].price, v)) } }),
        low: (b) => b * 0.8,
        high: (b) => b * 1.2,
        format: (v) => fmtMoney(v, 0),
        bounds: [0, o.price],
      });
    } else {
      vars.push({
        key: `${side}.annualDepreciation`,
        label: `${o.name}: depreciation rate`,
        get: (i) => i[side].annualDepreciation,
        set: (i, v) => ({ ...i, [side]: { ...i[side], annualDepreciation: v, resaleOverride: null } }),
        low: (b) => Math.max(0, b - 5),
        high: (b) => Math.min(60, b + 5),
        format: (v) => `${fmtPct(v, 0)}/yr`,
        bounds: [0, 60],
      });
    }
    vars.push({
      key: `${side}.insuranceAnnual`,
      label: `${o.name}: insurance`,
      get: (i) => i[side].insuranceAnnual,
      set: setOpt(side, 'insuranceAnnual'),
      low: (b) => b * 0.75,
      high: (b) => b * 1.25,
      format: (v) => `${fmtMoney(v, 0)}/yr`,
      bounds: [0, 20000],
    });
    vars.push({
      key: `${side}.maintenanceAnnual`,
      label: `${o.name}: maintenance & repairs`,
      get: (i) => i[side].maintenanceAnnual + i[side].repairsAnnual,
      set: (i, v) => {
        const cur = i[side].maintenanceAnnual + i[side].repairsAnnual;
        const ratio = cur > 0 ? v / cur : 1;
        return { ...i, [side]: { ...i[side], maintenanceAnnual: cur > 0 ? i[side].maintenanceAnnual * ratio : v, repairsAnnual: cur > 0 ? i[side].repairsAnnual * ratio : 0 } };
      },
      low: (b) => b * 0.6,
      high: (b) => b * 1.5,
      format: (v) => `${fmtMoney(v, 0)}/yr`,
      bounds: [0, 20000],
    });
    if (o.paymentMethod === 'finance') {
      vars.push({
        key: `${side}.apr`,
        label: `${o.name}: loan APR`,
        get: (i) => i[side].apr,
        set: setOpt(side, 'apr'),
        low: (b) => Math.max(0, b - 2),
        high: (b) => b + 2,
        format: (v) => fmtPct(v, 1),
        bounds: [0, 30],
      });
    }
    if (o.fuelType === 'gas') {
      vars.push({
        key: `${side}.mpg`,
        label: `${o.name}: MPG`,
        get: (i) => i[side].mpg,
        set: setOpt(side, 'mpg'),
        low: (b) => Math.max(5, b * 0.85),
        high: (b) => b * 1.15,
        format: (v) => `${fmtNumber(v, 0)} mpg`,
        bounds: [5, 150],
      });
    }
  });
  if (anyLoan) {
    vars.push({
      key: 'investmentReturn',
      label: 'Investment return',
      get: (i) => i.shared.investmentReturn,
      set: setShared('investmentReturn'),
      low: (b) => Math.max(0, b - 3),
      high: (b) => b + 3,
      format: (v) => fmtPct(v, 1),
      bounds: [0, 20],
      hint: 'Only affects the "invest the difference" projection, not the nominal cost.',
    });
  }
  return vars;
}

export function computeVehicle(inputs: VehicleInputs): VehicleResult {
  const a = computeVehicleOption(inputs.a, inputs.shared);
  const b = computeVehicleOption(inputs.b, inputs.shared);
  const comparison = compareCashflows(a.series, b.series, pct(inputs.shared.investmentReturn));
  const vars = vehicleSensitivityVariables(inputs).filter((v) => v.key !== 'investmentReturn');
  const sensitivity = runSensitivity(inputs, vehicleMetric, vars);
  const breakEvens = vehicleBreakEvens(inputs, vars, comparison);
  return { a, b, comparison, sensitivity, breakEvens, warnings: [...a.warnings, ...b.warnings] };
}

function vehicleBreakEvens(inputs: VehicleInputs, vars: SensitivityVariable<VehicleInputs>[], cmp: ComparisonResult): VehicleBreakEven[] {
  const out: VehicleBreakEven[] = [];
  const cheaperName = cmp.cheaper === 'b' ? inputs.b.name : inputs.a.name;
  const otherName = cmp.cheaper === 'b' ? inputs.a.name : inputs.b.name;
  if (cmp.cheaper === 'tie') return out;

  const tryVar = (key: string, build: (v: number, positiveAbove: boolean) => string, label: string) => {
    const v = vars.find((x) => x.key === key);
    if (!v) return;
    const be = findBreakEven(inputs, vehicleMetric, v);
    if (be.value === null || be.positiveAbove === null) return;
    out.push({ key, label, value: be.value, text: build(be.value, be.positiveAbove) });
  };

  tryVar(
    'gasPrice',
    (v, posAbove) => {
      // metric positive → B cheaper. If posAbove, B is cheaper when gas is above v.
      const bCheaperAbove = posAbove;
      const dir = cmp.cheaper === 'b' ? (bCheaperAbove ? 'fell below' : 'rose above') : bCheaperAbove ? 'rose above' : 'fell below';
      return `If gas ${dir} ${fmtMoney(v, 2)}/gal, ${otherName} would become the cheaper choice.`;
    },
    'Gas price',
  );
  tryVar(
    'electricityRate',
    (v, posAbove) => {
      const dir = cmp.cheaper === 'b' ? (posAbove ? 'fell below' : 'rose above') : posAbove ? 'rose above' : 'fell below';
      return `If electricity ${dir} ${fmtMoney(v, 2)}/kWh, ${otherName} would become the cheaper choice.`;
    },
    'Electricity rate',
  );
  tryVar(
    'annualMiles',
    (v, posAbove) => {
      const dir = cmp.cheaper === 'b' ? (posAbove ? 'less than' : 'more than') : posAbove ? 'more than' : 'less than';
      return `If you drove ${dir} about ${fmtNumber(v, -2)} miles a year, ${otherName} would come out ahead.`;
    },
    'Miles per year',
  );

  // Ownership crossover from the cost-to-date curve.
  const x = cmp.crossover;
  if (x.month !== null && x.year !== null) {
    const yrs = x.year;
    const label = yrs < 1 ? `${Math.round(x.month)} months` : `${fmtNumber(yrs, 1)} years`;
    out.push({
      key: 'crossover',
      label: 'Ownership length',
      value: yrs,
      text: `${cheaperName} becomes the cheaper choice after about ${label} of ownership. Before that, ${otherName} is ahead because of its lower upfront cost or slower early depreciation.`,
    });
  } else {
    out.push({
      key: 'crossover',
      label: 'Ownership length',
      value: null,
      text: `${cheaperName} is the cheaper choice at every point in your ${inputs.shared.ownershipYears}-year ownership period, even if you sold early.`,
    });
  }
  return out;
}

export function swapVehicleInputs(i: VehicleInputs): VehicleInputs {
  return { ...i, a: i.b, b: i.a };
}
