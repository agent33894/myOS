# Architecture overview

myOS is a local-first Electron app with three layers and one domain object.

```text
selected Markdown folder
        ↕  fs + watcher (main process)
electron/  workspace · documents · history · export · watch · git · shell · ipc
        ↕  typed IPC: one channel table, runtime-checked args, Result<T> errors
shared/    domain (Artifact + field schema + spec), ipc contract, pure rules (today, tasks, capture,
           recurrence, checklist, recall, templates, journal, week)
        ↕
src/       data (one store, derived selectors, gateway)  →  features  →  ui (design system)
```

## Domain

An **artifact** is one Markdown file: YAML frontmatter plus a body. This is the only persisted concept. The word stays inside the code, and the interface calls these Notes, Tasks, Projects, and Inbox captures (see [`product-model.md`](product-model.md)).

- `shared/types/artifacts.ts` defines `Artifact`, including `rev`, the file revision (`mtimeMs:size`) that the main process stamps on every read and write.
- `shared/spec/` has one field table, `ARTIFACT_FIELDS`. That table drives parsing, serialization, the "known key" set, and undo snapshots. Unknown frontmatter keys go into `extra` and are written back unchanged. The per-type spec table (statuses, default status, storage directory) is data. Normalization and validation derive from it.
- Task, Project, and Inbox are **selectors** over `Artifact` (`shared/today.ts`, `shared/tasks.ts`, `src/data/selectors.ts`), not separate stored shapes. Checkbox lines in notes are read into `Artifact.checks` and become task-like `CheckEntry` rows (`shared/checklist.ts`).
- The rest of `shared/` is pure rules that the app and the `myos` CLI share: `recurrence.ts` (repeat rules, next dates, "done 9 of the last 10 times"), `inbox.ts` (capture parsing and `@`/`#` suggestions), `recall.ts` (spaced review), `templates.ts`, `journal.ts`, and `week.ts` (What moved).

## Main process (`dashboard/electron/`)

| Module | Responsibility |
| --- | --- |
| `workspace/` | The selected root, which can only be set through the native folder dialog or starter creation. It provides one `resolveInWorkspace()` (realpath and symlink aware) used by every handler and by the `myos://` asset protocol. Scans skip `.git`, `node_modules`, and dot-folders |
| `documents/` | Parse and serialize, list (metadata, rev, and checkbox lines, with a cache keyed by rev), read, create, save (`expectRev` → `CONFLICT`), frontmatter-only patch, retype (moves to the type's folder), checkbox toggle, rename, move, area move, delete, restore (exact undo), assets |
| `history/` | Version snapshots under `<userData>/history/<sha1 of workspace>/<path>/`, taken before saves (throttled) and before destructive changes, pruned to 50 per file and 60 days |
| `export/` | The native save dialog, and PDF printing of renderer-built HTML in a hidden window that runs no scripts |
| `watch/` | Debounced change events, `{ path, kind, rev }` |
| `git/` | Commit summary and diff, only for the workspace or a project's registered `localPath` |
| `shell/` | Reveal, open externally, notifications |
| `ipc/` | `handle(channel, impl)` is type-checked against `IpcInvokeMap` and wraps every result as `Result<T>` |

## IPC

`shared/ipc/contracts.ts` is the single table of channels, argument types, and result types. The preload exposes one generic `invoke(channel, ...args)`, restricted to the allow-listed channels, plus event subscriptions. `src/data/ipc.ts` unwraps `Result<T>` and throws `IpcError { code, message }`, with codes `NOT_FOUND`, `CONFLICT`, `INVALID`, `OUTSIDE_WORKSPACE`, and `INTERNAL`. Renderer code never touches `window.electronAPI` except through `src/data/`.

## Renderer (`dashboard/src/`)

- `data/`: the artifacts store (`byPath`, bodies keyed by path), updated only from gateway results and watcher events; memoized selectors (Inbox, Today, Tasks, Projects, Notes, templates, journal, review queue, week, counts); the gateway, which is the single write path and records undo, with `planning.ts` (complete, plan, re-plan, recall) and `pages.ts` (templates, journal) built on it; `exporter.ts` (PDF, HTML, clipboard); and undo/redo.
- `features/`: one folder per surface (shell, inbox, today, notes, projects, page, capture, palette, settings, onboarding). Each owns its components and hooks.
- `editor/`: TipTap composition (`index.tsx`, the `Editor` contract), `extensions.ts`, `useMarkdownSync.ts` (value in, edits out, never an echo), the `/` insert menu, the selection toolbar, find in page, link routing, commit diffs, and rich blocks: fenced `chart`, `callout`, `kpi`, `roadmap`, and `mermaid` code rendered as React node views through a shared `BlockFrame` and `useBlockDraft`. Shiki grammars, recharts, and mermaid load on first use.
- `ui/`: the design system (see [`design/design-system.md`](design/design-system.md)).

## Conflict handling

The editor keeps the `rev` it loaded. Autosave sends `expectRev`. When a watcher event brings a new `rev`, the editor behaves as follows:

- If there are no unsaved local edits, it reloads silently.
- If there are unsaved local edits, it shows the conflict banner.

A write that is rejected with `CONFLICT` shows the same banner. The app recognizes its own saves because the returned `rev` matches, not by timing.

## Network boundary

Core operation does not require network access. There is no hosted sync, authentication, telemetry, or model-provider integration.
