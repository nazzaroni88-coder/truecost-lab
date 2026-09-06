# TrueCost Lab — Claude one-shot handoff

Copy everything below the line into Claude (or open this file in the project).

---

You are reviewing and improving TrueCost Lab as a skeptical product lead, financial-calculator auditor, and UX reviewer — then implementing only what is justified. This is a **one-go pass**: re-verify, fix P1s, ship light/dark mode, and report back. Do not redesign for sport.

## PROJECT

- Local path: `Documents\truecost-lab` (Windows)
- Stack: Vite + React 18 + TypeScript, custom CSS design system in `src/styles` (no UI framework)
- Brand: Cents of Adventure decision tools — live site is **https://www.centsofadventure.me** (NOT `.com`)
- Core question: "What will this decision actually cost you?"
- Flagship: Vehicle True Cost (`/calculators/vehicle`) — car vs car, EV vs gas, new vs used, finance vs cash
- Also shipping: Rent vs Buy, Debt vs Invest, Purchase vs Invest, Custom Comparison
- Pure engine in `src/engine` (Vitest: 112 tests). Do not break math identities or weaken tests.
- Commands: `npm test`, `npm run typecheck`, `npm run dev` → http://localhost:5173

## PRIOR AUDIT (Almost Ready) — STARTING TRUTH, RE-VERIFY BEFORE FIXING

### KEEP (do not mess with unless broken)

- Hero value prop + "Compare two cars" CTA + live demo
- Pure unit-tested engine: amortization, cash-flow compare, invest-the-difference, sensitivity/break-even
- True-cost identity: `price + tax + fees + interest + running − resale`; categories sum to total; principal is not a cost
- Vehicle decision stack: Answer → Why → crossover → sensitivity → break-even → invest difference → Q&A → show-the-math
- Wealth ≠ nominal (finance vs cash timing)
- Trust posture: methodology, limitations, illustrative labels, rounding hedges, local-only scenarios, hash share links
- `CalculatorDefinition` + registry architecture
- Clean Google-like utility direction (not flashy fintech)
- Live-confirmed: homepage hook/CTA, Vehicle answer clarity, Rent vs Buy / Debt vs Invest feel like one product, Methodology/About trust framing

### P0 — must fix before anyone uses it

None known from the prior audit. If you find a real correctness/trust/usability breaker, treat it as P0 and fix it.

### P1 — must fix before public launch (verify, then fix)

1. **Brand links** — Every Home / About / Methodology / Footer link to `centsofadventure.com` → **https://www.centsofadventure.me**

2. **`resaleOverride` bug** — When override ≥ `price × (1 − firstYearDep)`, end value is NOT pinned (falls back to curve). Example: $30k car, 20% Y1 drop, override $28k → wrongly stays $24k. Fix so override always pins end value. Add tests for: override above/equal after-first-year value; override = price; allow override `0` for scrap if sensible.

3. **EV incentives** — Add first-class purchase incentive/credit input(s), and ideally optional home-charger one-time cost. Homepage demo is Model 3 vs Camry — silent omission overstates EV cost. Keep methodology honest. Defensive `normalize()` for old saved/share links.

4. **Surface Shared inputs** — Ownership years + annual miles at minimum (gas/electricity nice) above Option A/B tabs or as always-visible chips. Shared-tab burial hurts "answer in 30 seconds."

5. **APR vs investment-return clarity** — Loans use nominal APR/12; investments use effective annual. Same headline % is not equal (~6% APR ≈ 6.17% effective). Fix copy/presets/methodology so "finance and invest when APR < return" is not misleading (e.g. 6.9% APR vs 7% return can still favor cash on wealth).

6. **Platform honesty** — Either unify a reusable `ComparisonResultsShell` + `CashflowSeries` usage across Vehicle / RentBuy / Custom (and document Debt / Purchase as a second "strategy" template), OR stop README/homepage claims that every calculator shares the same hierarchy. Prefer shell reuse over more one-off Results pages.

7. **Mobile overflow + sticky answer bar** — At ~390px: remove horizontal page scrollbar; fix sticky bottom answer bar so it does not truncate the verdict, steal too much vertical space, or obscure content.

