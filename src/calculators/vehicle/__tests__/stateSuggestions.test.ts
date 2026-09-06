import { describe, expect, it } from 'vitest';
import { computeVehicle } from '../../../engine/calculators/vehicle';
import { INSURANCE_BASE_EXAMPLE, REG_BASE_EXAMPLE, STATE_DEFAULTS } from '../../../data/stateDefaults';
import { vehicleCalculator } from '..';
import { vehicleDefaults } from '../presets';
import {
  applyStateSuggestions,
  contextualizeVehiclePreset,
  markUserEdited,
  normalizeProvenance,
  normalizeStateCode,
  originFor,
  insuranceFor,
  refreshInsuranceForFuel,
  refreshRegistrationForFuel,
  swapVehicleFormInputs,
  userEditCount,
  withLocation,
  type VehicleFormInputs,
} from '../inputs';

const CA = STATE_DEFAULTS.CA;
const TX = STATE_DEFAULTS.TX;

/** A two-car starting point with A electric and B petrol, so the EV fee rules are exercised. */
function base(): VehicleFormInputs {
  const i = vehicleCalculator.normalize(vehicleDefaults);
  return {
    ...i,
    a: { ...i.a, fuelType: 'electric', salesTaxRate: 7, registrationAnnual: 200 },
    b: { ...i.b, fuelType: 'gas', salesTaxRate: 7, registrationAnnual: 250 },
    shared: { ...i.shared, gasPrice: 4.14, electricityRate: 0.183 },
  };
}

describe('applying a state', () => {
  it('fills tax, fuel and electricity from the table and labels them as suggestions', () => {
    const out = applyStateSuggestions(base(), 'CA');
    expect(out.stateCode).toBe('CA');
    expect(out.a.salesTaxRate).toBe(CA.salesTaxRate);
    expect(out.b.salesTaxRate).toBe(CA.salesTaxRate);
    expect(out.shared.gasPrice).toBe(CA.gasPrice);
    expect(out.shared.electricityRate).toBe(CA.electricityRate);
    expect(originFor(out, 'a.salesTaxRate').tone).toBe('suggested');
    expect(originFor(out, 'shared.gasPrice').label).toBe('CA avg');
    expect(originFor(out, 'shared.gasPrice').title).toContain('California');
  });

  it('adds the EV surcharge only to the electric car', () => {
    const out = applyStateSuggestions(base(), 'CA');
    expect(out.a.registrationAnnual).toBe(REG_BASE_EXAMPLE + CA.evFeeAnnual);
    expect(out.b.registrationAnnual).toBe(REG_BASE_EXAMPLE);
    expect(out.a.registrationAnnual).toBeGreaterThan(out.b.registrationAnnual);
  });

  it('adds no surcharge in a state that does not charge one', () => {
    const out = applyStateSuggestions(base(), 'NY');
    expect(STATE_DEFAULTS.NY.evFeeAnnual).toBe(0);
    expect(out.a.registrationAnnual).toBe(REG_BASE_EXAMPLE);
    expect(out.b.registrationAnnual).toBe(REG_BASE_EXAMPLE);
  });

  it('is idempotent, so re-picking a state cannot compound the registration fee', () => {
    const once = applyStateSuggestions(base(), 'CA');
    const twice = applyStateSuggestions(once, 'CA');
    const thrice = applyStateSuggestions(twice, 'CA');
    expect(twice).toEqual(once);
    expect(thrice.a.registrationAnnual).toBe(REG_BASE_EXAMPLE + CA.evFeeAnnual);
  });

  it('replaces one state’s suggestions with another’s rather than stacking them', () => {
    const out = applyStateSuggestions(applyStateSuggestions(base(), 'CA'), 'TX');
    expect(out.stateCode).toBe('TX');
    expect(out.a.salesTaxRate).toBe(TX.salesTaxRate);
    expect(out.shared.gasPrice).toBe(TX.gasPrice);
    expect(out.a.registrationAnnual).toBe(REG_BASE_EXAMPLE + TX.evFeeAnnual);
  });

  it('ignores an unknown or empty code and clears the state instead of inventing one', () => {
    const out = applyStateSuggestions(base(), 'ZZ');
    expect(out.stateCode).toBe('');
    expect(out.a.salesTaxRate).toBe(7);
  });
});

