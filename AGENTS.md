# myOS contributor instructions

myOS is a macOS and Linux Electron application for managing local Markdown files. It has no hosted sync layer, account system, telemetry, or built-in model provider.

## Working rules

- Run application commands from `dashboard/`.
- Preserve existing user Markdown and custom frontmatter during round trips.
- Keep filesystem, shell, and Git operations in the Electron main process behind the typed IPC contract in `dashboard/shared/ipc/contracts.ts`. The renderer reaches it only through `dashboard/src/data`.
- Resolve every renderer-supplied path with `resolveInWorkspace` before reading or writing.
- Use `dashboard/shared/spec/` as the source of truth for known frontmatter fields, per-type defaults and statuses, and canonical paths. New files start with an empty body.
- Follow `docs/product-model.md` (Notes, Tasks, Projects, Inbox; never say artifact, vault, or domain in the UI) and `docs/design/design-system.md`. Build UI from `dashboard/src/ui` primitives and token-bound Tailwind utilities; keep light and dark aligned.
- Do not introduce cloud synchronization, a required account, analytics, or a bundled AI provider.
- Do not commit personal workspace content. Git tracks only `.gitkeep` placeholders under `vault/`.
- Install local builds into user-owned application directories. On Linux, use `npm run install:local` from `dashboard/`; do not require sudo or a system package for local development installs.

## Verification

For code changes, run:

```bash
cd dashboard
npm run typecheck
npm run lint
npm test
```

Keep tests to critical invariants only. Run `npm run audit:ipc`, `npm run audit:dead-code`, and a packaged-app smoke test for changes to IPC, filesystem behavior, packaging, onboarding, or visual design.
