import { checkEntries, type CheckEntry } from '@shared/checklist';
import { ArtifactType, type ArtifactSummary } from '@shared/types';

const OPEN_EXCLUDED = new Set<string>(['done', 'cancelled']);
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Dates arrive as bare YYYY-MM-DD or full ISO strings; compare date-only. */
function dateOnly(value?: string | null): string | null {
  if (!value) return null;
  const stamp = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(stamp) ? stamp : null;
}

/** `project:` matches title or id; `related:` links count in either direction. */
function belongsTo(item: ArtifactSummary, project: ArtifactSummary): boolean {
  if (item.type === ArtifactType.PROJECT || item.id === project.id) return false;
  if (item.project && (item.project === project.title || item.project === project.id)) return true;
  return (item.related ?? []).includes(project.id) || (project.related ?? []).includes(item.id);
}

export interface ProjectWithStats extends ArtifactSummary {
  /** Open tasks: overdue first, then by due date, priority, and title. */
  openTodos: ArtifactSummary[];
  /** Completed tasks, most recent first. */
  doneTodos: ArtifactSummary[];
  /** Everything else that belongs to the project, most recently edited first. */
  materials: ArtifactSummary[];
  /** Open checklist lines in the project's notes ("From notes"). */
  checks: CheckEntry[];
  todoProgress?: { total: number; done: number; percentage: number };
  /** Earliest due date, today or later, among open tasks. */
  nextDue?: string;
  overdueCount: number;
  lastActivity?: string;
}

function withStats(project: ArtifactSummary, items: ArtifactSummary[], today: string): ProjectWithStats {
  const todos = items.filter((item) => item.type === ArtifactType.TODO);
  const isOverdue = (task: ArtifactSummary) => (dateOnly(task.due) ?? '9999') < today;

  const openTodos = todos
    .filter((task) => !OPEN_EXCLUDED.has(task.status))
    .sort(
      (a, b) =>
        Number(isOverdue(b)) - Number(isOverdue(a)) ||
        (dateOnly(a.due) ?? '9999').localeCompare(dateOnly(b.due) ?? '9999') ||
        (PRIORITY_RANK[String(a.priority)] ?? 3) - (PRIORITY_RANK[String(b.priority)] ?? 3) ||
        a.title.localeCompare(b.title),
    );
  const doneTodos = todos
    .filter((task) => task.status === 'done')
    .sort((a, b) =>
      (dateOnly(b.completedDate) ?? dateOnly(b.updated) ?? '').localeCompare(
        dateOnly(a.completedDate) ?? dateOnly(a.updated) ?? '',
      ),
    );

  // Cancelled tasks leave the ledger entirely: not open, not part of progress.
  const total = openTodos.length + doneTodos.length;
  const nextDue = openTodos
    .map((task) => dateOnly(task.due))
    .filter((due): due is string => due !== null && due >= today)
    .sort()[0];
  const lastActivity = [project.updated, ...items.map((item) => item.updated)]
    .map(dateOnly)
    .filter((stamp): stamp is string => stamp !== null)
    .sort()
    .at(-1);

  const materials = items
    .filter((item) => item.type !== ArtifactType.TODO)
    .sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''));

  return {
    ...project,
    openTodos,
    doneTodos,
    materials,
    checks: checkEntries(materials).filter((check) => !check.done),
    todoProgress: total > 0 ? { total, done: doneTodos.length, percentage: Math.round((doneTodos.length / total) * 100) } : undefined,
    nextDue,
    overdueCount: openTodos.filter(isOverdue).length,
    lastActivity,
  };
}

/** Every project with its tasks and notes. */
export function projectsWithStats(artifacts: readonly ArtifactSummary[], today: string): ProjectWithStats[] {
  return artifacts
    .filter((artifact) => artifact.type === ArtifactType.PROJECT)
    .map((project) => withStats(project, artifacts.filter((item) => belongsTo(item, project)), today));
}
