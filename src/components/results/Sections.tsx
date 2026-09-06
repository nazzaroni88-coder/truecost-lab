import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Insight, MethodologyItem } from '../../calculators/types';
import { IconChevron, IconClock, IconLightbulb, IconQuestion, IconTarget } from '../ui/Icons';

/** Standard results card with a numbered kicker ("Why?", "What matters most", ...). */
export function ResultSection({ kicker, title, sub, children, id, className, right }: { kicker?: string; title: string; sub?: ReactNode; children: ReactNode; id?: string; className?: string; right?: ReactNode }) {
  return (
    <section className={`card card-pad ${className ?? ''}`} id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
        <div>
          {kicker && <div className="eyebrow" style={{ color: 'var(--tc-primary-strong)' }}>{kicker}</div>}
          <h2 id={id ? `${id}-title` : undefined} className="card-title" style={{ marginTop: kicker ? 4 : 0 }}>
            {title}
          </h2>
          {sub && <p className="card-sub">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function BreakEvenList({ items }: { items: { key: string; label: string; text: string }[] }) {
  if (!items.length) return <p className="muted small">No break-even points found within plausible ranges — the answer holds across the values we tested.</p>;
  return (
    <div className="be-list">
      {items.map((b) => (
        <div className="be-item" key={b.key}>
          <div className="ico">{b.key === 'crossover' || b.key === 'horizon' ? <IconClock /> : <IconTarget />}</div>
          <div>
            <div className="lab">{b.label}</div>
            <div>{b.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InsightsList({ items }: { items: Insight[] }) {
  return (
    <div className="insights">
      {items.map((it) => (
        <details className="insight" key={it.question}>
          <summary>
            <span className="q">
              <IconQuestion />
            </span>
            <span>{it.question}</span>
            <IconChevron className="chev" width={18} height={18} />
          </summary>
          <div className="body">{it.answer}</div>
        </details>
      ))}
    </div>
  );
}

export function MethodologyPanel({ items, assumptions, id }: { items: MethodologyItem[]; assumptions?: { label: string; value: string }[]; id?: string }) {
  return (
    <ResultSection id={id} kicker="Show me the math" title="How this was calculated" sub="Every formula, with your numbers plugged in. Nothing is hidden.">
      <div className="method-list">
        {items.map((m) => (
          <details className="disclosure" key={m.title}>
            <summary>
              <span>{m.title}</span>
              <IconChevron className="chev" width={18} height={18} />
            </summary>
            <div className="disclosure-body">
              <div className="method-item">
                <div className="d">{m.body}</div>
                {m.formula && <pre className="formula">{m.formula}</pre>}
              </div>
            </div>
          </details>
        ))}
        {assumptions && assumptions.length > 0 && (
          <details className="disclosure">
            <summary>
              <span>Assumptions in this scenario</span>
              <IconChevron className="chev" width={18} height={18} />
            </summary>
            <div className="disclosure-body">
              <dl className="kv">
                {assumptions.map((a) => (
                  <div key={a.label} style={{ display: 'contents' }}>
                    <dt>{a.label}</dt>
                    <dd>{a.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
        )}
      </div>
      <p className="micro muted" style={{ marginTop: 'var(--sp-3)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <IconLightbulb width={14} height={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Results are estimates based on the assumptions you entered. Projected investment returns are not guaranteed. TrueCost Lab is an educational tool, not personalized financial advice. Read the full <Link to="/methodology">methodology</Link>.
        </span>
      </p>
    </ResultSection>
  );
}
