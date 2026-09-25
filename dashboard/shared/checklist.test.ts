import { describe, expect, it } from 'vitest';
import { extractChecks, toggleCheckLine } from './checklist';

const NOTE = [
  '---',
  'title: Trip',
  'tags: [a]',
  '---',
  '# Trip\r',
  '',
  '- [ ] Book flights 📅 2026-09-30\r',
  '  * [x] Renew passport',
  '1. [ ] Pack due 2026-10-02',
  '```md',
  '- [ ] Not a task',
  '```',
  '- [ ]   ',
  'no newline at the end',
].join('\n');

describe('checklist lines', () => {
  it('reads top-level and nested checkboxes outside code fences', () => {
    expect(extractChecks(NOTE)).toEqual([
      { line: 7, text: 'Book flights', done: false, due: '2026-09-30' },
      { line: 8, text: 'Renew passport', done: true },
      { line: 9, text: 'Pack', done: false, due: '2026-10-02' },
    ]);
  });

  it('flips exactly one line and leaves every other byte alone', () => {
    const toggled = toggleCheckLine(NOTE, 7, 'Book flights');
    expect(toggled).toBe(NOTE.replace('- [ ] Book flights', '- [x] Book flights'));
    expect(toggleCheckLine(toggled!, 7, 'Book flights')).toBe(NOTE);
    expect(toggleCheckLine(NOTE, 8, 'Renew passport')).toBe(NOTE.replace('* [x] Renew', '* [ ] Renew'));
  });

  it('refuses when the line moved or changed', () => {
    expect(toggleCheckLine(NOTE, 8, 'Book flights')).toBeNull();
    expect(toggleCheckLine(NOTE, 11, 'Not a task')).toBeNull();
    expect(toggleCheckLine(NOTE, 99, 'Pack')).toBeNull();
  });
});
