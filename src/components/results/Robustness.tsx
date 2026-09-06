import type { SensitivityRow } from '../../engine/core/sensitivity';

export interface Robustness {
  tone: 'solid' | 'fragile';
  /** The claim, in the fewest words that are still true. */
  lead: string;
  detail: string;
  /** Assumptions that can flip the answer on their own, biggest swing first. */
  flippers: SensitivityRow[];
}

/**
 * Whether the answer survives being wrong about the inputs.
 *
 * This is the honest headline for a tool whose inputs are estimates. No calculator can know a
 * particular person's insurance premium or resale value, and pretending otherwise is where these
 * things lose trust — but it can re-run itself across the plausible range of each assumption and
 * report whether the conclusion moved. That question is answerable, and it is the one that decides
 * whether a reader should act on the number.
 *
 * The engine already computed it. It was just four sections below the answer it qualifies.
 */
export function robustnessOf(rows: SensitivityRow[]): Robustness | null {
  if (rows.length === 0) return null;
  const flippers = rows.filter((r) => r.flips).sort((a, b) => b.swing - a.swing);
  if (flippers.length === 0) {
    return {
      tone: 'solid',
      lead: 'This answer holds.',
      detail: `None of the ${rows.length} assumptions we tested flips it on its own, across a plausible range for each.`,
      flippers,
    };
  }
  const names = flippers.slice(0, 2).map((f) => f.label);
  const rest = flippers.length - names.length;
  return {
    tone: 'fragile',
    lead: 'This one is close.',
    detail:
      flippers.length === 1
        ? `${names[0]} alone could flip it within a plausible range, so treat the winner as unsettled until that number is yours.`
        : `${names.join(' and ')}${rest > 0 ? ` and ${rest} other${rest === 1 ? '' : 's'}` : ''} could each flip it on their own, so treat the winner as unsettled until those numbers are yours.`,
    flippers,
  };
}

/** The verdict on the verdict, sitting with the answer rather than four sections below it. */
export function RobustnessNote({ rows, link = true }: { rows: SensitivityRow[]; link?: boolean }) {
  const r = robustnessOf(rows);
  if (!r) return null;
  return (
    <p className={`robustness ${r.tone}`}>
      <strong>{r.lead}</strong> {r.detail}
      {/* Only where there is a tornado on the page to jump to. */}
      {link && (
        <>
          {' '}
          <a href="#sensitivity" className="micro">
            What matters most
          </a>
        </>
      )}
    </p>
  );
}
