import type { SensitivityRow } from '../../engine/core/sensitivity';
import { requestFieldFocus } from '../../lib/focusField';

/**
 * The two or three numbers that actually decide this answer, as a way into them.
 *
 * A first-time visitor sees an answer built from thirty-five inputs and has no idea which ones are
 * worth their attention. Most are not: change the tire life by a fifth and nothing moves; change
 * the depreciation rate by three points and the winner can change. The model already ranks them by
 * how far each moves the result, so the ranking is read from the sensitivity rows rather than
 * hand-picked — a curated list would go stale the moment the engine's variables changed.
 *
 * Ordered by swing, not by whether they flip the answer: at the defaults nothing flips, and a strip
 * that disappeared exactly when the answer looked settled would be missing on first run, which is
 * the run it exists for.
 */
export function KeyLevers({ rows, fieldIdFor, limit = 3 }: { rows: SensitivityRow[]; fieldIdFor: (key: string) => string | undefined; limit?: number }) {
  const top = [...rows]
    .sort((a, b) => b.swing - a.swing)
    .slice(0, limit)
    .map((r) => ({ row: r, id: fieldIdFor(r.key) }));
  if (top.length === 0) return null;

  return (
    <div className="key-levers">
      <span className="lab">Change the answer</span>
      {top.map(({ row, id }) =>
        id ? (
          <button key={row.key} type="button" className="chip chip-jump" title={`${row.label} — currently ${row.format(row.base)}. Tested between ${row.format(row.low)} and ${row.format(row.high)}.`} onClick={() => requestFieldFocus(id)}>
            {row.label}
          </button>
        ) : (
          <span key={row.key} className="chip" style={{ cursor: 'default' }} title={`${row.label} — currently ${row.format(row.base)}`}>
            {row.label}
          </span>
        ),
      )}
    </div>
  );
}
