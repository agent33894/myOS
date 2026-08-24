interface VerticalScrollableLike {
  clientHeight: number;
  scrollHeight: number;
}

interface TopPositionedLike {
  getBoundingClientRect: () => { top: number };
}

interface ScrollContainerLike extends VerticalScrollableLike, TopPositionedLike {
  scrollTop: number;
}

function isVerticallyScrollable(
  element: VerticalScrollableLike | null,
): element is VerticalScrollableLike {
  return element !== null && element.scrollHeight > element.clientHeight;
}

export function resolveEffectiveScrollContainer<T extends VerticalScrollableLike>(
  localContainer: T | null,
  mainContainer: T | null,
): T | null {
  if (isVerticallyScrollable(localContainer)) return localContainer;
  if (isVerticallyScrollable(mainContainer)) return mainContainer;
  return null;
}

export function computeScrollTopForHeading(
  scrollContainer: ScrollContainerLike,
  headingElement: TopPositionedLike,
  offset: number,
): number {
  const containerTop = scrollContainer.getBoundingClientRect().top;
  const headingTop = headingElement.getBoundingClientRect().top;
  return Math.max(0, scrollContainer.scrollTop + headingTop - containerTop - offset);
}

export function resolveOutlineScrollBehavior(prefersReducedMotion: boolean): ScrollBehavior {
  return prefersReducedMotion ? 'auto' : 'smooth';
}
