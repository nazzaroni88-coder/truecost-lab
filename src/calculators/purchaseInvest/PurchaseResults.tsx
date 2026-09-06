import { useState } from 'react';
import type { ResultsProps } from '../types';
import type { PurchaseInvestInputs, PurchaseInvestResult } from '../../engine/calculators/purchaseInvest';
import { AnswerHero } from '../../components/results/AnswerHero';
import { InsightsList, MethodologyPanel, ResultSection } from '../../components/results/Sections';
import { LineChart } from '../../components/charts/LineChart';
import { MilestoneBars } from '../../components/charts/MilestoneBars';
import { Slider, Switch } from '../../components/ui/Controls';
import { categoryColor } from '../../lib/colors';
import { fmtMoney, fmtNumber, fmtPct, roundHeadline, yearsLabel } from '../../lib/format';
import { describePurchase, purchaseAssumptions, purchaseInsights, purchaseMethodology } from './definition';
import { computePurchaseInvest } from '../../engine/calculators/purchaseInvest';

export function PurchaseResults({ inputs: i, result: r, onChange }: ResultsProps<PurchaseInvestInputs, PurchaseInvestResult>) {
  const [real, setReal] = useState(false);
  const m30 = r.milestones.find((m) => m.years === 30)!;
  const m10 = r.milestones.find((m) => m.years === 10)!;
  const hasResale = i.resaleValue > 0;
  const empty = r.totalSpent <= 0;

  const headline = empty ? (
    <>Enter an amount to see what it could become.</>
  ) : (
    <>
      Spending {describePurchase(i)} means giving up about <span className="amt">{fmtMoney(roundHeadline(hasResale ? m30.netOfResale : m30.value))}</span> in 30 years.
    </>
  );
  const sub = empty
    ? 'Add a one-time amount, a monthly amount, or both. This calculator shows the long-term opportunity cost of spending — not to shame it, but to make the trade-off visible.'
    : `That is about ${fmtMoney(m30.realValue)} in today's dollars, assuming a ${fmtPct(i.investmentReturn, 1)} annual return. Of the 30-year total, ${fmtMoney(m30.contributions)} is the money itself and ${fmtMoney(m30.growth)} is growth. ${hasResale ? `Selling it for ${fmtMoney(i.resaleValue)} after ${yearsLabel(i.resaleYear)} gets some of that back.` : ''} Whether the purchase is worth it is your call — this is what it costs.`;

  const stats = empty
    ? undefined
    : [
        { label: 'Amount spent', value: fmtMoney(r.totalSpent), sub: describePurchase(i) },
        { label: 'In 10 years', value: fmtMoney(m10.value), sub: `${fmtMoney(m10.realValue)} today's $` },
        { label: 'In 30 years', value: fmtMoney(m30.value), sub: `${fmtMoney(m30.realValue)} today's $` },
        { label: 'Every $1 today', value: `$${fmtNumber(r.multiplier30, 2)}`, sub: 'in 30 years', help: `A dollar compounding at ${fmtPct(i.investmentReturn, 1)} for 30 years.` },
      ];

  const years: number[] = [];
  for (let y = 0; y <= 30; y++) years.push(y);
  const balances = years.map((y) => (real ? r.balances[y * 12] / Math.pow(1 + i.inflation / 100, y) : r.balances[y * 12]));
  const contribs = years.map((y) => {
    const t = y * 12;
    const c = Math.max(0, i.oneTimeAmount) + Math.max(0, i.monthlyAmount) * Math.min(t, Math.round(i.monthlyYears * 12));
    return real ? c / Math.pow(1 + i.inflation / 100, y) : c;
  });

  const returnRows = [4, 6, 8, 10].map((rp) => ({ rp, res: computePurchaseInvest({ ...i, investmentReturn: rp }) }));

  return (
    <>
      <AnswerHero winner="none" kicker="The opportunity cost" headline={headline} sub={sub} stats={stats} warnings={r.warnings} />

      {!empty && (
        <>
          <ResultSection id="milestones" kicker="If you invested it instead" title="What the same money could become" sub="Contributions are what you would have put in; growth is what compounding adds. Projected returns are illustrative, not guaranteed.">
            <div className="row-between" style={{ marginBottom: 'var(--sp-3)' }}>
              <Switch label="Show in today's dollars" checked={real} onChange={setReal} help="Adjusts each future value for inflation so it is comparable to prices today." />
            </div>
            <div className="milestones" style={{ marginBottom: 'var(--sp-4)' }}>
              {r.milestones.map((m) => {
                const v = real ? m.realValue : m.value;
                const contrib = real ? m.contributions / Math.pow(1 + i.inflation / 100, m.years) : m.contributions;
                return (
                  <div key={m.years} className={`milestone ${m.years === 30 ? 'hi' : ''}`}>
                    <div className="yrs">{m.years} years</div>
                    <div className="val">{fmtMoney(v)}</div>
                    <div className="split">
                      {fmtMoney(contrib)} put in
                      <br />+ {fmtMoney(v - contrib)} growth
                      {hasResale && m.years >= i.resaleYear && (
                        <>
                          <br />
                          <span className="text-positive">net of resale: {fmtMoney(real ? m.netOfResale / Math.pow(1 + i.inflation / 100, m.years) : m.netOfResale)}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <MilestoneBars milestones={r.milestones.map((m) => (real ? { ...m, value: m.realValue, contributions: m.contributions / Math.pow(1 + i.inflation / 100, m.years), growth: m.realValue - m.contributions / Math.pow(1 + i.inflation / 100, m.years) } : m))} ariaLabel="Projected value at 5, 10, 20 and 30 years" />
            <div style={{ marginTop: 'var(--sp-4)', maxWidth: 420 }}>
              <Slider label="Expected annual return" value={i.investmentReturn} min={0} max={12} step={0.5} onChange={(v) => onChange({ ...i, investmentReturn: v })} format={(v) => fmtPct(v, 1)} help="Long-run average return you expect from a diversified investment portfolio, before inflation. Historically roughly 7–10% for U.S. stocks, with wide variation and no guarantee." />
            </div>
          </ResultSection>

          <ResultSection id="curve" kicker="Over time" title="How the balance grows" sub={real ? "In today's dollars." : 'Nominal dollars. Toggle above to see today’s purchasing power.'}>
            <LineChart
              x={years}
              series={[
                { key: 'bal', label: 'If invested', color: categoryColor('growth'), values: balances, area: true },
                { key: 'contrib', label: 'Money put in', color: categoryColor('contributions'), values: contribs, dashed: true },
              ]}
              xFormat={(v) => `yr ${fmtNumber(v, 0)}`}
              ariaLabel="Projected investment balance versus contributions over 30 years"
              tooltip={(k) => ({ title: `Year ${years[k]}`, rows: [{ label: 'If invested', value: fmtMoney(balances[k]), color: categoryColor('growth') }, { label: 'Money put in', value: fmtMoney(contribs[k]), color: categoryColor('contributions') }] })}
            />
            <div className="legend" style={{ marginTop: 8 }}>
              <span className="item">
                <span className="sw" style={{ background: categoryColor('growth') }} /> If invested
              </span>
              <span className="item">
                <span className="sw" style={{ background: categoryColor('contributions') }} /> Money put in
              </span>
            </div>
          </ResultSection>

          <ResultSection id="perspective" kicker="Perspective" title="Three honest ways to look at it">
            <div className="be-list">
              <div className="be-item">
                <div className="ico">1</div>
                <div>
                  <div className="lab">The trade</div>
                  <div>
                    This purchase now, or about <strong>{fmtMoney(m30.realValue)}</strong> of today's purchasing power in 30 years. Neither answer is wrong — the point is to choose it.
                  </div>
                </div>
              </div>
              <div className="be-item">
                <div className="ico">2</div>
                <div>
                  <div className="lab">Have both</div>
                  <div>
                    Saving <strong>{fmtMoney(r.equivalentMonthlyOver30)}/month</strong> for 30 years at the same return reaches the same {fmtMoney(m30.value)}. If you can add that to your savings, the purchase costs you nothing in the long run.
                  </div>
                </div>
              </div>
              <div className="be-item">
                <div className="ico">3</div>
                <div>
                  <div className="lab">The return matters a lot</div>
                  <div>
                    30-year value at 4%: <strong>{fmtMoney(returnRows[0].res.milestones[3].value)}</strong> · 6%: <strong>{fmtMoney(returnRows[1].res.milestones[3].value)}</strong> · 8%: <strong>{fmtMoney(returnRows[2].res.milestones[3].value)}</strong> · 10%: <strong>{fmtMoney(returnRows[3].res.milestones[3].value)}</strong>. Big numbers over long horizons are always sensitive to the rate.
                  </div>
                </div>
              </div>
            </div>
          </ResultSection>

          <ResultSection id="insights" kicker="Plain English" title="Questions people ask about this result">
            <InsightsList items={purchaseInsights(i, r)} />
          </ResultSection>
        </>
      )}

      <MethodologyPanel id="method" items={purchaseMethodology(i, r)} assumptions={purchaseAssumptions(i)} />
    </>
  );
}
