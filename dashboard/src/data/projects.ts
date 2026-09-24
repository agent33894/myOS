import { PROJECT_CLOSED_STATUSES } from '@shared/spec';
import { ArtifactType, type ArtifactSummary } from '@shared/types';

type ProjectHealth = 'active' | 'at-risk' | 'dormant';


const DORMANT_AFTER_DAYS = 30;
const OPEN_EXCLUDED = new Set<string>(['done', 'cancelled']);
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Material groups ordered by how often they matter to project work. */
const MATERIAL_TYPE_ORDER: ArtifactType[] = [
  ArtifactType.DECISION,
  ArtifactType.MEMO,
  ArtifactType.MEETING,
  ArtifactType.RESEARCH,
  ArtifactType.SNIPPET,
  ArtifactType.QUERY,
  ArtifactType.PROMPT,
  ArtifactType.DEVELOPMENT,
  ArtifactType.INBOX,
];

/** Vault dates arrive as bare YYYY-MM-DD or full ISO strings; compare date-only. */
export function dateOnly(value?: string | null): string | null {
  if (!value) return null;
  const stamp = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(stamp) ? stamp : null;
}

type ProjectLike = Pick<ArtifactSummary, 'id' | 'title' | 'related' | 'updated' | 'created'> & {
  status?: ArtifactSummary['status'];
};

/** `project:` matches title or id; `related:` links count in either direction. */
function isLinkedToProject(artifact: ArtifactSummary, project: ProjectLike): boolean {
  if (artifact.type === ArtifactType.PROJECT || artifact.id === project.id) return false;
  if (artifact.project && (artifact.project === project.title || artifact.project === project.id)) {
    return true;
  }
  if ((artifact.related ?? []).includes(project.id)) return true;
  return (project.related ?? []).includes(artifact.id);
}

interface ProjectStats {
  openTodos: ArtifactSummary[];
  doneTodos: ArtifactSummary[];
  materials: ArtifactSummary[];
  materialsByType: Array<{ type: ArtifactType; items: ArtifactSummary[] }>;
  todoProgress?: { total: number; done: number; percentage: number };
  /** Earliest upcoming (today or later) due date among open todos. */
  nextDue?: string;
  overdueCount: number;
  flaggedCount: number;
  health: ProjectHealth;
  isClosed: boolean;
  lastActivity?: string;
  /** Whole days since the newest activity stamp; undefined when nothing is dated. */
  idleDays?: number;
}

function daysBetween(fromStamp: string, toStamp: string): number {
  const from = new Date(`${fromStamp}T00:00:00`).getTime();
  const to = new Date(`${toStamp}T00:00:00`).getTime();
  return Math.floor((to - from) / 86_400_000);
}

function computeProjectStats(
  project: ProjectLike,
  linked: ArtifactSummary[],
  todayStamp: string,
): ProjectStats {
  const todos = linked.filter((a) => a.type === ArtifactType.TODO);
  const isOverdue = (t: ArtifactSummary) => {
    const due = dateOnly(t.due);
    return due !== null && due < todayStamp;
  };

  const openTodos = todos
    .filter((t) => !OPEN_EXCLUDED.has(String(t.status)))
    .sort(
      (a, b) =>
        Number(isOverdue(b)) - Number(isOverdue(a)) ||
        (dateOnly(a.due) ?? '9999').localeCompare(dateOnly(b.due) ?? '9999') ||
        (PRIORITY_RANK[String(a.priority)] ?? 3) - (PRIORITY_RANK[String(b.priority)] ?? 3) ||
        a.title.localeCompare(b.title),
    );
  const doneTodos = todos
    .filter((t) => String(t.status) === 'done')
    .sort((a, b) =>
      (dateOnly(b.completedDate) ?? dateOnly(b.updated) ?? '').localeCompare(
        dateOnly(a.completedDate) ?? dateOnly(a.updated) ?? '',
      ),
    );

  // Cancelled tasks leave the ledger entirely: not open, not part of progress.
  const total = openTodos.length + doneTodos.length;
  const todoProgress =
    total > 0
      ? { total, done: doneTodos.length, percentage: Math.round((doneTodos.length / total) * 100) }
      : undefined;

  const materials = [...linked]
    .filter((a) => a.type !== ArtifactType.TODO)
    .sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''));
  const materialsByType = MATERIAL_TYPE_ORDER.map((type) => ({
    type,
    items: materials.filter((a) => a.type === type),
  })).filter((group) => group.items.length > 0);

  const overdueCount = openTodos.filter(isOverdue).length;
  const flaggedCount = openTodos.filter((t) => t.flagged === true).length;
  const upcomingDues = openTodos
    .map((t) => dateOnly(t.due))
    .filter((d): d is string => d !== null && d >= todayStamp);
  const nextDue = upcomingDues.length > 0 ? upcomingDues.sort()[0] : undefined;

  const activityStamps = [project.updated, ...linked.map((a) => a.updated)]
    .map(dateOnly)
    .filter((d): d is string => d !== null);
  const lastActivity = activityStamps.length > 0 ? activityStamps.sort().reverse()[0] : undefined;

  const isClosed = PROJECT_CLOSED_STATUSES.has(String(project.status));

  // Legacy project `due` frontmatter is preserved on disk but is not a
  // supported project concept: it neither displays nor feeds risk.
  const idleDays = lastActivity !== undefined ? daysBetween(lastActivity, todayStamp) : undefined;
  const atRisk = openTodos.some((t) => t.priority === 'high' || isOverdue(t));
  const dormant = !atRisk && idleDays !== undefined && idleDays > DORMANT_AFTER_DAYS;

  return {
    openTodos,
    doneTodos,
    materials,
    materialsByType,
    todoProgress,
    nextDue,
    overdueCount,
    flaggedCount,
    health: atRisk ? 'at-risk' : dormant ? 'dormant' : 'active',
    isClosed,
    lastActivity,
    idleDays,
  };
}

export interface ProjectWithStats extends ArtifactSummary, ProjectStats {
  linkedArtifacts: ArtifactSummary[];
}

/** Every project with its linked items and task ledger. */
export function projectsWithStats(artifacts: readonly ArtifactSummary[], todayStamp: string): ProjectWithStats[] {
  return artifacts
    .filter((artifact) => artifact.type === ArtifactType.PROJECT)
    .map((project) => {
      const linkedArtifacts = artifacts.filter((artifact) => isLinkedToProject(artifact, project));
      return { ...project, linkedArtifacts, ...computeProjectStats(project, linkedArtifacts, todayStamp) };
    });
}
