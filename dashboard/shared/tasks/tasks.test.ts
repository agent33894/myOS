import { describe, expect, it } from 'vitest';
import { appendLine, extractTasks, fileTask, parseTaskLine, setTaskDate, setTaskText, toggleTaskLine } from '.';

const NOTE = [
  '---',
  'title: Trip',
  'tags: [a]',
  '---',
  '# Trip\r',
  '',
  '- [ ] Book flights 📅 2026-09-30 #travel\r',
  '    * [x] Renew passport ✅ 2026-09-20',
  '1. [ ] Pack due:2026-10-02 ⏫',
  '```md',
  '- [ ] Not a task',
  '```',
  '- [ ]   ',
  '- [ ] Water plants 🔁 every week ⏳ 2026-09-24 📅 2026-09-25 ^water',
  'no newline at the end',
].join('\n');

const line = (text: string, number: number) => text.split('\n')[number - 1].replace(/\r$/, '');
const TODAY = '2026-09-25';

describe('reading task lines', () => {
  it('finds checkboxes at any depth outside code fences and frontmatter', () => {
    expect(extractTasks(NOTE, 'trip.md').map((task) => [task.line, task.text, task.status])).toEqual([
      [7, 'Book flights #travel', 'open'],
      [8, 'Renew passport', 'done'],
      [9, 'Pack', 'open'],
      [14, 'Water plants', 'open'],
    ]);
  });

  it('reads Obsidian Tasks emoji and plain due dates', () => {
    const [flights, passport, pack, plants] = extractTasks(NOTE, 'trip.md');
    expect(flights).toMatchObject({ due: '2026-09-30', tags: ['travel'], raw: '- [ ] Book flights 📅 2026-09-30 #travel' });
    expect(passport.done).toBe('2026-09-20');
    expect(pack).toMatchObject({ due: '2026-10-02', priority: 'high' });
    expect(plants).toMatchObject({ recurrence: 'every week', scheduled: '2026-09-24', due: '2026-09-25' });
    expect(parseTaskLine('- [-] Dropped 🛫 2026-01-01 ⏳ 2026-01-02 ❌ 2026-01-03')).toMatchObject({
      status: 'cancelled',
      start: '2026-01-01',
      scheduled: '2026-01-02',
      text: 'Dropped',
    });
  });

  it('treats type: todo files as tasks, done by status', () => {
    expect(fileTask('a.md', 'Call Sam', { type: 'todo', status: 'done', due: '2026-10-01' }, [])).toMatchObject({
      line: 0,
      text: 'Call Sam',
      status: 'done',
      due: '2026-10-01',
    });
    expect(fileTask('a.md', 'A note', { type: 'memo' }, [])).toBeNull();
  });
});

