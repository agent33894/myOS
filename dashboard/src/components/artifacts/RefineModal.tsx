import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { getDefaultStatusForType } from '@shared/spec';
import { useArtifacts, useCrudActions } from '../../store/selectors';
import {
  ArtifactType,
  Domain,
  TodoPriority,
  type ArtifactStatus,
  type TodoStatus,
} from '../../types/artifacts';
import { promoteInboxItem } from '../../gateways/artifactsGateway';
import { getCurrentDateString } from '../../utils/dateHelpers';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import Modal from '../ui/Modal';
import { TypeFilingSelect, DomainFilingSelect, PriorityFilingSelect } from '../capture/FilingSelect';
import {
  detectQuickCaptureIntent,
  resolveCaptureDomain,
} from '../layout/quickCaptureUtils';
import { stripTitleEcho } from '../../features/shell/titleEcho';

interface RefineModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifactId: string;
  onPromoted?: () => void;
}

const FIELD_LABEL = 'font-mono text-3xs uppercase tracking-wider text-muted-foreground';

export default function RefineModal({ isOpen, onClose, artifactId, onPromoted }: RefineModalProps) {
  const artifacts = useArtifacts();
  const { addArtifact, removeArtifact } = useCrudActions();

  const artifact = artifacts.find((a) => a.id === artifactId);
  const detected = useMemo(
    () => (artifact?.content?.trim() ? detectQuickCaptureIntent(artifact.content) : null),
    [artifact?.content]
  );

  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState<ArtifactType>(ArtifactType.MEMO);
  const [selectedDomain, setSelectedDomain] = useState<Domain>(Domain.WORK);
  const [selectedPriority, setSelectedPriority] = useState<TodoPriority>(TodoPriority.MEDIUM);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [project, setProject] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  // Seed the form from the capture: detection suggests, the user decides.
  useEffect(() => {
    if (!artifact) return;
    const type =
      artifact.type !== ArtifactType.INBOX
        ? artifact.type
        : detected?.detectedType ?? ArtifactType.MEMO;
    setTitle(artifact.title || detected?.suggestedTitle || 'Untitled');
    setSelectedType(type);
    setSelectedDomain(resolveCaptureDomain(type, artifact.domain ?? null, detected?.detectedDomain ?? null));
    setSelectedPriority(artifact.priority ?? detected?.detectedPriority ?? TodoPriority.MEDIUM);
    setTags(artifact.tags?.length ? artifact.tags : detected?.detectedTags ?? []);
    setProject(artifact.project || '');
  }, [artifact, detected]);

  const changeType = (type: ArtifactType) => {
    setSelectedType(type);
    setSelectedDomain(resolveCaptureDomain(type, selectedDomain, detected?.detectedDomain ?? null));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handlePromote = async () => {
    if (!artifact || !title.trim()) return;

    setIsPromoting(true);
    try {
      const promotedArtifact = {
        ...artifact,
        title: title.trim(),
        domain: selectedDomain,
        type: selectedType,
        tags,
        project: project.trim() || undefined,
        priority: selectedType === ArtifactType.TODO ? selectedPriority : undefined,
        status: getDefaultStatusForType(selectedType) as ArtifactStatus | TodoStatus,
        updated: getCurrentDateString(),
      };

      const persistedArtifact = await promoteInboxItem(artifact.filePath, promotedArtifact);
      removeArtifact(artifact.filePath);
      addArtifact(persistedArtifact);
      toast.success(`Filed to ${selectedDomain} · ${selectedType}`);
      onPromoted?.();
      onClose();
    } catch (err) {
      console.error('Failed to promote inbox item:', err);
      toast.error('Failed to file: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsPromoting(false);
    }
  };

  if (!isOpen || !artifact) return null;

  // Quote the capture's body beyond its title; most quick captures have none,
  // and an empty quote is noise — show nothing instead.
  const excerpt = stripTitleEcho(artifact.content ?? '', artifact.title ?? '').trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Refine"
      subtitle={
        artifact.type === ArtifactType.INBOX
          ? 'File this capture into the vault'
          : 'File this task into the vault'
      }
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handlePromote} disabled={!title.trim() || isPromoting}>
            {isPromoting ? 'Filing…' : 'File artifact'}
          </Button>
        </>
      }
    >
      {excerpt ? (
        <div className="max-h-36 overflow-y-auto border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {excerpt}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="refine-title" className={FIELD_LABEL}>
          Title
        </label>
        <Input
          id="refine-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title for this artifact"
        />
      </div>

      <div className="space-y-1.5">
        <span className={FIELD_LABEL}>Filing</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeFilingSelect value={selectedType} onChange={changeType} />
          <DomainFilingSelect type={selectedType} value={selectedDomain} onChange={setSelectedDomain} />
          {selectedType === ArtifactType.TODO ? (
            <PriorityFilingSelect value={selectedPriority} onChange={setSelectedPriority} />
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="refine-project" className={FIELD_LABEL}>
          Project
        </label>
        <Input
          id="refine-project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="Optional project name"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="refine-tags" className={FIELD_LABEL}>
          Tags
        </label>
        <Input
          id="refine-tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add a tag and press Enter"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 font-mono text-3xs text-muted-foreground"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  aria-label={`Remove tag ${tag}`}
                  className="text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
