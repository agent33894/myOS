import { FileSettings } from '../files/slots';
import { KnowledgeSettings } from '../knowledge/slots';
import { PlanningSettings } from '../planning/slots';
import { RitualSettings } from '../rituals/slots';
import { toast } from 'sonner';
import { FolderOpen } from 'lucide-react';
import { invoke } from '../../data/ipc';
import { chooseWorkspace, useWorkspacePath } from '../../data/workspace';
import { useSettingsStore } from '../../store/settings';
import { Button, Switch } from '../../ui';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

const failed = (fallback: string) => (error: unknown) =>
  toast.error(error instanceof Error ? error.message : fallback);

export function GeneralSettings() {
  const [folder, setFolder] = useWorkspacePath();
  const remind = useSettingsStore((state) => state.remindDueToday);
  const setRemind = useSettingsStore((state) => state.setRemindDueToday);

  const changeFolder = () =>
    chooseWorkspace()
      .then((next) => {
        if (!next) return;
        setFolder(next);
        toast.success('Now using the new folder');
      })
      .catch(failed('That folder could not be opened.'));

  return (
    <>
      <SettingsGroup title="Folder" description="myOS reads and writes plain Markdown files in this folder.">
        <SettingsRow
          label="Your files"
          description={
            <span className="block truncate font-mono text-xs" title={folder ?? undefined}>
              {folder ?? 'No folder chosen'}
            </span>
          }
          control={
            <>
              <Button
                variant="ghost"
                leadingIcon={FolderOpen}
                disabled={!folder}
                onClick={() => void invoke('shell:reveal', '.').catch(failed('Could not open the folder.'))}
              >
                Show in folder
              </Button>
              <Button onClick={() => void changeFolder()}>Change folder…</Button>
            </>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Reminders">
        <SettingsRow
          label="Remind me about tasks due today"
          description="One desktop notification a day when tasks are due or overdue."
          control={(id) => <Switch id={id} checked={remind} onCheckedChange={setRemind} />}
        />
      </SettingsGroup>

      <FileSettings />
      <PlanningSettings />
      <RitualSettings />
      <KnowledgeSettings />
    </>
  );
}
