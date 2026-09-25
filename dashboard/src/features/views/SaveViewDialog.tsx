import { useState, type FormEvent } from 'react';
import type { ViewKind } from '@shared/query';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input } from '../../ui';
import { saveView } from './pinned';

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ViewKind;
  query: string;
}

/** Name a view and pin it to the sidebar. */
export function SaveViewDialog({ open, onOpenChange, kind, query }: SaveViewDialogProps) {
  const [name, setName] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onOpenChange(false);
    setName('');
    void saveView(name, query, kind);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Save as view</DialogTitle>
            <DialogDescription>It is pinned to the sidebar. The view is kept in Settings, not in your folder.</DialogDescription>
          </DialogHeader>
          <Field label="Name">
            <Input autoFocus placeholder="Release week" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <p style={{ fontVariantLigatures: 'none' }} className="truncate rounded-md bg-sunken px-3 py-2 font-mono text-xs text-text-secondary">{query || (kind === 'tasks' ? 'all tasks' : 'all notes')}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!name.trim()}>
              Save view
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