describe('a number the user typed is never overwritten', () => {
  it('survives choosing a state', () => {
    const edited = markUserEdited({ ...base(), shared: { ...base().shared, gasPrice: 3.25 } }, ['shared.gasPrice']);
    const out = applyStateSuggestions(edited, 'CA');
    expect(out.shared.gasPrice).toBe(3.25);
    expect(originFor(out, 'shared.gasPrice').tone).toBe('user');
    // ...while everything they did not touch still gets filled in.
    expect(out.shared.electricityRate).toBe(CA.electricityRate);
  });

  it('survives switching from one state to another', () => {
    const withCa = applyStateSuggestions(base(), 'CA');
    const edited = markUserEdited({ ...withCa, a: { ...withCa.a, salesTaxRate: 6 } }, ['a.salesTaxRate']);
    const out = applyStateSuggestions(edited, 'TX');
    expect(out.a.salesTaxRate).toBe(6);
    expect(out.b.salesTaxRate).toBe(TX.salesTaxRate);
  });

  it('survives clearing the state, and keeps its label while suggestions lose theirs', () => {
    const withCa = applyStateSuggestions(base(), 'CA');
    const edited = markUserEdited({ ...withCa, a: { ...withCa.a, registrationAnnual: 400 } }, ['a.registrationAnnual']);
    const cleared = applyStateSuggestions(edited, '');
    expect(cleared.stateCode).toBe('');
    expect(cleared.a.registrationAnnual).toBe(400);
    expect(originFor(cleared, 'a.registrationAnnual').tone).toBe('user');
    // The suggested values stay on screen rather than being yanked away, but stop claiming a state.
    expect(cleared.shared.gasPrice).toBe(CA.gasPrice);
    expect(originFor(cleared, 'shared.gasPrice').tone).toBe('example');
  });

  it('only records edits to fields a suggestion could have written', () => {
    const out = markUserEdited(base(), ['a.price', 'a.mpg', 'shared.investmentReturn', 'a.salesTaxRate']);
    expect(Object.keys(out.provenance)).toEqual(['a.salesTaxRate']);
    expect(userEditCount(out)).toBe(1);
  });
});

describe('changing a car’s fuel type', () => {
  it('picks up the EV surcharge when it becomes electric', () => {
    const withCa = applyStateSuggestions(base(), 'CA');
    const asEv = refreshRegistrationForFuel({ ...withCa, b: { ...withCa.b, fuelType: 'electric' } }, 'b');
    expect(asEv.b.registrationAnnual).toBe(REG_BASE_EXAMPLE + CA.evFeeAnnual);
  });

  it('drops the surcharge when it goes back to petrol', () => {
    const withCa = applyStateSuggestions(base(), 'CA');
    const asGas = refreshRegistrationForFuel({ ...withCa, a: { ...withCa.a, fuelType: 'gas' } }, 'a');
    expect(asGas.a.registrationAnnual).toBe(REG_BASE_EXAMPLE);
  });

  it('leaves a registration the user typed alone', () => {
    const withCa = applyStateSuggestions(base(), 'CA');
    const edited = markUserEdited({ ...withCa, b: { ...withCa.b, registrationAnnual: 90 } }, ['b.registrationAnnual']);
    const asEv = refreshRegistrationForFuel({ ...edited, b: { ...edited.b, fuelType: 'electric' } }, 'b');
    expect(asEv.b.registrationAnnual).toBe(90);
  });

  it('does nothing when no state has been chosen', () => {
    const i = { ...base(), a: { ...base().a, fuelType: 'gas' as const } };
    expect(refreshRegistrationForFuel(i, 'a')).toBe(i);
  });
});

