import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CALCULATORS } from '../calculators/meta';
import { REGISTRY } from '../calculators/registry';
import type { ShareSummary } from '../calculators/types';
import { LinkButton } from '../components/ui/Button';
import { IconArrowRight, IconChevron } from '../components/ui/Icons';
import { COMPARISONS } from '../content/comparisons';
import { fmtMoney, roundHeadline } from '../lib/format';
import { vehicleDefaults } from '../calculators/vehicle/presets';

/**
 * The comparisons worth putting on the front page.
 *
 * Editorial, not `presets.slice(0, n)`. Slicing produced whatever happened to be first in each
 * preset file — five variations on "which of these two sedans" — and read as a demo grid rather
 * than a reason to stay. These are picked because people genuinely argue about them, they span
 * four different calculators, and each one has a real page behind it.
 */
const HOME_PICKS = ['pay-off-mortgage-early-or-invest', 'rent-vs-buy-a-house', 'low-interest-car-loan-or-invest', 'is-rooftop-solar-worth-it'] as const;

interface Featured {
  slug: string;
  question: string;
  intro: string;
  calcName: string;
  summary: ShareSummary;
}

function useFeatured(): Featured[] {
  return useMemo(() => {
    const out: Featured[] = [];
    for (const slug of HOME_PICKS) {
      const c = COMPARISONS.find((x) => x.slug === slug);
      if (!c) continue;
      const def = REGISTRY.find((d) => d.id === c.calculatorId);
      const preset = def?.presets.find((p) => p.id === c.presetId);
      if (!def || !preset) continue;
      const inputs = def.normalize(preset.inputs);
      const summary = def.summary(inputs, def.compute(inputs)) as ShareSummary;
      out.push({ slug: c.slug, question: c.question, intro: c.intro, calcName: def.name, summary });
    }
    return out;
  }, []);
}

/**
 * The hero demo, computed through the registry rather than by calling the engine directly.
 *
 * It used to call `computeVehicle(vehicleDefaults)` and format the difference itself, which meant
 * the homepage printed $10,829 while the calculator, the comparison pages and every share card
 * printed $10,850 for the identical scenario — the maths agreed to the cent, but only the summary
 * ran it through `roundHeadline`. Going through `def.summary` and reusing the same rounding is the
 * fix; `homeDemo.test.ts` holds the two together.
 */
function useDemo() {
  return useMemo(() => {
    const def = REGISTRY.find((d) => d.id === 'vehicle')!;
    const inputs = def.normalize(vehicleDefaults);
    const result = def.compute(inputs) as {
      a: { name: string; totalCost: number; resaleValue: number; depreciation: number; totalInterest: number; insurance: number; fuel: number; maintenance: number; tires: number; repairs: number; salesTax: number; fees: number; registration: number };
      b: { name: string; totalCost: number };
      comparison: { cheaper: 'a' | 'b' | 'tie'; nominalDifference: number };
    };
    const summary = def.summary(inputs, result) as ShareSummary;
    return { result, summary, amount: fmtMoney(roundHeadline(Math.abs(result.comparison.nominalDifference)), 0) };
  }, []);
}

