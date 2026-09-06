import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Tracks which inputs currently hold a value the model cannot use.
 *
 * Number fields clamp out-of-range values before they reach the engine, which keeps the math safe
 * but creates a worse problem: the box can read "0" while the results are computed from the
 * minimum of 1. Registering invalid fields here lets the results area say so plainly instead of
 * presenting a confident answer built on a number the user did not type.
 */
interface InvalidFieldsApi {
  /** Field labels that are currently invalid, in registration order. */
  invalid: string[];
  setInvalid: (id: string, label: string | null) => void;
}

const InvalidFieldsContext = createContext<InvalidFieldsApi | null>(null);

export function InvalidFieldsProvider({ children }: { children: ReactNode }) {
  const [invalid, setInvalidState] = useState<string[]>([]);
  const map = useRef(new Map<string, string>());

  const setInvalid = useCallback((id: string, label: string | null) => {
    if (label === null) {
      if (!map.current.has(id)) return;
      map.current.delete(id);
    } else {
      if (map.current.get(id) === label) return;
      map.current.set(id, label);
    }
    setInvalidState([...map.current.values()]);
  }, []);

  const api = useMemo(() => ({ invalid, setInvalid }), [invalid, setInvalid]);
  return <InvalidFieldsContext.Provider value={api}>{children}</InvalidFieldsContext.Provider>;
}

/** Null outside a provider, so fields work standalone (e.g. in tests). */
export function useInvalidFields(): InvalidFieldsApi | null {
  return useContext(InvalidFieldsContext);
}
