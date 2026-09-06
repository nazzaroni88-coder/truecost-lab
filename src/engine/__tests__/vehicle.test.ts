import { describe, expect, it } from 'vitest';
import { computeVehicle, computeVehicleOption, vehicleValueAtMonth, type VehicleInputs, type VehicleOption, type VehicleShared } from '../calculators/vehicle';
import { paymentForLoan, totalInterest } from '../core/money';

const gasCar: VehicleOption = {
  name: 'Gas sedan',
  price: 30000,
  paymentMethod: 'finance',
  downPayment: 5000,
  tradeInValue: 0,
  salesTaxRate: 7,
  fees: 500,
  apr: 6,
  termMonths: 60,
  fuelType: 'gas',
  mpg: 32,
  milesPerKwh: 0,
  insuranceAnnual: 1500,
  registrationAnnual: 150,
  maintenanceAnnual: 600,
  repairsAnnual: 200,
  tireSetCost: 700,
  tireIntervalMiles: 50000,
  firstYearDepreciation: 20,
  annualDepreciation: 12,
  resaleOverride: null,
};

const ev: VehicleOption = {
  ...gasCar,
  name: 'EV',
  price: 42000,
  fuelType: 'electric',
  mpg: 0,
  milesPerKwh: 4,
  maintenanceAnnual: 350,
  insuranceAnnual: 1900,
  firstYearDepreciation: 25,
  annualDepreciation: 14,
};

const shared: VehicleShared = {
  annualMiles: 12000,
  gasPrice: 3.5,
  electricityRate: 0.16,
  ownershipYears: 5,
  investmentReturn: 7,
  costInflation: 0,
  fuelPriceGrowth: 0,
};

