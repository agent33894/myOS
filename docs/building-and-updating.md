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

Arch/Omarchy package (needs `makepkg`, which every Arch install has; no FUSE needed to run it):

```bash
npm run build:arch
sudo pacman -U release/arch/myos-bin-*.pkg.tar.zst
```

`packaging/arch/PKGBUILD` repackages the release tar.gz into `/opt/myOS` with `/usr/bin/myos`, the icon, and a `myos.desktop` entry. It is also the AUR `myos-bin` recipe: bump `pkgver` and run `updpkgsums` against the published release. Update by building the new version and running `pacman -U` again.

Packaged Linux smoke test (onboarding, watcher, IPC, terminal commands, desktop entry) against `release/linux-unpacked`:

```bash
npm run smoke:linux
```

### Installing on Omarchy

Prefer the Arch package above. To use the AppImage instead, install the [`fuse2` package](https://archlinux.org/packages/extra/x86_64/fuse2/) (stock Omarchy reports a missing `libfuse.so.2` without it), keep the AppImage at a stable path, and let it register itself:

```bash
sudo pacman -S fuse2
mkdir -p ~/Applications
cp release/myOS-*.AppImage ~/Applications/myOS.AppImage
chmod +x ~/Applications/myOS.AppImage
~/Applications/myOS.AppImage --install-desktop-entry
```

`--install-desktop-entry` writes `~/.local/share/applications/myos.desktop` (icon, `myos:` links, and a Quick Capture action), makes it the `myos:` handler, and links `~/.local/bin/myos` to the AppImage. It replaces the `com.myos.markdown.desktop` entry that earlier docs asked you to create. Use either the Arch package or the AppImage, not both. To update the AppImage, close myOS, replace the file at the same path, and reopen it. The selected workspace and preferences stay where they are.

The window's Wayland `app_id` and X11 class are both `myos`, so Hyprland rules match `class:^(myos)$`. The layout adapts to Omarchy tiling down to 360×360: below 900px the sidebar becomes an icon rail, list and detail stack below 700px, and project panels become drawers (toggle with `[` and `]`).

On Omarchy, **Settings → Appearance → Accent** offers an Omarchy theme swatch that follows the active theme's accent and updates when you switch themes. Like every accent, it is contrast-adjusted to stay legible on light and dark paper.

### Terminal and keybindings

The `myos` command works whether or not the window is open:

```bash
myos capture "Call the landlord #home"   # or: echo "…" | myos capture
myos today                               # In Play and Next, plain text
myos search omarchy tiling               # title, tag and text; tab-separated
myos --capture                           # open Quick Capture in the running app
```

Bind Quick Capture to a key in `~/.config/hypr/bindings.lua` (current Omarchy; `SUPER + ALT + N` is unused by the defaults):

```lua
o.bind("SUPER + ALT + N", "myOS capture", "myos --capture")
```

On older Omarchy releases with `bindings.conf`, use `bindd = SUPER ALT, N, myOS capture, exec, myos --capture`.

**Open in default editor** on a note uses `gio open`, which picks the handler for `text/markdown`. If a terminal editor opens instead of your Markdown app, run `xdg-mime default <app>.desktop text/markdown`.

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
