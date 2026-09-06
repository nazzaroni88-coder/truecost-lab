import { useMemo, useState, type PointerEvent } from 'react';
import { useMeasure } from '../../lib/useMeasure';
import { fmtMoneyCompact } from '../../lib/format';

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
  area?: boolean;
}

export interface LineMarker {
  x: number;
  label: string;
}

interface Props {
  x: number[]; // x values (e.g. years) — same length as each series
  series: LineSeries[];
  height?: number;
  yFormat?: (v: number) => string;
  xFormat?: (v: number) => string;
  markers?: LineMarker[];
  ariaLabel: string;
  /** Show a horizontal line at zero. */
  zeroLine?: boolean;
  /** Tooltip formatter for a given index. */
  tooltip?: (index: number) => { title: string; rows: { label: string; value: string; color?: string }[] };
}

function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

export function LineChart({ x, series, height = 240, yFormat = fmtMoneyCompact, xFormat = (v) => `${v}`, markers = [], ariaLabel, zeroLine, tooltip }: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>(600);
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 52, r: 14, t: 14, b: 30 };
  const innerW = Math.max(40, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;

  const { xMin, xMax, yTicks, yMin, yMax } = useMemo(() => {
    const xs = x.length ? x : [0, 1];
    let lo = Infinity,
      hi = -Infinity;
    for (const s of series) for (const v of s.values) if (Number.isFinite(v)) (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
    if (!Number.isFinite(lo)) (lo = 0), (hi = 1);
    if (zeroLine) (lo = Math.min(lo, 0)), (hi = Math.max(hi, 0));
    if (hi === lo) hi = lo + 1;
    const ticks = niceTicks(lo, hi);
    return { xMin: xs[0], xMax: xs[xs.length - 1], yTicks: ticks, yMin: ticks[0], yMax: ticks[ticks.length - 1] };
  }, [x, series, zeroLine]);

  const sx = (v: number) => pad.l + ((v - xMin) / (xMax - xMin || 1)) * innerW;
  const sy = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const paths = series.map((s) => {
    let d = '';
    s.values.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      d += `${d ? 'L' : 'M'}${sx(x[i]).toFixed(1)},${sy(v).toFixed(1)}`;
    });
    let area = '';
    if (s.area && d) {
      area = `${d}L${sx(x[x.length - 1]).toFixed(1)},${sy(Math.max(yMin, 0)).toFixed(1)}L${sx(x[0]).toFixed(1)},${sy(Math.max(yMin, 0)).toFixed(1)}Z`;
    }
    return { ...s, d, area };
  });

  const xTicks = useMemo(() => {
    const span = xMax - xMin;
    const step = span <= 6 ? 1 : span <= 12 ? 2 : span <= 30 ? 5 : 10;
    const t: number[] = [];
    for (let v = Math.ceil(xMin); v <= xMax; v += step) t.push(v);
    if (t[t.length - 1] !== xMax && span > 0) t.push(xMax);
    return t;
  }, [xMin, xMax]);

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const frac = (px - pad.l) / innerW;
    const target = xMin + frac * (xMax - xMin);
    let best = 0,
      bestD = Infinity;
    x.forEach((v, i) => {
      const d = Math.abs(v - target);
      if (d < bestD) (bestD = d), (best = i);
    });
    setHover(best);
  };

  const tip = hover !== null && tooltip ? tooltip(hover) : null;

  /*
   * Screen readers get nothing useful from an SVG path, so the underlying numbers are also rendered
   * as a real (visually hidden) table.
   *
   * Sampling by even index spacing was wrong twice over: with 61 monthly points and yearly labels
   * it emitted two rows both headed "yr 4", and it filed month 10's value under "yr 1". Group the
   * points by the label they actually format to, and within each group take the point sitting
   * closest to a whole unit — which is the one the rounded label names. Where a format is not
   * lossy every group is a single point and the rule does nothing. Then thin if there are too many.
   */
  const summaryIdx = useMemo(() => {
    const n = x.length;
    if (n <= 1) return [0];
    const groups = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const label = xFormat(x[i]);
      const g = groups.get(label);
      if (g) g.push(i);
      else groups.set(label, [i]);
    }
    const off = (i: number) => Math.abs(x[i] - Math.round(x[i]));
    const mids = [...groups.values()].map((g) => g.reduce((best, i) => (off(i) < off(best) ? i : best), g[0]));
    if (mids.length <= 7) return mids;
    const thinned = new Set<number>();
    for (let k = 0; k < 7; k++) thinned.add(mids[Math.round((k * (mids.length - 1)) / 6)]);
    return [...thinned].sort((p, q) => p - q);
  }, [x, xFormat]);

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="presentation" aria-hidden="true" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <g className="grid">
          {yTicks.map((t) => (
            <line key={t} x1={pad.l} x2={pad.l + innerW} y1={sy(t)} y2={sy(t)} />
          ))}
        </g>
        <g className="axis">
          <line x1={pad.l} x2={pad.l + innerW} y1={pad.t + innerH} y2={pad.t + innerH} />
        </g>
        {zeroLine && yMin < 0 && yMax > 0 && <line x1={pad.l} x2={pad.l + innerW} y1={sy(0)} y2={sy(0)} stroke="var(--tc-ink-4)" strokeWidth={1.5} />}
        {yTicks.map((t) => (
          <text key={`yl${t}`} x={pad.l - 8} y={sy(t) + 4} textAnchor="end">
            {yFormat(t)}
          </text>
        ))}
        {xTicks.map((t) => (
          <text key={`xl${t}`} x={sx(t)} y={pad.t + innerH + 18} textAnchor="middle">
            {xFormat(t)}
          </text>
        ))}
        {paths.map((p) => p.area && <path key={`a${p.key}`} d={p.area} fill={p.color} fillOpacity={0.08} />)}
        {markers.map((m) => (
          <g key={`m${m.x}`}>
            <line x1={sx(m.x)} x2={sx(m.x)} y1={pad.t} y2={pad.t + innerH} stroke="var(--tc-ink-4)" strokeDasharray="3 3" />
            <text x={sx(m.x) + 4} y={pad.t + 10} textAnchor="start" fontSize={10} fill="var(--tc-ink-2)">
              {m.label}
            </text>
          </g>
        ))}
        {paths.map((p) => (
          <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={2.25} strokeDasharray={p.dashed ? '6 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover !== null && (
          <g>
            <line x1={sx(x[hover])} x2={sx(x[hover])} y1={pad.t} y2={pad.t + innerH} stroke="var(--tc-ink-3)" strokeWidth={1} />
            {series.map((s) => Number.isFinite(s.values[hover]) && <circle key={s.key} cx={sx(x[hover])} cy={sy(s.values[hover])} r={4} fill="var(--tc-surface)" stroke={s.color} strokeWidth={2} />)}
          </g>
        )}
      </svg>
      {/* A bare table ignores the 1px width of .sr-only (tables size to their content), so it has to
          live inside a wrapper that can actually clip it. */}
      <div className="sr-only">
        <table>
          <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Point</th>
            {series.map((s) => (
              <th scope="col" key={s.key}>
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summaryIdx.map((i) => (
            <tr key={i}>
              <th scope="row">{xFormat(x[i])}</th>
              {series.map((s) => (
                <td key={s.key}>{Number.isFinite(s.values[i]) ? yFormat(s.values[i]) : '—'}</td>
              ))}
            </tr>
          ))}
          </tbody>
        </table>
      </div>
      {tip && hover !== null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(x[hover]), 70), width - 70), top: pad.t + 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{tip.title}</div>
          {tip.rows.map((r) => (
            <div key={r.label} style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
              <span style={{ color: r.color ?? 'var(--tc-inverse-ink-2)' }}>{r.label}</span>
              <span className="num">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
