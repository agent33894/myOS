import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Notification types for different alert categories
 */
export type NotificationType =
  | 'overdue'           // Task is past due date
  | 'due-today'         // Task is due today
  | 'due-soon'          // Task is due within 24-48 hours
  | 'deferred-active'   // Deferred task is now available
  | 'stale'             // Item hasn't been updated in a while
  | 'reminder';         // User-set reminder

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  artifactId: string;
  artifactPath: string;
  timestamp: number;
  read: boolean;
  dismissed: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  showOverdue: boolean;
  showDueToday: boolean;
  showDueSoon: boolean;
  showDeferredActive: boolean;
  showStale: boolean;
  desktopNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string;   // HH:mm format
}

export interface NotificationsState {
  notifications: Notification[];
  settings: NotificationSettings;
  lastChecked: number;

  // Computed
  unreadCount: number;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'dismissed'>) => void;
  addNotifications: (notifications: Omit<Notification, 'id' | 'timestamp' | 'read' | 'dismissed'>[]) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  dismissAll: () => void;
  clearNotifications: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  setLastChecked: (timestamp: number) => void;

  // Query helpers
  getNotificationForArtifact: (artifactId: string, type: NotificationType) => Notification | undefined;
  hasRecentNotification: (artifactId: string, type: NotificationType, withinMs?: number) => boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  showOverdue: true,
  showDueToday: true,
  showDueSoon: false,
  showDeferredActive: true,
  showStale: false,
  desktopNotifications: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

// Generate unique ID for notifications
function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      settings: DEFAULT_SETTINGS,
      lastChecked: 0,

      get unreadCount() {
        return get().notifications.filter(n => !n.read && !n.dismissed).length;
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: generateId(),
          timestamp: Date.now(),
          read: false,
          dismissed: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep max 100
        }));
      },

      addNotifications: (notifications) => {
        const newNotifications = notifications.map(n => ({
          ...n,
          id: generateId(),
          timestamp: Date.now(),
          read: false,
          dismissed: false,
        }));

        set((state) => ({
          notifications: [...newNotifications, ...state.notifications].slice(0, 100),
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
        }));
      },

      dismissNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, dismissed: true } : n
          ),
        }));
      },

      dismissAll: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, dismissed: true })),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      setLastChecked: (timestamp) => {
        set({ lastChecked: timestamp });
      },

      getNotificationForArtifact: (artifactId, type) => {
        return get().notifications.find(
          n => n.artifactId === artifactId && n.type === type && !n.dismissed
        );
      },

      hasRecentNotification: (artifactId, type, withinMs = 24 * 60 * 60 * 1000) => {
        const cutoff = Date.now() - withinMs;
        return get().notifications.some(
          n => n.artifactId === artifactId &&
               n.type === type &&
               n.timestamp > cutoff &&
               !n.dismissed
        );
      },
    }),
    {
      name: 'myos-notifications',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Only persist last 50
        settings: state.settings,
        lastChecked: state.lastChecked,
      }),
    }
  )
);
