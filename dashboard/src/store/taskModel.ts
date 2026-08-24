import {
  addDays,
  format,
  isAfter,
  isBefore,
  isThisWeek,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
} from 'date-fns';
import { ArtifactType, TodoStatus, type Artifact, type TodoPriority } from '../types/artifacts';
import {
  TaskSortBy,
  type InboxArtifact,
  type InboxQueueEntry,
  type ParsedTaskInput,
  type Task,
  type TaskFilters,
  type TaskMetadata,
  type TaskStats,
  type TaskWithContext,
} from '../types/tasks';

export function isTask(artifact: Artifact): artifact is Artifact & { type: ArtifactType.TODO | ArtifactType.PROJECT } {
  return artifact.type === ArtifactType.TODO || artifact.type === ArtifactType.PROJECT;
}

export function isInboxArtifact(artifact: Artifact): artifact is InboxArtifact {
  return artifact.type === ArtifactType.INBOX;
}

interface TaskContextIndex {
  today: Date;
  byId: Map<string, Task>;
  childrenByParent: Map<string, Task[]>;
}

export function buildTaskContextIndex(allTasks: Task[], today = new Date()): TaskContextIndex {
  const byId = new Map<string, Task>();
  const childrenByParent = new Map<string, Task[]>();
  for (const task of allTasks) byId.set(task.id, task);
  for (const task of allTasks) {
    if (!task.parentId) continue;
    const siblings = childrenByParent.get(task.parentId);
    if (siblings) siblings.push(task);
    else childrenByParent.set(task.parentId, [task]);
  }
  for (const siblings of childrenByParent.values()) {
    siblings.sort((left, right) => left.created.localeCompare(right.created));
  }
  return { today: startOfDay(today), byId, childrenByParent };
}

export function addTaskContext(task: Task, index: TaskContextIndex): TaskWithContext {
  const { today, byId, childrenByParent } = index;
  const isOverdue = task.due
    ? isBefore(parseISO(task.due), today) && task.status !== 'done' && task.status !== 'cancelled'
    : false;
  const isDueToday = task.due ? isToday(parseISO(task.due)) : false;
  const isDueTomorrow = task.due ? isTomorrow(parseISO(task.due)) : false;
  const isDueThisWeek = task.due ? isThisWeek(parseISO(task.due)) : false;
  const isDeferred = task.deferDate ? isAfter(parseISO(task.deferDate), today) : false;
  const parent = task.parentId ? byId.get(task.parentId) : undefined;
  const children = childrenByParent.get(task.id) || [];
  let isAvailable = !isDeferred;
  if (parent?.sequential) {
    const siblings = childrenByParent.get(parent.id) || [];
    const taskIndex = siblings.findIndex((sibling) => sibling.id === task.id);
    if (taskIndex > 0) isAvailable = isAvailable && siblings[taskIndex - 1].status === 'done';
  }
  const projectPath: string[] = [];
  let currentParent = parent;
  while (currentParent) {
    projectPath.unshift(currentParent.title);
    currentParent = currentParent.parentId ? byId.get(currentParent.parentId) : undefined;
  }

  return {
    ...task,
    isOverdue,
    isDueToday,
    isDueTomorrow,
    isDueThisWeek,
    isDeferred,
    isAvailable,
    parent: parent ? { ...parent, content: undefined, filePath: '' } as TaskMetadata : undefined,
    children: children.map((child) => ({ ...child, content: undefined, filePath: '' } as TaskMetadata)),
    childrenComplete: children.filter((child) => child.status === 'done').length,
    childrenTotal: children.length,
    projectPath: projectPath.length > 0 ? projectPath : undefined,
  };
}

export function sortTasks(tasks: TaskWithContext[], sortBy: TaskSortBy): TaskWithContext[] {
  return [...tasks].sort((left, right) => {
    switch (sortBy) {
      case TaskSortBy.DUE_DATE: {
        if (!left.due && !right.due) return left.id.localeCompare(right.id);
        if (!left.due) return 1;
        if (!right.due) return -1;
        const comparison = left.due.localeCompare(right.due);
        return comparison || left.id.localeCompare(right.id);
      }
      case TaskSortBy.PRIORITY: {
        const priority = { high: 0, medium: 1, low: 2 };
        const comparison = (left.priority ? priority[left.priority] : 3)
          - (right.priority ? priority[right.priority] : 3);
        return comparison || left.id.localeCompare(right.id);
      }
      case TaskSortBy.FLAGGED:
        if (left.flagged !== right.flagged) return left.flagged ? -1 : 1;
        return left.id.localeCompare(right.id);
      case TaskSortBy.TITLE:
        return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
      case TaskSortBy.CREATED:
        return right.created.localeCompare(left.created) || left.id.localeCompare(right.id);
      case TaskSortBy.UPDATED:
        return right.updated.localeCompare(left.updated) || left.id.localeCompare(right.id);
    }
  });
}

