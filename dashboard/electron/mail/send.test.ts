import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { expect, it } from 'vitest';

const root = join(__dirname, '..', '..');

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sources(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

// myOS never sends mail on its own: only the approval channel reaches the sender.
it('sends mail only through the approved-draft channel', () => {
  const files = ['electron', 'shared', 'src'].flatMap((dir) => sources(join(root, dir)));
  const importers = (pattern: RegExp) =>
    files.filter((file) => pattern.test(readFileSync(file, 'utf8'))).map((file) => relative(root, file));

  expect(importers(/from ['"][^'"]*mail\/send['"]/)).toEqual(['electron/ipc/register.ts']);
  expect(importers(/from ['"]nodemailer(\/[^'"]*)?['"]/)).toEqual(['electron/mail/send.ts']);
  const register = readFileSync(join(root, 'electron/ipc/register.ts'), 'utf8');
  expect(register.match(/sendApprovedDraft/g)).toHaveLength(2);
  expect(register).toMatch(/handle\('mail:draft:send', \['string'\], sendApprovedDraft\)/);
});
