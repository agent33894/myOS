# Build plan: myOS Next

This branch (`next`) turns myOS into the product described in [`product-model.md`](product-model.md). It reuses what already holds up: the file engine (revision-checked saves, exact undo, block-preserving Markdown writes, version history, export), the design tokens and `src/ui` components, and the editor. It removes everything that assumes a fixed folder layout or typed files.

## Remove

- The typed-item product layer: Inbox, Projects, Areas, the Tasks page built on task files, Journal, rituals (Plan my day, Close the day, Weekly review, What moved), Recall, capacity and estimates, next steps, "when" cues, templates UI, and the onboarding areas step.
- Anything that writes to a derived "canonical path" (`{domain}/{type}/...`). New files go where the user creates them.
- Docs for the removed features (`roadmap-3.0.md`, `research/`, `magazine/` issue 03).

Frontmatter stays readable and editable as properties. Files with `type: todo` still count as tasks.

## Build

### Wave A: foundation
- **Folder model.** IPC to list the tree (folders and `.md` files, skipping dot folders and `node_modules`), create file or folder, rename, move, and delete (with a history copy first). The watcher reports folder changes too.
- **Task lines.** Parse checkbox lines with Obsidian Tasks emoji dates and plain `due:`, tags, and `🔁` repeat. Operations: toggle (adds or removes `✅ date`; on a repeating task, appends the next occurrence as a new line under it, like Obsidian Tasks), edit line, and add line to a file. Frontmatter `type: todo` files are tasks too.
- **Views.** A small query language in `shared/query.ts`, used by the app, by fenced ```` ```tasks ```` / ```` ```notes ```` blocks, and by the CLI:
  - `open`, `done`
  - `due<=today`, `due<2026-10-01`, `scheduled=today`
  - `#tag`, `path:notes/`, `file:api`
  - free words
  - `sort:due`, `group:file|folder|tag|date`
