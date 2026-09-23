import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getDefaultStatusForType } from '@shared/spec';
import { CommandSurface } from '../ui/CommandSurface';
import { primaryModifier } from '../../utils/platform';
import { TypeFilingSelect, DomainFilingSelect, PriorityFilingSelect } from '../capture/FilingSelect';
import { useQuickCaptureActions, useCrudActions } from '../../store/selectors';
import { useUIStore, type QuickCaptureDraft } from '../../store/ui';
import { useUndoRedoStore } from '../../store/undoRedo';
import { createArtifact } from '../../gateways/artifactsGateway';
import {
  ArtifactType,
  type ArtifactStatus,
  type TodoStatus,
} from '../../types/artifacts';
import {
  buildStructuredCaptureContent,
  buildSuggestedTitleFromContent,
  detectQuickCaptureIntent,
  resolveCaptureFiling,
} from './quickCaptureUtils';

export default function QuickCapture() {
  const { closeQuickCapture } = useQuickCaptureActions();
  const { addArtifact } = useCrudActions();
  const setStoreDraft = useUIStore((state) => state.setQuickCaptureDraft);
  const [draft, setDraft] = useState<QuickCaptureDraft>(() => useUIStore.getState().quickCaptureDraft);

  const detected = useMemo(
    () => (draft.text.trim() ? detectQuickCaptureIntent(draft.text) : null),
    [draft.text]
  );
  const filing = useMemo(() => resolveCaptureFiling(detected, draft), [detected, draft]);

  // The component unmounts on close; mirror the draft (text and filing choices)
  // so Escape or a reflexive ⌘N never destroys an unsent capture.
  useEffect(() => {
    setStoreDraft(draft);
  }, [draft, setStoreDraft]);

  const patch = useCallback((partial: Partial<QuickCaptureDraft>) => {
    setDraft((current) => ({ ...current, ...partial }));
  }, []);

  const save = useCallback(() => {
    const text = draft.text;
    if (!text.trim()) return;
    // Close immediately — persistence continues in the background. The draft
    // clears now so an immediate re-open starts fresh, and is restored on failure.
    const unsent = draft;
    closeQuickCapture();
    useUIStore.getState().clearQuickCaptureDraft();

    const isUnfiled = filing.type === ArtifactType.INBOX;
    const title = detected?.suggestedTitle || buildSuggestedTitleFromContent(text);
    // Unfiled captures keep the raw text — structure is Refine's job.
    const content = isUnfiled ? text.trim() : buildStructuredCaptureContent(text, title, filing.type);

    createArtifact({
      title,
      type: filing.type,
      domain: filing.domain,
      tags: detected?.detectedTags || [],
      status: getDefaultStatusForType(filing.type) as ArtifactStatus | TodoStatus,
      priority: filing.priority,
      content,
    })
      .then((artifact) => {
        addArtifact(artifact);
        useUndoRedoStore.getState().pushUndo({
          type: 'create',
          description: `Capture: ${artifact.title}`,
          artifact,
        });
        toast.success(isUnfiled ? 'Captured to Unfiled' : `Filed to ${filing.domain} · ${filing.type}`);
      })
      .catch((error) => {
        useUIStore.getState().setQuickCaptureDraft(unsent);
        toast.error(error instanceof Error ? error.message : 'Capture failed — draft kept');
      });
  }, [addArtifact, closeQuickCapture, detected, draft, filing]);

  const destination =
    filing.type === ArtifactType.INBOX ? '→ Unfiled' : `→ ${filing.domain} · ${filing.type}`;

  return (
    <CommandSurface title="Quick capture" onClose={closeQuickCapture}>
      <textarea
        autoFocus
        value={draft.text}
        onChange={(event) => patch({ text: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeQuickCapture();
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            save();
          }
        }}
        className="chronicle-capture-input"
        placeholder="What do you need to remember?"
        aria-label="Capture text"
      />
      <div className="chronicle-capture-rail">
        <TypeFilingSelect
          allowUnfiled
          value={filing.type}
          onChange={(type) =>
            patch(type === filing.type ? { type } : { type, domain: null, priority: null })
          }
        />
        {filing.type !== ArtifactType.INBOX && filing.domain ? (
          <DomainFilingSelect
            type={filing.type}
            value={filing.domain}
            onChange={(domain) => patch({ domain })}
          />
        ) : null}
        {filing.type === ArtifactType.TODO && filing.priority ? (
          <PriorityFilingSelect value={filing.priority} onChange={(priority) => patch({ priority })} />
        ) : null}
        {filing.suggestedType ? (
          <button
            type="button"
            className="chronicle-filing-suggestion focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            onClick={() => patch({ type: filing.suggestedType })}
          >
            File as {filing.suggestedType}?
          </button>
        ) : null}
        {detected?.detectedTags.length ? (
          <div className="chronicle-filing-tags" aria-label="Detected tags">
            {detected.detectedTags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="chronicle-capture-footer">
        <span>{destination}</span>
        <button
          className="chronicle-capture-submit active:scale-[0.98]"
          onClick={save}
          disabled={!draft.text.trim()}
        >
          {primaryModifier}↵ Capture
        </button>
      </div>
    </CommandSurface>
  );
}