export function HomePage() {
  const featured = useFeatured();
  const { result: demo, amount } = useDemo();
  const a = demo.a;
  const b = demo.b;
  const win = demo.comparison.cheaper === 'b' ? b : a;
  const lose = demo.comparison.cheaper === 'b' ? a : b;

  return (
    <div>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow" style={{ color: 'var(--tc-primary-strong)' }}>
              A Cents of Adventure tool
            </div>
            <h1 style={{ marginTop: 10 }}>What will this decision actually cost you?</h1>
            <p className="lead">Sticker prices and monthly payments hide the real cost of cars, homes, debt and big purchases. TrueCost Lab adds up depreciation, interest, insurance, maintenance, taxes and resale — then shows what happens if you invest the difference.</p>
            <div className="row" style={{ marginTop: 'var(--sp-5)', gap: 10 }}>
              <LinkButton to="/calculators/vehicle" variant="primary" size="lg" iconRight={<IconArrowRight />}>
                Compare two cars
              </LinkButton>
              <LinkButton to="/compare" size="lg">
                Worked comparisons
              </LinkButton>
            </div>
            <p className="micro muted" style={{ marginTop: 'var(--sp-4)' }}>
              Free. No account. Your numbers stay in your browser.
            </p>
          </div>
          <Link to="/calculators/vehicle" className="hero-demo" style={{ color: 'inherit', textDecoration: 'none' }} aria-label="Open the Tesla Model 3 vs Toyota Camry Hybrid example">
            <div className="row-between">
              <span className="eyebrow">Example · Vehicle True Cost</span>
              <span className="micro muted">5 years · 12,000 mi/yr</span>
            </div>
            <div className="answer-headline" style={{ fontSize: '1.35rem', marginTop: 10 }}>
              {/* The amount takes the winner's colour, not green. Green means "money you get back"
                  in the charts (resale, equity, incentives), and the same sentence is rendered in
                  the winner's colour on every calculator page. */}
              <span className={`text-${demo.comparison.cheaper}`}>{win.name}</span> is estimated to cost{' '}
              <span className={`text-${demo.comparison.cheaper}`}>{amount}</span> less than {lose.name} over 5 years.
            </div>
            <div className="answer-stats" style={{ marginTop: 'var(--sp-4)' }}>
              <div className="stat a">
                <div className="lab">{a.name}</div>
                <div className="val">{fmtMoney(a.totalCost)}</div>
                <div className="sub">sticker {fmtMoney(vehicleDefaults.a.price)}</div>
              </div>
              <div className="stat b">
                <div className="lab">{b.name}</div>
                <div className="val">{fmtMoney(b.totalCost)}</div>
                <div className="sub">sticker {fmtMoney(vehicleDefaults.b.price)}</div>
              </div>
            </div>
            <p className="micro muted" style={{ marginTop: 'var(--sp-3)' }}>
              Illustrative estimates, not live prices. Open the calculator to change every assumption →
            </p>
          </Link>
        </div>
      </section>

      {/* The argument the whole tool rests on, immediately after the promise rather than four
          template sections below it. */}
      <section className="home-section container" id="sticker">
        <h2>The sticker price is the smallest number</h2>
        <p className="sub">A price tag is one moment. Ownership is a stream of costs, and a chunk of what you paid comes back when you sell. Only the whole stream tells you what a choice really costs.</p>
        <div className="sticker-demo" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="sticker-card">
            <span className="lab">What the ad says</span>
            <span className="big">{fmtMoney(vehicleDefaults.a.price)}</span>
            <span className="small muted">{a.name} · purchase price</span>
          </div>
          <div className="sticker-card">
            <span className="lab">What it actually costs over 5 years</span>
            <span className="big true">{fmtMoney(a.totalCost)}</span>
            <span className="small muted">after getting {fmtMoney(a.resaleValue)} back at resale</span>
            <ul>
              <li>Depreciation {fmtMoney(a.depreciation)}</li>
              <li>Loan interest {fmtMoney(a.totalInterest)}</li>
              <li>Insurance {fmtMoney(a.insurance)}</li>
              <li>Charging {fmtMoney(a.fuel)}</li>
              <li>Maintenance, tires &amp; repairs {fmtMoney(a.maintenance + a.tires + a.repairs)}</li>
              <li>Tax, fees &amp; registration {fmtMoney(a.salesTax + a.fees + a.registration)}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="home-section container" id="examples">
        <h2>Arguments worth settling</h2>
        <p className="sub">Four decisions people genuinely disagree about, each run with realistic numbers. Open one and make it yours — every assumption is editable.</p>
        <div className="example-grid" style={{ marginTop: 'var(--sp-5)' }}>
          {featured.map((f) => (
            <Link key={f.slug} to={`/compare/${f.slug}`} className="example-card">
              <span className="kind">{f.calcName}</span>
              <h3>{f.question}</h3>
              <span className={`res ${f.summary.winner}`}>{f.summary.headline}</span>
              <p>{f.intro}</p>
            </Link>
          ))}
        </div>
        <p className="small" style={{ marginTop: 'var(--sp-4)' }}>
          <Link to="/compare">All {COMPARISONS.length} worked comparisons →</Link>
        </p>
      </section>

      <section className="home-section container" id="calculators">
        <h2>What decision are you making?</h2>
        <div className="calc-grid" style={{ marginTop: 'var(--sp-5)' }}>
          {CALCULATORS.map((c) => (
            <Link key={c.id} to={`/calculators/${c.slug}`} className="calc-card">
              <h3>{c.question}</h3>
              <p>{c.tagline}</p>
              <span className="go">
                {c.name} <IconArrowRight width={16} height={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust as a paragraph someone reads, not four icons in coloured boxes. */}
      <section className="home-section container" id="trust">
        <h2>How to check our work</h2>
        <div className="trust-prose">
          <p>
            Every result has a <strong>show-the-math</strong> panel with the formulas and your numbers plugged into them, so nothing is a black box. The sensitivity analysis ranks which assumptions actually move the answer and flags any that would flip it — projected investment returns are never shown as guaranteed.
          </p>
          <p>
            Scenarios are saved in your browser and nowhere else. Share links carry your inputs in the URL itself: there is no server, no account and no analytics on your figures. The financial engine is pure, unit-tested code, and the example numbers are clearly labelled estimates rather than live quotes.
          </p>
          <p className="small muted">
            TrueCost Lab is an educational tool, not financial advice. <Link to="/methodology">Read the methodology</Link>.
          </p>
        </div>
      </section>

      <section className="home-section container" id="faq">
        <h2>Frequently asked questions</h2>
        <div className="faq" style={{ marginTop: 'var(--sp-5)' }}>
          <details>
            <summary>
              Is this financial advice? <IconChevron className="chev" width={18} height={18} />
            </summary>
            <div className="body">No. TrueCost Lab is an educational tool. It shows the arithmetic consequences of the assumptions you enter. It does not know your full situation, taxes, or risk tolerance, and it is not a substitute for a licensed adviser.</div>
          </details>
          <details>
            <summary>
              Where do the example numbers come from? <IconChevron className="chev" width={18} height={18} />
            </summary>
            <div className="body">Examples use rounded, realistic estimates chosen to illustrate each decision. They are not live market prices, rates or quotes. Every example is clearly labeled and every value is editable — please replace them with current figures for your area.</div>
          </details>
          <details>
            <summary>
              What does “invest the difference” assume? <IconChevron className="chev" width={18} height={18} />
            </summary>
            <div className="body">That each month's cash-flow difference between the two choices is invested at the return you set (default 7% a year, effective, compounded monthly), with no taxes or fees. Real returns vary and can be negative. We always show contributions and growth separately so you can see how much depends on the return assumption.</div>
          </details>
          <details>
            <summary>
              Why does a cheaper monthly payment sometimes lose? <IconChevron className="chev" width={18} height={18} />
            </summary>
            <div className="body">Because monthly payments ignore depreciation, interest, running costs and what you get back at the end. A low payment on a fast-depreciating, expensive-to-insure car can cost far more than a higher payment on a car that holds its value.</div>
          </details>
          <details>
            <summary>
              Are my scenarios saved? Can I share them? <IconChevron className="chev" width={18} height={18} />
            </summary>
            <div className="body">Scenarios save automatically in your browser's local storage and survive refreshes. “Copy link” creates a URL that contains your inputs, so anyone who opens it sees the same scenario. You can also download a branded result image or print a report.</div>
          </details>
          <details>
            <summary>
              Does it account for inflation? <IconChevron className="chev" width={18} height={18} />
            </summary>
            <div className="body">Where it matters, yes: running costs, rent, insurance and prices can grow each year at rates you control, and the purchase-vs-invest calculator shows values in today's dollars. Totals are in nominal dollars — the amounts you would actually pay — unless a calculator says otherwise.</div>
          </details>
        </div>
      </section>

      {/* Hairline and type. A boxed card here made the attribution look like a promo unit. */}
      <section className="home-section container" id="attribution" style={{ paddingBottom: 'var(--sp-4)' }}>
        <div className="coa-note">
          <div>
            <div className="eyebrow">From the makers of</div>
            <h3 style={{ marginTop: 4 }}>Cents of Adventure</h3>
            <p className="small muted" style={{ marginTop: 4, maxWidth: '62ch' }}>
              Practical money and travel guidance for people who want more adventure per dollar. TrueCost Lab is the tool we wished existed every time someone asked “is it worth it?”
            </p>
          </div>
          <a className="coa-link" href="https://www.centsofadventure.me" target="_blank" rel="noopener noreferrer">
            centsofadventure.me <IconArrowRight width={15} height={15} />
          </a>
        </div>
      </section>
    </div>
  );
}
