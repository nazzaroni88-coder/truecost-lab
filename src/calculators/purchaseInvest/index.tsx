import type { CalculatorDefinition } from '../types';
import { mergeWithDefaults } from '../types';
import { calculatorById } from '../meta';
import { computePurchaseInvest, type PurchaseInvestInputs, type PurchaseInvestResult } from '../../engine/calculators/purchaseInvest';
import { PurchaseForm } from './PurchaseForm';
import { PurchaseResults } from './PurchaseResults';
import { purchaseAssumptions, purchaseInsights, purchaseMethodology, purchaseNameFor, purchaseQuickAdjust, purchaseSummary } from './definition';
import { purchaseDefaults, purchasePresets } from './presets';

function normalize(raw: unknown): PurchaseInvestInputs {
  const m = mergeWithDefaults(purchaseDefaults, raw);
  m.oneTimeAmount = Math.max(0, m.oneTimeAmount);
  m.monthlyAmount = Math.max(0, m.monthlyAmount);
  m.monthlyYears = Math.min(30, Math.max(0, Math.round(m.monthlyYears)));
  m.resaleYear = Math.min(30, Math.max(0, Math.round(m.resaleYear)));
  m.resaleValue = Math.max(0, m.resaleValue);
  return m;
}

export const purchaseInvestCalculator: CalculatorDefinition<PurchaseInvestInputs, PurchaseInvestResult> = {
  ...calculatorById('purchase-invest')!,
  defaults: purchaseDefaults,
  presets: purchasePresets,
  compute: computePurchaseInvest,
  normalize,
  Form: PurchaseForm,
  Results: PurchaseResults,
  summary: purchaseSummary,
  methodology: purchaseMethodology,
  insights: purchaseInsights,
  quickAdjust: purchaseQuickAdjust,
  assumptions: purchaseAssumptions,
  nameFor: purchaseNameFor,
};
