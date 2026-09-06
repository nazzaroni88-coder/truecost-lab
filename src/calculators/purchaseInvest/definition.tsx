import type { Insight, MethodologyItem, QuickAdjust, ShareSummary } from '../types';
import { computePurchaseInvest, type PurchaseInvestInputs, type PurchaseInvestResult } from '../../engine/calculators/purchaseInvest';
import { fmtMoney, fmtNumber, fmtPct, roundHeadline, yearsLabel } from '../../lib/format';

export function describePurchase(i: PurchaseInvestInputs): string {
  const parts: string[] = [];
  if (i.oneTimeAmount > 0) parts.push(`${fmtMoney(i.oneTimeAmount)} today`);
  if (i.monthlyAmount > 0 && i.monthlyYears > 0) parts.push(`${fmtMoney(i.monthlyAmount)} a month for ${fmtNumber(i.monthlyYears, 0)} year${i.monthlyYears === 1 ? '' : 's'}`);
  return parts.join(' plus ') || 'nothing yet';
}

export function purchaseSummary(i: PurchaseInvestInputs, r: PurchaseInvestResult): ShareSummary {
  const m30 = r.milestones.find((m) => m.years === 30)!;
  const m10 = r.milestones.find((m) => m.years === 10)!;
  const headline = r.totalSpent <= 0 ? 'Enter an amount to see its long-term opportunity cost.' : `Spending ${describePurchase(i)} means giving up about ${fmtMoney(roundHeadline(m30.netOfResale))} in 30 years.`;
  const sub = `That's ${fmtMoney(m30.realValue)} in today's dollars at ${fmtPct(i.investmentReturn, 1)} growth — of which ${fmtMoney(m30.contributions)} is the money itself and ${fmtMoney(m30.growth)} is growth.`;
  return {
    headline,
    sub,
    winner: 'none',
    keyMetric: m30.netOfResale,
    keyMetricLabel: '30-year opportunity cost',
    rows: [
      { label: 'Amount spent', value: fmtMoney(r.totalSpent) },
      { label: 'Worth in 10 years if invested', value: fmtMoney(m10.value) },
      { label: 'Worth in 30 years if invested', value: fmtMoney(m30.value), tone: 'positive' },
      { label: '30 years, in today\'s dollars', value: fmtMoney(m30.realValue) },
      { label: 'Assumed return', value: `${fmtPct(i.investmentReturn, 1)}/yr` },
    ],
  };
}

export function purchaseQuickAdjust(): QuickAdjust<PurchaseInvestInputs>[] {
  return [
    { key: 'investmentReturn', label: 'Expected return', get: (i) => i.investmentReturn, set: (i, v) => ({ ...i, investmentReturn: v }), min: 0, max: 12, step: 0.25, format: (v) => `${fmtPct(v, 2)}/yr` },
    { key: 'inflation', label: 'Inflation', get: (i) => i.inflation, set: (i, v) => ({ ...i, inflation: v }), min: 0, max: 8, step: 0.25, format: (v) => `${fmtPct(v, 2)}/yr` },
  ];
}

export function purchaseAssumptions(i: PurchaseInvestInputs): { label: string; value: string }[] {
  return [
    { label: 'Spend', value: describePurchase(i) },
    { label: 'Investment return', value: `${fmtPct(i.investmentReturn, 1)}/yr effective, compounded monthly` },
    { label: 'Inflation (for today\'s dollars)', value: `${fmtPct(i.inflation, 1)}/yr` },
    { label: 'Resale', value: i.resaleValue > 0 ? `${fmtMoney(i.resaleValue)} after ${yearsLabel(i.resaleYear)}, then invested` : 'none' },
    { label: 'Taxes and fees on investments', value: 'not modeled' },
  ];
}