export function sortInboxEntries(entries: InboxQueueEntry[], sortBy: TaskSortBy): InboxQueueEntry[] {
  const title = (entry: InboxQueueEntry) => entry.kind === 'task' ? entry.task.title : entry.artifact.title;
  const created = (entry: InboxQueueEntry) => entry.kind === 'task' ? entry.task.created : entry.artifact.created;
  const updated = (entry: InboxQueueEntry) => entry.kind === 'task' ? entry.task.updated : entry.artifact.updated;
  const flagged = (entry: InboxQueueEntry) => entry.kind === 'task' && Boolean(entry.task.flagged);
  const priority = (entry: InboxQueueEntry) => {
    if (entry.kind !== 'task' || !entry.task.priority) return 3;
    return { high: 0, medium: 1, low: 2 }[entry.task.priority];
  };
  return [...entries].sort((left, right) => {
    switch (sortBy) {
      case TaskSortBy.TITLE:
        return title(left).localeCompare(title(right)) || updated(right).localeCompare(updated(left));
      case TaskSortBy.CREATED:
        return created(right).localeCompare(created(left)) || title(left).localeCompare(title(right));
      case TaskSortBy.PRIORITY:
        return priority(left) - priority(right) || updated(right).localeCompare(updated(left));
      case TaskSortBy.FLAGGED:
        if (flagged(left) !== flagged(right)) return flagged(left) ? -1 : 1;
        return updated(right).localeCompare(updated(left));
      case TaskSortBy.UPDATED:
      case TaskSortBy.DUE_DATE:
        return updated(right).localeCompare(updated(left)) || title(left).localeCompare(title(right));
    }
  });
}

export function filterTasks(
  tasks: TaskWithContext[],
  filters: TaskFilters,
  showCompletedTasks: boolean,
): TaskWithContext[] {
  return tasks.filter((task) => {
    if (!showCompletedTasks && (task.status === 'done' || task.status === 'cancelled')) return false;
    if (filters.status && !filters.status.includes(task.status as TodoStatus)) return false;
    if (filters.priority && (!task.priority || !filters.priority.includes(task.priority))) return false;
    if (filters.flagged !== undefined && task.flagged !== filters.flagged) return false;
    if (filters.projectId && task.project !== filters.projectId && task.parentId !== filters.projectId) return false;
    if (filters.hasParent !== undefined && Boolean(task.parentId) !== filters.hasParent) return false;
    return true;
  });
}

export function computeTaskStats(tasks: TaskWithContext[]): TaskStats {
  const stats: TaskStats = {
    total: tasks.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0,
    flagged: 0,
    deferred: 0,
    withSubtasks: 0,
    completionRate: 0,
  };
  for (const task of tasks) {
    if (task.status === 'pending') stats.pending += 1;
    else if (task.status === 'in-progress') stats.inProgress += 1;
    else if (task.status === 'done') stats.completed += 1;
    if (task.isOverdue) stats.overdue += 1;
    if (task.isDueToday) stats.dueToday += 1;
    if (task.isDueThisWeek) stats.dueThisWeek += 1;
    if (task.flagged) stats.flagged += 1;
    if (task.isDeferred) stats.deferred += 1;
    if (task.childrenTotal > 0) stats.withSubtasks += 1;
  }
  stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  return stats;
}

export function getCompletionUpdates(task: Pick<Task, 'status'>, completedDate: string): Partial<Task> {
  const status = task.status === TodoStatus.DONE ? TodoStatus.PENDING : TodoStatus.DONE;
  return { status, completedDate: status === TodoStatus.DONE ? completedDate : undefined };
}

export function parseNaturalLanguage(input: string, today = new Date()): ParsedTaskInput {
  const result: ParsedTaskInput = { title: input, tags: [], flagged: false };
  const tagMatches = input.match(/#[\w-]+/g);
  if (tagMatches) {
    result.tags = tagMatches.map((tag) => tag.slice(1));
    result.title = input.replace(/#[\w-]+/g, '').trim();
  }
  const priorityMatch = input.match(/!(high|medium|low)/i);
  if (priorityMatch) {
    result.priority = priorityMatch[1].toLowerCase() as TodoPriority;
    result.title = result.title.replace(/!(high|medium|low)/gi, '').trim();
  } else if (input.includes('!')) {
    result.flagged = true;
    result.title = result.title.replace(/!/g, '').trim();
  }
  const dueDatePatterns = [
    { pattern: /\btoday\b/i, date: format(today, 'yyyy-MM-dd') },
    { pattern: /\btomorrow\b/i, date: format(addDays(today, 1), 'yyyy-MM-dd') },
    { pattern: /\bnext week\b/i, date: format(addDays(today, 7), 'yyyy-MM-dd') },
    { pattern: /\bin (\d+) days?\b/i, daysOffset: true },
  ];
  for (const { pattern, date, daysOffset } of dueDatePatterns) {
    const match = result.title.match(pattern);
    if (!match) continue;
    result.due = daysOffset && match[1]
      ? format(addDays(today, Number.parseInt(match[1], 10)), 'yyyy-MM-dd')
      : date;
    result.title = result.title.replace(pattern, '').trim();
    break;
  }
  return result;
}
