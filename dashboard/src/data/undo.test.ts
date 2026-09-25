import { expect, it } from 'vitest';
import { record, undoChange } from './undo';

it('undoes the change a toast describes, never a newer one to the same file', async () => {
  const done: string[] = [];
  const entry = (label: string, path: string) => record({ label, paths: [path], undo: async () => void done.push(label), redo: async () => undefined });
  const first = entry('Check A', 'a.md');
  const other = entry('Check B', 'b.md');
  const third = entry('Edit A', 'a.md');
  await expect(undoChange(first)).rejects.toThrow(/newer change/);
  expect(done).toEqual([]);
  await undoChange(other);
  expect(done).toEqual(['Check B']);
  await expect(undoChange(other)).rejects.toThrow(/already undone/);
  await undoChange(third);
  await undoChange(first);
  expect(done).toEqual(['Check B', 'Edit A', 'Check A']);
});
