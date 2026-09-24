import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const requestedArch = process.argv.find((argument) => argument.startsWith('--arch='))?.split('=')[1] ?? 'x64';
const unpackedOnly = process.argv.includes('--dir');

if (process.platform !== 'linux') {
  throw new Error('Linux releases must be built on Linux; use the release workflow from macOS.');
}
if (requestedArch !== 'x64') {
  throw new Error(`Unsupported Linux architecture: ${requestedArch}`);
}

const builder = join(dashboardRoot, 'node_modules', '.bin', 'electron-builder');
// Ignore ELECTRON_RUN_AS_NODE so `myos` keeps working when launched from a
// terminal inside another Electron app (editors often export it).
execFileSync(builder, ['--linux', `--${requestedArch}`, ...(unpackedOnly ? ['--dir'] : []), '-c.electronFuses.runAsNode=false'], {
  cwd: dashboardRoot,
  stdio: 'inherit',
});
