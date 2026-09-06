import type { Preset } from '../types';
import type { VehicleInputs, VehicleOption, VehicleShared } from '../../engine/calculators/vehicle';

/**
 * Illustrative vehicle presets.
 *
 * These are starting points, not quotes. Prices are manufacturer MSRP including destination, and
 * running costs are national averages — your own insurance quote, local fuel price and negotiated
 * price will differ, which is why every field is editable and the UI labels presets as examples.
 *
 * VERIFICATION LOG
 * 2026-09-06 — Checked against sources. Corrections made:
 *   • Toyota Camry has been HYBRID-ONLY since the 2025 redesign and returns ~51 mpg combined on
 *     the LE FWD, not the 32 mpg previously assumed. That error inflated its fuel cost by about
 *     60% and was the single largest mistake in the dataset.
 *   • Gas $3.50 → $4.14/gal (national average, early September 2026).
 *   • Electricity $0.17 → $0.183/kWh (EIA residential average, September 2026).
 *   • New-car APR 6.5% → 6.9%; used-car APR 8.5% → 11.4% (used-car financing is far dearer than
 *     the previous figure implied).
 *   • Insurance was badly low: gas $1,700 → $2,200 and EV $2,100 → $2,600. The 2026 averages are
 *     roughly $2,218 for gas and $3,159 for EVs across all model years; the EV gap narrows to
 *     about 18% on newer models, which is what a new-car comparison should use.
 *   • Model 3 $42,000 → $38,630 (Standard RWD, $36,990 + $1,640 destination) and Camry
 *     $30,000 → $30,295 (LE FWD, $29,100 + $1,195 destination), so the flagship preset compares
 *     base trim with base trim.
 * Depreciation rates remain modelled estimates rather than sourced figures — see the note below.
 */

/**
 * Depreciation is the one major input with no authoritative current source: it is a forecast about
 * used-vehicle prices several years out. These rates are conventional industry rules of thumb
 * (roughly 15–25% in year one, then 10–15% a year), with EVs set higher because they have
 * depreciated faster than comparable petrol cars. Treat them as the least reliable numbers here —
 * the sensitivity panel exists partly to show how much they move the answer.
 */
const baseOption: VehicleOption = {
  name: 'Option',
  price: 30000,
  paymentMethod: 'finance',
  downPayment: 5000,
  tradeInValue: 0,
  salesTaxRate: 7,
  fees: 500,
  apr: 6.9,
  termMonths: 60,
  fuelType: 'gas',
  mpg: 32,
  milesPerKwh: 3.8,
  insuranceAnnual: 2200,
  registrationAnnual: 200,
  maintenanceAnnual: 550,
  repairsAnnual: 250,
  tireSetCost: 700,
  tireIntervalMiles: 50000,
  firstYearDepreciation: 18,
  annualDepreciation: 11,
  resaleOverride: null,
  purchaseIncentive: 0,
  chargerCost: 0,
};

const baseShared: VehicleShared = {
  annualMiles: 12000,
  gasPrice: 4.14,
  electricityRate: 0.183,
  ownershipYears: 5,
  investmentReturn: 7,
  costInflation: 2.5,
  fuelPriceGrowth: 2,
};

export const modelThree: VehicleOption = {
  ...baseOption,
  name: 'Tesla Model 3',
  price: 38630, // Standard RWD: $36,990 MSRP + $1,640 destination
  fuelType: 'electric',
  milesPerKwh: 4.0,
  insuranceAnnual: 2600,
  registrationAnnual: 250,
  maintenanceAnnual: 400,
  repairsAnnual: 200,
  tireSetCost: 1000,
  tireIntervalMiles: 40000,
  firstYearDepreciation: 25,
  annualDepreciation: 15,
};

export const camry: VehicleOption = {
  ...baseOption,
  name: 'Toyota Camry Hybrid',
  price: 30295, // LE FWD: $29,100 MSRP + $1,195 destination
  fuelType: 'gas',
  mpg: 51, // EPA combined, LE FWD. Hybrid-only since the 2025 redesign.
  insuranceAnnual: 2200,
  maintenanceAnnual: 550,
  repairsAnnual: 250,
  firstYearDepreciation: 18,
  annualDepreciation: 11,
};

export const vehicleDefaults: VehicleInputs = {
  a: modelThree,
  b: camry,
  shared: baseShared,
};

