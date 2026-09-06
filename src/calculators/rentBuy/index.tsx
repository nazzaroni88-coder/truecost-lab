import type { CalculatorDefinition } from '../types';
import { mergeWithDefaults } from '../types';
import { calculatorById } from '../meta';
import { computeRentBuy, type RentBuyInputs, type RentBuyResult } from '../../engine/calculators/rentBuy';
import { RentBuyForm } from './RentBuyForm';
import { RentBuyResults } from './RentBuyResults';
import { rentBuyAssumptions, rentBuyInsights, rentBuyMethodology, rentBuyNameFor, rentBuyQuickAdjust, rentBuySummary } from './definition';
import { rentBuyDefaults, rentBuyPresets } from './presets';

function normalize(raw: unknown): RentBuyInputs {
  const m = mergeWithDefaults(rentBuyDefaults, raw);
  m.horizonYears = Math.min(40, Math.max(1, Math.round(m.horizonYears)));
  if (![15, 20, 30].includes(m.mortgageTermYears)) m.mortgageTermYears = m.mortgageTermYears > 0 && m.mortgageTermYears <= 40 ? Math.round(m.mortgageTermYears) : 30;
  m.downPaymentPct = Math.min(100, Math.max(0, m.downPaymentPct));
  return m;
}

export const rentBuyCalculator: CalculatorDefinition<RentBuyInputs, RentBuyResult> = {
  ...calculatorById('rent-buy')!,
  defaults: rentBuyDefaults,
  presets: rentBuyPresets,
  compute: computeRentBuy,
  normalize,
  Form: RentBuyForm,
  Results: RentBuyResults,
  summary: rentBuySummary,
  methodology: rentBuyMethodology,
  insights: rentBuyInsights,
  quickAdjust: rentBuyQuickAdjust,
  assumptions: rentBuyAssumptions,
  nameFor: rentBuyNameFor,
};
