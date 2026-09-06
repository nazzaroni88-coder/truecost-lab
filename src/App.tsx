import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { CalculatorPage } from './pages/CalculatorPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Static pages are split out of the main bundle; the calculators stay in it because they are the product.
const MethodologyPage = lazy(() => import('./pages/MethodologyPage').then((m) => ({ default: m.MethodologyPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
// The comparison pages are content, not the tool: split out, but they still run the real
// calculators, so the engine they import is already in the main bundle.
const ComparisonsIndexPage = lazy(() => import('./pages/ComparisonsIndexPage'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'));

function PageLoading() {
  return (
    <div className="page container" role="status" aria-live="polite">
      <div className="prose">
        <div className="eyebrow">Loading…</div>
        <div style={{ height: 28, width: '40%', background: 'var(--tc-surface-3)', borderRadius: 8, marginTop: 12 }} />
        <div style={{ height: 16, width: '70%', background: 'var(--tc-surface-2)', borderRadius: 8, marginTop: 16 }} />
        <div style={{ height: 16, width: '60%', background: 'var(--tc-surface-2)', borderRadius: 8, marginTop: 8 }} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/calculators" element={<Navigate to="/#calculators" replace />} />
          <Route path="/calculators/:slug" element={<CalculatorPage />} />
          <Route
            path="/compare"
            element={
              <Suspense fallback={<PageLoading />}>
                <ComparisonsIndexPage />
              </Suspense>
            }
          />
          <Route
            path="/compare/:slug"
            element={
              <Suspense fallback={<PageLoading />}>
                <ComparisonPage />
              </Suspense>
            }
          />
          <Route
            path="/methodology"
            element={
              <Suspense fallback={<PageLoading />}>
                <MethodologyPage />
              </Suspense>
            }
          />
          <Route
            path="/about"
            element={
              <Suspense fallback={<PageLoading />}>
                <AboutPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
