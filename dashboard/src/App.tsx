import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './app/ErrorBoundary';
import { ThemeController } from './app/ThemeController';
import AppShell from './app/AppShell';
import { NotFound } from './app/NotFound';
import { APP_ROUTES, LEGACY_REDIRECTS } from './app/routes';
import { Welcome } from './features/onboarding/Welcome';
import { useSettingsStore } from './store/settings';
import { Toaster, TooltipProvider } from './ui';

export default function App() {
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);

  return (
    <ErrorBoundary variant="screen">
      <TooltipProvider>
        <ThemeController />
        <a
          href="#main-content-area"
          className="sr-only rounded-md bg-overlay px-3 py-2 text-base text-text shadow-overlay focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-toast"
        >
          Skip to content
        </a>
        <Toaster />
        {hasCompletedOnboarding ? (
          <HashRouter>
            <Routes>
              <Route element={<AppShell />}>
                {APP_ROUTES.map(({ id, path, component: Page }) => (
                  <Route key={id} path={path} element={<Page />} />
                ))}
                {LEGACY_REDIRECTS.map(({ from, to }) => (
                  <Route key={from} path={from} element={<Navigate replace to={to} />} />
                ))}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </HashRouter>
        ) : (
          <Welcome />
        )}
      </TooltipProvider>
    </ErrorBoundary>
  );
}
