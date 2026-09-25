import { describe, expect, it } from 'vitest';
import { runView, viewFromFence, type ViewNote } from './query';
import { extractTasks } from './tasks';

const TODAY = '2026-09-25';

function note(path: string, body: string, tags: string[] = [], modified = '2026-09-01T00:00:00Z'): ViewNote {
  return { path, title: path.replace(/^.*\/|\.md$/g, ''), tags, tasks: extractTasks(body, path), searchText: body, modified };
}

const NOTES = [
  note(
    'work/api.md',
    [
      '- [ ] Fix login redirect 📅 2026-09-24 #auth',
      '- [ ] Rate limit the export 📅 2026-09-25 ⏫ #api',
      '- [x] Ship the parser ✅ 2026-09-20 #api',
      '- [ ] Write docs ⏳ 2026-09-25',
      '- [ ] Someday idea',
    ].join('\n'),
    ['api', 'work/backend'],
    '2026-09-20T00:00:00Z',
  ),
  note('home/list.md', '- [ ] Buy milk 📅 2026-09-26 #errand\n- [ ] Call Sam due:2026-10-02', ['home']),
  note('notes/rate limits.md', 'How the rate limit works.', ['api'], '2026-09-24T00:00:00Z'),
];

const texts = (text: string) => {
  const result = runView('tasks', text, NOTES, TODAY);
  return result.groups.flatMap((group) => group.items.map((item) => ('text' in item ? item.text : item.path)));
};

describe('task views', () => {
  it('filters by status, dates, and overdue', () => {
    expect(texts('open due<=today')).toEqual(['Fix login redirect #auth', 'Rate limit the export #api']);
    expect(texts('overdue')).toEqual(['Fix login redirect #auth']);
    expect(texts('done')).toEqual(['Ship the parser #api']);
    expect(texts('due=tomorrow')).toEqual(['Buy milk #errand']);
    expect(texts('scheduled=today')).toEqual(['Write docs']);
    expect(texts('due>today+1')).toEqual(['Call Sam']);
    expect(texts('open due=none')).toEqual(['Write docs', 'Someday idea']);
    expect(texts('due<2026-09-25 -open')).toEqual([]);
  });

  it('filters by tag, place, and words, and negates with a minus', () => {
    expect(texts('#api')).toEqual(['Rate limit the export #api', 'Ship the parser #api']);
    expect(texts('open -#api path:work/')).toEqual(['Fix login redirect #auth', 'Write docs', 'Someday idea']);
    expect(texts('file:list')).toEqual(['Buy milk #errand', 'Call Sam']);
    expect(texts('"rate limit"')).toEqual(['Rate limit the export #api']);
    expect(texts('open -milk path:home')).toEqual(['Call Sam']);
  });

  it('sorts, limits, and groups', () => {
    expect(texts('open sort:priority limit:2')).toEqual(['Rate limit the export #api', 'Fix login redirect #auth']);
    expect(runView('tasks', 'open limit:1', NOTES, TODAY).total).toBe(6);
    const byDate = runView('tasks', 'open group:date', NOTES, TODAY).groups;
    expect(byDate.map((group) => [group.label, group.items.length])).toEqual([
      ['Overdue', 1],
      ['Today', 1],
      ['Tomorrow', 1],
      ['2026-10-02', 1],
      ['No date', 2],
    ]);
    const byTag = runView('tasks', 'open group:tag', NOTES, TODAY).groups;
    expect(byTag.map((group) => group.label)).toEqual(['#api', '#auth', '#errand', 'No tag']);
    const byFolder = runView('tasks', 'group:folder', NOTES, TODAY).groups;
    expect(byFolder.map((group) => [group.key, group.items.length])).toEqual([
      ['home', 2],
      ['work', 5],
    ]);
  });

  it('reports terms it cannot use and ignores them', () => {
    const result = runView('tasks', 'open due<=someday sort:size', NOTES, TODAY);
    expect(result.errors).toHaveLength(2);
    expect(result.total).toBe(6);
  });
});

describe('note views', () => {
  it('matches tags (nested too), titles and bodies, and places', () => {
    const paths = (text: string) => runView('notes', text, NOTES, TODAY).groups.flatMap((group) => group.items.map((item) => item.path));
    expect(paths('#api')).toEqual(['notes/rate limits.md', 'work/api.md']);
    expect(paths('#work')).toEqual(['work/api.md']);
    expect(paths('rate limit sort:modified')).toEqual(['notes/rate limits.md', 'work/api.md']);
    expect(paths('path:notes')).toEqual(['notes/rate limits.md']);
    expect(runView('notes', 'open', NOTES, TODAY).errors).toEqual(['“open” works in task views only.']);
  });
});

describe('fenced views', () => {
  it('reads the query from the info string and the body', () => {
    expect(viewFromFence('tasks open #work', '')).toEqual({ kind: 'tasks', query: 'open #work' });
    expect(viewFromFence('notes', 'path:notes/\nsort:modified\n')).toEqual({ kind: 'notes', query: 'path:notes/ sort:modified' });
    expect(viewFromFence('ts', 'x')).toBeNull();
  });
});
