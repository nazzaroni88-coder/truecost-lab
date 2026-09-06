import { useEffect, useState } from 'react';
import type { FormProps } from '../types';
import type { FuelType, PaymentMethod, VehicleOption, VehicleShared } from '../../engine/calculators/vehicle';
import { vehicleValueAtMonth } from '../../engine/calculators/vehicle';
import { NumberField } from '../../components/ui/NumberField';
import { OptionTabs } from '../../components/forms/OptionTabs';
import { Disclosure, FormSection, SegmentedField, SelectField, Switch, TextField } from '../../components/ui/Controls';
import { effectiveAnnual, fmtMoney, fmtPct, yearsLabel } from '../../lib/format';
import { onFieldFocusRequest } from '../../lib/focusField';
import { TERM_OPTIONS } from './presets';
import { IncentiveHelper } from './IncentiveHelper';
import { US_STATES } from '../../data/incentives';
import { REG_BASE_EXAMPLE, STATE_DATA_REVIEWED, STATE_SOURCES, stateDefaultsFor } from '../../data/stateDefaults';
import {
  applyStateSuggestions,
  ESTIMATE_ORIGIN,
  markUserEdited,
  originFor,
  refreshRegistrationForFuel,
  stateNameOf,
  VEHICLE_FIELD_IDS as ID,
  type VehicleFormInputs,
} from './inputs';

type Tab = 'a' | 'b' | 'shared';

/** Which tab a focusable field lives behind, for the "jump to this input" chips. */
const TAB_FOR_FIELD: Record<string, Tab> = {
  [ID.gasPrice]: 'shared',
  [ID.electricity]: 'shared',
  [ID.investmentReturn]: 'shared',
};

const STATE_OPTIONS = [{ value: '', label: 'Not set — using example values' }, ...US_STATES.map((s) => ({ value: s.code, label: s.name }))];

export function VehicleForm({ inputs, onChange }: FormProps<VehicleFormInputs>) {
  const [tab, setTab] = useState<Tab>('a');

  // A chip in the results can point at a field inside the Shared tab. Reveal it before the shell
  // tries to focus it, otherwise the element does not exist yet and the click does nothing.
  useEffect(() => onFieldFocusRequest((id) => {
    const target = TAB_FOR_FIELD[id];
    if (target) setTab(target);
  }), []);

  const setOpt = (side: 'a' | 'b', patch: Partial<VehicleOption>) => {
    const next = { ...inputs, [side]: { ...inputs[side], ...patch } };
    onChange(markUserEdited(next, Object.keys(patch).map((k) => `${side}.${k}`)));
  };
  const setShared = (patch: Partial<VehicleShared>) => {
    const next = { ...inputs, shared: { ...inputs.shared, ...patch } };
    onChange(markUserEdited(next, Object.keys(patch).map((k) => `shared.${k}`)));
  };
  const setFuelType = (side: 'a' | 'b', fuelType: FuelType) => {
    const next = { ...inputs, [side]: { ...inputs[side], fuelType } };
    // Switching to electric should pick up the state's EV surcharge; switching back should drop it.
    // A registration the user typed themselves is left alone by refreshRegistrationForFuel.
    onChange(refreshRegistrationForFuel(next, side));
  };

  const anyGas = inputs.a.fuelType === 'gas' || inputs.b.fuelType === 'gas';
  const anyEv = inputs.a.fuelType === 'electric' || inputs.b.fuelType === 'electric';

  return (
    <div>
      <SituationCluster inputs={inputs} onChange={onChange} onShared={setShared} onOpenShared={() => setTab('shared')} />
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
          <OptionFields
            side={tab}
            all={inputs}
            option={inputs[tab]}
            shared={inputs.shared}
            onPatch={(p) => setOpt(tab, p)}
            onFuelType={(f) => setFuelType(tab, f)}
          />
        </div>
      ) : (
        <div role="tabpanel">
          <SharedFields all={inputs} shared={inputs.shared} onPatch={setShared} anyGas={anyGas} anyEv={anyEv} />
        </div>
      )}
    </div>
  );
}

/**
 * "Your situation" — the handful of facts about the person rather than about either car.
 *
 * These sit above the tabs because they change the answer more than most per-car fields do, and
 * because a user who never opens a tab should still be able to make the model theirs.
 */
