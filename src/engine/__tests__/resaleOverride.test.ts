import { describe, expect, it } from 'vitest';
import { computeVehicleOption, vehicleValueAtMonth, type VehicleOption } from '../calculators/vehicle';

const car: VehicleOption = {
  name: 'Test', price: 30000, paymentMethod: 'cash', downPayment: 0, tradeInValue: 0,
  salesTaxRate: 0, fees: 0, apr: 0, termMonths: 60, fuelType: 'gas', mpg: 30, milesPerKwh: 0,
  insuranceAnnual: 0, registrationAnnual: 0, maintenanceAnnual: 0, repairsAnnual: 0,
  tireSetCost: 0, tireIntervalMiles: 0, firstYearDepreciation: 20, annualDepreciation: 12,
  resaleOverride: null, purchaseIncentive: 0, chargerCost: 0,
};

describe('resaleOverride always pins the end value', () => {
  it('override BELOW after-first-year value (should pass today)', () => {
    expect(vehicleValueAtMonth({ ...car, resaleOverride: 15000 }, 5, 60)).toBeCloseTo(15000, 4);
  });
  it('override ABOVE after-first-year value — audit claim', () => {
    // $30k car, 20% Y1 drop -> $24k. Override $28k should pin to $28k at 5 years.
    expect(vehicleValueAtMonth({ ...car, resaleOverride: 28000 }, 5, 60)).toBeCloseTo(28000, 4);
  });
  it('override EQUAL to after-first-year value', () => {
    expect(vehicleValueAtMonth({ ...car, resaleOverride: 24000 }, 5, 60)).toBeCloseTo(24000, 4);
  });
  it('override EQUAL to price', () => {
    expect(vehicleValueAtMonth({ ...car, resaleOverride: 30000 }, 5, 60)).toBeCloseTo(30000, 4);
  });
  it('override 0 (scrap) pins to zero', () => {
    expect(vehicleValueAtMonth({ ...car, resaleOverride: 0 }, 5, 60)).toBeCloseTo(0, 4);
  });
  it('curve stays monotonically decreasing for a high override', () => {
    const o = { ...car, resaleOverride: 28000 };
    let prev = Infinity;
    for (let t = 0; t <= 60; t++) {
      const v = vehicleValueAtMonth(o, 5, t);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
  });
});

describe('purchase incentives and charger cost', () => {
  const shared = { annualMiles: 12000, gasPrice: 3.5, electricityRate: 0.16, ownershipYears: 5, investmentReturn: 7, costInflation: 0, fuelPriceGrowth: 0 };

  it('an incentive reduces total cost dollar-for-dollar and keeps the category identity', () => {
    const base = computeVehicleOption(car, shared);
    const withCredit = computeVehicleOption({ ...car, purchaseIncentive: 7500 }, shared);
    expect(withCredit.totalCost).toBeCloseTo(base.totalCost - 7500, 4);
    expect(withCredit.purchaseIncentive).toBe(7500);
    const catSum = withCredit.categories.reduce((p, c) => p + c.amount, 0);
    expect(catSum).toBeCloseTo(withCredit.totalCost, 4);
  });

  it('an incentive does not change sales tax, resale value or depreciation', () => {
    const base = computeVehicleOption(car, shared);
    const withCredit = computeVehicleOption({ ...car, purchaseIncentive: 7500 }, shared);
    expect(withCredit.salesTax).toBeCloseTo(base.salesTax, 6);
    expect(withCredit.resaleValue).toBeCloseTo(base.resaleValue, 6);
    expect(withCredit.depreciation).toBeCloseTo(base.depreciation, 6);
  });

  it('the incentive lands at purchase, not spread over the term', () => {
    const base = computeVehicleOption(car, shared);
    const withCredit = computeVehicleOption({ ...car, purchaseIncentive: 7500 }, shared);
    expect(withCredit.series.outflows[0]).toBeCloseTo(base.series.outflows[0] - 7500, 4);
    expect(withCredit.series.outflows[1]).toBeCloseTo(base.series.outflows[1], 6);
    expect(withCredit.netUpfront).toBeCloseTo(withCredit.initialOutlay - 7500, 4);
  });

  it('a charger adds a one-time cost at purchase', () => {
    const base = computeVehicleOption(car, shared);
    const withCharger = computeVehicleOption({ ...car, chargerCost: 1500 }, shared);
    expect(withCharger.totalCost).toBeCloseTo(base.totalCost + 1500, 4);
    expect(withCharger.series.outflows[0]).toBeCloseTo(base.series.outflows[0] + 1500, 4);
    const catSum = withCharger.categories.reduce((p, c) => p + c.amount, 0);
    expect(catSum).toBeCloseTo(withCharger.totalCost, 4);
  });

  it('an incentive larger than the car is capped and flagged', () => {
    const r = computeVehicleOption({ ...car, purchaseIncentive: 999999 }, shared);
    expect(r.purchaseIncentive).toBeLessThanOrEqual(car.price + car.fees + 1);
    expect(r.warnings.some((w) => w.includes('capped'))).toBe(true);
  });

  it('zero incentive and zero charger add no breakdown rows', () => {
    const r = computeVehicleOption(car, shared);
    expect(r.categories.some((c) => c.key === 'incentives' || c.key === 'charger')).toBe(false);
  });
});