describe('computeVehicleOption', () => {
  it('computes tax, loan, payment, and interest consistently', () => {
    const r = computeVehicleOption(gasCar, shared);
    expect(r.salesTax).toBeCloseTo(2100, 6);
    expect(r.fees).toBe(500);
    expect(r.loanAmount).toBeCloseTo(30000 + 2100 + 500 - 5000, 6);
    expect(r.monthlyPayment).toBeCloseTo(paymentForLoan(27600, 0.06, 60), 6);
    expect(r.totalInterest).toBeCloseTo(totalInterest(27600, 0.06, 60), 2);
    expect(r.cashAtSigning).toBe(5000);
    expect(r.loanBalanceAtExit).toBeCloseTo(0, 4);
  });
  it('total cost identity: price + tax + fees + interest + running − resale', () => {
    const r = computeVehicleOption(gasCar, shared);
    const running = r.fuel + r.insurance + r.maintenance + r.tires + r.repairs + r.registration;
    const expected = gasCar.price + r.salesTax + r.fees + r.totalInterest + running - r.resaleValue;
    expect(r.totalCost).toBeCloseTo(expected, 4);
    const catSum = r.categories.reduce((p, c) => p + c.amount, 0);
    expect(catSum).toBeCloseTo(r.totalCost, 4);
  });
  it('fuel cost: miles / mpg × price, no inflation', () => {
    const r = computeVehicleOption(gasCar, shared);
    expect(r.fuel).toBeCloseTo((12000 / 32) * 3.5 * 5, 4);
  });
  it('electricity cost: miles / (mi per kWh) × rate', () => {
    const r = computeVehicleOption(ev, shared);
    expect(r.fuel).toBeCloseTo((12000 / 4) * 0.16 * 5, 4);
  });
  it('depreciation curve: first-year drop then steady rate', () => {
    expect(vehicleValueAtMonth(gasCar, 5, 0)).toBe(30000);
    expect(vehicleValueAtMonth(gasCar, 5, 12)).toBeCloseTo(24000, 6);
    expect(vehicleValueAtMonth(gasCar, 5, 24)).toBeCloseTo(24000 * 0.88, 6);
    expect(vehicleValueAtMonth(gasCar, 5, 60)).toBeCloseTo(24000 * Math.pow(0.88, 4), 6);
  });
  it('resale override pins the end value', () => {
    const o = { ...gasCar, resaleOverride: 15000 };
    expect(vehicleValueAtMonth(o, 5, 60)).toBeCloseTo(15000, 6);
    expect(vehicleValueAtMonth(o, 5, 12)).toBeCloseTo(24000, 6); // first-year drop unchanged
    const r = computeVehicleOption(o, shared);
    expect(r.resaleValue).toBeCloseTo(15000, 6);
    expect(r.depreciation).toBeCloseTo(15000, 6);
  });
  it('cash purchase: everything upfront, no interest', () => {
    const r = computeVehicleOption({ ...gasCar, paymentMethod: 'cash' }, shared);
    expect(r.cashAtSigning).toBeCloseTo(32600, 6);
    expect(r.loanAmount).toBe(0);
    expect(r.totalInterest).toBe(0);
    expect(r.monthlyPayment).toBe(0);
  });
  it('trade-in reduces taxable price and is counted as money put in', () => {
    const r = computeVehicleOption({ ...gasCar, tradeInValue: 8000 }, shared);
    expect(r.salesTax).toBeCloseTo(22000 * 0.07, 6);
    expect(r.loanAmount).toBeCloseTo(30000 + 1540 + 500 - 5000 - 8000, 6);
    expect(r.initialOutlay).toBe(5000 + 8000);
  });
  it('selling before the loan ends pays off the remaining balance from proceeds', () => {
    const r = computeVehicleOption({ ...gasCar, termMonths: 72 }, { ...shared, ownershipYears: 3 });
    expect(r.loanBalanceAtExit).toBeGreaterThan(0);
    expect(r.series.exitValue[36]).toBeCloseTo(r.resaleValue - r.loanBalanceAtExit, 6);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
  it('cost inflation increases recurring costs after year 1', () => {
    const base = computeVehicleOption(gasCar, shared);
    const infl = computeVehicleOption(gasCar, { ...shared, costInflation: 3 });
    expect(infl.insurance).toBeGreaterThan(base.insurance);
    expect(infl.insurance).toBeCloseTo(1500 * (1 + 1.03 + 1.03 ** 2 + 1.03 ** 3 + 1.03 ** 4), 4);
  });
  it('zero-mileage and zero-cost edge cases do not produce NaN', () => {
    const r = computeVehicleOption({ ...gasCar, mpg: 0, insuranceAnnual: 0, tireIntervalMiles: 0 }, { ...shared, annualMiles: 0 });
    expect(Number.isFinite(r.totalCost)).toBe(true);
    expect(r.costPerMile).toBe(0);
    expect(r.fuel).toBe(0);
  });
  it('cost per mile = total / miles', () => {
    const r = computeVehicleOption(gasCar, shared);
    expect(r.costPerMile).toBeCloseTo(r.totalCost / 60000, 8);
  });
});

describe('computeVehicle (comparison)', () => {
  const inputs: VehicleInputs = { a: gasCar, b: ev, shared };
  it('produces a coherent comparison with sensitivity and break-evens', () => {
    const r = computeVehicle(inputs);
    expect(r.comparison.nominalDifference).toBeCloseTo(r.a.totalCost - r.b.totalCost, 6);
    expect(r.sensitivity.length).toBeGreaterThan(5);
    expect(r.sensitivity[0].swing).toBeGreaterThanOrEqual(r.sensitivity[r.sensitivity.length - 1].swing);
    expect(r.breakEvens.some((b) => b.key === 'crossover')).toBe(true);
    // gas price break-even exists and is a positive number when it appears
    const gas = r.breakEvens.find((b) => b.key === 'gasPrice');
    if (gas) expect(gas.value).toBeGreaterThan(0);
  });
  it('identical options tie', () => {
    const r = computeVehicle({ a: gasCar, b: { ...gasCar, name: 'Same' }, shared });
    expect(r.comparison.cheaper).toBe('tie');
    expect(r.comparison.wealthDifference).toBeCloseTo(0, 6);
  });
  it('finance vs cash: identical car, cash avoids interest but loses investment growth', () => {
    const r = computeVehicle({ a: { ...gasCar, paymentMethod: 'cash', name: 'Cash' }, b: { ...gasCar, name: 'Finance' }, shared });
    // Nominally cash is cheaper by exactly the interest.
    expect(r.comparison.nominalDifference).toBeCloseTo(-r.b.totalInterest, 4);
    // With a 7% return vs 6% APR, financing and investing comes out slightly ahead in wealth terms.
    expect(r.comparison.wealthDifference).toBeGreaterThan(0);
    // With a 3% return, paying cash wins.
    const r2 = computeVehicle({ a: { ...gasCar, paymentMethod: 'cash' }, b: gasCar, shared: { ...shared, investmentReturn: 3 } });
    expect(r2.comparison.wealthDifference).toBeLessThan(0);
  });
});
