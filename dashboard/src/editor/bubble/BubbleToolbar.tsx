import { useState, type KeyboardEvent } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { NodeSelection } from '@tiptap/pm/state';
import { Bold, Check, Code, Heading2, Italic, Link2, Strikethrough, Unlink } from 'lucide-react';
import { cn, IconButton, Input, Toolbar } from '../../ui';

const active = 'bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text';

function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [href, setHref] = useState<string>(editor.getAttributes('link').href ?? '');
  const apply = () => {
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (url) chain.setLink({ href: /^[a-z][a-z0-9+.-]*:|^[./#]/i.test(url) ? url : `https://${url}` }).run();
    else chain.unsetLink().run();
    onDone();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      apply();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      editor.commands.focus();
      onDone();
    }
  };
  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        size="sm"
        className="w-64"
        aria-label="Link address"
        placeholder="Paste or type a link"
        value={href}
        onChange={(event) => setHref(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <IconButton icon={Check} label="Apply link" size="sm" onClick={apply} />
      {editor.isActive('link') ? (
        <IconButton
          icon={Unlink}
          label="Remove link"
          size="sm"
          onClick={() => {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            onDone();
          }}
        />
      ) : null}
    </div>
  );
}

/** Formatting for a text selection: bold, italic, strikethrough, code, link, and heading. */
export function BubbleToolbar({ editor, linkRequest }: { editor: Editor; linkRequest: { open: boolean; setOpen: (open: boolean) => void } }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      strike: current.isActive('strike'),
      code: current.isActive('code'),
      link: current.isActive('link'),
      heading: current.isActive('heading'),
    }),
  });
  const { open: editingLink, setOpen: setEditingLink } = linkRequest;

  const buttons = [
    { icon: Bold, label: 'Bold', shortcut: 'mod+b', on: state.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: 'Italic', shortcut: 'mod+i', on: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: Strikethrough, label: 'Strikethrough', shortcut: 'mod+shift+s', on: state.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { icon: Code, label: 'Inline code', on: state.code, run: () => editor.chain().focus().toggleCode().run() },
    { icon: Link2, label: 'Link', shortcut: 'mod+k', on: state.link, run: () => setEditingLink(true) },
    { icon: Heading2, label: 'Heading', shortcut: 'mod+alt+2', on: state.heading, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  ];

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8, flip: true, shift: { padding: 8 } }}
      shouldShow={({ view, state: editorState, element }) => {
        const { selection } = editorState;
        const focused = view.hasFocus() || element.contains(document.activeElement);
        if (!focused || selection.empty || selection instanceof NodeSelection || !editor.isEditable) return false;
        if (selection.$from.parent.type.spec.code) return false;
        return editorState.doc.textBetween(selection.from, selection.to).trim().length > 0;
      }}
      className="z-popover"
    >
      <div className="rounded-lg bg-overlay p-1 shadow-overlay animate-scale-in">
        {editingLink ? (
          <LinkForm editor={editor} onDone={() => setEditingLink(false)} />
        ) : (
          <Toolbar aria-label="Text formatting" className="gap-0.5">
            {buttons.map((button) => (
              <IconButton
                key={button.label}
                icon={button.icon}
                label={button.label}
                shortcut={button.shortcut}
                size="sm"
                aria-pressed={button.on}
                className={cn(button.on && active)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={button.run}
              />
            ))}
          </Toolbar>
        )}
      </div>
    </BubbleMenu>
  );
}
