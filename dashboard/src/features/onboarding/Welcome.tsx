import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FolderOpen, Sparkles } from 'lucide-react';
import { chooseWorkspace, createStarterWorkspace } from '../../data/workspace';
import { useSettingsStore } from '../../store/settings';
import { Button, Icon, Spinner } from '../../ui';
import myosIcon from '../../assets/myos-icon.png';
import { WindowStrip } from '../shell/WindowStrip';
import { weekStartOf } from '../rituals/weekly';
import { AreasStep } from './AreasStep';

type Choice = 'fresh' | 'open';

interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  testId: string;
}

function ChoiceCard({ icon, title, description, busy, disabled, onClick, testId }: ChoiceCardProps) {
  return (
    <Button
      variant="ghost"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="h-auto w-full flex-col items-start justify-start gap-4 whitespace-normal rounded-lg bg-raised p-5 text-left text-text shadow-raised transition-all duration-base hover:-translate-y-0.5 hover:bg-raised hover:shadow-overlay active:translate-y-0"
    >
      <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent-text">
        {busy ? <Spinner size="sm" label="Working" /> : <Icon icon={icon} size="lg" />}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-md font-semibold text-text">{title}</span>
        <span className="text-sm font-normal text-text-secondary">{description}</span>
      </span>
    </Button>
  );
}

/** First run: pick where your files live, then which areas the space is for. Lands on Today afterwards. */
export function Welcome() {
  const finishOnboarding = useSettingsStore((state) => state.setHasCompletedOnboarding);
  const [busy, setBusy] = useState<Choice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'folder' | 'areas'>('folder');

  const finish = () => {
    window.location.hash = '#/';
    // A brand-new space has nothing to review yet: the weekly review waits for next week.
    useSettingsStore.getState().setSetting('weeklyNudgeDismissed', weekStartOf());
    finishOnboarding(true);
  };

  const start = async (choice: Choice) => {
    setBusy(choice);
    setError(null);
    try {
      const folder = choice === 'fresh' ? await createStarterWorkspace() : await chooseWorkspace();
      if (!folder) return;
      setStep('areas');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That folder could not be opened.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-canvas text-text">
      <WindowStrip closable />
      <main className="grid flex-1 place-items-center overflow-y-auto px-6 pb-16">
        {step === 'areas' ? (
          <AreasStep onDone={finish} />
        ) : (
          <section aria-labelledby="welcome-title" className="flex w-full max-w-xl animate-dialog-in flex-col items-center text-center">
            <img src={myosIcon} alt="" className="size-20 rounded-xl shadow-overlay" />
            <h1 id="welcome-title" className="mt-8 text-2xl font-semibold">
              Welcome to myOS
            </h1>
            <p className="mt-3 text-md text-text-secondary">
              A calm home for your notes, tasks, and projects —
              <br />
              plain Markdown files in a folder you own.
            </p>
            <div className="mt-10 grid w-full gap-3 sm:grid-cols-2">
              <ChoiceCard
                testId="onboarding-start-fresh"
                icon={Sparkles}
                title="Start fresh"
                description="A new folder in Documents, with a few examples to show you around."
                busy={busy === 'fresh'}
                disabled={busy !== null}
                onClick={() => void start('fresh')}
              />
              <ChoiceCard
                testId="onboarding-open-folder"
                icon={FolderOpen}
                title="Open a folder…"
                description="Use Markdown files you already have. Nothing is moved or renamed."
                busy={busy === 'open'}
                disabled={busy !== null}
                onClick={() => void start('open')}
              />
            </div>
            {error ? (
              <p role="alert" className="mt-4 text-sm text-danger">
                {error}
              </p>
            ) : null}
            <p className="mt-8 text-sm text-text-tertiary">No account. Nothing leaves your computer.</p>
          </section>
        )}
      </main>
    </div>
  );
}
