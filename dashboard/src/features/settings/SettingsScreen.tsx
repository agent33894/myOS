import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FolderOpen } from 'lucide-react';
import type { Settings } from '@shared/settings';
import { invoke } from '../../data/ipc';
import { chooseWorkspace, useWorkspacePath } from '../../data/workspace';
import { updateSettings, useSettings } from '../../store/settings';
import { Button, Input, PageHeader, PageLayout, SegmentedControl, Switch } from '../../ui';
import { AppearanceSettings } from './AppearanceSettings';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

const failed = (fallback: string) => (error: unknown) => toast.error(error instanceof Error ? error.message : fallback);

type TextKey = 'dailyFolder' | 'dailyPattern' | 'captureTarget' | 'captureHeading';

/** A text setting, saved when the field loses focus or on Enter. */
function TextSetting({ name, label, placeholder, toValue = (text) => text }: { name: TextKey; label: string; placeholder?: string; toValue?: (text: string) => Settings[TextKey] }) {
  const saved = useSettings((state) => state[name]) ?? '';
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [saved]);
  const commit = () => text !== saved && void updateSettings({ [name]: toValue(text.trim()) });
  return (
    <Input
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === 'Enter' && commit()}
      className="w-56 font-mono"
    />
  );
}

/** `/settings`: the folder, daily notes, capture, editor, and appearance. */
export default function SettingsScreen() {
  const [folder, setFolder] = useWorkspacePath();
  const editorMode = useSettings((state) => state.editorMode);
  const vimKeys = useSettings((state) => state.vimKeys);

  const changeFolder = () =>
    chooseWorkspace()
      .then((next) => {
        if (next) setFolder(next);
      })
      .catch(failed('That folder could not be opened.'));

  return (
    <PageLayout className="gap-8 px-6">
      <PageHeader title="Settings" />
      <SettingsGroup title="Folder" description="myOS Next reads and writes the Markdown files in this folder. Settings are kept apart, in the app’s own data folder.">
        <SettingsRow
          label="Open folder"
          description={<span className="block truncate font-mono text-xs">{folder ?? 'No folder open'}</span>}
          control={
            <>
              <Button variant="ghost" leadingIcon={FolderOpen} disabled={!folder} onClick={() => void invoke('shell:reveal', '.').catch(failed('Could not show the folder.'))}>
                Show
              </Button>
              <Button onClick={() => void changeFolder()}>Change…</Button>
            </>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Daily notes" description="Taken from Obsidian’s daily-notes settings when the folder has them.">
        <SettingsRow label="Folder" description="Where daily notes live. Leave empty for the top of the folder." control={<TextSetting name="dailyFolder" label="Daily notes folder" placeholder="daily" />} />
        <SettingsRow label="File name" description="YYYY, MM, DD, and dddd (weekday) are filled in." control={<TextSetting name="dailyPattern" label="Daily note file name" placeholder="YYYY-MM-DD" />} />
      </SettingsGroup>

      <SettingsGroup title="Capture">
        <SettingsRow
          label="Add captures to"
          description="Type daily for today’s daily note, or a file path such as inbox.md."
          control={<TextSetting name="captureTarget" label="Capture file" placeholder="daily" toValue={(text) => text || 'daily'} />}
        />
        <SettingsRow
          label="Under the heading"
          description="Captures go at the end of this heading’s section. Leave empty for the end of the file."
          control={<TextSetting name="captureHeading" label="Capture heading" placeholder="None" toValue={(text) => text || null} />}
        />
      </SettingsGroup>

      <SettingsGroup title="Editor">
        <SettingsRow
          label="Open notes as"
          control={
            <SegmentedControl
              aria-label="Open notes as"
              value={editorMode}
              onValueChange={(next) => void updateSettings({ editorMode: next })}
              options={[
                { value: 'rendered', label: 'Rendered' },
                { value: 'source', label: 'Markdown' },
              ]}
            />
          }
        />
        <SettingsRow label="Vim keys in Markdown source" control={(id) => <Switch id={id} checked={vimKeys} onCheckedChange={(next) => void updateSettings({ vimKeys: next })} />} />
      </SettingsGroup>

      <AppearanceSettings />
    </PageLayout>
  );
}
