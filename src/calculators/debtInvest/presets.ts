import type { Preset } from '../types';
import type { DebtInvestInputs } from '../../engine/calculators/debtInvest';

/** Illustrative presets — rounded estimates, not offers or quotes. */
export const debtInvestDefaults: DebtInvestInputs = {
  debtBalance: 40000,
  apr: 9,
  minimumPayment: 400,
  extraMonthly: 500,
  investmentReturn: 7,
  horizonYears: 10,
};

export const debtInvestPresets: Preset<DebtInvestInputs>[] = [
  {
    id: 'heloc-9',
    name: '9% HELOC vs a 7% expected return',
    chip: '9% HELOC vs 7%',
    description: '$40,000 at 9% with a $400 minimum. Put an extra $500 a month toward it, or invest the $500 expecting 7%?',
    inputs: debtInvestDefaults,
  },
  {
    id: 'student-6',
    name: '6% student loan vs investing',
    chip: '6% student loan',
    description: '$30,000 at 6% with a $330 minimum (10-year standard plan). The classic "should I pay extra?" question.',
    inputs: { debtBalance: 30000, apr: 6, minimumPayment: 330, extraMonthly: 300, investmentReturn: 7, horizonYears: 10 },
  },
  {
    id: 'card-20',
    name: '20% credit card vs investing',
    chip: '20% credit card',
    description: '$8,000 of card debt at 20% with a $200 minimum. Few investments reliably beat a 20% guaranteed return.',
    inputs: { debtBalance: 8000, apr: 20, minimumPayment: 200, extraMonthly: 300, investmentReturn: 7, horizonYears: 10 },
  },
  {
    id: 'car-3',
    name: '3% car loan vs investing',
    chip: '3% car loan',
    description: 'A cheap $20,000 loan at 3%. Low-rate debt is where investing the extra can genuinely win.',
    inputs: { debtBalance: 20000, apr: 3, minimumPayment: 360, extraMonthly: 200, investmentReturn: 7, horizonYears: 10 },
  },
  {
    id: 'mortgage-65',
    name: '6.5% mortgage: extra $500/month vs investing',
    chip: '6.5% mortgage',
    description: 'A $350,000 mortgage at 6.5%. Over 15 years, does an extra $500 a month beat the market?',
    inputs: { debtBalance: 350000, apr: 6.5, minimumPayment: 2212, extraMonthly: 500, investmentReturn: 7, horizonYears: 15 },
  },
];
