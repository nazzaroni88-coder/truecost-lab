import type { InvestDifferenceProjection } from '../../engine/core/cashflow';
import { fmtMoney, fmtPct } from '../../lib/format';
import { MilestoneBars } from '../charts/MilestoneBars';
import { Slider } from '../ui/Controls';
import { ResultSection } from './Sections';

interface Props {
  invest: InvestDifferenceProjection;
  horizonYears: number;
  winnerName: string;
  loserName: string;
  returnPct: number;
  onReturnChange: (v: number) => void;
  /** Sentence fragment describing what the difference is, e.g. "the money you'd save with Option B". */
  differenceLabel?: string;
  id?: string;
  title?: string;
}

/**
 * Signature TrueCost section: takes the month-by-month cash-flow difference between the two options,
 * invests it at the chosen return, and shows what it could become at 5/10/20/30 years.
 */
export function InvestDifference({ invest, horizonYears, winnerName, loserName, returnPct, onReturnChange, differenceLabel, id, title }: Props) {
  if (invest.saver === 'tie') {
    return (
      <ResultSection id={id} kicker="If you invested the difference" title="No difference to invest">
        <p className="muted small">The two options cost about the same once timing and resale are included, so there is no meaningful difference to invest.</p>
      </ResultSection>
    );
  }
  const at = (y: number) => invest.milestones.find((m) => m.years === y)!;
  const m30 = at(30);
  const horizonMilestone = invest.milestones.find((m) => !m.beyondHorizon && m.years === horizonYears);
  return (
    <ResultSection id={id} kicker="If you invested the difference" title={title ?? `Choose ${winnerName}, invest what you save, and it could become…`} sub={`${differenceLabel ?? `Every month you would spend less with ${winnerName} than with ${loserName}`}. We invest each month's saving (and any resale or equity difference at the end) at ${fmtPct(returnPct, 1)} a year.`}>
      <div className="milestones" style={{ marginBottom: 'var(--sp-4)' }}>
        {invest.milestones.map((m) => (
          <div key={m.years} className={`milestone ${m.years === 30 ? 'hi' : ''}`}>
            <div className="yrs">{m.years} years</div>
            <div className="val">{fmtMoney(m.value)}</div>
            <div className="split">
              {m.value < 0 ? (
                <>
                  Behind by {fmtMoney(-m.value)} at this point
                  <br />
                  <span className="muted">(if you exited then)</span>
                </>
              ) : (
                <>
                  {fmtMoney(m.contributions)} saved
                  <br />+ {fmtMoney(m.growth)} growth
                  {!m.beyondHorizon && m.years < horizonYears && <span className="muted"> (if you exited then)</span>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <MilestoneBars milestones={invest.milestones} ariaLabel="Projected value of investing the difference at 5, 10, 20 and 30 years, split into contributions and growth" />
      <div style={{ marginTop: 'var(--sp-4)', maxWidth: 420 }}>
        <Slider label="Expected annual return" value={returnPct} min={0} max={12} step={0.5} onChange={onReturnChange} format={(v) => fmtPct(v, 1)} help="Long-run average return you expect from a diversified investment portfolio, before inflation. Historical U.S. stock returns have averaged roughly 7–10% before inflation, but returns vary widely year to year and are never guaranteed." />
      </div>
      <p className="micro muted" style={{ marginTop: 'var(--sp-3)' }}>
        {horizonMilestone
          ? `At the end of your ${horizonYears}-year decision (${fmtMoney(horizonMilestone.value)}), contributions stop and the balance simply keeps compounding.`
          : `Contributions stop after your ${horizonYears}-year decision; after that the balance simply keeps compounding.`}{' '}
        By year 30, growth would make up {m30.value > 0 ? fmtPct((m30.growth / m30.value) * 100, 0) : '—'} of the total. Projected returns are illustrative, not guaranteed.
      </p>
    </ResultSection>
  );
}
