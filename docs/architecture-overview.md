# Architecture overview

myOS is a local-first Electron desktop application with three explicit layers.

## Main process

`dashboard/electron/main.ts` owns application lifecycle, the window, the `myos://` protocol, and native capabilities. Focused handlers provide:

- Markdown and asset reads/writes within the selected workspace
- Folder selection and starter-workspace creation
- Filesystem watcher events
- Local Git status, history, and diffs
- Explicit shell actions such as revealing a file
- Native notifications

Every user-derived path is resolved against the active workspace before use.

## Preload bridge

`dashboard/electron/preload.ts` exposes a narrow `window.electronAPI` surface through Electron context isolation. `dashboard/shared/ipc/contracts.ts` is the source of truth for invoke channels, event channels, arguments, and results.

## Renderer

The React renderer in `dashboard/src/` owns navigation and presentation. Zustand stores hold artifacts, tasks, settings, notifications, and transient UI state. Gateways and stores invoke the preload bridge; renderer modules do not use Node APIs directly.

## Local data flow

```text
selected Markdown folder
        ↕
Electron file handlers + watcher
        ↕ typed IPC
Zustand stores and React views
```

On first launch, the user selects any folder or creates `Documents/myOS`. The chosen absolute path is stored in Electron's per-user application data directory (macOS Application Support or Linux `~/.config/myOS`). Artifact content and attachments remain in the selected folder.

Plain Markdown is accepted. When YAML frontmatter matches the artifact spec, myOS also exposes task status, dates, projects, priorities, tags, and canonical create locations. Unknown frontmatter is preserved during edits.

## Network boundary

Core operation does not require network access. This repository contains no hosted synchronization client, authentication flow, telemetry SDK, or model-provider integration.
