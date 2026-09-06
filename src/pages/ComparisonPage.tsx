import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Preset } from '../calculators/types';
import { getCalculatorById } from '../calculators/registry';
import { comparisonBySlug, relatedComparisons, type Comparison } from '../content/comparisons';
import { LinkButton } from '../components/ui/Button';
import { RobustnessNote } from '../components/results/Robustness';
import type { SensitivityRow } from '../engine/core/sensitivity';
import { IconArrowRight } from '../components/ui/Icons';
import { NotFoundPage } from './NotFoundPage';

/**
 * Computes a comparison from the preset it names.
 *
 * The page runs the real calculator over the real preset, so what it publishes and what the tool
 * shows cannot drift apart — there is no second copy of the answer to keep in step.
 */
export function useComparisonResult(c: Comparison) {
  return useMemo(() => {
    const def = getCalculatorById(c.calculatorId);
    const preset = def?.presets.find((p: Preset<unknown>) => p.id === c.presetId);
    if (!def || !preset) return null;
    const inputs = def.normalize(preset.inputs);
    const result = def.compute(inputs);
    const summary = def.summary(inputs, result);
    return { def, preset, inputs, summary, result };
  }, [c]);
}

/** Not every calculator runs a tornado — Purchase vs Invest shows a return range instead. */
function sensitivityOf(result: unknown): SensitivityRow[] | null {
  const rows = (result as { sensitivity?: unknown } | null)?.sensitivity;
  return Array.isArray(rows) && rows.length > 0 ? (rows as SensitivityRow[]) : null;
}

export default function ComparisonPage() {
  const { slug } = useParams<{ slug: string }>();
  const comparison = slug ? comparisonBySlug(slug) : undefined;

  // The build bakes the right title into each page's HTML, but a reader arriving by client-side
  // navigation never reloads it, so the tab would keep whichever title it had.
  useEffect(() => {
    if (!comparison) return;
    document.title = comparison.question;
    return () => {
      document.title = 'TrueCost Lab — What will this decision actually cost?';
    };
  }, [comparison]);
  const computed = useComparisonResult(comparison ?? { slug: '', calculatorId: '', presetId: '', question: '', intro: '' });

  if (!comparison || !computed) return <NotFoundPage />;
  const { def, preset, inputs, summary, result } = computed;
  const related = relatedComparisons(comparison);
  const drivers = summary.drivers ?? [];
  const rows = drivers.length ? [] : summary.rows.filter((r) => r.value && r.value !== '—');
  const openInCalculator = `/calculators/${def.slug}?preset=${preset.id}`;

  return (
    <div className="container compare-page">
      <nav aria-label="Breadcrumb" className="small muted" style={{ marginBottom: 'var(--sp-3)' }}>
        <Link to="/">TrueCost Lab</Link> <span aria-hidden="true">›</span> <Link to="/compare">Comparisons</Link> <span aria-hidden="true">›</span> <span>{comparison.question}</span>
      </nav>

      <header className="compare-head">
        <h1>{comparison.question}</h1>
        <p className="lead">{comparison.intro}</p>
      </header>

      <section className={`answer-hero winner-${summary.winner === 'none' ? 'tie' : summary.winner}`} aria-labelledby="compare-answer">
        <div className="eyebrow">The answer, on these numbers</div>
        <h2 id="compare-answer" className="answer-headline">
          {summary.headline}
        </h2>
        <p className="answer-sub">{summary.sub}</p>
        {/* A page that publishes a verdict owes the reader whether the verdict survives its own
            assumptions. There is no tornado on this page, so the note does not link to one. */}
        {sensitivityOf(result) && <RobustnessNote rows={sensitivityOf(result)!} link={false} />}
      </section>

      {(drivers.length > 0 || rows.length > 0) && (
        <section className="ledger-section" aria-labelledby="compare-detail">
          <div className="eyebrow">{drivers.length ? 'Why' : 'The numbers'}</div>
          <h2 id="compare-detail" className="card-title">
            {drivers.length ? 'What creates the gap' : 'What the model produces'}
          </h2>
          <dl className="compare-rows">
            {drivers.map((d) => (
              <div key={d.label} className={`compare-row tone-${d.costlierFor}`}>
                <dt>{d.label}</dt>
                <dd>
                  <span className="num">${Math.round(d.amount).toLocaleString('en-US')} more</span>
                  <span className="who">
                    for {d.costlierName}
                    {d.shareOfGap > 0 && ` · ${Math.round(d.shareOfGap * 100)}% of the difference`}
                  </span>
                </dd>
              </div>
            ))}
            {rows.map((r) => (
              <div key={r.label} className={`compare-row tone-${r.tone ?? 'neutral'}`}>
                <dt>{r.label}</dt>
                <dd>
                  <span className="num">{r.value}</span>
                </dd>
              </div>
            ))}
          </dl>
          {summary.investLine && <p className="text-positive" style={{ fontWeight: 600, marginTop: 'var(--sp-4)' }}>{summary.investLine}</p>}
        </section>
      )}

      <section className="ledger-section compare-cta">
        <h2 className="card-title">These are not your numbers.</h2>
        <p>
          Every figure above is an illustrative estimate, not a quote. Open it in the calculator and replace the price, the rate, the years — the answer updates as you type, and the link you get back carries your version of the scenario.
        </p>
        <LinkButton to={openInCalculator} variant="primary" size="lg" iconRight={<IconArrowRight />}>
          Run it with your numbers
        </LinkButton>
      </section>

      <section className="ledger-section" aria-labelledby="compare-assumptions">
        <div className="eyebrow">What was assumed</div>
        <h2 id="compare-assumptions" className="card-title">
          The scenario behind the answer
        </h2>
        <p>{preset.description}</p>
        {def.assumptions && (
          <div className="chips" style={{ marginTop: 'var(--sp-3)' }}>
            {def.assumptions(inputs).map((a: { label: string; value: string }) => (
              <span key={a.label} className="chip" style={{ cursor: 'default' }} title={a.label}>
                {a.value}
              </span>
            ))}
          </div>
        )}
        <p className="micro muted" style={{ marginTop: 'var(--sp-3)' }}>
          <Link to="/methodology">How TrueCost Lab does the math</Link> — every formula, and what it leaves out.
        </p>
      </section>

      {related.length > 0 && (
        <section className="ledger-section" aria-labelledby="compare-related">
          <div className="eyebrow">Related</div>
          <h2 id="compare-related" className="card-title">
            Same calculator, different question
          </h2>
          <ul className="compare-list">
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={`/compare/${r.slug}`}>{r.question}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
