import { describe, expect, it } from 'vitest';
import { bodyWithTag } from './taskEdits';

describe('bodyWithTag', () => {
  it('adds the tag after the description and keeps every token as written', () => {
    expect(bodyWithTag('- [ ] Ship the parser ⏫ 🔁 every week 📅 2026-10-02 ^abc', 'release')).toBe('Ship the parser #release ⏫ 🔁 every week 📅 2026-10-02 ^abc');
    expect(bodyWithTag('  * [x] Call Sam due:2026-10-02 ✅ 2026-09-25', '#work/api')).toBe('Call Sam #work/api due:2026-10-02 ✅ 2026-09-25');
    expect(bodyWithTag('1. [ ] Read the RFC', 'reading')).toBe('Read the RFC #reading');
  });

  it('leaves a task that already has the tag, and refuses a non-tag', () => {
    expect(bodyWithTag('- [ ] Fix login #bug 📅 2026-10-02', 'bug')).toBeNull();
    expect(bodyWithTag('- [ ] Fix login', 'two words')).toBeNull();
    expect(bodyWithTag('- [ ] Fix login', '123')).toBeNull();
    expect(bodyWithTag('Not a task', 'bug')).toBeNull();
  });
});
