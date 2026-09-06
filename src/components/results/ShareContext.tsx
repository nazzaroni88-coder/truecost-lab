import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ShareSummary } from '../../calculators/types';
import { buildShareUrl } from '../../scenarios/urlCodec';
import { buildSummaryText } from '../../share/summaryText';

/**
 * One share modal per results pane, opened from more than one place.
 *
 * The utility bar above the result and the prompt under the answer are two different invitations to
 * the same thing, so the dialog and the URL it encodes live here rather than inside either of them.
 */
export interface ShareState {
  calculatorName: string;
  scenarioName: string;
  summary: ShareSummary;
  url: string;
  text: string;
  /** True when an input is out of range: the app is telling the reader not to trust this answer. */
  blocked: boolean;
  open: () => void;
}

const Ctx = createContext<ShareState | null>(null);

/** Null outside a provider, so a results component can render without one (tests, storybook). */
export function useShare(): ShareState | null {
  return useContext(Ctx);
}

export function ShareProvider<I>({
  calculatorId,
  calculatorName,
  path,
  scenarioName,
  inputs,
  summary,
  blocked = false,
  renderModal,
  children,
}: {
  calculatorId: string;
  calculatorName: string;
  path: string;
  scenarioName: string;
  inputs: I;
  summary: ShareSummary;
  blocked?: boolean;
  /** The dialog itself, injected so this module stays free of the modal's dependencies. */
  renderModal: (p: { open: boolean; onClose: () => void; state: ShareState }) => ReactNode;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const url = buildShareUrl({ calculatorId, name: scenarioName, inputs }, path);
  const text = buildSummaryText(calculatorName, summary, url, scenarioName);
  const open = useCallback(() => setIsOpen(true), []);
  const state = useMemo<ShareState>(() => ({ calculatorName, scenarioName, summary, url, text, blocked, open }), [calculatorName, scenarioName, summary, url, text, blocked, open]);

  return (
    <Ctx.Provider value={state}>
      {children}
      {renderModal({ open: isOpen, onClose: () => setIsOpen(false), state })}
    </Ctx.Provider>
  );
}
