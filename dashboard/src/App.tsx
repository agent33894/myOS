import { Suspense } from 'react';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ShikiProvider } from './contexts/ShikiContext';
import { ThemeController } from './app/ThemeController';
import AppShell from './app/AppShell';
import { APP_ROUTES, LEGACY_REDIRECTS } from './app/routes';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { useSettingsStore } from './store/settings';
import { Toaster, TooltipProvider } from './ui';

export default function App() {
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);

  return (
    <ErrorBoundary>
      <ShikiProvider>
        <TooltipProvider>
          <ThemeController />
          <a href="#main-content-area" className="chronicle-skip-link">Skip to main content</a>
          <Toaster />
          {hasCompletedOnboarding ? <HashRouter>
            <Routes>
              <Route element={<AppShell />}>
                {APP_ROUTES.map((route) => {
                  const Component = route.component;
                  return <Route key={route.id} path={route.path} element={<Suspense fallback={<div className="chronicle-loading">Loading…</div>}><Component /></Suspense>} />;
                })}
                {LEGACY_REDIRECTS.map(({ from, to }) => <Route key={from} path={from} element={<Navigate replace to={to} />} />)}
              <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </HashRouter> : <WelcomeScreen />}
        </TooltipProvider>
      </ShikiProvider>
    </ErrorBoundary>
  );
}

function NotFound() {
  return (
    <div className="chronicle-detail-empty">
      <strong>Not found</strong>
      <p>This route is not part of myOS.</p>
      <p>
        <Link to="/" className="chronicle-heading-action">Go to Today</Link>
      </p>
    </div>
  );
}
