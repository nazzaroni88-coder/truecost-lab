import type { Preset } from '../types';
import type { CustomInputs, CustomOption } from '../../engine/calculators/custom';

const blank: CustomOption = {
  name: 'Option',
  upfront: 0,
  monthly: 0,
  annual: 0,
  oneTime: [],
  monthlySavings: 0,
  annualSavings: 0,
  resaleValue: 0,
  lifespanYears: 0,
};

export const customDefaults: CustomInputs = {
  a: { ...blank, name: 'Budget washer', upfront: 600, annual: 90, lifespanYears: 6, resaleValue: 0 },
  b: { ...blank, name: 'Premium washer', upfront: 1400, annual: 40, lifespanYears: 14, resaleValue: 100 },
  horizonYears: 14,
  investmentReturn: 7,
  inflation: 2.5,
  growWithInflation: true,
};

export const customPresets: Preset<CustomInputs>[] = [
  {
    id: 'washer',
    name: 'Budget vs premium washing machine',
    chip: 'Budget vs premium appliance',
    description: 'A $600 machine that lasts 6 years and needs more repairs, versus a $1,400 one that lasts 14. Includes replacement cycles.',
    inputs: customDefaults,
  },
  {
    id: 'solar',
    name: 'Rooftop solar vs staying on the grid',
    chip: 'Solar vs grid',
    description: '$18,000 of panels that save $140 a month, with an inverter replacement in year 12, over 25 years.',
    inputs: {
      a: { ...blank, name: 'Stay on the grid' },
      b: { ...blank, name: 'Install solar', upfront: 18000, monthlySavings: 140, oneTime: [{ id: 'inv', label: 'Inverter replacement', amount: 2500, year: 12 }] },
      horizonYears: 25,
      investmentReturn: 7,
      inflation: 2.5,
      growWithInflation: true,
    },
  },
  {
    id: 'gym',
    name: 'Gym membership vs home gym',
    chip: 'Gym vs home gym',
    description: '$60 a month at the gym versus $2,500 of equipment you could sell for $500 later.',
    inputs: {
      a: { ...blank, name: 'Gym membership', monthly: 60 },
      b: { ...blank, name: 'Home gym', upfront: 2500, monthly: 10, resaleValue: 500 },
      horizonYears: 10,
      investmentReturn: 7,
      inflation: 2.5,
      growWithInflation: true,
    },
  },
  {
    id: 'phone',
    name: 'Buy a phone outright vs a monthly plan',
    chip: 'Buy phone vs plan',
    description: 'Buy a $1,000 phone every 3 years (and sell the old one for $200) versus a $35/month device plan forever.',
    inputs: {
      a: { ...blank, name: 'Buy outright', upfront: 1000, lifespanYears: 3, resaleValue: 200 },
      b: { ...blank, name: 'Monthly device plan', monthly: 35 },
      horizonYears: 6,
      investmentReturn: 7,
      inflation: 2.5,
      growWithInflation: true,
    },
  },
  {
    id: 'espresso',
    name: 'Espresso machine vs coffee shop',
    chip: 'Espresso vs coffee shop',
    description: 'About $120 a month at the café versus an $800 machine, $35 a month in beans, and a descaling kit every year.',
    inputs: {
      a: { ...blank, name: 'Coffee shop', monthly: 120 },
      b: { ...blank, name: 'Espresso machine', upfront: 800, monthly: 35, annual: 30, lifespanYears: 8, resaleValue: 100 },
      horizonYears: 8,
      investmentReturn: 7,
      inflation: 2.5,
      growWithInflation: true,
    },
  },
];
