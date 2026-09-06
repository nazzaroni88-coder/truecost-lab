import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CALCULATORS } from '../calculators/meta';
import { COMPARISONS } from '../content/comparisons';

/**
 * The hub for the comparison pages.
 *
 * Grouped by calculator rather than listed flat: the grouping is the one piece of structure that is
 * true about the content — these questions differ by what they weigh, not by how popular they are.
 */
/**
 * The opening sentence of an intro, as a one-line summary.
 *
 * Splitting on ". " and adding a full stop back gave "the warranty is gone.." whenever the intro
 * was a single sentence, because the split returned it with its own punctuation intact.
 */
function firstSentence(text: string): string {
  const end = text.indexOf('. ');
  return end === -1 ? text : `${text.slice(0, end)}.`;
}

export default function ComparisonsIndexPage() {
  useEffect(() => {
    document.title = 'Worked comparisons — TrueCost Lab';
    return () => {
      document.title = 'TrueCost Lab — What will this decision actually cost?';
    };
  }, []);

  const groups = CALCULATORS.map((c) => ({ meta: c, items: COMPARISONS.filter((x) => x.calculatorId === c.id) })).filter((g) => g.items.length > 0);

  return (
    <div className="container compare-page">
      <nav aria-label="Breadcrumb" className="small muted" style={{ marginBottom: 'var(--sp-3)' }}>
        <Link to="/">TrueCost Lab</Link> <span aria-hidden="true">›</span> <span>Comparisons</span>
      </nav>

      <header className="compare-head">
        <h1>Worked comparisons</h1>
        <p className="lead">
          {COMPARISONS.length} decisions people actually argue about, each run through the model with realistic numbers. Every one opens in the calculator so you can replace the assumptions with your own.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.meta.id} className="ledger-section" aria-labelledby={`group-${g.meta.id}`}>
          <div className="eyebrow">{g.meta.shortName}</div>
          <h2 id={`group-${g.meta.id}`} className="card-title">
            {g.meta.tagline}
          </h2>
          <ul className="compare-list">
            {g.items.map((c) => (
              <li key={c.slug}>
                <Link to={`/compare/${c.slug}`}>{c.question}</Link>
                <span className="micro muted">{firstSentence(c.intro)}</span>
              </li>
            ))}
          </ul>
          <p className="micro" style={{ marginTop: 'var(--sp-3)' }}>
            <Link to={`/calculators/${g.meta.slug}`} style={{ fontWeight: 600 }}>
              Open {g.meta.name} →
            </Link>
          </p>
        </section>
      ))}
    </div>
  );
}
