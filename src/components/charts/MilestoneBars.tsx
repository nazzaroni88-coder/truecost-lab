import { fmtMoney, fmtMoneyCompact } from '../../lib/format';
import { categoryColor } from '../../lib/colors';

export interface MilestoneDatum {
  years: number;
  value: number;
  contributions: number;
  growth: number;
  beyondHorizon?: boolean;
}

/** Four stacked columns (contributions vs growth) for 5/10/20/30-year projections. */
export function MilestoneBars({ milestones, ariaLabel, height = 200 }: { milestones: MilestoneDatum[]; ariaLabel: string; height?: number }) {
  const max = Math.max(1, ...milestones.map((m) => Math.max(0, m.value)));
  const w = 100 / milestones.length;
  const contribColor = categoryColor('contributions');
  const growthColor = categoryColor('growth');
  const labelH = 34;
  return (
    <div className="chart">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }} role="img" aria-label={ariaLabel}>
        {milestones.map((m, i) => {
          const usable = height - labelH - 18;
          const total = Math.max(0, m.value);
          const contrib = Math.max(0, Math.min(m.contributions, total));
          const hTotal = (total / max) * usable;
          const hContrib = (contrib / max) * usable;
          const x = i * w + w * 0.2;
          const bw = w * 0.6;
          const yBase = height - labelH;
          return (
            <g key={m.years}>
              <rect x={x} y={yBase - hTotal} width={bw} height={Math.max(0, hTotal - hContrib)} fill={growthColor} rx={0} />
              <rect x={x} y={yBase - hContrib} width={bw} height={hContrib} fill={contribColor} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${milestones.length}, 1fr)`, marginTop: -labelH, height: labelH, alignItems: 'start' }}>
        {milestones.map((m) => (
          <div key={m.years} style={{ textAlign: 'center', lineHeight: 1.2 }}>
            <div className="num" style={{ fontWeight: 600, fontSize: 'var(--fs-small)' }}>
              {fmtMoneyCompact(m.value)}
            </div>
            <div className="micro muted">{m.years} yrs</div>
          </div>
        ))}
      </div>
      <div className="legend" style={{ marginTop: 6 }}>
        <span className="item">
          <span className="sw" style={{ background: contribColor }} /> Money you put in
        </span>
        <span className="item">
          <span className="sw" style={{ background: growthColor }} /> Projected growth
        </span>
      </div>
      <span className="sr-only">{milestones.map((m) => `${m.years} years: ${fmtMoney(m.value)} (${fmtMoney(m.contributions)} contributed, ${fmtMoney(m.growth)} growth)`).join('. ')}</span>
    </div>
  );
}