describe('normalize, with and without a state', () => {
  it('round-trips a state and its provenance through a share link or saved scenario', () => {
    const saved = applyStateSuggestions(base(), 'CA');
    const back = vehicleCalculator.normalize(JSON.parse(JSON.stringify(saved)));
    expect(back.stateCode).toBe('CA');
    expect(back.provenance['shared.gasPrice']).toBe('suggested');
    expect(back.a.salesTaxRate).toBe(CA.salesTaxRate);
  });

  it('accepts a scenario saved before this feature existed', () => {
    // Exactly the shape old localStorage and old share links hold: no stateCode, no provenance.
    const legacy = { a: vehicleDefaults.a, b: vehicleDefaults.b, shared: vehicleDefaults.shared };
    const back = vehicleCalculator.normalize(legacy);
    expect(back.stateCode).toBe('');
    expect(back.provenance).toEqual({});
    expect(originFor(back, 'a.salesTaxRate').tone).toBe('example');
    // And it still computes, which is the thing that actually must not break.
    expect(computeVehicle(back).a.totalCost).toBeGreaterThan(0);
  });

  it('throws away a bogus state code rather than trusting the link', () => {
    expect(normalizeStateCode('ZZ')).toBe('');
    expect(normalizeStateCode(42)).toBe('');
    expect(normalizeStateCode(null)).toBe('');
    expect(normalizeStateCode('ca')).toBe('CA');
    expect(vehicleCalculator.normalize({ ...vehicleDefaults, stateCode: '<script>' }).stateCode).toBe('');
  });

  it('keeps only whitelisted provenance keys and values', () => {
    const dirty = normalizeProvenance({
      'a.salesTaxRate': 'user',
      'shared.gasPrice': 'suggested',
      'a.price': 'user',
      'shared.gasPrice ': 'user',
      __proto__: 'user',
      'b.salesTaxRate': 'nonsense',
    });
    expect(dirty).toEqual({ 'a.salesTaxRate': 'user', 'shared.gasPrice': 'suggested' });
    expect(normalizeProvenance(['a.salesTaxRate'])).toEqual({});
    expect(normalizeProvenance('user')).toEqual({});
    expect(normalizeProvenance(null)).toEqual({});
  });
});

describe('swapping and preset loading', () => {
  it('carries each car’s provenance with it when the two are swapped', () => {
    const withCa = applyStateSuggestions(base(), 'CA');
    const edited = markUserEdited({ ...withCa, a: { ...withCa.a, salesTaxRate: 6 } }, ['a.salesTaxRate']);
    const swapped = swapVehicleFormInputs(edited);
    expect(swapped.b.salesTaxRate).toBe(6);
    expect(swapped.provenance['b.salesTaxRate']).toBe('user');
    expect(swapped.provenance['a.salesTaxRate']).toBe('suggested');
    expect(swapped.stateCode).toBe('CA');
  });

  it('re-applies the chosen state to a freshly loaded example', () => {
    const current = applyStateSuggestions(base(), 'CA');
    const preset = vehicleCalculator.normalize(vehicleDefaults);
    const loaded = contextualizeVehiclePreset(preset, current);
    expect(loaded.stateCode).toBe('CA');
    expect(loaded.a.salesTaxRate).toBe(CA.salesTaxRate);
    expect(loaded.shared.gasPrice).toBe(CA.gasPrice);
  });

  it('leaves an example untouched when no state has been chosen', () => {
    const preset = vehicleCalculator.normalize(vehicleDefaults);
    const loaded = contextualizeVehiclePreset(preset, withLocation(vehicleDefaults));
    expect(loaded.stateCode).toBe('');
    expect(loaded.provenance).toEqual({});
    expect(loaded.a.salesTaxRate).toBe(preset.a.salesTaxRate);
  });

  it('starts a loaded example with no user edits, so it reads as an example again', () => {
    const current = markUserEdited(applyStateSuggestions(base(), 'CA'), ['shared.gasPrice']);
    const loaded = contextualizeVehiclePreset(vehicleCalculator.normalize(vehicleDefaults), current);
    expect(userEditCount(loaded)).toBe(0);
  });
});

