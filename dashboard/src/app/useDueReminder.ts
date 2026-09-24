import { useEffect } from 'react';
import { formatLocalDate } from '@shared/date';
import { invoke } from '../data/ipc';
import { useDataStore } from '../data/store';
import { useToday } from '../data/selectors';
import { useSettingsStore } from '../store/settings';

const LAST_SHOWN_KEY = 'myos-reminder-day';

/** "3 tasks due today" or "1 task overdue and 2 due today". */
function reminderText(overdue: number, dueToday: number): string | null {
  const tasks = (count: number) => `${count} ${count === 1 ? 'task' : 'tasks'}`;
  if (overdue && dueToday) return `${tasks(overdue)} overdue and ${dueToday} due today`;
  if (overdue) return `${tasks(overdue)} overdue`;
  if (dueToday) return `${tasks(dueToday)} due today`;
  return null;
}

/**
 * With reminders on, one desktop notification per day, at start or the first
 * time the window is focused that day, when tasks are due today or overdue.
 */
export function useDueReminder(): void {
  const enabled = useSettingsStore((state) => state.remindDueToday);
  const { overdue, today } = useToday();
  const ready = useDataStore((state) => state.status === 'ready');

  useEffect(() => {
    if (!enabled || !ready) return;
    const check = () => {
      const day = formatLocalDate();
      if (localStorage.getItem(LAST_SHOWN_KEY) === day) return;
      const dueToday = today.filter((task) => task.due?.slice(0, 10) === day).length;
      const body = reminderText(overdue.length, dueToday);
      if (!body) return;
      localStorage.setItem(LAST_SHOWN_KEY, day);
      void invoke('notifications:show', { title: 'myOS', body }).catch(() => undefined);
    };
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [enabled, ready, overdue, today]);
}
