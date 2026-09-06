import type { ResultsProps } from '../types';
import type { DebtInvestInputs, DebtInvestResult } from '../../engine/calculators/debtInvest';
import { AnswerHero } from '../../components/results/AnswerHero';
import { BreakEvenList, InsightsList, MethodologyPanel, ResultSection } from '../../components/results/Sections';
import { SensitivitySection } from '../../components/results/SensitivitySection';
import { LineChart } from '../../components/charts/LineChart';
import { Callout } from '../../components/ui/Controls';
import { IconShield } from '../../components/ui/Icons';
import { OPTION_COLORS } from '../../lib/colors';
import { fmtMoney, fmtMoneyCompact, fmtMonthsLong, fmtNumber, fmtPct, roundHeadline, yearsLabel } from '../../lib/format';
import { debtInvestAssumptions, debtInvestInsights, debtInvestMethodology, debtInvestQuickAdjust, payoffLabel } from './definition';

export function DebtInvestResults({ inputs: i, result: r, onChange }: ResultsProps<DebtInvestInputs, DebtInvestResult>) {
  const years = Math.round(i.horizonYears);
  const d = Math.abs(r.difference);
  const winnerTone: 'a' | 'b' | 'tie' = r.winner === 'payDebt' ? 'a' : r.winner === 'invest' ? 'b' : 'tie';

  const headline =
    r.winner === 'tie' ? (
      <>Paying the debt or investing the extra comes out about even after {yearsLabel(years)}.</>
    ) : r.winner === 'payDebt' ? (
      <>
        <span className="text-a">Paying off the debt first</span> leaves you about <span className="amt">{fmtMoney(roundHeadline(d))}</span> ahead after {yearsLabel(years)}.
      </>
    ) : (
      <>
        <span className="text-b">Investing the extra</span> leaves you about <span className="amt">{fmtMoney(roundHeadline(d))}</span> ahead after {yearsLabel(years)} — if it really earns {fmtPct(i.investmentReturn, 1)}.
      </>
    );

  const sub =
    r.winner === 'payDebt'
      ? `Your ${fmtPct(i.apr, 1)} debt is a guaranteed cost, and ${fmtPct(i.apr, 1)} beats the ${fmtPct(i.investmentReturn, 1)} you expect from investing. Paying it first avoids ${fmtMoney(r.interestAvoided)} of interest and makes you debt-free ${r.monthsSaved !== null ? `${fmtMonthsLong(r.monthsSaved)} sooner` : 'sooner'}. Once it's gone, the whole ${fmtMoney(i.minimumPayment + i.extraMonthly)} a month goes to investing.`
      : r.winner === 'invest'
        ? `Investing wins on paper because ${fmtPct(i.investmentReturn, 1)} is more than the debt's ${fmtPct(i.apr, 1)}. But the debt's cost is certain and the return is not: the investments need to average at least ${r.breakEvenReturn !== null ? fmtPct(r.breakEvenReturn, 1) : '—'} to come out ahead. Paying first is the risk-free way to a similar result.`
        : `At a ${fmtPct(i.investmentReturn, 1)} expected return the two paths finish within ${fmtMoney(d)} of each other. Since the debt's ${fmtPct(i.apr, 1)} is certain and the return is not, paying the debt is the lower-risk route.`;

  const stats = [
    { label: 'Net worth: pay debt first', value: fmtMoney(r.payDebt.netWorth), sub: `${fmtMoneyCompact(r.payDebt.investmentBalance)} invested`, tone: 'a' as const },
    { label: 'Net worth: invest the extra', value: fmtMoney(r.invest.netWorth), sub: r.invest.remainingDebt > 0 ? `${fmtMoneyCompact(r.invest.investmentBalance)} invested − ${fmtMoneyCompact(r.invest.remainingDebt)} debt` : `${fmtMoneyCompact(r.invest.investmentBalance)} invested`, tone: 'b' as const },
    { label: 'Debt-free', value: r.payDebt.payoffMonth === null ? '—' : fmtMonthsLong(r.payDebt.payoffMonth), sub: `vs ${r.invest.payoffMonth === null ? 'not within horizon' : fmtMonthsLong(r.invest.payoffMonth)} on minimums`, help: 'How long until the balance hits zero: paying extra versus paying only the minimum while investing.' },
    { label: 'Return needed to tie', value: r.breakEvenReturn === null ? '—' : fmtPct(r.breakEvenReturn, 1), sub: 'per year, reliably', help: 'The investment return at which both strategies end with the same net worth. Above it, investing wins; below it, paying the debt wins.' },
  ];

  const months = years * 12;
  const step = months <= 120 ? 3 : 6;
  const idx: number[] = [];
  for (let t = 0; t <= months; t += step) idx.push(t);
  if (idx[idx.length - 1] !== months) idx.push(months);
  const x = idx.map((t) => t / 12);
  const nwPay = idx.map((t) => r.payDebt.netWorthByMonth[t]);
  const nwInv = idx.map((t) => r.invest.netWorthByMonth[t]);

  return (
    <>
      <AnswerHero winner={winnerTone} headline={headline} sub={sub} stats={stats} warnings={r.warnings} />

      <ResultSection id="why" kicker="Why?" title="Guaranteed interest vs. an uncertain return">
        <Callout tone="info" icon={<IconShield />}>
          Paying a {fmtPct(i.apr, 1)} debt is like earning {fmtPct(i.apr, 1)} with zero risk. An investment's {fmtPct(i.investmentReturn, 1)} is an average expectation — any given {years}-year stretch can come in far above or below it. TrueCost shows the arithmetic; only you can decide how much certainty is worth.
        </Callout>
        <div className="table-scroll" style={{ marginTop: 'var(--sp-4)' }}>
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Over {yearsLabel(years)}</th>
                <th className="col-a">Pay debt first</th>
                <th className="col-b">Invest the extra</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Monthly budget (same for both)</td>
                <td>{fmtMoney(i.minimumPayment + i.extraMonthly)}</td>
                <td>{fmtMoney(i.minimumPayment + i.extraMonthly)}</td>
              </tr>
              <tr>
                <td>Debt-free in</td>
                <td>{payoffLabel(r.payDebt.payoffMonth)}</td>
                <td>{payoffLabel(r.invest.payoffMonth)}</td>
              </tr>
              <tr>
                <td>Total interest paid</td>
                <td>{fmtMoney(r.payDebt.totalInterest)}</td>
                <td>{fmtMoney(r.invest.totalInterest)}</td>
              </tr>
              <tr>
                <td>Put into investments</td>
                <td>{fmtMoney(r.payDebt.investmentContributions)}</td>
                <td>{fmtMoney(r.invest.investmentContributions)}</td>
              </tr>
              <tr>
                <td>Investment growth</td>
                <td>{fmtMoney(r.payDebt.investmentGrowth)}</td>
                <td>{fmtMoney(r.invest.investmentGrowth)}</td>
              </tr>
              <tr>
                <td>Investments at the end</td>
                <td>{fmtMoney(r.payDebt.investmentBalance)}</td>
                <td>{fmtMoney(r.invest.investmentBalance)}</td>
              </tr>
              <tr>
                <td>Debt remaining</td>
                <td>{fmtMoney(r.payDebt.remainingDebt)}</td>
                <td>{fmtMoney(r.invest.remainingDebt)}</td>
              </tr>
              <tr className="total">
                <td>Net worth after {yearsLabel(years)}</td>
                <td>{fmtMoney(r.payDebt.netWorth)}</td>
                <td>{fmtMoney(r.invest.netWorth)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="micro muted" style={{ marginTop: 'var(--sp-3)' }}>
          Paying only the minimum with no extra at all would take {r.minimumOnlyPayoffMonth === null ? `more than ${yearsLabel(years)}` : fmtMonthsLong(r.minimumOnlyPayoffMonth)} and cost {fmtMoney(r.minimumOnlyInterest)} in interest.
        </p>
      </ResultSection>

      <ResultSection id="over-time" kicker="Over time" title="Net worth on each path" sub="Investments minus remaining debt, month by month. The paths start together and diverge as interest saved (or growth earned) compounds.">
        <LineChart
          x={x}
          series={[
            { key: 'pay', label: 'Pay debt first', color: OPTION_COLORS.a, values: nwPay },
            { key: 'inv', label: 'Invest the extra', color: OPTION_COLORS.b, values: nwInv },
          ]}
          xFormat={(v) => `yr ${fmtNumber(v, 0)}`}
          zeroLine
          markers={r.payDebt.payoffMonth !== null && r.payDebt.payoffMonth > 0 ? [{ x: r.payDebt.payoffMonth / 12, label: 'debt-free (pay first)' }] : []}
          ariaLabel={`Net worth over ${yearsLabel(years)} for paying the debt first versus investing the extra`}
          tooltip={(k) => ({ title: `Year ${fmtNumber(x[k], 1)}`, rows: [{ label: 'Pay debt first', value: fmtMoney(nwPay[k]), color: OPTION_COLORS.a }, { label: 'Invest the extra', value: fmtMoney(nwInv[k]), color: OPTION_COLORS.b }] })}
        />
        <div className="legend" style={{ marginTop: 8 }}>
          <span className="item">
            <span className="sw" style={{ background: OPTION_COLORS.a }} /> Pay debt first
          </span>
          <span className="item">
            <span className="sw" style={{ background: OPTION_COLORS.b }} /> Invest the extra
          </span>
        </div>
      </ResultSection>

      <ResultSection id="scenarios" kicker="What if returns differ?" title="The answer at different investment returns" sub="Same debt, same budget — only the return changes. Notice how close the tipping point is to the APR.">
        <div className="table-scroll">
          <table className="cmp-table">
            <thead>
              <tr>
                <th>If investments return</th>
                <th>Better strategy</th>
                <th>By how much</th>
              </tr>
            </thead>
            <tbody>
              {r.returnScenarios.map((s) => (
                <tr key={s.returnPct} style={s.returnPct === i.investmentReturn ? { background: 'var(--tc-surface-2)' } : undefined}>
                  <td>{fmtPct(s.returnPct, 0)} per year</td>
                  <td className={s.winner === 'payDebt' ? 'text-a' : s.winner === 'invest' ? 'text-b' : ''} style={{ textAlign: 'right', fontWeight: 500 }}>
                    {s.winner === 'payDebt' ? 'Pay debt first' : s.winner === 'invest' ? 'Invest the extra' : 'Tie'}
                  </td>
                  <td>{fmtMoney(Math.abs(s.difference))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResultSection>

      <SensitivitySection id="sensitivity" rows={r.sensitivity} positiveLabel="Investing wins" negativeLabel="Paying debt wins" inputs={i} onChange={onChange} quickAdjust={debtInvestQuickAdjust()} />

      <ResultSection id="break-even" kicker="Break-even" title="What would have to change to flip the answer">
        <BreakEvenList
          items={[
            ...(r.breakEvenReturn !== null ? [{ key: 'return', label: 'Investment return', text: `The investments would need to return about ${fmtPct(r.breakEvenReturn, 1)} a year to match paying off this ${fmtPct(i.apr, 1)} debt. Anything less, and the debt wins.` }] : []),
            { key: 'horizon', label: 'Debt-free date', text: r.payDebt.payoffMonth !== null ? `Paying extra clears the debt in ${fmtMonthsLong(r.payDebt.payoffMonth)}; minimums alone take ${r.invest.payoffMonth === null ? `more than ${yearsLabel(years)}` : fmtMonthsLong(r.invest.payoffMonth)}. After the payoff, the "pay first" path invests the full ${fmtMoney(i.minimumPayment + i.extraMonthly)} every month.` : `Even with the extra payment the debt is not cleared within ${yearsLabel(years)} — consider a longer horizon or a larger payment.` },
          ]}
        />
      </ResultSection>

      <ResultSection id="insights" kicker="Plain English" title="Questions people ask about this result">
        <InsightsList items={debtInvestInsights(i, r)} />
      </ResultSection>

      <MethodologyPanel id="method" items={debtInvestMethodology(i, r)} assumptions={debtInvestAssumptions(i)} />
    </>
  );
}
