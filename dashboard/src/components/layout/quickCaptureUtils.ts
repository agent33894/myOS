import { getArtifactSpec } from '@shared/spec';
import { buildSuggestedTitleFromContent, extractHashTags } from '@shared/capture';

export { buildSuggestedTitleFromContent };
import { ArtifactType, Domain, TodoPriority } from '../../types/artifacts';

/**
 * Types offered for light categorization at capture time — the ones with
 * explicit prefixes. Everything else has a dedicated creation flow.
 */
export const CAPTURE_TYPE_OPTIONS: ArtifactType[] = [
  ArtifactType.TODO,
  ArtifactType.MEMO,
  ArtifactType.PROJECT,
];

const INTENT_PATTERNS: Record<string, RegExp[]> = {
  todo: [
    /(?:need to|have to|must|should|will|going to)\s+(?:remember to|capture|note|write|do|follow up|check|verify|complete|finish|review|update|add|create|schedule|plan|organize)/i,
    /^(?:todo|task|reminder|don't forget|make sure)/i,
    /remind me to/i,
    /before (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|end of)/i,
    /due by|deadline|by (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)/i,
    /\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}/,
  ],
  memo: [
    /^(?:memo|document|writeup|write-up|spec|specification)/i,
    /(?:overview|summary|introduction|background|purpose|objective|goal)/i,
    /documentation|writeup/i,
  ],
  project: [
    /^(?:project|initiative|workstream)\b/i,
    /(?:milestone|outcome|roadmap|launch plan)/i,
  ],
};

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  work: [
    'work',
    'project',
    'team',
    'client',
    'deadline',
    'meeting',
    'sprint',
    'ticket',
    'jira',
    'code review',
    'api',
    'database',
    'deploy',
    'production',
    'staging',
  ],
  personal: [
    'personal',
    'home',
    'family',
    'health',
    'fitness',
    'hobby',
    'vacation',
    'budget',
    'finance',
    'shopping',
    'recipe',
    'book',
    'movie',
  ],
  research: [
    'research',
    'learn',
    'study',
    'investigate',
    'discover',
    'experiment',
    'analysis',
    'data',
    'paper',
    'article',
    'tutorial',
    'course',
    'documentation',
  ],
  creative: [
    'creative',
    'writing',
    'design',
    'art',
    'music',
    'photo',
    'video',
    'blog',
    'presentation',
    'slides',
    'content',
    'story',
    'poem',
  ],
};

const EXPLICIT_TYPE_PREFIXES: Array<{ type: ArtifactType; pattern: RegExp }> = [
  { type: ArtifactType.TODO, pattern: /^\s*(?:todo|task|reminder)\b[:-]?\s*/i },
  { type: ArtifactType.MEMO, pattern: /^\s*(?:memo|note|document|writeup|spec)\b[:-]?\s*/i },
  { type: ArtifactType.PROJECT, pattern: /^\s*project\b[:-]?\s*/i },
];

interface QuickCaptureData {
  content: string;
  detectedType: ArtifactType | null;
  detectedDomain: Domain | null;
  detectedPriority: TodoPriority | null;
  detectedTags: string[];
  suggestedTitle: string;
  explicitType: ArtifactType | null;
}

export function stripTypePrefix(
  text: string
): { explicitType: ArtifactType | null; content: string } {
  for (const entry of EXPLICIT_TYPE_PREFIXES) {
    if (entry.pattern.test(text)) {
      return {
        explicitType: entry.type,
        content: text.replace(entry.pattern, '').trim(),
      };
    }
  }

  return {
    explicitType: null,
    content: text.trim(),
  };
}

