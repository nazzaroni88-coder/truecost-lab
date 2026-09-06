import type { Insight, MethodologyItem, QuickAdjust, ShareSummary } from '../types';
import type { DebtInvestInputs, DebtInvestResult } from '../../engine/calculators/debtInvest';
import { addMonths, fmtDate, fmtMoney, fmtMoneyCompact, fmtMonthsLong, fmtNumber, fmtPct, roundHeadline, yearsLabel } from '../../lib/format';

export function payoffLabel(month: number | null): string {
  if (month === null) return 'not within horizon';
  if (month === 0) return 'already paid';
  return `${fmtMonthsLong(month)} (${fmtDate(addMonths(new Date(), month))})`;
}

export function debtInvestSummary(i: DebtInvestInputs, r: DebtInvestResult): ShareSummary {
  const d = Math.abs(r.difference);
  const years = Math.round(i.horizonYears);
  const headline = r.winner === 'tie' ? `Paying the debt or investing the extra comes out about even after ${yearsLabel(years)}.` : r.winner === 'payDebt' ? `Paying off the ${fmtPct(i.apr, 1)} debt first leaves you about ${fmtMoney(roundHeadline(d))} ahead after ${yearsLabel(years)}.` : `Investing the extra leaves you about ${fmtMoney(roundHeadline(d))} ahead after ${yearsLabel(years)} — if it really earns ${fmtPct(i.investmentReturn, 1)}.`;
  const sub = `${fmtMoney(i.debtBalance)} at ${fmtPct(i.apr, 1)} with ${fmtMoney(i.extraMonthly)}/mo extra. Break-even return: about ${r.breakEvenReturn === null ? '—' : fmtPct(r.breakEvenReturn, 1)}.`;
  return {
    headline,
    sub,
    winner: r.winner === 'tie' ? 'tie' : r.winner === 'payDebt' ? 'a' : 'b',
    optionA: 'Pay debt first',
    optionB: 'Invest the extra',
    keyMetric: r.difference,
    keyMetricLabel: 'Investing advantage (net worth)',
    rows: [
      { label: `Net worth after ${years} yr: pay debt first`, value: fmtMoney(r.payDebt.netWorth), tone: 'a' },
      { label: `Net worth after ${years} yr: invest the extra`, value: fmtMoney(r.invest.netWorth), tone: 'b' },
      { label: 'Interest avoided by paying first', value: fmtMoney(r.interestAvoided), tone: 'positive' },
      { label: 'Debt-free: pay first vs invest', value: `${r.payDebt.payoffMonth === null ? '—' : fmtMonthsLong(r.payDebt.payoffMonth)} vs ${r.invest.payoffMonth === null ? 'not within horizon' : fmtMonthsLong(r.invest.payoffMonth)}` },
      { label: 'Return needed to break even', value: r.breakEvenReturn === null ? '—' : fmtPct(r.breakEvenReturn, 1) },
    ],
  };
}

export function debtInvestQuickAdjust(): QuickAdjust<DebtInvestInputs>[] {
  return [
    { key: 'investmentReturn', label: 'Expected return', get: (i) => i.investmentReturn, set: (i, v) => ({ ...i, investmentReturn: v }), min: 0, max: 15, step: 0.25, format: (v) => `${fmtPct(v, 2)}/yr` },
    { key: 'apr', label: 'Debt APR', get: (i) => i.apr, set: (i, v) => ({ ...i, apr: v }), min: 0, max: 30, step: 0.25, format: (v) => fmtPct(v, 2) },
    { key: 'extraMonthly', label: 'Extra per month', get: (i) => i.extraMonthly, set: (i, v) => ({ ...i, extraMonthly: v }), min: 0, max: 3000, step: 25, format: (v) => `${fmtMoney(v)}/mo` },
    { key: 'horizonYears', label: 'Time horizon', get: (i) => i.horizonYears, set: (i, v) => ({ ...i, horizonYears: Math.round(v) }), min: 1, max: 30, step: 1, format: (v) => `${fmtNumber(v, 0)} yr` },
  ];
}

