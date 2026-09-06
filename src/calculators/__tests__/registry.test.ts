import { describe, expect, it } from 'vitest';
import { REGISTRY } from '../registry';
import { CALCULATORS } from '../meta';
import { decodeShare, encodeShare } from '../../scenarios/urlCodec';

function hasNaN(v: unknown, path = ''): string | null {
  if (typeof v === 'number') return Number.isFinite(v) ? null : path;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const r = hasNaN(v[i], `${path}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (typeof x === 'function') continue;
      const r = hasNaN(x, `${path}.${k}`);
      if (r) return r;
    }
  }
  return null;
}

describe('calculator registry', () => {
  it('registers every calculator in meta, with unique slugs', () => {
    expect(REGISTRY.map((c) => c.id).sort()).toEqual(CALCULATORS.map((c) => c.id).sort());
    const slugs = new Set(REGISTRY.map((c) => c.slug));
    expect(slugs.size).toBe(REGISTRY.length);
  });

  for (const def of REGISTRY) {
    describe(def.name, () => {
      it('normalize is idempotent on defaults and tolerant of garbage', () => {
        expect(def.normalize(def.defaults)).toEqual(def.defaults);
        expect(def.normalize({})).toEqual(def.defaults);
        expect(def.normalize(null)).toEqual(def.defaults);
        expect(def.normalize('nonsense')).toEqual(def.defaults);
        const junk = JSON.parse(JSON.stringify(def.defaults)) as Record<string, unknown>;
        for (const k of Object.keys(junk)) if (typeof junk[k] === 'number') junk[k] = 'NaN';
        expect(hasNaN(def.normalize(junk))).toBeNull();
      });

      it('has at least three presets that all compute cleanly and summarize', () => {
        expect(def.presets.length).toBeGreaterThanOrEqual(3);
        for (const p of def.presets) {
          const inputs = def.normalize(p.inputs);
          expect(inputs).toEqual(p.inputs);
          const result = def.compute(inputs);
          expect(hasNaN(result), `${p.name} produced NaN`).toBeNull();
          const s = def.summary(inputs, result);
          expect(s.headline.length).toBeGreaterThan(10);
          expect(s.rows.length).toBeGreaterThanOrEqual(3);
          expect(Number.isFinite(s.keyMetric)).toBe(true);
          const m = def.methodology(inputs, result);
          expect(m.length).toBeGreaterThan(2);
          const ins = def.insights(inputs, result);
          expect(ins.length).toBeGreaterThanOrEqual(3);
        }
      });

      it('share links round-trip every preset', () => {
        for (const p of def.presets) {
          const token = encodeShare({ calculatorId: def.id, name: p.name, inputs: p.inputs });
          const back = decodeShare(`#s=${token}`)!;
          expect(back.calculatorId).toBe(def.id);
          expect(def.normalize(back.inputs)).toEqual(def.normalize(p.inputs));
        }
      });

      it('survives extreme inputs without throwing', () => {
        const big = JSON.parse(JSON.stringify(def.defaults)) as Record<string, unknown>;
        const scale = (o: Record<string, unknown>, f: number) => {
          for (const [k, v] of Object.entries(o)) {
            if (typeof v === 'number') o[k] = v * f;
            else if (v && typeof v === 'object' && !Array.isArray(v)) scale(v as Record<string, unknown>, f);
          }
        };
        scale(big, 50);
        expect(() => def.compute(def.normalize(big))).not.toThrow();
        const zero = JSON.parse(JSON.stringify(def.defaults)) as Record<string, unknown>;
        scale(zero, 0);
        const r = def.compute(def.normalize(zero));
        expect(hasNaN(r), 'zero inputs produced NaN').toBeNull();
      });
    });
  }
});
