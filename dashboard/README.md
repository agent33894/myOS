# myOS desktop app

The desktop app is Electron + React + TypeScript. Electron owns filesystem, Git, shell, watcher, notification, and folder-picker operations; the sandboxed renderer reaches them through a narrow typed preload bridge.

## Commands

```bash
npm install
npm run electron:dev
npm run typecheck
npm run lint
npm test
npm run build
npm run build:installer
npm run build:linux
npm run build:arch
npm run smoke:linux
```

Some developer shells set `ELECTRON_RUN_AS_NODE=1`. If no app window opens, run commands as `env -u ELECTRON_RUN_AS_NODE npm run electron:dev`.

## Key directories

- `electron/`: main process, IPC handlers, path security, watcher, and workspace selection
- `shared/ipc/`: invoke and event contracts shared by main and renderer
- `shared/spec/`: typed artifact rules, normalization, validation, paths, and scaffolding
- `shared/types/`: canonical artifact model
- `src/app/`: routes and shell
- `src/features/`: Today, Library, Projects, Settings, and artifact detail behavior
- `src/styles/`: Chronicle Mac v3 tokens and component treatment

The active workspace is selected on first launch and stored in Electron's per-user application data directory (`~/Library/Application Support/myOS` on macOS, `~/.config/myOS` on Linux). No workspace content is copied there.
