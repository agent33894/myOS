import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Folder,
  Inbox,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { toast } from 'sonner';
import { getDefaultStatusForType } from '@shared/spec';
import type { InboxQueueEntry } from '../../types/tasks';
import {
  ArtifactType,
  Domain,
  TodoPriority,
  type ArtifactStatus,
  type TodoStatus,
} from '../../types/artifacts';
import { promoteInboxItem } from '../../gateways/artifactsGateway';
import {
  useArtifacts,
  useCrudActions,
  useTaskCrudActions,
} from '../../store/selectors';
import {
  detectQuickCaptureIntent,
  resolveCaptureDomain,
} from '../layout/quickCaptureUtils';
import { stripTitleEcho } from '../../features/shell/titleEcho';
import { getCurrentDateString } from '../../utils/dateHelpers';
import { cn } from '../../lib/utils';
import { Calendar } from '../ui/calendar';
import { Button } from '../ui/button';
import { CommandSurface } from '../ui/CommandSurface';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DomainFilingSelect,
  PriorityFilingSelect,
  TypeFilingSelect,
} from '../capture/FilingSelect';
import { deriveArtifactFacets } from '../../utils/artifactFacets';

interface InboxProcessorProps {
  entries: InboxQueueEntry[];
  onClose: () => void;
}

const FIELD_LABEL =
  'font-mono text-3xs uppercase tracking-wider text-muted-foreground';

function entryId(entry: InboxQueueEntry): string {
  return entry.kind === 'task' ? entry.task.id : entry.artifact.id;
}

function entryTitle(entry: InboxQueueEntry): string {
  return entry.kind === 'task' ? entry.task.title : entry.artifact.title;
}

