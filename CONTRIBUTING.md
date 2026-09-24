# Contributing to myOS

Thanks for helping improve myOS. Keep changes local-first, readable, and compatible with ordinary Markdown folders.

## Development setup

```bash
cd dashboard
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test
npm run audit:ipc
npm run audit:dead-code
```

## Product boundaries

- Preserve direct ownership of Markdown files and local portability.
- Do not add a required account, hosted backend, analytics SDK, or model-provider dependency.
- Keep filesystem access in the Electron main process behind the typed preload contract.
- Treat arbitrary user-selected paths as untrusted and retain path-containment checks.
- Follow the design system in [`docs/design/design-system.md`](docs/design/design-system.md).
- Keep tests few and meaningful: add one when a change touches a critical invariant (file round-trips, conflict handling, path containment, Today and capture rules).

Use focused commits and explain user-visible changes in the pull request.
