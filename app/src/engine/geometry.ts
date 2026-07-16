import { ARENA_RADIUS, type Vec2 } from './types';

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  if (len === 0) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

/** Point at `distance` along the ray from `origin` through `angle` radians. */
export function pointAtAngle(origin: Vec2, angleRad: number, distance: number): Vec2 {
  return {
    x: origin.x + Math.cos(angleRad) * distance,
    y: origin.y + Math.sin(angleRad) * distance,
  };
}

export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Is the point inside (or on) the arena's circular boundary? */
export function isInsideArena(p: Vec2): boolean {
  return length(p) <= ARENA_RADIUS + 1e-9;
}

/**
 * Clamp a point that may lie outside the arena back onto the boundary,
 * preserving the direction from the arena center.
 */
export function clampToArena(p: Vec2): Vec2 {
  const len = length(p);
  if (len <= ARENA_RADIUS) return p;
  return scale(p, ARENA_RADIUS / len);
}

/**
 * If the ray from `origin` in direction `dir` (unit vector) exits the arena,
 * return the distance at which it crosses the boundary. `origin` must be
 * inside the arena.
 */
export function distanceToArenaBoundary(origin: Vec2, dir: Vec2): number {
  // Solve |origin + t*dir|^2 = R^2 for t >= 0.
  const R = ARENA_RADIUS;
  const a = dir.x * dir.x + dir.y * dir.y;
  const b = 2 * (origin.x * dir.x + origin.y * dir.y);
  const c = origin.x * origin.x + origin.y * origin.y - R * R;
  const disc = b * b - 4 * a * c;
  if (a === 0 || disc < 0) return Infinity;
  const sqrtDisc = Math.sqrt(disc);
  const t = (-b + sqrtDisc) / (2 * a);
  return t;
}

/**
 * Closest point on segment [a,b] to point p, and the distance to it.
 */
export function closestPointOnSegment(a: Vec2, b: Vec2, p: Vec2): { point: Vec2; t: number; distance: number } {
  const ab = sub(b, a);
  const lenSq = ab.x * ab.x + ab.y * ab.y;
  let t = lenSq === 0 ? 0 : (( p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const point = add(a, scale(ab, t));
  return { point, t, distance: dist(point, p) };
}

/**
 * Intersection point of two segments [p1,p2] and [p3,p4], if any, expressed
 * as the parametric `t` along [p1,p2] (0..1). Returns null if parallel or
 * no intersection within both segments.
 */
export function segmentIntersection(
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  p4: Vec2,
): { point: Vec2; t: number } | null {
  const d1 = sub(p2, p1);
  const d2 = sub(p4, p3);
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-12) return null;
  const diff = sub(p3, p1);
  const t = (diff.x * d2.y - diff.y * d2.x) / denom;
  const u = (diff.x * d1.y - diff.y * d1.x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { point: add(p1, scale(d1, t)), t };
}