function SituationCluster({
  inputs,
  onChange,
  onShared,
  onOpenShared,
}: {
  inputs: VehicleFormInputs;
  onChange: (i: VehicleFormInputs) => void;
  onShared: (p: Partial<VehicleShared>) => void;
  onOpenShared: () => void;
}) {
  const { a, b, stateCode } = inputs;
  const data = stateDefaultsFor(stateCode);
  const taxesDiffer = Math.abs(a.salesTaxRate - b.salesTaxRate) > 0.001;
  const taxOrigin = originFor(inputs, 'a.salesTaxRate');

  const setBothTaxes = (v: number) => {
    const next = { ...inputs, a: { ...a, salesTaxRate: v }, b: { ...b, salesTaxRate: v } };
    onChange(markUserEdited(next, ['a.salesTaxRate', 'b.salesTaxRate']));
  };

  return (
    <div className="situation">
      <div className="shared-strip-head">
        <span className="eyebrow">Your situation</span>
        <button type="button" className="link-btn micro" onClick={onOpenShared}>
          More shared settings
        </button>
      </div>

      <SelectField
        id={ID.state}
        label="State"
        value={stateCode}
        onChange={(v) => onChange(applyStateSuggestions(inputs, v))}
        options={STATE_OPTIONS}
        help="Used only to fill in typical local numbers: sales tax, fuel and electricity prices, and any state EV registration fee. Nothing is looked up about you and your location is never detected automatically — this is a static table in the app."
      />

      {data ? (
        <p className="micro muted situation-note">
          Suggestions for <strong>{stateNameOf(stateCode)}</strong>. Not your bill — edit anything and we will keep your number.
        </p>
      ) : (
        <p className="micro muted situation-note">Pick a state to swap the example tax, fuel and electricity prices for typical local ones.</p>
      )}

      <div className="grid-3">
        <NumberField
          id={ID.salesTax}
          label="Sales tax"
          format="percent"
          value={a.salesTaxRate}
          onChange={setBothTaxes}
          min={0}
          max={20}
          origin={taxOrigin}
          hint={taxesDiffer ? `Cars differ (${fmtPct(a.salesTaxRate, 2)} vs ${fmtPct(b.salesTaxRate, 2)}) — this sets both` : undefined}
          help="Combined state and average local rate, applied to the price minus any trade-in. Several states instead charge a separate motor-vehicle excise, highway-use or title tax at a different rate, so check your DMV before trusting this for a real purchase. You can set a different rate per car inside each tab."
        />
        <NumberField
          id={ID.miles}
          label="Miles per year"
          suffix="mi"
          value={inputs.shared.annualMiles}
          onChange={(v) => onShared({ annualMiles: v })}
          min={0}
          max={100000}
          decimals={0}
          help="The U.S. average is about 13,500 miles a year. Check your last two odometer readings — this drives fuel and tyre costs and is usually worth two minutes to get right."
        />
        <NumberField
          id={ID.years}
          label="Years you'll own it"
          suffix="yr"
          value={inputs.shared.ownershipYears}
          onChange={(v) => onShared({ ownershipYears: Math.round(v) })}
          min={1}
          max={20}
          decimals={0}
          step={1}
          help="How long until you sell or trade in. Longer ownership spreads out the early depreciation hit, so this usually moves the answer more than any other input."
        />
      </div>

      <Disclosure title="Where the state numbers come from">
        <div className="source-list">
          <p className="micro muted">
            Static figures typed into the app and last reviewed in <strong>{STATE_DATA_REVIEWED}</strong>. Statewide averages, not quotes, and no live data is
            fetched.
          </p>
          <ul className="micro">
            {STATE_SOURCES.map((s) => (
              <li key={s.label}>
                <strong>{s.label}:</strong>{' '}
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.detail}
                </a>
              </li>
            ))}
          </ul>
          <p className="micro muted">
            Insurance is deliberately not suggested. Published state averages disagree by hundreds of dollars a year because they assume different drivers and
            coverage, and your own premium varies far more by driver than by state. Get a real quote for that one.
          </p>
        </div>
      </Disclosure>
    </div>
  );
}

