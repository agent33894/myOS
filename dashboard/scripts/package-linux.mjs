import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const requestedArch = process.argv.find((argument) => argument.startsWith('--arch='))?.split('=')[1] ?? 'x64';

if (process.platform !== 'linux') {
  throw new Error('Linux releases must be built on Linux; use the release workflow from macOS.');
}
if (requestedArch !== 'x64') {
  throw new Error(`Unsupported Linux architecture: ${requestedArch}`);
}

const builder = join(dashboardRoot, 'node_modules', '.bin', 'electron-builder');
execFileSync(builder, ['--linux', 'AppImage', 'tar.gz', `--${requestedArch}`], {
  cwd: dashboardRoot,
  stdio: 'inherit',
});
