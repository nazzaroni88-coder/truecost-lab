/**
 * Per-state starting numbers for the Vehicle calculator.
 *
 * These are STATEWIDE AVERAGES used to give a new user a plausible starting point instead of one
 * national guess. They are not quotes, not personalised, and not live: every value here is a static
 * snapshot typed into this file by hand from the sources named below. The UI must always label them
 * as suggestions and must never overwrite a number the user has edited.
 *
 * -- VERIFICATION LOG --------------------------------------------------------------------------
 * 6 September 2026 - all four columns typed from the sources below. First version of this file;
 * nothing carried over from a previous revision.
 *
 *   salesTaxRate     Tax Foundation, "State and Local Sales Tax Rates as of July 1, 2026".
 *                    Combined state rate + population-weighted average local rate.
 *                    https://taxfoundation.org/data/all/state/2026-sales-tax-rates-midyear/
 *
 *   gasPrice         AAA state averages for regular unleaded, retrieved 6 September 2026.
 *                    Rounded to the cent from AAA's four-decimal figures.
 *                    https://gasprices.aaa.com/state-gas-price-averages/
 *
 *   electricityRate  U.S. EIA Electric Power Monthly, Table 5.6.A, residential sector, June 2026.
 *                    Converted from cents/kWh to dollars/kWh and rounded to three decimals.
 *                    https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a
 *
 *   evFeeAnnual      Tax Foundation, "Electric Vehicles: EV Taxes by State", July 2026. Annual
 *                    statewide registration surcharge on battery EVs, rounded to the dollar.
 *                    https://taxfoundation.org/data/all/state/electric-vehicle-ev-taxes/
 *
 * -- KNOWN LIMITS (say these out loud in the UI, do not quietly paper over them) -----------------
 * - salesTaxRate is the GENERAL sales tax rate. A number of states tax a vehicle purchase under a
 *   separate regime instead (a motor-vehicle excise, highway-use or title ad-valorem tax) at a rate
 *   that is not this one. We do not model those, so the field help tells the user to check.
 * - Local rates are population-weighted averages. A specific address can be well above or below.
 * - gasPrice is a single day's snapshot of a number that moves weekly. It is a starting point.
 * - electricityRate is the residential average across all usage, not an EV or time-of-use rate,
 *   and not the price of public fast charging.
 * - evFeeAnnual is the statewide surcharge only. It is not the whole registration bill, which also
 *   depends on county, vehicle value and weight. Some states offer a per-mile option instead, and
 *   Iowa, Kentucky, Oklahoma and Wisconsin additionally tax public charging per kWh.
 * - Insurance is deliberately absent. Published state averages disagree with each other by well
 *   over $500/yr because they assume different drivers and coverage, and an individual premium
 *   varies more by driver than by state. Suggesting one would look precise while being wrong.
 *
 * MAINTENANCE: update every value and STATE_DATA_REVIEWED in the same commit. The UI shows that
 * date, so a stale constant makes the app claim a freshness it does not have.
 */

export const STATE_DATA_REVIEWED = 'September 2026';

export const STATE_SOURCES: { label: string; detail: string; url: string }[] = [
  {
    label: 'Sales tax',
    detail: 'Tax Foundation - combined state and average local rate, 1 July 2026',
    url: 'https://taxfoundation.org/data/all/state/2026-sales-tax-rates-midyear/',
  },
  {
    label: 'Gas price',
    detail: 'AAA state average, regular unleaded, 6 September 2026',
    url: 'https://gasprices.aaa.com/state-gas-price-averages/',
  },
  {
    label: 'Electricity',
    detail: 'U.S. EIA Electric Power Monthly, residential average, June 2026',
    url: 'https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a',
  },
  {
    label: 'EV fee',
    detail: 'Tax Foundation - annual state EV registration fees, July 2026',
    url: 'https://taxfoundation.org/data/all/state/electric-vehicle-ev-taxes/',
  },
];

