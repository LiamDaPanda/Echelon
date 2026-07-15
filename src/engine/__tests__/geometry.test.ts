import { describe, expect, it } from 'vitest';
import { clampToArena, dist, distanceToArenaBoundary, isInsideArena, segmentIntersection } from '../geometry';
import { ARENA_RADIUS } from '../types';

describe('geometry', () => {
  it('measures distance', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('detects inside/outside the arena circle', () => {
    expect(isInsideArena({ x: 0, y: 0 })).toBe(true);
    expect(isInsideArena({ x: ARENA_RADIUS, y: 0 })).toBe(true);
    expect(isInsideArena({ x: ARENA_RADIUS + 1, y: 0 })).toBe(false);
  });

  it('clamps points to the boundary along the same direction', () => {
    const clamped = clampToArena({ x: ARENA_RADIUS * 2, y: 0 });
    expect(clamped.x).toBeCloseTo(ARENA_RADIUS);
    expect(clamped.y).toBeCloseTo(0);
  });

  it('computes distance to the arena boundary along a ray', () => {
    const d = distanceToArenaBoundary({ x: 0, y: 0 }, { x: 1, y: 0 });
    expect(d).toBeCloseTo(ARENA_RADIUS);
  });

  it('finds segment intersections within both segments', () => {
    const hit = segmentIntersection({ x: -5, y: 0 }, { x: 5, y: 0 }, { x: 0, y: -5 }, { x: 0, y: 5 });
    expect(hit).not.toBeNull();
    expect(hit!.point.x).toBeCloseTo(0);
    expect(hit!.point.y).toBeCloseTo(0);
  });

  it('returns null when segments do not cross', () => {
    const hit = segmentIntersection({ x: -5, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -5 }, { x: 0, y: 5 });
    expect(hit).toBeNull();
  });
});
