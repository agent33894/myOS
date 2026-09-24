# myOS desktop development

Run all commands in this directory.

## Product contract

- macOS and Linux desktop
- local Markdown files remain portable and user-owned
- no required account, remote sync, telemetry, or bundled model provider
- arbitrary Markdown works; typed frontmatter unlocks richer task/project views

## Architecture

Renderer code must not import Node APIs. The layers are described in `../docs/architecture-overview.md`:

- `shared/ipc/contracts.ts` is the single channel table. To add a channel, add a row to `IpcInvokeMap` and to `IPC_INVOKE_CHANNELS`, then register it with `handle(channel, argKinds, impl)` in `electron/ipc/register.ts`. The compiler checks the implementation against the table, and `npm run audit:ipc` checks that every channel has a handler. Handlers throw `DomainError(code)`, and the renderer receives `Result<T>`.
- `electron/workspace/paths.ts` `resolveInWorkspace` is the only path gate. Use it for every renderer-supplied path. Only the folder dialog and starter creation set the workspace.
- `shared/spec/` owns the frontmatter field table and per-type rules. Unknown keys round-trip through `Artifact.extra`.
- In the renderer, only `src/data/ipc.ts` touches `window.electronAPI`. Read through `src/data/selectors.ts` hooks. Write through `src/data/gateway.ts`, which records undo. Edit documents with `useDocument`, which saves against the loaded `rev` and raises `conflict` instead of overwriting.

## Design system

Follow `../docs/design/design-system.md` and `../docs/product-model.md`. Tokens live in `src/styles/tokens.css`; Tailwind maps onto them (`bg-raised text-text-secondary rounded-md shadow-overlay`). Build UI from `src/ui` primitives and patterns: lint forbids raw `<button>`, `<input>`, `<textarea>`, and `<select>` elsewhere, hardcoded colors, and arbitrary values. Use plain sentence-case copy with the nouns Note, Task, Project, and Inbox.

## Required checks

```bash
npm run typecheck
npm run lint
npm test
```

Run `npm run audit:ipc`, `npm run audit:dead-code`, `npm run audit:exports`, and `npm run audit:docs` for IPC, structural, and documentation changes. Keep tests to critical invariants.
