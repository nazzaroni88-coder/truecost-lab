import type { Insight, MethodologyItem, QuickAdjust, ShareSummary } from '../types';
import type { VehicleInputs, VehicleResult } from '../../engine/calculators/vehicle';
import { fmtMoney, fmtNumber, fmtPct, fmtYears, roundHeadline, yearsLabel } from '../../lib/format';
import { markUserEdited, stateNameOf, VEHICLE_FIELD_IDS as ID, type VehicleFormInputs } from './inputs';
import { STATE_DATA_REVIEWED, STATE_SOURCES } from '../../data/stateDefaults';

export function vehicleSummary(inputs: VehicleInputs, r: VehicleResult): ShareSummary {
  const { a, b, comparison: c } = r;
  const years = Math.max(1, Math.round(inputs.shared.ownershipYears));
  const win = c.cheaper === 'b' ? b : a;
  const diff = Math.abs(c.nominalDifference);
  const headline = c.cheaper === 'tie' ? `${a.name} and ${b.name} cost about the same over ${yearsLabel(years)}.` : `${win.name} costs about ${fmtMoney(roundHeadline(diff))} less over ${yearsLabel(years)}.`;
  const sub = `True cost including depreciation, interest, fuel, insurance, maintenance and resale: ${a.name} ${fmtMoney(a.totalCost)} vs ${b.name} ${fmtMoney(b.totalCost)}.`;
  return {
    headline,
    sub,
    winner: c.cheaper,
    optionA: a.name,
    optionB: b.name,
    keyMetric: c.nominalDifference,
    keyMetricLabel: `Difference (${a.name} − ${b.name})`,
    rows: [
      { label: `${a.name} true cost`, value: fmtMoney(a.totalCost), tone: 'a' },
      { label: `${b.name} true cost`, value: fmtMoney(b.totalCost), tone: 'b' },
      { label: 'Cost per mile', value: `${fmtMoney(a.costPerMile, 2)} vs ${fmtMoney(b.costPerMile, 2)}` },
      { label: 'Depreciation', value: `${fmtMoney(a.depreciation)} vs ${fmtMoney(b.depreciation)}` },
      { label: `Invest the difference, ${years} yr @ ${fmtPct(inputs.shared.investmentReturn, 1)}`, value: c.invest.saver === 'tie' ? '—' : fmtMoney(c.invest.balanceAtHorizon), tone: 'positive' },
    ],
  };
}

export function vehicleQuickAdjust(inputs: VehicleFormInputs): QuickAdjust<VehicleFormInputs>[] {
  const anyGas = inputs.a.fuelType === 'gas' || inputs.b.fuelType === 'gas';
  const anyEv = inputs.a.fuelType === 'electric' || inputs.b.fuelType === 'electric';
  // Dragging a quick-adjust slider is the user setting that number, so it counts as their input and
  // a later change of state must not overwrite it. Same rule as typing in the field itself.
  const setShared = (i: VehicleFormInputs, patch: Partial<VehicleFormInputs['shared']>): VehicleFormInputs =>
    markUserEdited({ ...i, shared: { ...i.shared, ...patch } }, Object.keys(patch).map((k) => `shared.${k}`));
  const q: QuickAdjust<VehicleFormInputs>[] = [
    { key: 'ownershipYears', label: 'Years you own it', get: (i) => i.shared.ownershipYears, set: (i, v) => setShared(i, { ownershipYears: Math.round(v) }), min: 1, max: 15, step: 1, format: (v) => `${fmtNumber(v, 0)} yr` },
    { key: 'annualMiles', label: 'Miles per year', get: (i) => i.shared.annualMiles, set: (i, v) => setShared(i, { annualMiles: v }), min: 2000, max: 40000, step: 500, format: (v) => `${fmtNumber(v, 0)} mi` },
  ];
  if (anyGas) q.push({ key: 'gasPrice', label: 'Gas price', get: (i) => i.shared.gasPrice, set: (i, v) => setShared(i, { gasPrice: v }), min: 1.5, max: 8, step: 0.05, format: (v) => `${fmtMoney(v, 2)}/gal` });
  if (anyEv) q.push({ key: 'electricityRate', label: 'Electricity rate', get: (i) => i.shared.electricityRate, set: (i, v) => setShared(i, { electricityRate: v }), min: 0.05, max: 0.6, step: 0.01, format: (v) => `${fmtMoney(v, 2)}/kWh` });
  return q.slice(0, 4);
}

