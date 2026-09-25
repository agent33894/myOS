# myOS Next desktop app

Electron, React, TypeScript, and Tailwind. The main process owns the file system, Git, the watcher, and dialogs; the sandboxed renderer reaches them through one typed preload bridge.

## Commands

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build:local && npm run smoke:linux
npm run install:local
```

## Layout

- `electron/`: main process: `workspace/` (the open folder and the path gate), `documents/` (notes, folders, tasks, daily notes), `history/`, `settings/`, `git/`, `export/`, `watch/`, `shell/`, `ipc/`, and `cli.ts`
- `shared/`: rules both processes use: `spec/` (notes), `tasks/`, `query.ts` (views), `daily.ts`, `capture.ts`, `recurrence.ts`, `settings.ts`, `ipc/contracts.ts`
- `src/data/`, `src/store/`: the renderer's store, selectors, write gateway, undo, documents, Git state, settings, and UI state
- `src/app/`: routes, URLs, and the command, panel, and status bar registries
- `src/features/`: one folder per surface
- `src/editor/`: the TipTap editor and rich blocks
- `src/ui/`: the design system

See [`../docs/architecture-overview.md`](../docs/architecture-overview.md) and the contracts in [`../docs/plan.md`](../docs/plan.md#contracts).
