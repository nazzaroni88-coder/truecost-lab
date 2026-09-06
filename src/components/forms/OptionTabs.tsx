import { useId, type KeyboardEvent } from 'react';

export interface OptionTabDef<K extends string> {
  key: K;
  /** Small uppercase label, e.g. "Option A". */
  label: string;
  /** The current value/name shown under the label. */
  name: string;
  tone: 'a' | 'b' | 'shared';
}

/**
 * Accessible tab strip used by the A/B calculators to switch between input groups.
 * Arrow keys move between tabs; Home/End jump to the ends.
 */
export function OptionTabs<K extends string>({ tabs, value, onChange, ariaLabel = 'Edit inputs for' }: { tabs: OptionTabDef<K>[]; value: K; onChange: (k: K) => void; ariaLabel?: string }) {
  const id = useId();
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.findIndex((t) => t.key === value);
    let next = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].key);
    const el = document.getElementById(`${id}-tab-${tabs[next].key}`);
    el?.focus();
  };
  return (
    <div className={`option-tabs ${tabs.length === 3 ? 'three' : ''}`} role="tablist" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button key={t.key} id={`${id}-tab-${t.key}`} role="tab" type="button" aria-selected={value === t.key} tabIndex={value === t.key ? 0 : -1} className={`option-tab ${t.tone}`} onClick={() => onChange(t.key)} onKeyDown={onKey}>
          <span className="lab">{t.label}</span>
          <span className="nm" title={t.name}>
            {t.name}
          </span>
        </button>
      ))}
    </div>
  );
}
