import type { FormProps } from '../types';
import type { DebtInvestInputs } from '../../engine/calculators/debtInvest';
import { NumberField } from '../../components/ui/NumberField';
import { FormSection } from '../../components/ui/Controls';
import { fmtMoney } from '../../lib/format';

export function DebtInvestForm({ inputs: i, onChange }: FormProps<DebtInvestInputs>) {
  const set = (patch: Partial<DebtInvestInputs>) => onChange({ ...i, ...patch });
  const monthlyInterest = (i.debtBalance * i.apr) / 100 / 12;
  return (
    <div>
      <FormSection title="Your debt" sub="One loan or card. Run separate scenarios for others.">
        <NumberField label="Balance" format="currency" value={i.debtBalance} onChange={(v) => set({ debtBalance: v })} min={0} max={10_000_000} />
        <div className="grid-2">
          <NumberField label="APR" format="percent" value={i.apr} onChange={(v) => set({ apr: v })} min={0} max={60} decimals={2} step={0.25} help="The interest rate on the debt. This is a guaranteed cost: every dollar of balance costs this much per year, no matter what markets do." />
          <NumberField label="Minimum payment" format="currency" suffix="/mo" value={i.minimumPayment} onChange={(v) => set({ minimumPayment: v })} min={0} max={100000} hint={i.debtBalance > 0 ? `Interest alone: ${fmtMoney(monthlyInterest)}/mo` : undefined} help="The required monthly payment. Both strategies always pay at least this." />
        </div>
      </FormSection>
      <FormSection title="Extra money each month" sub="The amount you're deciding what to do with.">
        <NumberField label="Extra available" format="currency" suffix="/mo" value={i.extraMonthly} onChange={(v) => set({ extraMonthly: v })} min={0} max={100000} help="Money beyond the minimum that could go to the debt or to investments. Both strategies use exactly this much, every month, so the comparison is fair." />
      </FormSection>
      <FormSection title="What the market does">
        <NumberField label="Expected investment return" format="percent" suffix="%/yr" value={i.investmentReturn} onChange={(v) => set({ investmentReturn: v })} min={0} max={30} decimals={1} step={0.5} help="Your best guess at the long-run annual return of the investments. Diversified stock portfolios have averaged roughly 7–10% before inflation historically — with big swings, and no guarantee." />
        <NumberField label="Time horizon" suffix="yr" value={i.horizonYears} onChange={(v) => set({ horizonYears: Math.round(v) })} min={1} max={40} decimals={0} step={1} help="How far ahead to compare. Both strategies keep deploying the same monthly budget for the whole period." />
      </FormSection>
    </div>
  );
}
