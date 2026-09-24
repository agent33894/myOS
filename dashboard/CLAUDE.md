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

## Chronicle Mac v3

Use semantic tokens from `shared/design-system/tokens.ts` and generated CSS. Serif speaks about user content, mono speaks about time/system metadata, and sans handles controls. Prefer paper, rules, and rhythm over decorative cards. Do not add gradients, glow, oversized titles, or unapproved hardcoded colors.

## Required checks

```bash
npm run typecheck
npm run lint
npm test
```

Use the audit scripts in `package.json` for IPC, imports, dead code, documentation, and design-token changes.
