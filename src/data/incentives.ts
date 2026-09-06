/**
 * Vehicle purchase incentive reference data.
 *
 * WHAT THIS IS: a structured summary of the incentive programmes people most often qualify for,
 * used to help someone work out roughly what to enter in the "Tax credits & rebates" field.
 *
 * WHAT THIS IS NOT: a live eligibility service. These programmes change with legislation, run out
 * of funding mid-year, and carry conditions (battery sourcing, dealer registration, residency,
 * vehicle lists) that no calculator can verify. Every entry therefore carries a source link and a
 * review date, nothing is applied to the model without the user explicitly choosing it, and the UI
 * states the review date wherever amounts appear.
 *
 * MAINTENANCE: this is the only file to edit when programmes change. Update `DATA_REVIEWED` at the
 * same time so the UI stops claiming freshness it does not have.
 */

/** When this dataset was last compiled. Surfaced in the UI — keep it truthful. */
export const DATA_REVIEWED = 'mid-2026';

/** The authoritative aggregator to send people to; far more complete than anything we can embed. */
export const AFDC_URL = 'https://afdc.energy.gov/laws/state';
export const AFDC_LABEL = 'US DOE Alternative Fuels Data Center';

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
  /** Typical maximum award in dollars. */
  maxAmount: number;
  /** How the amount is actually determined, in plain words. */
  amountNote: string;
  /** Vehicle price ceiling, where the programme has one. */
  priceCap?: { car?: number; suv?: number };
  /** Household income ceiling by filing status (modified AGI). */
  incomeCap?: { single: number; joint: number };
  timing: 'point-of-sale' | 'tax-return' | 'rebate-after-purchase' | 'varies';
  notes: string[];
  sourceUrl: string;
  sourceLabel: string;
  /**
   * True for programmes whose existence — not just their amount — has been subject to active
   * legislative change. These are shown with a stronger "confirm this still exists" warning.
   */
  volatile?: boolean;
}

/**
 * Federal programmes. The clean-vehicle credits created by the Inflation Reduction Act have been
 * repeatedly amended and targeted for repeal, so they are all flagged volatile: confirm current
 * status before relying on any of them.
 */
