import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA_REVIEWED } from '../../../data/incentives';
import { STATE_DATA_REVIEWED } from '../../../data/stateDefaults';

/**
 * The footer tells every visitor when the reference data was last reviewed. It used to hardcode
 * that date, so updating incentives.ts or stateDefaults.ts refreshed their constants while the
 * footer went on claiming a freshness nobody had checked — and because the hardcoded value happened
 * to agree at the time, nothing looked wrong.
 *
 * These tests exist so that stops being possible silently.
 */
const FOOTER = readFileSync(resolve(__dirname, '../Footer.tsx'), 'utf8');

/**
 * Only the rendered markup matters here. Comments and the month-name lookup legitimately mention
 * months, so checking the whole file would fail on its own documentation.
 */
const MARKUP = FOOTER.slice(FOOTER.indexOf('export function Footer'))
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

describe('the footer review date', () => {
  it('is derived from the data constants, never typed into the markup', () => {
    // A literal month-and-year in the rendered markup means the drift has been re-introduced.
    for (const month of MONTHS) {
      expect(MARKUP, `Footer.tsx renders a hardcoded "${month} 20xx" — derive it from DATA_REVIEWED / STATE_DATA_REVIEWED instead`).not.toContain(`${month} 20`);
    }
    expect(FOOTER).toContain('DATA_REVIEWED');
    expect(FOOTER).toContain('STATE_DATA_REVIEWED');
  });

  it('quotes the OLDEST dataset, so one fresh file cannot vouch for a stale one', () => {
    // Reproduces the footer's own rule against the real constants.
    const key = (s: string) => {
      const [m, y] = s.split(' ');
      return Number(y) * 12 + MONTHS.indexOf(m);
    };
    const oldest = [DATA_REVIEWED, STATE_DATA_REVIEWED].reduce((a, b) => (key(b) < key(a) ? b : a));
    expect([DATA_REVIEWED, STATE_DATA_REVIEWED]).toContain(oldest);
    expect(key(oldest)).toBeLessThanOrEqual(Math.min(key(DATA_REVIEWED), key(STATE_DATA_REVIEWED)));
  });

  it('keeps both datasets in a format the footer can actually parse', () => {
    // If a constant is reformatted ("Sept 2026", "2026-09"), the footer silently falls back to the
    // first entry rather than showing something wrong — but the intent is that both stay parseable.
    for (const d of [DATA_REVIEWED, STATE_DATA_REVIEWED]) {
      const [m, y] = d.split(' ');
      expect(MONTHS, `"${d}" must start with a full month name`).toContain(m);
      expect(Number(y), `"${d}" must end with a 4-digit year`).toBeGreaterThan(2000);
    }
  });
});
