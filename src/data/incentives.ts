/**
 * Vehicle purchase incentive reference data.
 *
 * WHAT THIS IS: a structured summary of the incentive programmes people most often ask about,
 * used to help someone work out what to enter in the "Tax credits & rebates" field — and, just as
 * importantly, to stop them budgeting for money that no longer exists.
 *
 * WHAT THIS IS NOT: a live eligibility service. Programmes change with legislation, run out of
 * funding mid-year, and carry conditions no calculator can verify. Every entry carries a source
 * link and a verification date; nothing is applied to the model unless the user chooses it.
 *
 * MAINTENANCE: this is the only file to edit when programmes change. Update `DATA_REVIEWED` in the
 * same commit — the UI displays it, so a stale constant makes the app claim freshness it lacks.
 *
 * VERIFICATION LOG
 * 2026-09-06 — Full check against primary sources. Findings:
 *   • All four federal clean-vehicle credits are terminated (see FEDERAL below). Confirmed
 *     directly against irs.gov, not secondary coverage.
 *   • The auto-loan interest deduction created by the same Act is live and is the only federal
 *     vehicle benefit left, but it is a deduction spread over the loan, not cash at purchase.
 *   • State amounts corrected: CO, CT, NJ, MA, CA all differed from the previous dataset.
 *   • Every AFDC link was 404. The correct pattern is /laws/state_summary?state=XX.
 */

/** When this dataset was last checked against primary sources. Surfaced in the UI — keep it truthful. */
export const DATA_REVIEWED = 'September 2026';

/** The authoritative aggregator; far more complete than anything we can embed. */
export const AFDC_URL = 'https://afdc.energy.gov/laws/state';
export const AFDC_LABEL = 'US DOE Alternative Fuels Data Center';

/** Correct per-state URL. The old /laws/state/XX form 404s — see the verification log. */
export const afdcStateUrl = (code: string) => `https://afdc.energy.gov/laws/state_summary?state=${code}`;

export type PurchaseType = 'new' | 'used' | 'lease';
export type Authority = 'federal' | 'state' | 'utility';
export type BodyStyle = 'car' | 'suv';
export type FilingStatus = 'single' | 'joint';

export interface Incentive {
  id: string;
  name: string;
  authority: Authority;
  /** 'US' for federal, otherwise a two-letter state code. */
  region: string;
  appliesTo: PurchaseType[];
  /** Typical maximum award in dollars. Zero when we deliberately do not state a figure. */
  maxAmount: number;
  /** How the amount is actually determined, in plain words. */
  amountNote: string;
  /** Vehicle price ceiling, where the programme has one. */
  priceCap?: { car?: number; suv?: number };
  /**
   * An extra amount available only below a price threshold, on top of a base award that has no
   * such limit. Colorado works this way: $750 for any qualifying EV, plus $2,500 more under
   * $35,000. Modelling it as a flat maximum would overstate the credit on a pricier car.
   */
  bonusUnderPrice?: { amount: number; threshold: number };
  /** Household income ceiling by filing status. */
  incomeCap?: { single: number; joint: number };
  timing: 'point-of-sale' | 'tax-return' | 'rebate-after-purchase' | 'varies';
  notes: string[];
  sourceUrl: string;
  sourceLabel: string;
  /**
   * Set when the programme has ended. Ended programmes are still listed — many people are still
   * budgeting for them — but they are shown separately and never counted toward any total.
   */
  endedOn?: string;
  /**
   * True when the benefit is not cash at purchase (e.g. an income-tax deduction spread over a
   * loan). These are explained but never offered as an amount to apply, because putting them in
   * the incentive field would overstate the money you actually receive up front.
   */
  informational?: boolean;
  /** True when a programme exists but we have not verified the current figure. Shown without an amount. */
  amountUnverified?: boolean;
  /**
   * True when eligibility turns on an income test we cannot evaluate — typically a percentage of
   * area median income, which varies by county. Distinct from `incomeCap`, which is a fixed dollar
   * figure we can actually check against what the user tells us.
   */
  incomeQualifiedOnly?: boolean;
}