export const vehiclePresets: Preset<VehicleInputs>[] = [
  {
    id: 'model3-vs-camry',
    name: 'Tesla Model 3 vs Toyota Camry Hybrid',
    chip: 'Model 3 vs Camry',
    description: 'Base trim against base trim: a $38,630 Model 3 Standard RWD versus a $30,295 Camry LE, which is hybrid-only now and returns about 51 mpg. Financed over 5 years at 12,000 miles a year.',
    inputs: vehicleDefaults,
  },
  {
    id: 'ev-vs-gas',
    name: 'Electric sedan vs gasoline sedan',
    chip: 'EV vs gas',
    description: 'A $45k EV against a comparable $32k petrol sedan that is not a hybrid. Fuel and maintenance savings versus a higher price and faster depreciation.',
    inputs: {
      a: { ...baseOption, name: 'Electric sedan', price: 45000, fuelType: 'electric', milesPerKwh: 3.7, insuranceAnnual: 2600, maintenanceAnnual: 400, repairsAnnual: 200, tireSetCost: 950, tireIntervalMiles: 40000, firstYearDepreciation: 26, annualDepreciation: 15 },
      b: { ...baseOption, name: 'Gasoline sedan', price: 32000, fuelType: 'gas', mpg: 30, insuranceAnnual: 2200, maintenanceAnnual: 600, repairsAnnual: 300, firstYearDepreciation: 19, annualDepreciation: 12 },
      shared: { ...baseShared, ownershipYears: 6 },
    },
  },
  {
    id: 'hybrid-vs-gas',
    name: 'Hybrid vs the gasoline version of the same car',
    chip: 'Hybrid vs gas',
    description: 'Pay about $3,000 more for a hybrid that returns 50 mpg instead of 32. At $4.14 a gallon, does the fuel saving cover the premium?',
    inputs: {
      a: { ...baseOption, name: 'Hybrid sedan', price: 33000, fuelType: 'gas', mpg: 50, insuranceAnnual: 2250, maintenanceAnnual: 550, repairsAnnual: 250, firstYearDepreciation: 17, annualDepreciation: 11 },
      b: { ...baseOption, name: 'Gas sedan', price: 30000, fuelType: 'gas', mpg: 32, insuranceAnnual: 2200, maintenanceAnnual: 550, repairsAnnual: 250, firstYearDepreciation: 18, annualDepreciation: 11 },
      shared: { ...baseShared, ownershipYears: 6 },
    },
  },
  {
    id: 'new-vs-used',
    name: 'New vs 3-year-old used',
    chip: 'New vs used',
    description: 'A $36k new compact SUV versus the same model at 3 years old for $24k. Used-car loans are much dearer — about 11.4% against 6.9% — and repairs cost more once the warranty is gone.',
    inputs: {
      a: { ...baseOption, name: 'New compact SUV', price: 36000, apr: 6.9, mpg: 29, insuranceAnnual: 2300, maintenanceAnnual: 500, repairsAnnual: 150, firstYearDepreciation: 20, annualDepreciation: 12 },
      b: { ...baseOption, name: '3-year-old used SUV', price: 24000, apr: 11.4, mpg: 28, insuranceAnnual: 2000, maintenanceAnnual: 700, repairsAnnual: 650, firstYearDepreciation: 12, annualDepreciation: 11 },
      shared: { ...baseShared, ownershipYears: 5 },
    },
  },
  {
    id: 'finance-vs-cash',
    name: 'Finance vs pay cash for the same car',
    chip: 'Finance vs cash',
    description: 'The same $35k car at the current average new-car rate of 6.9%. Finance it and keep your cash invested, or pay cash and avoid the interest? Note that a 6.9% APR compounds to about 7.1% a year, so it beats a 7% expected return.',
    inputs: {
      a: { ...baseOption, name: 'Finance it (6.9%)', price: 35000, paymentMethod: 'finance', downPayment: 5000, apr: 6.9, termMonths: 60, mpg: 30 },
      b: { ...baseOption, name: 'Pay cash', price: 35000, paymentMethod: 'cash', downPayment: 0, apr: 0, mpg: 30 },
      shared: { ...baseShared, ownershipYears: 5, investmentReturn: 7 },
    },
  },
];

export const TERM_OPTIONS = [24, 36, 48, 60, 72, 84].map((m) => ({ value: m, label: `${m} mo · ${m / 12} yr` }));
