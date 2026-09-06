/** Category → color mapping for cost breakdowns. Falls back to a rotating palette. */
const categoryColors: Record<string, string> = {
  depreciation: '#7a5af5',
  interest: '#e4574b',
  taxesFees: '#7d8a9c',
  fuel: '#f2a33a',
  insurance: '#23a99a',
  maintenance: '#4a8ff5',
  repairs: '#e06aa8',
  registration: '#b0b9c6',
  rent: '#f2a33a',
  propertyTax: '#7d8a9c',
  hoa: '#b0b9c6',
  pmi: '#c98bd8',
  closing: '#9aa5b5',
  selling: '#6b7484',
  upfront: '#7a5af5',
  replacements: '#a58bf7',
  monthly: '#f2a33a',
  annual: '#4a8ff5',
  oneTime: '#e06aa8',
  savings: '#23a99a',
  resale: '#167a4a',
  appreciation: '#167a4a',
  contributions: '#9fb8e6',
  growth: '#1b6ef3',
};

const fallback = ['#1b6ef3', '#f2a33a', '#7a5af5', '#23a99a', '#e06aa8', '#4a8ff5', '#7d8a9c', '#e4574b', '#b0b9c6'];

export function categoryColor(key: string, index = 0): string {
  return categoryColors[key] ?? fallback[index % fallback.length];
}

export const OPTION_COLORS = { a: '#1b6ef3', b: '#f0811f', aStrong: '#1256c7', bStrong: '#b85a08' };
