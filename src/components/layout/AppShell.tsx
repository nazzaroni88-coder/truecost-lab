import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastProvider } from '../ui/Toast';
import { ThemeProvider } from '../ui/Theme';
import { Footer } from './Footer';
import { Header } from './Header';

/**
 * Scrolls to the fragment on navigation, or to the top when there is none.
 *
 * `behavior: 'auto'` is passed explicitly rather than left to inherit the CSS. When the stylesheet
 * set `scroll-behavior: smooth` globally, this call silently did nothing in a real Chrome — verified
 * as a no-op even after three seconds — which broke every in-page anchor in the app while the URL
 * updated correctly, so it looked like it had worked.
 */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash && !hash.startsWith('#s=')) {
      // A hash from a share link or a hand-typed URL is untrusted input; querySelector throws on
      // anything that is not a valid selector (e.g. "#123").
      let el: Element | null = null;
      try {
        el = document.querySelector(hash);
      } catch {
        el = null;
      }
      if (el) {
        el.scrollIntoView({ block: 'start', behavior: 'auto' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);
  return null;
}

export function AppShell() {
  return (
    <ThemeProvider>
      <ToastProvider>
      <div className="app-shell">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <ScrollManager />
        <main id="main" className="app-main" tabIndex={-1}>
          <Outlet />
        </main>
        <Footer />
      </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
