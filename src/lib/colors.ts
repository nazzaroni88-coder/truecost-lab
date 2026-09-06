/**
 * Chart colours resolve to CSS custom properties rather than literal hex values, so a single token
 * swap re-themes every chart, bar and legend. SVG `fill`/`stroke` and CSS `background` all accept
 * `var(...)`, which is what these are used for.
 *
 * The one place that cannot use them is the shared result card, which paints to a canvas: canvas
 * has no access to CSS variables, so `src/share/shareCard.ts` keeps its own light palette on
 * purpose (a shared image should look the same for everyone who receives it).
 */

/** Categories with a dedicated token in tokens.css. */
const NAMED_CATEGORIES = new Set([
  'depreciation',
  'interest',
  'taxes',
  'taxesFees',
  'fuel',
  'insurance',
  'maintenance',
  'repairs',
  'registration',
  'charger',
  'incentives',
  'rent',
  'propertyTax',
  'hoa',
  'pmi',
  'closing',
  'selling',
  'upfront',
  'replacements',
  'monthly',
  'annual',
  'oneTime',
  'savings',
  'resale',
  'appreciation',
  'contributions',
  'growth',
]);

/** Token aliases where the category key and the token name differ. */
const ALIASES: Record<string, string> = {
  taxesFees: 'taxes',
  contributions: 'contrib',
};

export function categoryColor(key: string, index = 0): string {
  if (NAMED_CATEGORIES.has(key)) return `var(--tc-cat-${ALIASES[key] ?? key})`;
  return `var(--tc-cat-${(index % 9) + 1})`;
}

/** The two options being compared. `*Strong` variants are text-safe in both themes. */
export const OPTION_COLORS = {
  a: 'var(--tc-a)',
  b: 'var(--tc-b)',
  aStrong: 'var(--tc-a-strong)',
  bStrong: 'var(--tc-b-strong)',
};
