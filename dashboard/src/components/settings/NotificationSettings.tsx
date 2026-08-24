import { Bell, BellOff, Clock, Moon, Trash2 } from 'lucide-react';
import {
  useNotificationSettings,
  useNotifications,
  useNotificationSettingsActions,
} from '../../store/selectors';
import { Button } from '../ui/button';
import { Toggle } from '../ui/toggle';
import { CollapsibleSection, SettingRow } from './CollapsibleSection';

export default function NotificationSettings() {
  const settings = useNotificationSettings();
  const notifications = useNotifications();
  const { updateSettings, clearNotifications } = useNotificationSettingsActions();

  return (
    <div className="space-y-10">
      {/* Master Control */}
      <CollapsibleSection
        title="Master Control"
        icon={settings.enabled ? Bell : BellOff}
        description="Enable or disable all notifications"
      >
        <div className="space-y-1">
          <SettingRow
            label="Enable Notifications"
            description="Show notifications for due dates, overdue items, and reminders"
          >
            <Toggle
              enabled={settings.enabled}
              onChange={(enabled) => updateSettings({ enabled })}
            />
          </SettingRow>
        </div>
      </CollapsibleSection>

      {/* Alert Types */}
      <div className={`transition-opacity ${!settings.enabled ? 'opacity-60 pointer-events-none' : ''}`}>
        <CollapsibleSection
          title="Alert Types"
          icon={Bell}
          description="Choose which notifications to receive"
        >
          <div className="space-y-1">
            <SettingRow
              label="Overdue Tasks"
              description="Notify when tasks are past their due date"
            >
              <Toggle
                enabled={settings.showOverdue}
                onChange={(showOverdue) => updateSettings({ showOverdue })}
                disabled={!settings.enabled}
              />
            </SettingRow>
            <SettingRow
              label="Due Today"
              description="Notify about tasks due today"
            >
              <Toggle
                enabled={settings.showDueToday}
                onChange={(showDueToday) => updateSettings({ showDueToday })}
                disabled={!settings.enabled}
              />
            </SettingRow>
            <SettingRow
              label="Due Soon"
              description="Notify about tasks due tomorrow"
            >
              <Toggle
                enabled={settings.showDueSoon}
                onChange={(showDueSoon) => updateSettings({ showDueSoon })}
                disabled={!settings.enabled}
              />
            </SettingRow>
            <SettingRow
              label="Deferred Items Available"
              description="Notify when deferred tasks become available"
            >
              <Toggle
                enabled={settings.showDeferredActive}
                onChange={(showDeferredActive) => updateSettings({ showDeferredActive })}
                disabled={!settings.enabled}
              />
            </SettingRow>
            <SettingRow
              label="Stale Items"
              description="Notify about items that haven't been updated recently"
            >
              <Toggle
                enabled={settings.showStale}
                onChange={(showStale) => updateSettings({ showStale })}
                disabled={!settings.enabled}
              />
            </SettingRow>
          </div>
        </CollapsibleSection>
      </div>

      {/* Desktop & Quiet Hours */}
      <div className={`transition-opacity ${!settings.enabled ? 'opacity-60 pointer-events-none' : ''}`}>
        <CollapsibleSection
          title="Desktop & Quiet Hours"
          icon={Moon}
          description="System notifications and do-not-disturb schedule"
        >
          <div className="space-y-1">
            <SettingRow
              label="Show Desktop Notifications"
              description="Display system notifications for important alerts"
            >
              <Toggle
                enabled={settings.desktopNotifications}
                onChange={(desktopNotifications) => updateSettings({ desktopNotifications })}
                disabled={!settings.enabled}
              />
            </SettingRow>
            <SettingRow
              label="Enable Quiet Hours"
              description="Pause desktop notifications during specified hours"
            >
              <Toggle
                enabled={settings.quietHoursEnabled}
                onChange={(quietHoursEnabled) => updateSettings({ quietHoursEnabled })}
                disabled={!settings.enabled}
              />
            </SettingRow>
          </div>

          {settings.quietHoursEnabled && settings.enabled && (
            <div className="mt-4 pt-4 border-t border-[var(--rule-faint)]">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="ed-label block mb-2">Start time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="time"
                      value={settings.quietHoursStart}
                      onChange={(e) => updateSettings({ quietHoursStart: e.target.value })}
                      className="flex h-10 w-full rounded-none border border-border bg-secondary/40 pl-10 pr-4 py-2 text-sm text-foreground ring-offset-background transition-colors duration-150 hover:chronicle-rule-strong focus:outline-none focus-visible:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="ed-label block mb-2">End time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="time"
                      value={settings.quietHoursEnd}
                      onChange={(e) => updateSettings({ quietHoursEnd: e.target.value })}
                      className="flex h-10 w-full rounded-none border border-border bg-secondary/40 pl-10 pr-4 py-2 text-sm text-foreground ring-offset-background transition-colors duration-150 hover:chronicle-rule-strong focus:outline-none focus-visible:outline-none focus-visible:border-[rgb(var(--accent-color))] focus-visible:ring-1 focus-visible:ring-[rgb(var(--accent-color))]"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Desktop notifications will be paused from {settings.quietHoursStart} to {settings.quietHoursEnd}
              </p>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* History */}
      <CollapsibleSection
        title="History"
        icon={Trash2}
        description={`${notifications.length} notification${notifications.length !== 1 ? 's' : ''} in history`}
        defaultOpen={false}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-foreground">Clear All Notifications</div>
            <div className="text-xs text-muted-foreground mt-1">
              Remove all notifications from history
            </div>
          </div>
          <Button
            variant="outline"
            onClick={clearNotifications}
            disabled={notifications.length === 0}
          >
            Clear All
          </Button>
        </div>
      </CollapsibleSection>
    </div>
  );
}
