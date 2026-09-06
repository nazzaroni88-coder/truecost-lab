import { describe, expect, it } from 'vitest';
import { COMPARISONS, comparisonBySlug, relatedComparisons } from '../comparisons';
import { REGISTRY } from '../../calculators/registry';
import { OG_ROUTES } from '../../share/ogRoutes';

describe('COMPARISONS', () => {
  it('points every entry at a preset that actually exists', () => {
    for (const c of COMPARISONS) {
      const calc = REGISTRY.find((x) => x.id === c.calculatorId);
      expect(calc, `${c.slug}: no calculator "${c.calculatorId}"`).toBeDefined();
      const preset = calc!.presets.find((p) => p.id === c.presetId);
      expect(preset, `${c.slug}: no preset "${c.presetId}" on ${c.calculatorId}`).toBeDefined();
    }
  });

  it('produces a real answer for every entry', () => {
    // The page and the build's preview both run exactly this; a definition that threw here would
    // ship a broken page and fail the deploy.
    for (const c of COMPARISONS) {
      const calc = REGISTRY.find((x) => x.id === c.calculatorId)!;
      const inputs = calc.normalize(calc.presets.find((p) => p.id === c.presetId)!.inputs);
      const summary = calc.summary(inputs, calc.compute(inputs));
      expect(summary.headline.length, `${c.slug} headline`).toBeGreaterThan(15);
      expect(summary.sub.length, `${c.slug} sub`).toBeGreaterThan(15);
      expect(summary.rows.length, `${c.slug} rows`).toBeGreaterThan(0);
    }
  });

  it('gives every entry a unique slug and a unique preset', () => {
    expect(new Set(COMPARISONS.map((c) => c.slug)).size).toBe(COMPARISONS.length);
    // Two pages built on the same preset would be the same page under two URLs.
    expect(new Set(COMPARISONS.map((c) => `${c.calculatorId}/${c.presetId}`)).size).toBe(COMPARISONS.length);
  });

  it('uses URL-safe slugs that read as words', () => {
    for (const c of COMPARISONS) expect(c.slug, c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('asks a question and answers it somewhere other than the headline', () => {
    for (const c of COMPARISONS) {
      expect(c.question.length, `${c.slug} question`).toBeLessThanOrEqual(70);
      expect(c.question, `${c.slug} should read as a question`).toMatch(/\?$/);
      expect(c.intro.length, `${c.slug} intro`).toBeGreaterThan(60);
    }
  });

  it('covers more than one calculator, so the hub is not a single list', () => {
    expect(new Set(COMPARISONS.map((c) => c.calculatorId)).size).toBeGreaterThan(1);
  });

  it('finds an entry by slug and nothing by a bad one', () => {
    expect(comparisonBySlug(COMPARISONS[0].slug)?.slug).toBe(COMPARISONS[0].slug);
    expect(comparisonBySlug('no-such-comparison')).toBeUndefined();
  });

  it('relates entries within a calculator and never to themselves', () => {
    for (const c of COMPARISONS) {
      const related = relatedComparisons(c);
      expect(related.every((r) => r.calculatorId === c.calculatorId)).toBe(true);
      expect(related.some((r) => r.slug === c.slug)).toBe(false);
    }
  });

  it('gets a pre-rendered link preview for every entry', () => {
    // A page nobody can share is the problem these pages exist to fix.
    const covered = new Set(OG_ROUTES.map((r) => r.path));
    for (const c of COMPARISONS) expect(covered.has(`compare/${c.slug}`), `compare/${c.slug} has no og route`).toBe(true);
    expect(covered.has('compare')).toBe(true);
  });

  it('draws each preview from its own preset, not the calculator default', () => {
    for (const c of COMPARISONS) {
      const route = OG_ROUTES.find((r) => r.path === `compare/${c.slug}`)!;
      expect(route.kind).toBe('result');
      expect(route.presetId).toBe(c.presetId);
      expect(route.calculatorId).toBe(c.calculatorId);
    }
  });
});
