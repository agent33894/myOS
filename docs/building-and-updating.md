# Building and updating myOS

Run commands from `dashboard/` with Node.js 22+. macOS release builds require macOS; Linux release builds require Linux x64. GitHub Actions validates macOS and Linux on pushes and pull requests, builds Linux artifacts in CI, and attaches installers for both platforms to tagged releases.

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

Linux x64 AppImage and tar.gz (on Linux):

```bash
npm run build:linux
```

The AppImage is portable. On Omarchy, install the Arch [`fuse2` package](https://archlinux.org/packages/extra/x86_64/fuse2/) if it reports a missing `libfuse.so.2`:

```bash
sudo pacman -S fuse2
chmod +x release/myOS-*-x64.AppImage
./release/myOS-*-x64.AppImage
```

The tar.gz is a fallback when AppImage mounting is unavailable. Extract it into a private directory, then launch its `myos` executable. Do not extract it into an existing installation directory, since stale Electron files can prevent startup.

For an Omarchy application menu entry and `myos:` links, keep the AppImage at a stable path and create `~/.local/share/applications/com.myos.markdown.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=myOS
Comment=Local Markdown workspace
Exec=/home/YOUR_USER/Applications/myOS.AppImage %u
Icon=application-x-executable
Terminal=false
Categories=Office;Productivity;
MimeType=x-scheme-handler/myos;
```

Replace `YOUR_USER` with your Linux username and copy the downloaded AppImage to that path. Then register the URL handler:

```bash
xdg-mime default com.myos.markdown.desktop x-scheme-handler/myos
xdg-mime query default x-scheme-handler/myos
```

The generated AppImage contains the same desktop metadata. AppImages do not automatically install their desktop entries, so the local entry above is necessary unless an AppImage integration tool handles it. The app runs under Wayland through Electron; window behavior depends on the compositor and portal services installed on the desktop.

To update an AppImage installation, close myOS, replace the file at the stable `~/Applications/myOS.AppImage` path, make it executable, and reopen it. The selected workspace and preferences stay in their existing locations. Review release notes before opening a workspace with an older app version.

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
