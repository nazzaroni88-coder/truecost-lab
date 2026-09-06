/**
 * Number formatting helpers. Internal math keeps full precision; only display rounds.
 */

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(decimals: number): Intl.NumberFormat {
  const key = String(decimals);
  let f = moneyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    moneyFormatters.set(key, f);
  }
  return f;
}

/** $27,430 — negative values render as −$1,200 (with a true minus sign). */
export function fmtMoney(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const rounded = Number(abs.toFixed(decimals));
  const s = moneyFormatter(decimals).format(rounded);
  return v < 0 && rounded !== 0 ? `−${s}` : s;
}

/** Compact money for tight spaces: $27.4k, $1.2M. */
export function fmtMoneyCompact(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${trimZeros((abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1))}M`;
  if (abs >= 10_000) return `${sign}$${trimZeros((abs / 1000).toFixed(abs >= 100_000 ? 0 : 1))}k`;
  if (abs >= 1000) return `${sign}$${trimZeros((abs / 1000).toFixed(1))}k`;
  return `${sign}$${Math.round(abs)}`;
}

function trimZeros(s: string): string {
  return s.replace(/\.0+$/, '');
}

/**
 * Plain number. Positive `decimals` = fraction digits; negative = round to 10^-decimals
 * (e.g. -2 rounds to the nearest hundred).
 */
export function fmtNumber(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) return '—';
  if (decimals < 0) {
    const unit = Math.pow(10, -decimals);
    return new Intl.NumberFormat('en-US').format(Math.round(v / unit) * unit);
  }
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
}

/** 6.5 → "6.5%". Input is already a percentage (not a decimal). */
export function fmtPct(v: number, decimals = 1): string {
  if (!Number.isFinite(v)) return '—';
  return `${fmtNumber(v, decimals)}%`;
}

/** "1 year" / "10 years" — for whole-number horizons used in headlines and table captions. */
export function yearsLabel(years: number): string {
  const n = Math.round(years);
  return `${fmtNumber(n, 0)} ${n === 1 ? 'year' : 'years'}`;
}

/** Generic pluralizer: plural(1, 'month') → "1 month". */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${fmtNumber(n, 0)} ${Math.abs(n) === 1 ? singular : pluralForm}`;
}

/** Years, with sensible pluralization and month handling for fractions. */
export function fmtYears(years: number): string {
  if (!Number.isFinite(years)) return '—';
  if (years < 1) {
    const m = Math.max(1, Math.round(years * 12));
    return `${m} month${m === 1 ? '' : 's'}`;
  }
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (months === 0 || months === 12) {
    const y = months === 12 ? whole + 1 : whole;
    return `${y} year${y === 1 ? '' : 's'}`;
  }
  return `${whole} yr ${months} mo`;
}

/** Months → "3 years, 4 months" */
export function fmtMonthsLong(months: number): string {
  if (!Number.isFinite(months) || months < 0) return '—';
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} year${y === 1 ? '' : 's'}`);
  if (m > 0 || y === 0) parts.push(`${m} month${m === 1 ? '' : 's'}`);
  return parts.join(', ');
}

/** Rounds a display headline to a "sensible" precision: nearest $10 under $10k, $100 above. */
export function roundHeadline(v: number): number {
  const abs = Math.abs(v);
  const unit = abs >= 100_000 ? 100 : abs >= 10_000 ? 50 : abs >= 1000 ? 10 : 1;
  return Math.round(v / unit) * unit;
}

/** Signed money with explicit + / − for deltas. */
export function fmtDelta(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) < 0.5) return fmtMoney(0, decimals);
  return v > 0 ? `+${fmtMoney(v, decimals)}` : fmtMoney(v, decimals);
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** Add months to a date (for payoff dates). */
export function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  out.setMonth(out.getMonth() + Math.round(months));
  return out;
}

/**
 * Nominal APR (as a percentage, e.g. 6.9) → the effective annual rate it actually costs when
 * charged monthly. Used to make loan rates comparable with investment returns, which TrueCost
 * quotes as effective annual rates.
 */
export function effectiveAnnual(aprPercent: number): number {
  if (!Number.isFinite(aprPercent)) return 0;
  return (Math.pow(1 + aprPercent / 100 / 12, 12) - 1) * 100;
}