8. **Desktop Vehicle form pane** — Keep sticky inputs if useful, but fix the independently scrolling form pane so users can tell how much form remains (avoid a trapped inner scrollbar that feels like a second page).

9. **Invalid input state** — When inputs are invalid (e.g. gas MPG below minimum), do not leave a confident sticky result summary as if the answer is still valid — show a clear blocked / needs-fixing state.

### P2 — after launch unless cheap while you are in the file

- Slim homepage (hero + calc grid + one trust line; push essays to Methodology/About)
- Soften perpetual "illustrative example" chrome once the user has seen it
- Investment-return sensitivity: allow exploring ≤0% (engine already supports negatives)
- Tone: homepage "costs about" vs results "is estimated to cost" — align
- Mobile preset chips: don't look clipped/broken; make overflow intentional (fade, peek, or wrap)
- Mobile results length: preserve decision hierarchy but reduce skim cost (collapse secondary sections by default, tighter KPI stack) — only if it improves comprehension
- Tire timing / parking / tolls — disclose, don't invent fake precision

## YOUR JOB THIS PASS

1. Re-verify the P1 math/trust items above with tests (especially `resaleOverride`).
2. Implement P1 fixes that are clearly correct. Do not rewrite the product.
3. Full UI/UX pass with **light AND dark mode** (required).
4. Run `npm test` and `npm run typecheck` before you claim done.

## UI / UX REQUIREMENTS

Intended style: clean, simple, Google-like utility software — calm, readable, dense-enough-to-be-useful. NOT a flashy fintech dashboard. NOT bright sterile white as the only option.

### Dark / light mode (founder preference: hates bright white calculators)

- Ship a proper light + dark theme by extending design tokens in `src/styles/tokens.css` (avoid scattered one-off colors)
- **Default: prefer dark**, or system preference with dark fallback — bright white must never be the only experience
- Persist theme choice (`localStorage`)
- Accessible toggle in header (keyboard + aria), no flash of wrong theme on load (FOUC)
- Both themes must keep readable: A/B option distinction, success/warning/danger, charts, tables, stacked bars, tornado, answer hero, form controls, sticky bars, mobile answer bar
- Check contrast (text, muted, borders, focus rings, inputs)
- Charts/SVG colors must work in both themes (no invisible lines on dark)

### UX pass (only changes that improve usability/comprehension)

- Hierarchy, whitespace, information density, input flow, comparison clarity, result presentation
- Desktop + mobile (~390px): Inputs/Results switch, sticky answer bar, tables overflow, sticky form column
- Empty / loading / error / warning / invalid states
- Navigation and CTAs into Vehicle
- Do not ship visual chrome that doesn't help comprehension

## CONSTRAINTS

- Do not invent financial features beyond what's needed for P1 (incentives + charger is in scope)
- Do not break share links, scenario storage, or `normalize()` for old saved inputs — migrate defensively
- Keep "illustrative estimates / not financial advice" language
- Prefer small, reviewable changes over a rewrite
- Do not weaken or delete engine tests to make green; add tests for the bugs you fix

## DELIVERABLES

1. Short re-verification notes (what you confirmed vs prior audit)
2. What you changed (bulleted), especially: dark mode approach, `resaleOverride` fix, brand URLs, incentives UX, mobile/sticky/validation fixes
3. Screenshot or describe: home + vehicle results in **both light and dark**, desktop and ~390px mobile
4. Remaining P1/P2 not done
5. Updated launch verdict

Finish using **exactly** this structure:

VERDICT:
Ready / Almost Ready / Not Ready

P0 — MUST FIX BEFORE ANYONE USES IT

P1 — MUST FIX BEFORE PUBLIC LAUNCH

P2 — IMPROVE AFTER LAUNCH

KEEP — DO NOT MESS WITH THESE

BIGGEST OPPORTUNITY

Prioritize: (1) mathematical correctness (2) decision usefulness (3) trust (4) clarity (5) UX including dark mode (6) visual polish last.
