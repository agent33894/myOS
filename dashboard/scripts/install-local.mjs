import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'linux') {
  throw new Error('The local Linux installer must run on Linux.');
}

const dashboardRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(dashboardRoot, 'release', 'linux-unpacked');
const applications = join(homedir(), 'Applications');
const destination = join(applications, 'myOS');
const stage = join(applications, `.myOS-stage-${randomUUID()}`);
const backup = join(applications, `.myOS-backup-${randomUUID()}`);

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

if (!existsSync(join(source, 'myos')) || !existsSync(join(source, 'resources', 'app.asar'))) {
  throw new Error('No packaged Linux build found. Run npm run build:linux first.');
}
if (existsSync(destination) && !lstatSync(destination).isDirectory()) {
  throw new Error(`${destination} exists and is not a directory; refusing to replace it.`);
}

mkdirSync(applications, { recursive: true });
let movedOld = false;
let installedNew = false;
try {
  cpSync(source, stage, { recursive: true });
  if (sha256(join(source, 'resources', 'app.asar')) !== sha256(join(stage, 'resources', 'app.asar'))) {
    throw new Error('Copied app.asar does not match the packaged build.');
  }

  if (existsSync(destination)) {
    renameSync(destination, backup);
    movedOld = true;
  }
  renameSync(stage, destination);
  installedNew = true;
  execFileSync(join(destination, 'myos'), ['--install-desktop-entry'], {
    stdio: 'inherit',
    timeout: 15_000,
  });
  if (sha256(join(source, 'resources', 'app.asar')) !== sha256(join(destination, 'resources', 'app.asar'))) {
    throw new Error('Installed app.asar does not match the packaged build.');
  }
  console.log(`Installed myOS locally at ${destination}`);
} catch (error) {
  if (installedNew) rmSync(destination, { recursive: true, force: true });
  if (movedOld) renameSync(backup, destination);
  throw error;
} finally {
  rmSync(stage, { recursive: true, force: true });
}

if (movedOld) rmSync(backup, { recursive: true, force: true });
