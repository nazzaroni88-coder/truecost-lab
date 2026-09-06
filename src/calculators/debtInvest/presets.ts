import type { Preset } from '../types';
import type { DebtInvestInputs } from '../../engine/calculators/debtInvest';

/**
 * Illustrative presets — starting points, not offers or quotes.
 *
 * VERIFICATION LOG
 * 2026-09-06 — Checked rates against sources. Corrections made:
 *   • HELOC 9% → 7.3% (national average was about 7.29% in early September 2026). The old figure
 *     made paying the debt look far more clear-cut than it now is: at 7.3% nominal the effective
 *     cost is about 7.55%, so it still edges out a 7% expected return, but only just — which is a
 *     more honest and more interesting illustration.
 *   • Student loan 6% → 6.5% (federal undergraduate direct loans are 6.52% for 2026-27).
 *   • Credit card 20% → 20.9% (average APR across accounts was about 20.94% in Q2 2026).
 *   • The "3% car loan" example is now labelled as promotional manufacturer financing, since the
 *     average new-car rate is 6.9% and 3% only exists as a subsidised offer.
 */
export const debtInvestDefaults: DebtInvestInputs = {
  debtBalance: 40000,
  apr: 7.3,
  minimumPayment: 400,
  extraMonthly: 500,
  investmentReturn: 7,
  horizonYears: 10,
};

export const debtInvestPresets: Preset<DebtInvestInputs>[] = [
  {
    id: 'heloc',
    name: '7.3% HELOC vs a 7% expected return',
    chip: '7.3% HELOC vs 7%',
    description: '$40,000 at the current average HELOC rate with a $400 minimum. Put an extra $500 a month toward it, or invest the $500? This one is genuinely close — the deciding factor is that one return is certain and the other is not.',
    inputs: debtInvestDefaults,
  },
  {
    id: 'student-65',
    name: '6.5% student loan vs investing',
    chip: '6.5% student loan',
    description: '$30,000 at 6.5%, the current federal undergraduate rate, with a $340 minimum. The classic "should I pay extra?" question.',
    inputs: { debtBalance: 30000, apr: 6.5, minimumPayment: 340, extraMonthly: 300, investmentReturn: 7, horizonYears: 10 },
  },
  {
    id: 'card-21',
    name: '20.9% credit card vs investing',
    chip: '20.9% credit card',
    description: '$8,000 of card debt at the current average APR with a $200 minimum. Almost no investment reliably beats a guaranteed 20.9%.',
    inputs: { debtBalance: 8000, apr: 20.9, minimumPayment: 200, extraMonthly: 300, investmentReturn: 7, horizonYears: 10 },
  },
  {
    id: 'car-promo',
    name: '2.9% promotional car loan vs investing',
    chip: '2.9% promo car loan',
    description: 'A $20,000 manufacturer-subsidised loan at 2.9%, well below the 6.9% market average. Cheap debt is where investing the extra genuinely wins.',
    inputs: { debtBalance: 20000, apr: 2.9, minimumPayment: 360, extraMonthly: 200, investmentReturn: 7, horizonYears: 10 },
  },
  {
    id: 'mortgage-675',
    name: '6.75% mortgage: extra $500/month vs investing',
    chip: '6.75% mortgage',
    description: 'A $350,000 mortgage at the current 30-year average. Over 15 years, does an extra $500 a month beat the market?',
    inputs: { debtBalance: 350000, apr: 6.75, minimumPayment: 2270, extraMonthly: 500, investmentReturn: 7, horizonYears: 15 },
  },
];