export interface StateDefaults {
  /** Combined state + average local general sales tax, percent. */
  salesTaxRate: number;
  /** Regular unleaded, dollars per gallon. */
  gasPrice: number;
  /** Residential average, dollars per kWh. */
  electricityRate: number;
  /** Statewide annual battery-EV registration surcharge, dollars. 0 where the state has none. */
  evFeeAnnual: number;
}

/**
 * Illustrative base registration cost before any EV surcharge, in dollars per year.
 *
 * There is no comparable published table for this: states variously charge a flat fee, a fee by
 * weight, or an ad-valorem percentage of the car's value, and counties add their own. Rather than
 * invent 51 numbers we cannot source, we hold one clearly-labelled example constant and add the
 * sourced EV surcharge on top of it. The UI shows the sum broken into its two parts so the user can
 * see which half is sourced and which half is a placeholder.
 */
export const REG_BASE_EXAMPLE = 150;

export const STATE_DEFAULTS: Record<string, StateDefaults> = {
  AL: { salesTaxRate: 9.46, gasPrice: 3.8, electricityRate: 0.164, evFeeAnnual: 203 },
  AK: { salesTaxRate: 1.82, gasPrice: 5.03, electricityRate: 0.282, evFeeAnnual: 0 },
  AZ: { salesTaxRate: 8.54, gasPrice: 4.54, electricityRate: 0.152, evFeeAnnual: 0 },
  AR: { salesTaxRate: 9.48, gasPrice: 3.78, electricityRate: 0.141, evFeeAnnual: 200 },
  CA: { salesTaxRate: 9.03, gasPrice: 5.85, electricityRate: 0.347, evFeeAnnual: 121 },
  CO: { salesTaxRate: 7.89, gasPrice: 4.2, electricityRate: 0.171, evFeeAnnual: 89 },
  CT: { salesTaxRate: 6.35, gasPrice: 4.32, electricityRate: 0.243, evFeeAnnual: 0 },
  DE: { salesTaxRate: 0, gasPrice: 4.15, electricityRate: 0.193, evFeeAnnual: 110 },
  DC: { salesTaxRate: 6, gasPrice: 4.21, electricityRate: 0.244, evFeeAnnual: 0 },
  FL: { salesTaxRate: 6.98, gasPrice: 3.91, electricityRate: 0.151, evFeeAnnual: 0 },
  GA: { salesTaxRate: 7.56, gasPrice: 3.89, electricityRate: 0.164, evFeeAnnual: 274 },
  HI: { salesTaxRate: 4.5, gasPrice: 5.4, electricityRate: 0.527, evFeeAnnual: 50 },
  ID: { salesTaxRate: 6.03, gasPrice: 4.63, electricityRate: 0.144, evFeeAnnual: 140 },
  IL: { salesTaxRate: 8.98, gasPrice: 4.29, electricityRate: 0.199, evFeeAnnual: 100 },
  IN: { salesTaxRate: 7, gasPrice: 3.43, electricityRate: 0.175, evFeeAnnual: 242 },
  IA: { salesTaxRate: 6.94, gasPrice: 3.9, electricityRate: 0.159, evFeeAnnual: 130 },
  KS: { salesTaxRate: 8.71, gasPrice: 3.77, electricityRate: 0.157, evFeeAnnual: 135 },
  KY: { salesTaxRate: 6, gasPrice: 3.84, electricityRate: 0.143, evFeeAnnual: 126 },
  LA: { salesTaxRate: 10.13, gasPrice: 3.77, electricityRate: 0.135, evFeeAnnual: 110 },
  ME: { salesTaxRate: 5.5, gasPrice: 4.19, electricityRate: 0.296, evFeeAnnual: 0 },
  MD: { salesTaxRate: 6, gasPrice: 4.02, electricityRate: 0.218, evFeeAnnual: 125 },
  MA: { salesTaxRate: 6.25, gasPrice: 4.2, electricityRate: 0.296, evFeeAnnual: 0 },
  MI: { salesTaxRate: 6, gasPrice: 4.03, electricityRate: 0.23, evFeeAnnual: 267 },
  MN: { salesTaxRate: 8.14, gasPrice: 3.97, electricityRate: 0.175, evFeeAnnual: 150 },
  MS: { salesTaxRate: 7.06, gasPrice: 3.73, electricityRate: 0.149, evFeeAnnual: 150 },
  MO: { salesTaxRate: 8.44, gasPrice: 3.82, electricityRate: 0.162, evFeeAnnual: 150 },
  MT: { salesTaxRate: 0, gasPrice: 4.39, electricityRate: 0.151, evFeeAnnual: 130 },
  NE: { salesTaxRate: 6.98, gasPrice: 3.88, electricityRate: 0.133, evFeeAnnual: 150 },
  NV: { salesTaxRate: 8.24, gasPrice: 4.96, electricityRate: 0.131, evFeeAnnual: 0 },
  NH: { salesTaxRate: 0, gasPrice: 4.15, electricityRate: 0.27, evFeeAnnual: 100 },
  NJ: { salesTaxRate: 6.6, gasPrice: 4.27, electricityRate: 0.25, evFeeAnnual: 270 },
  NM: { salesTaxRate: 7.68, gasPrice: 4.05, electricityRate: 0.151, evFeeAnnual: 0 },
  NY: { salesTaxRate: 8.54, gasPrice: 4.31, electricityRate: 0.295, evFeeAnnual: 0 },
  NC: { salesTaxRate: 7.1, gasPrice: 3.84, electricityRate: 0.147, evFeeAnnual: 215 },
  ND: { salesTaxRate: 7.09, gasPrice: 3.97, electricityRate: 0.141, evFeeAnnual: 120 },
  OH: { salesTaxRate: 7.29, gasPrice: 3.92, electricityRate: 0.192, evFeeAnnual: 200 },
  OK: { salesTaxRate: 9.06, gasPrice: 3.72, electricityRate: 0.143, evFeeAnnual: 110 },
  OR: { salesTaxRate: 0, gasPrice: 5.01, electricityRate: 0.163, evFeeAnnual: 115 },
  PA: { salesTaxRate: 6.34, gasPrice: 4.3, electricityRate: 0.217, evFeeAnnual: 250 },
  RI: { salesTaxRate: 7, gasPrice: 4.24, electricityRate: 0.292, evFeeAnnual: 200 },
  SC: { salesTaxRate: 7.49, gasPrice: 3.76, electricityRate: 0.156, evFeeAnnual: 60 },
  SD: { salesTaxRate: 6.11, gasPrice: 4.01, electricityRate: 0.154, evFeeAnnual: 100 },
  TN: { salesTaxRate: 9.61, gasPrice: 3.82, electricityRate: 0.141, evFeeAnnual: 200 },
  TX: { salesTaxRate: 8.2, gasPrice: 3.67, electricityRate: 0.159, evFeeAnnual: 200 },
  UT: { salesTaxRate: 7.42, gasPrice: 4.41, electricityRate: 0.134, evFeeAnnual: 188 },
  VT: { salesTaxRate: 6.43, gasPrice: 4.3, electricityRate: 0.244, evFeeAnnual: 89 },
  VA: { salesTaxRate: 5.77, gasPrice: 3.96, electricityRate: 0.172, evFeeAnnual: 136 },
  WA: { salesTaxRate: 9.57, gasPrice: 5.51, electricityRate: 0.149, evFeeAnnual: 225 },
  WV: { salesTaxRate: 6.6, gasPrice: 3.93, electricityRate: 0.155, evFeeAnnual: 200 },
  WI: { salesTaxRate: 5.72, gasPrice: 3.82, electricityRate: 0.196, evFeeAnnual: 175 },
  WY: { salesTaxRate: 5.39, gasPrice: 4.37, electricityRate: 0.152, evFeeAnnual: 100 },
};

export function stateDefaultsFor(code: string): StateDefaults | null {
  return Object.prototype.hasOwnProperty.call(STATE_DEFAULTS, code) ? STATE_DEFAULTS[code] : null;
}