export function debtInvestAssumptions(i: DebtInvestInputs): { label: string; value: string }[] {
  return [
    { label: 'Debt', value: `${fmtMoney(i.debtBalance)} at ${fmtPct(i.apr, 2)} APR, ${fmtMoney(i.minimumPayment)}/mo minimum` },
    { label: 'Monthly budget (both strategies)', value: `${fmtMoney(i.minimumPayment + i.extraMonthly)} = minimum + ${fmtMoney(i.extraMonthly)} extra` },
    { label: 'Investment return', value: `${fmtPct(i.investmentReturn, 1)}/yr effective, compounded monthly` },
    { label: 'Horizon', value: `${yearsLabel(i.horizonYears)}` },
    { label: 'Taxes, fees, employer match', value: 'not modeled' },
  ];
}

export function debtInvestMethodology(i: DebtInvestInputs, r: DebtInvestResult): MethodologyItem[] {
  const budget = i.minimumPayment + i.extraMonthly;
  return [
    {
      title: 'Two strategies, one budget',
      body: `Both strategies spend exactly ${fmtMoney(budget)} a month for ${yearsLabel(i.horizonYears)}. The only question is the order: debt first, or investments first.`,
      formula: `Pay debt first : ${fmtMoney(budget)} → debt until paid off, then ${fmtMoney(budget)} → investments\nInvest the extra: ${fmtMoney(i.minimumPayment)} → debt, ${fmtMoney(i.extraMonthly)} → investments; once the debt is gone, ${fmtMoney(budget)} → investments\nNet worth      = investments − remaining debt`,
    },
    {
      title: 'Monthly debt mechanics',
      body: 'Interest accrues on the balance each month before the payment is applied. The final payment is capped at the remaining balance.',
      formula: `interest(t) = balance × ${fmtPct(i.apr, 2)} / 12  (month 1: ${fmtMoney((i.debtBalance * i.apr) / 100 / 12, 2)})\nbalance(t)  = balance(t−1) + interest(t) − payment(t)\ninterest paid: pay first ${fmtMoney(r.payDebt.totalInterest)} · invest first ${fmtMoney(r.invest.totalInterest)} · minimums only ${fmtMoney(r.minimumOnlyInterest)}`,
    },
    {
      title: 'Investment growth',
      body: `Contributions are added at the end of each month after growth at the monthly equivalent of ${fmtPct(i.investmentReturn, 1)} a year.`,
      formula: `m = (1 + ${fmtPct(i.investmentReturn, 1)})^(1/12) − 1\ninvest(t) = invest(t−1) × (1 + m) + contribution(t)\nresult: pay first ${fmtMoney(r.payDebt.investmentBalance)} (${fmtMoney(r.payDebt.investmentContributions)} in) · invest first ${fmtMoney(r.invest.investmentBalance)} (${fmtMoney(r.invest.investmentContributions)} in)`,
    },
    {
      title: 'Break-even return',
      body: 'We search for the investment return at which both strategies end with the same net worth. It lands a little above the APR because the debt compounds monthly at a nominal rate while the return is an effective annual rate.',
      formula: `break-even ≈ ${r.breakEvenReturn === null ? 'n/a' : fmtPct(r.breakEvenReturn, 2)}   (APR ${fmtPct(i.apr, 2)} → effective ${fmtPct((Math.pow(1 + i.apr / 1200, 12) - 1) * 100, 2)})`,
    },
    {
      title: 'Why "guaranteed" matters',
      body: 'Paying down debt earns its APR with certainty. An investment return is an expectation with a wide range of outcomes. Comparing the two at face value understates the risk you take by investing instead — which is why many people require a healthy margin above the APR before choosing to invest.',
    },
    {
      title: 'Not modeled',
      body: 'Taxes on investment gains, tax-deductible interest (some mortgage and student-loan interest), employer 401(k) matching (which can make investing win even against high-rate debt), liquidity and emergency funds, and the psychological value of being debt-free.',
    },
  ];
}

