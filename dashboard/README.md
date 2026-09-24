# myOS desktop app

The desktop app is Electron + React + TypeScript. Electron owns filesystem, Git, shell, watcher, notification, and folder-picker operations; the sandboxed renderer reaches them through a narrow typed preload bridge.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run build:installer
npm run build:linux
npm run build:arch
npm run smoke:linux
```

Some developer shells set `ELECTRON_RUN_AS_NODE=1`. If no app window opens, run commands as `env -u ELECTRON_RUN_AS_NODE npm run dev`.

## Key directories

- `electron/`: main process: `workspace/` (root and path containment), `documents/` (Markdown files), `watch/`, `git/`, `shell/`, `ipc/`
- `shared/ipc/`: the channel table shared by main and renderer
- `shared/spec/`: the frontmatter field table and per-type rules (statuses, storage folders)
- `shared/types/`: the `Artifact` model
- `shared/today.ts`, `shared/inbox.ts`: Today buckets, the Inbox, and capture parsing (also used by the `myos` CLI)
- `src/data/`: the renderer's store, selectors, write gateway, undo, and `useDocument`
- `src/app/`: routes, navigation URLs, and the app shell
- `src/features/`: one folder per surface: shell, palette, capture, inbox, today, notes, projects, page, tasks, settings, onboarding
- `src/editor/`: the TipTap editor, `/` menu, links, and rich blocks (each block is a pure model plus a view and an in-place editor)
- `src/ui/`: the design system's primitives and patterns
- `src/styles/`: tokens (`tokens.css`), base styles, editor prose, and motion

The active workspace is selected on first launch and stored in Electron's per-user application data directory (`~/Library/Application Support/myOS` on macOS, `~/.config/myOS` on Linux). No workspace content is copied there.
