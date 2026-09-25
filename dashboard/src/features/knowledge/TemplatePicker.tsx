import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { LayoutTemplate, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatLocalDate } from '@shared/date';
import { expandTemplate } from '@shared/templates';
import type { ArtifactSummary } from '@shared/types';
import { toNoteUrl } from '../../app/navigation';
import { read } from '../../data/gateway';
import { createFromTemplate, ensureStarterTemplates } from '../../data/pages';
import { useTemplates } from '../../data/selectors';
import { Editor } from '../../editor';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  Icon,
  Input,
  LoadingState,
  cn,
} from '../../ui';
import { closeKnowledgeDialogs, useKnowledgeDialogs } from './store';

function Preview({ template, title }: { template: ArtifactSummary; title: string }) {
  const [body, setBody] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setBody(null);
    read(template.filePath)
      .then((file) => live && setBody(file.content))
      .catch(() => live && setBody(''));
    return () => {
      live = false;
    };
  }, [template.filePath, template.rev]);

  const now = new Date();
  const value = body === null ? null : expandTemplate(body, { title: title || template.title, date: formatLocalDate(now), time: format(now, 'HH:mm') });
  if (value === null) return <LoadingState rows={4} />;
  if (!value.trim()) return <p className="text-sm text-text-tertiary">This template is empty.</p>;
  return (
    <Editor
      key={template.filePath}
      readOnly
      value={value}
      onChange={() => undefined}
      artifact={{ id: template.id, filePath: template.filePath, type: template.type }}
      findSlot={null}
    />
  );
}

function Picker({ project }: { project?: string }) {
  const navigate = useNavigate();
  const templates = useTemplates();
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const template = useMemo(() => templates.find((item) => item.filePath === selected) ?? templates[0], [templates, selected]);

  const createNote = async () => {
    if (!template || busy) return;
    setBusy(true);
    try {
      const note = await createFromTemplate(template, { title: title.trim() || template.title, project });
      closeKnowledgeDialogs();
      navigate(toNoteUrl(note.filePath, { isNew: true }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the note');
      setBusy(false);
    }
  };

  const step = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const at = templates.findIndex((item) => item === template);
    const next = templates[(at + (event.key === 'ArrowDown' ? 1 : -1) + templates.length) % templates.length];
    if (next) setSelected(next.filePath);
  };

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="No templates yet."
        description="Start with four simple ones: Meeting notes, Lecture notes, Weekly plan, and Project brief. They hold headings only."
        action={
          <Button
            variant="primary"
            leadingIcon={Plus}
            onClick={() => void ensureStarterTemplates().catch(() => toast.error('Could not add the templates'))}
          >
            Add starter templates
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="flex min-h-80 gap-4" onKeyDown={step}>
        <div role="listbox" aria-label="Templates" className="flex w-52 shrink-0 flex-col gap-0.5">
          {templates.map((item) => {
            const active = item === template;
            return (
              <div
                key={item.filePath}
                role="option"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setSelected(item.filePath)}
                onDoubleClick={() => void createNote()}
                className={cn(
                  'flex h-9 cursor-default items-center gap-2 rounded-md px-3 text-base outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-focus',
                  active ? 'bg-accent-soft text-text' : 'text-text-secondary hover:bg-text/5 hover:text-text',
                )}
              >
                <Icon icon={LayoutTemplate} className={active ? 'text-accent-text' : 'text-text-tertiary'} />
                <span className="truncate">{item.title}</span>
              </div>
            );
          })}
        </div>
        <div
          aria-label="Preview"
          className="max-h-96 min-w-0 flex-1 overflow-y-auto rounded-lg bg-canvas px-6 py-5 shadow-raised"
        >
          {template ? (
            <>
              <p className="mb-4 text-xl font-semibold text-text">{title.trim() || template.title}</p>
              <Preview template={template} title={title} />
            </>
          ) : null}
        </div>
      </div>
      <form
        className="flex items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void createNote();
        }}
      >
        <Field label="Title" className="flex-1">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={step}
            placeholder={template?.title ?? 'Untitled'}
          />
        </Field>
        <DialogFooter className="mt-0">
          <Button type="submit" variant="primary" loading={busy}>
            Create note
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

/** New from template…: pick a template, see it, name the note, and start writing. */
export function TemplatePicker() {
  const picker = useKnowledgeDialogs((state) => state.picker);
  return (
    <Dialog open={picker !== null} onOpenChange={(open) => !open && closeKnowledgeDialogs()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New from template</DialogTitle>
          <DialogDescription>Dates and the title fill in for you. Everything else is yours to write.</DialogDescription>
        </DialogHeader>
        {picker ? <Picker project={picker.project} /> : null}
      </DialogContent>
    </Dialog>
  );
}
