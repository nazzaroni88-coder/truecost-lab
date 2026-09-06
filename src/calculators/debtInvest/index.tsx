import type { CalculatorDefinition } from '../types';
import { mergeWithDefaults } from '../types';
import { calculatorById } from '../meta';
import { computeDebtInvest, type DebtInvestInputs, type DebtInvestResult } from '../../engine/calculators/debtInvest';
import { DebtInvestForm } from './DebtInvestForm';
import { DebtInvestResults } from './DebtInvestResults';
import { debtInvestAssumptions, debtInvestInsights, debtInvestMethodology, debtInvestNameFor, debtInvestQuickAdjust, debtInvestSummary } from './definition';
import { debtInvestDefaults, debtInvestPresets } from './presets';

function normalize(raw: unknown): DebtInvestInputs {
  const m = mergeWithDefaults(debtInvestDefaults, raw);
  m.horizonYears = Math.min(40, Math.max(1, Math.round(m.horizonYears)));
  m.debtBalance = Math.max(0, m.debtBalance);
  m.minimumPayment = Math.max(0, m.minimumPayment);
  m.extraMonthly = Math.max(0, m.extraMonthly);
  return m;
}

export const debtInvestCalculator: CalculatorDefinition<DebtInvestInputs, DebtInvestResult> = {
  ...calculatorById('debt-invest')!,
  defaults: debtInvestDefaults,
  presets: debtInvestPresets,
  compute: computeDebtInvest,
  normalize,
  Form: DebtInvestForm,
  Results: DebtInvestResults,
  summary: debtInvestSummary,
  methodology: debtInvestMethodology,
  insights: debtInvestInsights,
  quickAdjust: debtInvestQuickAdjust,
  assumptions: debtInvestAssumptions,
  nameFor: debtInvestNameFor,
};
