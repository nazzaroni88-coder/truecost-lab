import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconQuestion } from './Icons';

/**
 * Accessible "?" tooltip: toggles on click/Enter, closes on Escape, outside click, scroll or resize.
 * The popover is portalled to <body> with fixed positioning so it is never clipped by scrolling
 * containers such as the sticky inputs panel.
 */
export function InfoTip({ text, label = 'More information' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const place = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const width = Math.min(300, vw - 24);
      let left = r.left + r.width / 2 - width / 2;
      left = Math.max(12, Math.min(vw - width - 12, left));
      const top = r.bottom + 8;
      setPos({ top, left, width });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc, { passive: true });
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  // Flip above the button if there is no room below.
  const flipped = pos !== null && typeof window !== 'undefined' && pos.top + 120 > window.innerHeight;

  return (
    <span className="tip">
      <button ref={btnRef} type="button" className="tip-btn" aria-label={label} aria-expanded={open} aria-describedby={open ? id : undefined} onClick={() => setOpen((o) => !o)}>
        <IconQuestion />
      </button>
      {open &&
        pos &&
        createPortal(
          <span ref={popRef} role="tooltip" id={id} className="tip-pop" style={{ position: 'fixed', top: flipped ? undefined : pos.top, bottom: flipped ? window.innerHeight - (btnRef.current?.getBoundingClientRect().top ?? 0) + 8 : undefined, left: pos.left, width: pos.width, transform: 'none' }}>
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
