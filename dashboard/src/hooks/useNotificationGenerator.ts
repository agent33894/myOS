import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useArtifacts } from '../store/selectors';
import { useNotificationsStore } from '../store/notifications';
import { parseISO, startOfDay, isToday, isTomorrow, isBefore, differenceInDays } from 'date-fns';

/**
 * Hook that monitors artifacts and generates notifications
 * for overdue items, due-today items, and deferred items becoming active.
 *
 * Runs on mount and periodically (every 5 minutes).
 */
export function useNotificationGenerator() {
  const artifacts = useArtifacts();
  const {
    settings,
    addNotifications,
    hasRecentNotification,
    setLastChecked,
  } = useNotificationsStore(
    useShallow((state) => ({
      settings: state.settings,
      addNotifications: state.addNotifications,
      hasRecentNotification: state.hasRecentNotification,
      setLastChecked: state.setLastChecked,
    }))
  );

  const candidates = useMemo(() => {
    const todos = artifacts
      .filter((artifact) => artifact.type === 'todo' && artifact.status !== 'done' && artifact.status !== 'cancelled')
      .map((artifact) => ({
        id: artifact.id,
        title: artifact.title,
        filePath: artifact.filePath,
        dueDate: artifact.due ? parseISO(artifact.due) : null,
        deferDate: artifact.deferDate ? parseISO(artifact.deferDate) : null,
      }));

    const stalePool = artifacts
      .filter((artifact) => !artifact.tags.includes('daily-log'))
      .map((artifact) => ({
        id: artifact.id,
        title: artifact.title,
        filePath: artifact.filePath,
        updatedDate: parseISO(artifact.updated),
      }))
      .sort((a, b) => b.updatedDate.getTime() - a.updatedDate.getTime());

    return { todos, stalePool };
  }, [artifacts]);

  const candidatesRef = useRef(candidates);
  const settingsRef = useRef(settings);
  const hasRecentNotificationRef = useRef(hasRecentNotification);

  useEffect(() => {
    candidatesRef.current = candidates;
  }, [candidates]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    hasRecentNotificationRef.current = hasRecentNotification;
  }, [hasRecentNotification]);

  const checkNotifications = useCallback(() => {
    const now = Date.now();
    const today = startOfDay(new Date());
    const activeSettings = settingsRef.current;
    const currentCandidates = candidatesRef.current;
    const recentlyNotified = hasRecentNotificationRef.current;
    const newNotifications: Parameters<typeof addNotifications>[0] = [];

    for (const todo of currentCandidates.todos) {
      // Check for overdue
      if (activeSettings.showOverdue && todo.dueDate) {
        if (isBefore(todo.dueDate, today) && !recentlyNotified(todo.id, 'overdue')) {
          newNotifications.push({
            type: 'overdue',
            title: 'Overdue Task',
            body: todo.title,
            artifactId: todo.id,
            artifactPath: todo.filePath,
          });
        }
      }

      // Check for due today
      if (activeSettings.showDueToday && todo.dueDate) {
        if (isToday(todo.dueDate) && !recentlyNotified(todo.id, 'due-today')) {
          newNotifications.push({
            type: 'due-today',
            title: 'Due Today',
            body: todo.title,
            artifactId: todo.id,
            artifactPath: todo.filePath,
          });
        }
      }

      // Check for due soon (tomorrow)
      if (activeSettings.showDueSoon && todo.dueDate) {
        if (isTomorrow(todo.dueDate) && !recentlyNotified(todo.id, 'due-soon')) {
          newNotifications.push({
            type: 'due-soon',
            title: 'Due Tomorrow',
            body: todo.title,
            artifactId: todo.id,
            artifactPath: todo.filePath,
          });
        }
      }

      // Check for deferred items becoming active
      if (activeSettings.showDeferredActive && todo.deferDate) {
        if ((isToday(todo.deferDate) || isBefore(todo.deferDate, today)) && !recentlyNotified(todo.id, 'deferred-active')) {
          newNotifications.push({
            type: 'deferred-active',
            title: 'Task Available',
            body: `"${todo.title}" is now available`,
            artifactId: todo.id,
            artifactPath: todo.filePath,
          });
        }
      }
    }

    // Check for stale items (30-60 days since update), limit to 5 notifications.
    if (activeSettings.showStale) {
      let staleNotificationCount = 0;
      for (const staleArtifact of currentCandidates.stalePool) {
        if (staleNotificationCount >= 5) {
          break;
        }

        const daysSinceUpdated = differenceInDays(today, startOfDay(staleArtifact.updatedDate));
        if (daysSinceUpdated <= 30 || daysSinceUpdated > 60) {
          continue;
        }

        if (!recentlyNotified(staleArtifact.id, 'stale')) {
          newNotifications.push({
            type: 'stale',
            title: 'Needs Attention',
            body: `"${staleArtifact.title}" hasn't been updated recently`,
            artifactId: staleArtifact.id,
            artifactPath: staleArtifact.filePath,
          });
          staleNotificationCount++;
        }
      }
    }

    // Add all new notifications at once
    if (newNotifications.length > 0) {
      addNotifications(newNotifications);

      // Trigger desktop notifications if enabled
      if (activeSettings.desktopNotifications && !isQuietHours(activeSettings)) {
        triggerDesktopNotifications(newNotifications);
      }
    }

    setLastChecked(now);
  }, [addNotifications, setLastChecked]);

  // Stable periodic check lifecycle: only restart when notifications are enabled/disabled.
  useEffect(() => {
    if (!settings.enabled) {
      return;
    }

    checkNotifications();
    const intervalId = window.setInterval(checkNotifications, 5 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [settings.enabled, checkNotifications]);

  // Debounced immediate check when artifacts or settings change.
  useEffect(() => {
    if (!settings.enabled) {
      return;
    }

    const timeoutId = window.setTimeout(checkNotifications, 250);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    candidates,
    checkNotifications,
    settings.enabled,
    settings.showDeferredActive,
    settings.showDueSoon,
    settings.showDueToday,
    settings.showOverdue,
    settings.showStale,
  ]);
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(settings: { quietHoursEnabled: boolean; quietHoursStart: string; quietHoursEnd: string }): boolean {
  if (!settings.quietHoursEnabled) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = settings.quietHoursEnd.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

/**
 * Trigger desktop notifications via Electron IPC
 */
function triggerDesktopNotifications(
  notifications: Array<{ type: string; title: string; body: string; artifactPath: string }>
) {
  if (!window.electronAPI?.showNotification) return;

  // Group notifications to avoid spam
  if (notifications.length > 3) {
    window.electronAPI.showNotification({
      title: 'myOS',
      body: `You have ${notifications.length} items that need attention`,
    });
  } else {
    for (const notification of notifications) {
      window.electronAPI.showNotification({
        title: notification.title,
        body: notification.body,
      });
    }
  }
}
