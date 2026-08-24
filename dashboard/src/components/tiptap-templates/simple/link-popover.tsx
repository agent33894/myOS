import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Link as LinkIcon } from 'lucide-react';
import { Input } from '../../ui/input';

import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import Modal from '../../ui/Modal';

interface LinkPopoverProps {
  editor: Editor;
}

export function LinkPopover({ editor }: LinkPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setIsOpen(false);
    setUrl('');
    setTimeout(() => editor.commands.focus(), 100);
  };

  const handleRemove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setIsOpen(false);
    setUrl('');
    setTimeout(() => editor.commands.focus(), 100);
  };

  const handleOpen = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setUrl(previousUrl);
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className={cn(
          'h-8 w-8 p-0',
          editor.isActive('link') && 'bg-secondary '
        )}
        title="Add Link"
        aria-label="Add link"
      >
        <LinkIcon className={cn('h-4 w-4', editor.isActive('link') && 'accent-text')} />
      </Button>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Link" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="chronicle-garnish mb-2 block" htmlFor="editor-link-url">
            URL
          </label>
          <Input
            id="editor-link-url"
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          {editor.isActive('link') && (
            <Button type="button" variant="outline" onClick={handleRemove}>
              Remove
            </Button>
          )}
          <Button type="submit">Apply</Button>
        </div>
      </form>
    </Modal>
  );
}