export function debtInvestInsights(i: DebtInvestInputs, r: DebtInvestResult): Insight[] {
  const years = Math.round(i.horizonYears);
  const be = r.breakEvenReturn;
  return [
    {
      question: 'Explain this result simply',
      answer: (
        <>
          <p>
            Every dollar you put toward a {fmtPct(i.apr, 1)} debt “earns” {fmtPct(i.apr, 1)} — guaranteed, because you stop paying that interest. Every dollar you invest earns whatever the market gives, which you are guessing is {fmtPct(i.investmentReturn, 1)}.
          </p>
          <p>
            {r.winner === 'payDebt'
              ? `Because ${fmtPct(i.apr, 1)} (certain) is more than ${fmtPct(i.investmentReturn, 1)} (hoped for), paying the debt first ends ${fmtMoney(Math.abs(r.difference))} ahead after ${yearsLabel(years)} — and you are debt-free ${r.monthsSaved !== null ? fmtMonthsLong(r.monthsSaved) : ''} sooner.`
              : r.winner === 'invest'
                ? `Because you expect ${fmtPct(i.investmentReturn, 1)} from investing and the debt only costs ${fmtPct(i.apr, 1)}, investing the extra ends ${fmtMoney(Math.abs(r.difference))} ahead after ${yearsLabel(years)} — but only if that return actually shows up. Paying the debt first is the safer path and gets you debt-free ${r.monthsSaved !== null ? fmtMonthsLong(r.monthsSaved) : ''} sooner.`
                : 'The two come out about even, which means the guaranteed option (paying the debt) is the lower-risk way to the same place.'}
          </p>
        </>
      ),
    },
    {
      question: 'What assumption matters most?',
      answer: (
        <p>
          The expected return. {be !== null ? `The investments need to earn about ${fmtPct(be, 1)} a year — reliably, after fees and taxes — just to tie with paying off the debt.` : ''} Below that, paying the debt wins; above it, investing wins. The debt's rate is certain; the return is not, so ask how confident you are in {fmtPct(i.investmentReturn, 1)} over {yearsLabel(years)}.
        </p>
      ),
    },
    {
      question: 'What could I be overlooking?',
      answer: (
        <ul>
          <li>
            <strong>Employer match.</strong> If a 401(k) match is on the table, that is an immediate 50–100% return on contributions — usually worth capturing even before attacking high-rate debt.
          </li>
          <li>
            <strong>Emergency fund.</strong> Extra debt payments cannot be un-paid. Keep a cash cushion before going all-in on either strategy.
          </li>
          <li>
            <strong>Taxes.</strong> Investment gains may be taxed; some interest (mortgage, student loans) may be deductible. Both narrow the gap in favor of investing slightly.
          </li>
          <li>
            <strong>Variable rates.</strong> HELOCs and cards can reprice. A {fmtPct(i.apr, 1)} rate today may not be {fmtPct(i.apr, 1)} next year.
          </li>
          <li>
            <strong>Behavior.</strong> Debt payoff is automatic and irreversible; investing requires sticking with it through downturns. The strategy you will actually follow beats the one that is theoretically optimal.
          </li>
        </ul>
      ),
    },
    {
      question: r.winner === 'payDebt' ? 'How could investing become the better choice?' : 'How could paying the debt become the better choice?',
      answer: (
        <ul>
          {be !== null && <li>{r.winner === 'payDebt' ? `If the investments reliably earned more than about ${fmtPct(be, 1)} a year.` : `If the investments earned less than about ${fmtPct(be, 1)} a year — a real possibility over any given ${years}-year stretch.`}</li>}
          {r.winner === 'payDebt' ? <li>If the debt were cheaper: refinancing or a balance transfer to a lower rate changes the math immediately.</li> : <li>If the debt's rate rose (variable-rate loans) or if you would sleep better without it.</li>}
          <li>If you had a matched retirement account to fund first — that is usually the one clear exception.</li>
        </ul>
      ),
    },
  ];
}

/** Short, content-derived scenario name: "$40k at 9% · +$500/mo". */
export function debtInvestNameFor(i: DebtInvestInputs): string {
  return `${fmtMoneyCompact(i.debtBalance)} at ${fmtPct(i.apr, 1)} · +${fmtMoney(i.extraMonthly)}/mo`;
}
