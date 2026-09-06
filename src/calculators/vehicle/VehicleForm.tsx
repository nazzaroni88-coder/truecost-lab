import { useState } from 'react';
import type { FormProps } from '../types';
import type { FuelType, PaymentMethod, VehicleInputs, VehicleOption, VehicleShared } from '../../engine/calculators/vehicle';
import { vehicleValueAtMonth } from '../../engine/calculators/vehicle';
import { NumberField } from '../../components/ui/NumberField';
import { OptionTabs } from '../../components/forms/OptionTabs';
import { Disclosure, FormSection, SegmentedField, SelectField, Switch, TextField } from '../../components/ui/Controls';
import { effectiveAnnual, fmtMoney, fmtPct, yearsLabel } from '../../lib/format';
import { TERM_OPTIONS } from './presets';
import { IncentiveHelper } from './IncentiveHelper';

type Tab = 'a' | 'b' | 'shared';

export function VehicleForm({ inputs, onChange }: FormProps<VehicleInputs>) {
  const [tab, setTab] = useState<Tab>('a');
  const setOpt = (side: 'a' | 'b', patch: Partial<VehicleOption>) => onChange({ ...inputs, [side]: { ...inputs[side], ...patch } });
  const setShared = (patch: Partial<VehicleShared>) => onChange({ ...inputs, shared: { ...inputs.shared, ...patch } });

  const anyGas = inputs.a.fuelType === 'gas' || inputs.b.fuelType === 'gas';
  const anyEv = inputs.a.fuelType === 'electric' || inputs.b.fuelType === 'electric';

  return (
    <div>
      {/* These two drive the answer more than anything else and apply to both cars, so they stay
          visible instead of hiding behind a tab the user may never open. */}
      <div className="shared-strip">
        <div className="shared-strip-head">
          <span className="eyebrow">Applies to both cars</span>
          <button type="button" className="link-btn micro" onClick={() => setTab('shared')}>
            More shared settings
          </button>
        </div>
        <div className="grid-2">
          <NumberField label="Years you'll own it" suffix="yr" value={inputs.shared.ownershipYears} onChange={(v) => setShared({ ownershipYears: Math.round(v) })} min={1} max={20} decimals={0} step={1} help="How long until you sell or trade in. Longer ownership spreads out the early depreciation hit, so this usually moves the answer more than any other input." />
          <NumberField label="Miles per year" suffix="mi" value={inputs.shared.annualMiles} onChange={(v) => setShared({ annualMiles: v })} min={0} max={100000} decimals={0} help="The U.S. average is about 13,500 miles a year. Check your last two odometer readings." />
        </div>
      </div>
      <OptionTabs<Tab>
        tabs={[
          { key: 'a', label: 'Option A', name: inputs.a.name || 'Car A', tone: 'a' },
          { key: 'b', label: 'Option B', name: inputs.b.name || 'Car B', tone: 'b' },
          { key: 'shared', label: 'Shared', name: anyGas && anyEv ? 'Gas, power, economics' : anyEv ? 'Power, economics' : 'Gas, economics', tone: 'shared' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab !== 'shared' ? (
        <div role="tabpanel" key={tab}>
          <OptionFields side={tab} option={inputs[tab]} shared={inputs.shared} onPatch={(p) => setOpt(tab, p)} />
        </div>
      ) : (
        <div role="tabpanel">
          <SharedFields shared={inputs.shared} onPatch={setShared} anyGas={inputs.a.fuelType === 'gas' || inputs.b.fuelType === 'gas'} anyEv={inputs.a.fuelType === 'electric' || inputs.b.fuelType === 'electric'} />
        </div>
      )}
    </div>
  );
}

function OptionFields({ side, option: o, shared, onPatch }: { side: 'a' | 'b'; option: VehicleOption; shared: VehicleShared; onPatch: (p: Partial<VehicleOption>) => void }) {
  const years = Math.max(1, Math.round(shared.ownershipYears));
  const curveResale = vehicleValueAtMonth({ ...o, resaleOverride: null }, years, years * 12);
  const overriding = o.resaleOverride !== null;
  const taxable = Math.max(0, o.price - o.tradeInValue);
  const tax = taxable * (o.salesTaxRate / 100);
  const [helperOpen, setHelperOpen] = useState(false);

  return (
    <>
      <FormSection title="Vehicle" sub="Purchase price before tax and fees.">
        <TextField label={`Option ${side.toUpperCase()} name`} value={o.name} onChange={(v) => onPatch({ name: v })} placeholder={side === 'a' ? 'e.g. Tesla Model 3' : 'e.g. Toyota Camry'} />
        <NumberField label="Purchase price" format="currency" value={o.price} onChange={(v) => onPatch({ price: v })} min={0} max={1_000_000} help="The negotiated price of the vehicle before sales tax and fees. For a used car, the agreed sale price." />
        <div className="grid-2">
          <NumberField label="Sales tax" format="percent" value={o.salesTaxRate} onChange={(v) => onPatch({ salesTaxRate: v })} min={0} max={20} help={`Combined state and local rate. Applied to the price minus any trade-in, the rule in most states. Here: ${fmtMoney(tax)}.`} />
          <NumberField label="Fees" format="currency" value={o.fees} onChange={(v) => onPatch({ fees: v })} min={0} max={20000} help="Dealer documentation, title and other one-time fees." />
        </div>
        <NumberField label="Trade-in value" format="currency" value={o.tradeInValue} onChange={(v) => onPatch({ tradeInValue: v })} min={0} max={500_000} help="What the dealer credits for your current car. We count it as money you put in, since you could have sold it for cash." />
      </FormSection>

      <FormSection title="Paying for it">
        <SegmentedField<PaymentMethod> label="Payment method" value={o.paymentMethod} onChange={(v) => onPatch({ paymentMethod: v })} block options={[{ value: 'finance', label: 'Finance' }, { value: 'cash', label: 'Pay cash' }]} help="Financing rolls the price, tax and fees minus your down payment and trade-in into a loan. Paying cash means everything is paid up front." />
        {o.paymentMethod === 'finance' && (
          <>
            <NumberField label="Down payment" format="currency" value={o.downPayment} onChange={(v) => onPatch({ downPayment: v })} min={0} max={1_000_000} />
            <div className="grid-2">
              <NumberField
                label="Loan APR"
                format="percent"
                value={o.apr}
                onChange={(v) => onPatch({ apr: v })}
                min={0}
                max={40}
                step={0.25}
                hint={o.apr > 0 ? `Costs ${fmtPct(effectiveAnnual(o.apr), 2)} a year in practice` : undefined}
                help="Annual percentage rate on the loan, quoted the U.S. way: nominal, charged as APR ÷ 12 each month. Because it compounds monthly it costs slightly more per year than the headline number, which matters when you compare it against an expected investment return."
              />
              <SelectField label="Loan term" value={o.termMonths} onChange={(v) => onPatch({ termMonths: v })} options={TERM_OPTIONS} />
            </div>
          </>
        )}
        <NumberField
          label="Tax credits & rebates"
          format="currency"
          value={o.purchaseIncentive}
          onChange={(v) => onPatch({ purchaseIncentive: v })}
          min={0}
          max={100000}
          help="Federal or state tax credits, manufacturer rebates and utility incentives. We treat this as cash received at purchase and it does not reduce sales tax or the car's resale value. Eligibility rules change often and depend on the vehicle, your income and whether you buy or lease — check what you actually qualify for and enter that amount."
        />
        <button type="button" className="link-btn small" onClick={() => setHelperOpen(true)} style={{ justifySelf: 'start', marginTop: -4 }}>
          What incentives might I get? →
        </button>
        <IncentiveHelper open={helperOpen} onClose={() => setHelperOpen(false)} vehiclePrice={o.price} currentAmount={o.purchaseIncentive} onApply={(v) => onPatch({ purchaseIncentive: v })} />
      </FormSection>

      <FormSection title="Fuel or charging">
        <SegmentedField<FuelType> label="Power" value={o.fuelType} onChange={(v) => onPatch({ fuelType: v })} block options={[{ value: 'gas', label: 'Gas / hybrid' }, { value: 'electric', label: 'Electric' }]} />
        {o.fuelType === 'gas' ? (
          <NumberField label="Fuel economy" suffix="mpg" value={o.mpg} onChange={(v) => onPatch({ mpg: v })} min={1} max={150} help="Combined city/highway miles per gallon. Use the real-world number you expect, not the sticker's best case. Hybrids go here too." />
        ) : (
          <>
            <NumberField label="Efficiency" suffix="mi / kWh" value={o.milesPerKwh} onChange={(v) => onPatch({ milesPerKwh: v })} min={0.5} max={10} decimals={2} step={0.1} help="Miles per kilowatt-hour including charging losses. Most EVs get 3–4.5 mi/kWh in mixed driving; large trucks and SUVs less." />
            <NumberField label="Home charger install" format="currency" value={o.chargerCost} onChange={(v) => onPatch({ chargerCost: v })} min={0} max={50000} hint="One-time. Typically $500–$2,000 installed" help="Cost of buying and installing a Level 2 home charger, paid once at purchase. Leave at 0 if you already have one or will rely on public charging — but note the electricity rate below assumes home charging." />
          </>
        )}
      </FormSection>

      <FormSection title="Running costs" sub="Per year, in today's dollars. They grow with cost inflation.">
        <div className="grid-2">
          <NumberField label="Insurance" format="currency" suffix="/yr" value={o.insuranceAnnual} onChange={(v) => onPatch({ insuranceAnnual: v })} min={0} max={50000} help="Annual premium for this specific vehicle. Get a quote — EVs and luxury cars often cost more to insure." />
          <NumberField label="Registration" format="currency" suffix="/yr" value={o.registrationAnnual} onChange={(v) => onPatch({ registrationAnnual: v })} min={0} max={5000} help="Annual registration, plate and inspection fees. Some states add an EV fee." />
          <NumberField label="Maintenance" format="currency" suffix="/yr" value={o.maintenanceAnnual} onChange={(v) => onPatch({ maintenanceAnnual: v })} min={0} max={50000} help="Scheduled service: oil changes, brakes, filters, fluids. EVs typically need less." />
          <NumberField label="Repairs" format="currency" suffix="/yr" value={o.repairsAnnual} onChange={(v) => onPatch({ repairsAnnual: v })} min={0} max={50000} help="Expected unscheduled repairs, averaged per year. Higher for older cars and cars out of warranty." />
          <NumberField label="Tire set cost" format="currency" value={o.tireSetCost} onChange={(v) => onPatch({ tireSetCost: v })} min={0} max={10000} help="Cost of a full set of tires, installed." />
          <NumberField label="Tire life" suffix="mi" value={o.tireIntervalMiles} onChange={(v) => onPatch({ tireIntervalMiles: v })} min={0} max={200000} decimals={0} help="Miles per set of tires. Heavier, more powerful cars wear tires faster." />
        </div>
      </FormSection>

      <FormSection title="Depreciation & resale" sub="The biggest cost most people never see.">
        <div className="grid-2">
          <NumberField label="First-year drop" format="percent" value={o.firstYearDepreciation} onChange={(v) => onPatch({ firstYearDepreciation: v, resaleOverride: null })} min={0} max={80} decimals={1} help="How much value the car loses in the first year you own it. New cars typically lose 15–25%; a 3-year-old used car more like 10–14%." disabled={overriding} />
          <NumberField label="Then per year" format="percent" value={o.annualDepreciation} onChange={(v) => onPatch({ annualDepreciation: v, resaleOverride: null })} min={0} max={60} decimals={1} help="Annual value loss after the first year. Typical: 10–15% for most cars; higher for luxury cars and many EVs, lower for trucks and Toyotas." disabled={overriding} />
        </div>
        <Switch label="I know the expected resale value" checked={overriding} onChange={(on) => onPatch({ resaleOverride: on ? Math.round(curveResale) : null })} help="Turn this on to enter the value you expect to sell the car for at the end of your ownership period instead of using the depreciation rates." />
        {overriding ? (
          <NumberField label={`Resale value after ${yearsLabel(years)}`} format="currency" value={o.resaleOverride ?? 0} onChange={(v) => onPatch({ resaleOverride: v })} min={0} max={o.price} />
        ) : (
          <p className="field-hint">
            Estimated resale after {yearsLabel(years)}: <strong className="num">{fmtMoney(curveResale)}</strong> ({fmtPct((curveResale / Math.max(1, o.price)) * 100, 0)} of the price)
          </p>
        )}
      </FormSection>
    </>
  );
}

function SharedFields({ shared: s, onPatch, anyGas, anyEv }: { shared: VehicleShared; onPatch: (p: Partial<VehicleShared>) => void; anyGas: boolean; anyEv: boolean }) {
  return (
    <>
      <FormSection title="Driving" sub="Applies to both options so the comparison is fair.">
        <NumberField label="Miles per year" suffix="mi" value={s.annualMiles} onChange={(v) => onPatch({ annualMiles: v })} min={0} max={100000} decimals={0} help="The U.S. average is about 13,500 miles a year. Check your last two odometer readings." />
        <NumberField label="Years you'll own it" suffix="yr" value={s.ownershipYears} onChange={(v) => onPatch({ ownershipYears: Math.round(v) })} min={1} max={20} decimals={0} step={1} help="How long until you sell or trade in. Longer ownership spreads out the early depreciation hit." />
      </FormSection>
      <FormSection title="Energy prices">
        <div className="grid-2">
          {anyGas && <NumberField label="Gas price" format="currency" suffix="/gal" value={s.gasPrice} onChange={(v) => onPatch({ gasPrice: v })} min={0} max={20} decimals={2} step={0.05} help="Your local price today. We grow it by the fuel price growth rate each year." />}
          {anyEv && <NumberField label="Electricity" format="currency" suffix="/kWh" value={s.electricityRate} onChange={(v) => onPatch({ electricityRate: v })} min={0} max={2} decimals={3} step={0.01} help="Your home rate per kilowatt-hour including delivery charges (check your utility bill). Public fast charging can cost 2–3× more." />}
        </div>
      </FormSection>
      <FormSection title="Economic assumptions">
        <NumberField label="Investment return" format="percent" value={s.investmentReturn} onChange={(v) => onPatch({ investmentReturn: v })} min={0} max={20} decimals={1} step={0.5} help="Used only for the 'invest the difference' projection. Long-run diversified stock returns have averaged roughly 7–10% before inflation, but are not guaranteed." />
        <Disclosure title="Advanced: inflation & price growth">
          <div className="field-group" style={{ paddingTop: 8 }}>
            <NumberField label="Cost inflation" format="percent" value={s.costInflation} onChange={(v) => onPatch({ costInflation: v })} min={0} max={15} decimals={1} step={0.5} help="Annual growth applied to insurance, registration, maintenance, repairs and tires." />
            <NumberField label="Fuel & electricity price growth" format="percent" value={s.fuelPriceGrowth} onChange={(v) => onPatch({ fuelPriceGrowth: v })} min={-10} max={20} decimals={1} step={0.5} help="Annual change in gas and electricity prices. Set to 0 to hold today's prices flat." />
          </div>
        </Disclosure>
      </FormSection>
    </>
  );
}
