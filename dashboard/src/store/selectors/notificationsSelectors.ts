import { useShallow } from 'zustand/react/shallow';
import {
  useNotificationsStore,
  type NotificationsState,
} from '../notifications';

// ============ NOTIFICATIONS STORE SELECTORS ============

// Single-value selectors
export const useNotifications = () =>
  useNotificationsStore((state) => state.notifications);
export const useNotificationSettings = () =>
  useNotificationsStore((state) => state.settings);

// Action selectors - Settings actions (for NotificationSettings)
export const useNotificationSettingsActions = () =>
  useNotificationsStore(
    useShallow((state: NotificationsState) => ({
      updateSettings: state.updateSettings,
      clearNotifications: state.clearNotifications,
    }))
  );
