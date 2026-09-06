import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CALCULATORS } from '../calculators/meta';
import { REGISTRY } from '../calculators/registry';
import type { Preset, ShareSummary } from '../calculators/types';
import { LinkButton } from '../components/ui/Button';
import { CalcIcon, IconArrowRight, IconChevron, IconEye, IconShield, IconSparkle, IconScaleBalance } from '../components/ui/Icons';
import { encodeShare } from '../scenarios/urlCodec';
import { fmtMoney } from '../lib/format';
import { computeVehicle } from '../engine/calculators/vehicle';
import { vehicleDefaults } from '../calculators/vehicle/presets';

interface Example {
  key: string;
  calcName: string;
  slug: string;
  presetName: string;
  summary: ShareSummary;
  href: string;
}

function useExamples(): Example[] {
  return useMemo(() => {
    const out: Example[] = [];
    for (const def of REGISTRY) {
      const presets = def.presets.slice(0, def.id === 'vehicle' ? 2 : 1) as Preset<unknown>[];
      for (const p of presets) {
        const inputs = def.normalize(p.inputs);
        const r = def.compute(inputs);
        const summary = def.summary(inputs, r) as ShareSummary;
        out.push({ key: `${def.id}-${p.id}`, calcName: def.name, slug: def.slug, presetName: p.name, summary, href: `/calculators/${def.slug}#s=${encodeShare({ calculatorId: def.id, name: p.name, inputs })}` });
      }
    }
    return out.slice(0, 6);
  }, []);
}

