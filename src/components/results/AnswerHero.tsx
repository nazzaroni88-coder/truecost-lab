import type { ReactNode } from 'react';
import { InfoTip } from '../ui/InfoTip';
import { IconWarning } from '../ui/Icons';
import { SharePrompt } from './SharePrompt';
import { RobustnessNote } from './Robustness';
import { provenanceLine, useProvenance } from './ProvenanceContext';
import type { SensitivityRow } from '../../engine/core/sensitivity';

export interface HeroStat {
  label: string;
  value: string;
  sub?: string;
  tone?: 'a' | 'b';
  help?: string;
}

export function AnswerHero({ winner, kicker = 'The answer', headline, sub, sensitivity, stats, warnings, children }: { winner: 'a' | 'b' | 'tie' | 'none'; kicker?: string; headline: ReactNode; sub?: ReactNode; sensitivity?: SensitivityRow[]; stats?: HeroStat[]; warnings?: string[]; children?: ReactNode }) {
  return (
    <>
    <section className={`answer-hero winner-${winner === 'none' ? 'tie' : winner}`} aria-labelledby="answer-heading">
      <div className="eyebrow">{kicker}</div>
      <h2 id="answer-heading" className="answer-headline" aria-live="polite" aria-atomic="true">
        {headline}
      </h2>
      {sub && <p className="answer-sub">{sub}</p>}
      <ProvenanceLine />
      {/* Whether the answer survives the inputs being wrong belongs with the answer, not four
          sections below it. */}
      {sensitivity && <RobustnessNote rows={sensitivity} />}
      {stats && stats.length > 0 && (
        <div className="answer-stats">
          {stats.map((s) => (
            <div key={s.label} className={`stat ${s.tone ?? ''}`}>
              <div className="lab">
                {s.label}
                {s.help && <InfoTip text={s.help} label={`About ${s.label}`} />}
              </div>
              <div className="val">{s.value}</div>
              {s.sub && <div className="sub">{s.sub}</div>}
            </div>
          ))}
        </div>
      )}
      {warnings && warnings.length > 0 && (
        <div className="stack-sm" style={{ marginTop: 'var(--sp-4)' }}>
          {warnings.map((w) => (
            <div key={w} className="callout callout-warning">
              <IconWarning />
              <div>{w}</div>
            </div>
          ))}
        </div>
      )}
      {children}
    </section>
    {/* A sibling, not a child: the prompt follows the answer rather than becoming part of it. */}
    <SharePrompt />
    </>
  );
}

/**
 * One quiet line saying what the answer stands on. Rendered only where a calculator page has
 * supplied provenance, so results embedded elsewhere are unaffected.
 */
function ProvenanceLine() {
  const p = useProvenance();
  if (!p) return null;
  return <p className="answer-provenance">{provenanceLine(p)}</p>;
}
