import { useEffect, useMemo, useState } from 'react';
import type { ArtifactGitRule } from '@shared/ipc/contracts';
import { invoke } from '../../data/ipc';
import {
  artifactDomains,
  countArtifactRuleModes,
  filterArtifactRules,
  getArtifactDomainPattern,
  resolveDomainShortcut,
  sortArtifactRules,
  type ArtifactDomain,
} from './artifactGitRulesModel';

/**
 * State and IPC wiring for the Artifact Git Activity rules editor.
 * Loads the managed gitignore rules and persists edits through the
 * git:artifact-rules IPC surface.
 */
export function useArtifactGitRules() {
  const [artifactGitRules, setArtifactGitRules] = useState<ArtifactGitRule[]>([]);
  const [artifactRuleDraft, setArtifactRuleDraft] = useState('');
  const [artifactRuleMode, setArtifactRuleMode] = useState<'exclude' | 'include'>('exclude');
  const [artifactRootPrefix, setArtifactRootPrefix] = useState('vault');
  const [artifactGitignorePath, setArtifactGitignorePath] = useState('');
  const [artifactRulesLoading, setArtifactRulesLoading] = useState(true);
  const [artifactRulesSaving, setArtifactRulesSaving] = useState(false);
  const [artifactRulesError, setArtifactRulesError] = useState<string | null>(null);
  const [artifactRuleFilter, setArtifactRuleFilter] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadArtifactRules = async () => {
      setArtifactRulesLoading(true);
      setArtifactRulesError(null);
      try {
        const config = await invoke('git:rules:get');
        if (!isMounted) return;
        setArtifactGitRules(config.rules);
        setArtifactRootPrefix(config.artifactRootPrefix || '');
        setArtifactGitignorePath(config.gitignorePath);
      } catch (error) {
        if (!isMounted) return;
        setArtifactRulesError(
          error instanceof Error ? error.message : 'Failed to load artifact git rules'
        );
      } finally {
        if (isMounted) {
          setArtifactRulesLoading(false);
        }
      }
    };

    void loadArtifactRules();
    return () => {
      isMounted = false;
    };
  }, []);

  const persistArtifactRules = async (rules: ArtifactGitRule[]) => {
    setArtifactRulesSaving(true);
    setArtifactRulesError(null);
    try {
      const config = await invoke('git:rules:set', rules);
      setArtifactGitRules(config.rules);
      setArtifactRootPrefix(config.artifactRootPrefix || '');
      setArtifactGitignorePath(config.gitignorePath);
      return true;
    } catch (error) {
      setArtifactRulesError(
        error instanceof Error ? error.message : 'Failed to update artifact git rules'
      );
      return false;
    } finally {
      setArtifactRulesSaving(false);
    }
  };

  const getDomainPattern = (domain: ArtifactDomain): string =>
    getArtifactDomainPattern(artifactRootPrefix, domain);

  const handleAddArtifactRule = async () => {
    const shortcutDomain = resolveDomainShortcut(artifactRuleDraft, artifactRootPrefix);
    const pattern = shortcutDomain
      ? getDomainPattern(shortcutDomain)
      : artifactRuleDraft
          .replace(/^!+/, '')
          .trim()
          .replace(/^\/+/, '')
          .replace(/\\/g, '/');
    if (!pattern) {
      setArtifactRulesError('Pattern cannot be empty');
      return;
    }

    if (artifactGitRules.some((rule) => rule.mode === artifactRuleMode && rule.pattern === pattern)) {
      setArtifactRulesError('This rule already exists');
      return;
    }

    const didSave = await persistArtifactRules([
      ...artifactGitRules,
      { mode: artifactRuleMode, pattern },
    ]);
    if (didSave) {
      setArtifactRuleDraft('');
    }
  };

  const handleRemoveArtifactRule = async (targetRule: ArtifactGitRule) => {
    const nextRules = artifactGitRules.filter(
      (rule) => !(rule.mode === targetRule.mode && rule.pattern === targetRule.pattern)
    );
    await persistArtifactRules(nextRules);
  };

  const handleToggleArtifactRuleMode = async (targetRule: ArtifactGitRule) => {
    const nextRules: ArtifactGitRule[] = artifactGitRules.map((rule) => {
      if (rule.mode !== targetRule.mode || rule.pattern !== targetRule.pattern) {
        return rule;
      }
      return {
        ...rule,
        mode: (rule.mode === 'exclude' ? 'include' : 'exclude') as ArtifactGitRule['mode'],
      };
    });
    await persistArtifactRules(nextRules);
  };

  const getDomainBaseRule = (domain: ArtifactDomain): ArtifactGitRule | undefined => {
    const domainPattern = getDomainPattern(domain);
    return artifactGitRules.find((rule) => rule.pattern === domainPattern);
  };

  const handleSetDomainBaseRule = async (
    domain: ArtifactDomain,
    mode: ArtifactGitRule['mode']
  ) => {
    const domainPattern = getDomainPattern(domain);
    const nonDomainRules = artifactGitRules.filter((rule) => rule.pattern !== domainPattern);
    await persistArtifactRules([...nonDomainRules, { mode, pattern: domainPattern }]);
  };

  const handleClearDomainBaseRule = async (domain: ArtifactDomain) => {
    const domainPattern = getDomainPattern(domain);
    const nonDomainRules = artifactGitRules.filter((rule) => rule.pattern !== domainPattern);
    await persistArtifactRules(nonDomainRules);
  };

  const replaceDomainBaseRules = async (
    nextDomainRules: Array<{ domain: ArtifactDomain; mode: ArtifactGitRule['mode'] }>
  ) => {
    const domainPatterns = new Set(artifactDomains.map((domain) => getDomainPattern(domain)));
    const customRules = artifactGitRules.filter((rule) => !domainPatterns.has(rule.pattern));
    const generatedRules = nextDomainRules.map(({ domain, mode }) => ({
      mode,
      pattern: getDomainPattern(domain),
    }));
    await persistArtifactRules([...customRules, ...generatedRules]);
  };

  const sortedArtifactRules = useMemo(
    () => sortArtifactRules(artifactGitRules),
    [artifactGitRules]
  );

  const visibleArtifactRules = useMemo(
    () => filterArtifactRules(sortedArtifactRules, artifactRuleFilter),
    [artifactRuleFilter, sortedArtifactRules]
  );

  const artifactRuleStats = useMemo(
    () => countArtifactRuleModes(artifactGitRules),
    [artifactGitRules]
  );

  return {
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
  };
}
