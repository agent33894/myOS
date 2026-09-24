import { app, BrowserWindow, nativeTheme, shell, protocol } from 'electron';
import { join, dirname, resolve, relative, isAbsolute } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { initializePaths, getVaultPath } from './utils/paths.js';
import { getStableAppDataPath } from './utils/stable-app-data.js';

import { registerIpcHandlers } from './ipc/register-handlers.js';
import { cliArgs, parseCliCommand, runCliCommand } from './cli.js';
import { watchOmarchyAccent } from './utils/omarchy-theme.js';

// Get the directory containing the main process script
// In production (packaged): app.getAppPath() returns the asar root
// In development: __dirname from the compiled output
const getElectronDir = (): string => {
  if (app.isPackaged) {
    // In production, app.getAppPath() returns the root of the asar
    return join(app.getAppPath(), 'dist-electron');
  }
  // In development, use the compiled output directory
  return dirname(__filename);
};

const electronDir = getElectronDir();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'myos',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const APP_PROTOCOL = 'myos';

// Keep Chromium preferences, cache, and config together in the platform's
// application data directory rather than npm's package-name default.
app.setPath('userData', getStableAppDataPath());

// `myos capture|today|search` run headless and exit; they never take the
// single-instance lock, so they work alongside a running window.
const cliCommand = parseCliCommand(cliArgs());

// Prevent multiple instances of the app
const gotTheLock = cliCommand ? false : app.requestSingleInstanceLock();
let appLoadUrl: string | null = null;
let pendingArtifactDeepLink: string | null = null;

if (cliCommand) {
  void runCliCommand(cliCommand).then((code) => app.exit(code));
} else if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (commandLine.includes('--capture')) {
      openQuickCapture();
      return;
    }

    const deepLinkHash = extractArtifactDeepLinkFromArgs(commandLine);
    if (deepLinkHash) {
      if (mainWindow === null) {
        createWindow();
      }
      openArtifactDeepLink(deepLinkHash);
      return;
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (process.platform === 'win32') {
  app.setAppUserModelId('com.myos.markdown');
}

let mainWindow: BrowserWindow | null = null;

const getDashboardUrl = (): string => {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  const indexPath = app.isPackaged
    ? join(app.getAppPath(), 'dist', 'index.html')
    : join(dirname(electronDir), 'dist', 'index.html');
  return pathToFileURL(indexPath).toString();
};

const parseArtifactHashFromProtocolUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${APP_PROTOCOL}:`) {
      return null;
    }

    const params = new URLSearchParams(parsed.search);
    const artifactPath = params.get('artifact');
    if (!artifactPath) {
      return null;
    }

    return `#/library?${params.toString()}`;
  } catch {
    return null;
  }
};

const extractArtifactDeepLinkFromArgs = (args: string[]): string | null => {
  for (const arg of args) {
    const hash = parseArtifactHashFromProtocolUrl(arg);
    if (hash) {
      return hash;
    }
  }
  return null;
};

const openArtifactDeepLink = (deepLinkHash: string): void => {
  if (!appLoadUrl) {
    pendingArtifactDeepLink = deepLinkHash;
    return;
  }
  if (mainWindow === null) {
    pendingArtifactDeepLink = deepLinkHash;
    return;
  }
  pendingArtifactDeepLink = null;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
  void mainWindow.loadURL(`${appLoadUrl}${deepLinkHash}`);
};

// `myos --capture`: bring the window forward with Quick Capture open. The
// preload buffers the request until the renderer subscribes.
const openQuickCapture = (): void => {
  if (mainWindow === null) {
    createWindow();
  }
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  const { webContents } = mainWindow;
  const send = () => webContents.send('quick-capture:open');
  if (webContents.isLoading()) webContents.once('did-finish-load', send);
  else send();
};

function isPathWithinDirectory(parentDir: string, targetPath: string): boolean {
  const normalizedParent = resolve(parentDir);
  const normalizedTarget = resolve(targetPath);
  if (normalizedParent === normalizedTarget) {
    return true;
  }

  const rel = relative(normalizedParent, normalizedTarget);
  return rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel);
}

