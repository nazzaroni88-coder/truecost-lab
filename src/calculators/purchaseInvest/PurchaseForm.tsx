import type { FormProps } from '../types';
import type { PurchaseInvestInputs } from '../../engine/calculators/purchaseInvest';
import { NumberField } from '../../components/ui/NumberField';
import { Disclosure, FormSection } from '../../components/ui/Controls';

export function PurchaseForm({ inputs: i, onChange }: FormProps<PurchaseInvestInputs>) {
  const set = (patch: Partial<PurchaseInvestInputs>) => onChange({ ...i, ...patch });
  return (
    <div>
      <FormSection title="The purchase" sub="One-time, recurring, or both.">
        <NumberField label="One-time amount" format="currency" value={i.oneTimeAmount} onChange={(v) => set({ oneTimeAmount: v })} min={0} max={10_000_000} help="Money spent today. Leave at 0 for a purely recurring expense." />
        <div className="grid-2">
          <NumberField label="Recurring amount" format="currency" suffix="/mo" value={i.monthlyAmount} onChange={(v) => set({ monthlyAmount: v })} min={0} max={100000} help="A monthly cost — subscription, payment, habit. Leave at 0 if none." />
          <NumberField label="For how long" suffix="yr" value={i.monthlyYears} onChange={(v) => set({ monthlyYears: v })} min={0} max={30} decimals={0} step={1} help="How many years the recurring amount continues (up to 30)." />
        </div>
        <Disclosure title="It keeps some value (resale)">
          <div className="field-group" style={{ paddingTop: 8 }}>
            <p className="micro muted">If you could sell the purchase later, enter what you would get and when. That money comes back and is invested from then on, so it reduces the opportunity cost.</p>
            <div className="grid-2">
              <NumberField label="Resale value" format="currency" value={i.resaleValue} onChange={(v) => set({ resaleValue: v })} min={0} max={10_000_000} />
              <NumberField label="Sold after" suffix="yr" value={i.resaleYear} onChange={(v) => set({ resaleYear: v })} min={0} max={30} decimals={0} step={1} />
            </div>
          </div>
        </Disclosure>
      </FormSection>
      <FormSection title="Returns & inflation">
        <NumberField label="Expected investment return" format="percent" suffix="%/yr" value={i.investmentReturn} onChange={(v) => set({ investmentReturn: v })} min={0} max={20} decimals={1} step={0.5} help="Long-run annual return if the money were invested instead. Diversified stock portfolios have averaged roughly 7–10% before inflation historically, with no guarantee." />
        <NumberField label="Inflation" format="percent" suffix="%/yr" value={i.inflation} onChange={(v) => set({ inflation: v })} min={0} max={15} decimals={1} step={0.5} help="Used to translate future dollars into today's purchasing power." />
      </FormSection>
    </div>
  );
}