/**
 * Federal programmes.
 *
 * The One Big Beautiful Bill Act (Public Law 119-21, 4 July 2025) terminated every federal
 * clean-vehicle purchase credit for vehicles acquired after 30 September 2025, and ended the home
 * charger credit for property placed in service after 30 June 2026. As of this dataset's review
 * date all four are gone. They remain listed because "where did my $7,500 go?" is the single most
 * common question a US car buyer now has, and answering it is more useful than silence.
 */
const FEDERAL: Incentive[] = [
  {
    id: 'us-30d',
    name: 'Federal Clean Vehicle Credit (new) — ENDED',
    authority: 'federal',
    region: 'US',
    appliesTo: ['new'],
    maxAmount: 0,
    amountNote: 'Was worth up to $7,500. Terminated for vehicles acquired after 30 September 2025. If you are working from an article or a dealer quote written before then, this credit is the usual reason the numbers no longer add up.',
    timing: 'point-of-sale',
    endedOn: '30 September 2025',
    notes: [
      'Narrow exception: buyers who entered a binding written contract and made a payment on or before 30 September 2025 may still claim it even if delivery came later.',
      'Terminated by the One Big Beautiful Bill Act (Public Law 119-21), enacted 4 July 2025.',
    ],
    sourceUrl: 'https://www.irs.gov/credits-deductions/credits-for-new-clean-vehicles-purchased-in-2023-or-after',
    sourceLabel: 'IRS — new clean vehicle credit',
  },
  {
    id: 'us-25e',
    name: 'Federal Used Clean Vehicle Credit — ENDED',
    authority: 'federal',
    region: 'US',
    appliesTo: ['used'],
    maxAmount: 0,
    amountNote: 'Was 30% of the sale price up to $4,000, for vehicles under $25,000. Terminated for vehicles acquired after 30 September 2025.',
    timing: 'point-of-sale',
    endedOn: '30 September 2025',
    notes: ['Same binding-contract exception as the new-vehicle credit.'],
    sourceUrl: 'https://www.irs.gov/credits-deductions/used-clean-vehicle-credit',
    sourceLabel: 'IRS — used clean vehicle credit',
  },
  {
    id: 'us-45w-lease',
    name: 'Federal credit passed through on a lease — ENDED',
    authority: 'federal',
    region: 'US',
    appliesTo: ['lease'],
    maxAmount: 0,
    amountNote: 'The commercial-vehicle credit that lessors used to pass through as a capitalised-cost reduction, worth up to $7,500. Terminated for vehicles acquired after 30 September 2025, which closed the so-called lease loophole.',
    timing: 'varies',
    endedOn: '30 September 2025',
    notes: ['If a lease quote still shows an "EV credit" line, ask the dealer to show you where it comes from.'],
    sourceUrl: 'https://www.irs.gov/credits-deductions/commercial-clean-vehicle-credit',
    sourceLabel: 'IRS — commercial clean vehicle credit',
  },
  {
    id: 'us-30c-charger',
    name: 'Federal home charger credit — ENDED',
    authority: 'federal',
    region: 'US',
    appliesTo: ['new', 'used', 'lease'],
    maxAmount: 0,
    amountNote: 'Was 30% of a home charger and its installation, up to $1,000, for homes in eligible census tracts. Ended for property placed in service after 30 June 2026.',
    timing: 'tax-return',
    endedOn: '30 June 2026',
    notes: ['State and utility charger rebates still exist in many areas and are now the main source of charger money.'],
    sourceUrl: 'https://www.irs.gov/credits-deductions/alternative-fuel-vehicle-refueling-property-credit-for-individuals',
    sourceLabel: 'IRS — refuelling property credit',
  },
  {
    id: 'us-auto-loan-interest',
    name: 'Federal auto loan interest deduction',
    authority: 'federal',
    region: 'US',
    appliesTo: ['new'],
    maxAmount: 0,
    amountNote: 'Deducts up to $10,000 of car-loan interest per year from taxable income, for a new vehicle with final assembly in the United States. Because it is a deduction, it is worth your marginal tax rate times the interest — not the full amount — and it arrives at tax time each year rather than as cash at purchase.',
    incomeCap: { single: 100000, joint: 200000 },
    timing: 'tax-return',
    informational: true,
    notes: [
      'Do not enter this in the incentive field: TrueCost treats that as cash received at purchase, which would overstate it.',
      'To model it, lower the loan APR slightly. If you pay 24% marginal tax, a 7% APR behaves roughly like 5.3% for the deductible portion.',
      'New purchases only. Used vehicles and leases do not qualify, and the loan must be secured by a first lien on the vehicle.',
      'Phases out above $100,000 income (single) or $200,000 (joint), and requires US final assembly — check the VIN with the NHTSA decoder.',
    ],
    sourceUrl: 'https://www.irs.gov/newsroom/faqs-for-modification-of-sections-25c-25d-25e-30c-30d-45l-45w-and-179d-under-public-law-119-21-139-stat-72-july-4-2025-commonly-known-as-the-one-big-beautiful-bill-obbb',
    sourceLabel: 'IRS — OBBB modifications FAQ',
  },
];

