import { createContext, useContext, type ReactNode } from 'react';

/**
 * What the answer is standing on, in one line, beside the answer.
 *
 * Provenance already existed — EXAMPLE chips over the preset row, per-field state suggestions,
 * source links in the methodology panel, a warning under the preset chips. All of it sat in the
 * inputs column or three sections below the result, so the number itself carried no indication of
 * whether it came from figures the reader had checked or from an illustration.
 *
 * This is deliberately not another pill. The page already has an "Assumes" chip row; a second row
 * of tokens would compete with the answer rather than qualify it.
 */
export interface Provenance {
  /** Leaf inputs the reader has actually changed. */
  edited: number;
  /** Name of the example the scenario started from, if it still is one. */
  presetName?: string;
}

const Ctx = createContext<Provenance | null>(null);

export function ProvenanceProvider({ value, children }: { value: Provenance | null; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProvenance(): Provenance | null {
  return useContext(Ctx);
}

/**
 * Counts leaves that differ between two input objects.
 *
 * Compared leaf-by-leaf rather than by JSON equality because the answer is "how much of this is
 * yours", not "is any of it yours" — one edited field and twenty read very differently to someone
 * deciding whether to trust the number.
 */
export function countEdited(current: unknown, baseline: unknown): number {
  if (current === baseline) return 0;
  if (typeof current !== 'object' || current === null || typeof baseline !== 'object' || baseline === null) {
    return Object.is(current, baseline) ? 0 : 1;
  }
  if (Array.isArray(current) || Array.isArray(baseline)) {
    return JSON.stringify(current) === JSON.stringify(baseline) ? 0 : 1;
  }
  const keys = new Set([...Object.keys(current as object), ...Object.keys(baseline as object)]);
  let n = 0;
  for (const k of keys) {
    // Bookkeeping the reader never typed: which fields the app itself marked, not their figures.
    if (k === 'provenance') continue;
    n += countEdited((current as Record<string, unknown>)[k], (baseline as Record<string, unknown>)[k]);
  }
  return n;
}

/** The sentence itself, so the wording is testable without rendering. */
export function provenanceLine(p: Provenance): string {
  if (p.presetName && p.edited === 0) {
    return `Every figure here comes from the ${p.presetName} example — illustrative estimates, not live prices. Change any input and this answer updates.`;
  }
  if (p.edited === 0) return 'Every figure here is a starting estimate, not a live price. Change any input and this answer updates.';
  const n = p.edited === 1 ? '1 figure is yours' : `${p.edited} figures are yours`;
  const rest = p.presetName ? `the rest still come from the ${p.presetName} example` : 'the rest are starting estimates';
  return `${n}; ${rest}. Everything above is calculated from them, not looked up.`;
}
