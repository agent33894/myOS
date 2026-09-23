# myOS desktop development

Run all commands in this directory.

## Product contract

- macOS and Linux desktop
- local Markdown files remain portable and user-owned
- no required account, remote sync, telemetry, or bundled model provider
- arbitrary Markdown works; typed frontmatter unlocks richer task/project views

## Architecture

Renderer code must not import Node APIs. Add privileged behavior through `shared/ipc/contracts.ts`, `electron/preload.ts`, and a focused main-process handler. Keep all path operations contained within the selected workspace.

## Chronicle Mac v3

Use semantic tokens from `shared/design-system/tokens.ts` and generated CSS. Serif speaks about user content, mono speaks about time/system metadata, and sans handles controls. Prefer paper, rules, and rhythm over decorative cards. Do not add gradients, glow, oversized titles, or unapproved hardcoded colors.

## Required checks

```bash
npm run typecheck
npm run lint
npm test
```

Use the audit scripts in `package.json` for IPC, imports, dead code, documentation, and design-token changes.
