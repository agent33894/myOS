# Architecture overview

myOS is a local-first Electron app with three layers and one domain object.

```text
selected Markdown folder
        ↕  fs + watcher (main process)
electron/  workspace · documents · watch · git · shell · ipc
        ↕  typed IPC: one channel table, runtime-checked args, Result<T> errors
shared/    domain (Artifact + field schema + spec), ipc contract, today/capture rules
        ↕
src/       data (one store, derived selectors, gateway)  →  features  →  ui (design system)
```

## Domain

An **artifact** is one Markdown file: YAML frontmatter plus a body. This is the only persisted concept. The word stays inside the code, and the interface calls these Notes, Tasks, Projects, and Inbox captures (see [`product-model.md`](product-model.md)).

- `shared/types/artifacts.ts` defines `Artifact`, including `rev`, the file revision (`mtimeMs:size`) that the main process stamps on every read and write.
- `shared/spec/` has one field table, `ARTIFACT_FIELDS`. That table drives parsing, serialization, the "known key" set, and undo snapshots. Unknown frontmatter keys go into `extra` and are written back unchanged. The per-type spec table (statuses, default status, storage directory) is data. Normalization and validation derive from it.
- Task, Project, and Inbox are **selectors** over `Artifact` (`shared/today.ts`, `src/data/selectors.ts`), not separate stored shapes.

## Main process (`dashboard/electron/`)

| Module | Responsibility |
| --- | --- |
| `workspace/` | The selected root, which can only be set through the native folder dialog or starter creation. It provides one `resolveInWorkspace()` (realpath and symlink aware) used by every handler and by the `myos://` asset protocol. Scans skip `.git`, `node_modules`, and dot-folders |
| `documents/` | Parse and serialize, list (metadata and rev, with a cache keyed by rev), read, create, write (`expectRev` → `CONFLICT`), delete, restore (exact undo), assets |
| `watch/` | Debounced change events, `{ path, kind, rev }` |
| `git/` | Commit summary and diff, only for the workspace or a project's registered `localPath` |
| `shell/` | Reveal, open externally, notifications |
| `ipc/` | `handle(channel, impl)` is type-checked against `IpcInvokeMap` and wraps every result as `Result<T>` |

## IPC

`shared/ipc/contracts.ts` is the single table of channels, argument types, and result types. The preload exposes one generic `invoke(channel, ...args)`, restricted to the allow-listed channels, plus event subscriptions. `src/data/ipc.ts` unwraps `Result<T>` and throws `IpcError { code, message }`, with codes `NOT_FOUND`, `CONFLICT`, `INVALID`, `OUTSIDE_WORKSPACE`, and `INTERNAL`. Renderer code never touches `window.electronAPI` except through `src/data/`.

## Renderer (`dashboard/src/`)

- `data/`: the artifacts store (`byPath`, bodies keyed by path), updated only from gateway results and watcher events; memoized selectors (Inbox, Today, Projects, Notes, counts); the gateway, which is the single write path and records undo; and undo/redo.
- `features/`: one folder per surface (shell, inbox, today, notes, projects, page, capture, palette, settings, onboarding). Each owns its components and hooks.
- `editor/`: TipTap composition (`Editor.tsx`), extensions, slash menu, link routing, and rich blocks rendered as React node views through a shared `BlockFrame` and `useBlockDraft`.
- `ui/`: the design system (see [`design/design-system.md`](design/design-system.md)).

## Conflict handling

The editor keeps the `rev` it loaded. Autosave sends `expectRev`. When a watcher event brings a new `rev`, the editor behaves as follows:

- If there are no unsaved local edits, it reloads silently.
- If there are unsaved local edits, it shows the conflict banner.

A write that is rejected with `CONFLICT` shows the same banner. The app recognizes its own saves because the returned `rev` matches, not by timing.

## Network boundary

Core operation does not require network access. There is no hosted sync, authentication, telemetry, or model-provider integration.
