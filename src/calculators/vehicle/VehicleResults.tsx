import type { ResultsProps } from '../types';
import type { VehicleOptionResult, VehicleResult } from '../../engine/calculators/vehicle';
import type { VehicleFormInputs } from './inputs';
import { AnswerHero } from '../../components/results/AnswerHero';
import { InvestDifference } from '../../components/results/InvestDifference';
import { BreakEvenList, InsightsList, MethodologyPanel, ResultSection } from '../../components/results/Sections';
import { SensitivitySection } from '../../components/results/SensitivitySection';
import { LineChart } from '../../components/charts/LineChart';
import { StackedBars, type StackRow } from '../../components/charts/StackedBars';
import { categoryColor, OPTION_COLORS } from '../../lib/colors';
import { fmtMoney, fmtMoneyCompact, fmtNumber, fmtPct, fmtYears, roundHeadline, yearsLabel } from '../../lib/format';
import { vehicleInsights, vehicleMethodology, vehicleQuickAdjust, vehicleAssumptions } from './definition';

export function VehicleResults({ inputs, result, onChange }: ResultsProps<VehicleFormInputs, VehicleResult>) {
  const { a, b, comparison: c } = result;
  const years = Math.max(1, Math.round(inputs.shared.ownershipYears));
  const months = years * 12;
  const winner = c.cheaper;
  const win = winner === 'b' ? b : a;
  const lose = winner === 'b' ? a : b;
  const diff = Math.abs(c.nominalDifference);
  const wealthWinner = c.wealthDifference > 0.5 ? 'b' : c.wealthDifference < -0.5 ? 'a' : 'tie';
  const wealthAbs = Math.abs(c.wealthDifference);

  const headline =
    winner === 'tie' ? (
      <>The two options cost about the same over {yearsLabel(years)}.</>
    ) : (
      <>
        <span className={`text-${winner}`}>{win.name}</span> is estimated to cost <span className="amt">{fmtMoney(roundHeadline(diff))}</span> less over {yearsLabel(years)}.
      </>
    );

  let sub: string;
  if (winner === 'tie') {
    sub = `${a.name} comes to ${fmtMoney(a.totalCost)} and ${b.name} to ${fmtMoney(b.totalCost)} once depreciation, interest, fuel, insurance, maintenance and resale are all counted.`;
  } else {
    sub = `That's about ${fmtMoney(diff / months)} a month, or ${fmtMoney(Math.abs(a.costPerMile - b.costPerMile), 2)} per mile. ${win.name} comes to ${fmtMoney(win.totalCost)} all-in versus ${fmtMoney(lose.totalCost)} for ${lose.name}.`;
    if (wealthWinner !== 'tie' && wealthWinner !== winner) {
      const ww = wealthWinner === 'a' ? a : b;
      sub += ` But timing matters: because ${ww.name} keeps more of your cash invested early, it actually leaves you about ${fmtMoney(roundHeadline(wealthAbs))} wealthier at ${fmtPct(inputs.shared.investmentReturn, 1)} returns.`;
    } else if (wealthWinner !== 'tie') {
      sub += ` Invest the difference at ${fmtPct(inputs.shared.investmentReturn, 1)} and choosing ${win.name} could leave you about ${fmtMoney(roundHeadline(wealthAbs))} better off after ${yearsLabel(years)}.`;
    }
  }

  const biggestGap = a.categories
    .map((cat) => ({ key: cat.key, label: cat.label, diff: cat.amount - (b.categories.find((x) => x.key === cat.key)?.amount ?? 0) }))
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))[0];
  // Only annotate a driver that is actually a driver: a sub-$1 gap is a rounding artefact, not the
  // reason one car wins, and labelling it "largest gap" would be precision theatre.
  const biggestGapKey = biggestGap && Math.abs(biggestGap.diff) > 1 ? biggestGap.key : null;
  const sameCash = Math.abs(a.cashAtSigning - b.cashAtSigning) < 1;
  const stats = [
    { label: `${a.name} true cost`, value: fmtMoney(a.totalCost), sub: `${fmtMoney(a.monthlyCost)}/mo · ${fmtMoney(a.costPerMile, 2)}/mi`, tone: 'a' as const },
    { label: `${b.name} true cost`, value: fmtMoney(b.totalCost), sub: `${fmtMoney(b.monthlyCost)}/mo · ${fmtMoney(b.costPerMile, 2)}/mi`, tone: 'b' as const },
    sameCash
      ? {
          label: 'Biggest gap',
          value: biggestGap ? biggestGap.label : '—',
          // "$8,798 more for the Tesla" is a number; "81% of the difference" is the insight — it
          // tells you this one category IS the answer, and that the rest is noise around it.
          sub: biggestGap ? `${fmtMoney(Math.abs(biggestGap.diff))} more for ${biggestGap.diff > 0 ? a.name : b.name}${diff > 1 ? ` · ${fmtPct((Math.abs(biggestGap.diff) / diff) * 100, 0)} of the difference` : ''}` : '',
          help: 'The single cost category with the largest difference between the two options, and how much of the overall gap it accounts for.',
        }
      : { label: 'Cash due at signing', value: `${fmtMoneyCompact(a.cashAtSigning)} vs ${fmtMoneyCompact(b.cashAtSigning)}`, sub: `${a.name} vs ${b.name}`, help: 'Down payment when financing, or the full price plus tax and fees when paying cash (minus any trade-in).' },
    { label: 'Monthly out of pocket', value: `${fmtMoney(a.monthlyOutOfPocket)} vs ${fmtMoney(b.monthlyOutOfPocket)}`, sub: 'payments + running costs, averaged', help: 'Average monthly spend while you own the car: loan payment plus fuel, insurance, maintenance, repairs, tires and registration. Excludes the upfront cash and the resale you get back.' },
    ...(wealthWinner !== 'tie' && wealthWinner !== winner
      ? [
          {
            label: `Counting timing at ${fmtPct(inputs.shared.investmentReturn, 1)}`,
            value: `${(wealthWinner === 'a' ? a : b).name} +${fmtMoney(roundHeadline(wealthAbs))}`,
            sub: 'wealth after investing the cash-flow difference',
            tone: wealthWinner as 'a' | 'b',
            help: 'When the option that is cheaper on paper also needs more cash early, the other option can come out ahead once the money it leaves in your pocket is invested. This is the wealth-based verdict.',
          },
        ]
      : []),
  ];

  const rows: StackRow[] = [a, b].map((o, i) => ({
    key: i === 0 ? 'a' : 'b',
    label: o.name,
    tone: i === 0 ? 'a' : 'b',
    total: o.totalCost,
    segments: o.categories.map((cat) => ({ key: cat.key, label: cat.label, value: cat.amount, color: categoryColor(cat.key) })),
  }));

  const curveX = c.curve.filter((p) => p.month % 6 === 0 || p.month === months).map((p) => p.year);
  const curveA = c.curve.filter((p) => p.month % 6 === 0 || p.month === months).map((p) => p.a);
  const curveB = c.curve.filter((p) => p.month % 6 === 0 || p.month === months).map((p) => p.b);
  const crossoverYear = c.crossover.year;

  const catKeys = Array.from(new Set([...a.categories.map((x) => x.key), ...b.categories.map((x) => x.key)]));
  const catLabel = (k: string) => a.categories.find((x) => x.key === k)?.label ?? b.categories.find((x) => x.key === k)?.label ?? k;
  const catAmt = (o: VehicleOptionResult, k: string) => o.categories.find((x) => x.key === k)?.amount ?? 0;

  return (
    <>
      <AnswerHero winner={winner} headline={headline} sub={sub} stats={stats} warnings={result.warnings} />

      <ResultSection id="why" kicker="Why?" title="Where the money goes" sub={`Sticker prices: ${fmtMoney(inputs.a.price)} vs ${fmtMoney(inputs.b.price)}. True ${years}-year cost after resale: ${fmtMoney(a.totalCost)} vs ${fmtMoney(b.totalCost)}.`}>
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
              <tr className="subtle">
                <td>Purchase price (sticker)</td>
                <td>{fmtMoney(inputs.a.price)}</td>
                <td>{fmtMoney(inputs.b.price)}</td>
                <td>{fmtMoney(inputs.a.price - inputs.b.price)}</td>
              </tr>
              <tr className="subtle">
                <td>Car is worth at the end</td>
                <td>{fmtMoney(a.resaleValue)}</td>
                <td>{fmtMoney(b.resaleValue)}</td>
                <td>{fmtMoney(a.resaleValue - b.resaleValue)}</td>
              </tr>
              {(a.loanBalanceAtExit > 0.5 || b.loanBalanceAtExit > 0.5) && (
                <>
                  <tr className="subtle">
                    <td>Loan still owed when you sell</td>
                    <td>{a.loanBalanceAtExit > 0.5 ? `−${fmtMoney(a.loanBalanceAtExit)}` : '—'}</td>
                    <td>{b.loanBalanceAtExit > 0.5 ? `−${fmtMoney(b.loanBalanceAtExit)}` : '—'}</td>
                    <td></td>
                  </tr>
                  <tr className="subtle">
                    <td>Cash from the sale</td>
                    <td className={a.underwaterAtExit ? 'text-negative' : ''}>{a.underwaterAtExit ? `${fmtMoney(a.netProceedsAtExit)} (you pay)` : fmtMoney(a.netProceedsAtExit)}</td>
                    <td className={b.underwaterAtExit ? 'text-negative' : ''}>{b.underwaterAtExit ? `${fmtMoney(b.netProceedsAtExit)} (you pay)` : fmtMoney(b.netProceedsAtExit)}</td>
                    <td>{fmtMoney(a.netProceedsAtExit - b.netProceedsAtExit)}</td>
                  </tr>
                </>
              )}
              {catKeys.map((k) => (
                <tr key={k} className={k === biggestGapKey ? 'driver' : undefined}>
                  <td>
                    <span className="cat-dot" style={{ background: categoryColor(k) }} />
                    {catLabel(k)}
                    {/* A marginal annotation on the line that actually decides the answer. The
                        category and its amount are already computed above — nothing is invented
                        here, and no percentage is asserted that the engine did not produce. */}
                    {k === biggestGapKey && <span className="row-note">largest gap</span>}
                  </td>
                  <td>{fmtMoney(catAmt(a, k))}</td>
                  <td>{fmtMoney(catAmt(b, k))}</td>
                  <td className={catAmt(a, k) - catAmt(b, k) > 0.5 ? 'text-b' : catAmt(a, k) - catAmt(b, k) < -0.5 ? 'text-a' : ''}>{fmtMoney(catAmt(a, k) - catAmt(b, k))}</td>
                </tr>
              ))}
              <tr className="total">
                <td>True cost of ownership</td>
                <td>{fmtMoney(a.totalCost)}</td>
                <td>{fmtMoney(b.totalCost)}</td>
                <td>{fmtMoney(c.nominalDifference)}</td>
              </tr>
              <tr className="subtle">
                <td>Per month · per mile</td>
                <td>
                  {fmtMoney(a.monthlyCost)} · {fmtMoney(a.costPerMile, 2)}
                </td>
                <td>
                  {fmtMoney(b.monthlyCost)} · {fmtMoney(b.costPerMile, 2)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="micro muted" style={{ marginTop: 'var(--sp-3)' }}>
          Difference column: positive means {a.name} costs more in that category. Depreciation = price minus resale value. Loan principal is not a cost — it buys the car — so only interest appears.
          {(a.underwaterAtExit || b.underwaterAtExit) && (
            <>
              {' '}
              <strong className="text-negative">Negative equity:</strong> {[a, b].filter((o) => o.underwaterAtExit).map((o) => o.name).join(' and ')} would still owe more than the car is worth at that point, so selling means bringing your own cash to close out the loan.
            </>
          )}
        </p>
      </ResultSection>

      <ResultSection id="over-time" kicker="Over time" title="Cost to date if you sold at any point" sub="Money spent so far, minus what the car would fetch (after paying off any loan). This is what each choice has really cost you at each moment.">
        <LineChart
          x={curveX}
          series={[
            { key: 'a', label: a.name, color: OPTION_COLORS.a, values: curveA },
            { key: 'b', label: b.name, color: OPTION_COLORS.b, values: curveB },
          ]}
          xFormat={(v) => `yr ${fmtNumber(v, 0)}`}
          markers={crossoverYear !== null && crossoverYear > 0 ? [{ x: crossoverYear, label: `crossover · ${fmtYears(crossoverYear)}` }] : []}
          ariaLabel={`Cumulative cost of ${a.name} and ${b.name} over ${yearsLabel(years)}`}
          tooltip={(i) => ({ title: `After ${fmtYears(curveX[i])}`, rows: [{ label: a.name, value: fmtMoney(curveA[i]), color: OPTION_COLORS.a }, { label: b.name, value: fmtMoney(curveB[i]), color: OPTION_COLORS.b }] })}
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

      <SensitivitySection id="sensitivity" rows={result.sensitivity} positiveLabel={`${b.name} cheaper`} negativeLabel={`${a.name} cheaper`} inputs={inputs} onChange={onChange} quickAdjust={vehicleQuickAdjust(inputs)} />

      <ResultSection id="break-even" kicker="Break-even" title="What would have to change to flip the answer">
        <BreakEvenList items={result.breakEvens} />
      </ResultSection>

      <InvestDifference id="invest" invest={c.invest} horizonYears={years} winnerName={c.invest.saver === 'a' ? a.name : b.name} loserName={c.invest.saver === 'a' ? b.name : a.name} returnPct={inputs.shared.investmentReturn} onReturnChange={(v) => onChange({ ...inputs, shared: { ...inputs.shared, investmentReturn: v } })} differenceLabel={`We compare what leaves your pocket each month with each car (including the upfront cash) and what you get back when you sell`} />

      <ResultSection id="insights" kicker="Plain English" title="Questions people ask about this result">
        <InsightsList items={vehicleInsights(inputs, result)} />
      </ResultSection>

      <MethodologyPanel id="method" items={vehicleMethodology(inputs, result)} assumptions={vehicleAssumptions(inputs)} />
    </>
  );
}
