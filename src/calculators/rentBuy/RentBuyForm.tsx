import { useState } from 'react';
import type { FormProps } from '../types';
import type { RentBuyInputs } from '../../engine/calculators/rentBuy';
import { NumberField } from '../../components/ui/NumberField';
import { OptionTabs } from '../../components/forms/OptionTabs';
import { Disclosure, FormSection, SelectField } from '../../components/ui/Controls';
import { fmtMoney } from '../../lib/format';
import { MORTGAGE_TERMS } from './presets';

type Tab = 'rent' | 'buy' | 'shared';

export function RentBuyForm({ inputs: i, onChange }: FormProps<RentBuyInputs>) {
  const [tab, setTab] = useState<Tab>('buy');
  const set = (patch: Partial<RentBuyInputs>) => onChange({ ...i, ...patch });
  const down = i.homePrice * (i.downPaymentPct / 100);

  return (
    <div>
      <OptionTabs<Tab>
        tabs={[
          { key: 'rent', label: 'Renting', name: `${fmtMoney(i.monthlyRent)}/mo`, tone: 'a' },
          { key: 'buy', label: 'Buying', name: fmtMoney(i.homePrice), tone: 'b' },
          { key: 'shared', label: 'Assumptions', name: `${i.horizonYears} yr · ${i.investmentReturn}% return`, tone: 'shared' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'rent' && (
        <div role="tabpanel">
          <FormSection title="Renting" sub="A place comparable to the home you would buy.">
            <NumberField label="Monthly rent" format="currency" suffix="/mo" value={i.monthlyRent} onChange={(v) => set({ monthlyRent: v })} min={0} max={100000} help="Rent for a comparable home today. Compare like with like: same size, area and condition." />
            <NumberField label="Annual rent increase" format="percent" value={i.rentGrowth} onChange={(v) => set({ rentGrowth: v })} min={0} max={20} decimals={1} step={0.5} help="How much rent goes up each year. Nationally about 3% long-term; higher in hot markets. Rent increases once a year in the model." />
            <NumberField label="Renter's insurance" format="currency" suffix="/yr" value={i.rentersInsuranceAnnual} onChange={(v) => set({ rentersInsuranceAnnual: v })} min={0} max={5000} help="Typically $150–$300 a year. Grows with inflation." />
          </FormSection>
          <p className="field-hint" style={{ padding: '0 0 var(--sp-3)' }}>
            The renter is assumed to invest every dollar the buyer spends that they don't — the down payment, closing costs and any monthly gap — at the investment return in Assumptions.
          </p>
        </div>
      )}

      {tab === 'buy' && (
        <div role="tabpanel">
          <FormSection title="The home">
            <NumberField label="Home price" format="currency" value={i.homePrice} onChange={(v) => set({ homePrice: v })} min={10000} max={50_000_000} />
            <div className="grid-2">
              <NumberField label="Down payment" format="percent" value={i.downPaymentPct} onChange={(v) => set({ downPaymentPct: v })} min={0} max={100} decimals={1} hint={`= ${fmtMoney(down)}`} help="Percent of the price paid up front. Below 20% usually means PMI (see Advanced)." />
              <NumberField label="Closing costs" format="percent" value={i.closingCostsPct} onChange={(v) => set({ closingCostsPct: v })} min={0} max={10} decimals={1} step={0.5} hint={`= ${fmtMoney(i.homePrice * (i.closingCostsPct / 100))}`} help="Lender fees, title, appraisal, escrow and prepaid items when buying. Typically 2–5% of the price." />
            </div>
          </FormSection>
          <FormSection title="Mortgage">
            <div className="grid-2">
              <NumberField label="Interest rate" format="percent" value={i.mortgageApr} onChange={(v) => set({ mortgageApr: v })} min={0} max={20} decimals={2} step={0.125} help="Fixed annual rate on the loan." />
              <SelectField label="Term" value={i.mortgageTermYears} onChange={(v) => set({ mortgageTermYears: v })} options={MORTGAGE_TERMS} />
            </div>
          </FormSection>
          <FormSection title="Owning costs" sub="Taxes and maintenance scale with the home's value; insurance and HOA grow with inflation.">
            <div className="grid-2">
              <NumberField label="Property tax" format="percent" suffix="% of value/yr" value={i.propertyTaxRate} onChange={(v) => set({ propertyTaxRate: v })} min={0} max={5} decimals={2} step={0.05} hint={`≈ ${fmtMoney((i.homePrice * i.propertyTaxRate) / 100 / 12)}/mo now`} help="Effective annual property tax as a percent of the home's value. U.S. average is around 1%, ranging from 0.3% to over 2% by state." />
              <NumberField label="Home insurance" format="currency" suffix="/yr" value={i.homeInsuranceAnnual} onChange={(v) => set({ homeInsuranceAnnual: v })} min={0} max={50000} help="Homeowner's insurance premium. Varies a lot by region — get a quote." />
              <NumberField label="HOA / condo fees" format="currency" suffix="/mo" value={i.hoaMonthly} onChange={(v) => set({ hoaMonthly: v })} min={0} max={10000} help="Monthly association dues, if any." />
              <NumberField label="Maintenance" format="percent" suffix="% of value/yr" value={i.maintenanceRate} onChange={(v) => set({ maintenanceRate: v })} min={0} max={5} decimals={1} step={0.1} hint={`≈ ${fmtMoney((i.homePrice * i.maintenanceRate) / 100 / 12)}/mo now`} help="Repairs and upkeep averaged over time. The common rule of thumb is 1% of the value per year; older homes cost more, new condos less." />
            </div>
          </FormSection>
          <FormSection title="When you sell">
            <NumberField label="Selling costs" format="percent" value={i.sellingCostsPct} onChange={(v) => set({ sellingCostsPct: v })} min={0} max={15} decimals={1} step={0.5} help="Agent commissions, transfer taxes and closing costs when selling, as a percent of the sale price. Typically 5–8%." />
            <Disclosure title="Advanced: PMI">
              <div className="field-group" style={{ paddingTop: 8 }}>
                <NumberField label="PMI rate" format="percent" suffix="% of loan/yr" value={i.pmiRate} onChange={(v) => set({ pmiRate: v })} min={0} max={3} decimals={2} step={0.1} help="Private mortgage insurance, charged when the down payment is under 20%. Typically 0.3–1.2% of the loan per year until the balance drops below 80% of the price. Set to 0 to ignore." />
              </div>
            </Disclosure>
          </FormSection>
        </div>
      )}

      {tab === 'shared' && (
        <div role="tabpanel">
          <FormSection title="Time">
            <NumberField label="Years you'll stay" suffix="yr" value={i.horizonYears} onChange={(v) => set({ horizonYears: Math.round(v) })} min={1} max={40} decimals={0} step={1} help="How long before you would sell (or stop renting this place). This is usually the single biggest driver of the answer." />
          </FormSection>
          <FormSection title="Growth assumptions">
            <NumberField label="Home appreciation" format="percent" suffix="%/yr" value={i.appreciation} onChange={(v) => set({ appreciation: v })} min={-10} max={20} decimals={1} step={0.5} help="Annual growth in the home's value. U.S. homes have averaged roughly 3–4% a year long-term, close to inflation plus a little. Local markets vary widely." />
            <NumberField label="Investment return" format="percent" suffix="%/yr" value={i.investmentReturn} onChange={(v) => set({ investmentReturn: v })} min={0} max={20} decimals={1} step={0.5} help="What the renter earns on the money not spent on buying. Long-run diversified stock returns have averaged about 7–10% before inflation, but are not guaranteed." />
            <NumberField label="Inflation" format="percent" suffix="%/yr" value={i.inflation} onChange={(v) => set({ inflation: v })} min={0} max={15} decimals={1} step={0.5} help="Applied to insurance, HOA and renter's insurance each year." />
          </FormSection>
        </div>
      )}
    </div>
  );
}
