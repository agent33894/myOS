import { toast } from 'sonner';
import { ClipboardCopy, FileCode2, FileDown, FileText, History, Layers } from 'lucide-react';
import type { ArtifactSummary, Domain } from '@shared/types';
import { moveToArea } from '../../data/gateway';
import { useDataStore } from '../../data/store';
import { useSettingsStore } from '../../store/settings';
import {
  Button,
  Icon,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuSub,
  MenuTrigger,
  Property,
  Select,
  SelectItem,
  Switch,
  cn,
} from '../../ui';
import { SettingsGroup, SettingsRow } from '../settings/SettingsGroup';
import { AREA_LIST, areaInfo, hasArea } from './areas';
import { copyPageAsMarkdown, copyPageAsRichText, exportPage, type ExportFormat } from './export/exportPage';
import { openVersionHistory } from './history/openVersionHistory';
import { exported, failed, followUndo } from './toasts';

interface SlotProps {
  item: ArtifactSummary;
  /** Save pending edits first. */
  flush: () => Promise<void>;
  /** The file moved; the page follows it. */
  onMoved: (path: string) => void;
}

/** The Area property on every page that has one: choosing an area moves the file to that area's folder. */
export function AreaProperty({ item, flush, onMoved }: SlotProps) {
  const used = useSettingsStore((state) => state.usedAreas);
  if (!hasArea(item)) return null;
  const current = item.domain ?? null;
  const listed = AREA_LIST.filter((area) => used.includes(area.value) || area.value === current);
  const others = AREA_LIST.filter((area) => !listed.includes(area));

  const choose = (domain: Domain) => {
    if (domain === current) return;
    const from = item.filePath;
    void flush()
      .then(() => moveToArea(useDataStore.getState().byPath[from] ?? item, domain))
      .then((moved) => {
        if (moved.filePath !== from) onMoved(moved.filePath);
        followUndo(`Moved to ${areaInfo(domain).label}`, () => onMoved(from));
      })
      .catch((error: unknown) => failed(error, 'Could not move this page'));
  };

  const option = (area: (typeof AREA_LIST)[number]) => (
    <MenuCheckboxItem key={area.value} checked={area.value === current} onCheckedChange={() => choose(area.value)}>
      <span className="flex items-center gap-2">
        <Icon icon={area.icon} className="text-text-secondary" />
        {area.label}
      </span>
    </MenuCheckboxItem>
  );

  return (
    <Menu>
      <MenuTrigger asChild>
        <Property icon={current ? areaInfo(current).icon : Layers} label="Area" placeholder="Area" data-testid="area-property">
          {current ? areaInfo(current).label : null}
        </Property>
      </MenuTrigger>
      <MenuContent align="start">
        <MenuLabel>Move to area</MenuLabel>
        {listed.map(option)}
        {others.length ? (
          <>
            <MenuSeparator />
            <MenuSub label="Other areas">{others.map(option)}</MenuSub>
          </>
        ) : null}
      </MenuContent>
    </Menu>
  );
}

const FORMAT_NAMES: Record<ExportFormat, string> = { pdf: 'PDF', html: 'HTML' };

/** Export, copy, and version history in a page's ⋯ menu. */
export function FileMenuItems({ item, flush }: SlotProps) {
  const exportAs = (as: ExportFormat) =>
    void exportPage(item, as, flush)
      .then((saved) => saved && exported(saved))
      .catch((error: unknown) => failed(error, `Could not export as ${FORMAT_NAMES[as]}`));
  const copy = (write: Promise<void>, message: string) =>
    void write.then(() => toast.success(message)).catch((error: unknown) => failed(error, 'Could not copy to the clipboard'));

  return (
    <>
      <MenuSeparator />
      <MenuItem icon={FileDown} onSelect={() => exportAs('pdf')}>
        Export as PDF…
      </MenuItem>
      <MenuItem icon={FileCode2} onSelect={() => exportAs('html')}>
        Export as HTML…
      </MenuItem>
      <MenuItem icon={ClipboardCopy} onSelect={() => copy(copyPageAsRichText(item, flush), 'Copied as rich text')}>
        Copy as rich text
      </MenuItem>
      <MenuItem icon={FileText} onSelect={() => copy(copyPageAsMarkdown(item, flush), 'Copied as Markdown')}>
        Copy as Markdown
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={History} onSelect={() => openVersionHistory(item.filePath, flush)}>
        Version history…
      </MenuItem>
    </>
  );
}

/** Settings → General: areas and file names. */
export function FileSettings() {
  const used = useSettingsStore((state) => state.usedAreas);
  const defaultArea = useSettingsStore((state) => state.defaultArea);
  const renameFiles = useSettingsStore((state) => state.renameFilesWithTitles);
  const setSetting = useSettingsStore((state) => state.setSetting);

  const toggleArea = (area: Domain) => {
    const next = used.includes(area) ? used.filter((value) => value !== area) : [...used, area];
    if (!next.length) return;
    setSetting(
      'usedAreas',
      AREA_LIST.map((entry) => entry.value).filter((value) => next.includes(value)),
    );
    if (!next.includes(defaultArea)) setSetting('defaultArea', next[0]);
  };

  return (
    <SettingsGroup title="Areas and files" description="Areas keep your files in tidy folders: work/, personal/, and so on.">
      <SettingsRow label="Areas you use" description="The Area menu on each page lists these first.">
        <div role="group" aria-label="Areas you use" className="-mt-1 flex flex-wrap gap-2">
          {AREA_LIST.map((area) => {
            const on = used.includes(area.value);
            return (
              <Button
                key={area.value}
                size="sm"
                variant="secondary"
                aria-pressed={on}
                leadingIcon={area.icon}
                onClick={() => toggleArea(area.value)}
                className={cn('rounded-full px-3', on ? 'bg-accent-soft text-accent-text hover:bg-accent-soft' : 'text-text-secondary')}
              >
                {area.label}
              </Button>
            );
          })}
        </div>
      </SettingsRow>
      <SettingsRow
        label="Default area"
        description="New notes, tasks, and projects go here unless their project has an area."
        control={(id) => (
          <Select id={id} value={defaultArea} onValueChange={(value) => setSetting('defaultArea', value as Domain)} className="w-40">
            {AREA_LIST.filter((area) => used.includes(area.value) || area.value === defaultArea).map((area) => (
              <SelectItem key={area.value} value={area.value}>
                {area.label}
              </SelectItem>
            ))}
          </Select>
        )}
      />
      <SettingsRow
        label="Keep file names in sync with titles"
        description="After you edit a title, its file is renamed to match. Existing files keep their names until then."
        control={(id) => <Switch id={id} checked={renameFiles} onCheckedChange={(value) => setSetting('renameFilesWithTitles', value)} />}
      />
    </SettingsGroup>
  );
}
