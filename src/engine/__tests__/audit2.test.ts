/**
 * Regression tests for the second hostile-review pass. Each block pins a defect that shipped in
 * the first version so it cannot silently come back.
 */
import { describe, expect, it } from 'vitest';
import { computeVehicle, computeVehicleOption } from '../calculators/vehicle';
import { vehicleDefaults } from '../../calculators/vehicle/presets';
import { computeRentBuy } from '../calculators/rentBuy';
import { rentBuyDefaults } from '../../calculators/rentBuy/presets';
import { computePurchaseInvest } from '../calculators/purchaseInvest';
import { purchaseDefaults } from '../../calculators/purchaseInvest/presets';
import { computeCustom } from '../calculators/custom';
import { customDefaults } from '../../calculators/custom/presets';
import { isRealistic } from '../core/sensitivity';
import { plural, yearsLabel } from '../../lib/format';
import { MemoryAdapter } from '../../scenarios/storage';
import { ScenarioStore } from '../../scenarios/store';

describe('negative equity is surfaced, not hidden', () => {
  const shortOwnership = { ...vehicleDefaults, shared: { ...vehicleDefaults.shared, ownershipYears: 1 } };

  it('reports the loan payoff and the cash you must bring to sell', () => {
    const r = computeVehicleOption(shortOwnership.a, shortOwnership.shared);
    expect(r.loanBalanceAtExit).toBeGreaterThan(r.resaleValue);
    expect(r.underwaterAtExit).toBe(true);
    expect(r.netProceedsAtExit).toBeCloseTo(r.resaleValue - r.loanBalanceAtExit, 6);
    expect(r.netProceedsAtExit).toBeLessThan(0);
    expect(r.worstNegativeEquity).toBeLessThanOrEqual(r.netProceedsAtExit);
    expect(r.warnings.some((w) => w.includes('bring') && w.includes('cash'))).toBe(true);
  });

  it('net proceeds match the exit value the comparison engine uses', () => {
    const r = computeVehicleOption(shortOwnership.a, shortOwnership.shared);
    expect(r.series.exitValue[12]).toBeCloseTo(r.netProceedsAtExit, 6);
  });

  it('a car owned long enough to clear its loan is not flagged', () => {
    const r = computeVehicleOption(vehicleDefaults.a, vehicleDefaults.shared);
    expect(r.underwaterAtExit).toBe(false);
    expect(r.netProceedsAtExit).toBeGreaterThan(0);
    expect(r.monthAboveWater).not.toBeNull();
    expect(r.warnings.some((w) => w.includes('bring'))).toBe(false);
  });

  it('a cash purchase is never underwater', () => {
    const r = computeVehicleOption({ ...vehicleDefaults.a, paymentMethod: 'cash' }, vehicleDefaults.shared);
    expect(r.underwaterAtExit).toBe(false);
    expect(r.monthAboveWater).toBe(0);
    expect(r.worstNegativeEquity).toBe(0);
  });
});

describe('a trade-in worth more than the car comes back to you', () => {
  const big = { ...vehicleDefaults.a, tradeInValue: 60000 }; // $60k trade on a $42k car

  it('only counts the part the purchase absorbs as money spent', () => {
    const r = computeVehicleOption(big, vehicleDefaults.shared);
    const gross = big.price + Math.max(0, big.price - big.tradeInValue) * (big.salesTaxRate / 100) + big.fees;
    expect(r.tradeInSurplus).toBeCloseTo(60000 - gross, 6);
    expect(r.initialOutlay).toBeCloseTo(gross, 6);
    expect(r.initialOutlay).toBeLessThan(big.tradeInValue);
    expect(r.loanAmount).toBe(0);
    expect(r.warnings.some((w) => w.includes('comes back to you'))).toBe(true);
  });

  it('a normal trade-in is unaffected', () => {
    const r = computeVehicleOption({ ...vehicleDefaults.a, tradeInValue: 8000 }, vehicleDefaults.shared);
    expect(r.tradeInSurplus).toBe(0);
    expect(r.initialOutlay).toBe(r.cashAtSigning + 8000);
  });
});