const FEDERAL: Incentive[] = [
  {
    id: 'us-30d',
    name: 'Federal Clean Vehicle Credit (new)',
    authority: 'federal',
    region: 'US',
    appliesTo: ['new'],
    maxAmount: 7500,
    amountNote: 'Up to $7,500, awarded as two $3,750 halves — one for battery critical-minerals sourcing, one for battery components. Many models qualify for only one half, or none.',
    priceCap: { car: 55000, suv: 80000 },
    incomeCap: { single: 150000, joint: 300000 },
    timing: 'point-of-sale',
    notes: [
      'Transferable to a registered dealer at the point of sale, which turns it into an immediate discount rather than a refund next spring.',
      'Final assembly must be in North America, and the specific trim must appear on the current eligible-vehicle list.',
      'Income is tested on the lower of this year and last year, so one high-income year need not disqualify you.',
    ],
    sourceUrl: 'https://fueleconomy.gov/feg/tax2023.shtml',
    sourceLabel: 'FuelEconomy.gov eligible vehicle list',
    volatile: true,
  },
  {
    id: 'us-25e',
    name: 'Federal Used Clean Vehicle Credit',
    authority: 'federal',
    region: 'US',
    appliesTo: ['used'],
    maxAmount: 4000,
    amountNote: '30% of the sale price, capped at $4,000. A $12,000 used EV yields $3,600; anything above $13,333 yields the full $4,000.',
    priceCap: { car: 25000, suv: 25000 },
    incomeCap: { single: 75000, joint: 150000 },
    timing: 'point-of-sale',
    notes: [
      'The car must be at least two model years older than the current year, and must be bought from a dealer — private sales do not qualify.',
      'Once claimed on a given vehicle, the credit cannot be claimed again by a later buyer.',
      'You can only claim this credit once every three years.',
    ],
    sourceUrl: 'https://www.irs.gov/credits-deductions/used-clean-vehicle-credit',
    sourceLabel: 'IRS used clean vehicle credit',
    volatile: true,
  },
  {
    id: 'us-45w-lease',
    name: 'Federal credit passed through on a lease',
    authority: 'federal',
    region: 'US',
    appliesTo: ['lease'],
    maxAmount: 7500,
    amountNote: 'Up to $7,500 claimed by the leasing company, which may or may not pass it through as a capitalised-cost reduction. Ask for it explicitly and check the lease paperwork.',
    timing: 'varies',
    notes: [
      'Leases are claimed under the commercial clean vehicle credit, which has historically had no income or price caps — this is why a lease sometimes qualifies when a purchase does not.',
      'The lessor is not obliged to pass any of it to you. Compare the capitalised cost with and without it.',
      'TrueCost models purchases, not leases, so use this figure only if you are converting a lease deal into an equivalent purchase.',
    ],
    sourceUrl: 'https://www.irs.gov/credits-deductions/commercial-clean-vehicle-credit',
    sourceLabel: 'IRS commercial clean vehicle credit',
    volatile: true,
  },
  {
    id: 'us-30c-charger',
    name: 'Federal home charger credit',
    authority: 'federal',
    region: 'US',
    appliesTo: ['new', 'used', 'lease'],
    maxAmount: 1000,
    amountNote: '30% of the cost of buying and installing a home charger, capped at $1,000 — only for homes in eligible low-income or non-urban census tracts.',
    timing: 'tax-return',
    notes: [
      'Eligibility is decided by the census tract of the address, not by your income. Check yours before counting on it.',
      'If it applies, enter it here rather than reducing the charger cost, so the breakdown still shows what the charger really cost.',
    ],
    sourceUrl: 'https://afdc.energy.gov/laws/10513',
    sourceLabel: 'AFDC refuelling property credit',
    volatile: true,
  },
];

/**
 * State programmes. This is a representative set of the larger and most frequently-claimed ones,
 * not an exhaustive list — every state entry points at the AFDC database for the full picture, and
 * the UI tells users with unlisted states to look there.
 */
