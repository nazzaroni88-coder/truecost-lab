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
/** Retry delays in ms for a fragment target that has not rendered yet. */
const HASH_RETRY_MS = [0, 40, 120, 300, 700];

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const wantsTarget = hash.length > 1 && !hash.startsWith('#s=');
    if (!wantsTarget) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    let done = false;
    const attempt = () => {
      if (done) return;
      // A hash from a share link or a hand-typed URL is untrusted input; querySelector throws on
      // anything that is not a valid selector (e.g. "#123").
      let el: Element | null = null;
      try {
        el = document.querySelector(hash);
      } catch {
        el = null;
      }
      if (!el) return;
      done = true;
      el.scrollIntoView({ block: 'start', behavior: 'auto' });
    };

    /*
     * Retry, because the target may not exist on the first pass.
     *
     * /methodology and /about are lazy routes behind Suspense, so on a COLD load of
     * /methodology#invest this effect runs while the page is still suspended and the section has
     * not rendered. The old code took that one miss as final and scrolled to the top instead —
     * silently breaking every deep link into the two pages that are nothing but deep links, while
     * in-app clicks kept working because by then the page was already mounted.
     *
     * Deliberately no scroll-to-top fallback here: if the fragment never resolves, leaving the page
     * where it is beats yanking the reader to the top of a document they linked into.
     */
    const timers = HASH_RETRY_MS.map((ms) => window.setTimeout(attempt, ms));
    return () => {
      done = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
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
