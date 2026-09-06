import type { Insight, MethodologyItem, QuickAdjust, ShareSummary } from '../types';
import type { RentBuyInputs, RentBuyResult } from '../../engine/calculators/rentBuy';
import { fmtMoney, fmtMoneyCompact, fmtNumber, fmtPct, roundHeadline, yearsLabel } from '../../lib/format';

export function rentBuyWinner(r: RentBuyResult): 'rent' | 'buy' | 'tie' {
  const d = r.comparison.wealthDifference;
  return Math.abs(d) < 500 ? 'tie' : d > 0 ? 'buy' : 'rent';
}

export function rentBuySummary(i: RentBuyInputs, r: RentBuyResult): ShareSummary {
  const w = rentBuyWinner(r);
  const years = Math.round(i.horizonYears);
  const d = Math.abs(r.comparison.wealthDifference);
  const headline = w === 'tie' ? `Renting and buying come out about even after ${yearsLabel(years)}.` : w === 'buy' ? `Buying leaves you about ${fmtMoney(roundHeadline(d))} wealthier after ${yearsLabel(years)}.` : `Renting and investing leaves you about ${fmtMoney(roundHeadline(d))} ahead after ${yearsLabel(years)}.`;
  const sub = `${fmtMoney(i.monthlyRent)}/mo rent vs a ${fmtMoney(i.homePrice)} home with ${fmtPct(i.downPaymentPct, 0)} down at ${fmtPct(i.mortgageApr, 2)}. Home equity at sale ${fmtMoney(r.buy.netEquityAtEnd)} vs renter's portfolio ${fmtMoney(r.rent.investedPortfolio)}.`;
  return {
    headline,
    sub,
    winner: w === 'tie' ? 'tie' : w === 'buy' ? 'b' : 'a',
    optionA: 'Renting',
    optionB: 'Buying',
    keyMetric: r.comparison.wealthDifference,
    keyMetricLabel: 'Buying advantage (wealth)',
    rows: [
      { label: 'Year-1 monthly: rent vs own', value: `${fmtMoney(r.rent.firstYearMonthly)} vs ${fmtMoney(r.buy.monthlyOwnerCostYear1)}` },
      { label: `Home equity after ${years} yr (net of selling)`, value: fmtMoney(r.buy.netEquityAtEnd), tone: 'b' },
      { label: `Renter's investments after ${years} yr`, value: fmtMoney(r.rent.investedPortfolio), tone: 'a' },
      { label: 'Unrecoverable owner costs', value: fmtMoney(r.buy.unrecoverableCosts) },
      { label: 'Break-even', value: r.breakEvenYear === null ? 'Renting stays ahead 40+ yrs' : r.breakEvenYear <= 1 ? 'Buying ahead from year 1' : `Buying wins after ~${r.breakEvenYear} yrs` },
    ],
  };
}

export function rentBuyQuickAdjust(): QuickAdjust<RentBuyInputs>[] {
  return [
    { key: 'horizonYears', label: 'Years you stay', get: (i) => i.horizonYears, set: (i, v) => ({ ...i, horizonYears: Math.round(v) }), min: 1, max: 30, step: 1, format: (v) => `${fmtNumber(v, 0)} yr` },
    { key: 'appreciation', label: 'Home appreciation', get: (i) => i.appreciation, set: (i, v) => ({ ...i, appreciation: v }), min: -2, max: 8, step: 0.25, format: (v) => `${fmtPct(v, 2)}/yr` },
    { key: 'investmentReturn', label: 'Investment return', get: (i) => i.investmentReturn, set: (i, v) => ({ ...i, investmentReturn: v }), min: 0, max: 12, step: 0.25, format: (v) => `${fmtPct(v, 2)}/yr` },
    { key: 'rentGrowth', label: 'Rent growth', get: (i) => i.rentGrowth, set: (i, v) => ({ ...i, rentGrowth: v }), min: 0, max: 8, step: 0.25, format: (v) => `${fmtPct(v, 2)}/yr` },
  ];
}

export function rentBuyAssumptions(i: RentBuyInputs): { label: string; value: string }[] {
  return [
    { label: 'Years you stay', value: `${i.horizonYears}` },
    { label: 'Home appreciation', value: `${fmtPct(i.appreciation, 1)}/yr` },
    { label: 'Rent growth', value: `${fmtPct(i.rentGrowth, 1)}/yr` },
    { label: 'Investment return', value: `${fmtPct(i.investmentReturn, 1)}/yr` },
    { label: 'Inflation (insurance, HOA)', value: `${fmtPct(i.inflation, 1)}/yr` },
    { label: 'Mortgage', value: `${fmtPct(i.mortgageApr, 2)} fixed, ${i.mortgageTermYears} years, ${fmtPct(i.downPaymentPct, 0)} down` },
    { label: 'Property tax · maintenance', value: `${fmtPct(i.propertyTaxRate, 2)} · ${fmtPct(i.maintenanceRate, 1)} of value per year` },
    { label: 'Closing · selling costs', value: `${fmtPct(i.closingCostsPct, 1)} · ${fmtPct(i.sellingCostsPct, 1)}` },
    { label: 'PMI', value: i.pmiRate > 0 ? `${fmtPct(i.pmiRate, 2)} of loan/yr until 80% LTV` : 'none' },
    { label: 'Mortgage interest tax deduction', value: 'not assumed (standard deduction)' },
  ];
}

