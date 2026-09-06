import { describe, expect, it } from 'vitest';
import { ALL_INCENTIVES, DATA_REVIEWED, STATES_WITH_DATA, US_STATES, afdcStateUrl, confirmedTotal, matchIncentives, suggestedTotal, type IncentiveQuery, type MatchStatus } from '../incentives';

const base: IncentiveQuery = {
  purchaseType: 'new',
  state: '',
  vehiclePrice: 42000,
  bodyStyle: 'car',
  income: 'unknown',
  filingStatus: 'single',
};

describe('dataset integrity', () => {
  it('every programme carries a working-shaped source URL and a real label', () => {
    for (const inc of ALL_INCENTIVES) {
      expect(inc.sourceUrl, inc.id).toMatch(/^https:\/\//);
      // The old /laws/state/XX form 404s. Any AFDC link must use the query-string form.
      if (inc.sourceUrl.includes('afdc.energy.gov')) expect(inc.sourceUrl, inc.id).toMatch(/afdc\.energy\.gov\/laws\/state_summary\?state=[A-Z]{2}$/);
      expect(inc.sourceLabel.length, inc.id).toBeGreaterThan(3);
      expect(inc.amountNote.length, inc.id).toBeGreaterThan(20);
      expect(inc.appliesTo.length, inc.id).toBeGreaterThan(0);
    }
  });

  it('builds AFDC links in the form that actually resolves', () => {
    expect(afdcStateUrl('CO')).toBe('https://afdc.energy.gov/laws/state_summary?state=CO');
  });

  it('ids are unique', () => {
    const ids = ALL_INCENTIVES.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every state programme uses a code the picker offers', () => {
    const codes = new Set(US_STATES.map((s) => s.code));
    for (const code of STATES_WITH_DATA) expect(codes.has(code), code).toBe(true);
  });

  it('names an amount only when it is meant to be trusted', () => {
    for (const inc of ALL_INCENTIVES) {
      if (inc.endedOn || inc.informational || inc.amountUnverified) expect(inc.maxAmount, `${inc.id} should not state an amount`).toBe(0);
      else expect(inc.maxAmount, `${inc.id} should state an amount`).toBeGreaterThan(0);
    }
  });

  it('states its review date', () => {
    expect(DATA_REVIEWED).toMatch(/\d{4}/);
  });
});

/**
 * These pin the outcome of the September 2026 source check. If a future edit re-enables a federal
 * purchase credit without new evidence, these fail — which is the point.
 */
describe('federal credits are recorded as ended', () => {
  const endedIds = ['us-30d', 'us-25e', 'us-45w-lease', 'us-30c-charger'];

  it.each(endedIds)('%s is marked ended with a date and no amount', (id) => {
    const inc = ALL_INCENTIVES.find((i) => i.id === id)!;
    expect(inc.endedOn, id).toBeTruthy();
    expect(inc.maxAmount, id).toBe(0);
  });

  it('the purchase credits ended 30 September 2025 and the charger credit 30 June 2026', () => {
    const on = (id: string) => ALL_INCENTIVES.find((i) => i.id === id)!.endedOn;
    expect(on('us-30d')).toBe('30 September 2025');
    expect(on('us-25e')).toBe('30 September 2025');
    expect(on('us-45w-lease')).toBe('30 September 2025');
    expect(on('us-30c-charger')).toBe('30 June 2026');
  });

  it('ended credits never contribute money, whatever the query', () => {
    for (const purchaseType of ['new', 'used', 'lease'] as const) {
      const m = matchIncentives({ ...base, purchaseType, income: 40000, vehiclePrice: 20000 });
      for (const id of endedIds) {
        const hit = m.find((x) => x.incentive.id === id);
        if (hit) {
          expect(hit.status, id).toBe('ended');
          expect(hit.amount, id).toBe(0);
        }
      }
    }
  });

  it('a buyer with no state selected is offered nothing, because nothing federal remains', () => {
    const m = matchIncentives({ ...base, income: 40000 });
    expect(suggestedTotal(m)).toBe(0);
    expect(confirmedTotal(m)).toBe(0);
  });
});

describe('the auto loan interest deduction is informational, not cash', () => {
  it('never contributes to a total and warns against entering it', () => {
    const m = matchIncentives({ ...base, income: 80000 }).find((x) => x.incentive.id === 'us-auto-loan-interest')!;
    expect(m.status).toBe('informational');
    expect(m.amount).toBe(0);
    expect(m.incentive.notes.some((n) => n.includes('Do not enter this in the incentive field'))).toBe(true);
  });

  it('is ruled out above the income phase-out and for used purchases', () => {
    const rich = matchIncentives({ ...base, income: 250000, filingStatus: 'single' }).find((x) => x.incentive.id === 'us-auto-loan-interest')!;
    expect(rich.status).toBe('ruled-out');
    const used = matchIncentives({ ...base, purchaseType: 'used', vehiclePrice: 20000 }).find((x) => x.incentive.id === 'us-auto-loan-interest')!;
    expect(used.status).toBe('ruled-out');
  });
});

describe('verified state amounts', () => {
  it('Colorado is the 2026 stepped-down figure, not the 2025 one', () => {
    const m = matchIncentives({ ...base, state: 'CO', vehiclePrice: 30000, income: 60000 }).find((x) => x.incentive.id === 'co-imvc')!;
    expect(m.amount).toBe(3250);
    expect(m.incentive.amountNote).toContain('$750');
  });

  it('Connecticut tops out at $4,000 for a new vehicle', () => {
    const m = matchIncentives({ ...base, state: 'CT', income: 60000 }).find((x) => x.incentive.id === 'ct-cheapr')!;
    expect(m.amount).toBe(4000);
  });

  it('New Jersey is a rebate, not only a sales-tax exemption, and respects its MSRP cap', () => {
    const under = matchIncentives({ ...base, state: 'NJ', vehiclePrice: 45000, income: 60000 }).find((x) => x.incentive.id === 'nj-chargeup')!;
    expect(under.amount).toBe(4000);
    const over = matchIncentives({ ...base, state: 'NJ', vehiclePrice: 70000, income: 60000 }).find((x) => x.incentive.id === 'nj-chargeup')!;
    expect(over.status).toBe('ruled-out');
    expect(over.reasons[0]).toContain('price cap');
  });

  it('Massachusetts respects its $55,000 MSRP cap', () => {
    const over = matchIncentives({ ...base, state: 'MA', vehiclePrice: 60000, income: 60000 }).find((x) => x.incentive.id === 'ma-morev')!;
    expect(over.status).toBe('ruled-out');
  });

  it('Colorado offers both the credit and the income-qualified exchange rebate', () => {
    const ids = matchIncentives({ ...base, state: 'CO', vehiclePrice: 30000, income: 60000 })
      .filter((m) => m.status === 'likely' || m.status === 'check')
      .map((m) => m.incentive.id);
    expect(ids).toContain('co-imvc');
    expect(ids).toContain('co-vxc');
  });
});

describe('unverified programmes are listed without a figure', () => {
  it.each(['il-rebate', 'vt-rebate', 'me-rebate', 'ri-drive', 'nm-credit'])('%s contributes no money', (id) => {
    const inc = ALL_INCENTIVES.find((i) => i.id === id)!;
    const m = matchIncentives({ ...base, state: inc.region, income: 60000 }).find((x) => x.incentive.id === id)!;
    expect(m.amount, id).toBe(0);
    expect(
      m.reasons.some((r) => r.includes('not verified')),
      id,
    ).toBe(true);
  });
});

describe('eligibility matching', () => {
  it('only includes programmes for the selected state', () => {
    const co = matchIncentives({ ...base, state: 'CO', vehiclePrice: 30000 });
    expect(co.some((m) => m.incentive.id === 'co-imvc')).toBe(true);
    expect(co.some((m) => m.incentive.id === 'ny-drive-clean')).toBe(false);
    const none = matchIncentives({ ...base, state: 'WY' });
    expect(none.every((m) => m.incentive.region === 'US')).toBe(true);
  });

  it('asks rather than assumes when income is unknown', () => {
    const m = matchIncentives({ ...base, state: 'CO', vehiclePrice: 30000 }).find((x) => x.incentive.id === 'co-vxc')!;
    expect(m.status).toBe('check');
  });

  it('the caveat-free total never exceeds the headline suggestion', () => {
    for (const state of ['', 'CO', 'NY', 'CA', 'MA', 'NJ', 'CT', 'OR', 'WY']) {
      for (const purchaseType of ['new', 'used', 'lease'] as const) {
        for (const price of [12000, 30000, 45000, 90000]) {
          const m = matchIncentives({ ...base, state, purchaseType, vehiclePrice: price, income: 60000 });
          expect(confirmedTotal(m)).toBeLessThanOrEqual(suggestedTotal(m));
          expect(confirmedTotal(m)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('every non-qualifying programme explains itself', () => {
    const m = matchIncentives({ ...base, vehiclePrice: 90000, purchaseType: 'used', income: 500000, state: 'CO' });
    for (const x of m.filter((y) => y.status === 'ruled-out' || y.status === 'ended')) expect(x.reasons.length, x.incentive.id).toBeGreaterThan(0);
  });

  it('sorts actionable programmes above dead ones', () => {
    const m = matchIncentives({ ...base, state: 'CO', vehiclePrice: 30000, income: 60000 });
    const rank: Record<MatchStatus, number> = { likely: 0, check: 1, informational: 2, ended: 3, 'ruled-out': 4 };
    const order = m.map((x) => rank[x.status]);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThanOrEqual(order[i - 1]);
  });
});

describe('Colorado price-tiered credit', () => {
  it('gives the base amount only above the bonus threshold', () => {
    const dear = matchIncentives({ ...base, state: 'CO', vehiclePrice: 42000, income: 60000 }).find((x) => x.incentive.id === 'co-imvc')!;
    expect(dear.amount).toBe(750);
    expect(dear.reasons.some((r) => r.includes('only applies under'))).toBe(true);
  });
  it('adds the bonus below the threshold', () => {
    const cheap = matchIncentives({ ...base, state: 'CO', vehiclePrice: 30000, income: 60000 }).find((x) => x.incentive.id === 'co-imvc')!;
    expect(cheap.amount).toBe(3250);
    expect(cheap.reasons.some((r) => r.includes('only applies under'))).toBe(false);
  });
  it('includes the bonus exactly at the threshold', () => {
    const at = matchIncentives({ ...base, state: 'CO', vehiclePrice: 35000, income: 60000 }).find((x) => x.incentive.id === 'co-imvc')!;
    expect(at.amount).toBe(3250);
  });
});
