import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Brain, LayoutTemplate, Maximize2, Plus, Trash2, PenSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatLocalDate, parseLocalDate } from '@shared/date';
import { ArtifactType, type ArtifactSummary } from '@shared/types';
import { paths, toPageUrl } from '../../app/navigation';
import { ensureStarterTemplates } from '../../data/pages';
import { startReviewing, stopReviewing } from '../../data/planning';
import { useTemplates } from '../../data/selectors';
import { useSettingsStore } from '../../store/settings';
import { Button, Icon, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Property, Switch, formatShortcut } from '../../ui';
import { SettingsGroup, SettingsRow } from '../settings/SettingsGroup';
import { attempt, deleteItem, toastWithUndo } from '../tasks/actions';
import { FOCUS_SHORTCUT, toggleFocusMode } from './KnowledgeLayer';
import { openSaveAsTemplate, openTemplatePicker } from './store';

/** Pages that are Notes: not tasks, projects, Inbox captures, journal days, or templates. */
const NOT_NOTES = new Set<string>([ArtifactType.TODO, ArtifactType.PROJECT, ArtifactType.INBOX, ArtifactType.JOURNAL, ArtifactType.TEMPLATE]);
const isNote = (item: ArtifactSummary) => !NOT_NOTES.has(item.type);

function reviewLabel(review: string): string {
  const day = review.slice(0, 10);
  if (day <= formatLocalDate()) return 'Review today';
  return `Next review ${format(parseLocalDate(day), 'MMM d')}`;
}

/** Review: off, "Review this note"; on, when it comes back, with a way to stop. */
function ReviewProperty({ note }: { note: ArtifactSummary }) {
  const navigate = useNavigate();
  if (!note.review) {
    return (
      <Property
        icon={Brain}
        label="Spaced review"
        placeholder="Review this note"
        onClick={() =>
          attempt(startReviewing(note).then(() => toastWithUndo('It will come back for review tomorrow')))
        }
      />
    );
  }
  const due = note.review.slice(0, 10) <= formatLocalDate();
  return (
    <Menu>
      <MenuTrigger asChild>
        <Property icon={Brain} label="Spaced review" tone={due ? 'accent' : 'default'}>
          {reviewLabel(note.review)}
        </Property>
      </MenuTrigger>
      <MenuContent align="start">
        {due ? (
          <MenuItem icon={Brain} onSelect={() => navigate(paths.review)}>
            Review now
          </MenuItem>
        ) : null}
        <MenuItem onSelect={() => attempt(stopReviewing(note).then(() => toastWithUndo('Stopped reviewing')))}>
          Stop reviewing
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

/** Knowledge properties on notes (review schedule). */
export function KnowledgeProperties({ item }: { item: ArtifactSummary }) {
  return isNote(item) ? <ReviewProperty note={item} /> : null;
}

/** Knowledge actions in a page's ⋯ menu (save as template, focus). */
export function KnowledgeMenuItems({ item, flush }: { item: ArtifactSummary; flush: () => Promise<void> }) {
  return (
    <>
      <MenuSeparator />
      <MenuItem icon={Maximize2} shortcut={FOCUS_SHORTCUT} onSelect={toggleFocusMode}>
        Focus
      </MenuItem>
      {item.type === ArtifactType.TEMPLATE ? null : (
        <MenuItem icon={LayoutTemplate} onSelect={() => attempt(flush().then(() => openSaveAsTemplate(item)))}>
          Save as template
        </MenuItem>
      )}
    </>
  );
}

/** "New from template…" for the New menus. */
export function NewFromTemplateMenuItem() {
  return (
    <MenuItem icon={LayoutTemplate} onSelect={() => openTemplatePicker()}>
      New from template…
    </MenuItem>
  );
}

function TemplateSettings() {
  const navigate = useNavigate();
  const templates = useTemplates();
  const addStarters = () =>
    ensureStarterTemplates()
      .then(() => toast.success('Added four starter templates'))
      .catch(() => toast.error('Could not add the templates'));
  return (
    <SettingsGroup
      title="Templates"
      description="Start a note from a template with New from template. {{date}}, {{time}}, and {{title}} fill in when you use one."
    >
      {templates.length === 0 ? (
        <SettingsRow
          label="No templates yet"
          description="Four simple starters with headings only: Meeting notes, Lecture notes, Weekly plan, and Project brief."
          control={
            <Button leadingIcon={Plus} onClick={() => void addStarters()}>
              Add starter templates
            </Button>
          }
        />
      ) : (
        templates.map((template) => (
          <SettingsRow
            key={template.filePath}
            className="py-2"
            label={
              <span className="flex items-center gap-2 font-normal">
                <Icon icon={LayoutTemplate} className="text-text-tertiary" />
                {template.title}
              </span>
            }
            control={
              <>
                <IconButton icon={PenSquare} label={`Edit ${template.title}`} size="sm" onClick={() => navigate(toPageUrl(template.filePath))} />
                <IconButton icon={Trash2} label={`Delete ${template.title}`} size="sm" onClick={() => void deleteItem(template)} />
              </>
            }
          />
        ))
      )}
    </SettingsGroup>
  );
}

function FocusSettings() {
  const dim = useSettingsStore((state) => state.focusDimParagraphs);
  const setSetting = useSettingsStore((state) => state.setSetting);
  return (
    <SettingsGroup title="Focus mode" description={`Focus hides everything but the page you are writing. Press ${formatShortcut(FOCUS_SHORTCUT)} to enter and Esc to leave.`}>
      <SettingsRow
        label="Dim other paragraphs"
        description="Keep the paragraph you are writing in at full strength and soften the rest."
        control={(id) => <Switch id={id} checked={dim} onCheckedChange={(on) => setSetting('focusDimParagraphs', on)} />}
      />
    </SettingsGroup>
  );
}

/** Knowledge settings (templates, focus). */
export function KnowledgeSettings() {
  return (
    <>
      <TemplateSettings />
      <FocusSettings />
    </>
  );
}
