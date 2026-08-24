# Building and updating myOS

Run commands from `dashboard/` on macOS with Node.js 22+.

## Development

```bash
npm install
npm run electron:dev
```

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run audit:imports
npm run audit:ipc
npm run audit:dead-code
npm run design-system:check
npm run audit:design-tokens
```

## Packaging

Apple Silicon app, DMG, and ZIP:

```bash
npm run build:installer
```

Outputs are written to `dashboard/release/`.

To build another architecture without changing package scripts:

```bash
npm run clean
npx vite build
node scripts/package-macos.mjs --arch=x64 --installer
```

## Local installation verification

Copy the built app into a clean destination; do not merge app bundles.

```bash
ditto "release/mac-arm64/myOS.app" "/Applications/myOS.app"
codesign --verify --deep --strict "/Applications/myOS.app"
defaults read "/Applications/myOS.app/Contents/Info.plist" CFBundleIdentifier
defaults read "/Applications/myOS.app/Contents/Info.plist" CFBundleShortVersionString
shasum -a 256 \
  "release/mac-arm64/myOS.app/Contents/Resources/app.asar" \
  "/Applications/myOS.app/Contents/Resources/app.asar"
```

The bundle identifier must be `com.myos.markdown`, the version must match `package.json`, and the two `app.asar` hashes must match.

If a local unsigned build is blocked, open it once from Finder with Control-click → Open. Do not disable Gatekeeper globally.

## Signing and notarization

The repository build applies a consistent ad-hoc signature so local builds and community CI artifacts run correctly, but they are not Apple-notarized. Gatekeeper may require Control-click → Open on first launch.

Official notarization requires a Developer ID Application certificate and Apple notarization credentials. A release maintainer can replace the ad-hoc signing step in `scripts/package-macos.mjs` in a private release environment; never commit certificates or credentials.
