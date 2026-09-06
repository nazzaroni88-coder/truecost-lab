import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { IconButton } from './Button';
import { IconMoon, IconSun } from './Icons';

export type Theme = 'light' | 'dark';

export const THEME_KEY = 'truecost-theme';

interface ThemeApi {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeApi>({ theme: 'dark', setTheme: () => {}, toggle: () => {} });

/**
 * Reads whatever the inline boot script in index.html already stamped on <html>. That script runs
 * before the stylesheet paints, so there is never a flash of the wrong theme, and React simply
 * adopts the value rather than deciding it a second time.
 */
function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage blocked — fall through to the default */
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Keep the browser UI (address bar, form controls) in step with the page.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f131a' : '#ffffff');
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage blocked — the theme still applies for this session */
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const api = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return <IconButton label={`Switch to ${next} mode`} variant="ghost" className="theme-toggle" onClick={toggle} icon={theme === 'dark' ? <IconSun /> : <IconMoon />} />;
}