export function rentBuyMethodology(i: RentBuyInputs, r: RentBuyResult): MethodologyItem[] {
  const years = Math.round(i.horizonYears);
  return [
    {
      title: 'The verdict: wealth, not payments',
      body: 'We compare where each path leaves your net worth at the end. The buyer ends with home equity net of selling costs. The renter ends with an investment portfolio built from every dollar the buyer spent that the renter did not.',
      formula: `buyer net equity  = value × (1 − selling costs) − loan balance = ${fmtMoney(r.buy.homeValueAtEnd)} × ${fmtPct(100 - i.sellingCostsPct, 0)} − ${fmtMoney(r.buy.loanBalanceAtEnd)} = ${fmtMoney(r.buy.netEquityAtEnd)}\nrenter portfolio  = FV of (buyer outflows − renter outflows) at ${fmtPct(i.investmentReturn, 1)} = ${fmtMoney(r.rent.investedPortfolio)}\nbuying advantage  = ${fmtMoney(r.buy.netEquityAtEnd)} − ${fmtMoney(r.rent.investedPortfolio)} = ${fmtMoney(r.comparison.wealthDifference)}`,
    },
    {
      title: 'Mortgage',
      body: `Level payment on a ${i.mortgageTermYears}-year fixed loan at ${fmtPct(i.mortgageApr, 2)} (monthly compounding). Each payment splits into interest (a cost) and principal (which builds equity).`,
      formula: `loan     = ${fmtMoney(i.homePrice)} − ${fmtMoney(r.buy.downPayment)} = ${fmtMoney(r.buy.loanAmount)}\npayment  = L·r / (1 − (1+r)^−n), r = ${fmtPct(i.mortgageApr, 2)}/12, n = ${i.mortgageTermYears * 12} → ${fmtMoney(r.buy.monthlyPayment, 2)}/mo\ninterest over ${years} yr = ${fmtMoney(r.buy.totalInterest)};  principal repaid = ${fmtMoney(r.buy.totalPrincipal)}`,
    },
    {
      title: 'Owner costs each month',
      body: 'Property tax and maintenance are a percent of the home’s value at the start of each year, so they grow with appreciation. Insurance and HOA grow with inflation. PMI applies while the loan balance exceeds 80% of the original price.',
      formula: `month t: payment + value(yr)×${fmtPct(i.propertyTaxRate, 2)}/12 + insurance/12 + HOA + value(yr)×${fmtPct(i.maintenanceRate, 1)}/12 + PMI\nyear 1 total ≈ ${fmtMoney(r.buy.monthlyOwnerCostYear1)}/mo (rent: ${fmtMoney(r.rent.firstYearMonthly)}/mo)`,
    },
    {
      title: 'Rent',
      body: `Rent grows ${fmtPct(i.rentGrowth, 1)} once a year; renter's insurance grows with inflation.`,
      formula: `rent(year y) = ${fmtMoney(i.monthlyRent)} × (1 + ${fmtPct(i.rentGrowth, 1)})^y;  total rent over ${years} yr = ${fmtMoney(r.rent.totalRent)}`,
    },
    {
      title: 'Home value and selling',
      body: `The home appreciates ${fmtPct(i.appreciation, 1)} a year, compounded monthly. Selling costs of ${fmtPct(i.sellingCostsPct, 1)} come off the sale price.`,
      formula: `value(${years}) = ${fmtMoney(i.homePrice)} × (1 + ${fmtPct(i.appreciation, 1)})^${years} = ${fmtMoney(r.buy.homeValueAtEnd)}\nselling costs = ${fmtMoney(r.buy.sellingCosts)};  appreciation gained = ${fmtMoney(r.buy.appreciationGain)}`,
    },
    {
      title: 'Break-even year',
      body: 'We run the same model out to 40 years and report the first year from which the buyer’s net equity stays ahead of the renter’s portfolio. Early years are dominated by closing costs, selling costs and the interest-heavy start of the mortgage.',
    },
    {
      title: 'Unrecoverable costs vs equity',
      body: 'Unrecoverable owner costs = interest + property tax + insurance + maintenance + HOA + PMI + closing + selling. Principal is not a cost — it comes back as equity. Nominal buying cost = unrecoverable costs − appreciation gained.',
      formula: `unrecoverable = ${fmtMoney(r.buy.unrecoverableCosts)};  nominal cost of buying = ${fmtMoney(r.buy.nominalCost)};  nominal cost of renting = ${fmtMoney(r.rent.nominalCost)}`,
    },
    {
      title: 'Not modeled',
      body: 'Mortgage-interest tax deductions (most households now take the standard deduction), capital-gains exclusions, refinancing, rent control, and the flexibility value of renting. Taxes on the renter’s investment gains are also ignored, which slightly favors renting.',
    },
  ];
}

