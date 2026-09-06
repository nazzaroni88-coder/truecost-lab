import type { ComponentType, ReactNode } from 'react';
import type { CalculatorMeta } from './meta';

export interface Preset<I> {
  id: string;
  name: string;
  description: string;
  inputs: I;
  /** Short label shown on the chip (defaults to name). */
  chip?: string;
}

export interface SummaryRow {
  label: string;
  value: string;
  tone?: 'a' | 'b' | 'neutral' | 'positive' | 'negative';
}

/** Compact, calculator-agnostic description of a result — used by the share card, copy summary, and scenario compare. */
/**
 * A category that actually creates the gap between the two options.
 *
 * Two absolute figures ("$23,506 vs $14,709") make the reader do the subtraction and then work out
 * which way it cuts. A driver states the difference, who pays it, and how much of the answer it
 * accounts for — which is the difference between a number and an insight.
 */
export interface SummaryDriver {
  label: string;
  /** How much more this category costs for `costlierFor`, always positive. */
  amount: number;
  /** The option this category is worse for. */
  costlierFor: 'a' | 'b';
  /** Name of that option, so a share card needs no other context. */
  costlierName: string;
  /** Fraction of the total gap this category accounts for, 0–1. */
  shareOfGap: number;
}

export interface ShareSummary {
  headline: string;
  sub: string;
  rows: SummaryRow[];
  winner: 'a' | 'b' | 'tie' | 'none';
  optionA?: string;
  optionB?: string;
  /** The single number most worth comparing across scenarios (signed, positive favors B / the recommendation). */
  keyMetric: number;
  keyMetricLabel: string;
  /** Biggest first. Optional: only two-option calculators have meaningful category drivers. */
  drivers?: SummaryDriver[];
  /** "Invest the difference" outcome, when the calculator projects one. */
  investLine?: string;
}

export interface Insight {
  question: string;
  answer: ReactNode;
}

export interface MethodologyItem {
  title: string;
  body: ReactNode;
  formula?: string;
}

export interface QuickAdjust<I> {
  key: string;
  label: string;
  get: (i: I) => number;
  set: (i: I, v: number) => I;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  help?: string;
}

export interface FormProps<I> {
  inputs: I;
  onChange: (i: I) => void;
}

export interface ResultsProps<I, R> {
  inputs: I;
  result: R;
  onChange: (i: I) => void;
}

export interface CalculatorDefinition<I, R> extends CalculatorMeta {
  defaults: I;
  presets: Preset<I>[];
  compute: (i: I) => R;
  /** Swap Option A and B, when the calculator has two options. */
  swap?: (i: I) => I;
  /** Validate/merge untrusted inputs (from a shared link or old local storage) into a safe shape. */
  normalize: (raw: unknown) => I;
  Form: ComponentType<FormProps<I>>;
  Results: ComponentType<ResultsProps<I, R>>;
  summary: (i: I, r: R) => ShareSummary;
  methodology: (i: I, r: R) => MethodologyItem[];
  insights: (i: I, r: R) => Insight[];
  quickAdjust?: (i: I) => QuickAdjust<I>[];
  /**
   * The handful of numbers the answer leans on hardest, shown as chips above the result.
   * A chip carrying `fieldId` becomes a button that jumps to that input, so "assumes 9.03% tax"
   * is a way into the form rather than a dead label.
   */
  assumptions?: (i: I) => { label: string; value: string; fieldId?: string }[];
  /**
   * Adapts a preset to what the user has already told us about themselves before it is loaded,
   * and before the shell asks "are the current inputs still this preset?".
   *
   * Without it, personalising an input would permanently un-match every preset, and loading an
   * example would silently discard the personal details already entered.
   */
  contextualizePreset?: (presetInputs: I, current: I) => I;
  /** Extra clause for the "showing the X example" banner, e.g. "with California suggestions". */
  presetNote?: (i: I) => string | null;
  /**
   * A short, content-derived name for a scenario ("Model 3 vs Camry, 5 yrs").
   * Used when creating scenarios so the tab strip and the compare table stay readable —
   * "Scenario 2" tells the user nothing when they are comparing four of them.
   */
  nameFor?: (i: I) => string;
}

/**
 * Defensive merge: keeps only keys present in `defaults`, coercing numbers/strings/booleans and
 * recursing into plain objects. Arrays are taken as-is if arrays. Anything else falls back.
 */
export function mergeWithDefaults<T>(defaults: T, raw: unknown): T {
  if (Array.isArray(defaults)) return (Array.isArray(raw) ? raw : defaults) as T;
  if (defaults && typeof defaults === 'object') {
    const out: Record<string, unknown> = {};
    const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    for (const [k, dv] of Object.entries(defaults as Record<string, unknown>)) {
      out[k] = mergeWithDefaults(dv, src[k]);
    }
    return out as T;
  }
  if (typeof defaults === 'number') {
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    return (Number.isFinite(n) ? n : defaults) as T;
  }
  if (typeof defaults === 'string') return (typeof raw === 'string' ? raw.slice(0, 200) : defaults) as T;
  if (typeof defaults === 'boolean') return (typeof raw === 'boolean' ? raw : defaults) as T;
  if (defaults === null) return (raw === null || typeof raw === 'number' ? raw : null) as T;
  return defaults;
}
