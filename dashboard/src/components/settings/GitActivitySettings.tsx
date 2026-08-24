import { FolderGit2, Plus, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CollapsibleSection } from './CollapsibleSection';
import { artifactDomains, artifactDomainLabels } from './artifactGitRulesModel';
import { useArtifactGitRules } from './useArtifactGitRules';

export default function GitActivitySettings() {
  const {
    artifactGitRules,
    artifactRuleDraft,
    setArtifactRuleDraft,
    artifactRuleMode,
    setArtifactRuleMode,
    artifactRootPrefix,
    artifactGitignorePath,
    artifactRulesLoading,
    artifactRulesSaving,
    artifactRulesError,
    setArtifactRulesError,
    artifactRuleFilter,
    setArtifactRuleFilter,
    persistArtifactRules,
    getDomainPattern,
    getDomainBaseRule,
    handleAddArtifactRule,
    handleRemoveArtifactRule,
    handleToggleArtifactRuleMode,
    handleSetDomainBaseRule,
    handleClearDomainBaseRule,
    replaceDomainBaseRules,
    visibleArtifactRules,
    artifactRuleStats,
  } = useArtifactGitRules();

  const artifactPatternExample = artifactRootPrefix
    ? `${artifactRootPrefix}/personal/**/*`
    : 'personal/**/*';

  return (
    <div className="space-y-10">
      <CollapsibleSection
        title="Artifact Git Activity"
        icon={FolderGit2}
        description="Control which artifact paths are included or excluded from Git"
      >
        <div className="space-y-5">
          <div>
            <div className="ed-label mb-2">Quick Presets</div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-2xs uppercase tracking-[0.08em]"
                onClick={() =>
                  void replaceDomainBaseRules([
                    { domain: 'personal', mode: 'exclude' },
                    { domain: 'inbox', mode: 'exclude' },
                  ])
                }
                disabled={artifactRulesLoading || artifactRulesSaving}
              >
                Privacy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-2xs uppercase tracking-[0.08em]"
                onClick={() =>
                  void replaceDomainBaseRules([
                    { domain: 'personal', mode: 'exclude' },
                    { domain: 'creative', mode: 'exclude' },
                    { domain: 'inbox', mode: 'exclude' },
                  ])
                }
                disabled={artifactRulesLoading || artifactRulesSaving}
              >
                Work Focus
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-2xs uppercase tracking-[0.08em] ed-text-error"
                onClick={() => void persistArtifactRules([])}
                disabled={artifactRulesLoading || artifactRulesSaving}
              >
                Clear All Rules
              </Button>
            </div>
          </div>

          <div>
            <div className="pb-2 border-b border-[var(--rule-standard)]">
              <div className="ed-label">Domain Baseline Rules</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Set one baseline include/exclude rule per domain.
              </p>
            </div>
            <div className="divide-y divide-[var(--rule-faint)]">
              {artifactDomains.map((domain) => {
                const baseRule = getDomainBaseRule(domain);
                const isExcluded = baseRule?.mode === 'exclude';
                const isIncluded = baseRule?.mode === 'include';

                return (
                  <div
                    key={domain}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-serif text-foreground">{artifactDomainLabels[domain]}</div>
                        <Badge
                          variant={isExcluded ? 'warning' : isIncluded ? 'info' : 'neutral'}
                          size="sm"
                        >
                          {isExcluded ? 'Excluded' : isIncluded ? 'Included' : 'Unset'}
                        </Badge>
                      </div>
                      <code className="text-xs text-muted-foreground">{getDomainPattern(domain)}</code>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={isExcluded ? 'outline' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-2xs uppercase tracking-[0.08em]"
                        onClick={() => void handleSetDomainBaseRule(domain, 'exclude')}
                        disabled={artifactRulesLoading || artifactRulesSaving}
                      >
                        Exclude
                      </Button>
                      <Button
                        variant={isIncluded ? 'outline' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-2xs uppercase tracking-[0.08em]"
                        onClick={() => void handleSetDomainBaseRule(domain, 'include')}
                        disabled={artifactRulesLoading || artifactRulesSaving}
                      >
                        Include
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-2xs uppercase tracking-[0.08em] text-muted-foreground"
                        onClick={() => void handleClearDomainBaseRule(domain)}
                        disabled={artifactRulesLoading || artifactRulesSaving || !baseRule}
                        title="Remove baseline rule"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--rule-faint)] space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ed-label mr-1">Rule Builder</span>
              <Button
                variant={artifactRuleMode === 'exclude' ? 'outline' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-2xs uppercase tracking-[0.08em]"
                onClick={() => setArtifactRuleMode('exclude')}
                disabled={artifactRulesLoading || artifactRulesSaving}
              >
                Exclude
              </Button>
              <Button
                variant={artifactRuleMode === 'include' ? 'outline' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-2xs uppercase tracking-[0.08em]"
                onClick={() => setArtifactRuleMode('include')}
                disabled={artifactRulesLoading || artifactRulesSaving}
              >
                Include
              </Button>
              {artifactDomains.map((domain) => (
                <Button
                  key={`suggest-${domain}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-2xs uppercase tracking-[0.08em]"
                  onClick={() => setArtifactRuleDraft(getDomainPattern(domain))}
                  disabled={artifactRulesLoading || artifactRulesSaving}
                >
                  {artifactDomainLabels[domain]}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={artifactRuleDraft}
                onChange={(e) => {
                  setArtifactRuleDraft(e.target.value);
                  setArtifactRulesError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && void handleAddArtifactRule()}
                placeholder={`e.g., ${artifactPatternExample}`}
                className="flex-1"
                disabled={artifactRulesLoading || artifactRulesSaving}
              />
              <Button
                onClick={() => void handleAddArtifactRule()}
                variant="outline"
                disabled={artifactRulesLoading || artifactRulesSaving}
                className="text-2xs uppercase tracking-[0.08em]"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Rule
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: type just <code className="px-1 bg-secondary">personal</code> and myOS auto-expands it.
            </p>
            {artifactRulesError && (
              <p className="text-xs ed-text-error">{artifactRulesError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Rules are managed in <code className="px-1 bg-secondary">{artifactGitignorePath || '.gitignore'}</code>.
              {artifactRootPrefix
                ? ` Artifact patterns should start with ${artifactRootPrefix}/.`
                : ' Artifact patterns should target top-level artifact folders.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="ed-label">Rule Inventory</span>
            <Badge variant="warning" size="sm">
              {artifactRuleStats.excludeCount} excluded
            </Badge>
            <Badge variant="info" size="sm">
              {artifactRuleStats.includeCount} included
            </Badge>
            <div className="ml-auto w-full sm:w-64">
              <Input
                value={artifactRuleFilter}
                onChange={(e) => setArtifactRuleFilter(e.target.value)}
                placeholder="Filter rules..."
                className="h-8 text-xs"
                disabled={artifactRulesLoading}
              />
            </div>
          </div>

          {artifactRulesLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading artifact git rules...</p>
          ) : visibleArtifactRules.length > 0 ? (
            <div className="divide-y divide-[var(--rule-faint)] border-y border-[var(--rule-faint)]">
              {visibleArtifactRules.map((rule) => (
                <div
                  key={`${rule.mode}:${rule.pattern}`}
                  className="flex items-center justify-between px-1 py-2 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-3xs uppercase tracking-[0.08em]"
                      onClick={() => void handleToggleArtifactRuleMode(rule)}
                      title="Toggle include/exclude"
                      disabled={artifactRulesSaving}
                    >
                      {rule.mode === 'exclude' ? 'Excluded' : 'Included'}
                    </Button>
                    <code className="text-sm font-mono text-foreground truncate">
                      {rule.mode === 'include' ? `!${rule.pattern}` : rule.pattern}
                    </code>
                  </div>
                  <Button
                    onClick={() => void handleRemoveArtifactRule(rule)}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-[hsl(var(--ed-error))]"
                    title="Remove rule"
                    disabled={artifactRulesSaving}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : artifactGitRules.length > 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground font-reading italic">
              No rules match your filter — try a broader search term.
            </p>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground font-reading italic">
              No artifact git rules configured — add exclude or include patterns above.
            </p>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
