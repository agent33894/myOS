# Building and updating myOS Next

Run commands from `dashboard/` with Node.js 22+. macOS builds need macOS; Linux builds need Linux x64. GitHub Actions checks macOS and Linux on pushes and pull requests and attaches installers to tagged releases.

myOS Next is its own app. It installs beside myOS 3.0 and shares nothing with it: a different name, app id, command, protocol, desktop entry, and app data folder.

## Development

```bash
npm ci
npm run dev
```

Some shells set `ELECTRON_RUN_AS_NODE=1`; if no window opens, run `env -u ELECTRON_RUN_AS_NODE npm run dev`. In development the app opens `../vault` unless a folder was chosen before.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npx knip --no-progress   # unused files, exports, and dependencies
npm run audit:ipc        # every channel has one handler; only src/data/ipc.ts uses the bridge
npm run audit:docs       # local links in the docs resolve
```

For changes to IPC, files on disk, packaging, onboarding, or visual design, also run the packaged smoke test on Linux:

```bash
npm run build:local
npm run smoke:linux
```

It starts the packaged app with a temporary home, creates the starter folder, and checks files, folders, tasks, daily notes, settings, Git status, the watcher, the app data folder, the terminal commands, and the desktop entry.

## Local install on Linux

```bash
npm run install:local
```

This builds the unpacked app, copies it to `~/Applications/myOS Next` (replacing an earlier local build only after the copy is verified), writes `~/.local/share/applications/myos-next.desktop` with a Capture action, registers `myos-next://` links, and links `~/.local/bin/myos-next`. No sudo, no FUSE. `npm run install:local:built` installs an existing `release/linux-unpacked` without rebuilding.

The window's Wayland `app_id` and X11 class are `myos-next`, so Hyprland rules match `class:^(myos-next)$`.

### Beside myOS 3.0

Both apps can be installed and running at once. Nothing is shared:

| | myOS 3.0 | myOS Next |
| --- | --- | --- |
| App folder | `~/Applications/myOS` | `~/Applications/myOS Next` |
| Executable | `myos` | `myos-next` (linked in `~/.local/bin`) |
| Desktop entry | `myos.desktop` | `myos-next.desktop` |
| Links | `myos://` | `myos-next://` |
| Settings, open folder, local copies | `~/.config/myOS` | `~/.config/myOS Next` |

Each app remembers its own open folder, so they can show the same folder or different ones. When both show the same folder, each notices the other's saves as changes on disk.

To update, pull the branch and run `npm run install:local` again; settings and the open folder stay. To remove myOS Next, delete `~/Applications/myOS Next`, `~/.local/bin/myos-next`, `~/.local/share/applications/myos-next.desktop`, and, if you want its settings and local copies gone too, `~/.config/myOS Next`. Your notes are never inside any of these.

### Terminal and keybindings

```bash
myos-next add "Ship the parser fix tomorrow #release"   # or: echo "…" | myos-next add
myos-next today
myos-next tasks "open #release"
myos-next tasks "kind:notes #meeting"                    # notes instead of tasks
myos-next find "rate limit"
myos-next open notes/api.md
myos-next --capture                                      # quick capture in the running app
```

Bind capture to a key in `~/.config/hypr/bindings.lua` on Omarchy:

```lua
o.bind("SUPER + ALT + N", "myOS Next capture", "myos-next --capture")
```

## Packaging

```bash
npm run build:installer   # Apple Silicon .dmg and .zip
npm run build:linux       # Linux x64 AppImage and tar.gz
```

Outputs go to `dashboard/release/`. An AppImage registers itself with `myOS-Next-*.AppImage --install-desktop-entry`. For another macOS architecture:

```bash
npm run clean
npx vite build
node scripts/package-macos.mjs --arch=x64 --installer
```

## Checking a macOS build

```bash
mkdir -p "$HOME/Applications"
ditto "release/mac-arm64/myOS Next.app" "$HOME/Applications/myOS Next.app"
codesign --verify --deep --strict "$HOME/Applications/myOS Next.app"
defaults read "$HOME/Applications/myOS Next.app/Contents/Info.plist" CFBundleIdentifier
```

The bundle identifier must be `com.myos.next` and the version must match `package.json`. Builds are signed ad hoc and not notarized; open a local build once with Control-click → Open. Notarization needs a Developer ID certificate in a private release environment; never commit certificates or credentials.
