import { useState } from 'react';
import { fmtMoney, fmtMoneyCompact } from '../../lib/format';

export interface StackSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}
export interface StackRow {
  key: string;
  label: string;
  tone?: 'a' | 'b';
  segments: StackSegment[];
  /** Amount recovered at the end (resale, equity) — drawn as an outlined "give-back" marker. */
  recovered?: number;
  total: number;
}

/**
 * Horizontal stacked bars sharing one scale. Pure CSS/flex so it reflows on narrow screens,
 * with a hover/focus tooltip per segment and a shared legend.
 */
export function StackedBars({ rows, ariaLabel }: { rows: StackRow[]; ariaLabel: string }) {
  const [tip, setTip] = useState<{ row: string; seg: string } | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.segments.reduce((p, s) => p + Math.max(0, s.value), 0)));
  const legendKeys = new Map<string, StackSegment>();
  rows.forEach((r) => r.segments.forEach((s) => s.value > 0 && !legendKeys.has(s.key) && legendKeys.set(s.key, s)));

  return (
    <div className="stack-sm" role="img" aria-label={ariaLabel}>
      {rows.map((r) => {
        const gross = r.segments.reduce((p, s) => p + Math.max(0, s.value), 0);
        return (
          <div key={r.key} style={{ display: 'grid', gap: 4 }}>
            <div className="row-between" style={{ fontSize: 'var(--fs-small)' }}>
              <strong className={r.tone ? `text-${r.tone}` : ''} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                {r.label}
              </strong>
              <span className="num">
                <span className="muted">{Math.abs(gross - r.total) > 1 ? `${fmtMoneyCompact(gross)} spent → ` : ''}</span>
                <strong>{fmtMoney(r.total)}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', background: 'var(--tc-surface-2)', position: 'relative' }}>
              {r.segments
                .filter((s) => s.value > 0)
                .map((s) => {
                  const w = (s.value / max) * 100;
                  const active = tip && tip.row === r.key && tip.seg === s.key;
                  return (
                    <div
                      key={s.key}
                      tabIndex={0}
                      title={`${s.label}: ${fmtMoney(s.value)}`}
                      aria-label={`${s.label}: ${fmtMoney(s.value)}`}
                      onMouseEnter={() => setTip({ row: r.key, seg: s.key })}
                      onMouseLeave={() => setTip(null)}
                      onFocus={() => setTip({ row: r.key, seg: s.key })}
                      onBlur={() => setTip(null)}
                      style={{ width: `${w}%`, background: s.color, opacity: tip && !active ? 0.55 : 1, transition: 'opacity 120ms', position: 'relative', outline: 'none', boxShadow: active ? 'inset 0 0 0 2px var(--tc-surface)' : undefined }}
                    >
                      {active && (
                        <div className="chart-tip" style={{ left: '50%', top: 0 }}>
                          {s.label}: <strong>{fmtMoney(s.value)}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              {r.recovered !== undefined && r.recovered > 0 && (
                <div
                  title={`Recovered at the end: ${fmtMoney(r.recovered)}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${Math.max(0, ((gross - r.recovered) / max) * 100)}%`,
                    width: `${(Math.min(r.recovered, gross) / max) * 100}%`,
                    background: 'repeating-linear-gradient(135deg, var(--tc-recovered-hatch) 0 4px, transparent 4px 8px)',
                    borderLeft: '2px solid var(--tc-surface)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="legend" style={{ marginTop: 8 }}>
        {[...legendKeys.values()].map((s) => (
          <span key={s.key} className="item">
            <span className="sw" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        {rows.some((r) => r.recovered && r.recovered > 0) && (
          <span className="item">
            <span className="sw" style={{ background: 'repeating-linear-gradient(135deg, var(--tc-ink-4) 0 2px, var(--tc-surface) 2px 4px)', border: '1px solid var(--tc-line-strong)' }} />
            Recovered at the end (resale / equity)
          </span>
        )}
      </div>
    </div>
  );
}
