import type { Preset } from '../types';
import type { RentBuyInputs } from '../../engine/calculators/rentBuy';

/** Illustrative presets — rounded estimates, not market data. */
export const rentBuyDefaults: RentBuyInputs = {
  monthlyRent: 2500,
  rentGrowth: 3,
  rentersInsuranceAnnual: 200,
  homePrice: 450000,
  downPaymentPct: 20,
  mortgageApr: 6.5,
  mortgageTermYears: 30,
  propertyTaxRate: 1.1,
  homeInsuranceAnnual: 1800,
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
    name: '$2,500 rent vs $450,000 home',
    chip: '$2.5k rent vs $450k home',
    description: 'A typical mid-market comparison: 20% down at 6.5%, staying 10 years, 3% appreciation and 3% rent growth.',
    inputs: rentBuyDefaults,
  },
  {
    id: 'hcol',
    name: 'High-cost city: $3,800 rent vs $850,000 condo',
    chip: 'Big-city condo',
    description: 'Expensive market with a $600 HOA. Renting and investing often wins on paper here — see how long you would need to stay.',
    inputs: { ...rentBuyDefaults, monthlyRent: 3800, homePrice: 850000, hoaMonthly: 600, propertyTaxRate: 0.9, homeInsuranceAnnual: 1400, maintenanceRate: 0.6, rentGrowth: 3.5, appreciation: 3 },
  },
  {
    id: 'affordable',
    name: 'Affordable market: $1,400 rent vs $250,000 house',
    chip: 'Affordable market',
    description: 'Where prices are low relative to rent, buying tends to win sooner.',
    inputs: { ...rentBuyDefaults, monthlyRent: 1400, homePrice: 250000, propertyTaxRate: 1.4, homeInsuranceAnnual: 1500, maintenanceRate: 1.2, appreciation: 3 },
  },
  {
    id: 'short-stay',
    name: 'Only staying 4 years',
    chip: 'Short stay (4 yrs)',
    description: 'The same $450k home, but you expect to move in 4 years. Closing and selling costs loom large.',
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
