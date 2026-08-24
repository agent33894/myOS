import type { ArtifactGitRule } from '../../../shared/ipc/contracts';

export const artifactDomains = ['work', 'personal', 'research', 'creative', 'inbox'] as const;
export type ArtifactDomain = (typeof artifactDomains)[number];

export const artifactDomainLabels: Record<ArtifactDomain, string> = {
  work: 'Work',
  personal: 'Personal',
  research: 'Research',
  creative: 'Creative',
  inbox: 'Inbox',
};

export function getArtifactDomainPattern(artifactRootPrefix: string, domain: ArtifactDomain): string {
  return artifactRootPrefix ? `${artifactRootPrefix}/${domain}/**/*` : `${domain}/**/*`;
}

export function resolveDomainShortcut(input: string, artifactRootPrefix: string): ArtifactDomain | null {
  const normalized = input
    .replace(/^!+/, '')
    .trim()
    .replace(/^\.\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase();

  if (!normalized) return null;

  for (const domain of artifactDomains) {
    const bare = domain;
    const bareGlob = `${domain}/**/*`;
    const prefixed = artifactRootPrefix ? `${artifactRootPrefix}/${domain}` : domain;
    const prefixedGlob = artifactRootPrefix ? `${artifactRootPrefix}/${domain}/**/*` : bareGlob;
    if (
      normalized === bare ||
      normalized === bareGlob ||
      normalized === prefixed ||
      normalized === prefixedGlob
    ) {
      return domain;
    }
  }

  return null;
}

export function sortArtifactRules(rules: ArtifactGitRule[]): ArtifactGitRule[] {
  return [...rules].sort((a, b) => {
    if (a.mode !== b.mode) {
      return a.mode === 'exclude' ? -1 : 1;
    }
    return a.pattern.localeCompare(b.pattern);
  });
}

export function filterArtifactRules(rules: ArtifactGitRule[], filter: string): ArtifactGitRule[] {
  const query = filter.trim().toLowerCase();
  if (!query) return rules;
  return rules.filter((rule) =>
    `${rule.mode} ${rule.pattern}`.toLowerCase().includes(query)
  );
}

export function countArtifactRuleModes(rules: ArtifactGitRule[]): {
  includeCount: number;
  excludeCount: number;
} {
  let includeCount = 0;
  let excludeCount = 0;
  for (const rule of rules) {
    if (rule.mode === 'include') {
      includeCount += 1;
    } else {
      excludeCount += 1;
    }
  }
  return {
    includeCount,
    excludeCount,
  };
}
