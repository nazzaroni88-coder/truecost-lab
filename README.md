# TrueCost Lab

**What will this decision actually cost?** A Cents of Adventure decision engine that models the true cost of cars, homes, debt and big purchases — depreciation, interest, insurance, maintenance, taxes, resale — and shows what happens if you invest the difference.

Live dev: `npm run dev` → http://localhost:5173

## Calculators

| Calculator | Route | What it answers |
| --- | --- | --- |
| Vehicle True Cost (flagship) | `/calculators/vehicle` | Car A vs Car B, EV vs gas, new vs used, finance vs cash |
| Rent vs Buy | `/calculators/rent-vs-buy` | Wealth after N years: renting + investing vs buying + equity |
| Debt vs Invest | `/calculators/debt-vs-invest` | Extra money to the loan or the market, and the break-even return |
| Purchase vs Invest | `/calculators/purchase-vs-invest` | Long-term opportunity cost of a one-time or recurring purchase |
| Custom Comparison | `/calculators/custom-comparison` | Any Option A vs Option B with upfront, ongoing, future costs, savings, resale, lifespan |

Every calculator presents the same results hierarchy: **The answer → Why → What matters most (sensitivity) → Break-even → If you invested the difference → Plain-English Q&A → Show me the math**.

Underneath there are two shapes. **Vehicle, Rent vs Buy and Custom** are two-option calculators built on the shared `CashflowSeries` + `compareCashflows` engine, which supplies the crossover chart, break-even search and invest-the-difference projection. **Debt vs Invest and Purchase vs Invest** compare two strategies for the same money, so they simulate net worth directly and share the compounding and sensitivity code but not the cash-flow comparison. Both are documented on the Methodology page.

## Stack

- Vite + React 18 + TypeScript, no UI framework — a small custom design system in `src/styles`.
- Pure, unit-tested financial engine in `src/engine` (Vitest: 129 tests across the engine, persistence, formatting, and an integration suite that runs every preset of every calculator through normalize → compute → summary → share-link round trip, plus zero and extreme inputs).
- Custom SVG/CSS charts (`src/components/charts`) — no chart library.
- Scenarios persist to `localStorage` through a `StorageAdapter` interface (`src/scenarios/storage.ts`) so cloud/account saving can be added later.
- Shareable links encode the scenario in the URL hash (no backend). Result cards render to a canvas PNG.

## Commands

```bash
npm install
npm run dev        # dev server
npm test           # engine + persistence tests
npm run typecheck  # tsc
npm run build      # production build to dist/
```

## Hosting

`npm run build` produces a static site in `dist/`. It is a single-page app, so the host must serve `index.html` for unknown paths (a Netlify `_redirects` file is included; on Vercel/Cloudflare add the equivalent rewrite, on Apache/Nginx a fallback rule).

To publish under a sub-path of an existing site (e.g. `centsofadventure.com/truecost/`), build with the base path set:

```bash
VITE_BASE_PATH=/truecost/ npm run build
```

Routing, share links and assets all respect the base path.

## Architecture

```
src/
  engine/            pure math — no React
    core/            money.ts (amortization, compounding), cashflow.ts (comparison engine,
                     invest-the-difference, crossover), sensitivity.ts (tornado + break-even solver)
    calculators/     vehicle.ts, rentBuy.ts, debtInvest.ts, purchaseInvest.ts, custom.ts
    __tests__/
  calculators/       one folder per calculator: presets, Form, Results, definition (summary,
                     methodology, insights, quick-adjust), index (CalculatorDefinition)
    registry.ts      the list the router, header and homepage read
    meta.ts          names, slugs, taglines, icons
    types.ts         CalculatorDefinition contract + defensive input normalizer
  components/
    ui/              NumberField, Segmented, Slider, InfoTip, Modal, Toast, ErrorBoundary…
    charts/          LineChart, StackedBars, Tornado, MilestoneBars
    results/         AnswerHero, SensitivitySection, InvestDifference, ShareBar, Sections
    layout/          Header, Footer, AppShell
  scenarios/         store (useSyncExternalStore), storage adapters, URL codec
  share/             canvas result card, text summary
  pages/             Home, CalculatorPage (generic shell), Methodology, About, NotFound
  styles/            tokens.css (design tokens), app.css
```

### Adding a calculator

1. Write the engine in `src/engine/calculators/<name>.ts`: inputs → result, ideally producing `CashflowSeries` so `compareCashflows` gives you nominal cost, cost-to-date curves, crossover and invest-the-difference for free. Add tests.
2. Add its metadata to `src/calculators/meta.ts`.
3. Create `src/calculators/<name>/` with `presets.ts`, `Form.tsx`, `Results.tsx`, `definition.tsx` and `index.tsx` exporting a `CalculatorDefinition`.
4. Register it in `src/calculators/registry.ts`. Routing, scenarios, sharing, presets and the homepage pick it up automatically.

## Conventions worth knowing

- Loan APRs compound monthly (APR/12). Investment returns are effective annual rates ((1+r)^(1/12) − 1 per month). Contributions land at month end; upfront amounts at time zero.
- "Invest the difference" invests the month-by-month cash-flow difference between two options and adds the difference in exit values (resale / equity). Milestones inside the horizon mean "if you exited then"; beyond it the balance compounds with no new contributions.
- Presets are illustrative, rounded estimates — labeled as such in the UI. No live data is fetched.
- Purchase incentives are cash at purchase; they do not reduce the sales-tax base or the resale value.
- Loan APRs are nominal (APR/12 monthly) while investment returns are effective annual. A 6.9% APR costs 7.12% effective, so never compare the two headline numbers directly — the engine simulates both paths instead.
- Theme tokens live in `src/styles/tokens.css`, declared once for light and once for dark. Components never hardcode a colour. The one exception is `src/share/shareCard.ts`, which paints to a canvas (no CSS variables) and deliberately stays light so a shared image looks the same for everyone.
- Full methodology: `/methodology` in the app.

## Roadmap ideas

- Optional live data adapters (fuel prices, mortgage rates) behind the same input schema.
- Accounts + cloud scenario sync via a `RemoteAdapter` implementing `StorageAdapter`.
- An AI explanation layer that reads the deterministic result objects (the `insights` functions already produce the structured facts it would need).
- More calculators: lease vs buy, solar, college, relocation.