export function rentBuyInsights(i: RentBuyInputs, r: RentBuyResult): Insight[] {
  const w = rentBuyWinner(r);
  const years = Math.round(i.horizonYears);
  const top = r.sensitivity[0];
  const gap = r.buy.monthlyOwnerCostYear1 - r.rent.firstYearMonthly;
  return [
    {
      question: 'Explain this result simply',
      answer: (
        <>
          <p>
            In year one, owning costs about {fmtMoney(r.buy.monthlyOwnerCostYear1)} a month (mortgage, taxes, insurance, maintenance{i.hoaMonthly > 0 ? ', HOA' : ''}) versus {fmtMoney(r.rent.firstYearMonthly)} to rent — {gap > 0 ? `${fmtMoney(gap)} more` : `${fmtMoney(-gap)} less`} for the owner. But roughly {fmtMoney(r.buy.monthlyPayment - r.buy.totalInterest / (years * 12))} of the owner's monthly payment is principal, which is really savings, not cost.
          </p>
          <p>
            After {yearsLabel(years)} the owner walks away with {fmtMoney(r.buy.netEquityAtEnd)} of equity after selling costs. The renter, having invested the down payment, closing costs and every month's difference at {fmtPct(i.investmentReturn, 1)}, has {fmtMoney(r.rent.investedPortfolio)}.{' '}
            {w === 'tie' ? 'The two are close enough to call it a tie — decide on lifestyle.' : w === 'buy' ? `Buying comes out ahead by ${fmtMoney(r.comparison.wealthDifference)}.` : `Renting comes out ahead by ${fmtMoney(-r.comparison.wealthDifference)}.`}
          </p>
        </>
      ),
    },
    {
      question: 'What assumption matters most?',
      answer: top ? (
        <p>
          <strong>{top.label}</strong>: across {top.format(top.low)} to {top.format(top.high)} the verdict swings by {fmtMoney(top.swing)}.{top.flips ? ' That is enough to change which path wins, so treat this number carefully.' : ''} {r.breakEvenYear !== null && r.breakEvenYear > 1 ? `Time is the other big one: buying only wins if you stay about ${r.breakEvenYear} years or more.` : ''}
        </p>
      ) : (
        <p>Adjust the inputs to see which assumptions drive the result.</p>
      ),
    },
    {
      question: 'What could I be overlooking?',
      answer: (
        <ul>
          <li>
            <strong>Will you actually invest the difference?</strong> Renting only wins if the money you don't put into a home is really invested, month after month. A mortgage is forced savings; a brokerage account is not.
          </li>
          <li>
            <strong>Leverage cuts both ways.</strong> With {fmtPct(i.downPaymentPct, 0)} down, a 10% price drop wipes out {fmtMoney(i.homePrice * 0.1)} of your equity. Appreciation of {fmtPct(i.appreciation, 1)} is an assumption, not a promise.
          </li>
          <li>
            <strong>Maintenance surprises.</strong> Roofs, HVAC and foundations arrive in lumps. {fmtPct(i.maintenanceRate, 1)} a year is an average; older homes often need more.
          </li>
          <li>
            <strong>Rent growth compounds.</strong> At {fmtPct(i.rentGrowth, 1)} a year your rent would be about {fmtMoney(i.monthlyRent * Math.pow(1 + i.rentGrowth / 100, years))} in year {years}. Owners lock in most of their payment.
          </li>
          <li>
            <strong>Taxes and deductions</strong> are not modeled: mortgage interest deductions (if you itemize), the capital-gains exclusion on a primary home, and taxes on the renter's investment gains can each shift the result.
          </li>
          <li>
            <strong>Flexibility has value.</strong> Renting makes it cheap to move for a job or a life change. Owning makes it expensive.
          </li>
        </ul>
      ),
    },
    {
      question: w === 'buy' ? 'How could renting become the better choice?' : 'How could buying become the better choice?',
      answer: (
        <ul>
          {r.breakEvens.map((b) => (
            <li key={b.key}>{b.text}</li>
          ))}
          {w === 'buy' ? <li>A shorter stay: closing and selling costs of about {fmtMoney(r.buy.closingCosts + r.buy.sellingCosts)} are spread over fewer years.</li> : <li>A lower price, a lower rate, or a bigger down payment (to avoid PMI) would all trim the owner's unrecoverable costs of {fmtMoney(r.buy.unrecoverableCosts)}.</li>}
        </ul>
      ),
    },
  ];
}

/** Short, content-derived scenario name: "$2,500 rent vs $450k · 10 yr". */
export function rentBuyNameFor(i: RentBuyInputs): string {
  return `${fmtMoney(i.monthlyRent)}/mo vs ${fmtMoneyCompact(i.homePrice)} · ${Math.round(i.horizonYears)} yr`;
}
