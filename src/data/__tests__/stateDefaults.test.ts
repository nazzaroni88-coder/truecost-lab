import { describe, expect, it } from 'vitest';
import { REG_BASE_EXAMPLE, STATE_DATA_REVIEWED, STATE_DEFAULTS, STATE_SOURCES, stateDefaultsFor } from '../stateDefaults';
import { US_STATES } from '../incentives';

/**
 * These assert the SUBSTANCE of the table, not its shape.
 *
 * The incentive dataset in this project once passed a test suite while every one of its 14 source
 * URLs was a 404, because the test only checked that the strings began with "https://". A range
 * check and a handful of anchors that a careless bulk edit would break are worth more than a
 * hundred assertions that the values are numbers.
 */
describe('state defaults table', () => {
  const codes = Object.keys(STATE_DEFAULTS);

  it('covers every state and DC exactly once, with no extras', () => {
    expect(codes).toHaveLength(51);
    expect(new Set(codes).size).toBe(51);
    const expected = US_STATES.map((s) => s.code).sort();
    expect([...codes].sort()).toEqual(expected);
  });

  it('has a plausible value in every field of every entry', () => {
    for (const [code, d] of Object.entries(STATE_DEFAULTS)) {
      // Louisiana is the highest combined rate in the country at ~10.1%; nothing should exceed 11%.
      expect(d.salesTaxRate, `${code} sales tax`).toBeGreaterThanOrEqual(0);
      expect(d.salesTaxRate, `${code} sales tax`).toBeLessThan(11);
      // A gas price outside this band means a decimal slipped or the column was misread.
      expect(d.gasPrice, `${code} gas`).toBeGreaterThan(2.5);
      expect(d.gasPrice, `${code} gas`).toBeLessThan(8);
      // Dollars per kWh, not cents. 0.5271 for Hawaii is right; 52.72 would not be.
      expect(d.electricityRate, `${code} electricity`).toBeGreaterThan(0.08);
      expect(d.electricityRate, `${code} electricity`).toBeLessThan(0.7);
      expect(d.evFeeAnnual, `${code} EV fee`).toBeGreaterThanOrEqual(0);
      expect(d.evFeeAnnual, `${code} EV fee`).toBeLessThanOrEqual(350);
    }
  });

  it('keeps the sales-tax-free states at zero', () => {
    // Delaware, Montana, New Hampshire and Oregon levy no general sales tax at all. If one of these
    // ever shows a rate, the column has been shifted.
    for (const code of ['DE', 'MT', 'NH', 'OR']) {
      expect(STATE_DEFAULTS[code].salesTaxRate, code).toBe(0);
    }
    // Alaska has no state rate but does have local ones, so it is small and non-zero.
    expect(STATE_DEFAULTS.AK.salesTaxRate).toBeGreaterThan(0);
    expect(STATE_DEFAULTS.AK.salesTaxRate).toBeLessThan(3);
  });

  it('preserves the well-known extremes, which catch a shifted or sorted column', () => {
    const byElectricity = [...Object.entries(STATE_DEFAULTS)].sort((a, b) => b[1].electricityRate - a[1].electricityRate);
    expect(byElectricity[0][0]).toBe('HI');
    const byGas = [...Object.entries(STATE_DEFAULTS)].sort((a, b) => b[1].gasPrice - a[1].gasPrice);
    expect(byGas[0][0]).toBe('CA');
    const byTax = [...Object.entries(STATE_DEFAULTS)].sort((a, b) => b[1].salesTaxRate - a[1].salesTaxRate);
    expect(byTax[0][0]).toBe('LA');
  });

  it('keeps the no-EV-fee states at zero rather than guessing a number', () => {
    // Per the Tax Foundation's July 2026 table these levy no statewide BEV registration surcharge.
    for (const code of ['AK', 'AZ', 'CT', 'FL', 'ME', 'MA', 'NV', 'NM', 'NY', 'DC']) {
      expect(STATE_DEFAULTS[code].evFeeAnnual, code).toBe(0);
    }
    // ...and the states that do charge one are not silently zero.
    for (const code of ['CA', 'TX', 'NJ', 'MI', 'GA']) {
      expect(STATE_DEFAULTS[code].evFeeAnnual, code).toBeGreaterThan(0);
    }
  });

  it('names a real source document for each column, not just a domain', () => {
    // One per column in StateDefaults; a dropped source is a column the UI can no longer justify.
    expect(STATE_SOURCES).toHaveLength(5);
    for (const s of STATE_SOURCES) {
      // A bare origin is the failure this catches: the URL has to point at the actual table.
      expect(s.url, s.label).toMatch(/^https:\/\/[^/]+\/.+/);
      expect(new URL(s.url).pathname.length, s.label).toBeGreaterThan(1);
      // Every source must say when it was current; an undated average is not verifiable.
      expect(s.detail, s.label).toMatch(/20\d\d/);
    }
    const hosts = STATE_SOURCES.map((s) => new URL(s.url).host);
    expect(hosts).toContain('taxfoundation.org');
    expect(hosts).toContain('gasprices.aaa.com');
    expect(hosts).toContain('www.eia.gov');
    expect(hosts).toContain('content.naic.org');
  });

  it('carries a review date the UI can show', () => {
    expect(STATE_DATA_REVIEWED).toMatch(/^[A-Z][a-z]+ 20\d\d$/);
  });

  it('holds the registration placeholder at a plainly illustrative round number', () => {
    // If this ever becomes a precise-looking figure, someone has mistaken it for sourced data.
    expect(REG_BASE_EXAMPLE % 10).toBe(0);
    expect(REG_BASE_EXAMPLE).toBeGreaterThan(0);
  });

  it('looks up by code and refuses anything else', () => {
    expect(stateDefaultsFor('CA')).not.toBeNull();
    expect(stateDefaultsFor('ca')).toBeNull();
    expect(stateDefaultsFor('ZZ')).toBeNull();
    expect(stateDefaultsFor('')).toBeNull();
    // Prototype keys must not resolve to an object that would then be read as state data.
    expect(stateDefaultsFor('constructor')).toBeNull();
    expect(stateDefaultsFor('toString')).toBeNull();
  });
});

