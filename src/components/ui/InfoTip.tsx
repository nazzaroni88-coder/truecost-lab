import { useEffect, useId, useRef, useState } from 'react';
import { IconQuestion } from './Icons';

/** Accessible "?" tooltip: toggles on click/Enter, closes on Escape or outside click. */
export function InfoTip({ text, label = 'More information' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<'center' | 'left' | 'right'>('center');
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const vw = window.innerWidth;
      if (r.left < 160) setAlign('left');
      else if (vw - r.right < 160) setAlign('right');
      else setAlign('center');
    }
    setOpen((o) => !o);
  };

  return (
    <span className="tip" ref={ref}>
      <button type="button" className="tip-btn" aria-label={label} aria-expanded={open} aria-controls={id} onClick={toggle}>
        <IconQuestion />
      </button>
      {open && (
        <span role="tooltip" id={id} className={`tip-pop ${align === 'left' ? 'align-left' : align === 'right' ? 'align-right' : ''}`}>
          {text}
        </span>
      )}
    </span>
  );
}
