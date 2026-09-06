import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { NumberField } from '../../components/ui/NumberField';
import { SegmentedField, SelectField } from '../../components/ui/Controls';
import { IconArrowRight, IconCheck, IconExternal, IconWarning } from '../../components/ui/Icons';
import { fmtMoney } from '../../lib/format';
import {
  AFDC_LABEL,
  AFDC_URL,
  DATA_REVIEWED,
  STATES_WITH_DATA,
  US_STATES,
  UTILITY_HINT,
  confirmedTotal,
  exclusiveGroupsWithChoices,
  matchIncentives,
  suggestedTotal,
  type BodyStyle,
  type FilingStatus,
  type IncentiveMatch,
  type PurchaseType,
} from '../../data/incentives';

const STATE_KEY = 'truecost-state';

function readSavedState(): string {
  try {
    return window.localStorage.getItem(STATE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Helps someone work out what to put in the incentive field.
 *
 * It never writes to the model on its own: the user picks an amount and presses Apply. Programmes
 * whose availability depends on something we cannot see — funding rounds, eligible-vehicle lists,
 * census tracts, current legislation — are separated out as "worth checking" so the number we
 * suggest by default is only the part that survives the inputs given.
 */
export function IncentiveHelper({ open, onClose, vehiclePrice, chargerCost, currentAmount, onApply }: { open: boolean; onClose: () => void; vehiclePrice: number; chargerCost: number; currentAmount: number; onApply: (amount: number) => void }) {
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('new');
  const [bodyStyle, setBodyStyle] = useState<BodyStyle>('car');
  const [state, setState] = useState<string>(readSavedState);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [knowsIncome, setKnowsIncome] = useState(false);
  const [income, setIncome] = useState(120000);

  const matches = useMemo(
    () => matchIncentives({ purchaseType, state, vehiclePrice, bodyStyle, income: knowsIncome ? income : 'unknown', filingStatus, chargerCost }),
    [purchaseType, state, vehiclePrice, bodyStyle, income, knowsIncome, filingStatus, chargerCost],
  );
  const exclusiveChoices = exclusiveGroupsWithChoices(matches);

  const likely = matches.filter((m) => m.status === 'likely');
  const check = matches.filter((m) => m.status === 'check');
  const informational = matches.filter((m) => m.status === 'informational');
  const ended = matches.filter((m) => m.status === 'ended');
  const ruledOut = matches.filter((m) => m.status === 'ruled-out');
  const confirmed = confirmedTotal(matches);
  const suggested = suggestedTotal(matches);
  const stateHasData = state !== '' && STATES_WITH_DATA.includes(state);

  const pickState = (code: string) => {
    setState(code);
    try {
      window.localStorage.setItem(STATE_KEY, code);
    } catch {
      /* storage blocked — the choice still applies for this session */
    }
  };

  const apply = (amount: number) => {
    onApply(Math.round(amount));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="What incentives might I get?">
      <div className="callout callout-warning">
        <IconWarning />
        <div>
          <strong>The federal EV credits have ended.</strong> The $7,500 new, $4,000 used and lease pass-through credits were terminated for vehicles acquired after 30 September 2025, and the home charger credit ended on 30 June 2026. What is left is state, local and utility money.
        </div>
      </div>
      <p className="micro muted">
        Checked against primary sources in <strong>{DATA_REVIEWED}</strong>. These programmes change often and run out of funding mid-year, so treat this as a starting point for your own research, not a verification of what you qualify for.
      </p>

      <div className="field-group">
        <div className="grid-2 collapse-xs">
          <SegmentedField<PurchaseType>
            label="Buying"
            value={purchaseType}
            onChange={setPurchaseType}
            block
            options={[
              { value: 'new', label: 'New' },
              { value: 'used', label: 'Used' },
              { value: 'lease', label: 'Lease' },
            ]}
            help="Used vehicles and leases go through different programmes with different caps, so this changes the whole list."
          />
          <SegmentedField<BodyStyle>
            label="Body style"
            value={bodyStyle}
            onChange={setBodyStyle}
            block
            options={[
              { value: 'car', label: 'Car' },
              { value: 'suv', label: 'SUV / truck' },
            ]}
            help="The federal price cap is higher for SUVs, trucks and vans than for cars."
          />
        </div>
        <SelectField
          label="Your state"
          value={state}
          onChange={pickState}
          options={[{ value: '', label: 'Select a state…' }, ...US_STATES.map((s) => ({ value: s.code, label: STATES_WITH_DATA.includes(s.code) ? `${s.name} — programme listed` : s.name }))]}
          hint="Remembered for next time. States without a listed programme may still have one."
        />
        <div className="grid-2 collapse-xs">
          <SegmentedField<FilingStatus>
            label="Filing status"
            value={filingStatus}
            onChange={setFilingStatus}
            block
            options={[
              { value: 'single', label: 'Single' },
              { value: 'joint', label: 'Joint' },
            ]}
          />
          <div className="field">
            <div className="field-label">
              <span>Household income</span>
            </div>
            {knowsIncome ? (
              <NumberField label="Modified AGI" format="currency" value={income} onChange={setIncome} min={0} max={5_000_000} help="Used only to test income caps. It stays in your browser and is never sent anywhere." />
            ) : (
              <Button size="sm" variant="soft" onClick={() => setKnowsIncome(true)}>
                Enter income to test caps
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="incentive-total">
        <div>
          <div className="eyebrow">Suggested amount</div>
          <div className="incentive-total-val num">{fmtMoney(suggested)}</div>
          <div className="micro muted">
            {suggested === 0
              ? 'Nothing in this list survives your answers. Your state or utility may still offer something.'
              : `Everything your answers did not rule out, on a ${fmtMoney(vehiclePrice)} vehicle. Confirm each one below before relying on it.`}
            {exclusiveChoices.length > 0 && ' Where several options compete — utilities, or a statewide programme and its regional twin — only the largest is counted, because you can claim one.'}
          </div>
        </div>
        <div className="incentive-total-actions">
          <Button variant="primary" onClick={() => apply(suggested)} disabled={suggested === currentAmount} icon={<IconCheck />}>
            Use {fmtMoney(suggested)}
          </Button>
          {confirmed > 0 && confirmed !== suggested && (
            <Button variant="soft" size="sm" onClick={() => apply(confirmed)}>
              Use {fmtMoney(confirmed)} (no caveats)
            </Button>
          )}
        </div>
      </div>

      <div className="incentive-list">
        {likely.length > 0 && (
          <section>
            <h3 className="incentive-group">Fits your answers</h3>
            {likely.map((m) => (
              <IncentiveCard key={m.incentive.id} match={m} onApply={() => apply(currentAmount + m.amount)} />
            ))}
          </section>
        )}
        {check.length > 0 && (
          <section>
            <h3 className="incentive-group">Likely, but confirm before relying on it</h3>
            {check.map((m) => (
              <IncentiveCard key={m.incentive.id} match={m} onApply={() => apply(currentAmount + m.amount)} />
            ))}
          </section>
        )}
        <section>
          <h3 className="incentive-group">Almost always worth a search</h3>
          <IncentiveCard match={{ incentive: UTILITY_HINT, status: 'check', amount: 0, reasons: ['Amounts are set by your specific utility, so we do not estimate one for you.'] }} onApply={() => apply(currentAmount)} />
        </section>
        {informational.length > 0 && (
          <section>
            <h3 className="incentive-group">Worth knowing, but not cash at purchase</h3>
            {informational.map((m) => (
              <IncentiveCard key={m.incentive.id} match={m} onApply={() => apply(currentAmount)} />
            ))}
          </section>
        )}
        {ended.length > 0 && (
          <section>
            <h3 className="incentive-group">No longer available</h3>
            <p className="micro muted" style={{ marginBottom: 8 }}>
              Listed because plenty of guides, dealer quotes and calculators still assume these exist. If a number you read elsewhere does not match TrueCost, this is usually why.
            </p>
            {ended.map((m) => (
              <IncentiveCard key={m.incentive.id} match={m} onApply={() => apply(currentAmount)} />
            ))}
          </section>
        )}
        {ruledOut.length > 0 && (
          <details className="disclosure">
            <summary>
              <span>
                Ruled out by your answers ({ruledOut.length})
              </span>
            </summary>
            <div className="disclosure-body">
              {ruledOut.map((m) => (
                <p key={m.incentive.id} style={{ marginTop: 6 }}>
                  <strong>{m.incentive.name}</strong> — {m.reasons[0]}
                </p>
              ))}
            </div>
          </details>
        )}
      </div>

      <p className="micro muted">
        {stateHasData ? 'Your state has a listed programme above, but local air-district and city programmes may add more. ' : state ? 'No statewide programme is listed for your state in this dataset, which does not mean there is none. ' : ''}
        The full, maintained database is the{' '}
        <a href={AFDC_URL} target="_blank" rel="noopener noreferrer">
          {AFDC_LABEL} <IconExternal width={12} height={12} style={{ display: 'inline', verticalAlign: '-1px' }} />
        </a>
        . TrueCost Lab is not affiliated with any of these programmes and cannot confirm your eligibility.
      </p>
    </Modal>
  );
}

function IncentiveCard({ match, onApply }: { match: IncentiveMatch; onApply: () => void }) {
  const { incentive: inc, amount, reasons } = match;
  return (
    <div className={`incentive-card ${match.status}`}>
      <div className="incentive-card-head">
        <div>
          <strong>{inc.name}</strong>
          <div className="micro muted">
            {inc.authority === 'federal' ? 'Federal' : inc.authority === 'state' ? inc.region : 'Utility'} ·{' '}
            {inc.timing === 'point-of-sale' ? 'Usually applied at the dealer' : inc.timing === 'tax-return' ? 'Claimed on a tax return' : inc.timing === 'rebate-after-purchase' ? 'Rebate claimed after purchase' : 'Varies by provider'}
          </div>
        </div>
        <div className="incentive-card-amt num">{amount > 0 ? `up to ${fmtMoney(amount)}` : '—'}</div>
      </div>
      <p className="small">{inc.amountNote}</p>
      {reasons.length > 0 && (
        <ul className="incentive-reasons">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {inc.notes.length > 0 && (
        <details className="incentive-notes">
          <summary className="micro">How it works</summary>
          <ul>
            {inc.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <a className="micro" href={inc.sourceUrl} target="_blank" rel="noopener noreferrer">
          {inc.sourceLabel} <IconExternal width={11} height={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
        </a>
        {amount > 0 && (
          <button type="button" className="link-btn micro" style={{ marginLeft: 'auto' }} onClick={onApply}>
            Add {fmtMoney(amount)} <IconArrowRight width={12} height={12} style={{ display: 'inline', verticalAlign: '-2px' }} />
          </button>
        )}
      </div>
    </div>
  );
}
