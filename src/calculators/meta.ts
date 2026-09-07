import type { CalcIconKind } from '../components/ui/Icons';

export interface CalculatorMeta {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  /** The decision, phrased the way someone would ask it. Leads the card. */
  question: string;
  tagline: string;
  description: string;
  icon: CalcIconKind;
}

export const CALCULATORS: CalculatorMeta[] = [
  {
    id: 'vehicle',
    slug: 'vehicle',
    name: 'Vehicle True Cost',
    shortName: 'Vehicle',
    question: 'Which car actually costs less to own?',
    tagline: 'Car A vs Car B, EV vs gas, new vs used, finance vs cash.',
    description: 'Depreciation, interest, fuel or electricity, insurance, maintenance, taxes and resale — the whole cost of owning a car, not just the payment.',
    icon: 'vehicle',
  },
  {
    id: 'rent-buy',
    slug: 'rent-vs-buy',
    name: 'Rent vs Buy',
    shortName: 'Rent vs Buy',
    question: 'Should I rent or buy?',
    tagline: 'Cash flow and wealth, not just rent vs mortgage payment.',
    description: 'Compares renting and investing the difference against buying and building equity, with closing costs, maintenance, taxes, appreciation and selling costs.',
    icon: 'home',
  },
  {
    id: 'debt-invest',
    slug: 'debt-vs-invest',
    name: 'Debt vs Invest',
    shortName: 'Debt vs Invest',
    question: 'Pay off the loan, or invest the money?',
    tagline: 'Should extra money go to the loan or the market?',
    description: 'Pits a guaranteed interest saving against an uncertain investment return, and tells you the return you would need to come out ahead.',
    icon: 'debt',
  },
  {
    id: 'purchase-invest',
    slug: 'purchase-vs-invest',
    name: 'Purchase vs Invest',
    shortName: 'Purchase vs Invest',
    question: 'What is this purchase really costing me?',
    tagline: 'What is this purchase really worth in future dollars?',
    description: 'Shows the long-term opportunity cost of a one-time or recurring purchase — without shaming you for spending.',
    icon: 'purchase',
  },
  {
    id: 'custom',
    slug: 'custom-comparison',
    name: 'Custom Comparison',
    shortName: 'Custom',
    question: 'Is option A or option B cheaper over time?',
    tagline: 'Any Option A vs Option B, with upfront, ongoing and future costs.',
    description: 'A flexible TrueCost comparison for anything: appliances, subscriptions, solar, memberships, phones, or a decision we have not built a calculator for yet.',
    icon: 'custom',
  },
];

export function calculatorBySlug(slug: string): CalculatorMeta | undefined {
  return CALCULATORS.find((c) => c.slug === slug);
}
export function calculatorById(id: string): CalculatorMeta | undefined {
  return CALCULATORS.find((c) => c.id === id);
}
export function calculatorPath(id: string): string {
  const c = calculatorById(id);
  return c ? `/calculators/${c.slug}` : '/';
}
