import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Builds packaging/arch/PKGBUILD from the local release tarball, so Omarchy
// users can `sudo pacman -U` without FUSE. Run after `npm run build:linux`.
const dashboardRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const { version } = JSON.parse(readFileSync(join(dashboardRoot, 'package.json'), 'utf8'));
const tarballName = `myOS-${version}-x64.tar.gz`;
const tarball = join(dashboardRoot, 'release', tarballName);
const workDirectory = join(dashboardRoot, 'release', 'arch');

rmSync(workDirectory, { recursive: true, force: true });
mkdirSync(workDirectory, { recursive: true });
copyFileSync(tarball, join(workDirectory, tarballName));

const checksum = createHash('sha256').update(readFileSync(tarball)).digest('hex');
const pkgbuild = readFileSync(join(dashboardRoot, 'packaging', 'arch', 'PKGBUILD'), 'utf8')
  .replace(/^pkgver=.*$/m, `pkgver=${version}`)
  .replace(/^sha256sums=.*$/m, `sha256sums=('${checksum}')`);
writeFileSync(join(workDirectory, 'PKGBUILD'), pkgbuild);

// makepkg finds the tarball next to the PKGBUILD instead of downloading it.
execFileSync('makepkg', ['--force', '--nodeps', '--noconfirm'], { cwd: workDirectory, stdio: 'inherit' });
