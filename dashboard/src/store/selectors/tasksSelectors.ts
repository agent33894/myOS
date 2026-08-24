import { useShallow } from 'zustand/react/shallow';
import { useTasksStore, type TasksState } from '../tasks';

// ============ TASKS STORE SELECTORS ============

export const useTaskCrudActions = () =>
  useTasksStore(
    useShallow((state: TasksState) => ({
      toggleComplete: state.toggleComplete,
      toggleFlag: state.toggleFlag,
      updateTask: state.updateTask,
      createTask: state.createTask,
      deleteTask: state.deleteTask,
      completeMultiple: state.completeMultiple,
      flagMultiple: state.flagMultiple,
    }))
  );
