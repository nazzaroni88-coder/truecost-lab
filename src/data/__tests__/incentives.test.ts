import { describe, expect, it } from 'vitest';
import { ALL_INCENTIVES, DATA_REVIEWED, STATES_WITH_DATA, US_STATES, confirmedTotal, matchIncentives, suggestedTotal, type IncentiveQuery } from '../incentives';

const base: IncentiveQuery = {
  purchaseType: 'new',
  state: '',
  vehiclePrice: 42000,
  bodyStyle: 'car',
  income: 'unknown',
  filingStatus: 'single',
};

describe('incentive dataset integrity', () => {
  it('every programme carries a source and a sane amount', () => {
    for (const inc of ALL_INCENTIVES) {
      expect(inc.sourceUrl, inc.id).toMatch(/^https:\/\//);
      expect(inc.sourceLabel.length, inc.id).toBeGreaterThan(3);
      expect(inc.maxAmount, inc.id).toBeGreaterThanOrEqual(0);
      expect(inc.appliesTo.length, inc.id).toBeGreaterThan(0);
      expect(inc.amountNote.length, inc.id).toBeGreaterThan(20);
    }
  });
  it('ids are unique', () => {
    const ids = ALL_INCENTIVES.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every state programme uses a real state code that the picker offers', () => {
    const codes = new Set(US_STATES.map((s) => s.code));
    for (const code of STATES_WITH_DATA) expect(codes.has(code), code).toBe(true);
  });
  it('federal programmes are flagged volatile so the UI warns about them', () => {
    for (const inc of ALL_INCENTIVES.filter((i) => i.region === 'US')) expect(inc.volatile, inc.id).toBe(true);
  });
  it('states the review date so the UI cannot imply freshness it lacks', () => {
    expect(DATA_REVIEWED.length).toBeGreaterThan(3);
  });
});

describe('eligibility matching', () => {
  it('rules out the new-vehicle credit above the car price cap', () => {
    const m = matchIncentives({ ...base, vehiclePrice: 60000 }).find((x) => x.incentive.id === 'us-30d')!;
    expect(m.status).toBe('ruled-out');
    expect(m.amount).toBe(0);
    expect(m.reasons[0]).toContain('price cap');
  });

  it('allows the same vehicle as an SUV, where the cap is higher', () => {
    const m = matchIncentives({ ...base, vehiclePrice: 60000, bodyStyle: 'suv' }).find((x) => x.incentive.id === 'us-30d')!;
    expect(m.status).not.toBe('ruled-out');
    expect(m.amount).toBe(7500);
  });

  it('rules out on income when income is known and over the cap', () => {
    const m = matchIncentives({ ...base, income: 400000, filingStatus: 'single' }).find((x) => x.incentive.id === 'us-30d')!;
    expect(m.status).toBe('ruled-out');
    expect(m.reasons[0]).toContain('Income cap');
  });

  it('uses the joint cap for joint filers', () => {
    const single = matchIncentives({ ...base, income: 200000, filingStatus: 'single' }).find((x) => x.incentive.id === 'us-30d')!;
    const joint = matchIncentives({ ...base, income: 200000, filingStatus: 'joint' }).find((x) => x.incentive.id === 'us-30d')!;
    expect(single.status).toBe('ruled-out');
    expect(joint.status).not.toBe('ruled-out');
  });

  it('asks rather than assumes when income is unknown', () => {
    const m = matchIncentives(base).find((x) => x.incentive.id === 'us-30d')!;
    expect(m.status).toBe('check');
    expect(m.reasons.some((r) => r.includes('Income must be under'))).toBe(true);
  });

  it('the used credit is 30% of price, capped', () => {
    const cheap = matchIncentives({ ...base, purchaseType: 'used', vehiclePrice: 12000 }).find((x) => x.incentive.id === 'us-25e')!;
    expect(cheap.amount).toBe(3600);
    const dear = matchIncentives({ ...base, purchaseType: 'used', vehiclePrice: 20000 }).find((x) => x.incentive.id === 'us-25e')!;
    expect(dear.amount).toBe(4000);
  });

  it('the used credit is ruled out above its own price cap', () => {
    const m = matchIncentives({ ...base, purchaseType: 'used', vehiclePrice: 30000 }).find((x) => x.incentive.id === 'us-25e')!;
    expect(m.status).toBe('ruled-out');
  });

  it('switching purchase type swaps which programmes apply', () => {
    const newIds = matchIncentives(base).filter((m) => m.status !== 'ruled-out').map((m) => m.incentive.id);
    const usedIds = matchIncentives({ ...base, purchaseType: 'used', vehiclePrice: 20000 }).filter((m) => m.status !== 'ruled-out').map((m) => m.incentive.id);
    expect(newIds).toContain('us-30d');
    expect(newIds).not.toContain('us-25e');
    expect(usedIds).toContain('us-25e');
    expect(usedIds).not.toContain('us-30d');
  });

  it('only includes programmes for the selected state', () => {
    const co = matchIncentives({ ...base, state: 'CO', vehiclePrice: 30000 });
    expect(co.some((m) => m.incentive.id === 'co-ev')).toBe(true);
    expect(co.some((m) => m.incentive.id === 'ny-drive-clean')).toBe(false);
    const none = matchIncentives({ ...base, state: 'WY' });
    expect(none.every((m) => m.incentive.region === 'US')).toBe(true);
  });

  it('separates the caveat-free subset from the headline suggestion', () => {
    // With income unknown, every capped federal programme is only "check", so the confident total
    // must not include it — the whole point is that we do not overstate.
    const m = matchIncentives(base);
    expect(confirmedTotal(m)).toBe(0);
    expect(suggestedTotal(m)).toBeGreaterThan(0);
  });

  it('the caveat-free total never exceeds the headline suggestion', () => {
    for (const state of ['', 'CO', 'NY', 'CA', 'MA', 'WY']) {
      for (const purchaseType of ['new', 'used', 'lease'] as const) {
        for (const price of [12000, 30000, 45000, 90000]) {
          const m = matchIncentives({ ...base, state, purchaseType, vehiclePrice: price, income: 60000 });
          expect(confirmedTotal(m)).toBeLessThanOrEqual(suggestedTotal(m));
          expect(confirmedTotal(m)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('excludes the New Jersey sales-tax exemption from totals, since it is modelled as a tax rate', () => {
    const m = matchIncentives({ ...base, state: 'NJ', income: 60000 });
    expect(m.some((x) => x.incentive.id === 'nj-salestax')).toBe(true);
    const withoutNj = m.filter((x) => x.incentive.id !== 'nj-salestax');
    expect(suggestedTotal(m)).toBe(suggestedTotal(withoutNj));
  });

  it('ruled-out programmes always carry a reason', () => {
    const m = matchIncentives({ ...base, vehiclePrice: 90000, purchaseType: 'used', income: 500000, state: 'CO' });
    for (const x of m.filter((y) => y.status === 'ruled-out')) expect(x.reasons.length, x.incentive.id).toBeGreaterThan(0);
  });

  it('sorts likely matches before ones needing a check, and ruled-out last', () => {
    const m = matchIncentives({ ...base, state: 'CO', vehiclePrice: 30000, income: 60000 });
    const order = m.map((x) => x.status);
    const rank = { likely: 0, check: 1, 'ruled-out': 2 } as const;
    for (let i = 1; i < order.length; i++) expect(rank[order[i]]).toBeGreaterThanOrEqual(rank[order[i - 1]]);
  });
});
