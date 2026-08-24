import { create } from 'zustand';
import {
  TaskPerspective,
  TaskGroupBy,
  TaskSortBy,
} from '../types/tasks';
import type {
  Task,
  TaskMetadata,
  TaskWithContext,
  InboxQueueEntry,
  ForecastItem,
  TaskFilters,
  TaskStats,
  ParsedTaskInput,
} from '../types/tasks';
import { ArtifactType, TodoStatus, Domain } from '../types/artifacts';
import type { Artifact } from '../types/artifacts';
import { useArtifactsStore } from './artifacts';
import { createArtifact, updateArtifact, deleteArtifact } from '@/gateways/artifactsGateway';
import { useSettingsStore } from './settings';
import { parseISO, addDays, format, isToday } from 'date-fns';
import { getCurrentDateString } from '../utils/dateHelpers';
import { computeArtifactFilePath } from '../utils/artifactPaths';
import {
  addTaskContext,
  buildTaskContextIndex,
  computeTaskStats,
  filterTasks,
  getCompletionUpdates,
  isInboxArtifact,
  isTask,
  parseNaturalLanguage,
  sortInboxEntries,
  sortTasks,
} from './taskModel';

export interface TasksState {
  // Current view state
  currentPerspective: TaskPerspective;
  groupBy: TaskGroupBy;
  sortBy: TaskSortBy;
  filters: TaskFilters;
  selectedTaskId: string | null;

  // Computed task lists
  inboxTasks: TaskWithContext[];
  inboxEntries: InboxQueueEntry[];
  todayTasks: TaskWithContext[];
  forecastItems: ForecastItem[];
  projectTasks: TaskWithContext[];
  allTasks: TaskWithContext[];

  // Statistics
  stats: TaskStats;

  // Actions
  setPerspective: (perspective: TaskPerspective) => void;
  setGroupBy: (groupBy: TaskGroupBy) => void;
  setSortBy: (sortBy: TaskSortBy) => void;
  setFilters: (filters: TaskFilters) => void;
  setSelectedTask: (taskId: string | null) => void;

  // Task operations
  toggleComplete: (taskId: string) => Promise<void>;
  toggleFlag: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Batch operations
  completeMultiple: (taskIds: string[]) => Promise<void>;
  flagMultiple: (taskIds: string[]) => Promise<void>;

  // Utility
  refreshTasks: () => void;
  getTaskById: (taskId: string) => TaskWithContext | undefined;
  getTaskChildren: (taskId: string) => TaskWithContext[];
  getTaskPath: (taskId: string) => string[];
  getTaskParentChain: (taskId: string) => TaskMetadata[];
  parseNaturalLanguage: (input: string) => ParsedTaskInput;
}


