import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FolderOpen } from 'lucide-react';
import type { Settings } from '@shared/settings';
import { invoke } from '../../data/ipc';
import { chooseWorkspace, useWorkspacePath } from '../../data/workspace';
import { updateSettings, useSettings } from '../../store/settings';
import { Button, Input, Kbd, PageHeader, PageLayout, SegmentedControl, Switch } from '../../ui';
import { reloadForFolder } from '../shell/layout';
import { ShortcutList } from '../shell/ShortcutList';
import { AppearanceSettings } from './AppearanceSettings';
import { SettingsGroup, SettingsRow } from './SettingsGroup';
import { ViewsSettings } from './ViewsSettings';

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

function FolderSettings() {
  const [folder] = useWorkspacePath();
  const change = () =>
    chooseWorkspace()
      .then((next) => next && reloadForFolder())
      .catch(failed('That folder could not be opened.'));
  return (
    <SettingsGroup title="Folder" description="myOS Next reads and writes the Markdown files in this folder. Settings are kept apart, in the app’s own data folder.">
      <SettingsRow
        label="Open folder"
        description={<span className="block truncate font-mono text-xs">{folder ?? 'No folder open'}</span>}
        control={
          <>
            <Button variant="ghost" leadingIcon={FolderOpen} disabled={!folder} onClick={() => void invoke('shell:reveal', '.').catch(failed('Could not open the file manager.'))}>
              Open in file manager
            </Button>
            <Button onClick={() => void change()}>Change…</Button>
          </>
        }
      />
    </SettingsGroup>
  );
}

function EditorSettings() {
  const editorMode = useSettings((state) => state.editorMode);
  const vimKeys = useSettings((state) => state.vimKeys);
  const readingFont = useSettings((state) => state.readingFont);
  const lineWidth = useSettings((state) => state.lineWidth);
  return (
    <SettingsGroup title="Editor">
      <SettingsRow
        label="Open notes as"
        description={
          <>
            Each tab can switch with <Kbd shortcut="mod+e" />.
          </>
        }
        control={
          <SegmentedControl
            aria-label="Open notes as"
            value={editorMode}
            onValueChange={(next) => void updateSettings({ editorMode: next })}
            options={[
              { value: 'rendered', label: 'Rendered' },
              { value: 'source', label: 'Source' },
            ]}
          />
        }
      />
      <SettingsRow label="Vim keys in Markdown source" control={(id) => <Switch id={id} checked={vimKeys} onCheckedChange={(next) => void updateSettings({ vimKeys: next })} />} />
      <SettingsRow
        label="Line width"
        description="How wide the page a note sits on is."
        control={
          <SegmentedControl
            aria-label="Line width"
            value={lineWidth}
            onValueChange={(next) => void updateSettings({ lineWidth: next })}
            options={[
              { value: 'narrow', label: 'Narrow' },
              { value: 'normal', label: 'Normal' },
              { value: 'wide', label: 'Wide' },
            ]}
          />
        }
      />
      <SettingsRow
        label="Reading font"
        description="The typeface for the body of your notes."
        control={
          <SegmentedControl
            aria-label="Reading font"
            value={readingFont}
            onValueChange={(next) => void updateSettings({ readingFont: next })}
            options={[
              { value: 'sans', label: 'Sans' },
              { value: 'serif', label: 'Serif' },
            ]}
          />
        }
      >
        <div aria-hidden="true" className="rounded-md bg-sunken px-5 py-4">
          <p className="text-lg font-semibold text-text">A quiet morning</p>
          <p className="mt-1 font-reading text-md text-text-secondary">
            Write the way you think. Notes stay plain text, so they read the same here, in any editor, and years from now.
          </p>
        </div>
      </SettingsRow>
    </SettingsGroup>
  );
}

function KeyboardSettings() {
  return (
    <SettingsGroup title="Keyboard" description={<>Press <Kbd shortcut="?" /> anywhere to see these.</>}>
      <ShortcutList className="px-4 py-4" />
    </SettingsGroup>
  );
}

/** `/settings`: the folder, daily notes and capture, the editor, appearance, views, and the keyboard. */
export default function SettingsScreen() {
  return (
    <PageLayout className="gap-10">
      <PageHeader className="px-2" title="Settings" />
      <FolderSettings />

      <SettingsGroup title="Daily notes" description="Taken from Obsidian’s daily-notes settings when the folder has them.">
        <SettingsRow label="Folder" description="Where daily notes live. Leave empty for the top of the folder." control={<TextSetting name="dailyFolder" label="Daily notes folder" placeholder="daily" />} />
        <SettingsRow label="File name" description="YYYY, MM, DD, and dddd (weekday) are filled in." control={<TextSetting name="dailyPattern" label="Daily note file name" placeholder="YYYY-MM-DD" />} />
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

      <EditorSettings />
      <AppearanceSettings />
      <ViewsSettings />
      <KeyboardSettings />
    </PageLayout>
  );
}