const createWindow = () => {
  // Determine preload path based on environment
  const preloadPath = app.isPackaged
    ? join(app.getAppPath(), 'dist-electron', 'preload.js')
    : join(electronDir, 'preload.js');

  const windowBackgroundColor = () => (nativeTheme.shouldUseDarkColors ? '#1B1A16' : '#F7F4EE');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    // Small enough for Omarchy's quarter-width and half-height tiles; the
    // layout collapses to an icon rail and stacked panes below 900/700px.
    minWidth: 360,
    minHeight: 360,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform !== 'darwin'
      ? { titleBarOverlay: { color: windowBackgroundColor(), height: 52 } }
      : {}),
    backgroundColor: windowBackgroundColor(),
  });

  // The app toolbar is the title bar. Keep native controls, but remove
  // Electron's default File/Edit/View menu strip on Windows and Linux.
  if (process.platform !== 'darwin') mainWindow.setMenu(null);

  const syncWindowBackground = () => {
    mainWindow?.setBackgroundColor(windowBackgroundColor());
    if (process.platform !== 'darwin') {
      mainWindow?.setTitleBarOverlay({ color: windowBackgroundColor(), height: 52 });
    }
  };
  nativeTheme.on('updated', syncWindowBackground);

  // Load the app
  appLoadUrl = getDashboardUrl();
  void mainWindow.loadURL(appLoadUrl);
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // A Chromium network-service crash during boot kills the initial dev-server
  // load and nothing retries it — the window sits blank. Retry with backoff;
  // production loads over the app protocol and doesn't need this.
  let failedLoadRetries = 0;
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (!isMainFrame || !process.env.VITE_DEV_SERVER_URL) return;
    if (code === -3 /* ABORTED: superseded by another load */) return;
    if (failedLoadRetries >= 5) return;
    failedLoadRetries += 1;
    const delay = 500 * failedLoadRetries;
    console.warn(
      `[main] Dev load failed (${code} ${description}) for ${url}; retry ${failedLoadRetries}/5 in ${delay}ms`,
    );
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && appLoadUrl) {
        void mainWindow.loadURL(appLoadUrl);
      }
    }, delay);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    failedLoadRetries = 0;
  });

  // The crash can also leave the load *hanging* (no did-fail-load ever
  // fires). Watchdog: if the first load hasn't finished shortly after boot,
  // load again. Cleared on success; dev-only like the retry above.
  if (process.env.VITE_DEV_SERVER_URL) {
    let bootLoadFinished = false;
    mainWindow.webContents.once('did-finish-load', () => {
      bootLoadFinished = true;
    });
    const watchdog = setInterval(() => {
      if (bootLoadFinished || !mainWindow || mainWindow.isDestroyed()) {
        clearInterval(watchdog);
        return;
      }
      console.warn('[main] Boot load still pending; reloading dev URL');
      if (appLoadUrl) void mainWindow.loadURL(appLoadUrl);
    }, 15_000);
  }

  mainWindow.on('closed', () => {
    nativeTheme.removeListener('updated', syncWindowBackground);
    mainWindow = null;
  });

  const devServerOrigin = (() => {
    if (!process.env.VITE_DEV_SERVER_URL) {
      return null;
    }

    try {
      return new URL(process.env.VITE_DEV_SERVER_URL).origin;
    } catch {
      return null;
    }
  })();
  const appContentDir = app.isPackaged ? join(app.getAppPath(), 'dist') : join(dirname(electronDir), 'dist');

  const isInternalUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      if (process.env.VITE_DEV_SERVER_URL) {
        return devServerOrigin !== null && parsed.origin === devServerOrigin;
      }

      if (parsed.href === 'about:blank') {
        return true;
      }

      if (parsed.protocol !== 'file:') {
        return false;
      }

      const filePath = fileURLToPath(parsed);
      return isPathWithinDirectory(appContentDir, filePath);
    } catch {
      return false;
    }
  };

  const isExternalHttpUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Prevent navigation to external URLs within the app window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isInternalUrl(url)) {
      return;
    }

    event.preventDefault();
    if (isExternalHttpUrl(url)) {
      void shell.openExternal(url);
    }
  });

  // Handle new window requests (e.g., target="_blank" links)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      return { action: 'allow' };
    }

    if (isExternalHttpUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
};

// This method will be called when Electron has finished initialization
app.on('ready', () => {
  if (cliCommand) return;
  app.setAsDefaultProtocolClient(APP_PROTOCOL);
  // Initialize paths before creating window
  initializePaths();

  registerAssetProtocol();
  createWindow();
  const launchLinkHash = extractArtifactDeepLinkFromArgs(process.argv);
  if (launchLinkHash) {
    openArtifactDeepLink(launchLinkHash);
  } else if (pendingArtifactDeepLink) {
    openArtifactDeepLink(pendingArtifactDeepLink);
  }

  // Register IPC handlers
  registerIpcHandlers({ getMainWindow: () => mainWindow });

  if (process.argv.includes('--capture')) openQuickCapture();
  watchOmarchyAccent((accent) => mainWindow?.webContents.send('system:accent-changed', { accent }));
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  const deepLinkHash = parseArtifactHashFromProtocolUrl(url);
  if (deepLinkHash) {
    if (mainWindow === null) {
      createWindow();
    }
    openArtifactDeepLink(deepLinkHash);
  }
});

function registerAssetProtocol() {
  protocol.registerFileProtocol('myos', (request, callback) => {
    try {
      const url = request.url.replace(/^myos:\/\//, '');
      const decoded = decodeURI(url);
      if (!decoded.startsWith('assets/')) {
        callback({ error: -6 });
        return;
      }
      const vaultPath = getVaultPath();
      const filePath = resolve(vaultPath, decoded);
      const rel = relative(vaultPath, filePath);
      if (rel.startsWith('..') || isAbsolute(rel)) {
        callback({ error: -6 });
        return;
      }
      callback({ path: filePath });
    } catch (error) {
      console.error('Failed to resolve myOS asset', error);
      callback({ error: -6 });
    }
  });
}

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }

  if (pendingArtifactDeepLink) {
    openArtifactDeepLink(pendingArtifactDeepLink);
  }
});
