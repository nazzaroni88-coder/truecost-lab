/**
 * The Vehicle calculator's form-level input shape, which is the engine's `VehicleInputs` plus two
 * fields the engine neither sees nor needs:
 *
 *   stateCode   which U.S. state the user told us they are in ('' = they have not said)
 *   provenance  where each suggestible number came from
 *
 * `VehicleFormInputs extends VehicleInputs`, so it is structurally assignable wherever the engine
 * wants inputs. `computeVehicle` is untouched by any of this: no calculation reads stateCode or
 * provenance, which keeps the maths in src/engine exactly as it was.
 *
 * WHY PROVENANCE IS PART OF THE INPUTS rather than component state: it has to survive a saved
 * scenario and a shared link. If someone sends you a link, "9.03%" should still say it came from a
 * California suggestion rather than silently reading as a number they typed.
 */

import type { VehicleInputs, VehicleOption } from '../../engine/calculators/vehicle';
import { INSURANCE_BASE_EXAMPLE, REG_BASE_EXAMPLE, stateDefaultsFor } from '../../data/stateDefaults';
import { US_STATES } from '../../data/incentives';

/**
 * How a field's current value got there.
 *  'user'       the person typed it
 *  'suggested'  we filled it in from the state table
 * A field with no entry is still showing a preset example value.
 */
export type FieldOriginKind = 'user' | 'suggested';

export type Provenance = Record<string, FieldOriginKind>;

/**
 * The only fields a state suggestion may write, and therefore the only keys `provenance` may hold.
 * Whitelisting matters: `provenance` arrives from untrusted share links, and an open-ended map
 * would let a crafted link grow unboundedly or mislabel arbitrary fields.
 */
export const SUGGESTIBLE_PATHS = [
  'a.salesTaxRate',
  'b.salesTaxRate',
  'a.registrationAnnual',
  'b.registrationAnnual',
  'a.insuranceAnnual',
  'b.insuranceAnnual',
  'shared.gasPrice',
  'shared.electricityRate',
] as const;

export type SuggestiblePath = (typeof SUGGESTIBLE_PATHS)[number];

const SUGGESTIBLE = new Set<string>(SUGGESTIBLE_PATHS);

/**
 * Stable DOM ids for the inputs a result chip can jump to. They have to be fixed strings rather
 * than React's generated ids, because the chip is rendered by the generic shell and only knows the
 * id it was given.
 */
export const VEHICLE_FIELD_IDS = {
  state: 'veh-state',
  salesTax: 'veh-sales-tax',
  miles: 'veh-miles',
  years: 'veh-years',
  gasPrice: 'veh-gas-price',
  electricity: 'veh-electricity',
  investmentReturn: 'veh-investment-return',
} as const;

/**
 * The DOM id for the input behind a sensitivity row.
 *
 * Sensitivity keys already carry the side and the field ("a.insuranceAnnual"), so the mapping is
 * mechanical rather than a second hand-maintained list that could drift out of step with the
 * engine's variables. A key with no matching input returns undefined and the caller renders a
 * label instead of a link, which is what happens for the shared variables that already have chips.
 */
const LEVER_FIELDS = new Set(['insuranceAnnual', 'annualDepreciation', 'firstYearDepreciation', 'resaleOverride', 'apr', 'mpg', 'milesPerKwh', 'maintenanceAnnual', 'repairsAnnual']);

export function sensitivityFieldId(key: string): string | undefined {
  const [side, field] = key.split('.');
  if ((side !== 'a' && side !== 'b') || !LEVER_FIELDS.has(field)) return undefined;
  return `veh-${side}-${field}`;
}

export interface VehicleFormInputs extends VehicleInputs {
  /** Two-letter state code, or '' when the user has not chosen one. */
  stateCode: string;
  provenance: Provenance;
}

/** Wraps the engine-shaped inputs used by presets into the form shape. */
export function withLocation(core: VehicleInputs): VehicleFormInputs {
  return { ...core, stateCode: '', provenance: {} };
}

export function stateNameOf(code: string): string {
  return US_STATES.find((s) => s.code === code)?.name ?? code;
}

/* ── Provenance ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Records that the person edited these paths themselves. Paths outside SUGGESTIBLE_PATHS are
 * ignored, so ordinary edits (price, mpg, depreciation) never grow the map.
 */
