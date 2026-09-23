import { app } from 'electron';
import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { ensureStableAppDataPath, getLegacyAppDataPaths, getStableAppDataPath } from './stable-app-data.js';

let vaultPath: string | null = null;

/**
 * Get the path to the config file for persistent settings
 */
function getConfigPath(): string {
  return join(getStableAppDataPath(), 'myos-config.json');
}

function getConfigCandidatePaths(): string[] {
  return [
    getConfigPath(),
    ...getLegacyAppDataPaths().map((appDataPath) => join(appDataPath, 'myos-config.json')),
  ];
}

/**
 * Read config from disk
 */
function readConfig(): { vaultPath?: string } {
  for (const configPath of getConfigCandidatePaths()) {
    if (!existsSync(configPath)) {
      continue;
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      if (configPath !== getConfigPath()) {
        writeConfig(config);
      }
      return config;
    } catch (e) {
      console.error(`Error reading config from ${configPath}:`, e);
    }
  }

  return {};
}

/**
 * Write config to disk
 */
function writeConfig(config: { vaultPath?: string }) {
  try {
    const configPath = getConfigPath();
    const userDataPath = ensureStableAppDataPath();
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Error writing config:', e);
  }
}

function isUsableWorkspaceDirectory(targetPath: string): boolean {
  try {
    const stats = statSync(targetPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

const WORKSPACE_DIRECTORIES = [
  'inbox',
  'work/memos',
  'work/projects',
  'work/todos',
  'personal/memos',
  'personal/projects',
  'personal/todos',
  'research/topics',
  'creative/writing',
];

function initializeWorkspace(targetPath: string): string {
  const resolvedPath = resolve(targetPath.replace(/^~/, process.env.HOME || ''));
  if (resolvedPath === '/') {
    throw new Error('The filesystem root cannot be used as a myOS workspace.');
  }

  mkdirSync(resolvedPath, { recursive: true });
  for (const directory of WORKSPACE_DIRECTORIES) {
    mkdirSync(join(resolvedPath, directory), { recursive: true });
  }

  const welcomePath = join(resolvedPath, 'Welcome to myOS.md');
  if (!existsSync(welcomePath)) {
    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(
      welcomePath,
      `---\nid: welcome-to-myos\ntitle: Welcome to myOS\ndomain: personal\ntype: memo\ntags: [getting-started, myos]\ncreated: ${today}\nupdated: ${today}\nstatus: active\nrelated: []\n---\n\n# Welcome to myOS\n\nmyOS keeps your work in ordinary Markdown files on this computer.\n\n## Start here\n\n- Press ${process.platform === 'darwin' ? 'Command' : 'Ctrl'}-N to capture a thought or task.\n- Use Today for active work and Library for everything else.\n- Create project notes to group related tasks and context.\n- Change the workspace folder at any time in Settings.\n\nYou own this folder. Back it up, sync it with a provider you trust, or put it in Git. myOS itself never uploads it.\n`,
      'utf8',
    );
  }

  return resolvedPath;
}

export function createDefaultWorkspace(): string {
  const defaultPath = join(app.getPath('documents'), 'myOS');
  const initializedPath = initializeWorkspace(defaultPath);
  if (!setVaultPath(initializedPath)) {
    throw new Error('Unable to use the default myOS workspace.');
  }
  return initializedPath;
}

/**
 * Set the vault path (called from renderer via IPC)
 */
export function setVaultPath(path: string): boolean {
  const resolvedPath = resolve(path.replace(/^~/, process.env.HOME || ''));
  if (
    resolvedPath !== '/' &&
    existsSync(resolvedPath) &&
    isUsableWorkspaceDirectory(resolvedPath)
  ) {
    vaultPath = resolvedPath;
    const config = readConfig();
    config.vaultPath = resolvedPath;
    writeConfig(config);
    return true;
  }
  return false;
}

/**
 * Initialize paths using Electron's app.getPath()
 * Should be called after app is ready
 */
export function initializePaths() {
  const qaVaultPath = process.env.MYOS_QA_VAULT_PATH;
  const config = readConfig();
  if (process.env.VITE_DEV_SERVER_URL && qaVaultPath && existsSync(qaVaultPath)) {
    vaultPath = resolve(qaVaultPath);
  } else if (config.vaultPath && existsSync(config.vaultPath)) {
    vaultPath = config.vaultPath;
  } else if (process.env.VAULT_PATH) {
    // Check environment variable
    vaultPath = process.env.VAULT_PATH;
  } else {
    // In development, vault is relative to workspace root
    // In production, vault should be relative to app resources or user data
    if (process.env.VITE_DEV_SERVER_URL) {
      // Development mode: Use process.cwd() which should be the dashboard directory
      // Then go up one level to get to the repository workspace root.
      // This is more reliable than trying to calculate from __dirname
      const dashboardDir = process.cwd();
      const workspaceRoot = resolve(dashboardDir, '..');
      vaultPath = resolve(workspaceRoot, 'vault');

      console.log('Vault path resolution (dev mode):', {
        cwd: dashboardDir,
        workspaceRoot,
        vaultPath,
        exists: existsSync(vaultPath),
      });

      // Ensure path is absolute and normalized
      vaultPath = resolve(vaultPath);
    } else {
      // Production mode: try to find vault relative to app
      // First try: resources/vault (if bundled with app)
      const appPath = app.getAppPath();
      const resourcesVault = join(appPath, 'resources', 'vault');

      if (existsSync(resourcesVault)) {
        vaultPath = resourcesVault;
      } else {
        // Second try: workspace root (if app is in dashboard/)
        const workspaceVault = join(appPath, '..', 'vault');
        if (existsSync(workspaceVault)) {
          vaultPath = workspaceVault;
        } else {
          // Fallback before first-run onboarding selects or creates a workspace.
          const userDataPath = ensureStableAppDataPath();
          vaultPath = join(userDataPath, 'vault');
        }
      }
    }
  }

}

/**
 * Get the vault path
 */
export function getVaultPath(): string {
  if (!vaultPath) {
    throw new Error('Paths not initialized. Call initializePaths() first.');
  }
  // Ensure we always return an absolute, normalized path
  return resolve(vaultPath);
}
