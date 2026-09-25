import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, FolderOpen, Sprout } from 'lucide-react';
import { paths, toNoteUrl } from '../../app/navigation';
import { invoke } from '../../data/ipc';
import { chooseWorkspace, createStarterWorkspace } from '../../data/workspace';
import { Button, Icon, Spinner } from '../../ui';
import appIcon from '../../assets/icon.png';
import { WindowStrip } from '../shell/WindowStrip';

type Choice = 'fresh' | 'open';

interface ChoiceRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  testId: string;
  autoFocus?: boolean;
}

function ChoiceRow({ icon, title, description, busy, disabled, onClick, testId, autoFocus }: ChoiceRowProps) {
  return (
    <Button
      variant="ghost"
      data-testid={testId}
      disabled={disabled}
      autoFocus={autoFocus}
      onClick={onClick}
      className="group h-auto w-full justify-start gap-4 whitespace-normal rounded-lg px-4 py-4 text-left hover:bg-text/5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
        {busy ? <Spinner size="sm" label="Working" /> : <Icon icon={icon} size="lg" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-md font-semibold text-text">{title}</span>
        <span className="text-sm font-normal text-text-secondary">{description}</span>
      </span>
      <Icon icon={ArrowRight} className="shrink-0 text-text-tertiary opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-visible:opacity-100" />
    </Button>
  );
}

/** First run: open a folder of Markdown files (Obsidian vaults are recognized), or start a small one. */
export function Welcome({ onOpened }: { onOpened: (folder: string) => void }) {
  const [busy, setBusy] = useState<Choice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vault, setVault] = useState<string | null>(null);

  const enter = (folder: string, url: string) => {
    window.location.hash = `#${url}`;
    onOpened(folder);
  };

  const start = async (choice: Choice) => {
    setBusy(choice);
    setError(null);
    try {
      if (choice === 'fresh') {
        const folder = await createStarterWorkspace();
        if (folder) enter(folder, toNoteUrl('README.md'));
        return;
      }
      const folder = await chooseWorkspace();
      if (!folder) return;
      if (await invoke('workspace:obsidian').catch(() => false)) setVault(folder);
      else enter(folder, paths.today);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That folder could not be opened.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-canvas text-text">
      <WindowStrip closable />
      <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-16">
        <section aria-labelledby="welcome-title" className="flex w-full max-w-md animate-dialog-in flex-col items-center rounded-xl bg-sheet px-8 pb-8 pt-10 text-center shadow-sheet">
          <img src={appIcon} alt="" className="size-16 rounded-xl shadow-raised" />
          <h1 id="welcome-title" className="mt-6 text-xl font-semibold">
            myOS Next
          </h1>
          <p className="mt-2 text-base text-text-secondary">A quiet editor for a folder of Markdown files.</p>

          {vault ? (
            <div role="status" className="mt-8 flex w-full flex-col items-center gap-4">
              <p className="text-md text-text">Obsidian vault found. Daily notes and links will work the same.</p>
              <p className="max-w-full truncate font-mono text-xs text-text-tertiary">{vault}</p>
              <Button variant="primary" autoFocus onClick={() => enter(vault, paths.today)}>
                Continue
              </Button>
            </div>
          ) : (
            <div className="mt-8 flex w-full flex-col gap-1">
              <ChoiceRow
                testId="onboarding-open-folder"
                icon={FolderOpen}
                title="Open a folder…"
                description="Notes, docs, or an Obsidian vault. Nothing is moved or renamed."
                busy={busy === 'open'}
                disabled={busy !== null}
                autoFocus
                onClick={() => void start('open')}
              />
              <ChoiceRow
                testId="onboarding-start-fresh"
                icon={Sprout}
                title="Start a small folder"
                description="Documents/Notes, with a README, a daily folder, and one example note."
                busy={busy === 'fresh'}
                disabled={busy !== null}
                onClick={() => void start('fresh')}
              />
            </div>
          )}
          {error ? (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </section>
        <p className="mt-6 max-w-md text-center text-sm text-text-secondary">No account and no tracking. Your files stay on this computer; the network is used only when you ask Git to pull or push.</p>
      </main>
    </div>
  );
}
