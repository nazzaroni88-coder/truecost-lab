import { describe, expect, it } from 'vitest';
import { CALCULATORS } from '../../calculators/meta';
import { REGISTRY } from '../../calculators/registry';
import { brandCardCopy, OG_ROUTES } from '../ogRoutes';

describe('OG_ROUTES', () => {
  it('covers every calculator, so a new one cannot ship without a link preview', () => {
    const covered = OG_ROUTES.filter((r) => r.kind === 'result').map((r) => r.calculatorId);
    expect(covered.sort()).toEqual(CALCULATORS.map((c) => c.id).sort());
  });

  it('points every result route at a calculator the registry can actually compute', () => {
    for (const route of OG_ROUTES.filter((r) => r.kind === 'result')) {
      const calc = REGISTRY.find((c) => c.id === route.calculatorId);
      expect(calc, `no registered calculator for ${route.path}`).toBeDefined();
      // The build renders this exact call; a definition that threw here would fail the deploy.
      const summary = calc!.summary(calc!.defaults, calc!.compute(calc!.defaults));
      expect(summary.headline.length).toBeGreaterThan(10);
    }
  });

  it('covers the standalone pages too', () => {
    const paths = OG_ROUTES.map((r) => r.path);
    expect(paths).toContain('');
    expect(paths).toContain('methodology');
    expect(paths).toContain('about');
  });

  it('uses paths that match the router, with no leading or trailing slash', () => {
    for (const route of OG_ROUTES) {
      expect(route.path).not.toMatch(/^\//);
      expect(route.path).not.toMatch(/\/$/);
    }
    const calcPaths = OG_ROUTES.filter((r) => r.kind === 'result').map((r) => r.path);
    expect(calcPaths).toEqual(CALCULATORS.map((c) => `calculators/${c.slug}`));
  });

  it('gives every route a unique path and image name', () => {
    expect(new Set(OG_ROUTES.map((r) => r.path)).size).toBe(OG_ROUTES.length);
    expect(new Set(OG_ROUTES.map((r) => r.image)).size).toBe(OG_ROUTES.length);
  });

  it('keeps image basenames safe for a URL', () => {
    for (const route of OG_ROUTES) expect(route.image).toMatch(/^[a-z0-9-]+$/);
  });

  it('writes titles and descriptions that survive a link preview', () => {
    for (const route of OG_ROUTES) {
      expect(route.title.length, `${route.path} title`).toBeLessThanOrEqual(70);
      expect(route.description.length, `${route.path} description`).toBeGreaterThan(50);
      expect(route.alt.length, `${route.path} alt`).toBeGreaterThan(10);
    }
  });

  it('gives each brand route its own copy rather than repeating the homepage', () => {
    const brand = OG_ROUTES.filter((r) => r.kind === 'brand');
    const titles = brand.map((r) => brandCardCopy(r).title);
    expect(new Set(titles).size).toBe(brand.length);
    for (const r of brand) expect(brandCardCopy(r).items.length).toBe(CALCULATORS.length);
  });
});
