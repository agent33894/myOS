import type { ArtifactSummary } from '@shared/types';
import { dateOnly } from '../../data/projects';
import { getTypeLabel } from '../../utils/typeIcons';

interface ActivityEntry {
  /** Date-only stamp; undated events are dropped from the ledger. */
  date: string;
  /** Mono garnish naming the event, e.g. "Task · completed", "Memo · filed". */
  garnish: string;
  title: string;
  /** Set for task and material entries so the row can open the artifact. */
  artifact?: ArtifactSummary;
}

/** What the ledger needs from ProjectWithStats; kept minimal so tests stay light. */
interface ActivitySource {
  created?: string;
  doneTodos: ArtifactSummary[];
  materials: ArtifactSummary[];
}

/** Same-day events order: finished work, then materials, then the project's own birth. */
const rankOf = (garnish: string) =>
  garnish === 'Task · completed' ? 0 : garnish === 'Project · created' ? 2 : 1;

/**
 * The project's recent history derived from real stamps only — completed
 * tasks, materials filed or edited, and the project's creation. Newest first,
 * capped so the rail stays a glance, not an archive.
 */
export function deriveActivity(project: ActivitySource, cap = 8): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const task of project.doneTodos) {
    const date = dateOnly(task.completedDate) ?? dateOnly(task.updated);
    if (date) entries.push({ date, garnish: 'Task · completed', title: task.title, artifact: task });
  }

  for (const material of project.materials) {
    const date = dateOnly(material.updated) ?? dateOnly(material.created);
    if (!date) continue;
    const isFiling = dateOnly(material.created) === date;
    entries.push({
      date,
      garnish: `${getTypeLabel(material.type)} · ${isFiling ? 'filed' : 'edited'}`,
      title: material.title,
      artifact: material,
    });
  }

  const created = dateOnly(project.created);
  if (created) entries.push({ date: created, garnish: 'Project · created', title: 'Filed to the vault' });

  return entries
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        rankOf(a.garnish) - rankOf(b.garnish) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, cap);
}
