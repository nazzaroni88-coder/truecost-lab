import type { SummaryDriver } from './types';

/** Below a dollar the "gap" is rounding noise, and every share would be a meaningless huge number. */
const EPS_GAP = 1;
/** A category worth under 2% of the answer is trivia on a share card. */
const MIN_SHARE = 0.02;

interface Category {
  key: string;
  label: string;
  amount: number;
}

/**
 * Ranks the categories that actually create the gap between two options.
 *
 * "Depreciation $23,506 vs $14,709" makes the reader do the subtraction and then work out which way
 * it cuts. A driver states the difference, who pays it, and how much of the answer it accounts for.
 *
 * Only meaningful where the two options are decomposed into the *same* categories, so that a
 * per-category difference sums back to the headline gap. Calculators comparing two strategies for
 * the same money (rent vs buy, debt vs invest) have no such decomposition and pass no drivers
 * rather than inventing one.
 */
export function summaryDrivers(aCats: Category[], bCats: Category[], aName: string, bName: string, gap: number): SummaryDriver[] {
  const keys = Array.from(new Set([...aCats.map((c) => c.key), ...bCats.map((c) => c.key)]));
  const amountFor = (cats: Category[], k: string) => cats.find((c) => c.key === k)?.amount ?? 0;
  const labelFor = (k: string) => aCats.find((c) => c.key === k)?.label ?? bCats.find((c) => c.key === k)?.label ?? k;
  const denominator = Math.abs(gap) > EPS_GAP ? Math.abs(gap) : 0;
  return keys
    .map((k) => {
      const delta = amountFor(aCats, k) - amountFor(bCats, k);
      /*
       * The ratio decides what is trivia; only a ratio at or below 1 is worth *printing*.
       *
       * Categories push in opposite directions and cancel, so one can exceed the gap it helps
       * create: solar has $57,385 of savings against $18,000 of panels for a $39,385 gap, making
       * the savings line 156% of the answer. True, and useless — "156% of the difference" reads as
       * a bug. But such a category is the biggest driver there is, so it must still rank and still
       * be shown; only the percentage is withheld. Filtering on the reported share instead would
       * have deleted exactly the lines that matter most.
       */
      const amount = Math.abs(delta);
      const ratio = denominator ? amount / denominator : 0;
      return {
        label: labelFor(k),
        amount,
        costlierFor: (delta > 0 ? 'a' : 'b') as 'a' | 'b',
        costlierName: delta > 0 ? aName : bName,
        ratio,
        shareOfGap: ratio > 0 && ratio <= 1 ? ratio : 0,
      };
    })
    .filter((d) => d.amount > 1 && (!denominator || d.ratio >= MIN_SHARE))
    .sort((x, y) => y.amount - x.amount)
    .slice(0, 4)
    // `ratio` is a filtering aid, not part of the published shape.
    .map(({ ratio: _ratio, ...d }) => d);
}
