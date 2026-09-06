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
 * the zero line means the recommendation could flip.
 */
export function Tornado({ rows, positiveLabel, negativeLabel, max = 6, metricFormat = fmtMoneyCompact }: Props) {
  const shown = rows.slice(0, max);
  if (!shown.length) return null;
  const base = shown[0].metricBase;
  // Scale relative to the base: distance from base to each test outcome.
  const maxDev = Math.max(1, ...shown.map((r) => Math.max(Math.abs(r.metricLow - base), Math.abs(r.metricHigh - base))));
  // Where does zero sit relative to the base, in the same units? Draw a zero marker if within range.
  const zeroOffset = -base / maxDev; // −1..1 if visible

  return (
    <div className="tornado">
      <div className="row-between micro muted" style={{ padding: '0 0 2px' }}>
        <span>← {negativeLabel}</span>
        <span>Base result: {metricFormat(base)}</span>
        <span>{positiveLabel} →</span>
      </div>
      {shown.map((r) => {
        const lo = (r.metricLow - base) / maxDev; // −1..1
        const hi = (r.metricHigh - base) / maxDev;
        const seg = (v: number, cls: string, label: string) => {
          const left = v < 0 ? 50 + v * 50 : 50;
          const width = Math.abs(v) * 50;
          return (
            <div className={`${cls} ${r.flips ? 'flip' : ''}`} style={{ left: `${left}%`, width: `${Math.max(width, 0.6)}%` }} title={label} />
          );
        };
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
            <div className="tornado-bar" role="img" aria-label={`${r.label}: result ranges from ${metricFormat(r.metricLow)} to ${metricFormat(r.metricHigh)}`}>
              <div className="mid" />
              {Math.abs(zeroOffset) <= 1 && Math.abs(base) > 1 && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${50 + zeroOffset * 50}%`, width: 0, borderLeft: '2px dashed var(--tc-warning)' }} title="Where the answer flips" />}
              {seg(lo, 'seg-lo', `At ${r.format(r.low)}: ${metricFormat(r.metricLow)}`)}
              {seg(hi, 'seg-hi', `At ${r.format(r.high)}: ${metricFormat(r.metricHigh)}`)}
              <span className="amt" style={{ left: 4 }}>
                {metricFormat(Math.min(r.metricLow, r.metricHigh))}
              </span>
              <span className="amt" style={{ right: 4 }}>
                {metricFormat(Math.max(r.metricLow, r.metricHigh))}
              </span>
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
