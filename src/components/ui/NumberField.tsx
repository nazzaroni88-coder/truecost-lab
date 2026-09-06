import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { InfoTip } from './InfoTip';
import { useInvalidFields } from '../forms/InvalidFields';

export type NumberFormat = 'currency' | 'percent' | 'number';

/**
 * Where the value in a field came from, shown as a small badge beside the label.
 *
 * The point is that a form full of plausible numbers is otherwise indistinguishable from a form
 * full of the user's own numbers, and only one of those is worth trusting a decision to.
 */
export interface FieldOriginBadge {
  tone: 'user' | 'suggested' | 'example' | 'estimate';
  label: string;
  title?: string;
}

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  format?: NumberFormat;
  /** Overrides the default prefix/suffix derived from `format`. */
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Display decimals when formatting on blur. Defaults: currency 0, percent 2, number 0. */
  decimals?: number;
  help?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  /** Where this value came from: the user's own entry, a state suggestion, an example, a forecast. */
  origin?: FieldOriginBadge;
  /** Compact label for narrow layouts. */
  className?: string;
  autoComplete?: string;
}

function parseLoose(s: string): number | null {
  const cleaned = s.replace(/[$,%\s]/g, '').replace(/[−–]/g, '-');
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatForDisplay(v: number, format: NumberFormat, decimals: number): string {
  if (!Number.isFinite(v)) return '';
  if (format === 'currency' || format === 'number') {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(v);
  }
  // percent: show up to `decimals` but trim trailing zeros
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(v);
}

export function NumberField({ label, value, onChange, format = 'number', prefix, suffix, min, max, step, decimals, help, hint, placeholder, disabled, id, origin, className, autoComplete = 'off' }: NumberFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const dec = decimals ?? (format === 'percent' ? 2 : format === 'currency' ? 0 : 2);
  const [text, setText] = useState(() => formatForDisplay(value, format, dec));
  const [focused, setFocused] = useState(false);
  const lastValue = useRef(value);

  // Sync from outside when not focused (preset loads, resets, swaps).
  useEffect(() => {
    if (!focused && value !== lastValue.current) {
      lastValue.current = value;
      setText(formatForDisplay(value, format, dec));
    } else if (!focused) {
      // also re-format on format change
      setText((t) => (parseLoose(t) === value ? formatForDisplay(value, format, dec) : t));
    }
  }, [value, focused, format, dec]);

  const parsed = parseLoose(text);
  const outOfRange = parsed !== null && ((min !== undefined && parsed < min) || (max !== undefined && parsed > max));
  // Out-of-range values are flagged immediately, even while typing: the field is showing a number
  // the results were NOT computed from, and staying silent until blur hides that mismatch.
  const invalid = outOfRange || (!focused && parsed === null);
  const usedValue = formatForDisplay(value, format, dec);
  let error: string | null = null;
  if (!focused && parsed === null) error = 'Enter a number';
  else if (outOfRange && min !== undefined && parsed! < min) error = `Minimum is ${formatForDisplay(min, format, dec)} — still using ${usedValue}`;
  else if (outOfRange && max !== undefined && parsed! > max) error = `Maximum is ${formatForDisplay(max, format, dec)} — still using ${usedValue}`;

  // Report to the calculator shell so the results can show a "check your inputs" state.
  const fields = useInvalidFields();
  const setInvalid = fields?.setInvalid;
  useEffect(() => {
    setInvalid?.(inputId, invalid ? label : null);
  }, [setInvalid, inputId, invalid, label]);
  useEffect(() => () => setInvalid?.(inputId, null), [setInvalid, inputId]);

  const commit = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    lastValue.current = v;
    onChange(v);
  };

  const handleChange = (s: string) => {
    setText(s);
    const n = parseLoose(s);
    if (n !== null) {
      // Live-update while typing but don't clamp yet (clamp on blur) so typing "1" toward "12" isn't blocked by min.
      const within = (min === undefined || n >= min) && (max === undefined || n <= max);
      if (within) {
        lastValue.current = n;
        onChange(n);
      }
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const n = parseLoose(text);
    if (n === null) {
      setText(formatForDisplay(value, format, dec));
      return;
    }
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    if (v !== value) commit(v);
    setText(formatForDisplay(v, format, dec));
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const base = parseLoose(text) ?? value;
    const s = step ?? (format === 'percent' ? 0.25 : Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.max(1, Math.abs(base)))) - 1)));
    const mult = e.shiftKey ? 10 : 1;
    const next = Number((base + (e.key === 'ArrowUp' ? 1 : -1) * s * mult).toFixed(6));
    let v = next;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    commit(v);
    setText(formatForDisplay(v, format, dec));
  };

  const pre = prefix ?? (format === 'currency' ? '$' : undefined);
  const suf = suffix ?? (format === 'percent' ? '%' : undefined);
  const descId = `${inputId}-desc`;

  return (
    <div className={`field ${className ?? ''}`}>
      <label className="field-label" htmlFor={inputId}>
        <span>{label}</span>
        {help && <InfoTip text={help} label={`About ${label}`} />}
        {origin && (
          <span className={`origin-badge origin-${origin.tone}`} title={origin.title}>
            {origin.label}
          </span>
        )}
      </label>
      <div className={`field-control ${invalid ? 'invalid' : ''}`}>
        {pre && (
          <span className="field-affix prefix" aria-hidden="true">
            {pre}
          </span>
        )}
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete={autoComplete}
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={hint || error ? descId : undefined}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKey}
        />
        {suf && (
          <span className="field-affix suffix" aria-hidden="true">
            {suf}
          </span>
        )}
      </div>
      {error ? (
        <div className="field-error" id={descId} role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="field-hint" id={descId}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
