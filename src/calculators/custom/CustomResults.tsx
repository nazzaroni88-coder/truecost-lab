import type { ResultsProps } from '../types';
import type { CustomInputs, CustomOptionResult, CustomResult } from '../../engine/calculators/custom';
import { AnswerHero } from '../../components/results/AnswerHero';
import { InvestDifference } from '../../components/results/InvestDifference';
import { BreakEvenList, InsightsList, MethodologyPanel, ResultSection } from '../../components/results/Sections';
import { SensitivitySection } from '../../components/results/SensitivitySection';
import { LineChart } from '../../components/charts/LineChart';
import { StackedBars, type StackRow } from '../../components/charts/StackedBars';
import { categoryColor, OPTION_COLORS } from '../../lib/colors';
import { fmtMoney, fmtNumber, fmtYears, roundHeadline, yearsLabel } from '../../lib/format';
import { customAssumptions, customInsights, customMethodology, customQuickAdjust } from './definition';

export function CustomResults({ inputs, result, onChange }: ResultsProps<CustomInputs, CustomResult>) {
  const { a, b, comparison: c } = result;
  const years = Math.max(1, Math.round(inputs.horizonYears));
  const months = years * 12;
  const winner = c.cheaper;
  const win = winner === 'b' ? b : a;
  const lose = winner === 'b' ? a : b;
  const diff = Math.abs(c.nominalDifference);
  const empty = a.totalCost === 0 && b.totalCost === 0;

  const headline = empty ? (
    <>Add costs to both options to compare them.</>
  ) : winner === 'tie' ? (
    <>The two options cost about the same over {yearsLabel(years)}.</>
  ) : (
    <>
      <span className={`text-${winner}`}>{win.name}</span> is estimated to cost <span className="amt">{fmtMoney(roundHeadline(diff))}</span> less over {yearsLabel(years)}.
    </>
  );
  const sub = empty
    ? 'Enter upfront, monthly, annual or one-time costs for each option, plus any savings or resale value. Start from an example if you like.'
    : winner === 'tie'
      ? `${a.name} comes to ${fmtMoney(a.totalCost)} and ${b.name} to ${fmtMoney(b.totalCost)} once upfront, ongoing and future costs, savings and end value are all counted.`
      : `That's about ${fmtMoney(diff / months)} a month. ${win.name} comes to ${fmtMoney(win.totalCost)} all-in versus ${fmtMoney(lose.totalCost)} for ${lose.name}.${c.crossover.year !== null && c.crossover.cheaperAtStart !== c.crossover.cheaperAtEnd ? ` ${win.name} pulls ahead after about ${fmtYears(c.crossover.year)}.` : ''}`;

  const stats = empty
    ? undefined
    : [
        { label: `${a.name} true cost`, value: fmtMoney(a.totalCost), sub: `${fmtMoney(a.monthlyCost)}/mo`, tone: 'a' as const },
        { label: `${b.name} true cost`, value: fmtMoney(b.totalCost), sub: `${fmtMoney(b.monthlyCost)}/mo`, tone: 'b' as const },
        { label: 'Upfront', value: `${fmtMoney(a.upfront)} vs ${fmtMoney(b.upfront)}` },
        { label: 'Crossover', value: c.crossover.year === null ? 'None' : fmtYears(c.crossover.year), sub: c.crossover.year === null ? 'same winner throughout' : `${c.crossover.cheaperAtEnd === 'a' ? a.name : b.name} ahead from here`, help: 'The point where the option that is cheaper on a cost-to-date basis changes for the last time.' },
      ];

  const seg = (o: CustomOptionResult) => o.categories.filter((cat) => cat.kind !== 'recovered').map((cat) => ({ key: cat.key, label: cat.label, value: cat.amount, color: categoryColor(cat.key) }));
  const recovered = (o: CustomOptionResult) => o.savings + o.terminalValue;
  const rows: StackRow[] = [
    { key: 'a', label: a.name, tone: 'a', total: a.totalCost, segments: seg(a), recovered: recovered(a) },
    { key: 'b', label: b.name, tone: 'b', total: b.totalCost, segments: seg(b), recovered: recovered(b) },
  ];

  const stepM = months <= 120 ? 3 : 12;
  const idx: number[] = [];
  for (let t = 0; t <= months; t += stepM) idx.push(t);
  if (idx[idx.length - 1] !== months) idx.push(months);
  const curveX = idx.map((t) => t / 12);
  const curveA = idx.map((t) => c.curve[t].a);
  const curveB = idx.map((t) => c.curve[t].b);

  const catKeys = Array.from(new Set([...a.categories.map((x) => x.key), ...b.categories.map((x) => x.key)]));
  const catLabel = (k: string) => a.categories.find((x) => x.key === k)?.label ?? b.categories.find((x) => x.key === k)?.label ?? k;
  const catAmt = (o: CustomOptionResult, k: string) => o.categories.find((x) => x.key === k)?.amount ?? 0;
  // Same marginal annotation the Vehicle ledger uses: mark the line that actually decides the
  // answer. Read from category totals the engine already returned, and suppressed below $1 so a
  // rounding artefact never gets labelled a driver.
  const biggestGapKey =
    catKeys
      .map((k) => ({ key: k, diff: Math.abs(catAmt(a, k) - catAmt(b, k)) }))
      .sort((x, y) => y.diff - x.diff)
      .filter((x) => x.diff > 1)[0]?.key ?? null;

  return (
    <>
      <AnswerHero winner={empty ? 'none' : winner} headline={headline} sub={sub} sensitivity={empty ? undefined : result.sensitivity} stats={stats} warnings={result.warnings} />

      {!empty && (
        <>
          <ResultSection id="why" kicker="Why?" title="Where the money goes" sub="Hatched areas show money that comes back — savings the option produces and its value at the end.">
            <StackedBars rows={rows} ariaLabel={`Cost breakdown for ${a.name} and ${b.name}`} />
            <div className="table-scroll" style={{ marginTop: 'var(--sp-4)' }}>
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th>Over {yearsLabel(years)}</th>
                    <th className="col-a">{a.name}</th>
                    <th className="col-b">{b.name}</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {catKeys.map((k) => (
                    <tr key={k} className={k === biggestGapKey ? 'driver' : undefined}>
                      <td>
                        <span className="cat-dot" style={{ background: categoryColor(k) }} />
                        {catLabel(k)}
                        {k === biggestGapKey && <span className="row-note">largest gap</span>}
                      </td>
                      <td>{fmtMoney(catAmt(a, k))}</td>
                      <td>{fmtMoney(catAmt(b, k))}</td>
                      <td>{fmtMoney(catAmt(a, k) - catAmt(b, k))}</td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td>True cost</td>
                    <td>{fmtMoney(a.totalCost)}</td>
                    <td>{fmtMoney(b.totalCost)}</td>
                    <td>{fmtMoney(c.nominalDifference)}</td>
                  </tr>
                  <tr className="subtle">
                    <td>Per month · per year</td>
                    <td>
                      {fmtMoney(a.monthlyCost)} · {fmtMoney(a.annualCost)}
                    </td>
                    <td>
                      {fmtMoney(b.monthlyCost)} · {fmtMoney(b.annualCost)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ResultSection>

          <ResultSection id="over-time" kicker="Over time" title="Cost to date" sub="Money spent so far minus what you could sell the item for. Where the lines cross, the pricier-upfront option has paid for itself.">
            <LineChart
              x={curveX}
              series={[
                { key: 'a', label: a.name, color: OPTION_COLORS.a, values: curveA },
                { key: 'b', label: b.name, color: OPTION_COLORS.b, values: curveB },
              ]}
              xFormat={(v) => `yr ${fmtNumber(v, 0)}`}
              markers={c.crossover.year !== null && c.crossover.year > 0 ? [{ x: c.crossover.year, label: `crossover · ${fmtYears(c.crossover.year)}` }] : []}
              ariaLabel={`Cumulative cost of ${a.name} and ${b.name} over ${yearsLabel(years)}`}
              zeroLine
              tooltip={(k) => ({ title: `After ${fmtYears(curveX[k])}`, rows: [{ label: a.name, value: fmtMoney(curveA[k]), color: OPTION_COLORS.a }, { label: b.name, value: fmtMoney(curveB[k]), color: OPTION_COLORS.b }] })}
            />
            <div className="legend" style={{ marginTop: 8 }}>
              <span className="item">
                <span className="sw" style={{ background: OPTION_COLORS.a }} /> {a.name}
              </span>
              <span className="item">
                <span className="sw" style={{ background: OPTION_COLORS.b }} /> {b.name}
              </span>
            </div>
          </ResultSection>

          <SensitivitySection id="sensitivity" rows={result.sensitivity} positiveLabel={`${b.name} cheaper`} negativeLabel={`${a.name} cheaper`} inputs={inputs} onChange={onChange} quickAdjust={customQuickAdjust()} />

          <ResultSection id="break-even" kicker="Break-even" title="What would have to change to flip the answer">
            <BreakEvenList items={result.breakEvens} />
          </ResultSection>

          <InvestDifference id="invest" invest={c.invest} horizonYears={years} winnerName={c.invest.saver === 'a' ? a.name : b.name} loserName={c.invest.saver === 'a' ? b.name : a.name} returnPct={inputs.investmentReturn} onReturnChange={(v) => onChange({ ...inputs, investmentReturn: v })} />

          <ResultSection id="insights" kicker="Plain English" title="Questions people ask about this result">
            <InsightsList items={customInsights(inputs, result)} />
          </ResultSection>
        </>
      )}

      <MethodologyPanel id="method" items={customMethodology(inputs, result)} assumptions={customAssumptions(inputs)} />
    </>
  );
}
