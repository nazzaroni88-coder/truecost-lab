import type { CalculatorDefinition } from '../types';
import { mergeWithDefaults } from '../types';
import { calculatorById } from '../meta';
import { computeVehicle, type VehicleResult } from '../../engine/calculators/vehicle';
import { VehicleForm } from './VehicleForm';
import { VehicleResults } from './VehicleResults';
import { vehicleAssumptions, vehicleInsights, vehicleMethodology, vehicleNameFor, vehicleQuickAdjust, vehicleSummary } from './definition';
import { vehicleDefaults, vehiclePresets } from './presets';
import {
  contextualizeVehiclePreset,
  normalizeProvenance,
  normalizeStateCode,
  stateNameOf,
  swapVehicleFormInputs,
  userEditCount,
  type VehicleFormInputs,
} from './inputs';

function normalize(raw: unknown): VehicleFormInputs {
  const merged = mergeWithDefaults(vehicleDefaults, raw);
  for (const side of ['a', 'b'] as const) {
    const o = merged[side];
    if (o.paymentMethod !== 'cash' && o.paymentMethod !== 'finance') o.paymentMethod = 'finance';
    if (o.fuelType !== 'gas' && o.fuelType !== 'electric') o.fuelType = 'gas';
    if (!Number.isFinite(o.termMonths) || o.termMonths < 1) o.termMonths = 60;
    if (o.resaleOverride !== null && !(typeof o.resaleOverride === 'number' && Number.isFinite(o.resaleOverride))) o.resaleOverride = null;
    // Fields added after launch: share links and saved scenarios from before then have no value here,
    // and mergeWithDefaults already supplied 0. Clamping keeps hand-edited links sane.
    o.purchaseIncentive = Math.max(0, Math.min(o.purchaseIncentive, 1_000_000));
    o.chargerCost = Math.max(0, Math.min(o.chargerCost, 100_000));
  }
  merged.shared.ownershipYears = Math.min(20, Math.max(1, Math.round(merged.shared.ownershipYears)));

  // stateCode and provenance cannot come through mergeWithDefaults: it keeps only the keys present
  // in the defaults, and the default provenance map is deliberately empty. Restore both by hand,
  // whitelisting as we go. A scenario saved before this feature existed simply has no state, which
  // is exactly the "not set" case the form already handles.
  merged.stateCode = normalizeStateCode((raw as { stateCode?: unknown } | null)?.stateCode);
  merged.provenance = normalizeProvenance((raw as { provenance?: unknown } | null)?.provenance);
  return merged;
}

/**
 * The honesty line under the answer. It has to change as the numbers stop being ours and start
 * being theirs, otherwise a fully personalised model still reads as a canned example — and a model
 * still full of example values reads as if it were personalised.
 */
function presetNote(i: VehicleFormInputs): string | null {
  const edits = userEditCount(i);
  if (edits > 0) {
    const plural = edits === 1 ? 'number is yours' : 'numbers are yours';
    return `${edits} of these ${plural}; the rest are still illustrative estimates.`;
  }
  if (i.stateCode) return `Tax, fuel, electricity and insurance are ${stateNameOf(i.stateCode)} statewide typicals, not your bill.`;
  return null;
}

export const vehicleCalculator: CalculatorDefinition<VehicleFormInputs, VehicleResult> = {
  ...calculatorById('vehicle')!,
  defaults: vehicleDefaults,
  presets: vehiclePresets,
  compute: computeVehicle,
  swap: swapVehicleFormInputs,
  normalize,
  Form: VehicleForm,
  Results: VehicleResults,
  summary: vehicleSummary,
  methodology: vehicleMethodology,
  insights: vehicleInsights,
  quickAdjust: vehicleQuickAdjust,
  assumptions: vehicleAssumptions,
  nameFor: vehicleNameFor,
  contextualizePreset: contextualizeVehiclePreset,
  presetNote,
};