/**
 * State programmes.
 *
 * Amounts marked verified were checked against the source on the review date. Where a state runs a
 * programme whose current figure was not verified, it is listed with `amountUnverified` and no
 * number: pointing someone at the right programme is useful, inventing its size is not.
 */
const STATE: Incentive[] = [
  {
    id: 'co-imvc',
    name: 'Colorado Innovative Motor Vehicle Credit',
    authority: 'state',
    region: 'CO',
    appliesTo: ['new', 'lease'],
    maxAmount: 750,
    bonusUnderPrice: { amount: 2500, threshold: 35000 },
    amountNote: 'From 1 January 2026 the base credit is $750, plus a $2,500 addition for vehicles with an MSRP under $35,000 — up to $3,250. The base amount steps down further on a published schedule, so the year of purchase matters.',
    timing: 'tax-return',
    notes: [
      'The $35,000 cap applies to the $2,500 addition, not to the $750 base — a pricier EV still gets the base credit.',
      'Leases of at least two years generally qualify.',
      'Stepped down sharply from $3,500 in 2025, so older articles overstate it badly.',
    ],
    sourceUrl: afdcStateUrl('CO'),
    sourceLabel: 'AFDC Colorado',
  },
  {
    id: 'co-vxc',
    incomeQualifiedOnly: true,
    name: 'Vehicle Exchange Colorado (income-qualified)',
    authority: 'state',
    region: 'CO',
    appliesTo: ['new', 'used'],
    maxAmount: 9000,
    amountNote: 'A point-of-sale rebate of up to $9,000 toward a new EV or $6,000 toward a used one, for income-qualified residents trading in an old or high-emitting vehicle.',
    timing: 'point-of-sale',
    notes: [
      'Requires household income at or below 80% of area median income, or enrolment in a qualifying programme such as SNAP or Medicaid.',
      'Requires trading in an eligible older vehicle.',
    ],
    sourceUrl: afdcStateUrl('CO'),
    sourceLabel: 'AFDC Colorado',
  },
  {
    id: 'ct-cheapr',
    name: 'Connecticut CHEAPR',
    authority: 'state',
    region: 'CT',
    appliesTo: ['new', 'used', 'lease'],
    maxAmount: 4000,
    amountNote: 'A $1,000 standard rebate on a new battery-electric vehicle. Income-qualified buyers under Rebate+ can reach $4,000 in total on a new vehicle, or up to $5,000 on a used one.',
    timing: 'point-of-sale',
    notes: ['Applied by participating dealers at purchase.', 'The used-vehicle route can be worth more than the new-vehicle route for income-qualified buyers.'],
    sourceUrl: afdcStateUrl('CT'),
    sourceLabel: 'AFDC Connecticut',
  },
  {
    id: 'nj-chargeup',
    name: 'Charge Up New Jersey',
    authority: 'state',
    region: 'NJ',
    appliesTo: ['new', 'lease'],
    maxAmount: 4000,
    amountNote: 'A $1,500 point-of-sale incentive on an eligible new battery-electric vehicle with an MSRP under $55,000, plus $2,500 more for income-prequalified buyers under Charge Up+ — up to $4,000.',
    priceCap: { car: 55000, suv: 55000 },
    timing: 'point-of-sale',
    notes: ['Applied at the dealer, so it reduces what you finance.', 'A separate rebate of up to $250 is available toward a home charger.'],
    sourceUrl: afdcStateUrl('NJ'),
    sourceLabel: 'AFDC New Jersey',
  },
  {
    id: 'ny-drive-clean',
    name: 'New York Drive Clean Rebate',
    authority: 'state',
    region: 'NY',
    appliesTo: ['new', 'lease'],
    maxAmount: 2000,
    amountNote: 'Between $500 and $2,000 depending on the model\'s electric range and MSRP. The largest amounts go to longer-range vehicles below the MSRP threshold.',
    timing: 'point-of-sale',
    notes: ['Applied by the dealer at purchase, so it appears on the paperwork.', 'Check the NYSERDA eligible-models list for your exact trim — the amount is set per model.'],
    sourceUrl: 'https://www.nyserda.ny.gov/All-Programs/Drive-Clean-Rebate-For-Electric-Cars-Program',
    sourceLabel: 'NYSERDA Drive Clean Rebate',
  },
  {
    id: 'ma-morev',
    name: 'Massachusetts MOR-EV',
    authority: 'state',
    region: 'MA',
    appliesTo: ['new', 'used', 'lease'],
    maxAmount: 3500,
    amountNote: '$3,500 for a new EV under a $55,000 MSRP cap, or $3,500 for a used EV under $40,000. Income-qualified buyers can add $1,500, and trading in a combustion vehicle can add $1,000.',
    priceCap: { car: 55000, suv: 55000 },
    timing: 'rebate-after-purchase',
    notes: ['Claimed after purchase within a deadline — missing the window forfeits it.', 'The adders can take a qualifying buyer to $6,000.'],
    sourceUrl: 'https://www.mass.gov/info-details/mor-ev-rebate-program',
    sourceLabel: 'Mass.gov MOR-EV',
  },
  {
    id: 'or-cvrp',
    incomeQualifiedOnly: true,
    name: 'Oregon Clean Vehicle Rebate',
    authority: 'state',
    region: 'OR',
    appliesTo: ['new', 'used', 'lease'],
    maxAmount: 7500,
    amountNote: 'The income-qualified Charge Ahead rebate is worth up to $7,500 toward a new or used vehicle (used vehicles are capped at 30% of the price, up to $4,000). A smaller standard rebate is available to all buyers.',
    timing: 'rebate-after-purchase',
    notes: [
      'The programme runs in windows rather than continuously. It reopened on 25 August 2026 and is scheduled to close on 4 November 2026 — confirm the current window before counting on it.',
      'The vehicle must be on the Oregon DEQ eligible list.',
    ],
    sourceUrl: 'https://evrebate.oregon.gov/',
    sourceLabel: 'Oregon CVRP',
  },
  {
    id: 'ca-cc4a',
    incomeQualifiedOnly: true,
    name: 'California Clean Cars 4 All / Driving Clean Assistance',
    authority: 'state',
    region: 'CA',
    appliesTo: ['new', 'used'],
    maxAmount: 12000,
    amountNote: 'California has no broad statewide purchase rebate: the Clean Vehicle Rebate Project closed to new applications in November 2023. What remains is income-qualified scrap-and-replace — up to $12,000 toward a replacement vehicle, plus up to $2,000 of charging assistance.',
    timing: 'rebate-after-purchase',
    notes: [
      'Administered by regional air districts, so both the amount and the rules depend on your county.',
      'Requires retiring an eligible older vehicle and meeting an income test.',
      'District funding is finite and published balances change frequently; an application does not guarantee payment.',
    ],
    sourceUrl: afdcStateUrl('CA'),
    sourceLabel: 'AFDC California',
  },
  // Programmes that exist but whose current figure was not verified on the review date.
  // Listed without an amount so the user is pointed at the right place without being given a number.
  {
    id: 'il-rebate',
    name: 'Illinois EV rebate',
    authority: 'state',
    region: 'IL',
    appliesTo: ['new', 'used'],
    maxAmount: 0,
    amountNote: 'Illinois runs a rebate in funded application rounds. The current amount and whether a round is open were not verified for this dataset — check the source.',
    timing: 'rebate-after-purchase',
    amountUnverified: true,
    notes: ['Round-based: if no round is open when you buy, you may get nothing.'],
    sourceUrl: afdcStateUrl('IL'),
    sourceLabel: 'AFDC Illinois',
  },
  {
    id: 'vt-rebate',
    name: 'Vermont EV incentives',
    authority: 'state',
    region: 'VT',
    appliesTo: ['new', 'used'],
    maxAmount: 0,
    amountNote: 'Vermont offers state rebates scaled by income, and its utility incentives are unusually generous and stack on top. Amounts were not verified for this dataset.',
    timing: 'rebate-after-purchase',
    amountUnverified: true,
    notes: ['Check your utility as well as the state — in Vermont the utility award often exceeds the state one.'],
    sourceUrl: afdcStateUrl('VT'),
    sourceLabel: 'AFDC Vermont',
  },
  {
    id: 'me-rebate',
    name: 'Maine Efficiency EV rebate',
    authority: 'state',
    region: 'ME',
    appliesTo: ['new', 'used'],
    maxAmount: 0,
    amountNote: 'Maine offers rebates scaled by income band through Efficiency Maine. Current amounts were not verified for this dataset.',
    timing: 'point-of-sale',
    amountUnverified: true,
    notes: ['Handled through participating dealers.'],
    sourceUrl: afdcStateUrl('ME'),
    sourceLabel: 'AFDC Maine',
  },
  {
    id: 'ri-drive',
    name: 'Rhode Island DRIVE EV',
    authority: 'state',
    region: 'RI',
    appliesTo: ['new', 'used'],
    maxAmount: 0,
    amountNote: 'Rhode Island runs a rebate with an income-qualified top-up. Current amounts were not verified for this dataset.',
    timing: 'rebate-after-purchase',
    amountUnverified: true,
    notes: ['Subject to annual funding.'],
    sourceUrl: afdcStateUrl('RI'),
    sourceLabel: 'AFDC Rhode Island',
  },
  {
    id: 'nm-credit',
    name: 'New Mexico clean vehicle credit',
    authority: 'state',
    region: 'NM',
    appliesTo: ['new', 'used'],
    maxAmount: 0,
    amountNote: 'New Mexico offers a state income-tax credit for clean vehicles. The current amount was not verified for this dataset.',
    timing: 'tax-return',
    amountUnverified: true,
    notes: ['Claimed on your state return, so the benefit arrives the following spring.'],
    sourceUrl: afdcStateUrl('NM'),
    sourceLabel: 'AFDC New Mexico',
  },
];

