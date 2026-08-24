import { Palette, Settings as SettingsIcon, FolderGit2, Bell } from 'lucide-react';
import { useState, useEffect, Component, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppearanceTabs from '../components/settings/AppearanceTabs';
import GeneralSettings from '../components/settings/GeneralSettings';
import GitActivitySettings from '../components/settings/GitActivitySettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import PageShell from '../components/ui/PageShell';
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

// Error boundary for individual settings tabs
interface ErrorBoundaryProps {
  fallbackLabel: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SettingsTabErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="py-6">
          <div className="ed-label ed-text-error mb-2">Error</div>
          <h3 className="chronicle-settings-section-title">
            Failed to load {this.props.fallbackLabel}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

type SettingsCategory = 'general' | 'appearance' | 'notifications' | 'git-activity';

const VALID_CATEGORIES: SettingsCategory[] = ['general', 'appearance', 'notifications', 'git-activity'];

const categories: Array<{
  id: SettingsCategory;
  label: string;
  icon: typeof Palette;
}> = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'git-activity', label: 'Git Activity', icon: FolderGit2 },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');

  useEffect(() => {
    const category = searchParams.get('category') as SettingsCategory | null;
    if (category && VALID_CATEGORIES.includes(category)) {
      setActiveCategory(category);
      return;
    }
    if (!category) {
      setActiveCategory('general');
    }
  }, [searchParams]);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const nextCategory = activeCategory === 'general' ? null : activeCategory;
    if (categoryParam === nextCategory) {
      return;
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextCategory) {
        next.set('category', nextCategory);
      } else {
        next.delete('category');
      }
      return next;
    }, { replace: true });
  }, [activeCategory, searchParams, setSearchParams]);

  return (
    <PageShell
      topBarClassName="px-6"
      topBar={(
          <nav className="chronicle-settings-tabs">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn('chronicle-settings-tab', isActive && 'is-active')}
                >
                  <Icon />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </nav>
      )}
      contentClassName="overflow-y-auto custom-scrollbar"
    >
      <div className="chronicle-settings-page">
        {activeCategory === 'general' && <SettingsTabErrorBoundary fallbackLabel="General settings"><GeneralSettings /></SettingsTabErrorBoundary>}
        {activeCategory === 'appearance' && <SettingsTabErrorBoundary fallbackLabel="Appearance settings"><AppearanceTabs /></SettingsTabErrorBoundary>}
        {activeCategory === 'notifications' && <SettingsTabErrorBoundary fallbackLabel="Notification settings"><NotificationSettings /></SettingsTabErrorBoundary>}
        {activeCategory === 'git-activity' && <SettingsTabErrorBoundary fallbackLabel="Git Activity settings"><GitActivitySettings /></SettingsTabErrorBoundary>}
      </div>
    </PageShell>
  );
}
