import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Image as ImageIcon } from 'lucide-react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import Modal from '../../ui/Modal';

interface ImageUploadButtonProps {
  editor: Editor;
}

export function ImageUploadButton({ editor }: ImageUploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    }
    setIsOpen(false);
    setUrl('');
    setTimeout(() => editor.commands.focus(), 100);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-8 w-8 p-0"
        title="Add Image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Image" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="chronicle-garnish mb-2 block" htmlFor="editor-image-url">
            Image URL
          </label>
          <Input
            id="editor-image-url"
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/image.jpg"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!url.trim()}>
            Insert
          </Button>
        </div>
      </form>
    </Modal>
  );
}
