import type { Insight, MethodologyItem, QuickAdjust, ShareSummary } from '../types';
import type { CustomInputs, CustomOptionResult, CustomResult } from '../../engine/calculators/custom';
import { fmtMoney, fmtNumber, fmtPct, fmtYears, roundHeadline } from '../../lib/format';

export function customSummary(i: CustomInputs, r: CustomResult): ShareSummary {
  const { a, b, comparison: c } = r;
  const years = Math.round(i.horizonYears);
  const win = c.cheaper === 'b' ? b : a;
  const diff = Math.abs(c.nominalDifference);
  return {
    headline: c.cheaper === 'tie' ? `${a.name} and ${b.name} cost about the same over ${years} years.` : `${win.name} costs about ${fmtMoney(roundHeadline(diff))} less over ${years} years.`,
    sub: `True cost including upfront, ongoing and future costs, savings and resale: ${a.name} ${fmtMoney(a.totalCost)} vs ${b.name} ${fmtMoney(b.totalCost)}.`,
    winner: c.cheaper,
    optionA: a.name,
    optionB: b.name,
    keyMetric: c.nominalDifference,
    keyMetricLabel: `Difference (${a.name} − ${b.name})`,
    rows: [
      { label: `${a.name} true cost`, value: fmtMoney(a.totalCost), tone: 'a' },
      { label: `${b.name} true cost`, value: fmtMoney(b.totalCost), tone: 'b' },
      { label: 'Per month', value: `${fmtMoney(a.monthlyCost)} vs ${fmtMoney(b.monthlyCost)}` },
      { label: 'Crossover', value: c.crossover.year === null ? 'none' : `after ${fmtYears(c.crossover.year)}` },
      { label: `Invest the difference, ${years} yrs @ ${fmtPct(i.investmentReturn, 1)}`, value: c.invest.saver === 'tie' ? '—' : fmtMoney(c.invest.balanceAtHorizon), tone: 'positive' },
    ],
  };
}

export function customQuickAdjust(): QuickAdjust<CustomInputs>[] {
  return [
    { key: 'horizonYears', label: 'Compare over', get: (i) => i.horizonYears, set: (i, v) => ({ ...i, horizonYears: Math.round(v) }), min: 1, max: 30, step: 1, format: (v) => `${fmtNumber(v, 0)} yr` },
    { key: 'inflation', label: 'Inflation', get: (i) => i.inflation, set: (i, v) => ({ ...i, inflation: v }), min: 0, max: 8, step: 0.25, format: (v) => `${fmtPct(v, 2)}/yr` },
  ];
}

export function customAssumptions(i: CustomInputs): { label: string; value: string }[] {
  return [
    { label: 'Horizon', value: `${i.horizonYears} years` },
    { label: 'Inflation', value: `${fmtPct(i.inflation, 1)}/yr${i.growWithInflation ? ' (applied to ongoing costs and savings)' : ' (replacement prices only)'}` },
    { label: 'Investment return', value: `${fmtPct(i.investmentReturn, 1)}/yr` },
    ...(['a', 'b'] as const).map((s) => ({ label: `${i[s].name}: lifespan`, value: i[s].lifespanYears > 0 ? `${i[s].lifespanYears} yr, replaced at the inflated price` : 'lasts the whole horizon' })),
  ];
}

function optFormula(o: CustomOptionResult): string {
  return [
    `upfront ${fmtMoney(o.upfront)} + replacements ${fmtMoney(o.replacements)} + monthly ${fmtMoney(o.monthly)} + annual ${fmtMoney(o.annual)} + one-time ${fmtMoney(o.oneTime)}`,
    `− savings ${fmtMoney(o.savings)} − value at end ${fmtMoney(o.terminalValue)}`,
    `= ${fmtMoney(o.totalCost)}  (${fmtMoney(o.monthlyCost)}/mo)`,
  ].join('\n');
}

export function customMethodology(i: CustomInputs, r: CustomResult): MethodologyItem[] {
  return [
    { title: 'True cost of each option', body: 'All money out, minus savings and what the item is worth at the end.', formula: `${r.a.name}:\n${optFormula(r.a)}\n\n${r.b.name}:\n${optFormula(r.b)}` },
    { title: 'Timing', body: 'Upfront costs are paid on day one; monthly costs and savings at the end of each month; annual costs, annual savings and one-time costs at the end of the given year.' },
    { title: 'Replacements', body: `When an item's lifespan ends before the horizon, a replacement is bought at the price inflated by ${fmtPct(i.inflation, 1)} a year, and the old one is sold for its (inflated) resale value.` },
    { title: 'Crossover', body: 'Cost-to-date is money spent so far minus the current resale value. The crossover is the last point where the cheaper option changes — usually when a pricier-upfront option has paid for itself.' },
    { title: 'Invest the difference', body: `Each month's difference in spending is invested at ${fmtPct(i.investmentReturn, 1)} a year, and the difference in end values is added at the horizon.` },
  ];
}

export function customInsights(i: CustomInputs, r: CustomResult): Insight[] {
  const { a, b, comparison: c } = r;
  const years = Math.round(i.horizonYears);
  const win = c.cheaper === 'b' ? b : a;
  const lose = c.cheaper === 'b' ? a : b;
  const top = r.sensitivity[0];
  return [
    {
      question: 'Explain this result simply',
      answer:
        c.cheaper === 'tie' ? (
          <p>Over {years} years the two options cost about the same once everything is counted, so choose on convenience and preference.</p>
        ) : (
          <p>
            Over {years} years, {win.name} costs {fmtMoney(win.totalCost)} all-in and {lose.name} costs {fmtMoney(lose.totalCost)}. {lose.upfront > win.upfront ? `${lose.name} costs more up front (${fmtMoney(lose.upfront)} vs ${fmtMoney(win.upfront)}) and its lower running costs don't fully make up for it within ${years} years.` : `${win.name} costs more up front but its lower ongoing costs${win.savings > 0 ? ' and the savings it produces' : ''} more than pay it back.`}
            {c.crossover.year !== null && c.crossover.cheaperAtStart !== c.crossover.cheaperAtEnd && ` It pulls ahead after about ${fmtYears(c.crossover.year)}.`}
          </p>
        ),
    },
    {
      question: 'What assumption matters most?',
      answer: top ? (
        <p>
          <strong>{top.label}</strong>: across {top.format(top.low)} to {top.format(top.high)} the difference moves by {fmtMoney(top.swing)}.{top.flips ? ' That range is wide enough to flip the answer, so pin this number down first.' : ' Even across that range the cheaper option stays the same.'}
        </p>
      ) : (
        <p>Add costs to both options to see which assumptions drive the result.</p>
      ),
    },
    {
      question: 'What could I be overlooking?',
      answer: (
        <ul>
          <li>Time and hassle are not in these numbers: setup, maintenance chores, trips to the store, or the joy of not dealing with something.</li>
          <li>Quality differences: a premium option might be better to use every day, not just cheaper or dearer.</li>
          <li>Usage assumptions: savings only materialise if you actually use the thing as much as you think.</li>
          <li>Financing: if you would borrow to pay an upfront cost, add the interest as a monthly cost.</li>
        </ul>
      ),
    },
    {
      question: c.cheaper === 'tie' ? 'What would tip the balance?' : `How could ${lose.name} become the cheaper choice?`,
      answer: (
        <ul>
          {r.breakEvens.map((be) => (
            <li key={be.key}>{be.text}</li>
          ))}
          {r.breakEvens.length === 0 && <li>No single assumption within a plausible range flips the answer — the gap is robust.</li>}
        </ul>
      ),
    },
  ];
}
