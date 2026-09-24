import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { ArtifactType, TodoPriority } from '@shared/types';
import { retype } from '../../data/gateway';
import { useArtifact } from '../../data/selectors';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import Modal from '../ui/Modal';
import { TypeFilingSelect, PriorityFilingSelect } from '../capture/FilingSelect';
import { stripTitleEcho } from '../../features/shell/titleEcho';

interface RefineModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifactPath: string;
}

const FIELD_LABEL = 'font-mono text-3xs uppercase tracking-wider text-muted-foreground';

/** File one Inbox capture as a task, note, or project; the file moves to that type's folder. */
export default function RefineModal({ isOpen, onClose, artifactPath }: RefineModalProps) {
  const artifact = useArtifact(artifactPath);

  // Seeded once: the modal mounts per capture, and later store refreshes must not clobber the form.
  const [title, setTitle] = useState(artifact?.title ?? '');
  const [selectedType, setSelectedType] = useState<ArtifactType>(
    artifact && artifact.type !== ArtifactType.INBOX ? artifact.type : ArtifactType.MEMO,
  );
  const [selectedPriority, setSelectedPriority] = useState(artifact?.priority ?? TodoPriority.MEDIUM);
  const [tags, setTags] = useState(artifact?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [project, setProject] = useState(artifact?.project ?? '');
  const [isPromoting, setIsPromoting] = useState(false);

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
      await retype(
        artifact.filePath,
        {
          type: selectedType,
          title: title.trim(),
          tags,
          project: project.trim() || null,
          priority: selectedType === ArtifactType.TODO ? selectedPriority : null,
        },
        `File “${title.trim()}” as ${selectedType}`,
      );
      toast.success(`Filed as ${selectedType}`);
      onClose();
    } catch (err) {
      toast.error('Failed to file: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsPromoting(false);
    }
  };

  if (!isOpen || !artifact) return null;

  // Quote the capture's body beyond its title; most quick captures have none,
  // and an empty quote is noise — show nothing instead.
  const excerpt = stripTitleEcho(artifact.searchText ?? '', artifact.title).trim();

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
          <TypeFilingSelect value={selectedType} onChange={setSelectedType} />
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
