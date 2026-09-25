# myOS Next contributor instructions

myOS Next is a macOS and Linux Electron app: a quiet editor for any folder of Markdown files. It has no hosted sync layer, account system, telemetry, or built-in model provider.

## Working rules

- Run application commands from `dashboard/`.
- Preserve user Markdown byte for byte outside the text being changed, including frontmatter keys, order, and comments. Nothing is written that the user did not ask for.
- Keep filesystem, shell, and Git operations in the Electron main process behind the typed IPC contract in `dashboard/shared/ipc/contracts.ts`. The renderer reaches it only through `dashboard/src/data`.
- Resolve every renderer-supplied path with `resolveInWorkspace` before reading or writing. Run Git only through `execFile` with arguments, never a shell.
- Follow `docs/product-model.md` (file, folder, note, task, view, change, history; plain sentences, no marketing words) and `docs/design/design-system.md`. Build UI from `dashboard/src/ui` primitives and token-bound Tailwind utilities; keep light and dark aligned.
- Do not introduce cloud synchronization, a required account, analytics, or a bundled AI provider. The network is used only for Git pull and push, on request.
- Do not commit personal folder content. Git tracks only `.gitkeep` placeholders under `vault/`.
- Install local builds into user-owned directories. On Linux, `npm run install:local` from `dashboard/` installs "myOS Next" to `~/Applications/myOS Next` and links `~/.local/bin/myos-next`, beside any myOS 3.0 install; do not require sudo.

## Verification

For code changes, run:

```bash
cd dashboard
npm run typecheck
npm run lint
npm test
npx knip --no-progress
npm run audit:ipc
npm run audit:docs
```

Keep tests to critical invariants only. Run `npm run build:local && npm run smoke:linux` for changes to IPC, filesystem behavior, packaging, onboarding, or visual design.
