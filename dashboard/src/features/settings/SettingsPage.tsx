import { useNavigate, useSearchParams } from 'react-router-dom';
import { toSettingsUrl, type SettingsTab } from '../../app/navigation';
import { PageHeader, SegmentedControl } from '../../ui';
import { AdvancedSettings } from './AdvancedSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { GeneralSettings } from './GeneralSettings';

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'appearance', label: 'Appearance' },
  { value: 'advanced', label: 'Advanced' },
] as const satisfies ReadonlyArray<{ value: SettingsTab; label: string }>;

const PANELS: Record<SettingsTab, () => JSX.Element> = {
  general: GeneralSettings,
  appearance: AppearanceSettings,
  advanced: AdvancedSettings,
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('tab');
  const tab: SettingsTab = TABS.some((item) => item.value === requested) ? (requested as SettingsTab) : 'general';
  const Panel = PANELS[tab];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-8 pb-16 pt-6">
        <div className="flex flex-col gap-6">
          <PageHeader title="Settings" />
          <SegmentedControl
            aria-label="Settings section"
            className="w-full max-w-sm"
            options={TABS}
            value={tab}
            onValueChange={(next) => navigate(toSettingsUrl(next), { replace: true })}
          />
        </div>
        <div key={tab} className="flex animate-fade-in flex-col gap-8">
          <Panel />
        </div>
      </div>
    </div>
  );
}