/** A standing reminder rather than a specific programme: utility rebates are near-universal. */
export const UTILITY_HINT: Incentive = {
  id: 'utility-generic',
  name: 'Your electric utility',
  authority: 'utility',
  region: '*',
  appliesTo: ['new', 'used', 'lease'],
  maxAmount: 0,
  amountNote: 'Most utilities offer something: a charger rebate (commonly $250–$1,000), a vehicle rebate, or a discounted overnight charging rate. With the federal charger credit gone, this is now the main source of charger money.',
  timing: 'rebate-after-purchase',
  amountUnverified: true,
  notes: [
    'Search your utility name plus "EV rebate" — this is the most commonly missed money in the whole list.',
    'A cheaper overnight charging rate is worth modelling in the electricity rate field instead of here.',
  ],
  sourceUrl: AFDC_URL,
  sourceLabel: AFDC_LABEL,
};

export const ALL_INCENTIVES: Incentive[] = [...FEDERAL, ...STATE];

/** States with an entry in this dataset, for the picker. */
export const STATES_WITH_DATA = [...new Set(STATE.map((s) => s.region))].sort();

export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' }, { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' }, { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export interface IncentiveQuery {
  purchaseType: PurchaseType;
  /** Two-letter code, or '' when the user has not chosen. */
  state: string;
  vehiclePrice: number;
  bodyStyle: BodyStyle;
  /** 'unknown' skips the income test rather than guessing. */
  income: number | 'unknown';
  filingStatus: FilingStatus;
}

export type MatchStatus = 'likely' | 'check' | 'ruled-out' | 'ended' | 'informational';

export interface IncentiveMatch {
  incentive: Incentive;
  status: MatchStatus;
  /** Estimated amount for this query. Zero when ended, informational, unverified or ruled out. */
  amount: number;
  /** Why it is ruled out, or what still needs checking. */
  reasons: string[];
}

function priceCapFor(inc: Incentive, body: BodyStyle): number | undefined {
  if (!inc.priceCap) return undefined;
  return body === 'suv' ? (inc.priceCap.suv ?? inc.priceCap.car) : (inc.priceCap.car ?? inc.priceCap.suv);
}

/**
 * Works out which programmes plausibly apply.
 *
 * Ended and informational programmes short-circuit before any eligibility test: whether you would
 * have qualified for a credit that no longer exists is not a useful thing to compute.
 */
export function matchIncentives(q: IncentiveQuery): IncentiveMatch[] {
  const pool = ALL_INCENTIVES.filter((inc) => inc.region === 'US' || inc.region === q.state);
  const matches: IncentiveMatch[] = [];

  for (const inc of pool) {
    if (inc.endedOn) {
      matches.push({ incentive: inc, status: 'ended', amount: 0, reasons: [`Ended ${inc.endedOn}.`] });
      continue;
    }

    const reasons: string[] = [];

    if (!inc.appliesTo.includes(q.purchaseType)) {
      matches.push({ incentive: inc, status: 'ruled-out', amount: 0, reasons: [`Only applies to ${inc.appliesTo.join(' or ')} purchases.`] });
      continue;
    }

    const cap = priceCapFor(inc, q.bodyStyle);
    if (cap !== undefined && q.vehiclePrice > cap) {
      matches.push({ incentive: inc, status: 'ruled-out', amount: 0, reasons: [`Vehicle price cap is $${cap.toLocaleString('en-US')}; yours is $${Math.round(q.vehiclePrice).toLocaleString('en-US')}.`] });
      continue;
    }

    let status: MatchStatus = 'likely';

    if (inc.incomeCap) {
      const limit = q.filingStatus === 'joint' ? inc.incomeCap.joint : inc.incomeCap.single;
      if (q.income === 'unknown') {
        status = 'check';
        reasons.push(`Income must be under $${limit.toLocaleString('en-US')} (${q.filingStatus === 'joint' ? 'filing jointly' : 'filing single'}).`);
      } else if (q.income > limit) {
        matches.push({ incentive: inc, status: 'ruled-out', amount: 0, reasons: [`Income cap is $${limit.toLocaleString('en-US')} for your filing status.`] });
        continue;
      }
    }

    if (inc.informational) {
      matches.push({ incentive: inc, status: 'informational', amount: 0, reasons });
      continue;
    }

    if (inc.amountUnverified) {
      matches.push({ incentive: inc, status: 'check', amount: 0, reasons: [...reasons, 'We have not verified the current amount — follow the source link for the figure.'] });
      continue;
    }

    if (inc.incomeQualifiedOnly) {
      status = 'check';
      reasons.push('Income-qualified only, usually against area median income, which varies by county — confirm you qualify.');
    }
    if (inc.timing === 'rebate-after-purchase') {
      if (status === 'likely') status = 'check';
      reasons.push('Funded in rounds that can close — confirm applications are open.');
    }

    let amount = inc.maxAmount;
    if (inc.bonusUnderPrice) {
      if (q.vehiclePrice <= inc.bonusUnderPrice.threshold) {
        amount += inc.bonusUnderPrice.amount;
      } else {
        reasons.push(`The extra $${inc.bonusUnderPrice.amount.toLocaleString('en-US')} only applies under $${inc.bonusUnderPrice.threshold.toLocaleString('en-US')}; at $${Math.round(q.vehiclePrice).toLocaleString('en-US')} you get the base amount only.`);
      }
    }

    matches.push({ incentive: inc, status, amount, reasons });
  }

  const rank: Record<MatchStatus, number> = { likely: 0, check: 1, informational: 2, ended: 3, 'ruled-out': 4 };
  return matches.sort((a, b) => rank[a.status] - rank[b.status] || b.amount - a.amount);
}

/** Statuses that can contribute money to a total. */
const COUNTABLE: MatchStatus[] = ['likely', 'check'];

/**
 * The headline suggestion: everything the answers did not rule out.
 *
 * Includes programmes marked "check", because almost every live incentive depends on something a
 * calculator cannot see and excluding them all would suggest nothing to nearly everyone. The
 * honesty lives in the per-programme caveats, not in a number quietly rounded to zero.
 */
export function suggestedTotal(matches: IncentiveMatch[]): number {
  return matches.filter((m) => COUNTABLE.includes(m.status)).reduce((sum, m) => sum + m.amount, 0);
}

/** The subset with no outstanding question at all. Offered as a cautious alternative when it differs. */
export function confirmedTotal(matches: IncentiveMatch[]): number {
  return matches.filter((m) => m.status === 'likely').reduce((sum, m) => sum + m.amount, 0);
}
