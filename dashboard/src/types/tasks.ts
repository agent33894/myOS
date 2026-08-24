import type { Artifact, TodoStatus, TodoPriority, ArtifactType } from './artifacts';

// Task is an Artifact of type 'todo' or 'project'
export type Task = Omit<Artifact, 'type'> & {
  type: ArtifactType.TODO | ArtifactType.PROJECT;
};

export type InboxArtifact = Omit<Artifact, 'type'> & {
  type: ArtifactType.INBOX;
};

export type TaskMetadata = Omit<Task, 'content'>;

// Perspective types for organizing tasks
export enum TaskPerspective {
  INBOX = 'inbox',
  TODAY = 'today',
  FORECAST = 'forecast',
  PROJECTS = 'projects',
}

// Group tasks by different criteria
export enum TaskGroupBy {
  NONE = 'none',
  PROJECT = 'project',
  TAG = 'tag',
}

// Sort options specific to tasks
export enum TaskSortBy {
  DUE_DATE = 'due-date',
  CREATED = 'created',
  UPDATED = 'updated',
  PRIORITY = 'priority',
  TITLE = 'title',
  FLAGGED = 'flagged',
}

// Task with computed fields for UI
export interface TaskWithContext extends Task {
  // Computed fields
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
  isDueThisWeek: boolean;
  isDeferred: boolean;
  isAvailable: boolean; // Not deferred and parent is complete (if sequential)

  // Relationship info
  parent?: TaskMetadata;
  children: TaskMetadata[];
  childrenComplete: number;
  childrenTotal: number;

  // Context from projects
  projectPath?: string[]; // Array of project titles leading to this task
}

export type InboxQueueEntry =
  | {
      kind: 'task';
      task: TaskWithContext;
    }
  | {
      kind: 'artifact';
      artifact: InboxArtifact;
    };

// Forecast item (can be a task or just a date marker)
export interface ForecastItem {
  type: 'task' | 'date-header';
  date: string; // YYYY-MM-DD
  task?: TaskWithContext;
  label?: string; // For date headers
  isToday?: boolean;
}

// Filter options specific to tasks
export interface TaskFilters {
  status?: TodoStatus[];
  priority?: TodoPriority[];
  flagged?: boolean;
  hasParent?: boolean; // Show only root tasks or subtasks
  projectId?: string;
  tags?: string[];
  dueDateRange?: {
    start?: string;
    end?: string;
  };
  deferDateRange?: {
    start?: string;
    end?: string;
  };
}

// Task statistics for analytics
export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  flagged: number;
  deferred: number;
  withSubtasks: number;
  completionRate: number; // Percentage
}

// Natural language parsing results
export interface ParsedTaskInput {
  title: string;
  due?: string; // YYYY-MM-DD
  deferDate?: string; // YYYY-MM-DD
  priority?: TodoPriority;
  tags: string[];
  flagged: boolean;
  project?: string;
}