export function HomePage() {
  const examples = useExamples();
  const demo = useMemo(() => computeVehicle(vehicleDefaults), []);
  const demoA = demo.a;
  const demoB = demo.b;
  const demoWin = demo.comparison.cheaper === 'b' ? demoB : demoA;

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
              <LinkButton to="/#calculators" size="lg">
                All calculators
              </LinkButton>
            </div>
            <p className="micro muted" style={{ marginTop: 'var(--sp-4)' }}>
              Free. No account. Your numbers stay in your browser.
            </p>
          </div>
          <Link to="/calculators/vehicle" className="hero-demo" style={{ color: 'inherit', textDecoration: 'none' }} aria-label="Open the Tesla Model 3 vs Toyota Camry example">
            <div className="row-between">
              <span className="eyebrow">Example · Vehicle True Cost</span>
              <span className="micro muted">5 years · 12,000 mi/yr</span>
            </div>
            <div className="answer-headline" style={{ fontSize: '1.35rem', marginTop: 10 }}>
              {/* The amount takes the winner's colour, not green. Green means "money you get back"
                  in the charts (resale, equity, incentives), and the same sentence is rendered in
                  the winner's colour in Featured comparisons below and on every calculator page —
                  three conventions for one figure was two too many. */}
              <span className={`text-${demo.comparison.cheaper}`}>{demoWin.name}</span> is estimated to cost{' '}
              {/* Deliberately NOT `.amt`: that rule resolves --hero-accent-text, which only exists
                  inside an .answer-hero.winner-* and otherwise falls back to the primary blue —
                  and it outranks .text-b, so the amount came out blue beside an orange name.
                  The headline already supplies tabular figures. */}
              <span className={`text-${demo.comparison.cheaper}`}>{fmtMoney(Math.abs(demo.comparison.nominalDifference), 0)}</span> less than{' '}
              {demo.comparison.cheaper === 'b' ? demoA.name : demoB.name} over 5 years.
            </div>
            <div className="answer-stats" style={{ marginTop: 'var(--sp-4)' }}>
              <div className="stat a">
                <div className="lab">{demoA.name}</div>
                <div className="val">{fmtMoney(demoA.totalCost)}</div>
                <div className="sub">sticker {fmtMoney(vehicleDefaults.a.price)}</div>
              </div>
              <div className="stat b">
                <div className="lab">{demoB.name}</div>
                <div className="val">{fmtMoney(demoB.totalCost)}</div>
                <div className="sub">sticker {fmtMoney(vehicleDefaults.b.price)}</div>
              </div>
            </div>
            <p className="micro muted" style={{ marginTop: 'var(--sp-3)' }}>
              Illustrative estimates. Open the calculator to change every assumption →
            </p>
          </Link>
        </div>
      </section>

      <section className="home-section container" id="calculators">
        <h2>What can I calculate?</h2>
        <p className="sub">Five decision engines, one method: every dollar in and out over time, what you get back at the end, and what the difference could grow into.</p>
        <div className="calc-grid" style={{ marginTop: 'var(--sp-5)' }}>
          {CALCULATORS.map((c) => (
            <Link key={c.id} to={`/calculators/${c.slug}`} className="calc-card">
              {c.flagship && <span className="badge">Flagship</span>}
              <CalcIcon kind={c.icon} size={44} />
              <h3>{c.name}</h3>
              <p>{c.tagline}</p>
              <span className="go">
                Open calculator <IconArrowRight width={16} height={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section container" id="examples">
        <h2>Featured comparisons</h2>
        <p className="sub">Real questions with illustrative numbers. Open one and make it yours — every assumption is editable, and the answer updates instantly.</p>
        <div className="example-grid" style={{ marginTop: 'var(--sp-5)' }}>
          {examples.map((ex) => (
            <Link key={ex.key} to={ex.href} className="example-card">
              <span className="kind">{ex.calcName}</span>
              <h3>{ex.presetName}</h3>
              <span className={`res ${ex.summary.winner}`}>{ex.summary.headline}</span>
              <p>{ex.summary.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section container" id="how">
        <h2>How TrueCost works</h2>
        <p className="sub">The same transparent method behind every calculator.</p>
        <div className="steps" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="step">
            <div className="n">1</div>
            <h3>Start with an example or your own numbers</h3>
            <p>Sensible defaults get you an answer in seconds. Then replace anything with your real quotes, rates and habits.</p>
          </div>
          <div className="step">
            <div className="n">2</div>
            <h3>We model every dollar, month by month</h3>
            <p>Upfront costs, payments, running costs, depreciation, equity and resale — for as long as you plan to keep the thing.</p>
          </div>
          <div className="step">
            <div className="n">3</div>
            <h3>You get the answer, the why, and what matters</h3>
            <p>A plain-English verdict, a breakdown of the difference, the assumptions that drive it, and the break-even points that would flip it.</p>
          </div>
          <div className="step">
            <div className="n">4</div>
            <h3>Then: what if you invested the difference?</h3>
            <p>The cheaper choice frees up cash. We project what that could become over 5, 10, 20 and 30 years — contributions and growth shown separately.</p>
          </div>
        </div>
      </section>

      <section className="home-section container" id="sticker">
        <h2>Why the sticker price is misleading</h2>
        <p className="sub">A price tag is a single moment. Ownership is a stream of costs, and a chunk of what you paid comes back when you sell. Only the whole stream tells you what a choice really costs.</p>
        <div className="sticker-demo" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="sticker-card">
            <span className="lab">What the ad says</span>
            <span className="big">{fmtMoney(vehicleDefaults.a.price)}</span>
            <span className="small muted">{demoA.name} · purchase price</span>
          </div>
          <div className="sticker-card">
            <span className="lab">What it actually costs over 5 years</span>
            <span className="big true">{fmtMoney(demoA.totalCost)}</span>
            <span className="small muted">after getting {fmtMoney(demoA.resaleValue)} back at resale</span>
            <ul>
              <li>Depreciation {fmtMoney(demoA.depreciation)}</li>
              <li>Loan interest {fmtMoney(demoA.totalInterest)}</li>
              <li>Insurance {fmtMoney(demoA.insurance)}</li>
              <li>Charging {fmtMoney(demoA.fuel)}</li>
              <li>Maintenance, tires &amp; repairs {fmtMoney(demoA.maintenance + demoA.tires + demoA.repairs)}</li>
              <li>Tax, fees &amp; registration {fmtMoney(demoA.salesTax + demoA.fees + demoA.registration)}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="home-section container" id="trust">
        <h2>Built to be trusted</h2>
        <div className="trust-grid" style={{ marginTop: 'var(--sp-5)' }}>
          <div className="trust">
            <div className="ico">
              <IconEye />
            </div>
            <div>
              <h3>Show-the-math on every result</h3>
              <p>Each calculator has a “how this was calculated” panel with the formulas and your numbers plugged in. Nothing is a black box.</p>
            </div>
          </div>
          <div className="trust">
            <div className="ico">
              <IconScaleBalance />
            </div>
            <div>
              <h3>Honest about uncertainty</h3>
              <p>Sensitivity analysis ranks the assumptions that matter and flags any that could flip the answer. Projected returns are never presented as guaranteed.</p>
            </div>
          </div>
          <div className="trust">
            <div className="ico">
              <IconShield />
            </div>
            <div>
              <h3>Private by design</h3>
              <p>Scenarios are saved in your browser only. Share links encode your inputs in the URL itself — there is no server and no account.</p>
            </div>
          </div>
          <div className="trust">
            <div className="ico">
              <IconSparkle />
            </div>
            <div>
              <h3>Deterministic, tested math</h3>
              <p>The financial engine is pure, unit-tested code: amortization, compounding, cash-flow timing and resale values are verified against known results.</p>
            </div>
          </div>
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

      <section className="home-section container" id="attribution" style={{ paddingBottom: 'var(--sp-4)' }}>
        <div className="card card-pad" style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="eyebrow">From the makers of</div>
            <h3 style={{ marginTop: 4 }}>Cents of Adventure</h3>
            <p className="small muted" style={{ marginTop: 4 }}>
              Practical money and travel guidance for people who want more adventure per dollar. TrueCost Lab is our decision engine — the tool we wished existed every time someone asked “is it worth it?”
            </p>
          </div>
          <a className="btn" href="https://www.centsofadventure.me" target="_blank" rel="noopener noreferrer">
            Visit centsofadventure.me
          </a>
        </div>
      </section>
    </div>
  );
}
