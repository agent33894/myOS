/** Expand `{{title}}`, `{{date}}`, and `{{time}}`; other braces stay as written. */
export function expandTemplate(body: string, values: { title: string; date: string; time: string }): string {
  return body.replace(/\{\{\s*(title|date|time)\s*\}\}/g, (_, key: keyof typeof values) => values[key]);
}

/** Headings only: templates never put placeholder text into someone's page. */
export const STARTER_TEMPLATES: ReadonlyArray<{ id: string; title: string; content: string }> = [
  { id: 'meeting-notes', title: 'Meeting notes', content: '## Attendees\n\n## Agenda\n\n## Notes\n\n## Decisions\n\n## Next steps' },
  { id: 'lecture-notes', title: 'Lecture notes', content: '## Key ideas\n\n## Notes\n\n## Questions\n\n## Summary' },
  { id: 'weekly-plan', title: 'Weekly plan', content: '## Week of {{date}}\n\n## Priorities\n\n## Schedule\n\n## Notes' },
  { id: 'project-brief', title: 'Project brief', content: '## Goal\n\n## Why it matters\n\n## Scope\n\n## Milestones\n\n## Open questions' },
];