export function markUserEdited(i: VehicleFormInputs, paths: string[]): VehicleFormInputs {
  const touched = paths.filter((p) => SUGGESTIBLE.has(p));
  if (touched.length === 0) return i;
  const provenance = { ...i.provenance };
  let changed = false;
  for (const p of touched) {
    if (provenance[p] !== 'user') {
      provenance[p] = 'user';
      changed = true;
    }
  }
  return changed ? { ...i, provenance } : i;
}

export interface FieldOrigin {
  tone: 'user' | 'suggested' | 'example' | 'estimate';
  label: string;
  /** Longer explanation for a tooltip. */
  title: string;
}

/**
 * Badge labels are deliberately short — two words at most.
 *
 * They sit inline with the field label in a column about 140px wide, and "Suggested for CA" wraps
 * onto its own line there, which pushes that one input out of line with its neighbour. The full
 * sentence lives in the tooltip instead, so nothing is lost but the row stays straight.
 */
export function originFor(i: VehicleFormInputs, path: SuggestiblePath): FieldOrigin {
  const kind = i.provenance[path];
  if (kind === 'user') return { tone: 'user', label: 'Yours', title: 'You entered this value, and choosing a state will not overwrite it.' };
  if (kind === 'suggested') {
    const name = stateNameOf(i.stateCode);
    return {
      tone: 'suggested',
      label: `${i.stateCode} avg`,
      title: `Suggested for ${name}: a statewide average, not your actual bill. Edit it and we will keep your number.`,
    };
  }
  return { tone: 'example', label: 'Example', title: 'An illustrative starting value from the loaded example. Replace it with your own.' };
}

/** For fields that are always modelled forecasts rather than anything observed or sourced. */
export const ESTIMATE_ORIGIN: FieldOrigin = {
  tone: 'estimate',
  label: 'Estimate',
  title: 'A modelled forecast, not a sourced figure. Nobody knows what used cars will be worth in five years.',
};

/* ── Applying a state ───────────────────────────────────────────────────────────────────────── */

/**
 * Fills the suggestible fields from the state table.
 *
 * Two rules, both load-bearing:
 *  1. A field the person edited ('user') is NEVER overwritten. Choosing a state must not throw away
 *     a number they took the trouble to look up.
 *  2. Applying is idempotent. Registration is rebuilt from REG_BASE_EXAMPLE + the state's EV fee
 *     rather than added to whatever is already there, so switching state repeatedly cannot compound.
 *
 * Passing an unknown or empty code clears the state and drops the 'suggested' labels, but leaves the
 * numbers alone: yanking values back out from under someone who has been reading them is worse than
 * letting them stand.
 */
export function applyStateSuggestions(i: VehicleFormInputs, code: string): VehicleFormInputs {
  const data = stateDefaultsFor(code);
  if (!data) {
    const provenance: Provenance = {};
    for (const [k, v] of Object.entries(i.provenance)) if (v === 'user') provenance[k] = v;
    return { ...i, stateCode: '', provenance };
  }

  const provenance: Provenance = { ...i.provenance };
  const locked = (path: SuggestiblePath) => provenance[path] === 'user';
  const mark = (path: SuggestiblePath) => {
    provenance[path] = 'suggested';
  };

  const applyToOption = (side: 'a' | 'b', o: VehicleOption): VehicleOption => {
    const next: VehicleOption = { ...o };
    const taxPath = `${side}.salesTaxRate` as SuggestiblePath;
    if (!locked(taxPath)) {
      next.salesTaxRate = data.salesTaxRate;
      mark(taxPath);
    }
    const regPath = `${side}.registrationAnnual` as SuggestiblePath;
    if (!locked(regPath)) {
      next.registrationAnnual = REG_BASE_EXAMPLE + (o.fuelType === 'electric' ? data.evFeeAnnual : 0);
      mark(regPath);
    }
    const insPath = `${side}.insuranceAnnual` as SuggestiblePath;
    if (!locked(insPath)) {
      next.insuranceAnnual = insuranceFor(o.fuelType, data.insuranceIndex);
      mark(insPath);
    }
    return next;
  };

  const shared = { ...i.shared };
  if (!locked('shared.gasPrice')) {
    shared.gasPrice = data.gasPrice;
    mark('shared.gasPrice');
  }
  if (!locked('shared.electricityRate')) {
    shared.electricityRate = data.electricityRate;
    mark('shared.electricityRate');
  }

  return {
    ...i,
    stateCode: code,
    a: applyToOption('a', i.a),
    b: applyToOption('b', i.b),
    shared,
    provenance,
  };
}