describe('break-evens are only stated when reachable', () => {
  it('isRealistic gates on the plausible range', () => {
    expect(isRealistic(6.5, [2, 12])).toBe(true);
    expect(isRealistic(0.89, [2, 12])).toBe(false);
    expect(isRealistic(null, [2, 12])).toBe(false);
    expect(isRealistic(NaN, [2, 12])).toBe(false);
  });

  it('does not offer a sub-2% mortgage as the way to make buying win', () => {
    // Falling home prices make buying lose by so much that the solved mortgage rate is absurd.
    const r = computeRentBuy({ ...rentBuyDefaults, appreciation: -3 });
    const mortgage = r.breakEvens.find((b) => b.key === 'mortgageApr');
    expect(mortgage).toBeUndefined();
    for (const be of r.breakEvens) expect(be.text).not.toMatch(/below about 0\.\d+%/);
  });

  it('still states realistic break-evens', () => {
    const r = computeRentBuy(rentBuyDefaults);
    expect(r.breakEvens.length).toBeGreaterThan(1);
    expect(r.breakEvens.some((b) => b.key === 'horizon')).toBe(true);
  });
});

describe('inputs that would otherwise vanish are called out', () => {
  it('warns when a monthly amount has no duration', () => {
    const r = computePurchaseInvest({ ...purchaseDefaults, oneTimeAmount: 0, monthlyAmount: 100, monthlyYears: 0 });
    expect(r.totalSpent).toBe(0);
    expect(r.warnings.some((w) => w.includes('for how long'))).toBe(true);
  });

  it('caps a resale above the amount spent instead of inventing a gain', () => {
    const r = computePurchaseInvest({ ...purchaseDefaults, oneTimeAmount: 5000, resaleValue: 99999, resaleYear: 2 });
    const m30 = r.milestones.find((m) => m.years === 30)!;
    expect(m30.netOfResale).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.includes('capped'))).toBe(true);
  });

  it('custom: warns when a resale exceeds the upfront cost it is clamped to', () => {
    const r = computeCustom({ ...customDefaults, a: { ...customDefaults.a, resaleValue: 99999 } });
    expect(r.a.terminalValue).toBeLessThanOrEqual(customDefaults.a.upfront * 2);
    expect(r.warnings.some((w) => w.includes('capped'))).toBe(true);
  });

  it('custom: a sensible resale produces no warning', () => {
    const r = computeCustom(customDefaults);
    expect(r.warnings.some((w) => w.includes('capped'))).toBe(false);
  });
});

describe('year labels are pluralized', () => {
  it('never says "1 years"', () => {
    expect(yearsLabel(1)).toBe('1 year');
    expect(yearsLabel(5)).toBe('5 years');
    expect(yearsLabel(0)).toBe('0 years');
    expect(plural(1, 'month')).toBe('1 month');
    expect(plural(3, 'month')).toBe('3 months');
  });

  it('vehicle warnings use a singular year for a one-year horizon', () => {
    const r = computeVehicle({ ...vehicleDefaults, shared: { ...vehicleDefaults.shared, ownershipYears: 1 } });
    for (const w of r.warnings) expect(w).not.toContain('1 years');
  });
});

describe('persistence failures are visible', () => {
  class FailingAdapter extends MemoryAdapter {
    private ok = true;
    override save() {
      this.ok = false; // simulate blocked storage
    }
    override isPersisting() {
      return this.ok;
    }
  }

  it('flips the persisting flag so the UI can warn', () => {
    const store = new ScenarioStore(new FailingAdapter());
    expect(store.getSnapshot().persisting).toBe(true);
    store.ensure('vehicle', { a: 1 });
    store.flush();
    expect(store.getSnapshot().persisting).toBe(false);
  });

  it('a working adapter stays healthy', () => {
    const store = new ScenarioStore(new MemoryAdapter());
    store.ensure('vehicle', { a: 1 });
    store.flush();
    expect(store.getSnapshot().persisting).toBe(true);
  });
});
