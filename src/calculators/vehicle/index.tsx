import type { CalculatorDefinition } from '../types';
import { mergeWithDefaults } from '../types';
import { calculatorById } from '../meta';
import { computeVehicle, swapVehicleInputs, type VehicleInputs, type VehicleResult } from '../../engine/calculators/vehicle';
import { VehicleForm } from './VehicleForm';
import { VehicleResults } from './VehicleResults';
import { vehicleAssumptions, vehicleInsights, vehicleMethodology, vehicleNameFor, vehicleQuickAdjust, vehicleSummary } from './definition';
import { vehicleDefaults, vehiclePresets } from './presets';

function normalize(raw: unknown): VehicleInputs {
  const merged = mergeWithDefaults(vehicleDefaults, raw);
  for (const side of ['a', 'b'] as const) {
    const o = merged[side];
    if (o.paymentMethod !== 'cash' && o.paymentMethod !== 'finance') o.paymentMethod = 'finance';
    if (o.fuelType !== 'gas' && o.fuelType !== 'electric') o.fuelType = 'gas';
    if (!Number.isFinite(o.termMonths) || o.termMonths < 1) o.termMonths = 60;
    if (o.resaleOverride !== null && !(typeof o.resaleOverride === 'number' && Number.isFinite(o.resaleOverride))) o.resaleOverride = null;
  }
  merged.shared.ownershipYears = Math.min(20, Math.max(1, Math.round(merged.shared.ownershipYears)));
  return merged;
}

export const vehicleCalculator: CalculatorDefinition<VehicleInputs, VehicleResult> = {
  ...calculatorById('vehicle')!,
  defaults: vehicleDefaults,
  presets: vehiclePresets,
  compute: computeVehicle,
  swap: swapVehicleInputs,
  normalize,
  Form: VehicleForm,
  Results: VehicleResults,
  summary: vehicleSummary,
  methodology: vehicleMethodology,
  insights: vehicleInsights,
  quickAdjust: vehicleQuickAdjust,
  assumptions: vehicleAssumptions,
  nameFor: vehicleNameFor,
};
