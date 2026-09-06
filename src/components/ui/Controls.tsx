import { useId, useState, type ReactNode } from 'react';
import { IconChevron } from './Icons';
import { InfoTip } from './InfoTip';

/* ---------- Segmented control ---------- */
export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  tone?: 'a' | 'b';
}

export function Segmented<T extends string>({ options, value, onChange, label, block, className }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; label: string; block?: boolean; className?: string }) {
  return (
    <div className={`segmented ${block ? 'block' : ''} ${className ?? ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`seg ${o.tone ? `seg-${o.tone}` : ''}`}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              const i = options.findIndex((x) => x.value === value);
              onChange(options[(i + 1) % options.length].value);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              const i = options.findIndex((x) => x.value === value);
              onChange(options[(i - 1 + options.length) % options.length].value);
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Segmented field (labelled) ---------- */
export function SegmentedField<T extends string>({ label, help, ...rest }: { label: string; help?: string; options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; block?: boolean }) {
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        {help && <InfoTip text={help} label={`About ${label}`} />}
      </div>
      <Segmented label={label} {...rest} />
    </div>
  );
}

/* ---------- Select ---------- */
export function SelectField<T extends string | number>({ label, value, onChange, options, help, hint, id }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; help?: string; hint?: string; id?: string }) {
  const autoId = useId();
  const selId = id ?? autoId;
  return (
    <div className="field">
      <label className="field-label" htmlFor={selId}>
        <span>{label}</span>
        {help && <InfoTip text={help} label={`About ${label}`} />}
      </label>
      <div className="field-control">
        <select
          id={selId}
          value={String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            const match = options.find((o) => String(o.value) === raw);
            if (match) onChange(match.value);
          }}
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
        <IconChevron className="select-chev" width={16} height={16} />
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

/* ---------- Text field ---------- */
export function TextField({ label, value, onChange, placeholder, id, maxLength = 60, help }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; id?: string; maxLength?: number; help?: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        <span>{label}</span>
        {help && <InfoTip text={help} label={`About ${label}`} />}
      </label>
      <div className="field-control">
        <input id={inputId} type="text" value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

/* ---------- Slider ---------- */
export function Slider({ label, value, min, max, step, onChange, format, id, help }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; id?: string; help?: string }) {
  const autoId = useId();
  const sid = id ?? autoId;
  const pct = max > min ? ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100 : 0;
  return (
    <div className="slider">
      <div className="slider-head">
        <label htmlFor={sid} className="row" style={{ gap: 6 }}>
          <span>{label}</span>
          {help && <InfoTip text={help} label={`About ${label}`} />}
        </label>
        <span className="val" aria-live="polite">
          {format(value)}
        </span>
      </div>
      <input id={sid} type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={(e) => onChange(Number(e.target.value))} style={{ ['--pct' as string]: `${pct}%` }} aria-valuetext={format(value)} />
    </div>
  );
}

/* ---------- Switch ---------- */
export function Switch({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  const id = useId();
  return (
    <div className="switch">
      <button id={id} type="button" role="switch" aria-checked={checked} className="switch-track" onClick={() => onChange(!checked)} aria-label={label} />
      <label htmlFor={id} style={{ cursor: 'pointer' }}>
        {label}
      </label>
      {help && <InfoTip text={help} label={`About ${label}`} />}
    </div>
  );
}

/* ---------- Disclosure ---------- */
export function Disclosure({ title, children, defaultOpen = false, icon }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; icon?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className="disclosure" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>
        {icon}
        <span>{title}</span>
        <IconChevron className="chev" width={18} height={18} />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}

/* ---------- Callout ---------- */
export function Callout({ tone = 'info', icon, children }: { tone?: 'info' | 'warning' | 'neutral'; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className={`callout callout-${tone}`} role={tone === 'warning' ? 'alert' : undefined}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

/* ---------- Form section ---------- */
export function FormSection({ title, sub, children, right }: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="form-section">
      <div className="form-section-head">
        <div>
          <h3>{title}</h3>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {right}
      </div>
      <div className="field-group">{children}</div>
    </section>
  );
}