/**
 * Re-runs the state suggestion for one option after its fuel type changed, so an option switched to
 * electric picks up the state's EV surcharge instead of silently keeping the petrol figure.
 * A registration the person edited themselves still wins.
 */
/**
 * A state-typical full-coverage premium: a national example moved to the state by NAIC's ratio.
 *
 * Deliberately not the state's average expenditure in dollars. That figure spans every insured
 * vehicle and coverage mix, so it sits near half of what full coverage on a new financed car costs,
 * and using it would quietly halve a cost the buyer has to carry. The ratio is the part that
 * transfers; the base carries the car.
 */
export function insuranceFor(fuelType: VehicleOption['fuelType'], index: number): number {
  const base = fuelType === 'electric' ? INSURANCE_BASE_EXAMPLE.electric : INSURANCE_BASE_EXAMPLE.gas;
  return Math.round((base * index) / 10) * 10;
}

/**
 * Re-suggests insurance when the fuel type changes, for the same reason registration is re-suggested:
 * an option switched to electric should pick up the higher EV premium, not keep the petrol one.
 */
export function refreshInsuranceForFuel(i: VehicleFormInputs, side: 'a' | 'b'): VehicleFormInputs {
  const data = stateDefaultsFor(i.stateCode);
  const path = `${side}.insuranceAnnual` as SuggestiblePath;
  if (!data || i.provenance[path] === 'user') return i;
  const o = i[side];
  const value = insuranceFor(o.fuelType, data.insuranceIndex);
  if (o.insuranceAnnual === value) return i;
  return { ...i, [side]: { ...o, insuranceAnnual: value }, provenance: { ...i.provenance, [path]: 'suggested' } };
}

export function refreshRegistrationForFuel(i: VehicleFormInputs, side: 'a' | 'b'): VehicleFormInputs {
  const data = stateDefaultsFor(i.stateCode);
  const path = `${side}.registrationAnnual` as SuggestiblePath;
  if (!data || i.provenance[path] === 'user') return i;
  const o = i[side];
  const value = REG_BASE_EXAMPLE + (o.fuelType === 'electric' ? data.evFeeAnnual : 0);
  if (o.registrationAnnual === value) return i;
  return { ...i, [side]: { ...o, registrationAnnual: value }, provenance: { ...i.provenance, [path]: 'suggested' } };
}

/**
 * Swaps A and B, including their provenance entries. Without the second half, swapping would move
 * the numbers but leave the "Your input" badges pointing at the wrong car.
 */
export function swapVehicleFormInputs(i: VehicleFormInputs): VehicleFormInputs {
  const provenance: Provenance = {};
  for (const [k, v] of Object.entries(i.provenance)) {
    if (k.startsWith('a.')) provenance[`b.${k.slice(2)}`] = v;
    else if (k.startsWith('b.')) provenance[`a.${k.slice(2)}`] = v;
    else provenance[k] = v;
  }
  return { ...i, a: i.b, b: i.a, provenance };
}

/**
 * Adapts a preset to the situation the user has already described before it is loaded or compared.
 *
 * This is what stops "pick California, then load an example" from throwing the state away, and what
 * lets the preset chip stay highlighted afterwards: the shell asks whether the current inputs equal
 * this preset *as it would look in my state*, not whether they equal the raw preset.
 */
export function contextualizeVehiclePreset(preset: VehicleFormInputs, current: VehicleFormInputs): VehicleFormInputs {
  const base: VehicleFormInputs = { ...preset, stateCode: current.stateCode, provenance: {} };
  return current.stateCode ? applyStateSuggestions(base, current.stateCode) : base;
}

/** Restores a provenance map from an untrusted source (share link, old localStorage). */
export function normalizeProvenance(raw: unknown): Provenance {
  const out: Provenance = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!SUGGESTIBLE.has(k)) continue;
    if (v === 'user' || v === 'suggested') out[k] = v;
  }
  return out;
}

/** Restores a state code from an untrusted source. Anything unrecognised becomes 'not set'. */
export function normalizeStateCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const code = raw.toUpperCase();
  return stateDefaultsFor(code) ? code : '';
}

/** How many suggestible fields the person has taken over. Drives the "you've made it yours" copy. */
export function userEditCount(i: VehicleFormInputs): number {
  return Object.values(i.provenance).filter((v) => v === 'user').length;
}
