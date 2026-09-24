import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { ArtifactGitRule, ArtifactGitRulesConfig } from '@shared/ipc/contracts';
import { invoke } from '../../data/ipc';
import { Button, IconButton, Input, Switch } from '../../ui';
import { SettingsRow } from './SettingsGroup';

const FOLDERS = ['inbox', 'work', 'personal', 'research', 'creative'] as const;
const folderPattern = (prefix: string, folder: string) => `${prefix ? `${prefix}/` : ''}${folder}/**/*`;
const sameRule = (a: ArtifactGitRule, b: ArtifactGitRule) => a.mode === b.mode && a.pattern === b.pattern;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The folders Git ignores in this workspace, kept in a managed block of its .gitignore. */
export function GitRules() {
  const [config, setConfig] = useState<ArtifactGitRulesConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke('git:rules:get').then(setConfig, (cause: Error) => setError(cause.message));
  }, []);

  const save = async (rules: ArtifactGitRule[]) => {
    setSaving(true);
    setError(null);
    try {
      setConfig(await invoke('git:rules:set', rules));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the rules.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return error ? <p className="px-4 py-4 text-sm text-text-secondary">{error}</p> : null;
  }

  const prefix = config.artifactRootPrefix;
  const folderRules = new Set(FOLDERS.map((folder) => folderPattern(prefix, folder)));
  const custom = config.rules.filter((rule) => !folderRules.has(rule.pattern));

  const toggleFolder = (folder: string, ignore: boolean) => {
    const rule: ArtifactGitRule = { mode: 'exclude', pattern: folderPattern(prefix, folder) };
    const others = config.rules.filter((item) => item.pattern !== rule.pattern);
    void save(ignore ? [...others, rule] : others);
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const pattern = draft.trim();
    if (!pattern) return;
    const rule: ArtifactGitRule = { mode: 'exclude', pattern };
    if (config.rules.some((item) => sameRule(item, rule))) return setDraft('');
    if (await save([...config.rules, rule])) setDraft('');
  };

  return (
    <>
      <SettingsRow label="Folders" description="Ignored folders stay on your computer but are left out of commits.">
        <ul className="-my-1 flex flex-col">
          {FOLDERS.map((folder) => {
            const pattern = folderPattern(prefix, folder);
            const id = `git-folder-${folder}`;
            return (
              <li key={folder} className="flex h-10 items-center gap-3">
                <label htmlFor={id} className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="text-base text-text">{capitalize(folder)}</span>
                  <span className="truncate font-mono text-xs text-text-tertiary">{pattern.replace('/**/*', '/')}</span>
                </label>
                <Switch
                  id={id}
                  disabled={saving}
                  checked={config.rules.some((rule) => rule.mode === 'exclude' && rule.pattern === pattern)}
                  onCheckedChange={(ignore) => toggleFolder(folder, ignore)}
                />
              </li>
            );
          })}
        </ul>
      </SettingsRow>
      <SettingsRow
        label="Other rules"
        description="Ignore part of a folder, such as personal/journal/**. Rules must sit inside one of the folders above."
      >
        {custom.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {custom.map((rule) => (
              <li key={`${rule.mode}:${rule.pattern}`} className="flex h-8 items-center gap-3 rounded-md bg-sunken pl-3 pr-1">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-text">{rule.pattern}</span>
                <span className="text-sm text-text-tertiary">{rule.mode === 'exclude' ? 'Ignored' : 'Always kept'}</span>
                <IconButton
                  icon={X}
                  size="sm"
                  label={`Remove ${rule.pattern}`}
                  disabled={saving}
                  onClick={() => void save(config.rules.filter((item) => !sameRule(item, rule)))}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <form onSubmit={(event) => void add(event)} className="flex gap-2">
          <Input
            aria-label="Pattern to ignore"
            placeholder="personal/journal/**"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="font-mono"
          />
          <Button type="submit" disabled={saving || !draft.trim()}>
            Ignore
          </Button>
        </form>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </SettingsRow>
    </>
  );
}