export function purchaseMethodology(i: PurchaseInvestInputs, r: PurchaseInvestResult): MethodologyItem[] {
  const m30 = r.milestones.find((m) => m.years === 30)!;
  return [
    {
      title: 'Future value of the money',
      body: `The one-time amount is invested immediately; recurring amounts are added at the end of each month while they last. Growth compounds monthly at the equivalent of ${fmtPct(i.investmentReturn, 1)} a year.`,
      formula: `m = (1 + ${fmtPct(i.investmentReturn, 1)})^(1/12) − 1 = ${fmtPct((Math.pow(1 + i.investmentReturn / 100, 1 / 12) - 1) * 100, 4)}/mo\nbalance(t) = balance(t−1) × (1 + m) + contribution(t)\n30-year value = ${fmtMoney(m30.value)} = ${fmtMoney(m30.contributions)} contributed + ${fmtMoney(m30.growth)} growth`,
    },
    {
      title: 'Today\'s dollars',
      body: 'Future dollars buy less. We deflate each milestone by the inflation assumption so you can compare with prices you know today.',
      formula: `real value(30) = ${fmtMoney(m30.value)} ÷ (1 + ${fmtPct(i.inflation, 1)})^30 = ${fmtMoney(m30.realValue)}`,
    },
    {
      title: 'Resale value',
      body: 'If the purchase can be sold later, the proceeds are invested from the sale year onward and subtracted from the opportunity cost.',
      formula: i.resaleValue > 0 ? `net of resale(30) = ${fmtMoney(m30.value)} − ${fmtMoney(i.resaleValue)} × (1 + m)^(12 × (30 − ${i.resaleYear})) = ${fmtMoney(m30.netOfResale)}` : 'no resale value entered',
    },
    {
      title: 'Equivalent monthly saving',
      body: 'A different way to read the same number: the monthly amount that, saved for 30 years at the same return, would reach the same total.',
      formula: `equivalent = ${fmtMoney(m30.value)} ÷ [((1 + m)^360 − 1) / m] = ${fmtMoney(r.equivalentMonthlyOver30, 2)}/mo`,
    },
    {
      title: 'What this is not',
      body: 'It is not a verdict on whether to buy. Money exists to be used; the point is to see the trade-off clearly, in numbers you can feel, and decide on purpose.',
    },
  ];
}

export function purchaseInsights(i: PurchaseInvestInputs, r: PurchaseInvestResult): Insight[] {
  const m30 = r.milestones.find((m) => m.years === 30)!;
  const m10 = r.milestones.find((m) => m.years === 10)!;
  return [
    {
      question: 'Explain this result simply',
      answer: (
        <>
          <p>
            Money spent today can't grow. {fmtMoney(r.totalSpent)} invested at {fmtPct(i.investmentReturn, 1)} becomes about {fmtMoney(m10.value)} in 10 years and {fmtMoney(m30.value)} in 30. Most of the 30-year number ({fmtPct(m30.value > 0 ? (m30.growth / m30.value) * 100 : 0, 0)}) is growth, not the original money.
          </p>
          <p>Because prices rise too, {fmtMoney(m30.value)} in 30 years buys roughly what {fmtMoney(m30.realValue)} buys today. That is the fairest single number for the trade-off.</p>
        </>
      ),
    },
    {
      question: 'Should I feel bad about spending this?',
      answer: (
        <>
          <p>No. The goal of money is to buy a good life, and some purchases are worth far more than their future value — experiences, health, time, relationships, tools that earn their keep. The opportunity cost is real, but so is the value of the thing.</p>
          <p>A useful test: would you rather have this now, or {fmtMoney(m30.realValue)} of today's purchasing power at retirement? Either answer can be right. What matters is deciding on purpose rather than by default.</p>
        </>
      ),
    },
    {
      question: 'What assumption matters most?',
      answer: (
        <p>
          The return. At {fmtPct(Math.max(0, i.investmentReturn - 3), 0)} the 30-year figure would be about {fmtMoney(computePurchaseInvest({ ...i, investmentReturn: Math.max(0, i.investmentReturn - 3) }).milestones[3].value)}; at {fmtPct(i.investmentReturn + 3, 0)} closer to {fmtMoney(computePurchaseInvest({ ...i, investmentReturn: i.investmentReturn + 3 }).milestones[3].value)}. Long horizons magnify small differences in return, which is exactly why the 30-year number is so large — and so uncertain.
        </p>
      ),
    },
    {
      question: 'How can I have both?',
      answer: (
        <ul>
          <li>Save {fmtMoney(r.equivalentMonthlyOver30)} a month for 30 years and you reach the same {fmtMoney(m30.value)} anyway.</li>
          <li>Buy used or wait for a sale: cutting the price by 30% cuts the opportunity cost by 30% too.</li>
          {i.monthlyAmount > 0 && <li>Recurring costs are the easiest to trim: pausing a {fmtMoney(i.monthlyAmount)}/month expense for even a year keeps {fmtMoney(i.monthlyAmount * 12)} compounding.</li>}
          {i.resaleValue <= 0 && <li>Pick things that hold value. A purchase you can resell for half its price has half the opportunity cost.</li>}
        </ul>
      ),
    },
  ];
}

/** Short, content-derived scenario name: "$5,000 today @ 7%". */
export function purchaseNameFor(i: PurchaseInvestInputs): string {
  const what = i.oneTimeAmount > 0 ? fmtMoney(i.oneTimeAmount) : i.monthlyAmount > 0 ? `${fmtMoney(i.monthlyAmount)}/mo` : 'No amount';
  return `${what} @ ${fmtPct(i.investmentReturn, 1)}`;
}