export function vehicleAssumptions(i: VehicleInputs): { label: string; value: string; fieldId?: string }[] {
  const s = i.shared;
  const anyGas = i.a.fuelType === 'gas' || i.b.fuelType === 'gas';
  const anyEv = i.a.fuelType === 'electric' || i.b.fuelType === 'electric';
  // The first four carry a fieldId, so the chips above the answer double as a way into the inputs
  // that produced it. They are also the four the answer is most sensitive to.
  return [
    { label: 'Ownership period', value: yearsLabel(s.ownershipYears), fieldId: ID.years },
    { label: 'Miles per year', value: `${fmtNumber(s.annualMiles, 0)} mi/yr`, fieldId: ID.miles },
    ...(anyGas ? [{ label: 'Gas price', value: `${fmtMoney(s.gasPrice, 2)}/gal`, fieldId: ID.gasPrice }] : []),
    ...(anyEv ? [{ label: 'Electricity rate', value: `${fmtMoney(s.electricityRate, 2)}/kWh`, fieldId: ID.electricity }] : []),
    { label: 'Investment return (for invest-the-difference)', value: `${fmtPct(s.investmentReturn, 1)} return`, fieldId: ID.investmentReturn },
    { label: 'Fuel & electricity price growth', value: `${fmtPct(s.fuelPriceGrowth, 1)}/yr` },
    { label: 'Cost inflation (insurance, maintenance, etc.)', value: `${fmtPct(s.costInflation, 1)}/yr` },
    { label: `${i.a.name}: depreciation`, value: `${fmtPct(i.a.firstYearDepreciation, 0)} first year, then ${fmtPct(i.a.annualDepreciation, 0)}/yr${i.a.resaleOverride !== null ? ` (resale set to ${fmtMoney(i.a.resaleOverride)})` : ''}` },
    { label: `${i.b.name}: depreciation`, value: `${fmtPct(i.b.firstYearDepreciation, 0)} first year, then ${fmtPct(i.b.annualDepreciation, 0)}/yr${i.b.resaleOverride !== null ? ` (resale set to ${fmtMoney(i.b.resaleOverride)})` : ''}` },
  ];
}

/**
 * Names the source of every number a state suggestion supplied, so "show me the math" also answers
 * "and where did that 8.2% come from?". Only rendered once a state has actually been chosen.
 */
function stateMethodology(i: VehicleInputs): MethodologyItem[] {
  const code = (i as Partial<VehicleFormInputs>).stateCode;
  const provenance = (i as Partial<VehicleFormInputs>).provenance ?? {};
  if (!code) return [];
  const suggested = Object.entries(provenance)
    .filter(([, v]) => v === 'suggested')
    .map(([k]) => k);
  if (suggested.length === 0) return [];
  return [
    {
      title: `Where the ${stateNameOf(code)} numbers come from`,
      body:
        `Static statewide averages held in the app and last reviewed in ${STATE_DATA_REVIEWED}. They are starting points, not quotes: no live data is fetched, ` +
        `your location is never detected, and anything you edit yourself is kept. ${suggested.length} field${suggested.length === 1 ? '' : 's'} on this scenario ` +
        `still hold${suggested.length === 1 ? 's' : ''} a suggested value.`,
      formula: [
        ...STATE_SOURCES.map((s) => `${s.label.padEnd(12)} ${s.detail}\n${' '.repeat(13)}${s.url}`),
        '',
        'Caveats we do not model:',
        '  - Some states tax a vehicle under a separate excise, highway-use or title tax',
        '    at a rate different from the general sales tax shown here.',
        '  - Local rates are population-weighted averages; your address may differ.',
        '  - Only the EV surcharge half of registration is sourced. The base is a placeholder,',
        '    because states charge by flat fee, weight or vehicle value and counties add more.',
        '  - Insurance is never suggested: it varies more by driver than by state.',
      ].join('\n'),
    },
  ];
}

