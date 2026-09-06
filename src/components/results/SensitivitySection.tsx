import type { SensitivityRow } from '../../engine/core/sensitivity';
import type { QuickAdjust } from '../../calculators/types';
import { Tornado } from '../charts/Tornado';
import { Slider } from '../ui/Controls';
import { ResultSection } from './Sections';
import { fmtMoneyCompact } from '../../lib/format';

interface Props<I> {
  rows: SensitivityRow[];
  positiveLabel: string;
  negativeLabel: string;
  inputs: I;
  onChange: (i: I) => void;
  quickAdjust?: QuickAdjust<I>[];
  metricFormat?: (v: number) => string;
  id?: string;
  intro?: string;
}

export function SensitivitySection<I>({ rows, positiveLabel, negativeLabel, inputs, onChange, quickAdjust, metricFormat = fmtMoneyCompact, id, intro }: Props<I>) {
  const top = rows.slice(0, 3);
  const flippers = rows.filter((r) => r.flips);
  return (
    <ResultSection id={id} kicker="What matters most" title="Which assumptions drive this result" sub={intro ?? 'We re-ran the model with each assumption nudged to a plausible low and high value. Longer bars matter more. A bar crossing the dashed line means that assumption alone could flip the answer.'}>
      {top.length > 0 && (
        <p className="small" style={{ marginBottom: 'var(--sp-3)' }}>
          Your result is most sensitive to:{' '}
          {top.map((r, i) => (
            <span key={r.key}>
              <strong>{r.label.toLowerCase()}</strong>
              {i < top.length - 1 ? (i === top.length - 2 ? ', and ' : ', ') : '.'}
            </span>
          ))}{' '}
          {flippers.length === 0 ? (
            <span className="text-positive">None of the tested ranges flips the answer on its own — this is a fairly robust result.</span>
          ) : (
            <span>
              {flippers.length === 1 ? 'One assumption' : `${flippers.length} assumptions`} could flip the answer within a plausible range: {flippers.map((f) => f.label.toLowerCase()).join(', ')}.
            </span>
          )}
        </p>
      )}
      <Tornado rows={rows} positiveLabel={positiveLabel} negativeLabel={negativeLabel} metricFormat={metricFormat} />
      {quickAdjust && quickAdjust.length > 0 && (
        <div style={{ marginTop: 'var(--sp-5)' }}>
          <h3 style={{ fontSize: 'var(--fs-small)', marginBottom: 'var(--sp-3)' }}>Try it: nudge the big levers</h3>
          <div className="grid-2 collapse-xs" style={{ gap: 'var(--sp-4)' }}>
            {quickAdjust.map((q) => (
              <Slider key={q.key} label={q.label} value={q.get(inputs)} min={q.min} max={q.max} step={q.step} onChange={(v) => onChange(q.set(inputs, v))} format={q.format} help={q.help} />
            ))}
          </div>
        </div>
      )}
    </ResultSection>
  );
}
