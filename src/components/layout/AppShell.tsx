import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastProvider } from '../ui/Toast';
import { Footer } from './Footer';
import { Header } from './Header';

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash && !hash.startsWith('#s=')) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}

export function AppShell() {
  return (
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
  );
}