describe('the engine is untouched by any of this', () => {
  it('produces the same result with and without the location fields attached', () => {
    const core = vehicleCalculator.normalize(vehicleDefaults);
    const { stateCode: _s, provenance: _p, ...bare } = core;
    expect(computeVehicle(core).comparison.nominalDifference).toBe(computeVehicle(bare).comparison.nominalDifference);
  });

  it('changes the answer only through the values a suggestion writes', () => {
    const before = computeVehicle(base());
    const after = computeVehicle(applyStateSuggestions(base(), 'CA'));
    // California is dearer on tax, petrol and power than the example, so costs must rise.
    expect(after.a.totalCost).toBeGreaterThan(before.a.totalCost);
    expect(after.b.totalCost).toBeGreaterThan(before.b.totalCost);
  });
});

describe('insurance follows the state without compounding', () => {
  it('scales the national example by the state index', () => {
    const out = applyStateSuggestions(base(), 'FL');
    // Florida is the dearest state; the electric car carries the higher base.
    expect(out.a.insuranceAnnual).toBe(insuranceFor('electric', STATE_DEFAULTS.FL.insuranceIndex));
    expect(out.b.insuranceAnnual).toBe(insuranceFor('gas', STATE_DEFAULTS.FL.insuranceIndex));
    expect(out.a.insuranceAnnual).toBeGreaterThan(INSURANCE_BASE_EXAMPLE.electric);
    expect(out.b.insuranceAnnual).toBeGreaterThan(INSURANCE_BASE_EXAMPLE.gas);
  });

  it('goes down as well as up', () => {
    const out = applyStateSuggestions(base(), 'ND');
    expect(out.b.insuranceAnnual).toBeLessThan(INSURANCE_BASE_EXAMPLE.gas);
  });

  it('replaces rather than compounds when the state changes', () => {
    // The bug this guards: scaling the current value instead of a constant base, so CA then MI
    // would multiply both indexes together.
    const once = applyStateSuggestions(base(), 'MI');
    const twice = applyStateSuggestions(applyStateSuggestions(base(), 'CA'), 'MI');
    expect(twice.a.insuranceAnnual).toBe(once.a.insuranceAnnual);
    expect(twice.b.insuranceAnnual).toBe(once.b.insuranceAnnual);
  });

  it('is idempotent when the same state is applied twice', () => {
    const once = applyStateSuggestions(base(), 'TX');
    const twice = applyStateSuggestions(once, 'TX');
    expect(twice.a.insuranceAnnual).toBe(once.a.insuranceAnnual);
    expect(twice.b.insuranceAnnual).toBe(once.b.insuranceAnnual);
  });

  it('never overwrites a premium the user typed', () => {
    const typed = markUserEdited({ ...base(), a: { ...base().a, insuranceAnnual: 4321 } }, ['a.insuranceAnnual']);
    const out = applyStateSuggestions(typed, 'FL');
    expect(out.a.insuranceAnnual).toBe(4321);
    expect(originFor(out, 'a.insuranceAnnual').label).toBe('Yours');
    // The other car still gets the suggestion.
    expect(out.b.insuranceAnnual).toBe(insuranceFor('gas', STATE_DEFAULTS.FL.insuranceIndex));
  });

  it('re-suggests when a car switches fuel type', () => {
    const withState = applyStateSuggestions(base(), 'CA');
    const petrolNow = refreshInsuranceForFuel({ ...withState, b: { ...withState.b, fuelType: 'electric' } }, 'b');
    expect(petrolNow.b.insuranceAnnual).toBe(insuranceFor('electric', STATE_DEFAULTS.CA.insuranceIndex));
  });

  it('leaves insurance alone on fuel change when no state is set', () => {
    const i = base();
    expect(refreshInsuranceForFuel({ ...i, b: { ...i.b, fuelType: 'electric' } }, 'b').b.insuranceAnnual).toBe(i.b.insuranceAnnual);
  });

  it('clears the suggestion label when the state is cleared', () => {
    const cleared = applyStateSuggestions(applyStateSuggestions(base(), 'CA'), '');
    expect(originFor(cleared, 'a.insuranceAnnual').label).toBe('Example');
  });

  it('rounds to something a person would say out loud', () => {
    for (const code of Object.keys(STATE_DEFAULTS)) {
      const v = insuranceFor('gas', STATE_DEFAULTS[code].insuranceIndex);
      expect(v % 10, code).toBe(0);
    }
  });
});