export default function InboxProcessor({
  entries,
  onClose,
}: InboxProcessorProps) {
  const { updateTask, deleteTask } = useTaskCrudActions();
  const { addArtifact, removeArtifact } = useCrudActions();
  const artifacts = useArtifacts();
  const facets = useMemo(() => deriveArtifactFacets(artifacts), [artifacts]);
  // Keep the review session stable even as filing removes items from the live store.
  const [queue, setQueue] = useState(() => [...entries]);
  const initialTotal = useRef(entries.length);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processing, setProcessing] = useState(false);

  const currentEntry = queue[currentIndex];
  const currentCapture =
    currentEntry?.kind === 'artifact' ? currentEntry.artifact : null;
  const reviewedCount = initialTotal.current - queue.length;
  const progress =
    initialTotal.current > 0 ? (reviewedCount / initialTotal.current) * 100 : 0;
  const canNavigate = queue.length > 1;

  const detected = useMemo(
    () =>
      currentCapture?.content?.trim()
        ? detectQuickCaptureIntent(currentCapture.content)
        : null,
    [currentCapture?.content],
  );

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [deferDate, setDeferDate] = useState('');
  const [priority, setPriority] = useState<TodoPriority | ''>('');
  const [project, setProject] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<ArtifactType>(
    ArtifactType.MEMO,
  );
  const [selectedDomain, setSelectedDomain] = useState<Domain>(Domain.WORK);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!currentEntry) return;
    setTitle(entryTitle(currentEntry));
    setBody(
      currentEntry.kind === 'task'
        ? currentEntry.task.content?.trim() || ''
        : stripTitleEcho(
            currentEntry.artifact.content ?? '',
            currentEntry.artifact.title ?? '',
          ).trim(),
    );
    setProject(
      currentEntry.kind === 'task'
        ? currentEntry.task.project || ''
        : currentEntry.artifact.project || '',
    );
    setSelectedTags(
      currentEntry.kind === 'task'
        ? currentEntry.task.tags
        : currentEntry.artifact.tags,
    );
    setTagInput('');

    if (currentEntry.kind === 'task') {
      setDueDate(currentEntry.task.due || '');
      setDeferDate(currentEntry.task.deferDate || '');
      setPriority(currentEntry.task.priority || '');
      setFlagged(Boolean(currentEntry.task.flagged));
      return;
    }

    const type = detected?.detectedType ?? ArtifactType.MEMO;
    setSelectedType(type);
    setSelectedDomain(
      resolveCaptureDomain(
        type,
        currentEntry.artifact.domain ?? null,
        detected?.detectedDomain ?? null,
      ),
    );
    setPriority(
      currentEntry.artifact.priority ??
        detected?.detectedPriority ??
        TodoPriority.MEDIUM,
    );
    setFlagged(false);
    setDueDate('');
    setDeferDate('');
  }, [currentEntry, detected]);

  const move = useCallback(
    (direction: -1 | 1) => {
      if (!canNavigate) return;
      setCurrentIndex(
        (index) => (index + direction + queue.length) % queue.length,
      );
    },
    [canNavigate, queue.length],
  );

  const removeCurrentFromSession = useCallback(() => {
    if (!currentEntry) return;
    const id = entryId(currentEntry);
    if (queue.length === 1) {
      onClose();
      return;
    }
    setQueue((items) => items.filter((item) => entryId(item) !== id));
    setCurrentIndex((index) => Math.min(index, queue.length - 2));
  }, [currentEntry, onClose, queue.length]);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !selectedTags.includes(tag))
      setSelectedTags((tags) => [...tags, tag]);
    setTagInput('');
  };

  const handleSave = useCallback(async () => {
    if (!currentEntry || !title.trim()) return;
    setProcessing(true);
    try {
      if (currentEntry.kind === 'task') {
        await updateTask(currentEntry.task.id, {
          title: title.trim(),
          content: body.trim(),
          due: dueDate || undefined,
          deferDate: deferDate || undefined,
          priority: priority || undefined,
          project: project.trim() || undefined,
          flagged,
          tags: selectedTags,
        });
      } else {
        const promotedArtifact = {
          ...currentEntry.artifact,
          title: title.trim(),
          content: body.trim(),
          domain: selectedDomain,
          type: selectedType,
          tags: selectedTags,
          project: project.trim() || undefined,
          priority:
            selectedType === ArtifactType.TODO
              ? priority || TodoPriority.MEDIUM
              : undefined,
          status: getDefaultStatusForType(selectedType) as
            ArtifactStatus | TodoStatus,
          updated: getCurrentDateString(),
        };
        const persisted = await promoteInboxItem(
          currentEntry.artifact.filePath,
          promotedArtifact,
        );
        removeArtifact(currentEntry.artifact.filePath);
        addArtifact(persisted);
      }
      removeCurrentFromSession();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save this item',
      );
    } finally {
      setProcessing(false);
    }
  }, [
    addArtifact,
    currentEntry,
    body,
    deferDate,
    dueDate,
    flagged,
    priority,
    project,
    removeArtifact,
    removeCurrentFromSession,
    selectedDomain,
    selectedTags,
    selectedType,
    title,
    updateTask,
  ]);

  const handleDelete = useCallback(async () => {
    if (!currentEntry || !confirm(`Delete “${entryTitle(currentEntry)}”?`))
      return;
    setProcessing(true);
    try {
      await deleteTask(entryId(currentEntry));
      removeCurrentFromSession();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not delete this item',
      );
    } finally {
      setProcessing(false);
    }
  }, [currentEntry, deleteTask, removeCurrentFromSession]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable;
      if (event.key === 'Escape') {
        if (target.closest('[data-radix-popper-content-wrapper]')) return;
        onClose();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void handleSave();
        return;
      }
      if (isInput) return;
      if (event.key === 'ArrowRight') move(1);
      if (event.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, move, onClose]);

  const availableProjects = Object.keys(facets.projectFrequency);
  const suggestedTags = Object.keys(facets.tagFrequency)
    .filter((tag) => !selectedTags.includes(tag))
    .slice(0, 8);
  if (!currentEntry) return null;

  return (
    <CommandSurface
      title="Process Unfiled"
      onClose={onClose}
      labelledBy="process-inbox-title"
      variant="dialog"
      className="flex max-h-[84vh] max-w-2xl flex-col"
    >
      <div className="chronicle-modal-header block">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="chronicle-garnish mb-1">Unfiled review</p>
            <h2 id="process-inbox-title">
              Process {initialTotal.current}{' '}
              {initialTotal.current === 1 ? 'item' : 'items'}
            </h2>
          </div>
          <Button
            variant="icon"
            size="sm"
            onClick={onClose}
            aria-label="Close process flow"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-6 text-xs text-muted-foreground">
            <span>
              {reviewedCount} of {initialTotal.current} reviewed
            </span>
            <span>{queue.length} remaining</span>
          </div>
          <div
            className="h-1.5 overflow-hidden bg-secondary"
            role="progressbar"
            aria-label="Unfiled items reviewed"
            aria-valuemin={0}
            aria-valuemax={initialTotal.current}
            aria-valuenow={reviewedCount}
          >
            <div
              className="h-full accent-bg transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 font-mono text-3xs uppercase tracking-wider text-muted-foreground">
            {currentEntry.kind === 'task' ? (
              <Check className="h-3 w-3" />
            ) : (
              <Inbox className="h-3 w-3" />
            )}
            {currentEntry.kind === 'task' ? 'Task' : 'Capture'}
          </span>
          <span className="text-xs text-muted-foreground">
            Item {currentIndex + 1} of {queue.length} remaining
          </span>
        </div>

        <div className="space-y-3">
          <label htmlFor="process-title" className={FIELD_LABEL}>
            Title &amp; body
          </label>
          <Input
            id="process-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            id="process-body"
            aria-label="Body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            placeholder="Add the context needed to act on this item"
            className="w-full resize-y rounded-md border border-border bg-card px-3 py-2 font-reading text-sm leading-relaxed text-foreground placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {currentEntry.kind === 'artifact' ? (
          <div className="space-y-1.5">
            <span className={FIELD_LABEL}>File as</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <TypeFilingSelect
                value={selectedType}
                onChange={(type) => {
                  setSelectedType(type);
                  setSelectedDomain(
                    resolveCaptureDomain(
                      type,
                      selectedDomain,
                      detected?.detectedDomain ?? null,
                    ),
                  );
                }}
              />
              <DomainFilingSelect
                type={selectedType}
                value={selectedDomain}
                onChange={setSelectedDomain}
              />
              {selectedType === ArtifactType.TODO ? (
                <PriorityFilingSelect
                  value={priority || TodoPriority.MEDIUM}
                  onChange={setPriority}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateField label="Due date" value={dueDate} onChange={setDueDate} />
            <DateField
              label="Defer until"
              value={deferDate}
              onChange={setDeferDate}
            />
            <div className="space-y-1.5">
              <label className={FIELD_LABEL}>Priority</label>
              <Select
                value={priority || '__none__'}
                onValueChange={(value) =>
                  setPriority(
                    value === '__none__' ? '' : (value as TodoPriority),
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {Object.values(TodoPriority).map((value) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className="capitalize"
                    >
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className={FIELD_LABEL}>Focus</span>
              <Button
                type="button"
                variant={flagged ? 'accent' : 'outline'}
                className="w-full justify-start"
                onClick={() => setFlagged((value) => !value)}
                aria-pressed={flagged}
              >
                <Flag className="mr-2 h-4 w-4" />
                {flagged ? 'Flagged' : 'Flag this task'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="process-project"
            className={cn(FIELD_LABEL, 'flex items-center gap-1.5')}
          >
            <Folder className="h-3 w-3" /> Project
          </label>
          <Input
            id="process-project"
            list="process-projects"
            value={project}
            onChange={(event) => setProject(event.target.value)}
            placeholder="Optional project"
          />
          <datalist id="process-projects">
            {availableProjects.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="process-tags"
            className={cn(FIELD_LABEL, 'flex items-center gap-1.5')}
          >
            <Tag className="h-3 w-3" /> Tags
          </label>
          <Input
            id="process-tags"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag and press Enter"
          />
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSelectedTags((tags) =>
                    tags.filter((value) => value !== tag),
                  )
                }
              >
                #{tag}
                <X className="ml-1 h-3 w-3" />
              </Button>
            ))}
            {suggestedTags.map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTags((tags) => [...tags, tag])}
              >
                + {tag}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border bg-secondary/30 px-6 py-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => move(-1)}
            disabled={!canNavigate}
            aria-label="Previous unfiled item"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-10 text-center font-mono text-3xs text-muted-foreground">
            {currentIndex + 1} / {queue.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => move(1)}
            disabled={!canNavigate}
            aria-label="Next unfiled item"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleDelete} disabled={processing}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button
            variant="outline"
            onClick={() => (canNavigate ? move(1) : onClose())}
            disabled={processing}
          >
            {canNavigate ? 'Skip for now' : 'Finish later'}
          </Button>
          <Button
            variant="accent"
            onClick={() => void handleSave()}
            disabled={processing || !title.trim()}
          >
            <Check className="mr-2 h-4 w-4" />
            {queue.length === 1
              ? 'Save & Finish'
              : currentEntry.kind === 'artifact'
                ? 'File & Continue'
                : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </CommandSurface>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className={cn(FIELD_LABEL, 'flex items-center gap-1.5')}>
        <CalendarIcon className="h-3 w-3" />
        {label}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {value
              ? format(parse(value, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')
              : 'Choose date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={
              value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
            }
            onSelect={(date) =>
              onChange(date ? format(date, 'yyyy-MM-dd') : '')
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
