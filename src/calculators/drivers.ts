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
      return {
        label: labelFor(k),
        amount: Math.abs(delta),
        costlierFor: (delta > 0 ? 'a' : 'b') as 'a' | 'b',
        costlierName: delta > 0 ? aName : bName,
        shareOfGap: denominator ? Math.abs(delta) / denominator : 0,
      };
    })
    .filter((d) => d.amount > 1 && (!denominator || d.shareOfGap >= MIN_SHARE))
    .sort((x, y) => y.amount - x.amount)
    .slice(0, 4);
}
