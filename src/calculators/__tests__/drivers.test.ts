import { describe, expect, it } from 'vitest';
import { summaryDrivers } from '../drivers';

const cat = (key: string, amount: number, label = key) => ({ key, label, amount });

describe('summaryDrivers', () => {
  it('states the difference, not the two totals', () => {
    const [d] = summaryDrivers([cat('dep', 23506, 'Depreciation')], [cat('dep', 14709, 'Depreciation')], 'Tesla', 'Camry', 8797);
    expect(d.label).toBe('Depreciation');
    expect(d.amount).toBe(8797);
    expect(d.costlierFor).toBe('a');
    expect(d.costlierName).toBe('Tesla');
  });

  it('attributes a category to whichever option it is worse for', () => {
    const [d] = summaryDrivers([cat('fuel', 1000)], [cat('fuel', 4000)], 'EV', 'Gas', 3000);
    expect(d.costlierFor).toBe('b');
    expect(d.costlierName).toBe('Gas');
    expect(d.amount).toBe(3000);
  });

  it('reports each category as a fraction of the headline gap', () => {
    const drivers = summaryDrivers([cat('dep', 8000), cat('fuel', 2000)], [cat('dep', 0), cat('fuel', 0)], 'A', 'B', 10000);
    expect(drivers.map((d) => d.shareOfGap)).toEqual([0.8, 0.2]);
  });

  it('ranks biggest first regardless of direction', () => {
    const drivers = summaryDrivers([cat('small', 1500), cat('big', 0)], [cat('small', 0), cat('big', 9000)], 'A', 'B', 7500);
    expect(drivers.map((d) => d.label)).toEqual(['big', 'small']);
    expect(drivers[0].costlierFor).toBe('b');
    expect(drivers[1].costlierFor).toBe('a');
  });

  it('drops categories too small to matter on a share card', () => {
    const drivers = summaryDrivers([cat('dep', 10000), cat('crumb', 50)], [cat('dep', 0), cat('crumb', 0)], 'A', 'B', 10050);
    expect(drivers.map((d) => d.label)).toEqual(['dep']);
  });

  it('drops categories that are identical for both options', () => {
    const drivers = summaryDrivers([cat('dep', 8000), cat('tax', 2000)], [cat('dep', 0), cat('tax', 2000)], 'A', 'B', 8000);
    expect(drivers.map((d) => d.label)).toEqual(['dep']);
  });

  it('handles a category present on only one side', () => {
    const [d] = summaryDrivers([cat('charger', 1200, 'Home charger')], [], 'EV', 'Gas', 1200);
    expect(d.label).toBe('Home charger');
    expect(d.amount).toBe(1200);
    expect(d.costlierFor).toBe('a');
  });

  it('keeps every driver but reports no share when the two options are level', () => {
    // A near-zero gap would turn any percentage into a meaningless huge number.
    const drivers = summaryDrivers([cat('dep', 8000), cat('fuel', 0)], [cat('dep', 0), cat('fuel', 8000)], 'A', 'B', 0);
    expect(drivers).toHaveLength(2);
    expect(drivers.every((d) => d.shareOfGap === 0)).toBe(true);
  });

  it('never returns more than fits on a card', () => {
    const a = Array.from({ length: 9 }, (_, n) => cat(`k${n}`, (n + 1) * 1000));
    const drivers = summaryDrivers(a, [], 'A', 'B', 45000);
    expect(drivers).toHaveLength(4);
    expect(drivers[0].label).toBe('k8');
  });

  it('returns nothing when the options are identical', () => {
    expect(summaryDrivers([cat('dep', 5000)], [cat('dep', 5000)], 'A', 'B', 0)).toEqual([]);
  });
});

describe('summaryDrivers share of gap', () => {
  it('reports no share for a category larger than the gap it helps create', () => {
    // Solar: $57,385 of savings against $18,000 of panels nets to a $39,385 gap, so the savings
    // line alone is more than the whole answer. A percentage there reads as a bug.
    const drivers = summaryDrivers([cat('savings', 57385, 'Savings earned')], [cat('upfront', 18000, 'Upfront cost')], 'Grid', 'Solar', 39385);
    const savings = drivers.find((d) => d.label === 'Savings earned')!;
    expect(savings.amount).toBe(57385);
    expect(savings.shareOfGap).toBe(0);
  });

  it('still reports a share for a category that fits inside the gap', () => {
    const drivers = summaryDrivers([cat('upfront', 18000, 'Upfront cost')], [], 'A', 'B', 39385);
    expect(drivers[0].shareOfGap).toBeCloseTo(18000 / 39385, 6);
  });

  it('reports a share of exactly one when a single category is the whole gap', () => {
    expect(summaryDrivers([cat('dep', 5000)], [], 'A', 'B', 5000)[0].shareOfGap).toBe(1);
  });
});

describe('summaryDrivers labelling', () => {
  it('names a category the way the option paying more names it', () => {
    // An EV calls its fuel "Electricity" and a petrol car calls it "Fuel". Taking A's label
    // unconditionally produced "Electricity, $3,131 more for the RAV4 Hybrid", which burns petrol.
    const [d] = summaryDrivers([cat('fuel', 1200, 'Electricity')], [cat('fuel', 4300, 'Fuel')], 'Model Y', 'RAV4 Hybrid', 3100);
    expect(d.costlierName).toBe('RAV4 Hybrid');
    expect(d.label).toBe('Fuel');
  });

  it('keeps A’s label when A is the one paying more', () => {
    const [d] = summaryDrivers([cat('fuel', 4300, 'Electricity')], [cat('fuel', 1200, 'Fuel')], 'Model Y', 'RAV4 Hybrid', 3100);
    expect(d.costlierName).toBe('Model Y');
    expect(d.label).toBe('Electricity');
  });

  it('falls back to the other side when only one names the category', () => {
    const [d] = summaryDrivers([], [cat('charger', 1200, 'Home charger')], 'A', 'B', 1200);
    expect(d.label).toBe('Home charger');
  });
});
