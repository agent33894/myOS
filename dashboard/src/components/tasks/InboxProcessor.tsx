import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Folder, Inbox, Tag, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ArtifactType, TodoPriority, type ArtifactSummary } from '@shared/types';
import { read, remove, retype, save } from '../../data/gateway';
import { useArtifacts } from '../../data/selectors';
import { stripTitleEcho } from '../../features/shell/titleEcho';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { CommandSurface } from '../ui/CommandSurface';
import { Input } from '../ui/input';
import { PriorityFilingSelect, TypeFilingSelect } from '../capture/FilingSelect';
import { deriveArtifactFacets } from '../../utils/artifactFacets';

interface InboxProcessorProps {
  entries: ArtifactSummary[];
  onClose: () => void;
}

const FIELD_LABEL =
  'font-mono text-3xs uppercase tracking-wider text-muted-foreground';

export default function InboxProcessor({
  entries,
  onClose,
}: InboxProcessorProps) {
  const artifacts = useArtifacts();
  const facets = useMemo(() => deriveArtifactFacets(artifacts), [artifacts]);
  // Keep the review session stable even as filing removes items from the live store.
  const [queue, setQueue] = useState(() => [...entries]);
  const initialTotal = useRef(entries.length);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processing, setProcessing] = useState(false);

  const currentEntry = queue[currentIndex];
  const reviewedCount = initialTotal.current - queue.length;
  const progress = initialTotal.current > 0 ? (reviewedCount / initialTotal.current) * 100 : 0;
  const canNavigate = queue.length > 1;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<TodoPriority>(TodoPriority.MEDIUM);
  const [project, setProject] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<ArtifactType>(ArtifactType.MEMO);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!currentEntry) return;
    setTitle(currentEntry.title);
    setBody(stripTitleEcho(currentEntry.searchText ?? '', currentEntry.title).trim());
    setProject(currentEntry.project || '');
    setSelectedTags(currentEntry.tags);
    setTagInput('');
    setSelectedType(ArtifactType.MEMO);
    setPriority(currentEntry.priority ?? TodoPriority.MEDIUM);
  }, [currentEntry]);

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
    if (queue.length === 1) {
      onClose();
      return;
    }
    setQueue((items) => items.filter((item) => item.filePath !== currentEntry.filePath));
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
      const filed = await retype(
        currentEntry.filePath,
        {
          type: selectedType,
          title: title.trim(),
          tags: selectedTags,
          project: project.trim() || null,
          priority: selectedType === ArtifactType.TODO ? priority : null,
        },
        `File “${title.trim()}” as ${selectedType}`,
      );
      const original = stripTitleEcho(currentEntry.searchText ?? '', currentEntry.title).trim();
      if (body.trim() !== original) {
        const current = await read(filed.filePath);
        await save(filed.filePath, { fields: {}, content: body.trim() }, current.rev);
      }
      removeCurrentFromSession();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this item');
    } finally {
      setProcessing(false);
    }
  }, [body, currentEntry, priority, project, removeCurrentFromSession, selectedTags, selectedType, title]);

  const handleDelete = useCallback(async () => {
    if (!currentEntry || !confirm(`Delete “${currentEntry.title}”?`)) return;
    setProcessing(true);
    try {
      await remove(currentEntry.filePath);
      removeCurrentFromSession();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this item');
    } finally {
      setProcessing(false);
    }
  }, [currentEntry, removeCurrentFromSession]);

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
            <Inbox className="h-3 w-3" />
            Capture
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

        <div className="space-y-1.5">
          <span className={FIELD_LABEL}>File as</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeFilingSelect value={selectedType} onChange={setSelectedType} />
            {selectedType === ArtifactType.TODO ? (
              <PriorityFilingSelect value={priority} onChange={setPriority} />
            ) : null}
          </div>
        </div>

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
            {queue.length === 1 ? 'Save & Finish' : 'File & Continue'}
          </Button>
        </div>
      </div>
    </CommandSurface>
  );
}
