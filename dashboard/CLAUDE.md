# myOS Next desktop development

Run all commands in this directory.

## Product contract

- macOS and Linux desktop app for any folder of Markdown files
- files stay plain Markdown; nothing is added that the user did not type, and untouched text is never reformatted
- no required account, sync service, telemetry, or bundled model provider; the network is used only for Git pull and push on request
- read [`../docs/product-model.md`](../docs/product-model.md) and [`../docs/file-format.md`](../docs/file-format.md)

## Architecture

Renderer code must not import Node APIs. The layers are described in `../docs/architecture-overview.md`, and the contracts between them in `../docs/plan.md` (Contracts).

- `shared/ipc/contracts.ts` is the single channel table. To add a channel, add a row to `IpcInvokeMap` and `IPC_INVOKE_CHANNELS`, then register it with `handle(channel, argKinds, impl)` in `electron/ipc/register.ts`. The compiler checks the implementation against the table, and `npm run audit:ipc` checks that every channel has one handler. Handlers throw `DomainError(code)`; the renderer receives `Result<T>`.
- `electron/workspace/paths.ts` `resolveInWorkspace` is the only path gate. Use it for every path from the renderer. Only the folder dialog and the starter folder set the open folder.
- Frontmatter is kept as written (`Note.properties`); a change rewrites only the changed keys' lines. Task edits go through `shared/tasks` and change one line, checked against its exact text.
- Git runs only through `electron/git/git.ts` (`execFile`, literal pathspecs after `--`, validated hashes).
- In the renderer, only `src/data/ipc.ts` touches `window.electronAPI`. Read through `src/data/selectors.ts` hooks. Write through `src/data/gateway.ts`, which records undo. Edit documents with `useDocument`, which saves against the loaded rev and raises `conflict` instead of overwriting.
- Each Wave B owner works in its own folders and plugs into `src/app/commands.ts`, `panels.ts`, and `statusbar.ts`.

## Design system

Follow `../docs/design/design-system.md`. Tokens live in `src/styles/tokens.css`; Tailwind maps onto them. Build UI from `src/ui` primitives and patterns: lint forbids raw `<button>`, `<input>`, `<textarea>`, and `<select>` elsewhere, hardcoded colors, and arbitrary values. Use short, plain sentences and the nouns file, folder, note, task, view, change, and history.

## Required checks

```bash
npm run typecheck
npm run lint
npm test
npx knip --no-progress
npm run audit:ipc
npm run audit:docs
```

For IPC, file-system, packaging, onboarding, or visual changes, also run `npm run build:local && npm run smoke:linux`. Keep tests to critical invariants: file safety, byte-exact task edits, view semantics, repeat dates, and Git argument safety.
