import type { Task } from './parse';

export { extractTasks, fileTask, parseTaskLine, PRIORITY_RANK } from './parse';
export type { Priority, Task, TaskDateField, TaskStatus } from './parse';
export { appendLine, setTaskDate, setTaskText, toggleTaskLine } from './edit';

/** Where a task stands on `today`: late, today (due, scheduled, or starting today), or neither. */
export function todayBucket(task: Task, today: string): 'overdue' | 'today' | null {
  if (task.status !== 'open') return null;
  if (task.due && task.due < today) return 'overdue';
  if (task.due === today || (task.scheduled && task.scheduled <= today) || task.start === today) return 'today';
  return null;
}
