import { describe, expect, it } from 'vitest';
import { calculateSlashMenuPosition, filterInsertCommands } from './insertCommands';

describe('TipTap insert commands', () => {
  it('filters commands across labels, descriptions, and keywords', () => {
    expect(filterInsertCommands('metric snapshot').map(({ id }) => id)).toEqual(['insert-kpi']);
    expect(filterInsertCommands('flowchart').map(({ id }) => id)).toEqual(['insert-mermaid']);
    expect(filterInsertCommands('  ')).toHaveLength(6);
  });

  it('places the menu below the cursor when it fits', () => {
    expect(calculateSlashMenuPosition({
      optionCount: 1,
      cursor: { top: 100, bottom: 120, left: 80 },
      viewport: { width: 1200, height: 800 },
    })).toEqual({ top: 128, left: 80 });
  });

  it('flips and clamps the menu near viewport edges', () => {
    expect(calculateSlashMenuPosition({
      optionCount: 6,
      cursor: { top: 700, bottom: 720, left: 1180 },
      viewport: { width: 1200, height: 800 },
    })).toEqual({ top: 330, left: 848 });
  });
});
