import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';
import { IconClose } from './Icons';

export function Modal({ open, onClose, title, children, icon }: { open: boolean; onClose: () => void; title: string; children: ReactNode; icon?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (e.target === d) onClose(); // backdrop click
    };
    d.addEventListener('cancel', onCancel);
    d.addEventListener('click', onClick);
    return () => {
      d.removeEventListener('cancel', onCancel);
      d.removeEventListener('click', onClick);
    };
  }, [onClose]);

  return (
    <dialog ref={ref} className="modal" aria-labelledby="modal-title">
      {open && (
        <div>
          <div className="modal-head">
            {icon}
            <h2 id="modal-title">{title}</h2>
            <span style={{ marginLeft: 'auto' }}>
              <IconButton label="Close" variant="ghost" onClick={onClose} icon={<IconClose />} />
            </span>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      )}
    </dialog>
  );
}