function OptionFields({
  side,
  all,
  option: o,
  shared,
  onPatch,
  onFuelType,
}: {
  side: 'a' | 'b';
  all: VehicleFormInputs;
  option: VehicleOption;
  shared: VehicleShared;
  onPatch: (p: Partial<VehicleOption>) => void;
  onFuelType: (f: FuelType) => void;
}) {
  const years = Math.max(1, Math.round(shared.ownershipYears));
  const curveResale = vehicleValueAtMonth({ ...o, resaleOverride: null }, years, years * 12);
  const overriding = o.resaleOverride !== null;
  const taxable = Math.max(0, o.price - o.tradeInValue);
  const tax = taxable * (o.salesTaxRate / 100);
  const [helperOpen, setHelperOpen] = useState(false);

  const stateData = stateDefaultsFor(all.stateCode);
  const regSuggested = all.provenance[`${side}.registrationAnnual`] === 'suggested';
  const evFee = stateData && o.fuelType === 'electric' ? stateData.evFeeAnnual : 0;
  const regHint = regSuggested && stateData
    ? evFee > 0
      ? `Example base ${fmtMoney(REG_BASE_EXAMPLE)} + ${all.stateCode} EV fee ${fmtMoney(evFee)}`
      : `Example base ${fmtMoney(REG_BASE_EXAMPLE)} — ${all.stateCode} adds no EV fee`
    : undefined;

  return (
    <>
      <FormSection title="Vehicle" sub="Purchase price before tax and fees.">
        <TextField label={`Option ${side.toUpperCase()} name`} value={o.name} onChange={(v) => onPatch({ name: v })} placeholder={side === 'a' ? 'e.g. Tesla Model 3' : 'e.g. Toyota Camry'} />
        <NumberField label="Purchase price" format="currency" value={o.price} onChange={(v) => onPatch({ price: v })} min={0} max={1_000_000} help="The negotiated price of the vehicle before sales tax and fees. For a used car, the agreed sale price." />
        <div className="grid-2">
          <NumberField
            label="Sales tax"
            format="percent"
            value={o.salesTaxRate}
            onChange={(v) => onPatch({ salesTaxRate: v })}
            min={0}
            max={20}
            origin={originFor(all, `${side}.salesTaxRate`)}
            help={`This car's rate, if it differs from the one in Your situation — a private sale or a purchase in another state. Applied to the price minus any trade-in. Here: ${fmtMoney(tax)}.`}
          />
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
        <IncentiveHelper open={helperOpen} onClose={() => setHelperOpen(false)} vehiclePrice={o.price} chargerCost={o.chargerCost} currentAmount={o.purchaseIncentive} onApply={(v) => onPatch({ purchaseIncentive: v })} />
      </FormSection>

      <FormSection title="Fuel or charging">
        <SegmentedField<FuelType> label="Power" value={o.fuelType} onChange={onFuelType} block options={[{ value: 'gas', label: 'Gas / hybrid' }, { value: 'electric', label: 'Electric' }]} />
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
          <NumberField label="Insurance" format="currency" suffix="/yr" value={o.insuranceAnnual} onChange={(v) => onPatch({ insuranceAnnual: v })} min={0} max={50000} help="Annual premium for this specific vehicle. We do not suggest a number here even when you pick a state: premiums vary far more by driver, record and credit than by state, and published state averages disagree with each other by hundreds of dollars. Use your renewal notice or a real quote." />
          <NumberField
            label="Registration"
            format="currency"
            suffix="/yr"
            value={o.registrationAnnual}
            onChange={(v) => onPatch({ registrationAnnual: v })}
            min={0}
            max={5000}
            origin={originFor(all, `${side}.registrationAnnual`)}
            hint={regHint}
            help="Annual registration, plate and inspection fees. Only the state EV surcharge half of this is sourced; the base is an illustrative figure, because states charge variously by flat fee, vehicle weight or a percentage of the car's value, and counties add their own. Check your DMV for the real number."
          />
          <NumberField label="Maintenance" format="currency" suffix="/yr" value={o.maintenanceAnnual} onChange={(v) => onPatch({ maintenanceAnnual: v })} min={0} max={50000} help="Scheduled service: oil changes, brakes, filters, fluids. EVs typically need less." />
          <NumberField label="Repairs" format="currency" suffix="/yr" value={o.repairsAnnual} onChange={(v) => onPatch({ repairsAnnual: v })} min={0} max={50000} help="Expected unscheduled repairs, averaged per year. Higher for older cars and cars out of warranty." />
          <NumberField label="Tire set cost" format="currency" value={o.tireSetCost} onChange={(v) => onPatch({ tireSetCost: v })} min={0} max={10000} help="Cost of a full set of tires, installed." />
          <NumberField label="Tire life" suffix="mi" value={o.tireIntervalMiles} onChange={(v) => onPatch({ tireIntervalMiles: v })} min={0} max={200000} decimals={0} help="Miles per set of tires. Heavier, more powerful cars wear tires faster." />
        </div>
      </FormSection>

      <FormSection title="Depreciation & resale" sub="The biggest cost most people never see.">
        <div className="grid-2">
          <NumberField label="First-year drop" format="percent" value={o.firstYearDepreciation} onChange={(v) => onPatch({ firstYearDepreciation: v, resaleOverride: null })} min={0} max={80} decimals={1} origin={ESTIMATE_ORIGIN} help="How much value the car loses in the first year you own it. New cars typically lose 15–25%; a 3-year-old used car more like 10–14%. This is a forecast about future used-car prices, not a sourced figure." disabled={overriding} />
          <NumberField label="Then per year" format="percent" value={o.annualDepreciation} onChange={(v) => onPatch({ annualDepreciation: v, resaleOverride: null })} min={0} max={60} decimals={1} origin={ESTIMATE_ORIGIN} help="Annual value loss after the first year. Typical: 10–15% for most cars; higher for luxury cars and many EVs, lower for trucks and Toyotas." disabled={overriding} />
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

function SharedFields({ all, shared: s, onPatch, anyGas, anyEv }: { all: VehicleFormInputs; shared: VehicleShared; onPatch: (p: Partial<VehicleShared>) => void; anyGas: boolean; anyEv: boolean }) {
  return (
    <>
      <FormSection title="Driving" sub="Applies to both options so the comparison is fair.">
        <NumberField label="Miles per year" suffix="mi" value={s.annualMiles} onChange={(v) => onPatch({ annualMiles: v })} min={0} max={100000} decimals={0} help="The U.S. average is about 13,500 miles a year. Check your last two odometer readings." />
        <NumberField label="Years you'll own it" suffix="yr" value={s.ownershipYears} onChange={(v) => onPatch({ ownershipYears: Math.round(v) })} min={1} max={20} decimals={0} step={1} help="How long until you sell or trade in. Longer ownership spreads out the early depreciation hit." />
      </FormSection>
      <FormSection title="Energy prices">
        <div className="grid-2">
          {anyGas && (
            <NumberField
              id={ID.gasPrice}
              label="Gas price"
              format="currency"
              suffix="/gal"
              value={s.gasPrice}
              onChange={(v) => onPatch({ gasPrice: v })}
              min={0}
              max={20}
              decimals={2}
              step={0.05}
              origin={originFor(all, 'shared.gasPrice')}
              help="Your local price today. We grow it by the fuel price growth rate each year. A state suggestion here is one day's statewide average of a number that moves weekly."
            />
          )}
          {anyEv && (
            <NumberField
              id={ID.electricity}
              label="Electricity"
              format="currency"
              suffix="/kWh"
              value={s.electricityRate}
              onChange={(v) => onPatch({ electricityRate: v })}
              min={0}
              max={2}
              decimals={3}
              step={0.01}
              origin={originFor(all, 'shared.electricityRate')}
              help="Your home rate per kilowatt-hour including delivery charges — check your utility bill, since a state suggestion is the residential average across all usage rather than an EV or overnight rate. Public fast charging can cost 2–3× more."
            />
          )}
        </div>
      </FormSection>
      <FormSection title="Economic assumptions">
        <NumberField id={ID.investmentReturn} label="Investment return" format="percent" value={s.investmentReturn} onChange={(v) => onPatch({ investmentReturn: v })} min={0} max={20} decimals={1} step={0.5} help="Used only for the 'invest the difference' projection. Long-run diversified stock returns have averaged roughly 7–10% before inflation, but are not guaranteed." />
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
