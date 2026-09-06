import { useState } from 'react';
import type { FormProps } from '../types';
import type { CustomInputs, CustomOption, FutureCost } from '../../engine/calculators/custom';
import { NumberField } from '../../components/ui/NumberField';
import { OptionTabs } from '../../components/forms/OptionTabs';
import { Button } from '../../components/ui/Button';
import { Disclosure, FormSection, Switch, TextField } from '../../components/ui/Controls';
import { IconPlus, IconTrash } from '../../components/ui/Icons';
import { uid } from '../../lib/ids';

type Tab = 'a' | 'b' | 'shared';

export function CustomForm({ inputs, onChange }: FormProps<CustomInputs>) {
  const [tab, setTab] = useState<Tab>('a');
  const setOpt = (side: 'a' | 'b', patch: Partial<CustomOption>) => onChange({ ...inputs, [side]: { ...inputs[side], ...patch } });
  return (
    <div>
      <OptionTabs<Tab>
        tabs={[
          { key: 'a', label: 'Option A', name: inputs.a.name || 'Option A', tone: 'a' },
          { key: 'b', label: 'Option B', name: inputs.b.name || 'Option B', tone: 'b' },
          { key: 'shared', label: 'Shared', name: `${inputs.horizonYears} yr · ${inputs.investmentReturn}% return`, tone: 'shared' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab !== 'shared' ? (
        <div role="tabpanel" key={tab}>
          <OptionFields side={tab} o={inputs[tab]} horizon={inputs.horizonYears} onPatch={(p) => setOpt(tab, p)} />
        </div>
      ) : (
        <div role="tabpanel">
          <FormSection title="Time & money">
            <NumberField label="Compare over" suffix="yr" value={inputs.horizonYears} onChange={(v) => onChange({ ...inputs, horizonYears: Math.round(v) })} min={1} max={40} decimals={0} step={1} help="How many years to compare. Items with a shorter lifespan are replaced along the way." />
            <NumberField label="Investment return" format="percent" suffix="%/yr" value={inputs.investmentReturn} onChange={(v) => onChange({ ...inputs, investmentReturn: v })} min={0} max={20} decimals={1} step={0.5} help="Used for the 'invest the difference' projection only." />
            <NumberField label="Inflation" format="percent" suffix="%/yr" value={inputs.inflation} onChange={(v) => onChange({ ...inputs, inflation: v })} min={0} max={15} decimals={1} step={0.5} help="Replacement prices always inflate. Turn the switch on to inflate ongoing costs and savings too." />
            <Switch label="Grow ongoing costs with inflation" checked={inputs.growWithInflation} onChange={(v) => onChange({ ...inputs, growWithInflation: v })} />
          </FormSection>
        </div>
      )}
    </div>
  );
}

function OptionFields({ side, o, horizon, onPatch }: { side: 'a' | 'b'; o: CustomOption; horizon: number; onPatch: (p: Partial<CustomOption>) => void }) {
  const setCost = (id: string, patch: Partial<FutureCost>) => onPatch({ oneTime: o.oneTime.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const addCost = () => onPatch({ oneTime: [...o.oneTime, { id: uid(), label: 'Future cost', amount: 500, year: Math.min(horizon, Math.max(1, Math.round(horizon / 2))) }] });
  const removeCost = (id: string) => onPatch({ oneTime: o.oneTime.filter((c) => c.id !== id) });
  return (
    <>
      <FormSection title={`Option ${side.toUpperCase()}`}>
        <TextField label="Name" value={o.name} onChange={(v) => onPatch({ name: v })} placeholder={side === 'a' ? 'e.g. Keep renting the tool' : 'e.g. Buy the tool'} />
        <NumberField label="Upfront cost" format="currency" value={o.upfront} onChange={(v) => onPatch({ upfront: v })} min={0} max={100_000_000} help="Paid on day one. Leave at 0 if there is no upfront cost." />
        <div className="grid-2">
          <NumberField label="Monthly cost" format="currency" suffix="/mo" value={o.monthly} onChange={(v) => onPatch({ monthly: v })} min={0} max={1_000_000} />
          <NumberField label="Annual cost" format="currency" suffix="/yr" value={o.annual} onChange={(v) => onPatch({ annual: v })} min={0} max={10_000_000} help="Charged at the end of each year — maintenance, fees, subscriptions billed yearly." />
        </div>
      </FormSection>
      <FormSection title="Value & lifespan">
        <div className="grid-2">
          <NumberField label="Resale value" format="currency" value={o.resaleValue} onChange={(v) => onPatch({ resaleValue: v })} min={0} max={100_000_000} help="What you could sell it for at any point (we assume this value throughout). 0 if it has none." />
          <NumberField label="Lifespan" suffix="yr" value={o.lifespanYears} onChange={(v) => onPatch({ lifespanYears: v })} min={0} max={50} decimals={1} step={1} help="How long it lasts before you must replace it. 0 means it lasts the whole comparison. Replacements are bought at the inflated price and the old one is sold for its resale value." />
        </div>
      </FormSection>
      <FormSection title="Savings it produces" sub="Money this option earns or saves you.">
        <div className="grid-2">
          <NumberField label="Monthly savings" format="currency" suffix="/mo" value={o.monthlySavings} onChange={(v) => onPatch({ monthlySavings: v })} min={0} max={1_000_000} help="Reduces the monthly cost — e.g. lower electricity bills from solar, or café spending you avoid." />
          <NumberField label="Annual savings" format="currency" suffix="/yr" value={o.annualSavings} onChange={(v) => onPatch({ annualSavings: v })} min={0} max={10_000_000} />
        </div>
      </FormSection>
      <FormSection
        title="One-time future costs"
        sub="Repairs, upgrades, batteries — anything that lands in a specific year."
        right={
          <Button size="sm" variant="soft" icon={<IconPlus />} onClick={addCost}>
            Add
          </Button>
        }
      >
        {o.oneTime.length === 0 && <p className="field-hint">None yet. Add a cost that happens once in a particular year.</p>}
        {o.oneTime.map((c) => (
          <div key={c.id} className="card" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <div className="row-between">
              <TextField label="Label" value={c.label} onChange={(v) => setCost(c.id, { label: v })} />
              <Button size="sm" variant="ghost" icon={<IconTrash />} onClick={() => removeCost(c.id)} aria-label={`Remove ${c.label}`} style={{ marginTop: 22 }}>
                Remove
              </Button>
            </div>
            <div className="grid-2">
              <NumberField label="Amount" format="currency" value={c.amount} onChange={(v) => setCost(c.id, { amount: v })} min={0} max={100_000_000} />
              <NumberField label="In year" suffix="yr" value={c.year} onChange={(v) => setCost(c.id, { year: Math.round(v) })} min={1} max={40} decimals={0} step={1} help="Which year of the comparison this cost lands in (charged at the end of that year)." />
            </div>
          </div>
        ))}
      </FormSection>
      <Disclosure title="Tips for a fair comparison">
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li>Put savings on the option that produces them, not as negative costs on the other one.</li>
          <li>Use the same horizon you would realistically keep either option.</li>
          <li>If one option needs financing, add the interest as a monthly cost or use the Vehicle calculator for cars.</li>
        </ul>
      </Disclosure>
    </>
  );
}
