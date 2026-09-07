import { describe, expect, it } from 'vitest';
import { REGISTRY } from '../../calculators/registry';
import { COMPARISONS } from '../../content/comparisons';
import { vehicleDefaults } from '../../calculators/vehicle/presets';
import { fmtMoney, roundHeadline } from '../../lib/format';
import type { ShareSummary } from '../../calculators/types';

/**
 * The homepage and the calculator have to quote the same dollar figure.
 *
 * They did not. The hero called `computeVehicle(vehicleDefaults)` and formatted the raw difference
 * itself — $10,829 — while the calculator, the comparison pages and every share card ran the same
 * number through `roundHeadline` and printed $10,850. The maths agreed to the cent; only the
 * presentation diverged, which is the kind of gap that costs a money tool its credibility.
 *
 * These lock the two together at the seam where they drifted.
 */

const vehicle = REGISTRY.find((d) => d.id === 'vehicle')!;

/** The dollar figures a rendered string contains, e.g. "$10,850" -> ["$10,850"]. */
function moneyTokens(s: string): string[] {
  return s.match(/\$[\d,]+(?:\.\d+)?/g) ?? [];
}

describe('homepage demo agrees with the vehicle calculator', () => {
  it('quotes the amount the calculator summary quotes', () => {
    const inputs = vehicle.normalize(vehicleDefaults);
    const result = vehicle.compute(inputs) as { comparison: { nominalDifference: number } };
    const summary = vehicle.summary(inputs, result) as ShareSummary;

    // What the hero renders.
    const heroAmount = fmtMoney(roundHeadline(Math.abs(result.comparison.nominalDifference)), 0);

    expect(summary.headline).toContain(heroAmount);
  });

  it('uses the same scenario the default vehicle preset uses', () => {
    // The hero is the first preset, not a private set of numbers that can drift away from it.
    expect(JSON.stringify(vehicleDefaults)).toBe(JSON.stringify(vehicle.presets[0].inputs));
  });

  it('names the same winner everywhere', () => {
    const inputs = vehicle.normalize(vehicleDefaults);
    const result = vehicle.compute(inputs) as { a: { name: string }; b: { name: string }; comparison: { cheaper: 'a' | 'b' | 'tie' } };
    const summary = vehicle.summary(inputs, result) as ShareSummary;
    const winnerName = result.comparison.cheaper === 'b' ? result.b.name : result.a.name;
    expect(summary.winner).toBe(result.comparison.cheaper);
    expect(summary.headline.startsWith(winnerName)).toBe(true);
  });
});

describe('featured comparisons on the homepage', () => {
  // The homepage picks these four by slug. If a slug is renamed or a preset removed, the section
  // silently renders fewer cards, so the list is asserted rather than trusted.
  const HOME_PICKS = ['pay-off-mortgage-early-or-invest', 'rent-vs-buy-a-house', 'low-interest-car-loan-or-invest', 'is-rooftop-solar-worth-it'];

  it('every pick resolves to a comparison, a calculator and a preset', () => {
    for (const slug of HOME_PICKS) {
      const c = COMPARISONS.find((x) => x.slug === slug);
      expect(c, `no comparison for ${slug}`).toBeTruthy();
      const def = REGISTRY.find((d) => d.id === c!.calculatorId);
      expect(def, `no calculator for ${slug}`).toBeTruthy();
      const preset = def!.presets.find((p) => p.id === c!.presetId);
      expect(preset, `no preset for ${slug}`).toBeTruthy();
    }
  });

  it('spans more than one calculator, so the section is not five variations of one question', () => {
    const ids = new Set(HOME_PICKS.map((s) => COMPARISONS.find((x) => x.slug === s)!.calculatorId));
    expect(ids.size).toBeGreaterThanOrEqual(3);
  });

  it('each pick computes a headline with a real figure in it', () => {
    for (const slug of HOME_PICKS) {
      const c = COMPARISONS.find((x) => x.slug === slug)!;
      const def = REGISTRY.find((d) => d.id === c.calculatorId)!;
      const preset = def.presets.find((p) => p.id === c.presetId)!;
      const inputs = def.normalize(preset.inputs);
      const summary = def.summary(inputs, def.compute(inputs)) as ShareSummary;
      expect(summary.headline.length).toBeGreaterThan(10);
      expect(moneyTokens(summary.headline).length, `${slug} headline has no figure: ${summary.headline}`).toBeGreaterThan(0);
    }
  });
});
