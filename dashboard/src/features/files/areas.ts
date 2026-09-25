import { Briefcase, GraduationCap, Home, Palette, type LucideIcon } from 'lucide-react';
import { AREAS, ARTIFACT_TYPES } from '@shared/spec';
import { Domain, type ArtifactSummary } from '@shared/types';

interface AreaInfo {
  value: Domain;
  label: string;
  icon: LucideIcon;
  /** One line for the onboarding card. */
  hint: string;
}

/** The four areas in the order the interface lists them. */
export const AREA_LIST: readonly AreaInfo[] = [
  { value: Domain.WORK, label: AREAS[Domain.WORK], icon: Briefcase, hint: 'Projects, meetings, and deadlines' },
  { value: Domain.PERSONAL, label: AREAS[Domain.PERSONAL], icon: Home, hint: 'Home, health, family, and errands' },
  { value: Domain.RESEARCH, label: AREAS[Domain.RESEARCH], icon: GraduationCap, hint: 'Courses, reading, and research' },
  { value: Domain.CREATIVE, label: AREAS[Domain.CREATIVE], icon: Palette, hint: 'Writing, making, and side projects' },
];

export const areaInfo = (domain: Domain) => AREA_LIST.find((area) => area.value === domain) ?? AREA_LIST[1];

/** Journal pages, templates, and Inbox captures have no area. */
export const hasArea = (item: Pick<ArtifactSummary, 'type'>) => Boolean(ARTIFACT_TYPES[item.type]?.domain);
