import { projectSwatchFor } from '@shared/design-system/accents';
import { ArtifactType, type Artifact } from '../../types/artifacts';
import type { SearchHit } from './librarySearch';

/** Editorial section order: knowledge documents first, operational streams last. */
export const INDEX_TYPE_ORDER: ArtifactType[] = [
  ArtifactType.DECISION,
  ArtifactType.MEMO,
  ArtifactType.RESEARCH,
  ArtifactType.MEETING,
  ArtifactType.QUERY,
  ArtifactType.PROMPT,
  ArtifactType.SNIPPET,
  ArtifactType.PROJECT,
  ArtifactType.TODO,
  ArtifactType.DEVELOPMENT,
  ArtifactType.INBOX,
];

export const SECTION_CAP = 5;

export type SectionId = ArtifactType | 'all' | 'archive';
export type LibrarySort = 'created' | 'updated';
export type LibraryGrouping = 'none' | 'type';

export const LIBRARY_SORT_LABELS: Record<LibrarySort, string> = {
  created: 'Recently created',
  updated: 'Recently updated',
};

export const LIBRARY_GROUPING_LABELS: Record<LibraryGrouping, string> = {
  none: 'No grouping',
  type: 'Group by type',
};

export interface IndexSection {
  id: SectionId;
  label: string;
  total: number;
  rows: SearchHit[];
  /** True when rows were cut to SECTION_CAP and a "view all" affordance applies. */
  capped: boolean;
}

const UNCOUNTABLE = new Set<ArtifactType>([
  ArtifactType.RESEARCH,
  ArtifactType.DEVELOPMENT,
  ArtifactType.INBOX,
]);

function sectionLabel(id: SectionId): string {
  if (id === 'all') return 'Artifacts';
  if (id === 'archive') return 'Archive';
  const base = id.replace('-', ' ');
  const label = UNCOUNTABLE.has(id) ? base : `${base}s`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function artifactTimestamp(artifact: Artifact, sort: LibrarySort): number {
  const timestamp = new Date(artifact[sort]).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

const byArtifactDateDesc = (sort: LibrarySort) => (a: Artifact, b: Artifact) =>
  artifactTimestamp(b, sort) - artifactTimestamp(a, sort);

const byHitDateDesc = (sort: LibrarySort) => (a: SearchHit, b: SearchHit) =>
  artifactTimestamp(b.artifact, sort) - artifactTimestamp(a.artifact, sort);

const asHits = (artifacts: Artifact[]): SearchHit[] =>
  artifacts.map((artifact) => ({ artifact, score: 0 }));

function toSection(id: SectionId, rows: SearchHit[], expanded: boolean, cap: number | null = SECTION_CAP): IndexSection {
  const capped = cap !== null && !expanded && rows.length > cap;
  return {
    id,
    label: sectionLabel(id),
    total: rows.length,
    rows: capped ? rows.slice(0, cap ?? undefined) : rows,
    capped,
  };
}

interface SectionOptions {
  /** Chip selection; empty means every type. */
  types?: Set<ArtifactType>;
  /** Section whose row cap is lifted. */
  expanded?: SectionId | null;
  sort?: LibrarySort;
  grouping?: LibraryGrouping;
}

/**
 * Arrange date-sorted hits (or all non-archived artifacts in browse mode) into
 * sections. Ungrouped (the default) yields one uncapped list, newest first;
 * grouping by type yields capped sections in editorial order. Browse mode
 * without a chip filter appends a capped Archive section so archived
 * artifacts keep a surface.
 */
export function buildSections(
  hits: SearchHit[] | null,
  artifacts: Artifact[],
  { types = new Set(), expanded = null, sort = 'created', grouping = 'none' }: SectionOptions = {},
): IndexSection[] {
  const browsing = hits === null;
  const inTypes = (type: ArtifactType) => types.size === 0 || types.has(type);
  const source = browsing
    ? asHits(artifacts.filter((artifact) => artifact.status !== 'archived').sort(byArtifactDateDesc(sort)))
    : hits.filter(({ artifact }) => artifact.status !== 'archived').sort(byHitDateDesc(sort));

  const sections: IndexSection[] = [];
  if (grouping === 'none') {
    const rows = source.filter(({ artifact }) => inTypes(artifact.type));
    if (rows.length) sections.push(toSection('all', rows, true, null));
  } else {
    const byType = new Map<ArtifactType, SearchHit[]>();
    for (const hit of source) {
      const list = byType.get(hit.artifact.type) ?? [];
      list.push(hit);
      byType.set(hit.artifact.type, list);
    }
    for (const type of INDEX_TYPE_ORDER) {
      if (!inTypes(type)) continue;
      const rows = byType.get(type);
      if (rows?.length) sections.push(toSection(type, rows, expanded === type));
    }
  }

  if (browsing && types.size === 0) {
    const archived = artifacts.filter((artifact) => artifact.status === 'archived').sort(byArtifactDateDesc(sort));
    if (archived.length) sections.push(toSection('archive', asHits(archived), expanded === 'archive'));
  }
  return sections;
}

/** Per-type counts for the filter chips, over the current (pre-chip) result set. */
export function typeMatchCounts(hits: SearchHit[] | null, artifacts: Artifact[]): Map<ArtifactType, number> {
  const counts = new Map<ArtifactType, number>();
  const source = hits ?? asHits(artifacts);
  for (const { artifact } of source) {
    if (artifact.status === 'archived') continue;
    counts.set(artifact.type, (counts.get(artifact.type) ?? 0) + 1);
  }
  return counts;
}

/** Masthead garnish: "312 artifacts · 11 types" over the live (non-archived) vault. */
export function mastheadCounts(artifacts: Artifact[]): { total: number; typeCount: number } {
  const live = artifacts.filter((artifact) => artifact.status !== 'archived');
  return { total: live.length, typeCount: new Set(live.map((artifact) => artifact.type)).size };
}

/**
 * Resolve row project dots the same way the Projects feature does: a project
 * artifact's pinned swatch (or title hash) wins; unknown references fall back
 * to hashing the raw string so renames stay stable.
 */
export function buildProjectInkMap(artifacts: Artifact[]): Map<string, string> {
  const inks = new Map<string, string>();
  for (const artifact of artifacts) {
    if (artifact.type !== ArtifactType.PROJECT) continue;
    const hex = projectSwatchFor(artifact.title, artifact.swatch).hex;
    inks.set(artifact.id, hex);
    inks.set(artifact.title, hex);
  }
  return inks;
}

export function projectInkFor(projectRef: string, inks: Map<string, string>): string {
  return inks.get(projectRef) ?? projectSwatchFor(projectRef).hex;
}
