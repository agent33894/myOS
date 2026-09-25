import { useState } from 'react';
import { toast } from 'sonner';
import { ArtifactType, type ArtifactSummary } from '@shared/types';
import { create, read } from '../../data/gateway';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
} from '../../ui';
import { toastWithUndo } from '../tasks/actions';
import { closeKnowledgeDialogs, useKnowledgeDialogs } from './store';

function SaveForm({ item }: { item: ArtifactSummary }) {
  const [title, setTitle] = useState(item.title);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      // The page as it is on disk now; the page menu saved any pending edits first.
      const { content } = await read(item.filePath);
      await create({ type: ArtifactType.TEMPLATE, title: name, content }, `Save “${name}” as a template`);
      closeKnowledgeDialogs();
      toastWithUndo('Saved as a template');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the template');
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Field label="Template name" hint="New notes from this template start with this page’s text. Use {{date}} or {{title}} to fill those in.">
        <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onFocus={(event) => event.target.select()} />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={busy} disabled={!title.trim()}>
          Save template
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Save as template: the current page's body becomes a reusable template. */
export function SaveAsTemplate() {
  const item = useKnowledgeDialogs((state) => state.saveAs);
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && closeKnowledgeDialogs()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>It will appear under New from template, ready to reuse.</DialogDescription>
        </DialogHeader>
        {item ? <SaveForm key={item.filePath} item={item} /> : null}
      </DialogContent>
    </Dialog>
  );
}
