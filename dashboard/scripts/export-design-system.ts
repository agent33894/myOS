import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { buildDS2CSSSource } from '../shared/design-system/tokens.ts';

const outputs = [
  {
    path: resolve(import.meta.dirname, '../src/styles/themes/ds2.generated.css'),
    content: buildDS2CSSSource(),
  },
];

const check = process.argv.includes('--check');
let stale = false;
for (const output of outputs) {
  const content = `${output.content.trimEnd()}\n`;
  if (check) {
    let current = '';
    try {
      current = readFileSync(output.path, 'utf8');
    } catch {
      // Missing output is stale output.
    }
    if (current !== content) {
      console.error(`Stale generated design-system output: ${output.path}`);
      stale = true;
    }
    continue;
  }
  mkdirSync(dirname(output.path), { recursive: true });
  writeFileSync(output.path, content, 'utf8');
}

if (stale) process.exitCode = 1;
else console.log(check ? 'Design-system output is current.' : 'Exported deterministic CSS design tokens.');
