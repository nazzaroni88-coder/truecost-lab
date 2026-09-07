import { describe, expect, it } from 'vitest';
import { SHARE_FORMATS, renderShareCard, renderBrandCard, type CardCanvas } from '../shareCard';
import type { ShareSummary } from '../../calculators/types';

/**
 * A share image travels without its page.
 *
 * Everything qualifying the number — the EXAMPLE chips, the "illustrative estimates" note under the
 * preset row, the methodology panel — stays behind on the site. The card is the only artefact that
 * gets screenshotted into a group chat, so the disclosure has to be on the card itself, in every
 * shape, or the most assertive version of the claim is the one that travels furthest.
 */

/** Records every string the renderer draws, so the assertions are about output, not internals. */
function recordingCanvas(): { canvas: CardCanvas; texts: () => string[] } {
  const drawn: string[] = [];
  const ctx = new Proxy(
    {
      fillText: (t: string) => drawn.push(t),
      measureText: (t: string) => ({ width: t.length * 7 }),
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, fillRect: () => {},
      beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, arcTo: () => {}, arc: () => {},
      quadraticCurveTo: () => {}, closePath: () => {}, fill: () => {}, stroke: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
    } as unknown as CanvasRenderingContext2D,
    { get: (t, p) => (p in t ? (t as unknown as Record<string | symbol, unknown>)[p] : undefined), set: () => true },
  );
  return { canvas: { width: 0, height: 0, getContext: () => ctx }, texts: () => drawn };
}

const summary: ShareSummary = {
  headline: 'Toyota Camry Hybrid costs about $10,850 less over 5 years.',
  sub: 'True cost including depreciation, interest, fuel, insurance, maintenance and resale.',
  winner: 'b',
  optionA: 'Tesla Model 3',
  optionB: 'Toyota Camry Hybrid',
  keyMetric: -10850,
  keyMetricLabel: 'Difference',
  rows: [{ label: 'Tesla Model 3 true cost', value: '$56,102', tone: 'a' }],
  investLine: 'Invest the difference at 7.0% and it could be worth $12,750 after 5 years.',
};

describe('every share format carries the estimate disclosure', () => {
  for (const f of SHARE_FORMATS) {
    it(`${f.id} says the figures are illustrative and not live prices`, () => {
      const { canvas, texts } = recordingCanvas();
      renderShareCard(canvas, { calculatorName: 'Vehicle True Cost', scenarioName: 'Model 3 vs Camry', summary }, f.id, 1);
      const all = texts().join(' | ');
      expect(all, `${f.id} drew no caveat`).toContain('Illustrative estimates');
      // "not financial advice" alone let a reader assume the inputs were current market data.
      expect(all, `${f.id} does not disclaim live prices`).toContain('not live prices');
      expect(all, `${f.id} is unattributed`).toContain('Cents of Adventure');
    });
  }

  it('the brand card is attributed but does not disclaim an estimate it never makes', () => {
    const { canvas, texts } = recordingCanvas();
    renderBrandCard(canvas, { title: 'TrueCost Lab', sub: 'What will this decision actually cost?', items: ['Vehicles'] }, 'landscape', 1);
    const all = texts().join(' | ');
    expect(all).toContain('Cents of Adventure');
    expect(all).not.toContain('Illustrative estimates');
  });

  it('the winner and the figure survive onto the card', () => {
    const { canvas, texts } = recordingCanvas();
    renderShareCard(canvas, { calculatorName: 'Vehicle True Cost', summary }, 'portrait', 1);
    const all = texts().join(' ');
    expect(all).toContain('$10,850');
    expect(all).toContain('Toyota Camry Hybrid');
  });
});
