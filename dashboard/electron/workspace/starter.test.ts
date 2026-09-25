import { mkdtempSync, readFileSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { selectInbox } from '../../shared/inbox';
import { selectToday } from '../../shared/today';
import { parseDocument } from '../documents/markdown';
import { writeStarterContent } from './starter';
import { scanMarkdown } from './paths';

let root: string;
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('starter workspace', () => {
  it('writes valid files that fill Today, the Inbox, and one project', async () => {
    root = mkdtempSync(join(tmpdir(), 'myos-starter-'));
    writeStarterContent(root);
    const files = await scanMarkdown(root);
    const artifacts = files.map((file) =>
      parseDocument(readFileSync(file, 'utf8'), relative(root, file), statSync(file)),
    );

    expect(artifacts.map((artifact) => artifact.filePath).sort()).toEqual([
      'inbox/sort-me-into-a-task.md',
      'inbox/turn-me-into-a-note.md',
      'personal/memos/welcome-to-myos.md',
      'personal/projects/getting-started.md',
      'personal/todos/capture-your-first-thought.md',
      'personal/todos/plan-your-day-in-today.md',
      'personal/todos/write-a-note.md',
      'templates/lecture-notes.md',
      'templates/meeting-notes.md',
      'templates/project-brief.md',
      'templates/weekly-plan.md',
    ]);
    expect(artifacts.every((artifact) => Object.keys(artifact.extra).length === 0)).toBe(true);
    expect(selectToday(artifacts).today).toHaveLength(2);
    expect(selectInbox(artifacts)).toHaveLength(2);
    const tasks = artifacts.filter((artifact) => artifact.type === 'todo');
    expect(tasks.every((task) => task.project === 'getting-started')).toBe(true);
  });

  it('never replaces existing files', () => {
    root = mkdtempSync(join(tmpdir(), 'myos-starter-'));
    writeStarterContent(root);
    expect(() => writeStarterContent(root)).not.toThrow();
  });
});
