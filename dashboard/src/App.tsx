import { Suspense } from 'react';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ShikiProvider } from './contexts/ShikiContext';
import { ThemeController } from './app/ThemeController';
import AppShell from './app/AppShell';
import { APP_ROUTES } from './app/routes';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { useSettingsStore } from './store/settings';

export default function App() {
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);

  return (
    <ErrorBoundary>
      <ShikiProvider>
        <ThemeController />
        <a href="#main-content-area" className="chronicle-skip-link">Skip to main content</a>
        <Toaster position="top-right" theme="system" closeButton />
        {hasCompletedOnboarding ? <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              {APP_ROUTES.map((route) => {
                const Component = route.component;
                return <Route key={route.id} path={route.path} element={<Suspense fallback={<div className="chronicle-loading">Loading…</div>}><Component /></Suspense>} />;
              })}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter> : <WelcomeScreen />}
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
