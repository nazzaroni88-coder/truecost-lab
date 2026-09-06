import type { Preset } from '../types';
import type { VehicleInputs, VehicleOption, VehicleShared } from '../../engine/calculators/vehicle';

/**
 * Illustrative presets. Prices, rates and running costs are rounded 2025-era estimates chosen to be
 * realistic, NOT live quotes. Every value is editable and the UI labels presets as examples.
 */

const baseOption: VehicleOption = {
  name: 'Option',
  price: 30000,
  paymentMethod: 'finance',
  downPayment: 5000,
  tradeInValue: 0,
  salesTaxRate: 7,
  fees: 500,
  apr: 6.5,
  termMonths: 60,
  fuelType: 'gas',
  mpg: 32,
  milesPerKwh: 3.8,
  insuranceAnnual: 1700,
  registrationAnnual: 200,
  maintenanceAnnual: 550,
  repairsAnnual: 250,
  tireSetCost: 700,
  tireIntervalMiles: 50000,
  firstYearDepreciation: 18,
  annualDepreciation: 11,
  resaleOverride: null,
};

const baseShared: VehicleShared = {
  annualMiles: 12000,
  gasPrice: 3.5,
  electricityRate: 0.17,
  ownershipYears: 5,
  investmentReturn: 7,
  costInflation: 2.5,
  fuelPriceGrowth: 2,
};

export const modelThree: VehicleOption = {
  ...baseOption,
  name: 'Tesla Model 3',
  price: 42000,
  fuelType: 'electric',
  milesPerKwh: 4.0,
  insuranceAnnual: 2100,
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
  name: 'Toyota Camry',
  price: 30000,
  fuelType: 'gas',
  mpg: 32,
  insuranceAnnual: 1700,
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
    name: 'Tesla Model 3 vs Toyota Camry',
    chip: 'Model 3 vs Camry',
    description: 'A popular EV against the best-selling gas sedan, financed over 5 years with 12,000 miles a year.',
    inputs: vehicleDefaults,
  },
  {
    id: 'ev-vs-gas',
    name: 'Electric sedan vs gasoline sedan',
    chip: 'EV vs gas',
    description: 'A generic $45k EV versus a comparable $32k gas sedan. Fuel and maintenance savings versus a higher price and faster depreciation.',
    inputs: {
      a: { ...baseOption, name: 'Electric sedan', price: 45000, fuelType: 'electric', milesPerKwh: 3.7, insuranceAnnual: 2000, maintenanceAnnual: 400, repairsAnnual: 200, tireSetCost: 950, tireIntervalMiles: 40000, firstYearDepreciation: 26, annualDepreciation: 15 },
      b: { ...baseOption, name: 'Gasoline sedan', price: 32000, fuelType: 'gas', mpg: 30, insuranceAnnual: 1700, maintenanceAnnual: 600, repairsAnnual: 300, firstYearDepreciation: 19, annualDepreciation: 12 },
      shared: { ...baseShared, ownershipYears: 6 },
    },
  },
  {
    id: 'hybrid-vs-gas',
    name: 'Hybrid vs gasoline version of the same car',
    chip: 'Hybrid vs gas',
    description: 'Pay about $3,000 more for a hybrid that gets 48 mpg instead of 32. Does the fuel saving cover the premium?',
    inputs: {
      a: { ...baseOption, name: 'Hybrid sedan', price: 33000, fuelType: 'gas', mpg: 48, insuranceAnnual: 1750, maintenanceAnnual: 550, repairsAnnual: 250, firstYearDepreciation: 17, annualDepreciation: 11 },
      b: { ...baseOption, name: 'Gas sedan', price: 30000, fuelType: 'gas', mpg: 32, insuranceAnnual: 1700, maintenanceAnnual: 550, repairsAnnual: 250, firstYearDepreciation: 18, annualDepreciation: 11 },
      shared: { ...baseShared, ownershipYears: 6 },
    },
  },
  {
    id: 'new-vs-used',
    name: 'New vs 3-year-old used',
    chip: 'New vs used',
    description: 'A $36k new compact SUV versus the same model at 3 years old for $24k, with higher used-car loan rates and repair costs.',
    inputs: {
      a: { ...baseOption, name: 'New compact SUV', price: 36000, apr: 6.0, mpg: 29, insuranceAnnual: 1800, maintenanceAnnual: 500, repairsAnnual: 150, firstYearDepreciation: 20, annualDepreciation: 12 },
      b: { ...baseOption, name: '3-year-old used SUV', price: 24000, apr: 8.5, mpg: 28, insuranceAnnual: 1600, maintenanceAnnual: 700, repairsAnnual: 650, firstYearDepreciation: 12, annualDepreciation: 11 },
      shared: { ...baseShared, ownershipYears: 5 },
    },
  },
  {
    id: 'finance-vs-cash',
    name: 'Finance vs pay cash for the same car',
    chip: 'Finance vs cash',
    description: 'Same $35k car. Finance at 6.9% and keep your cash invested, or pay cash and avoid the interest?',
    inputs: {
      a: { ...baseOption, name: 'Finance it (6.9%)', price: 35000, paymentMethod: 'finance', downPayment: 5000, apr: 6.9, termMonths: 60, mpg: 30 },
      b: { ...baseOption, name: 'Pay cash', price: 35000, paymentMethod: 'cash', downPayment: 0, apr: 0, mpg: 30 },
      shared: { ...baseShared, ownershipYears: 5, investmentReturn: 7 },
    },
  },
];

export const TERM_OPTIONS = [24, 36, 48, 60, 72, 84].map((m) => ({ value: m, label: `${m} mo · ${m / 12} yr` }));
