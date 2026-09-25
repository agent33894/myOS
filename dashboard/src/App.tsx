import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './app/ErrorBoundary';
import { NotFound } from './app/NotFound';
import { paths } from './app/navigation';
import { APP_ROUTES } from './app/routes';
import { ThemeController } from './app/ThemeController';
import { useWorkspacePath } from './data/workspace';
import { Welcome } from './features/onboarding/Welcome';
import { Shell } from './features/shell/Shell';
import { loadSettings, useSettings } from './store/settings';
import { Toaster, TooltipProvider } from './ui';

export default function App() {
  const [folder, setFolder] = useWorkspacePath();
  const settingsLoaded = useSettings((state) => state.loaded);

  useEffect(() => {
    void loadSettings().catch((error: unknown) => console.error('Could not load settings:', error));
  }, []);

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
        {folder === undefined || !settingsLoaded ? null : folder === null ? (
          <Welcome onOpened={setFolder} />
        ) : (
          <HashRouter>
            <Routes>
              <Route element={<Shell />}>
                <Route index element={<Navigate replace to={paths.today} />} />
                {APP_ROUTES.map(({ path, component: Screen }) => (
                  <Route key={path} path={path} element={<Screen />} />
                ))}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </HashRouter>
        )}
      </TooltipProvider>
    </ErrorBoundary>
  );
}
