import type { CalculatorDefinition } from '../types';
import { mergeWithDefaults } from '../types';
import { calculatorById } from '../meta';
import { computeCustom, swapCustomInputs, type CustomInputs, type CustomOption, type FutureCost } from '../../engine/calculators/custom';
import { CustomForm } from './CustomForm';
import { CustomResults } from './CustomResults';
import { customAssumptions, customInsights, customMethodology, customNameFor, customQuickAdjust, customSummary } from './definition';
import { customDefaults, customPresets } from './presets';
import { uid } from '../../lib/ids';

function normalizeOption(defaults: CustomOption, raw: unknown): CustomOption {
  const o = mergeWithDefaults({ ...defaults, oneTime: [] as FutureCost[] }, raw);
  const rawList = raw && typeof raw === 'object' && Array.isArray((raw as { oneTime?: unknown }).oneTime) ? ((raw as { oneTime: unknown[] }).oneTime as unknown[]) : [];
  o.oneTime = rawList
    .map((c) => {
      const x = c && typeof c === 'object' ? (c as Record<string, unknown>) : {};
      const amount = Number(x.amount);
      const year = Number(x.year);
      return { id: typeof x.id === 'string' ? x.id : uid(), label: typeof x.label === 'string' ? x.label.slice(0, 80) : 'Future cost', amount: Number.isFinite(amount) ? Math.max(0, amount) : 0, year: Number.isFinite(year) ? Math.max(1, Math.round(year)) : 1 };
    })
    .slice(0, 20);
  o.upfront = Math.max(0, o.upfront);
  o.monthly = Math.max(0, o.monthly);
  o.annual = Math.max(0, o.annual);
  o.monthlySavings = Math.max(0, o.monthlySavings);
  o.annualSavings = Math.max(0, o.annualSavings);
  o.resaleValue = Math.max(0, o.resaleValue);
  o.lifespanYears = Math.max(0, o.lifespanYears);
  return o;
}

function normalize(raw: unknown): CustomInputs {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const m = mergeWithDefaults({ ...customDefaults, a: customDefaults.a, b: customDefaults.b }, raw);
  m.a = normalizeOption(customDefaults.a, src.a);
  m.b = normalizeOption(customDefaults.b, src.b);
  m.horizonYears = Math.min(40, Math.max(1, Math.round(m.horizonYears)));
  return m;
}

export const customCalculator: CalculatorDefinition<CustomInputs, ReturnType<typeof computeCustom>> = {
  ...calculatorById('custom')!,
  defaults: customDefaults,
  presets: customPresets,
  compute: computeCustom,
  swap: swapCustomInputs,
  normalize,
  Form: CustomForm,
  Results: CustomResults,
  summary: customSummary,
  methodology: customMethodology,
  insights: customInsights,
  quickAdjust: customQuickAdjust,
  assumptions: customAssumptions,
  nameFor: customNameFor,
};
