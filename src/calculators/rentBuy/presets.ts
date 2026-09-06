import type { Preset } from '../types';
import type { RentBuyInputs } from '../../engine/calculators/rentBuy';

/**
 * Illustrative presets — starting points, not market data for your area.
 *
 * VERIFICATION LOG
 * 2026-09-06 — Checked against sources. Corrections made:
 *   • Home price $450,000 → $410,000 (US median existing-home price was about $407,700 in
 *     July 2026).
 *   • Rent $2,500 → $2,000 (national average asking rent for a single-family house was about
 *     $2,018; apartments are lower, so compare like with like against the home you would buy).
 *   • Mortgage 6.5% → 6.75% (30-year fixed averaged 6.71–6.73% in early September 2026).
 *   • Home insurance $1,800 → $2,500 a year (the national average is roughly $2,490 for $400,000
 *     of dwelling coverage, and has risen sharply).
 * Property tax at 1.1% of value remains the conventional national-average figure; it varies from
 * under 0.4% to over 2% by state, so it is worth replacing with your own. Appreciation and rent
 * growth at 3% are long-run assumptions, not forecasts.
 */
export const rentBuyDefaults: RentBuyInputs = {
  monthlyRent: 2000,
  rentGrowth: 3,
  rentersInsuranceAnnual: 200,
  homePrice: 410000,
  downPaymentPct: 20,
  mortgageApr: 6.75,
  mortgageTermYears: 30,
  propertyTaxRate: 1.1,
  homeInsuranceAnnual: 2500,
  hoaMonthly: 0,
  maintenanceRate: 1,
  closingCostsPct: 3,
  sellingCostsPct: 6,
  appreciation: 3,
  pmiRate: 0,
  horizonYears: 10,
  investmentReturn: 7,
  inflation: 2.5,
};

export const rentBuyPresets: Preset<RentBuyInputs>[] = [
  {
    id: 'typical',
    name: '$2,000 rent vs $410,000 home',
    chip: '$2k rent vs $410k home',
    description: 'Close to the national medians: a $410k home with 20% down at 6.75%, against $2,000 rent, staying 10 years. Note that the median home for sale and the median home for rent are not the same house — this pairing implies a price-to-rent ratio of about 17. Replace both numbers with a home and a rental you would actually choose between.',
    inputs: rentBuyDefaults,
  },
  {
    id: 'hcol',
    name: 'High-cost city: $3,800 rent vs $850,000 condo',
    chip: 'Big-city condo',
    description: 'Expensive market with a $600 HOA. Renting and investing often wins on paper here — see how long you would need to stay.',
    inputs: { ...rentBuyDefaults, monthlyRent: 3800, homePrice: 850000, hoaMonthly: 600, propertyTaxRate: 0.9, homeInsuranceAnnual: 2200, maintenanceRate: 0.6, rentGrowth: 3.5, appreciation: 3 },
  },
  {
    id: 'affordable',
    name: 'Affordable market: $1,400 rent vs $250,000 house',
    chip: 'Affordable market',
    description: 'Where prices are low relative to rent, buying tends to win sooner.',
    inputs: { ...rentBuyDefaults, monthlyRent: 1400, homePrice: 250000, propertyTaxRate: 1.4, homeInsuranceAnnual: 2100, maintenanceRate: 1.2, appreciation: 3 },
  },
  {
    id: 'short-stay',
    name: 'Only staying 4 years',
    chip: 'Short stay (4 yrs)',
    description: 'The same $410k home, but you expect to move in 4 years. Closing and selling costs loom large.',
    inputs: { ...rentBuyDefaults, horizonYears: 4 },
  },
  {
    id: 'low-down',
    name: '10% down with PMI',
    chip: '10% down + PMI',
    description: 'A smaller down payment keeps more cash invested but adds PMI and a bigger loan.',
    inputs: { ...rentBuyDefaults, downPaymentPct: 10, pmiRate: 0.6 },
  },
];

export const MORTGAGE_TERMS = [15, 20, 30].map((y) => ({ value: y, label: `${y}-year fixed` }));