export function buildStructuredCaptureContent(
  input: string,
  title: string,
  type: ArtifactType
): string {
  const cleaned = stripTypePrefix(input).content.replace(/^\s+|\s+$/g, '');
  if (!cleaned) {
    return `# ${title}`;
  }

  if (/^#\s+/m.test(cleaned)) {
    return cleaned;
  }

  if (type === ArtifactType.QUERY && !/```/.test(cleaned)) {
    return `# ${title}\n\n## Query\n\`\`\`sql\n${cleaned}\n\`\`\``;
  }

  if (type === ArtifactType.SNIPPET && !/```/.test(cleaned)) {
    return `# ${title}\n\n## Snippet\n\`\`\`\n${cleaned}\n\`\`\``;
  }

  return `# ${title}\n\n${cleaned}`;
}

interface CaptureFilingChoices {
  type: ArtifactType | null;
  domain: Domain | null;
  priority: TodoPriority | null;
}

interface CaptureFiling {
  /** Effective destination. INBOX means Unfiled (`vault/inbox/`). */
  type: ArtifactType;
  /** Undefined for Unfiled captures — inbox items carry no domain. */
  domain: Domain | undefined;
  /** Only meaningful for todos. */
  priority: TodoPriority | undefined;
  /** Heuristic detection offered as a one-click suggestion, never auto-applied. */
  suggestedType: ArtifactType | null;
}

export function resolveCaptureDomain(
  type: ArtifactType,
  chosenDomain: Domain | null,
  detectedDomain: Domain | null
): Domain {
  const spec = getArtifactSpec(type);
  if (chosenDomain && spec.allowedDomains.includes(chosenDomain)) return chosenDomain;
  if (detectedDomain && spec.allowedDomains.includes(detectedDomain)) return detectedDomain;
  return (spec.defaultDomain as Domain | undefined) || Domain.WORK;
}

/**
 * The capture filing contract: Unfiled by default. An explicit prefix
 * ("todo: …") applies directly; heuristic detection only ever suggests.
 * A manual choice (including explicitly picking Unfiled) wins over both.
 */
export function resolveCaptureFiling(
  detected: QuickCaptureData | null,
  chosen: CaptureFilingChoices
): CaptureFiling {
  const type = chosen.type ?? detected?.explicitType ?? ArtifactType.INBOX;

  if (type === ArtifactType.INBOX) {
    const suggestedType =
      chosen.type === null && !detected?.explicitType ? detected?.detectedType ?? null : null;
    return { type, domain: undefined, priority: undefined, suggestedType };
  }

  const domain = resolveCaptureDomain(type, chosen.domain, detected?.detectedDomain ?? null);
  const priority =
    type === ArtifactType.TODO
      ? chosen.priority ?? detected?.detectedPriority ?? TodoPriority.MEDIUM
      : undefined;

  return { type, domain, priority, suggestedType: null };
}

export function detectQuickCaptureIntent(text: string): QuickCaptureData {
  const stripped = stripTypePrefix(text);
  const analysisText = stripped.content || text;

  const data: QuickCaptureData = {
    content: analysisText,
    detectedType: stripped.explicitType,
    detectedDomain: null,
    detectedPriority: null,
    detectedTags: [],
    suggestedTitle: buildSuggestedTitleFromContent(analysisText),
    explicitType: stripped.explicitType,
  };

  if (!data.detectedType) {
    for (const [type, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (patterns.some((pattern) => pattern.test(analysisText))) {
        data.detectedType = type as ArtifactType;
        break;
      }
    }
  }

  const lowerText = analysisText.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      data.detectedDomain = domain as Domain;
      break;
    }
  }

  if (/urgent|asap|immediately|critical|important|high priority|deadline/i.test(analysisText)) {
    data.detectedPriority = TodoPriority.HIGH;
  } else if (/when you can|low priority|nice to have|sometime/i.test(analysisText)) {
    data.detectedPriority = TodoPriority.LOW;
  } else if (/soon|this week|tomorrow/i.test(analysisText)) {
    data.detectedPriority = TodoPriority.HIGH;
  }

  const hashTags = extractHashTags(analysisText);
  if (hashTags.length > 0) {
    data.detectedTags = hashTags;
  }

  return data;
}
