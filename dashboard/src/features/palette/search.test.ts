import { describe, expect, it } from 'vitest';
import type { ArtifactSummary } from '@shared/types';
import { buildIndex, labelScore, plainText, searchDocs } from './search';

const doc = (title: string, searchText = '', updated = '2026-01-01'): ArtifactSummary =>
  ({ id: title, title, type: 'memo', filePath: `${title}.md`, searchText, updated }) as ArtifactSummary;

describe('palette search', () => {
  it('ranks title prefix over word prefix over contains over body text', () => {
    const index = buildIndex([
      doc('Notes on planning', 'nothing here'),
      doc('Replan the garden'),
      doc('Weekly review', 'We should plan the offsite.'),
      doc('Plan the launch'),
      doc('Launch plan'),
    ]);
    expect(searchDocs(index, 'plan').map((hit) => hit.item.title)).toEqual([
      'Plan the launch',
      'Launch plan',
      'Notes on planning',
      'Replan the garden',
      'Weekly review',
    ]);
  });

  it('matches every word across title and body, with a snippet around the match', () => {
    const index = buildIndex([doc('Groceries', '## List\n\n- **Oat milk** and [bread](http://x.test)\n- apples')]);
    const [hit] = searchDocs(index, 'groceries bread');
    expect(hit.snippet?.match).toBe('bread');
    const [bodyHit] = searchDocs(index, 'oat milk');
    expect(bodyHit.snippet).toEqual({ before: 'List ', match: 'Oat milk', after: ' and bread apples' });
  });

  it('strips Markdown syntax for reading', () => {
    expect(plainText('# Title\n\n> quote with [[Wiki|label]] and `code`')).toBe('Title quote with label and code');
  });

  it('scores command labels', () => {
    expect(labelScore('New note', 'new')).toBeGreaterThan(labelScore('Renew', 'new'));
    expect(labelScore('Toggle theme', 'theme toggle')).toBeGreaterThan(0);
    expect(labelScore('Settings', 'xyz')).toBe(0);
  });
});
