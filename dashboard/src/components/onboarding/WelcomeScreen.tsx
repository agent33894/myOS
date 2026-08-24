import { useState } from 'react';
import { FileText, FolderOpen, HardDrive, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { useSettingsStore } from '../../store/settings';
import myosIcon from '../../assets/myos-icon.png';

export function WelcomeScreen() {
  const finishOnboarding = useSettingsStore((state) => state.setHasCompletedOnboarding);
  const [busyAction, setBusyAction] = useState<'choose' | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = (path: string | null) => {
    if (!path) return;
    finishOnboarding(true);
  };

  const chooseFolder = async () => {
    setBusyAction('choose');
    setError(null);
    try {
      complete(await window.electronAPI.chooseVaultFolder());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open that folder.');
    } finally {
      setBusyAction(null);
    }
  };

  const createWorkspace = async () => {
    setBusyAction('create');
    setError(null);
    try {
      complete(await window.electronAPI.createDefaultVault());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the workspace.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main className="myos-welcome">
      <section className="myos-welcome-sheet" aria-labelledby="welcome-title">
        <img className="myos-welcome-icon" src={myosIcon} alt="" />
        <p className="chronicle-garnish">Your work, in plain text</p>
        <h1 id="welcome-title">Welcome to myOS</h1>
        <p className="myos-welcome-lede">
          A quiet, local-first place for Markdown notes, projects, and the work in front of you.
        </p>

        <div className="myos-welcome-principles" aria-label="Product principles">
          <div><FileText /><span>Ordinary Markdown files</span></div>
          <div><HardDrive /><span>Stays in your folder</span></div>
          <div><Sparkles /><span>No account or API key</span></div>
        </div>

        <div className="myos-welcome-actions">
          <Button
            variant="accent"
            size="lg"
            onClick={() => void chooseFolder()}
            disabled={busyAction !== null}
          >
            <FolderOpen className="h-4 w-4" />
            {busyAction === 'choose' ? 'Opening…' : 'Choose Markdown folder'}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => void createWorkspace()}
            disabled={busyAction !== null}
          >
            {busyAction === 'create' ? 'Creating…' : 'Create workspace in Documents'}
          </Button>
        </div>

        <p className="myos-welcome-note">
          Existing folders are left in place. New notes use optional YAML frontmatter so projects,
          tasks, and context remain portable.
        </p>
        {error ? <p className="myos-welcome-error" role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
