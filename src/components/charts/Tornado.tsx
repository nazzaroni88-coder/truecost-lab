import type { SensitivityRow } from '../../engine/core/sensitivity';
import { fmtMoneyCompact } from '../../lib/format';
import { IconWarning } from '../ui/Icons';

interface Props {
  rows: SensitivityRow[];
  /** Label used for a positive metric (e.g. "B cheaper") and negative. */
  positiveLabel: string;
  negativeLabel: string;
  max?: number;
  metricFormat?: (v: number) => string;
}

/**
 * Tornado chart: for each variable, shows how far the result moves when the variable is set to
 * its low and high test value. Bars extend left/right from the base result. A bar that crosses
 * the dashed "flip" line means the recommendation could change.
 */
export function Tornado({ rows, positiveLabel, negativeLabel, max = 6, metricFormat = fmtMoneyCompact }: Props) {
  const shown = rows.slice(0, max);
  if (!shown.length) return null;
  const base = shown[0].metricBase;
  const maxDev = Math.max(1, ...shown.map((r) => Math.max(Math.abs(r.metricLow - base), Math.abs(r.metricHigh - base))));
  const zeroOffset = -base / maxDev; // −1..1 if the flip line is visible

  return (
    <div className="tornado">
      <div className="tornado-axis micro muted">
        <span>← {negativeLabel}</span>
        <span>Now: {metricFormat(base)}</span>
        <span>{positiveLabel} →</span>
      </div>
      {shown.map((r) => {
        const lo = (r.metricLow - base) / maxDev;
        const hi = (r.metricHigh - base) / maxDev;
        const seg = (v: number, cls: string, label: string) => {
          const left = v < 0 ? 50 + v * 50 : 50;
          const width = Math.abs(v) * 50;
          return <div className={`${cls} ${r.flips ? 'flip' : ''}`} style={{ left: `${left}%`, width: `${Math.max(width, 0.6)}%` }} title={label} />;
        };
        const leftVal = Math.min(r.metricLow, r.metricHigh);
        const rightVal = Math.max(r.metricLow, r.metricHigh);
        return (
          <div className="tornado-row" key={r.key}>
            <div className="tornado-label">
              <span className="nm" title={r.label}>
                {r.label}
                {r.flips && (
                  <span className="flip-badge" style={{ marginLeft: 6 }}>
                    <IconWarning /> could flip
                  </span>
                )}
              </span>
              <span className="rg">
                {r.format(r.low)} – {r.format(r.high)} <span className="muted">(now {r.format(r.base)})</span>
              </span>
            </div>
            <div className="tornado-track">
              <span className="tornado-amt num">{metricFormat(leftVal)}</span>
              <div className="tornado-bar" role="img" aria-label={`${r.label}: result ranges from ${metricFormat(r.metricLow)} to ${metricFormat(r.metricHigh)}`}>
                <div className="mid" />
                {Math.abs(zeroOffset) <= 1 && Math.abs(base) > 1 && <div className="flip-line" style={{ left: `${50 + zeroOffset * 50}%` }} title="Where the answer flips" />}
                {seg(lo, 'seg-lo', `At ${r.format(r.low)}: ${metricFormat(r.metricLow)}`)}
                {seg(hi, 'seg-hi', `At ${r.format(r.high)}: ${metricFormat(r.metricHigh)}`)}
              </div>
              <span className="tornado-amt num right">{metricFormat(rightVal)}</span>
            </div>
          </div>
        );
      })}
      <div className="legend" style={{ marginTop: 2 }}>
        <span className="item">
          <span className="sw" style={{ background: 'var(--tc-a)' }} /> at the low value
        </span>
        <span className="item">
          <span className="sw" style={{ background: 'var(--tc-b)' }} /> at the high value
        </span>
        <span className="item">
          <span className="sw" style={{ borderLeft: '2px dashed var(--tc-warning)', background: 'transparent', width: 4 }} /> where the answer flips
        </span>
      </div>
    </div>
  );
}
