/**
 * The presets, as pages people can find.
 *
 * A preset is a curated question with real numbers behind it, but it only existed as an unlabelled
 * chip inside a tool — no URL, no headline, nothing to link to or index. This is the editorial
 * layer over the same data: a question someone would actually type, a sentence of context, and a
 * slug. The numbers stay in the preset files; nothing here duplicates them.
 *
 * Not every preset earns a page. A round-number placeholder makes a thin one, so this list is an
 * explicit editorial choice rather than a mapping over everything that exists.
 */
export interface Comparison {
  /** URL segment under /compare. Stable: changing one breaks every link already shared. */
  slug: string;
  calculatorId: string;
  presetId: string;
  /** The h1. Phrased the way someone would ask it, not the way the model states it. */
  question: string;
  /** One or two sentences of context. Never restates the answer — the answer is computed. */
  intro: string;
}

export const COMPARISONS: Comparison[] = [
  // Custom Comparison — the everyday purchases people argue about.
  {
    slug: 'is-rooftop-solar-worth-it',
    calculatorId: 'custom',
    presetId: 'solar',
    question: 'Is rooftop solar actually worth it?',
    intro: 'Solar quotes lead with the monthly saving and bury the payback. This runs $18,000 of panels against staying on the grid for 25 years — including the inverter that has to be replaced partway through, which most break-even claims quietly leave out.',
  },
  {
    slug: 'espresso-machine-vs-coffee-shop',
    calculatorId: 'custom',
    presetId: 'espresso',
    question: 'Is an espresso machine cheaper than the coffee shop?',
    intro: 'The machine pays for itself — that is the pitch, anyway. Here it is against a real café habit, counting the beans and the descaling kit as well as the $800 up front.',
  },
  {
    slug: 'gym-membership-vs-home-gym',
    calculatorId: 'custom',
    presetId: 'gym',
    question: 'Gym membership or a home gym?',
    intro: '$60 a month forever against $2,500 of equipment you own and could sell on. The answer turns almost entirely on how long you keep going.',
  },
  {
    slug: 'buy-phone-outright-vs-monthly-plan',
    calculatorId: 'custom',
    presetId: 'phone',
    question: 'Buy the phone outright, or take the monthly plan?',
    intro: 'A device plan looks cheap at $35 a month because it never ends. Buying means $1,000 every three years — but you own something you can sell.',
  },
  {
    slug: 'cheap-vs-expensive-washing-machine',
    calculatorId: 'custom',
    presetId: 'washer',
    question: 'Is the expensive washing machine cheaper in the end?',
    intro: 'Buy cheap, buy twice — a $600 machine that lasts six years against a $1,400 one that lasts fourteen. The replacement cycle is the whole argument, so it is priced in at the inflated future cost.',
  },

  // Debt vs Invest — the question that depends entirely on the rate.
  {
    slug: 'pay-off-credit-card-or-invest',
    calculatorId: 'debt-invest',
    presetId: 'card-21',
    question: 'Pay off the credit card, or invest?',
    intro: 'At the current average card APR this is the least close question in personal finance. Worth seeing the size of the gap rather than being told it exists.',
  },
  {
    slug: 'pay-off-student-loans-or-invest',
    calculatorId: 'debt-invest',
    presetId: 'student-65',
    question: 'Pay off student loans early, or invest?',
    intro: '$30,000 at the current federal undergraduate rate. The honest answer is a break-even return: the number the market has to beat before investing wins.',
  },
  {
    slug: 'pay-off-heloc-or-invest',
    calculatorId: 'debt-invest',
    presetId: 'heloc',
    question: 'Pay down a HELOC, or invest the money?',
    intro: 'A genuinely close call at current HELOC rates — close enough that the deciding factor is not the arithmetic but that one return is guaranteed and the other is not.',
  },
  {
    slug: 'pay-off-mortgage-early-or-invest',
    calculatorId: 'debt-invest',
    presetId: 'mortgage-675',
    question: 'Pay an extra $500 on the mortgage, or invest it?',
    intro: 'A $350,000 mortgage at the current 30-year average, over fifteen years. The mortgage rate is the hurdle; everything else is temperament.',
  },
  {
    slug: 'low-interest-car-loan-or-invest',
    calculatorId: 'debt-invest',
    presetId: 'car-promo',
    question: 'A 2.9% car loan: pay it off, or invest the cash?',
    intro: 'Subsidised finance is the case where keeping the debt genuinely wins. Cheap debt is not the same as free debt, so the margin is worth seeing.',
  },

  // Vehicle — where depreciation does the damage nobody budgets for.
  {
    slug: 'tesla-model-3-vs-toyota-camry',
    calculatorId: 'vehicle',
    presetId: 'model3-vs-camry',
    question: 'Tesla Model 3 or Toyota Camry Hybrid?',
    intro: 'Base trim against base trim, financed over five years. Cheap electricity against expensive depreciation — and depreciation is the cost neither sticker mentions.',
  },
  {
    slug: 'toyota-rav4-vs-honda-crv',
    calculatorId: 'vehicle',
    presetId: 'rav4-vs-crv',
    question: 'RAV4 Hybrid or CR-V Hybrid?',
    intro: 'The two best-selling compact SUVs in America, both hybrids for 2026 and within a mile per gallon of each other. When the fuel economy ties, the answer is decided by price and by what each is worth when you sell it.',
  },
  {
    slug: 'tesla-model-y-vs-toyota-rav4',
    calculatorId: 'vehicle',
    presetId: 'modely-vs-rav4',
    question: 'Tesla Model Y or Toyota RAV4 Hybrid?',
    intro: 'The electric SUV question at the size most families actually buy. A hybrid that already returns 41 mpg is a far harder benchmark for an EV to beat than a petrol-only car, because the fuel saving it has to earn back is so much smaller.',
  },
  {
    slug: 'electric-car-vs-gas-car-cost',
    calculatorId: 'vehicle',
    presetId: 'ev-vs-gas',
    question: 'Does an electric car actually cost less than petrol?',
    intro: 'A $45k EV against a $32k petrol sedan. Fuel and maintenance go one way, purchase price and depreciation the other, and the running-cost saving is rarely the whole story.',
  },
  {
    slug: 'is-a-hybrid-worth-the-extra',
    calculatorId: 'vehicle',
    presetId: 'hybrid-vs-gas',
    question: 'Is the hybrid worth the extra $3,000?',
    intro: 'The same car in two versions: 50 mpg against 32. Whether the fuel saving covers the premium depends on the petrol price and how far you drive.',
  },
  {
    slug: 'new-car-vs-used-car',
    calculatorId: 'vehicle',
    presetId: 'new-vs-used',
    question: 'New car, or three-year-old used?',
    intro: 'Used avoids the worst of the depreciation but pays for it twice over — used-car loans run several points higher, and the warranty is gone.',
  },
  {
    slug: 'finance-a-car-or-pay-cash',
    calculatorId: 'vehicle',
    presetId: 'finance-vs-cash',
    question: 'Finance the car, or pay cash?',
    intro: 'Keep the cash invested and pay interest, or spend it and avoid the interest. Note the trap: a 6.9% APR compounds to about 7.1% a year, so it quietly beats a 7% expected return.',
  },

  // Rent vs Buy — the same question, four very different markets.
  {
    slug: 'rent-vs-buy-a-house',
    calculatorId: 'rent-buy',
    presetId: 'typical',
    question: 'Rent or buy, at the national median?',
    intro: 'A $410,000 home with 20% down against $2,000 rent, staying ten years. Wealth at the end, not the monthly payment — the comparison that usually gets skipped.',
  },
  {
    slug: 'rent-vs-buy-expensive-city',
    calculatorId: 'rent-buy',
    presetId: 'hcol',
    question: 'Rent or buy in an expensive city?',
    intro: 'An $850,000 condo with a $600 HOA against $3,800 rent. Where prices run far ahead of rents, renting and investing the difference holds up longer than most people expect.',
  },
  {
    slug: 'rent-vs-buy-affordable-market',
    calculatorId: 'rent-buy',
    presetId: 'affordable',
    question: 'Rent or buy where housing is cheap?',
    intro: 'A $250,000 house against $1,400 rent. When the price-to-rent ratio is low, buying tends to pull ahead years sooner.',
  },
  {
    slug: 'buying-a-house-for-four-years',
    calculatorId: 'rent-buy',
    presetId: 'short-stay',
    question: 'Should you buy if you are only staying four years?',
    intro: 'The same home, a shorter horizon. Closing and selling costs are paid whatever happens, and four years is not long to spread them over.',
  },
  {
    slug: 'ten-percent-down-payment-with-pmi',
    calculatorId: 'rent-buy',
    presetId: 'low-down',
    question: 'Is 10% down with PMI worth it?',
    intro: 'A smaller deposit keeps more money invested but adds mortgage insurance and a larger loan. Two costs against one benefit.',
  },

  // Purchase vs Invest — opportunity cost, without the shaming.
  {
    slug: 'cost-of-a-5000-vacation',
    calculatorId: 'purchase-invest',
    presetId: 'vacation-5k',
    question: 'What does a $5,000 holiday really cost?',
    intro: 'Not an argument against going. The number is what the same money would have become if it had stayed invested — useful context, not a verdict.',
  },
  {
    slug: 'is-a-nicer-car-worth-it',
    calculatorId: 'purchase-invest',
    presetId: 'car-upgrade-15k',
    question: 'Is the nicer car worth $15,000?',
    intro: 'Stepping up a trim level, with about $4,000 of it coming back at resale six years later. The rest is the real price of the upgrade.',
  },
  {
    slug: 'cost-of-a-2000-laptop',
    calculatorId: 'purchase-invest',
    presetId: 'laptop-2k',
    question: 'What does a $2,000 laptop really cost?',
    intro: 'A premium device worth about $400 in four years. The gap between what you pay and what you get back is the part worth looking at.',
  },
  {
    slug: 'what-is-100-a-month-worth',
    calculatorId: 'purchase-invest',
    presetId: 'recurring-100',
    question: 'What is $100 a month worth over ten years?',
    intro: 'A subscription, a habit, a standing order you have stopped noticing. Small recurring amounts compound into numbers that surprise people.',
  },
];

export function comparisonBySlug(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

/** Other comparisons built on the same calculator, for cross-linking. */
export function relatedComparisons(c: Comparison, limit = 4): Comparison[] {
  return COMPARISONS.filter((o) => o.calculatorId === c.calculatorId && o.slug !== c.slug).slice(0, limit);
}
