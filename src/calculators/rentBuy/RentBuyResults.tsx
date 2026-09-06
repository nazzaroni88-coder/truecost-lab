import type { ResultsProps } from '../types';
import type { RentBuyInputs, RentBuyResult } from '../../engine/calculators/rentBuy';
import { AnswerHero } from '../../components/results/AnswerHero';
import { BreakEvenList, InsightsList, MethodologyPanel, ResultSection } from '../../components/results/Sections';
import { Slider } from '../../components/ui/Controls';
import { SensitivitySection } from '../../components/results/SensitivitySection';
import { LineChart } from '../../components/charts/LineChart';
import { StackedBars, type StackRow } from '../../components/charts/StackedBars';
import { categoryColor, OPTION_COLORS } from '../../lib/colors';
import { fmtMoney, fmtMoneyCompact, fmtNumber, fmtPct, roundHeadline, yearsLabel } from '../../lib/format';
import { rentBuyAssumptions, rentBuyInsights, rentBuyMethodology, rentBuyQuickAdjust, rentBuyWinner } from './definition';

export function RentBuyResults({ inputs: i, result: r, onChange }: ResultsProps<RentBuyInputs, RentBuyResult>) {
  const years = Math.round(i.horizonYears);
  const w = rentBuyWinner(r);
  const d = Math.abs(r.comparison.wealthDifference);
  const winnerTone: 'a' | 'b' | 'tie' = w === 'buy' ? 'b' : w === 'rent' ? 'a' : 'tie';

  const headline =
    w === 'tie' ? (
      <>Renting and buying come out about even after {yearsLabel(years)}.</>
    ) : w === 'buy' ? (
      <>
        <span className="text-b">Buying</span> leaves you about <span className="amt">{fmtMoney(roundHeadline(d))}</span> wealthier after {yearsLabel(years)}.
      </>
    ) : (
      <>
        <span className="text-a">Renting</span> and investing the difference leaves you about <span className="amt">{fmtMoney(roundHeadline(d))}</span> ahead after {yearsLabel(years)}.
      </>
    );
  const sub = `Owning costs about ${fmtMoney(r.buy.monthlyOwnerCostYear1)} a month in year one versus ${fmtMoney(r.rent.firstYearMonthly)} to rent — but part of the owner's payment builds equity, and the renter can invest what they don't spend. After ${yearsLabel(years)}: home equity of ${fmtMoney(r.buy.netEquityAtEnd)} (net of selling costs) versus a renter's portfolio of ${fmtMoney(r.rent.investedPortfolio)}.${r.breakEvenYear !== null && r.breakEvenYear > 1 && r.breakEvenYear <= years ? ` Buying pulls ahead around year ${r.breakEvenYear}.` : ''}`;

  const stats = [
    { label: 'Year-1 monthly cost', value: `${fmtMoney(r.rent.firstYearMonthly)} vs ${fmtMoney(r.buy.monthlyOwnerCostYear1)}`, sub: 'rent vs own', help: 'Cash out the door each month in the first year. Owner cost includes mortgage, property tax, insurance, maintenance, HOA and PMI.' },
    { label: `Home equity after ${years} yr`, value: fmtMoney(r.buy.netEquityAtEnd), sub: `after ${fmtPct(i.sellingCostsPct, 0)} selling costs`, tone: 'b' as const },
    { label: `Renter's investments`, value: fmtMoney(r.rent.investedPortfolio), sub: `at ${fmtPct(i.investmentReturn, 1)}/yr`, tone: 'a' as const },
    { label: 'Break-even', value: r.breakEvenYear === null ? 'Never (40 yrs)' : r.breakEvenYear <= 1 ? 'Year 1' : `~${r.breakEvenYear} years`, sub: r.breakEvenYear === null ? 'renting stays ahead' : 'stay at least this long', help: 'The first year from which buying leaves you wealthier than renting and investing, and stays that way.' },
  ];

  const buyerSegments = r.buy.categories.filter((c) => c.kind !== 'recovered').map((c) => ({ key: c.key, label: c.label, value: c.amount, color: categoryColor(c.key) }));
  const rows: StackRow[] = [
    { key: 'rent', label: 'Renting: money gone', tone: 'a', total: r.rent.nominalCost, segments: r.rent.categories.map((c) => ({ key: c.key, label: c.label, value: c.amount, color: categoryColor(c.key) })) },
    { key: 'buy', label: 'Buying: unrecoverable costs', tone: 'b', total: r.buy.unrecoverableCosts, segments: buyerSegments },
  ];

  // Monthly cash flow in the first month of each year.
  const cashX: number[] = [];
  const cashOwn: number[] = [];
  const cashRent: number[] = [];
  for (let y = 1; y <= years; y++) {
    const t = (y - 1) * 12 + 1;
    cashX.push(y);
    cashOwn.push(r.buy.series.outflows[t] ?? 0);
    cashRent.push(r.rent.series.outflows[t] ?? 0);
  }
  let crossYear: number | null = null;
  for (let k = 1; k < cashX.length; k++) {
    if (cashRent[k - 1] < cashOwn[k - 1] && cashRent[k] >= cashOwn[k]) {
      crossYear = cashX[k];
      break;
    }
  }

  const wealthX = r.wealthByYear.filter((p) => p.year <= Math.max(years, Math.min(40, Math.max(15, years + 5)))).map((p) => p.year);
  const wealthBuy = r.wealthByYear.slice(0, wealthX.length).map((p) => p.buy);
  const wealthRent = r.wealthByYear.slice(0, wealthX.length).map((p) => p.rent);

  return (
    <>
      <AnswerHero winner={winnerTone} headline={headline} sub={sub} stats={stats} warnings={r.warnings} />

      <ResultSection id="why" kicker="Why?" title="Cash flow is not the same as wealth" sub="Rent is gone for good. Part of an owner's payment is gone too (interest, taxes, insurance, upkeep, transaction costs) — but part comes back as equity, plus any appreciation.">
        <StackedBars rows={rows} ariaLabel="Unrecoverable costs of renting versus buying" />
        <div className="table-scroll" style={{ marginTop: 'var(--sp-4)' }}>
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Over {yearsLabel(years)}</th>
                <th className="col-a">Renting</th>
                <th className="col-b">Buying</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rent paid</td>
                <td>{fmtMoney(r.rent.totalRent)}</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Renter's insurance</td>
                <td>{fmtMoney(r.rent.totalInsurance)}</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Mortgage interest</td>
                <td>—</td>
                <td>{fmtMoney(r.buy.totalInterest)}</td>
              </tr>
              <tr>
                <td>Property tax</td>
                <td>—</td>
                <td>{fmtMoney(r.buy.totalPropertyTax)}</td>
              </tr>
              <tr>
                <td>Home insurance{r.buy.totalHoa > 0 ? ' + HOA' : ''}</td>
                <td>—</td>
                <td>{fmtMoney(r.buy.totalInsurance + r.buy.totalHoa)}</td>
              </tr>
              <tr>
                <td>Maintenance</td>
                <td>—</td>
                <td>{fmtMoney(r.buy.totalMaintenance)}</td>
              </tr>
              {r.buy.totalPmi > 0 && (
                <tr>
                  <td>PMI</td>
                  <td>—</td>
                  <td>{fmtMoney(r.buy.totalPmi)}</td>
                </tr>
              )}
              <tr>
                <td>Closing + selling costs</td>
                <td>—</td>
                <td>{fmtMoney(r.buy.closingCosts + r.buy.sellingCosts)}</td>
              </tr>
              <tr className="total">
                <td>Money that is gone</td>
                <td>{fmtMoney(r.rent.nominalCost)}</td>
                <td>{fmtMoney(r.buy.unrecoverableCosts)}</td>
              </tr>
              <tr className="subtle">
                <td>Principal repaid (becomes equity)</td>
                <td>—</td>
                <td>{fmtMoney(r.buy.totalPrincipal)}</td>
              </tr>
              <tr className="subtle">
                <td>Down payment (becomes equity)</td>
                <td>—</td>
                <td>{fmtMoney(r.buy.downPayment)}</td>
              </tr>
              <tr className="subtle">
                <td>Appreciation gained</td>
                <td>—</td>
                <td>{fmtMoney(r.buy.appreciationGain)}</td>
              </tr>
              <tr className="total">
                <td>What you end up with</td>
                <td>
                  {fmtMoney(r.rent.investedPortfolio)} <span className="micro muted">invested</span>
                </td>
                <td>
                  {fmtMoney(r.buy.netEquityAtEnd)} <span className="micro muted">equity</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="micro muted" style={{ marginTop: 'var(--sp-3)' }}>
          The renter's portfolio is built from the down payment and closing costs ({fmtMoney(r.buy.downPayment + r.buy.closingCosts)}) plus every month the owner spends more than the renter, invested at {fmtPct(i.investmentReturn, 1)}. In months where renting costs more, the renter draws down the same account.
        </p>
      </ResultSection>

      <ResultSection id="cash-flow" kicker="Month to month" title="What leaves your pocket each month" sub={`Rent rises ${fmtPct(i.rentGrowth, 1)} a year while the mortgage payment stays fixed; taxes, insurance and upkeep drift up with value and inflation.${i.mortgageTermYears <= years ? ' The owner’s payment drops off once the mortgage is paid.' : ''}`}>
        <LineChart
          x={cashX}
          series={[
            { key: 'own', label: 'Owning', color: OPTION_COLORS.b, values: cashOwn },
            { key: 'rent', label: 'Renting', color: OPTION_COLORS.a, values: cashRent },
          ]}
          height={200}
          xFormat={(v) => `yr ${fmtNumber(v, 0)}`}
          yFormat={(v) => fmtMoneyCompact(v)}
          markers={crossYear !== null ? [{ x: crossYear, label: `rent passes owning · yr ${crossYear}` }] : []}
          ariaLabel={`Monthly cost of renting versus owning over ${yearsLabel(years)}`}
          tooltip={(k) => ({ title: `Year ${cashX[k]}`, rows: [{ label: 'Owning', value: `${fmtMoney(cashOwn[k])}/mo`, color: OPTION_COLORS.b }, { label: 'Renting', value: `${fmtMoney(cashRent[k])}/mo`, color: OPTION_COLORS.a }] })}
        />
        <div className="legend" style={{ marginTop: 8 }}>
          <span className="item">
            <span className="sw" style={{ background: OPTION_COLORS.b }} /> Owning (all costs)
          </span>
          <span className="item">
            <span className="sw" style={{ background: OPTION_COLORS.a }} /> Renting
          </span>
        </div>
      </ResultSection>

      <ResultSection id="over-time" kicker="Over time" title="Net worth from each path, year by year" sub="Owner: home value minus selling costs and remaining mortgage. Renter: the invested difference. Where the lines cross is the break-even.">
        <LineChart
          x={wealthX}
          series={[
            { key: 'buy', label: 'Buying (net equity)', color: OPTION_COLORS.b, values: wealthBuy },
            { key: 'rent', label: 'Renting (investments)', color: OPTION_COLORS.a, values: wealthRent },
          ]}
          xFormat={(v) => `yr ${fmtNumber(v, 0)}`}
          markers={[...(r.breakEvenYear !== null && r.breakEvenYear <= wealthX[wealthX.length - 1] ? [{ x: r.breakEvenYear, label: `break-even · yr ${r.breakEvenYear}` }] : []), ...(years <= wealthX[wealthX.length - 1] ? [{ x: years, label: `your horizon` }] : [])]}
          ariaLabel={`Net worth from buying versus renting over ${wealthX[wealthX.length - 1]} years`}
          zeroLine
          tooltip={(idx) => ({ title: `Year ${wealthX[idx]}`, rows: [{ label: 'Buying', value: fmtMoney(wealthBuy[idx]), color: OPTION_COLORS.b }, { label: 'Renting', value: fmtMoney(wealthRent[idx]), color: OPTION_COLORS.a }, { label: 'Buying advantage', value: fmtMoney(wealthBuy[idx] - wealthRent[idx]) }] })}
        />
        <div className="legend" style={{ marginTop: 8 }}>
          <span className="item">
            <span className="sw" style={{ background: OPTION_COLORS.b }} /> Buying
          </span>
          <span className="item">
            <span className="sw" style={{ background: OPTION_COLORS.a }} /> Renting
          </span>
        </div>
      </ResultSection>

      <SensitivitySection id="sensitivity" rows={r.sensitivity} positiveLabel="Buying wins" negativeLabel="Renting wins" inputs={i} onChange={onChange} quickAdjust={rentBuyQuickAdjust()} intro="We re-ran the model with each assumption nudged to a plausible low and high value. The bar shows how far the buying advantage moves. A bar crossing the dashed line means that assumption alone could flip the answer." />

      <ResultSection id="break-even" kicker="Break-even" title="What would have to change to flip the answer">
        <BreakEvenList items={r.breakEvens} />
      </ResultSection>

      <ResultSection id="invest" kicker="If you invested the difference" title="The wealth gap if you stayed 5, 10, 20 or 30 years" sub={`The renter invests every dollar the buyer spends that they don't, at ${fmtPct(i.investmentReturn, 1)}. The buyer builds equity. Here is where each path stands if you sold (or stopped renting) at each milestone.`}>
        <div className="milestones" style={{ marginBottom: 'var(--sp-4)' }}>
          {[5, 10, 20, 30].map((y) => {
            const row = r.wealthByYear.find((p) => p.year === y);
            if (!row) return null;
            const ahead = row.diff > 500 ? 'buy' : row.diff < -500 ? 'rent' : 'tie';
            return (
              <div key={y} className={`milestone ${y === years ? 'hi' : ''}`}>
                <div className="yrs">
                  {y} years{y === years ? ' · your plan' : ''}
                </div>
                <div className={`val ${ahead === 'buy' ? 'text-b' : ahead === 'rent' ? 'text-a' : ''}`}>{ahead === 'tie' ? 'Even' : `${ahead === 'buy' ? 'Buy' : 'Rent'} +${fmtMoneyCompact(Math.abs(row.diff))}`}</div>
                <div className="split">
                  Buying: {fmtMoneyCompact(row.buy)} equity
                  <br />
                  Renting: {fmtMoneyCompact(row.rent)} invested
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ maxWidth: 420 }}>
          <Slider label="Expected investment return" value={i.investmentReturn} min={0} max={12} step={0.5} onChange={(v) => onChange({ ...i, investmentReturn: v })} format={(v) => fmtPct(v, 1)} help="What the renter earns on the money not spent on buying. Long-run diversified stock returns have averaged roughly 7–10% before inflation, but returns vary widely and are never guaranteed." />
        </div>
        <p className="micro muted" style={{ marginTop: 'var(--sp-3)' }}>
          Each milestone assumes you sell at that point and pay {fmtPct(i.sellingCostsPct, 0)} selling costs. Projected returns and appreciation are illustrative, not guaranteed.
        </p>
      </ResultSection>

      <ResultSection id="insights" kicker="Plain English" title="Questions people ask about this result">
        <InsightsList items={rentBuyInsights(i, r)} />
      </ResultSection>

      <MethodologyPanel id="method" items={rentBuyMethodology(i, r)} assumptions={rentBuyAssumptions(i)} />
    </>
  );
}
