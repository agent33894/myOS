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
