import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { formatLocalDate } from '../../shared/date';
import { canonicalPath, defaultStatusFor, domainFor } from '../../shared/spec';
import { STARTER_TEMPLATES } from '../../shared/templates';
import { ArtifactType, type ArtifactFields } from '../../shared/types';
import { serializeDocument } from '../documents/markdown';

type StarterFile = Pick<ArtifactFields, 'id' | 'title' | 'type'> & Partial<ArtifactFields> & { content?: string };

const PROJECT_ID = 'getting-started';

interface Keys {
  capture: string;
  newNote: string;
  search: string;
}

/** A tiny, useful first workspace: one project with three tasks, a welcome note, two captures to sort, and the starter templates. */
function starterFiles(today: string, keys: Keys): StarterFile[] {
  return [
    {
      id: PROJECT_ID,
      title: 'Getting started',
      type: ArtifactType.PROJECT,
      swatch: 'sage',
      pinned: true,
      order: 1,
      content: 'A few small steps to learn your way around. Check them off as you go, then archive this project.',
    },
    {
      id: 'capture-your-first-thought',
      title: `Capture your first thought — press ${keys.capture}`,
      type: ArtifactType.TODO,
      project: PROJECT_ID,
      due: today,
      content: 'Quick Capture works from anywhere in myOS. Type, press Return, and it lands in your Inbox.',
    },
    {
      id: 'plan-your-day-in-today',
      title: 'Plan your day in Today',
      type: ArtifactType.TODO,
      project: PROJECT_ID,
      flagged: true,
      content: 'Today gathers what is carried over, due or planned today, flagged, or in progress, so you only look in one place.',
    },
    {
      id: 'write-a-note',
      title: `Write a note — press ${keys.newNote}`,
      type: ArtifactType.TODO,
      project: PROJECT_ID,
    },
    {
      id: 'welcome-to-myos',
      title: 'Welcome to myOS',
      type: ArtifactType.MEMO,
      content: [
        'myOS is a calm home for your notes, tasks, and projects. Here is how it fits together.',
        '## Six places',
        `- **Inbox** holds quick captures until you sort them. Press ${keys.capture} anywhere to capture a thought.`,
        '- **Today** shows what needs you now: carried over, due or planned today, flagged, and in progress.',
        '- **Tasks** keeps everything without a date, later tasks, and anything parked for Someday.',
        `- **Notes** is every page of writing. Press ${keys.newNote} for a new one.`,
        '- **Journal** has a page for each day, there when you want to write.',
        '- **Projects** gather related tasks and notes in one place.',
        'When you want them, **Plan my day** and **Close the day** sit at the top of Today. Neither starts on its own.',
        '## Capture shortcuts',
        'While capturing, you can add details inline:',
        '- `tomorrow`, `fri`, or `next week` sets a date',
        '- `every tue` or `every month on 15` makes it repeat',
        '- `~30m` adds an estimate',
        '- `#tag` adds a tag',
        '- `@project` files it into a project',
        '- `!` flags it',
        'Anything with a date, flag, or project becomes a task. Everything else waits in the Inbox.',
        '## Your files',
        `Everything here is a plain Markdown file in this folder. Open it in any editor, back it up, or sync it however you like. Press ${keys.search} to search everything.`,
      ].join('\n\n'),
    },
    {
      id: 'sort-me-into-a-task',
      title: 'Sort me into a task — open Inbox and press T',
      type: ArtifactType.INBOX,
    },
    {
      id: 'turn-me-into-a-note',
      title: 'Or turn me into a note — press N',
      type: ArtifactType.INBOX,
    },
    ...STARTER_TEMPLATES.map((template) => ({ ...template, type: ArtifactType.TEMPLATE })),
  ];
}

/** Write the starter files into `root`. Paths come from the spec, like every other new file. */
export function writeStarterContent(root: string, now = new Date()): void {
  const today = formatLocalDate(now);
  const keys: Keys =
    process.platform === 'darwin'
      ? { capture: '⌘N', newNote: '⌘⇧N', search: '⌘K' }
      : { capture: 'Ctrl+N', newNote: 'Ctrl+Shift+N', search: 'Ctrl+K' };
  for (const { content = '', ...fields } of starterFiles(today, keys)) {
    const domain = domainFor(fields.type);
    const artifact = {
      tags: [],
      related: [],
      status: defaultStatusFor(fields.type),
      ...fields,
      domain,
      created: today,
      updated: now.toISOString(),
      extra: {},
      content,
    };
    const absolute = join(root, canonicalPath(fields.id, fields.type, domain));
    mkdirSync(dirname(absolute), { recursive: true });
    // `wx`: never replace a file the user already has at that path.
    try {
      writeFileSync(absolute, serializeDocument(artifact), { encoding: 'utf8', flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
}
