import { describe, expect, it } from 'vitest';
import { captureLine } from './capture';
import { dailyPath } from './daily';

// A Friday.
const NOW = new Date(2026, 8, 25, 9, 30);

describe('capture lines', () => {
  it.each([
    ['Read the RFC', '- Read the RFC'],
    ['[ ] Read the RFC #api', '- [ ] Read the RFC #api'],
    ['Ship the parser fix tomorrow #release', '- [ ] Ship the parser fix #release 📅 2026-09-26'],
    ['Dentist on tue at 3pm', '- [ ] Dentist at 3pm 📅 2026-09-29'],
    ['Water plants every tuesday', '- [ ] Water plants 🔁 every week on Tuesday 📅 2026-09-29'],
    ['Pay rent every month on the 1st !', '- [ ] Pay rent ⏫ 🔁 every month on the 1st 📅 2026-10-01'],
    ['Renew passport 📅 2026-11-01', '- [ ] Renew passport 📅 2026-11-01'],
    ["Read today's news", "- Read today's news"],
    ['Sun cream', '- Sun cream'],
  ])('%s', (text, line) => {
    expect(captureLine(text, NOW)).toBe(line);
  });
});

describe('daily note paths', () => {
  it('follows the folder and Moment-style pattern', () => {
    expect(dailyPath(NOW, { folder: 'daily', pattern: 'YYYY-MM-DD' })).toBe('daily/2026-09-25.md');
    expect(dailyPath(NOW, { folder: '/Journal/', pattern: 'YYYY/MM/YYYY-MM-DD dddd' })).toBe('Journal/2026/09/2026-09-25 Friday.md');
    expect(dailyPath(NOW, { folder: '', pattern: '[Day] Do MMM YY' })).toBe('Day 25th Sep 26.md');
  });
});