export function vehicleMethodology(i: VehicleInputs, r: VehicleResult): MethodologyItem[] {
  const { a, b } = r;
  const years = Math.max(1, Math.round(i.shared.ownershipYears));
  const opt = (name: string, o: typeof a, inp: typeof i.a) => {
    const taxable = Math.max(0, inp.price - inp.tradeInValue);
    return [
      `${name}`,
      `  sales tax     = max(0, price − trade-in) × rate = ${fmtMoney(taxable)} × ${fmtPct(inp.salesTaxRate, 2)} = ${fmtMoney(o.salesTax)}`,
      inp.paymentMethod === 'finance'
        ? `  loan          = price + tax + fees − down − trade-in = ${fmtMoney(o.loanAmount)}\n  payment       = L·r / (1 − (1+r)^−n), r = ${fmtPct(inp.apr, 2)}/12, n = ${inp.termMonths} → ${fmtMoney(o.monthlyPayment, 2)}/mo\n  interest paid = ${fmtMoney(o.totalInterest)} over ${Math.min(inp.termMonths, years * 12)} months`
        : `  cash at signing = price + tax + fees − trade-in = ${fmtMoney(o.cashAtSigning)}`,
      `  resale        = price × (1 − ${fmtPct(inp.firstYearDepreciation, 0)}) × (1 − ${fmtPct(inp.annualDepreciation, 0)})^${years - 1} = ${fmtMoney(o.resaleValue)}${inp.resaleOverride !== null ? ' (overridden)' : ''}`,
      `  depreciation  = price − resale = ${fmtMoney(o.depreciation)}`,
      inp.fuelType === 'gas' ? `  fuel          = Σ (miles/12 ÷ ${inp.mpg} mpg) × gas price(year) = ${fmtMoney(o.fuel)}` : `  electricity   = Σ (miles/12 ÷ ${inp.milesPerKwh} mi/kWh) × rate(year) = ${fmtMoney(o.fuel)}`,
      `  running costs = insurance ${fmtMoney(o.insurance)} + registration ${fmtMoney(o.registration)} + maintenance ${fmtMoney(o.maintenance)} + tires ${fmtMoney(o.tires)} + repairs ${fmtMoney(o.repairs)}`,
      `  TRUE COST     = price + tax + fees + interest + fuel + running − resale = ${fmtMoney(o.totalCost)}`,
      `  per mile      = ${fmtMoney(o.totalCost)} ÷ ${fmtNumber(o.totalMiles, 0)} mi = ${fmtMoney(o.costPerMile, 3)}`,
    ].join('\n');
  };
  return [
    {
      title: 'The core identity',
      body: 'Everything you pay, minus what you get back. Loan principal is not a cost (it buys the car), which is why only interest appears while depreciation captures the value the car loses.',
      formula: 'True cost = purchase price + sales tax + fees + loan interest\n          + fuel/electricity + insurance + registration + maintenance + tires + repairs\n          − resale value',
    },
    { title: `${a.name}: your numbers`, body: 'The formulas with your inputs substituted.', formula: opt(a.name, a, i.a) },
    { title: `${b.name}: your numbers`, body: 'The formulas with your inputs substituted.', formula: opt(b.name, b, i.b) },
    ...stateMethodology(i),
    {
      title: 'Depreciation curve',
      body: 'Vehicle value drops by the first-year percentage in year one, then by the annual percentage each year after. Between year-ends we interpolate geometrically. If you set a resale value, we keep the first-year drop and solve for the annual rate that lands on your number.',
      formula: 'value(t years) = price × (1 − d₁) × (1 − d)^(t − 1)   for t ≥ 1',
    },
    {
      title: 'Cost to date (the crossover chart)',
      body: 'At any month, cost-to-date is everything spent so far minus what you would receive if you sold the car and paid off the remaining loan. Where the two curves cross is the break-even ownership length.',
      formula: 'cost_to_date(t) = Σ outflows(0..t) − (value(t) − loan balance(t))',
    },
    {
      title: 'Invest the difference',
      body: `Each month we take the difference in cash leaving your pocket between the two options (including the upfront amount) and invest it at ${fmtPct(i.shared.investmentReturn, 1)} a year (effective annual rate, compounded monthly). At the end we add the difference in resale proceeds. Beyond your ownership period the balance keeps compounding with no new contributions.`,
      formula: 'balance(t) = balance(t−1) × (1 + m) + (outflowA(t) − outflowB(t)),  m = (1 + r)^(1/12) − 1',
    },
    {
      title: 'Inflation',
      body: `Insurance, registration, maintenance, repairs and tires grow ${fmtPct(i.shared.costInflation, 1)} a year; gas and electricity grow ${fmtPct(i.shared.fuelPriceGrowth, 1)} a year. Loan payments are fixed. Totals are in nominal (future) dollars, which is what you actually pay.`,
    },
    {
      title: 'Sensitivity and break-even',
      body: 'For each key assumption we re-run the whole model at a plausible low and high value and rank by how much the difference moves. Break-even values are found by searching for the point where the two total costs are equal (bisection), within realistic bounds.',
    },
  ];
}

