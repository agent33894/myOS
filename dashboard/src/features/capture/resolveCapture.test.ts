import { describe, expect, it } from 'vitest';
import { resolveCapture } from './resolveCapture';

// Thursday, 2026-09-24.
const now = new Date(2026, 8, 24, 10);
const kitchen = { id: 'kitchen-renovation', title: 'Kitchen renovation', filePath: 'p.md', color: '#000000', closed: false };
const match = (typed: string) => ('kitchen-renovation'.startsWith(typed) ? kitchen : undefined);

describe('resolveCapture', () => {
  it('sends plain text to the Inbox', () => {
    const { draft, destination, tokens } = resolveCapture('Call the plumber', match, now);
    expect(draft).toMatchObject({ type: 'inbox', title: 'Call the plumber' });
    expect(draft.project).toBeUndefined();
    expect(destination).toBe('Inbox');
    expect(tokens).toEqual([]);
  });

  it('files a matched project prefix as a task there', () => {
    const { draft, destination } = resolveCapture('Pick tiles @kitch tomorrow #shop', match, now);
    expect(draft).toMatchObject({
      type: 'todo',
      title: 'Pick tiles',
      project: 'kitchen-renovation',
      due: '2026-09-25',
      tags: ['shop'],
    });
    expect(destination).toBe('Kitchen renovation · Tomorrow');
  });

  it('keeps an unknown @name in the title and never invents a project', () => {
    const { draft, tokens, destination } = resolveCapture('Email @sam about invoices', match, now);
    expect(draft).toMatchObject({ type: 'inbox', title: 'Email @sam about invoices' });
    expect(draft.project).toBeUndefined();
    expect(tokens).toEqual([{ kind: 'new-project', label: '@sam · New project?' }]);
    expect(destination).toBe('Inbox');
  });
});
