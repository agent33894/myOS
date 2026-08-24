import { describe, expect, it } from 'vitest';
import {
  computeScrollTopForHeading,
  resolveEffectiveScrollContainer,
  resolveOutlineScrollBehavior,
} from './outlineScroll';

function createContainer(clientHeight: number, scrollHeight: number, scrollTop: number, top: number) {
  return {
    clientHeight,
    scrollHeight,
    scrollTop,
    getBoundingClientRect: () => ({ top }),
  };
}

describe('resolveEffectiveScrollContainer', () => {
  it('prefers the local container when it is scrollable', () => {
    const local = createContainer(400, 900, 0, 120);
    const main = createContainer(700, 1000, 0, 64);
    expect(resolveEffectiveScrollContainer(local, main)).toBe(local);
  });

  it('falls back to the main container when the local container is not scrollable', () => {
    const local = createContainer(600, 600, 0, 120);
    const main = createContainer(700, 1200, 0, 64);
    expect(resolveEffectiveScrollContainer(local, main)).toBe(main);
  });

  it('returns null when no candidate container is scrollable', () => {
    const local = createContainer(600, 600, 0, 120);
    const main = createContainer(700, 700, 0, 64);
    expect(resolveEffectiveScrollContainer(local, main)).toBeNull();
  });
});

describe('computeScrollTopForHeading', () => {
  it('computes the heading target from container and heading offsets', () => {
    const container = createContainer(700, 1400, 280, 100);
    expect(computeScrollTopForHeading(container, { getBoundingClientRect: () => ({ top: 540 }) }, 96)).toBe(624);
  });

  it('clamps targets near the top to zero', () => {
    const container = createContainer(700, 1400, 10, 100);
    expect(computeScrollTopForHeading(container, { getBoundingClientRect: () => ({ top: 120 }) }, 96)).toBe(0);
  });
});

describe('resolveOutlineScrollBehavior', () => {
  it('disables smooth scrolling when reduced motion is preferred', () => {
    expect(resolveOutlineScrollBehavior(true)).toBe('auto');
    expect(resolveOutlineScrollBehavior(false)).toBe('smooth');
  });
});