export function vehicleInsights(i: VehicleInputs, r: VehicleResult): Insight[] {
  const { a, b, comparison: c } = r;
  const years = Math.max(1, Math.round(i.shared.ownershipYears));
  const win = c.cheaper === 'b' ? b : a;
  const lose = c.cheaper === 'b' ? a : b;
  const winInp = c.cheaper === 'b' ? i.b : i.a;
  const loseInp = c.cheaper === 'b' ? i.a : i.b;
  const top = r.sensitivity[0];
  const catDiffs = a.categories.map((cat) => ({ key: cat.key, label: cat.label, a: cat.amount, b: b.categories.find((x) => x.key === cat.key)?.amount ?? 0 })).map((x) => ({ ...x, diff: x.a - x.b }));
  const sorted = [...catDiffs].sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  const biggest = sorted[0];
  const favoringLoser = sorted.filter((x) => (c.cheaper === 'b' ? x.diff < -100 : x.diff > 100));
  const favoringWinner = sorted.filter((x) => (c.cheaper === 'b' ? x.diff > 100 : x.diff < -100));

  const explain: Insight = {
    question: 'Explain this result simply',
    answer:
      c.cheaper === 'tie' ? (
        <p>Once you add up everything — the value each car loses, interest, fuel or charging, insurance, maintenance and repairs — and subtract what you get back when you sell, the two cars cost about the same over {yearsLabel(years)}. Pick the one you would rather drive.</p>
      ) : (
        <>
          <p>
            The sticker prices are {fmtMoney(i.a.price)} and {fmtMoney(i.b.price)}, but you never pay the sticker price — you pay the difference between what you put in and what you get back, plus everything it costs to run the car along the way.
          </p>
          <p>
            Over {yearsLabel(years)}, {win.name} costs {fmtMoney(win.totalCost)} all-in and {lose.name} costs {fmtMoney(lose.totalCost)}. The biggest single gap is <strong>{biggest?.label.toLowerCase()}</strong> ({fmtMoney(Math.abs(biggest?.diff ?? 0))} apart).
            {favoringWinner.length > 0 && ` ${win.name} wins on ${favoringWinner.map((x) => x.label.toLowerCase()).join(', ')}.`}
            {favoringLoser.length > 0 && ` ${lose.name} is cheaper on ${favoringLoser.map((x) => x.label.toLowerCase()).join(', ')}, but not by enough to close the gap.`}
          </p>
        </>
      ),
  };

  const matters: Insight = {
    question: 'What assumption matters most?',
    answer: top ? (
      <>
        <p>
          <strong>{top.label}</strong>. Moving it between {top.format(top.low)} and {top.format(top.high)} swings the {years}-year difference by about {fmtMoney(top.swing)}.{top.flips ? ' That range is wide enough to flip which car is cheaper, so it deserves a careful, honest estimate.' : ' Even across that range the cheaper car stays the same.'}
        </p>
        {r.sensitivity[1] && (
          <p>
            Next: {r.sensitivity[1].label.toLowerCase()} ({fmtMoney(r.sensitivity[1].swing)} swing){r.sensitivity[2] ? ` and ${r.sensitivity[2].label.toLowerCase()} (${fmtMoney(r.sensitivity[2].swing)})` : ''}.
          </p>
        )}
      </>
    ) : (
      <p>Add more detail to the inputs to see which assumptions drive the result.</p>
    ),
  };

  const overlooking: Insight = {
    question: 'What could I be overlooking?',
    answer: (
      <ul>
        <li>
          <strong>Depreciation is a guess.</strong> It is the largest cost for most new cars, and nobody knows future used-car prices. Check what 3–5-year-old examples of each model sell for today and adjust the rates.
        </li>
        {(i.a.fuelType === 'electric' || i.b.fuelType === 'electric') && (
          <li>
            <strong>Charging reality.</strong> The electricity rate assumes mostly home charging. Frequent public fast charging can cost 2–3× more per kWh. A home charger install ($500–$2,000) is not included — add it to fees if you need one. Federal or state EV incentives are not included either; subtract any you qualify for from the price.
          </li>
        )}
        {(i.a.paymentMethod === 'finance' || i.b.paymentMethod === 'finance') && (
          <li>
            <strong>Loan terms.</strong> A longer term lowers the payment but raises total interest and keeps you underwater longer. Gap insurance, if required, is not modeled.
          </li>
        )}
        <li>
          <strong>Insurance quotes vary a lot</strong> by driver, location and vehicle. Get real quotes for both cars before deciding.
        </li>
        <li>
          <strong>Repairs are lumpy.</strong> A single out-of-warranty repair can be thousands. Warranties, extended coverage and reliability history are worth weighing for {loseInp.repairsAnnual >= winInp.repairsAnnual ? lose.name : win.name}.
        </li>
        <li>
          <strong>Non-financial factors</strong> — safety, comfort, range, time spent charging or fueling, how much you enjoy driving it — are real and not in these numbers.
        </li>
      </ul>
    ),
  };

  const howFlip: Insight = {
    question: `How could ${lose.name} become the cheaper choice?`,
    answer:
      c.cheaper === 'tie' ? (
        <p>They are already neck and neck. Any modest change — a better negotiated price, a cheaper insurance quote, or holding the car a couple of years longer — would tip it.</p>
      ) : (
        <>
          <p>
            It needs to close a {fmtMoney(Math.abs(c.nominalDifference))} gap. Some ways that could happen:
          </p>
          <ul>
            {r.breakEvens
              .filter((be) => be.key !== 'crossover')
              .map((be) => (
                <li key={be.key}>{be.text}</li>
              ))}
            {lose.depreciation > win.depreciation && <li>Negotiate {fmtMoney(Math.min(loseInp.price * 0.15, Math.abs(c.nominalDifference)))} or more off the price — a lower price lowers both the upfront cost and the depreciation hit.</li>}
            {c.crossover.year !== null && c.crossover.cheaperAtStart !== c.crossover.cheaperAtEnd && c.crossover.year > 0.5 && <li>Sell before about {fmtYears(c.crossover.year)} — {lose.name} is ahead until then because of its lower upfront cost or slower early depreciation.</li>}
            {lose.totalInterest > 0 && <li>A lower APR or a bigger down payment would trim its {fmtMoney(lose.totalInterest)} of interest.</li>}
            {lose.insurance > win.insurance && <li>Shop insurance: it pays {fmtMoney(lose.insurance - win.insurance)} more over {yearsLabel(years)}.</li>}
          </ul>
        </>
      ),
  };

  return [explain, matters, overlooking, howFlip];
}

/** Short, content-derived scenario name: "Model 3 vs Camry · 5 yrs". */
export function vehicleNameFor(i: VehicleInputs): string {
  const short = (s: string) => (s.trim().length > 18 ? `${s.trim().slice(0, 17)}…` : s.trim() || 'Option');
  return `${short(i.a.name)} vs ${short(i.b.name)} · ${Math.round(i.shared.ownershipYears)} yr`;
}
