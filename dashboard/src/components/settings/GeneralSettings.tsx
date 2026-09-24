import { useState } from 'react';
import { toast } from 'sonner';
import {
  Database,
  FolderOpen,
  Copy,
  Check,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useSettingsStore } from '../../store/settings';
import { chooseWorkspace, useWorkspacePath } from '../../data/workspace';
import { Button } from '../ui/button';
import { CollapsibleSection } from './CollapsibleSection';

export default function GeneralSettings() {
  const resetAllSettings = useSettingsStore((state) => state.resetAllSettings);

  const [copiedPath, setCopiedPath] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearStorageConfirm, setShowClearStorageConfirm] = useState(false);
  const [vaultPath, setVaultPath] = useWorkspacePath();

  const handleChooseVaultPath = async () => {
    try {
      const selectedPath = await chooseWorkspace();
      if (selectedPath) setVaultPath(selectedPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not use that folder');
    }
  };

  const handleCopyPath = async () => {
    if (!vaultPath) return;
    await navigator.clipboard.writeText(vaultPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleResetSettings = () => {
    resetAllSettings();
    setShowResetConfirm(false);
  };

  const handleClearLocalStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="space-y-10">
      {/* Data & Storage Section */}
      <CollapsibleSection
        title="Data & Storage"
        icon={Database}
        description="Manage your vault location and app data"
        defaultOpen={false}
      >
        <div className="space-y-4">
          {/* Vault Path */}
          <div>
            <div className="text-sm text-foreground mb-1">Vault Location</div>
            <div className="text-xs text-muted-foreground mb-2">
              Your knowledge artifacts are stored here
            </div>
            <div className="space-y-2">
              <code className="block w-full truncate rounded-md bg-secondary px-3 py-2 font-mono text-xs text-foreground">
                {vaultPath || 'Loading…'}
              </code>
              <div className="flex items-center gap-2">
                <Button onClick={() => void handleChooseVaultPath()} variant="outline" size="sm">
                  <FolderOpen className="mr-1 h-4 w-4" />
                  Change folder…
                </Button>
                <Button
                  onClick={handleCopyPath}
                  variant="icon"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Copy path"
                >
                  {copiedPath ? (
                    <Check className="w-4 h-4 ed-text-success" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-[var(--rule-standard)] pt-4 mt-6">
            <div className="ed-label ed-text-error">Danger zone</div>
            <div className="mt-4 space-y-3">
              {/* Reset Settings */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-foreground">Reset All Settings</div>
                  <div className="text-xs text-muted-foreground">
                    Restore all settings to their default values
                  </div>
                </div>
                {showResetConfirm ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleResetSettings}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Confirm Reset
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetConfirm(true)}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Clear Local Storage */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--rule-faint)]">
                <div>
                  <div className="text-sm text-foreground">Clear Local Storage</div>
                  <div className="text-xs text-muted-foreground">
                    Clear all cached data and reload the app
                  </div>
                </div>
                {showClearStorageConfirm ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClearStorageConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClearLocalStorage}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Confirm Clear
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearStorageConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
