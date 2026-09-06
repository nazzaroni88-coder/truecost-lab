import type { Preset } from '../types';
import type { PurchaseInvestInputs } from '../../engine/calculators/purchaseInvest';

export const purchaseDefaults: PurchaseInvestInputs = {
  oneTimeAmount: 5000,
  monthlyAmount: 0,
  monthlyYears: 0,
  investmentReturn: 7,
  inflation: 2.5,
  resaleValue: 0,
  resaleYear: 0,
};

export const purchasePresets: Preset<PurchaseInvestInputs>[] = [
  {
    id: 'vacation-5k',
    name: '$5,000 vacation',
    chip: '$5k vacation',
    description: 'A one-time trip. What is the long-run opportunity cost — and is the memory worth it? (Often, yes.)',
    inputs: purchaseDefaults,
  },
  {
    id: 'car-upgrade-15k',
    name: '$15,000 car upgrade',
    chip: '$15k car upgrade',
    description: 'Stepping up to a nicer car. Some of it comes back at resale — say $4,000 after 6 years.',
    inputs: { ...purchaseDefaults, oneTimeAmount: 15000, resaleValue: 4000, resaleYear: 6 },
  },
  {
    id: 'laptop-2k',
    name: '$2,000 phone or laptop',
    chip: '$2k laptop',
    description: 'A premium device you will sell for about $400 in four years.',
    inputs: { ...purchaseDefaults, oneTimeAmount: 2000, resaleValue: 400, resaleYear: 4 },
  },
  {
    id: 'recurring-100',
    name: '$100 a month for 10 years',
    chip: '$100/mo × 10 yrs',
    description: 'A subscription, a habit, a hobby. Small monthly amounts compound into surprisingly large numbers.',
    inputs: { ...purchaseDefaults, oneTimeAmount: 0, monthlyAmount: 100, monthlyYears: 10 },
  },
  {
    id: 'recurring-200',
    name: '$200 a month recurring expense',
    chip: '$200/mo × 20 yrs',
    description: 'A car payment, a gym plus streaming plus takeout — $200 a month for 20 years.',
    inputs: { ...purchaseDefaults, oneTimeAmount: 0, monthlyAmount: 200, monthlyYears: 20 },
  },
  {
    id: 'purchase-10k',
    name: '$10,000 purchase vs investing',
    chip: '$10k purchase',
    description: 'The round-number version of the question.',
    inputs: { ...purchaseDefaults, oneTimeAmount: 10000 },
  },
];
