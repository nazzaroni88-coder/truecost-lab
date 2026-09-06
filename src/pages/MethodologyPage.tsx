import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function MethodologyPage() {
  useEffect(() => {
    document.title = 'Methodology — TrueCost Lab';
  }, []);
  return (
    <div className="page container">
      <div className="prose">
        <div className="eyebrow" style={{ color: 'var(--tc-primary-strong)' }}>
          Methodology
        </div>
        <h1 style={{ marginTop: 8 }}>How TrueCost Lab does the math</h1>
        <p className="lead">One method underneath every calculator: turn each choice into a stream of monthly cash flows plus what you get back at the end, then compare the streams honestly — including timing. This page documents the conventions, formulas and known limitations.</p>
        <nav className="toc" aria-label="On this page">
          <a href="#principles">Principles</a>
          <a href="#conventions">Conventions</a>
          <a href="#engine">The cash-flow engine</a>
          <a href="#invest">Invest the difference</a>
          <a href="#sensitivity">Sensitivity &amp; break-even</a>
          <a href="#vehicle">Vehicle</a>
          <a href="#rent-buy">Rent vs Buy</a>
          <a href="#debt-invest">Debt vs Invest</a>
          <a href="#purchase-invest">Purchase vs Invest</a>
          <a href="#custom">Custom</a>
          <a href="#limits">Limitations</a>
        </nav>

        <h2 id="principles">Principles</h2>
        <ul>
          <li>
            <strong>Total cost, not sticker price.</strong> The cost of a choice is everything you pay minus everything you get back, over the time you actually keep it.
          </li>
          <li>
            <strong>Timing matters.</strong> A dollar paid today is worth more than a dollar paid in five years, because today's dollar could have been invested. The “invest the difference” projection captures this without hiding it inside a discount rate.
          </li>
          <li>
            <strong>Cash flow is not wealth.</strong> A mortgage payment is partly saving (principal) and partly cost (interest). We separate the two everywhere.
          </li>
          <li>
            <strong>No fake precision.</strong> Internal math keeps full precision; displayed headlines are rounded to sensible increments. Every assumption is visible and editable.
          </li>
          <li>
            <strong>Uncertainty is shown, not hidden.</strong> Sensitivity analysis and break-even points tell you how fragile the answer is.
          </li>
        </ul>

        <h2 id="conventions">Conventions</h2>
        <ul>
          <li>
            <strong>Loan rates</strong> are nominal APRs compounded monthly (rate ÷ 12 per month), matching how U.S. auto loans and mortgages are quoted. Payment = P·r / (1 − (1 + r)<sup>−n</sup>).
          </li>
          <li>
            <strong>Investment returns</strong> are effective annual rates. The monthly rate is (1 + r)<sup>1/12</sup> − 1, so “7% a year” grows a lump sum by exactly 7% each year. Contributions are added at the end of each month after growth; upfront amounts are invested immediately.
          </li>
          <li>
            <strong>Inflation</strong> is applied year by year to recurring costs where a calculator says so (insurance, maintenance, rent, HOA…). Totals are nominal dollars — what you would actually pay — unless labeled “today's dollars”.
          </li>
          <li>
            <strong>Horizons</strong> are whole years. Month 0 is the purchase moment; month t is the end of month t.
          </li>
          <li>
            <strong>Taxes</strong> on investment gains, mortgage-interest deductions and EV incentives are not modeled by default; the methodology notes where they could matter.
          </li>
        </ul>

        <h2 id="engine">The cash-flow engine</h2>
        <p>Every option becomes three arrays over the horizon:</p>
        <ul>
          <li>
            <code>outflows[t]</code> — money leaving your pocket at month t (t = 0 is the upfront amount).
          </li>
          <li>
            <code>exitValue[t]</code> — what you would receive if you exited at month t (resale minus loan payoff, or home equity minus selling costs). For a pure expense like rent it is zero.
          </li>
          <li>Category totals for the “why” breakdown, which always sum to the nominal cost.</li>
        </ul>
        <pre className="formula">{`nominal cost      = Σ outflows[0..N] − exitValue[N]
cost to date(t)   = Σ outflows[0..t] − exitValue[t]        → the crossover chart
crossover         = last month where the cheaper option (by cost to date) changes`}</pre>

        <h2 id="invest">Invest the difference</h2>
        <p>For two options A and B we compute the monthly difference d[t] = outflowA[t] − outflowB[t] and simulate an account that receives d[t] each month at the chosen return. At the horizon we add the difference in exit values.</p>
        <pre className="formula">{`m            = (1 + r)^(1/12) − 1
balance[0]   = d[0]
balance[t]   = balance[t−1] × (1 + m) + d[t]
wealth diff  = balance[N] + (exitValueB[N] − exitValueA[N])     (positive → B leaves you wealthier)
milestones   = balance at 5/10/20/30 years; beyond the horizon it compounds with no new contributions
contributions = Σ d[t] (+ exit difference once reached);  growth = value − contributions`}</pre>
        <p>This is the same as comparing the two options' net worth paths, and it handles finance-vs-cash style timing questions naturally: the option that keeps more cash in your pocket early gets credit for the growth of that cash.</p>

        <h2 id="sensitivity">Sensitivity and break-even</h2>
        <p>For each key assumption we re-run the entire model at a plausible low and high value and rank assumptions by how much the result moves (the “swing”). If the sign of the result changes between the low and high value, that assumption alone could flip the answer, and we flag it.</p>
        <p>Break-even values are found by scanning the assumption across realistic bounds for a sign change and then bisecting to the point where the two options are equal. If no sign change exists in bounds, we say so rather than inventing a number.</p>
        <p>We also suppress break-even answers that are arithmetically true but practically unreachable. "Buying wins below a 0.9% mortgage rate" is not advice anyone can act on, so where the solved value falls outside a range you could actually encounter we say the result holds across the whole range instead.</p>

        <h2 id="vehicle">Vehicle True Cost</h2>
        <pre className="formula">{`sales tax     = max(0, price − trade-in) × rate            (most states credit the trade-in)
financed:  loan = price + tax + fees − down − trade-in;  cash at signing = down
cash:      cash at signing = price + tax + fees − trade-in
initial outlay = cash at signing + trade-in value        (the trade-in is money you put in)
value(t)      = price × (1 − d₁) × (1 − d)^(t−1)          t in years ≥ 1; geometric within a year
resale        = value(N);  depreciation = price − resale
fuel          = Σ (miles/12 ÷ mpg) × gas price(year)      gas price grows at the fuel growth rate
electricity   = Σ (miles/12 ÷ mi/kWh) × rate(year)
running costs = insurance + registration + maintenance + repairs + tires, each inflated yearly
tires/yr      = (miles ÷ tire life) × set cost
exitValue(t)  = value(t) − loan balance(t)
true cost     = price + tax + fees + interest + fuel + running − resale
cost per mile = true cost ÷ (miles × years)`}</pre>
        <p>If you sell before the loan ends, the remaining balance is repaid from the sale. If you enter a resale value directly, we keep the first-year drop and solve for the annual rate that lands on your number.</p>
        <p>
          <strong>Negative equity.</strong> When the loan balance exceeds the car's value, the cash from a sale is negative — you would have to bring money to close out the loan. We show the car's value, the loan still owed and the resulting cash separately, and warn you rather than reporting the gross resale figure as money you get back.
        </p>
        <p>
          <strong>Trade-ins.</strong> A trade-in is counted as money you put in, because you could have sold the car for cash instead. It can only offset what this purchase costs, though: if your trade-in is worth more than the car, the surplus comes back to you and is not counted as spent.
        </p>

        <h2 id="rent-buy">Rent vs Buy</h2>
        <pre className="formula">{`renter outflow(t) = rent(year) + renter's insurance/12;  rent grows yearly at the rent growth rate
buyer outflow(0)  = down payment + closing costs
buyer outflow(t)  = mortgage payment + property tax + insurance + HOA + maintenance + PMI
property tax      = home value at start of year × rate / 12;   maintenance = value × rate / 12
PMI               = loan × PMI rate / 12 while balance > 80% of the original price
home value(t)     = price × (1 + appreciation)^(t/12)
buyer exitValue(t)= value(t) × (1 − selling costs) − loan balance(t)
renter portfolio  = FV of (buyer outflows − renter outflows) at the investment return
verdict           = buyer's net equity − renter's portfolio at the horizon
break-even year   = first year from which buying stays ahead`}</pre>
        <p>The comparison is explicitly wealth-based: the renter is assumed to invest every dollar the buyer spends that they don't. Unrecoverable owner costs (interest, taxes, insurance, maintenance, HOA, closing and selling costs) are reported separately from principal, which is recovered as equity.</p>

        <h2 id="debt-invest">Debt vs Invest</h2>
        <pre className="formula">{`budget            = minimum payment + extra, deployed every month by both strategies
pay-debt-first    : min + extra → debt until paid off, then the full budget → investments
invest-the-extra  : min → debt, extra → investments; once the debt is gone, the full budget → investments
interest(t)       = balance × APR / 12, charged before the payment each month
net worth(N)      = investments − remaining debt;   winner = higher net worth
break-even return = investment return at which both strategies tie (found by bisection)`}</pre>
        <p>Because the debt's interest is certain and the investment return is not, the break-even return should be read as “the return you would need to earn, reliably, to justify not paying the debt.” It sits slightly above the APR because the APR compounds monthly while the return is quoted annually.</p>

        <h2 id="purchase-invest">Purchase vs Invest</h2>
        <pre className="formula">{`contributions[0] = one-time amount;  contributions[1..12·years] = monthly amount
balance(t)       = balance(t−1) × (1 + m) + contributions[t]
milestones       = balance at 5/10/20/30 years, split into contributions and growth
today's dollars  = balance ÷ (1 + inflation)^years
net of resale    = balance − resale value grown from the resale year at the same return`}</pre>

        <h2 id="custom">Custom Comparison</h2>
        <pre className="formula">{`outflow(0)   = upfront
outflow(t)   = monthly − monthly savings (+ annual − annual savings + one-time costs at year ends)
replacement  = at each lifespan end before the horizon: buy again at the inflated price, sell the old one for its inflated resale value
exitValue(t) = resale value of the unit you currently own (inflated per replacement)
true cost    = Σ outflows − exitValue(N)`}</pre>

        <h2 id="limits">Known limitations</h2>
        <ul>
          <li>No income-tax effects (capital gains, dividend taxes, mortgage-interest deduction, tax-advantaged accounts).</li>
          <li>No EV purchase incentives, gap insurance, extended warranties or home-charger installation unless you add them to fees.</li>
          <li>Depreciation uses a smooth curve; real used-car prices are lumpy and model-specific.</li>
          <li>Rent-vs-buy ignores rent control, refinancing, home-equity borrowing and the option value of flexibility.</li>
          <li>Investment returns are a single constant rate. Real returns vary year to year; sequence risk is not modeled.</li>
          <li>All examples are illustrative estimates, not live data. Replace them with current figures.</li>
        </ul>
        <p style={{ marginTop: 'var(--sp-6)' }}>
          Questions or corrections? TrueCost Lab is a <a href="https://centsofadventure.com" target="_blank" rel="noopener noreferrer">Cents of Adventure</a> project. See also the <Link to="/about">About page</Link>.
        </p>
      </div>
    </div>
  );
}
