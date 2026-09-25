---
no: 09
name: Source & Vim
headline: The file, as it is typed
dek: Any tab can show the Markdown source in monospace, with Vim keys if you want them.
how: ⌘E toggles source. For Vim, ⌘K → “Turn on Vim keys in source mode”.
caption: A reading list in source mode, dark theme, with three task lines selected in Vim’s visual mode and `:'<,'>sort` typed at the bottom.
---

⌘E switches the current tab between the rendered note and its Markdown source, and the new view opens on the line your caret was on. Source mode is a CodeMirror editor in Geist Mono with syntax highlighting. What you type is what is saved, and a file with Windows line endings keeps them.

Source mode keeps the conveniences that matter. `[[` suggests notes to link. Task checkboxes can be clicked, and checking one writes the same one-line edit as anywhere else. ⌘F finds in the note.

Vim keys are off by default. Turn them on in Settings, under Editor, or from the command bar with “Turn on Vim keys in source mode”. They apply in source mode only; the rendered view keeps ordinary editing. Inside the editor, Vim’s keys come first. ⌘E is caught before either editor sees it, so the mode switch works from any Vim state.
