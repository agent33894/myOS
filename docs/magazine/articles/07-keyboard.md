# Hands on the Keys

**A practical tour of myOS Next from the keyboard: opening files, running commands, switching to source with Vim keys, and working in tabs and splits.**

By the myOS Editors

The product documentation asks for two things at once: that myOS Next "feel soft and unhurried to look at, and fast and precise to use from the keyboard." This is a tour of the second half. Every key below was checked against the app's source.

On Linux the app shows Ctrl where macOS shows ⌘. This article uses ⌘.

## ⌘P: open a file

⌘P opens the file switcher. Type part of a path or a title; matching is fuzzy, and recent files come first. Enter opens the file. ⌘Enter opens it to the side, in a split. In a large folder, it is usually quicker than the file list.

## ⌘K: do anything

⌘K opens the command bar, which lists every command with its shortcut, in groups: Recent, Go to, Note, Tasks, Git, and App. Typing also searches the text of your notes. If you forget a key, this is where to find it. Commands that have no key are here too; while a note is open, that includes "Show outline," "Show backlinks," and "Turn on Vim keys in source mode." In the rendered editor with text selected, ⌘K makes a link instead.

Press `?` when you are not typing to see a sheet of every shortcut.

> If you forget a key, ⌘K lists every command with its shortcut.

## ⌘E: rendered or source

Each tab shows a note one of two ways. Rendered shows headings, lists, tables, code, and diagrams as formatted text, with `/` for blocks and `[[` for links. Markdown source shows the file as it is, in monospace, with syntax highlighting. ⌘E switches the current tab between them, and the new view starts on the line your caret was on.

Source mode is a full CodeMirror editor. `[[` suggests notes to link. Task checkboxes are clickable, and checking one writes the same one-line edit as anywhere else. ⌘F finds in the note in both modes.

## Vim keys

Vim keys are off by default. Turn them on from ⌘K ("Turn on Vim keys in source mode") or in Settings. They apply in source mode only; the rendered view keeps ordinary editing. Vim's bindings are loaded ahead of the default keymap, so its keys win inside the editor.

The one exception is ⌘E itself. The app catches it before either editor sees it, so the mode switch works from any Vim state.

## ⌘\\: tabs and splits

Notes open in tabs. A single click in the file list opens a note in a preview tab, which the next single click replaces. Double-clicking, or starting to type, keeps it. This keeps the tab bar from filling up as you browse.

⌘\ splits the window to the right, and pressing it again closes the split. Each side has its own tabs, and each can show a different screen: a note on the left and Today on the right, for example. ⌘1 through ⌘8 go to that tab in the focused side; ⌘9 goes to the last. Ctrl-Tab and Ctrl-Shift-Tab step through them. ⌘W closes the tab.

Tabs, the split, and which folders are expanded are remembered for each folder you open.

## ⌘B and ⌘.: making room

⌘B shows or hides the file column on the left. ⌥⌘B shows or hides the panel on the right, with Outline, Backlinks, Properties, Changes, and History. With both hidden, you see the note and the tabs.

One detail: in the rendered editor, the editor gets the first say, and ⌘B there makes the selected text bold. Press it with the focus outside the text, or use the command bar, to fold the files away.

⌘. goes further. Focus mode hides everything but the text. Escape leaves it, and so does a small "Exit focus" button, the one piece of the interface focus mode keeps.

> ⌘. hides everything but the text. Escape brings it back.

## ⌘⇧Enter: commit

In a Git repository, ⌘⇧Enter opens the Changes panel with the cursor in the Summary field. Type a message and press ⌘⇧Enter again to commit. Two presses and a sentence, without touching the mouse.

## ⌘N and the rest

⌘N opens capture, which adds a line to today's daily note. ⌥⌘N starts a new note in the folder selected in the file list. ⌘, opens Settings. Outside the text, ⌘Z undoes the last file change, whether it was a checked task, a capture, a move, or a delete; inside the text, it undoes typing as usual.

In the file list, the arrow keys move and open or close folders, Enter opens the file, F2 renames, and Delete deletes, with a local copy kept first.

In any task list, a focused row takes `x` to check it off, `d` and `s` to set the due or scheduled date, `t` to add a tag, and `j` and `k` to move.

:::sidebar
**Shortcuts**

| Keys | Does |
| --- | --- |
| ⌘P | Open a file (⌘Enter: to the side) |
| ⌘K | Commands |
| ⌘N | Capture |
| ⌥⌘N | New note in this folder |
| ⌘E | Rendered or Markdown source |
| ⌘F | Find in note |
| ⌘\ | Split to the right, or back |
| ⌘1–⌘9 | Go to tab (⌘9 is the last) |
| ⌘W | Close tab |
| ⌘B · ⌥⌘B | Show or hide the files · the panel |
| ⌘. · Esc | Focus mode · leave it |
| ⌘⇧Enter | Open Changes, then commit |
| ⌘Z · ⌘⇧Z | Undo · redo a file change |
| ⌘, | Settings |
| ? | Every shortcut |
| / · [[ | Insert a block · link to a note |
:::
