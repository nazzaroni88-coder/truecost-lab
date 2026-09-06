import { CALCULATORS } from '../calculators/meta';

/**
 * Every route that gets its own pre-rendered link preview.
 *
 * The card is drawn client-side into a canvas, which no crawler runs — so a shared link used to
 * unfurl as bare text everywhere: X, Threads, Slack, WhatsApp, iMessage. The build pre-renders one
 * image per route and writes a real HTML file per route carrying the matching tags.
 *
 * Calculator entries are derived from CALCULATORS so a new calculator cannot ship without a
 * preview; ogRoutes.test.ts fails if that link is ever broken.
 */
export interface OgRoute {
  /** App path, no base prefix, no leading slash for nested pages. "" is the homepage. */
  path: string;
  /** Page <title>. */
  title: string;
  /** Meta description and og:description. */
  description: string;
  /** Basename of the generated PNG, without extension. */
  image: string;
  /** Alt text for the preview image. */
  alt: string;
  /** Which renderer draws it: a calculator's default result, or the brand card. */
  kind: 'result' | 'brand';
  /** For result cards, the calculator to compute. */
  calculatorId?: string;
}

const BRAND_ITEMS = CALCULATORS.map((c) => c.name);

export const OG_ROUTES: OgRoute[] = [
  {
    path: '',
    title: 'TrueCost Lab — What will this decision actually cost?',
    description: 'Sticker prices and monthly payments hide the real cost of cars, homes, debt and big purchases. TrueCost Lab adds up depreciation, interest, insurance, maintenance, taxes and resale — then shows what happens if you invest the difference.',
    image: 'home',
    alt: 'TrueCost Lab — what will this decision actually cost?',
    kind: 'brand',
  },
  ...CALCULATORS.map(
    (c): OgRoute => ({
      path: `calculators/${c.slug}`,
      title: `${c.name} — TrueCost Lab`,
      description: c.description,
      image: `calculator-${c.slug}`,
      alt: `${c.name}: an example result from TrueCost Lab`,
      kind: 'result',
      calculatorId: c.id,
    }),
  ),
  {
    path: 'methodology',
    title: 'How TrueCost Lab does the math — TrueCost Lab',
    description: 'One method underneath every calculator: turn each choice into a stream of monthly cash flows plus what you get back at the end, then compare the streams honestly — including timing. Conventions, formulas and known limitations.',
    image: 'methodology',
    alt: 'How TrueCost Lab does the math',
    kind: 'brand',
  },
  {
    path: 'about',
    title: 'About TrueCost Lab — a Cents of Adventure tool',
    description: 'TrueCost Lab is a decision engine from Cents of Adventure. It exists because the most expensive financial mistakes are rarely about the price tag — they are about everything the price tag leaves out.',
    image: 'about',
    alt: 'About TrueCost Lab, a Cents of Adventure tool',
    kind: 'brand',
  },
];

/** Headline and supporting line for the routes that have no result to show. */
export function brandCardCopy(route: OgRoute): { title: string; sub: string; items: string[] } {
  if (route.path === 'methodology') {
    return {
      title: 'Every formula, and what it leaves out.',
      sub: 'Monthly cash flows, nominal APR compounded monthly for loans, effective annual returns for investments — and a written list of the known limitations.',
      items: BRAND_ITEMS,
    };
  }
  if (route.path === 'about') {
    return {
      title: 'The price tag is the part that lies.',
      sub: 'A decision engine from Cents of Adventure. Free, private, and honest about its own assumptions — nothing you type leaves your browser.',
      items: BRAND_ITEMS,
    };
  }
  return {
    title: 'What will this decision actually cost?',
    sub: 'Depreciation, interest, insurance, maintenance, taxes and resale — the whole cost of a big decision, plus what happens if you invest the difference.',
    items: BRAND_ITEMS,
  };
}
