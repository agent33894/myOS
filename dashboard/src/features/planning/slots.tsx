import type { ArtifactSummary } from '@shared/types';

/** Extra task properties (repeat, when, estimate), after the built-in ones. */
export function PlanningTaskProperties(_: { task: ArtifactSummary }) {
  return null;
}

/** Planning settings (capacity). */
export function PlanningSettings() {
  return null;
}
