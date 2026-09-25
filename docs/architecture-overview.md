# Architecture overview

myOS Next is an Electron app in three layers around one idea: the open folder is the data, and every Markdown file in it is a note.

```text
open folder (Markdown files, as they are)
        ↕  fs, watcher, git (main process)
electron/  workspace · documents · history · settings · git · export · watch · shell · ipc · cli
        ↕  typed IPC: one channel table, runtime-checked arguments, Result<T> errors
shared/    spec (notes) · tasks · query (views) · daily · capture · recurrence · settings · ipc contract
        ↕
src/       data (store, selectors, gateway)  →  app (routes, registries)  →  features  →  editor, ui
```

The contracts between these layers, and which Wave B owner builds on which, are listed in [`plan.md`](plan.md#contracts). The file syntax is in [`file-format.md`](file-format.md).

## Shared rules (`dashboard/shared/`)

Pure TypeScript used by both processes and the `myos-next` command.

- `spec/`: `Note` and `NoteSummary`. A note is a path, a revision (`mtimeMs:size`), a title, its frontmatter as written (`properties`), tags, task lines, and its body.
- `tasks/`: reading checkbox lines (Obsidian Tasks emoji, `due:`) and editing one line at a time: check, uncheck with the next occurrence of a repeating task, set a date, replace the text, and add a line under a heading. Each edit returns the whole file with only its line changed, or null when the line is no longer what the caller saw.
- `query.ts`: the view language, run over notes and their tasks.
- `daily.ts`, `capture.ts`, `recurrence.ts`: daily note paths, capture lines, and repeat rules.
- `settings.ts`: the settings shape, defaults, and validation.

## Main process (`dashboard/electron/`)

| Module | Responsibility |
| --- | --- |
| `workspace/` | The open folder. Only the folder dialog and the starter folder set it. `resolveInWorkspace()` (realpath and symlink aware) gates every path from the renderer; `scanTree()` lists folders and Markdown files, skipping dot folders and `node_modules`. |
| `documents/` | Parse and write notes (`markdown.ts`), files and folders (`files.ts`: list with a cache keyed by rev, read, create, save, move, delete, restore), task edits (`tasks.ts`), daily notes and capture (`daily.ts`), attachments. Saves take `expectRev` and fail with `CONFLICT`; property changes rewrite only the changed frontmatter lines. |
| `history/` | Local copies under `<app data>/history/<sha1 of folder>/<path>/`, kept before saves (at most every ten minutes) and before moves or deletes, pruned to 50 per file and 30 days. |
| `settings/` | `settings.json` in the app data folder, with daily-note defaults from `.obsidian/daily-notes.json`. |
| `git/` | `git` through `execFile` in the open folder: status, commit, log, show, diff, pull, and push. Literal pathspecs after `--`, validated hashes, timeouts, no prompts, and Git's own error messages. |
| `export/` | The save dialog and PDF printing in a hidden window that runs no scripts. |
| `watch/` | Debounced `files:changed` events for files (with their new rev) and folders. |
| `shell/` | Reveal in the file manager, open links, open in another editor. |
| `ipc/` | `handle(channel, argKinds, impl)`, checked against the channel table; every result is a `Result<T>`. |
| `cli.ts` | `myos-next add`, `today`, `tasks`, `find` run without a window; `open` and `--capture` go to the running one. |

## IPC

`shared/ipc/contracts.ts` is the one table of channels, arguments, and results. The preload exposes one `invoke(channel, ...args)`, limited to that table, and event subscriptions. `src/data/ipc.ts` turns failures into `IpcError { code }`. Renderer code reaches the main process only through `src/data/`.

## Renderer (`dashboard/src/`)

- `data/`: the store (notes by path, folders, open bodies, this session's moves), selectors (tree, tasks, today, views, recent files), the gateway (the single write path, which records undo), `useDocument` (autosave against the loaded rev; conflicts raise a banner), Git state, and export helpers.
- `store/`: settings (mirrored from the main process) and UI state (tabs, split, overlays, focus mode, right panel).
- `app/`: routes and URLs, and three registries that owners fill in: commands, right-panel sections, and status bar items.
- `features/`: one folder per owner and surface (shell, palette, switcher, onboarding, settings, note, today, tasks, views, capture, git, history, export).
- `editor/`: the TipTap editor with block-preserving Markdown, `/` blocks, links, find, and rich blocks.
- `ui/`: the design system (see [`design/design-system.md`](design/design-system.md)).

## Conflict handling

The editor keeps the rev it loaded and saves with `expectRev`. When a watcher event brings a new rev, the note reloads silently if there are no unsaved edits, and otherwise shows a banner to keep one version. A `CONFLICT` from a save does the same. The app knows its own saves by their rev, not by timing. Task edits from lists carry the exact line text too, so they never land on the wrong line.

## Identity

myOS Next installs beside myOS 3.0 without sharing anything: product name `myOS Next`, app id `com.myos.next`, executable and command `myos-next`, protocol `myos-next://`, desktop entry `myos-next.desktop`, and its own app data folder (`~/.config/myOS Next`, `~/Library/Application Support/myOS Next`).

## Network

The app uses the network only for Git pull and push, and only when asked. There is no account, sync service, telemetry, or model provider.