describe('editing task lines', () => {
  it('checks and unchecks one line, byte for byte everywhere else', () => {
    const checked = toggleTaskLine(NOTE, 7, line(NOTE, 7), TODAY)!;
    expect(checked).toBe(NOTE.replace('- [ ] Book flights 📅 2026-09-30 #travel\r', `- [x] Book flights 📅 2026-09-30 #travel ✅ ${TODAY}\r`));
    expect(toggleTaskLine(checked, 7, line(checked, 7), TODAY)).toBe(NOTE);
    expect(toggleTaskLine(NOTE, 8, line(NOTE, 8), TODAY)).toBe(NOTE.replace('    * [x] Renew passport ✅ 2026-09-20', '    * [ ] Renew passport'));
  });

  it('refuses when the line moved, changed, or is not a task', () => {
    expect(toggleTaskLine(NOTE, 8, line(NOTE, 7), TODAY)).toBeNull();
    expect(toggleTaskLine(NOTE, 11, line(NOTE, 11), TODAY)).toBeNull();
    expect(toggleTaskLine(NOTE, 99, 'x', TODAY)).toBeNull();
    expect(setTaskText(NOTE, 7, line(NOTE, 7), 'two\nlines')).toBeNull();
  });

  it('puts the next occurrence of a repeating task directly above the completed one', () => {
    const result = toggleTaskLine(NOTE, 14, line(NOTE, 14), TODAY)!;
    const lines = result.split('\n');
    expect(lines[13]).toBe('- [ ] Water plants 🔁 every week ⏳ 2026-10-01 📅 2026-10-02');
    expect(lines[14]).toBe(`- [x] Water plants 🔁 every week ⏳ 2026-09-24 📅 2026-09-25 ✅ ${TODAY} ^water`);
    expect([...lines.slice(0, 13), ...lines.slice(15)]).toEqual([...NOTE.split('\n').slice(0, 13), ...NOTE.split('\n').slice(14)]);
  });

  it('repeats on weekdays, monthly days, when done, and without dates', () => {
    const next = (task: string) => toggleTaskLine(task, 1, task, TODAY)!.split('\n')[0];
    expect(next('- [ ] Standup 🔁 every Tuesday 📅 2026-09-22')).toBe('- [ ] Standup 🔁 every Tuesday 📅 2026-09-29');
    expect(next('- [ ] Rent 🔁 every month on the 15th 📅 2026-09-15')).toBe('- [ ] Rent 🔁 every month on the 15th 📅 2026-10-15');
    expect(next('- [ ] Haircut 🔁 every 4 weeks when done 📅 2026-08-01')).toBe('- [ ] Haircut 🔁 every 4 weeks when done 📅 2026-10-23');
    expect(next('- [ ] Stretch 🔁 every day')).toBe('- [ ] Stretch 🔁 every day');
    expect(toggleTaskLine('- [ ] Odd 🔁 every blue moon', 1, '- [ ] Odd 🔁 every blue moon', TODAY)).toBe(`- [x] Odd 🔁 every blue moon ✅ ${TODAY}`);
  });

  it('sets, moves, and clears dates in place', () => {
    const flights = line(NOTE, 7);
    expect(line(setTaskDate(NOTE, 7, flights, 'due', '2026-10-05')!, 7)).toBe('- [ ] Book flights 📅 2026-10-05 #travel');
    expect(line(setTaskDate(NOTE, 7, flights, 'due', null)!, 7)).toBe('- [ ] Book flights #travel');
    expect(line(setTaskDate(NOTE, 7, flights, 'scheduled', '2026-09-28')!, 7)).toBe('- [ ] Book flights 📅 2026-09-30 #travel ⏳ 2026-09-28');
    expect(line(setTaskDate(NOTE, 9, line(NOTE, 9), 'due', '2026-10-09')!, 9)).toBe('1. [ ] Pack due:2026-10-09 ⏫');
    const passport = line(NOTE, 8);
    expect(line(setTaskDate(NOTE, 8, passport, 'due', '2026-10-01')!, 8)).toBe('    * [x] Renew passport 📅 2026-10-01 ✅ 2026-09-20');
    const edited = setTaskDate(NOTE, 7, flights, 'due', '2026-10-05')!;
    expect(edited.split('\n').filter((_, index) => index !== 6)).toEqual(NOTE.split('\n').filter((_, index) => index !== 6));
    expect(line(setTaskText(NOTE, 7, flights, 'Book trains 📅 2026-09-30')!, 7)).toBe('- [ ] Book trains 📅 2026-09-30');
  });
});

describe('adding lines', () => {
  it('appends at the end, creating the file when needed', () => {
    expect(appendLine(null, '- a')).toBe('- a\n');
    expect(appendLine('text', '- a')).toBe('text\n- a\n');
    expect(appendLine('text\r\n', '- a')).toBe('text\r\n- a\r\n');
  });

  it('adds to the end of a heading section, or adds the heading', () => {
    const file = '# Day\n\n## Log\n- first\n\n## Later\n- other\n';
    expect(appendLine(file, '- second', 'Log')).toBe('# Day\n\n## Log\n- first\n- second\n\n## Later\n- other\n');
    expect(appendLine(file, '- x', '## Later')).toBe(`${file}- x\n`);
    expect(appendLine(file, '- x', 'Ideas')).toBe(`${file}\n## Ideas\n- x\n`);
    expect(appendLine('## Log', '- x', 'Log')).toBe('## Log\n- x');
    expect(appendLine('```\n## Log\n```\n', '- x', 'Log')).toBe('```\n## Log\n```\n\n## Log\n- x\n');
  });
});
