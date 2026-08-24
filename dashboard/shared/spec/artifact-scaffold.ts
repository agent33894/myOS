import type { ArtifactSpec } from './artifact-spec';

export interface BuildScaffoldOptions {
  title?: string;
  includeTitleHeading?: boolean;
  fallbackContent?: string;
}

export function buildScaffoldFromSpec(
  spec: ArtifactSpec,
  options: BuildScaffoldOptions = {}
): string {
  const {
    title,
    includeTitleHeading = true,
    fallbackContent = '',
  } = options;

  const lines: string[] = [];

  const cleanTitle = title?.trim();
  if (includeTitleHeading && cleanTitle) {
    lines.push(`# ${cleanTitle}`, '');
  }

  for (const section of spec.scaffoldRules) {
    lines.push(section.heading);
    const placeholder =
      section.placeholder ||
      (section.required ? '[Required details]' : '[Optional details]');
    lines.push(placeholder, '');
  }

  const body = lines.join('\n').trim();
  return body || fallbackContent;
}