export const useTasksStore = create<TasksState>((set, get) => ({
  // Initial state
  currentPerspective: TaskPerspective.INBOX,
  groupBy: TaskGroupBy.NONE,
  sortBy: TaskSortBy.DUE_DATE,
  filters: {},
  selectedTaskId: null,
  inboxTasks: [],
  inboxEntries: [],
  todayTasks: [],
  forecastItems: [],
  projectTasks: [],
  allTasks: [],
  stats: {
    total: 0,
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
  },

  // Actions
  setPerspective: (perspective) => {
    set({ currentPerspective: perspective });
  },

  setGroupBy: (groupBy) => {
    set({ groupBy });
  },

  setSortBy: (sortBy) => {
    set({ sortBy });
    get().refreshTasks();
  },

  setFilters: (filters) => {
    set({ filters });
    get().refreshTasks();
  },

  setSelectedTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  toggleComplete: async (taskId) => {
    const task = get().getTaskById(taskId);
    if (!task) return;

    await get().updateTask(taskId, getCompletionUpdates(task, getCurrentDateString()));
  },

  toggleFlag: async (taskId) => {
    const task = get().getTaskById(taskId);
    if (!task) return;

    await get().updateTask(taskId, { flagged: !task.flagged });
  },

  updateTask: async (taskId, updates) => {
    const artifactsStore = useArtifactsStore.getState();
    const task = artifactsStore.artifacts.find(a => a.id === taskId);
    if (!task) return;

    const hasFilePath = !!(task.filePath && task.filePath.trim() !== '');
    const taskFilePath = hasFilePath
      ? task.filePath
      : computeArtifactFilePath({
          id: task.id,
          type: task.type as ArtifactType,
          domain: task.domain || Domain.WORK,
        });

    const updatedTask = {
      ...task,
      ...updates,
      updated: getCurrentDateString(),
      filePath: taskFilePath,
    };

    const persistedTask = await updateArtifact(taskFilePath, updatedTask);
    if (hasFilePath) {
      artifactsStore.updateArtifact(persistedTask);
    } else {
      artifactsStore.setArtifacts(
        artifactsStore.artifacts.map((artifact) =>
          artifact.id === taskId ? persistedTask : artifact
        )
      );
    }
    get().refreshTasks();
  },

  createTask: async (taskData) => {
    const artifactsStore = useArtifactsStore.getState();
    const type = taskData.type || ArtifactType.TODO;

    const created = await createArtifact({
      title: taskData.title || 'Untitled Task',
      type,
      domain: taskData.domain || Domain.WORK,
      tags: taskData.tags,
      status: taskData.status || TodoStatus.PENDING,
      related: taskData.related,
      content: taskData.content,
      project: taskData.project,
      priority: taskData.priority,
      due: taskData.due,
      parentId: taskData.parentId,
      deferDate: taskData.deferDate,
      estimatedMinutes: taskData.estimatedMinutes,
      sequential: taskData.sequential,
      flagged: taskData.flagged,
      completedDate: taskData.completedDate,
      repeatRule: taskData.repeatRule,
    });

    artifactsStore.addArtifact(created);
    get().refreshTasks();
  },

  deleteTask: async (taskId) => {
    const artifactsStore = useArtifactsStore.getState();
    const task = artifactsStore.artifacts.find(a => a.id === taskId);
    if (!task) return;

    const hasFilePath = !!(task.filePath && task.filePath.trim() !== '');
    const taskFilePath = hasFilePath
      ? task.filePath
      : computeArtifactFilePath({
          id: task.id,
          type: task.type as ArtifactType,
          domain: task.domain || Domain.WORK,
        });

    await deleteArtifact(taskFilePath);
    if (hasFilePath) {
      artifactsStore.removeArtifact(taskFilePath);
    } else {
      artifactsStore.setArtifacts(
        artifactsStore.artifacts.filter((artifact) => artifact.id !== taskId)
      );
    }
    get().refreshTasks();
  },

  completeMultiple: async (taskIds) => {
    await Promise.all(taskIds.map(id => get().toggleComplete(id)));
  },

  flagMultiple: async (taskIds) => {
    await Promise.all(taskIds.map(id => get().toggleFlag(id)));
  },

  refreshTasks: () => {
    const artifactsStore = useArtifactsStore.getState();
    const { showCompletedTasks } = useSettingsStore.getState();
    const allArtifacts = artifactsStore.artifacts;
    const tasks = allArtifacts.filter(isTask);

    // Add context to all tasks
    const contextIndex = buildTaskContextIndex(tasks);
    const tasksWithContext = tasks.map(task => addTaskContext(task, contextIndex));
    const { sortBy, filters } = get();

    // Apply filters
    const filteredTasks = filterTasks(tasksWithContext, filters, showCompletedTasks);

    // Compute perspectives
    const inboxTasks = sortTasks(
      filteredTasks.filter(t =>
        t.status === 'pending' &&
        !t.parentId &&
        !t.due &&
        !t.project &&
        !t.tags.includes('daily-log')
      ),
      sortBy
    );

    const todayTasks = sortTasks(
      filteredTasks.filter(t =>
        t.status !== 'done' &&
        t.status !== 'cancelled' &&
        !t.tags.includes('daily-log') &&
        (
          t.isDueToday ||
          t.flagged ||
          (t.deferDate && isToday(parseISO(t.deferDate))) ||
          (t.type === 'todo' && t.isAvailable && (!t.parentId || t.parent?.type === 'project'))
        )
      ),
      sortBy
    );

    const projectTasks = sortTasks(
      filteredTasks.filter(t => t.type === 'project'),
      sortBy
    );

    const inboxArtifacts = allArtifacts
      .filter(isInboxArtifact)
      .filter(
        artifact =>
          artifact.status !== 'archived' &&
          artifact.status !== 'cancelled' &&
          artifact.status !== 'done'
      );

    const inboxEntries = sortInboxEntries(
      [
        ...inboxTasks.map((task) => ({ kind: 'task', task }) as const),
        ...inboxArtifacts.map((artifact) => ({ kind: 'artifact', artifact }) as const),
      ],
      sortBy
    );

    // Build forecast (next 14 days)
    const forecastItems: ForecastItem[] = [];
    const today = new Date();
    const dueTasksByDate = new Map<string, TaskWithContext[]>();
    for (const task of filteredTasks) {
      if (!task.due || task.status === 'done' || task.status === 'cancelled' || task.tags.includes('daily-log')) {
        continue;
      }
      const group = dueTasksByDate.get(task.due);
      if (group) group.push(task);
      else dueTasksByDate.set(task.due, [task]);
    }
    for (let i = 0; i < 14; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      // Add date header
      forecastItems.push({
        type: 'date-header',
        date: dateStr,
        label: format(date, 'EEEE, MMMM d'),
        isToday: i === 0,
      });

      (dueTasksByDate.get(dateStr) || []).forEach(task => {
        forecastItems.push({
          type: 'task',
          date: dateStr,
          task,
        });
      });
    }

    const stats = computeTaskStats(tasksWithContext);

    set({
      allTasks: sortTasks(filteredTasks, sortBy),
      inboxTasks,
      inboxEntries,
      todayTasks,
      forecastItems,
      projectTasks,
      stats,
    });
  },

  getTaskById: (taskId) => {
    return get().allTasks.find(t => t.id === taskId);
  },

  getTaskChildren: (taskId) => {
    return get().allTasks.filter(t => t.parentId === taskId);
  },

  getTaskPath: (taskId) => {
    const task = get().getTaskById(taskId);
    return task?.projectPath || [];
  },

  getTaskParentChain: (taskId) => {
    const chain: TaskMetadata[] = [];
    let currentTask = get().getTaskById(taskId);

    while (currentTask?.parentId) {
      const parent = get().getTaskById(currentTask.parentId);
      if (!parent) break;

      // Add parent to the beginning of the chain (exclude only content)
      const { content: _content, ...metadata } = parent;
      chain.unshift(metadata as TaskMetadata);

      currentTask = parent;
    }

    return chain;
  },

  parseNaturalLanguage,
}));

