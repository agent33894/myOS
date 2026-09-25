# Contributing to myOS Next

Thanks for helping improve myOS Next. Keep changes local-first, readable, and compatible with ordinary Markdown folders.

## Development setup

```bash
cd dashboard
npm ci
npm run dev
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test
npx knip --no-progress
npm run audit:ipc
npm run audit:docs
```

## Product boundaries

- Preserve direct ownership of Markdown files and local portability.
- Do not add a required account, hosted backend, analytics SDK, or model-provider dependency.
- Keep filesystem access in the Electron main process behind the typed preload contract.
- Treat arbitrary user-selected paths as untrusted and retain path-containment checks.
- Follow the design system in [`docs/design/design-system.md`](docs/design/design-system.md).
- Keep tests few and meaningful: add one when a change touches a critical invariant (file round-trips, conflict handling, path containment, task line edits, view semantics, repeat dates, Git arguments).

Use focused commits and explain user-visible changes in the pull request.
