import { describe, expect, it } from 'vitest';
import { robustnessOf } from '../Robustness';
import type { SensitivityRow } from '../../../engine/core/sensitivity';

const row = (key: string, flips: boolean, swing = 1000, label = key): SensitivityRow => ({
  key,
  label,
  base: 0,
  low: 0,
  high: 0,
  metricBase: 0,
  metricLow: flips ? -1 : 1,
  metricHigh: 1,
  swing,
  flips,
  format: (v) => String(v),
});

describe('robustnessOf', () => {
  it('says nothing when there is nothing to say', () => {
    // Purchase vs Invest has no tornado; a verdict there would be invented.
    expect(robustnessOf([])).toBeNull();
  });

  it('calls an answer solid when no assumption flips it', () => {
    const r = robustnessOf([row('a', false), row('b', false), row('c', false)])!;
    expect(r.tone).toBe('solid');
    expect(r.detail).toContain('3 assumptions');
    expect(r.flippers).toHaveLength(0);
  });

  it('counts every assumption tested, not just the ones that could flip it', () => {
    // The claim is "none of the N we tested", so N has to be the whole set or the sentence lies.
    const r = robustnessOf(Array.from({ length: 17 }, (_, i) => row(`k${i}`, false)))!;
    expect(r.detail).toContain('17 assumptions');
  });

  it('calls an answer close when one assumption alone can flip it', () => {
    const r = robustnessOf([row('dep', true, 5000, 'Depreciation rate'), row('ins', false)])!;
    expect(r.tone).toBe('fragile');
    expect(r.detail).toContain('Depreciation rate');
    expect(r.detail).toContain('alone');
  });

  it('names the biggest flippers first', () => {
    const r = robustnessOf([row('small', true, 100, 'Small'), row('big', true, 9000, 'Big')])!;
    expect(r.flippers.map((f) => f.label)).toEqual(['Big', 'Small']);
    expect(r.detail.indexOf('Big')).toBeLessThan(r.detail.indexOf('Small'));
  });

  it('names two and counts the rest rather than listing everything', () => {
    const rows = [row('a', true, 900, 'A'), row('b', true, 800, 'B'), row('c', true, 700, 'C'), row('d', true, 600, 'D')];
    const r = robustnessOf(rows)!;
    expect(r.detail).toContain('A and B');
    expect(r.detail).toContain('2 others');
    expect(r.detail).not.toContain('C');
  });

  it('uses the singular for exactly one unnamed extra', () => {
    const r = robustnessOf([row('a', true, 900, 'A'), row('b', true, 800, 'B'), row('c', true, 700, 'C')])!;
    expect(r.detail).toContain('1 other');
    expect(r.detail).not.toContain('1 others');
  });

  it('never claims robustness while something can flip the answer', () => {
    const r = robustnessOf([row('a', false), row('b', true)])!;
    expect(r.tone).toBe('fragile');
    expect(r.lead).not.toMatch(/holds/i);
  });
});