- **Daily notes.** Folder and name pattern come from settings (defaults: `daily/`, `YYYY-MM-DD`, and Obsidian's daily-notes settings if `.obsidian/daily-notes.json` exists). Operations: open today's note, and append a capture to it or to a chosen file.
- **Git.** Status per file, commit selected or all files with a message, log per file, diff for a commit or the working tree, and pull and push (only on request, with errors shown as they come from Git). All of it runs the `git` binary inside the workspace.
- **Settings** (in the app data folder): daily folder and pattern, capture target, editor mode default, Vim keys, theme, accent, reading font, and pinned views.
- **CLI** `myos-next`: `add`, `today`, `tasks [query]`, `find`, `open`.
- **Side-by-side identity.** Product name *myOS Next*, app id `com.myos.next`, executable `myos-next`, protocol `myos-next://`, its own app data folder, its own desktop entry and icon tint, and an install to `~/Applications/myOS Next` with a `~/.local/bin/myos-next` link. myOS 3.0 stays installed and untouched.

### Wave B: surfaces (in parallel)
1. **Shell.** File sidebar (tree, create, rename, drag to move, Git status dots, Today, Tasks, pinned Views), tabs and split view, file switcher (⌘P), command bar (⌘K), right panel (Outline, Backlinks, Properties), status bar, onboarding (open a folder, with Obsidian vaults detected; or start a small folder), and settings.
2. **Editor.** Rendered and Markdown source per tab (CodeMirror 6, optional Vim), frontmatter properties editing, live view blocks, task checkbox behavior (completion dates, repeat), date chips, and link and backlink behavior in both modes.
3. **Today, Tasks, Views, Capture.** Today screen, Tasks screen (query box and grouping), saved and pinned views, quick capture (to the daily note or a chosen file; `[ ]` makes a task), and task row interactions (check, open at line, reschedule, add tag).
4. **Git and safety.** Changes panel (list, diff, commit message, commit), per-note History (Git log and local copies, diff, restore), Pull and Push with clear status, and export (reused).

### Wave C: review, install, ship
Full walkthrough on a fresh folder, an Obsidian vault, and a code repository's `docs/` folder. Verify files on disk. Update docs. Package and install side by side. Commit and push.

### Wave D: the magazine
A new issue about myOS Next: the idea, the design, the way it treats your files, the workflows, and a page per major capability.

## Look and feel

Soft and quiet. The note sits on a slightly raised sheet in the middle of a tinted canvas, with wide margins. The side columns are thin, low-contrast, and fold away. Monospace is used for paths, the status bar, and source mode. Motion is short. Light and dark themes are both first-class. The existing tokens and `src/ui` components carry over; layout and density change.

## Contracts

Wave A is in place. This section is what Wave B builds on. Paths are relative to the open folder and use `/`. Change a contract here first, then in code.

### IPC (`dashboard/shared/ipc/contracts.ts`)

Every call returns `Result<T>`; `src/data/ipc.ts` turns failures into `IpcError { code }` with codes `NOT_FOUND`, `CONFLICT`, `INVALID`, `OUTSIDE_WORKSPACE`, `GIT` (Git's own message), and `INTERNAL`. Writes that take `expectRev` fail with `CONFLICT` when the file changed since that revision.

| Channel | Arguments → value |
| --- | --- |
| `files:list` | → `{ folders, notes: NoteSummary[] }` (dot folders and `node_modules` skipped; empty folders included) |
| `files:read` | `path` → `Note` |
| `files:create` | `path, content?` → `Note` (never replaces; makes missing folders) |
| `files:save` | `path, { content?, properties? }, expectRev` → `Note` (properties: `null` removes a key; only changed frontmatter lines are rewritten) |
| `files:move` | `path, to, expectRev?` → `Note` (rename or move; bytes and history follow) |
| `files:delete` / `files:restore` | `path, expectRev?` → `Note` snapshot / `snapshot` → `Note` (byte-exact undo) |
| `files:attach-asset` | `notePath` → `{ canceled } \| { asset: { relativePath, insertMarkdown } }` |
| `folders:create` / `folders:move` / `folders:delete` | `path` / `path, to` → new path / `path` → removed note paths (a local copy of each note first; system trash when there is one) |
| `tasks:toggle` | `TaskRef, expectRev?` → `Note` |
| `tasks:set-date` | `TaskRef, 'due' \| 'scheduled' \| 'start', date \| null, expectRev?` → `Note` |
| `tasks:edit` | `TaskRef, text, expectRev?` → `Note` |
| `tasks:append` | `path, line, heading?` → `Note` (file made when missing) |
| `daily:path` | `date?` (YYYY-MM-DD) → path (the file may not exist) |
| `daily:capture` | `text, target?` → `Note` (the file written) |
| `settings:get` / `settings:set` | → `Settings` / `Partial<Settings>` → `Settings` (an unknown key or bad value fails the whole change) |
| `git:status` | → `{ repo, branch, upstream, ahead, behind, files: { path, from?, change, staged }[] }` |
| `git:commit` | `message, paths?` → hash (all changes in the folder when `paths` is omitted) |
| `git:log` | `path?, limit?` → `{ hash, date, author, subject }[]` |
| `git:show` / `git:diff` | `path, hash` → text at that commit / `path?` → unified diff against HEAD (untracked files show as added) |
| `git:commit-diff` / `git:commit-summary` | `hash` → diff / `{ files, totals, message, … }` |
| `git:pull` / `git:push` | → Git's output (`pull --rebase --autostash`; only ever on request) |
| `history:list` / `history:read` / `history:restore` | local copies of a file (`path`, `id`) |
| `export:pdf` / `export:html` / `export:reveal` | `path, html` → saved path or null / `savedPath` |
| `workspace:current` / `workspace:choose` / `workspace:create-starter` | → folder path or null (the starter is `~/Documents/Notes`, or `Notes 2`, … when taken, with `README.md`, `daily/`, and `First steps.md`) |
| `workspace:obsidian` | → whether the open folder has a `.obsidian` folder |
| `shell:reveal` / `shell:open-external` / `shell:open-in-editor`, `system:accent`, `window:close` | as before |

A `TaskRef` is `{ path, line, raw }`: the 1-based line and its exact text as last read (`line: 0` is a `type: todo` file). An edit whose line no longer reads `raw` fails with `CONFLICT`.

Events: `files:changed { path, entry: 'file' | 'folder', kind, rev? }`, `app:capture` (from `myos-next --capture`), `app:open-file { path }` (from `myos-next open` and `myos-next://open?path=`), `system:accent-changed`.

### Shared rules (`dashboard/shared/`)

- `spec/`: `Note`, `NoteSummary` (`path`, `rev`, `title`, `properties`, `propertiesError?`, `tags`, `tasks`, `modified`, `searchText`), `noteTitle`, `noteTags`, `isTodoFile`.
- `tasks/`: `Task` (`path`, `line`, `raw`, `text`, `status`, `due`, `scheduled`, `start`, `done`, `recurrence`, `priority`, `tags`), `parseTaskLine`, `extractTasks`, `toggleTaskLine`, `setTaskDate`, `setTaskText`, `appendLine`, `todayBucket`.
- `query.ts`: `runView(kind, text, notes, today) → ViewResult`, `parseQuery`, `viewFromFence(info, body)`. Syntax in [`file-format.md`](file-format.md#views).
- `daily.ts`, `capture.ts`, `recurrence.ts`, `settings.ts` (`Settings`, `DEFAULT_SETTINGS`, `validSettings`).

### Renderer data (`dashboard/src/data`, `dashboard/src/store`)

- Store and sync: `useDataStore` (`notes`, `folders`, `bodies`, `moves`), `useFileSync()`.
- Selectors: `useNotes`, `useNote(path)`, `useTree()` (`TreeFolder { path, name, folders, files }`), `useTasks`, `useTodayTasks()` (`{ overdue, today }`), `useView(kind, query)`, `useRecentNotes`, `useDataStatus`.
- Gateway (every write; records undo): `read`, `save`, `createNote(path, content?)`, `freeName(folder)`, `remove`, `move(path, to)`, `rename(path, name)`, `createFolder`, `moveFolder`, `renameFolder`, `removeFolder`, `toggleTask`, `setTaskDate`, `editTask`, `appendLine`, `capture(text, target?)`, `dailyPath(date?)`, `listVersions`, `readVersion`, `restoreVersion`.
- Documents: `useDocument(path, { createOnWrite })` → `{ note, content, edit(content), saveNow, dirty, saving, conflict, keepMine, loadTheirs, missing }`.
- Git: `useGitStore` (`status`, `error`, `syncing`), `useGitSync`, `useGitStatus`, `useGitFile(path)`, `commit`, `pull`, `push`, `log`, `showAt`, `diff`, `commitDiff`, `commitSummary`.
- Settings: `useSettings` (all `Settings` keys plus `loaded`, `accentPreview`), `loadSettings`, `updateSettings(patch)`, `setAccentPreview`, `addRecentFile`.
- UI: `useUIStore` (`tabs: { id, url, path, mode, group, preview }[]`, `current` per group, `focusedGroup`, the derived `activeTab` and `split` indexes, `overlay`, `focusMode`, `rightPanel`), `openUrl(url, { group, pin })`, `showTab`, `activateTab`, `pinTab`, `closeTab`/`closeTabById`/`closeTabsUnder`, `moveTab`, `toggleSplit`, `setSplit`, `setActiveTab`, `setTabMode`, `followMove`, `openOverlay`/`closeOverlay`/`toggleOverlay`, `setFocusMode`, `setRightPanel`, `useActivePath`. Tabs, the split, and expanded folders are kept per folder in local storage (`store/uiSession.ts`). A screen inside a tab reads its tab with `useShownTab()` (`features/shell/shownTab.ts`).

### Settings keys

`dailyFolder`, `dailyPattern`, `captureTarget` (`'daily'` or a `.md` path), `captureHeading` (or null), `editorMode` (`'rendered' | 'source'`), `vimKeys`, `theme`, `accent`, `readingFont`, `lineWidth` (`'narrow' | 'normal' | 'wide'`), `pinnedViews` (`{ id, name, query, kind }[]`), `sidebar` (`{ left, right }: { width, collapsed }`), `recentFiles`. Stored in `settings.json` in the app data folder; the daily keys fall back to `.obsidian/daily-notes.json`.

### URLs (`src/app/navigation.ts`)

`/today`, `/tasks?q=`, `/view/:id`, `/note?path=` (`&create=1` makes a missing file on first edit), `/settings`. Build them with `toNoteUrl`, `toTasksUrl`, `toViewUrl`; move with `go(url, { group, pin })` or `openNote(path, { create, group, pin })` from anywhere. Each tab routes its own URL, so two groups can show two screens; the window's location is the focused tab's URL. A single click opens in the group's preview tab; `pin`, a double-click, or typing keeps it.

### Extension points and owners

| Owner | Folders | Exposes |
| --- | --- | --- |
| B1 Shell | `src/app/**`, `src/features/{shell,palette,switcher,onboarding,settings}/**` | `Shell`, `Sidebar`, `FileTree`, `RightPanel`, `StatusBar`, `CommandPalette`, `FileSwitcher`, `Welcome`, `SettingsScreen`, `shellCommands` |
| B2 Editor | `src/editor/**`, `src/features/note/**` | `NoteTab`, `noteCommands`, `OutlinePanel`, `BacklinksPanel`, `PropertiesPanel`, `NoteStatusItem`; renders ```` ```tasks ```` / ```` ```notes ```` fences with `ViewBlock` |
| B3 Tasks | `src/features/{today,tasks,views,capture}/**` | `TodayScreen`, `TasksScreen`, `ViewScreen`, `QuickCapture`, `taskCommands`, `ViewBlock({ kind, query, sourcePath })`, `TaskRow`, `ViewResults` |
| B4 Git and safety | `src/features/{git,history,export}/**` | `ChangesPanel`, `HistoryPanel`, `GitStatusBarItem`, `useFileGitStatus(path)`, `gitCommands`, `exportCommands` |

Registries, each a small table in `src/app/`:

- `commands.ts`: `Command { id, group, label, icon?, shortcut?, keywords?, run }` and `CommandSource = ({ activePath, inRepo }) => Command[]`. `useCommands()` joins `shellCommands`, `noteCommands`, `taskCommands`, `gitCommands`, and `exportCommands`. Each owner binds its own shortcuts.
- `panels.ts`: `PANELS: { id, label, icon, component: (props: { path }) }[]` for Outline, Backlinks, Properties (B2) and Changes, History (B4).
- `statusbar.ts`: `STATUS_ITEMS: { id, side, component }[]` for the Git item (B4) and the note's words and save state (B2).

### Terminal

`myos-next add <text>`, `today`, `tasks [query]`, `find <words>`, `open <path>`, `--capture`, `--install-desktop-entry`. The headless commands never take the single-instance lock; `open` and `--capture` go to the running window.
