# myOS contributor instructions

myOS is a macOS-only Electron application for managing local Markdown files. It has no hosted sync layer, account system, telemetry, or built-in model provider.

## Working rules

- Run application commands from `dashboard/`.
- Preserve existing user Markdown and custom frontmatter during round trips.
- Keep filesystem, shell, and Git operations in the Electron main process behind the typed IPC contract in `dashboard/shared/ipc/contracts.ts`.
- Validate paths against the selected workspace root before reading or writing.
- Use `dashboard/shared/spec/` as the source of truth for typed artifact defaults, validation, scaffolding, and canonical paths.
- Follow Chronicle Mac v3 in `docs/design/chronicle-design-system.md`; use semantic design tokens and keep light/dark behavior aligned.
- Do not introduce cloud synchronization, a required account, analytics, or a bundled AI provider.
- Do not commit personal workspace content. Git tracks only `.gitkeep` placeholders under `vault/`.

## Verification

For code changes, run:

```bash
cd dashboard
npm run typecheck
npm run lint
npm test
```

Run the relevant audit scripts and a packaged-app smoke test for changes to IPC, filesystem behavior, packaging, onboarding, or visual design.
