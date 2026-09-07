import { describe, expect, it } from 'vitest';
import { vehicleCalculator } from '..';
import { vehicleDefaults } from '../presets';
import { sensitivityFieldId } from '../inputs';
import type { SensitivityRow } from '../../../engine/core/sensitivity';

/**
 * The lever strip is only useful if its links land. The ids are generated from the engine's
 * sensitivity keys, so a renamed variable would silently produce dead chips.
 */
describe('sensitivityFieldId', () => {
  const inputs = vehicleCalculator.normalize(vehicleDefaults);
  const rows = (vehicleCalculator.compute(inputs) as { sensitivity: SensitivityRow[] }).sensitivity;

  it('the model produces a ranking to read', () => {
    expect(rows.length).toBeGreaterThan(3);
  });

  it('resolves an id for the top levers at the default scenario', () => {
    const top = [...rows].sort((a, b) => b.swing - a.swing).slice(0, 3);
    const resolved = top.filter((r) => sensitivityFieldId(r.key));
    // Not every variable is a per-option field — some are shared and already have chips — but the
    // strip is pointless if none of the biggest ones can be reached.
    expect(resolved.length, `no reachable field among: ${top.map((r) => r.key).join(', ')}`).toBeGreaterThan(0);
  });

  it('only claims ids for per-option fields, never shared ones', () => {
    expect(sensitivityFieldId('annualMiles')).toBeUndefined();
    expect(sensitivityFieldId('gasPrice')).toBeUndefined();
    expect(sensitivityFieldId('ownershipYears')).toBeUndefined();
  });

  it('builds the id from the side and the field', () => {
    expect(sensitivityFieldId('a.insuranceAnnual')).toBe('veh-a-insuranceAnnual');
    expect(sensitivityFieldId('b.annualDepreciation')).toBe('veh-b-annualDepreciation');
  });

  it('returns nothing for a field the form does not render', () => {
    expect(sensitivityFieldId('a.notAField')).toBeUndefined();
    expect(sensitivityFieldId('c.insuranceAnnual')).toBeUndefined();
  });

  it('every id it claims is one the form actually renders', async () => {
    const form = await import('node:fs').then((m) => m.readFileSync('src/calculators/vehicle/VehicleForm.tsx', 'utf8'));
    const claimed = rows.map((r) => sensitivityFieldId(r.key)).filter((x): x is string => Boolean(x));
    expect(claimed.length).toBeGreaterThan(0);
    for (const id of new Set(claimed)) {
      const field = id.replace(/^veh-[ab]-/, '');
      expect(form.includes('`veh-${side}-' + field + '`'), `${id} has no input in VehicleForm`).toBe(true);
    }
  });
});