const STATE: Incentive[] = [
  {
    id: 'co-ev',
    name: 'Colorado EV tax credit',
    authority: 'state',
    region: 'CO',
    appliesTo: ['new', 'lease'],
    maxAmount: 5000,
    amountNote: 'One of the largest state credits in the country, with an extra amount for vehicles under a lower price cap. The headline figure steps down on a published schedule.',
    priceCap: { car: 35000, suv: 35000 },
    timing: 'tax-return',
    notes: ['The step-down schedule reduces the amount over time, so the year of purchase matters.', 'Leases of at least two years generally qualify.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/CO',
    sourceLabel: 'AFDC Colorado',
  },
  {
    id: 'nj-salestax',
    name: 'New Jersey EV sales-tax exemption',
    authority: 'state',
    region: 'NJ',
    appliesTo: ['new', 'used'],
    maxAmount: 0,
    amountNote: 'Historically a full exemption from state sales tax on zero-emission vehicles, since being phased in to a partial rate. Worth roughly the sales tax on the purchase.',
    timing: 'point-of-sale',
    notes: [
      'This is a tax exemption, not a rebate. The cleanest way to model it is to lower the sales-tax rate on the vehicle rather than entering an incentive amount.',
      'Check the current phase-in rate — it has been rising from zero toward the standard rate.',
    ],
    sourceUrl: 'https://afdc.energy.gov/laws/state/NJ',
    sourceLabel: 'AFDC New Jersey',
  },
  {
    id: 'ny-drive-clean',
    name: 'New York Drive Clean Rebate',
    authority: 'state',
    region: 'NY',
    appliesTo: ['new'],
    maxAmount: 2000,
    amountNote: 'Tiered by electric range: the full amount for longer-range EVs, less for short-range and plug-in hybrids.',
    priceCap: { car: 42000, suv: 42000 },
    timing: 'point-of-sale',
    notes: ['Applied by the dealer at purchase, so you see it on the paperwork.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/NY',
    sourceLabel: 'AFDC New York',
  },
  {
    id: 'ma-morev',
    name: 'Massachusetts MOR-EV',
    authority: 'state',
    region: 'MA',
    appliesTo: ['new', 'used', 'lease'],
    maxAmount: 3500,
    amountNote: 'A rebate for new EVs, with a smaller amount for used, and an additional award for income-qualified applicants trading in an older vehicle.',
    priceCap: { car: 55000, suv: 55000 },
    timing: 'rebate-after-purchase',
    notes: ['Claimed after purchase within a deadline — missing the window forfeits it.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/MA',
    sourceLabel: 'AFDC Massachusetts',
  },
  {
    id: 'il-rebate',
    name: 'Illinois EV rebate',
    authority: 'state',
    region: 'IL',
    appliesTo: ['new', 'used'],
    maxAmount: 4000,
    amountNote: 'A flat rebate awarded in funding rounds. Applications open for limited windows and close when the round is exhausted.',
    timing: 'rebate-after-purchase',
    notes: ['Round-based: if no round is open when you buy, you may get nothing. Check the current cycle before counting on it.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/IL',
    sourceLabel: 'AFDC Illinois',
  },
  {
    id: 'or-rebate',
    name: 'Oregon Clean Vehicle Rebate',
    authority: 'state',
    region: 'OR',
    appliesTo: ['new', 'used', 'lease'],
    maxAmount: 2500,
    amountNote: 'A standard rebate for new EVs, plus a substantially larger income-qualified "Charge Ahead" rebate that can be combined with it.',
    priceCap: { car: 50000, suv: 50000 },
    timing: 'rebate-after-purchase',
    notes: ['The programme pauses when funding runs out and reopens later — check whether it is currently accepting applications.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/OR',
    sourceLabel: 'AFDC Oregon',
  },
  {
    id: 'ct-cheapr',
    name: 'Connecticut CHEAPR',
    authority: 'state',
    region: 'CT',
    appliesTo: ['new', 'lease'],
    maxAmount: 2250,
    amountNote: 'A standard rebate with additional amounts for income-qualified buyers under the Rebate+ programmes.',
    priceCap: { car: 50000, suv: 50000 },
    timing: 'point-of-sale',
    notes: ['Applied by participating dealers at purchase.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/CT',
    sourceLabel: 'AFDC Connecticut',
  },
  {
    id: 'ca-ccfa',
    name: 'California Clean Cars 4 All / regional programmes',
    authority: 'state',
    region: 'CA',
    appliesTo: ['new', 'used'],
    maxAmount: 9500,
    amountNote: 'California\'s broad statewide rebate (CVRP) stopped accepting applications; what remains is income-qualified scrap-and-replace and regional air-district programmes, which can be large but have tight eligibility.',
    incomeCap: { single: 50000, joint: 100000 },
    timing: 'rebate-after-purchase',
    notes: [
      'Administered by regional air districts, so both the amount and the rules depend on your county.',
      'Usually requires scrapping an older vehicle and meeting an income test.',
    ],
    sourceUrl: 'https://afdc.energy.gov/laws/state/CA',
    sourceLabel: 'AFDC California',
  },
  {
    id: 'tx-rebate',
    name: 'Texas light-duty vehicle rebate',
    authority: 'state',
    region: 'TX',
    appliesTo: ['new', 'lease'],
    maxAmount: 2500,
    amountNote: 'A flat rebate issued in limited funding rounds, first-come first-served.',
    timing: 'rebate-after-purchase',
    notes: ['Funding is capped per round and is often exhausted quickly.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/TX',
    sourceLabel: 'AFDC Texas',
  },
  {
    id: 'me-rebate',
    name: 'Maine Efficiency EV rebate',
    authority: 'state',
    region: 'ME',
    appliesTo: ['new', 'used'],
    maxAmount: 2000,
    amountNote: 'A rebate that scales with income band, with the largest amounts for low-income applicants.',
    timing: 'point-of-sale',
    notes: ['Handled through participating dealers.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/ME',
    sourceLabel: 'AFDC Maine',
  },
  {
    id: 'vt-rebate',
    name: 'Vermont EV incentive',
    authority: 'state',
    region: 'VT',
    appliesTo: ['new', 'used'],
    maxAmount: 5000,
    amountNote: 'State rebates scaled by income, plus separate utility incentives that stack on top and are unusually generous in Vermont.',
    incomeCap: { single: 100000, joint: 125000 },
    timing: 'rebate-after-purchase',
    notes: ['Vermont utility incentives often exceed the state rebate — check your utility as well.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/VT',
    sourceLabel: 'AFDC Vermont',
  },
  {
    id: 'ri-drive',
    name: 'Rhode Island DRIVE EV',
    authority: 'state',
    region: 'RI',
    appliesTo: ['new', 'used'],
    maxAmount: 2500,
    amountNote: 'A rebate for new EVs with a smaller used-vehicle amount, plus an income-qualified top-up.',
    timing: 'rebate-after-purchase',
    notes: ['Subject to annual funding.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/RI',
    sourceLabel: 'AFDC Rhode Island',
  },
  {
    id: 'nm-credit',
    name: 'New Mexico clean vehicle credit',
    authority: 'state',
    region: 'NM',
    appliesTo: ['new', 'used'],
    maxAmount: 3000,
    amountNote: 'A state income-tax credit for new EVs with a smaller amount for used vehicles.',
    timing: 'tax-return',
    notes: ['Claimed on your state return, so the benefit arrives the following spring.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/NM',
    sourceLabel: 'AFDC New Mexico',
  },
  {
    id: 'de-rebate',
    name: 'Delaware Clean Vehicle Rebate',
    authority: 'state',
    region: 'DE',
    appliesTo: ['new'],
    maxAmount: 2500,
    amountNote: 'A flat rebate for new battery-electric vehicles, with a smaller amount for plug-in hybrids.',
    priceCap: { car: 60000, suv: 60000 },
    timing: 'rebate-after-purchase',
    notes: ['Applied for after purchase within a deadline.'],
    sourceUrl: 'https://afdc.energy.gov/laws/state/DE',
    sourceLabel: 'AFDC Delaware',
  },
];

/** A standing reminder rather than a specific programme: utility rebates are near-universal. */
export const UTILITY_HINT: Incentive = {
  id: 'utility-generic',
  name: 'Your electric utility',
  authority: 'utility',
  region: '*',
  appliesTo: ['new', 'used', 'lease'],
  maxAmount: 1500,
  amountNote: 'Most utilities offer something: a charger rebate (commonly $250–$1,000), a vehicle rebate, or a discounted overnight charging rate. These stack with federal and state programmes.',
  timing: 'rebate-after-purchase',
  notes: [
    'Search your utility name plus "EV rebate" — this is the most commonly missed money in the whole list.',
    'A cheaper overnight charging rate is worth modelling in the electricity rate field instead of here.',
  ],
  sourceUrl: AFDC_URL,
  sourceLabel: AFDC_LABEL,
};

export const ALL_INCENTIVES: Incentive[] = [...FEDERAL, ...STATE];

/** States with a programme in this dataset, for the picker. */
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

export type MatchStatus = 'likely' | 'check' | 'ruled-out';

export interface IncentiveMatch {
  incentive: Incentive;
  status: MatchStatus;
  /** Estimated amount for this query. Zero when ruled out. */
  amount: number;
  /** Why it is ruled out, or what still needs checking. */
  reasons: string[];
}

function priceCapFor(inc: Incentive, body: BodyStyle): number | undefined {
  if (!inc.priceCap) return undefined;
  return body === 'suv' ? (inc.priceCap.suv ?? inc.priceCap.car) : (inc.priceCap.car ?? inc.priceCap.suv);
}

/** The used federal credit is 30% of the price, capped — everything else is a flat maximum. */
function amountFor(inc: Incentive, q: IncentiveQuery): number {
  if (inc.id === 'us-25e') return Math.min(inc.maxAmount, Math.round(q.vehiclePrice * 0.3));
  return inc.maxAmount;
}

/**
 * Works out which programmes plausibly apply. Deliberately conservative: anything that depends on
 * a fact we cannot see (funding rounds, vehicle eligibility lists, census tracts) comes back as
 * "check" rather than "likely", so the total we suggest is the part we can actually stand behind.
 */
export function matchIncentives(q: IncentiveQuery): IncentiveMatch[] {
  const pool = ALL_INCENTIVES.filter((inc) => inc.region === 'US' || inc.region === q.state);
  const matches: IncentiveMatch[] = [];

  for (const inc of pool) {
    const reasons: string[] = [];
    let status: MatchStatus = 'likely';

    if (!inc.appliesTo.includes(q.purchaseType)) {
      matches.push({ incentive: inc, status: 'ruled-out', amount: 0, reasons: [`Only applies to ${inc.appliesTo.join(' or ')} purchases.`] });
      continue;
    }

    const cap = priceCapFor(inc, q.bodyStyle);
    if (cap !== undefined && q.vehiclePrice > cap) {
      matches.push({ incentive: inc, status: 'ruled-out', amount: 0, reasons: [`Vehicle price cap is $${cap.toLocaleString('en-US')} for this body style; yours is $${Math.round(q.vehiclePrice).toLocaleString('en-US')}.`] });
      continue;
    }

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

    // Programmes whose availability we genuinely cannot determine from these inputs.
    if (inc.volatile) {
      status = 'check';
      reasons.push('This programme has been subject to legislative change — confirm it still exists and that your vehicle is on the current eligible list.');
    }
    if (inc.timing === 'rebate-after-purchase') {
      if (status === 'likely') status = 'check';
      reasons.push('Funded in rounds that can close — confirm applications are open.');
    }
    if (inc.id === 'us-30c-charger') reasons.push('Only for addresses in eligible census tracts.');
    if (inc.id === 'nj-salestax') reasons.push('Model this by lowering the sales-tax rate rather than as a rebate amount.');

    matches.push({ incentive: inc, status, amount: amountFor(inc, q), reasons });
  }

  const rank: Record<MatchStatus, number> = { likely: 0, check: 1, 'ruled-out': 2 };
  return matches.sort((a, b) => rank[a.status] - rank[b.status] || b.amount - a.amount);
}

/** Modelled as a sales-tax rate rather than a rebate, so it must never enter a cash total. */
const EXCLUDED_FROM_TOTALS = new Set(['nj-salestax']);

/**
 * The headline suggestion: everything the answers did not rule out.
 *
 * This deliberately includes programmes marked "check". Almost every incentive depends on something
 * a calculator cannot see — a funding round, an eligible-vehicle list, a census tract — so excluding
 * all of them would suggest $0 to nearly everyone and make the helper useless. The honesty lives in
 * the per-programme caveats and the review-date banner, which stay visible, not in a number quietly
 * rounded down to nothing.
 */
export function suggestedTotal(matches: IncentiveMatch[]): number {
  return matches.filter((m) => m.status !== 'ruled-out' && !EXCLUDED_FROM_TOTALS.has(m.incentive.id)).reduce((sum, m) => sum + m.amount, 0);
}

/** The subset with no outstanding question at all. Offered as a cautious alternative when it differs. */
export function confirmedTotal(matches: IncentiveMatch[]): number {
  return matches.filter((m) => m.status === 'likely' && !EXCLUDED_FROM_TOTALS.has(m.incentive.id)).reduce((sum, m) => sum + m.amount, 0);
}