describe('insurance index', () => {
  it('gives every state an index', () => {
    for (const [code, d] of Object.entries(STATE_DEFAULTS)) {
      expect(typeof d.insuranceIndex, code).toBe('number');
      expect(d.insuranceIndex, code).toBeGreaterThan(0);
    }
  });

  it('is a ratio around 1, not a premium', () => {
    // The whole design rests on this: a value near 1,200 here would mean someone pasted dollars in.
    for (const [code, d] of Object.entries(STATE_DEFAULTS)) {
      expect(d.insuranceIndex, code).toBeGreaterThan(0.4);
      expect(d.insuranceIndex, code).toBeLessThan(2.5);
    }
  });

  it('averages close to 1 across the states', () => {
    const all = Object.values(STATE_DEFAULTS).map((d) => d.insuranceIndex);
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    // The mean is unweighted so it sits below the population-weighted national average of 1.00,
    // but a table that had drifted off its own base would not land anywhere near it.
    expect(mean).toBeGreaterThan(0.85);
    expect(mean).toBeLessThan(1.15);
  });

  it('keeps the ordering NAIC actually reports', () => {
    const d = (c: string) => STATE_DEFAULTS[c].insuranceIndex;
    // Florida is the most expensive state and North Dakota the cheapest, at a ratio of about 2.31.
    expect(Math.max(...Object.values(STATE_DEFAULTS).map((x) => x.insuranceIndex))).toBe(d('FL'));
    expect(Math.min(...Object.values(STATE_DEFAULTS).map((x) => x.insuranceIndex))).toBe(d('ND'));
    expect(d('FL') / d('ND')).toBeCloseTo(2.31, 1);
    // The structurally expensive states sit above the average, the structurally cheap ones below.
    for (const c of ['LA', 'NY', 'DC', 'NJ', 'MI']) expect(d(c), c).toBeGreaterThan(1);
    for (const c of ['ME', 'IA', 'ID', 'VT', 'WI']) expect(d(c), c).toBeLessThan(1);
  });
});