// Subscribe to artifacts store changes - ONLY refresh when artifacts array changes
// This prevents cascading refreshes when filters, sort, or search change
let lastTasksArtifactsRef: Artifact[] | null = null;
let lastTaskSlice: Artifact[] = [];

function taskRelevantSlice(artifacts: Artifact[]): Artifact[] {
  return artifacts.filter((artifact) => isTask(artifact) || isInboxArtifact(artifact));
}

function isSameSlice(previous: Artifact[], next: Artifact[]): boolean {
  if (previous.length !== next.length) return false;
  for (let i = 0; i < previous.length; i++) {
    if (previous[i] !== next[i]) return false;
  }
  return true;
}

useArtifactsStore.subscribe((state) => {
  // Only trigger refresh when the artifacts array reference actually changes
  // Filter changes, sort changes, and search changes don't need to trigger task refresh
  if (state.artifacts !== lastTasksArtifactsRef) {
    lastTasksArtifactsRef = state.artifacts;
    // Unchanged artifacts keep their references across store writes, so an
    // element-wise slice comparison detects edits that can't affect tasks.
    const slice = taskRelevantSlice(state.artifacts);
    if (isSameSlice(lastTaskSlice, slice)) return;
    lastTaskSlice = slice;
    useTasksStore.getState().refreshTasks();
  }
});

let lastShowCompletedTasks: boolean | null = null;

useSettingsStore.subscribe((state) => {
  if (state.showCompletedTasks !== lastShowCompletedTasks) {
    lastShowCompletedTasks = state.showCompletedTasks;
    useTasksStore.getState().refreshTasks();
  }
});
