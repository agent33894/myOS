import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const requestedArch = process.argv.find((argument) => argument.startsWith('--arch='))?.split('=')[1] ?? 'arm64';
const installer = process.argv.includes('--installer');

if (!['arm64', 'x64'].includes(requestedArch)) {
  throw new Error(`Unsupported macOS architecture: ${requestedArch}`);
}

const run = (command, args, env = process.env) => {
  execFileSync(command, args, { cwd: dashboardRoot, env, stdio: 'inherit' });
};

const builder = join(dashboardRoot, 'node_modules', '.bin', 'electron-builder');
const buildEnvironment = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' };
run(builder, ['--mac', `--${requestedArch}`, '--dir'], buildEnvironment);

const appDirectory = requestedArch === 'arm64' ? 'mac-arm64' : 'mac';
const appPath = join(dashboardRoot, 'release', appDirectory, 'myOS Next.app');
const entitlementsPath = join(
  dashboardRoot,
  'node_modules',
  'app-builder-lib',
  'templates',
  'entitlements.mac.plist',
);

const helperNames = [
  'myOS Next Helper.app',
  'myOS Next Helper (GPU).app',
  'myOS Next Helper (Plugin).app',
  'myOS Next Helper (Renderer).app',
];

// Seal Electron's nested frameworks first. Helper applications are then
// re-signed with the library-validation entitlement they need to load the
// shared Electron framework under the hardened runtime.
run('codesign', [
  '--force',
  '--deep',
  '--sign',
  '-',
  '--options',
  'runtime',
  '--timestamp=none',
  '--entitlements',
  entitlementsPath,
  appPath,
]);

for (const helperName of helperNames) {
  const helperPath = join(appPath, 'Contents', 'Frameworks', helperName);
  if (!existsSync(helperPath)) {
    throw new Error(`Missing Electron helper: ${helperPath}`);
  }
  run('codesign', [
    '--force',
    '--sign',
    '-',
    '--options',
    'runtime',
    '--timestamp=none',
    '--entitlements',
    entitlementsPath,
    helperPath,
  ]);
}

run('codesign', [
  '--force',
  '--sign',
  '-',
  '--options',
  'runtime',
  '--timestamp=none',
  '--entitlements',
  entitlementsPath,
  appPath,
]);
run('codesign', ['--verify', '--deep', '--strict', '--verbose=1', appPath]);

if (installer) {
  run(
    builder,
    ['--prepackaged', appPath, '--mac', 'dmg', 'zip', `--${requestedArch}`],
    buildEnvironment,
  );
}
