/**
 * Turns a flat 2D silhouette into a faceted, pseudo-3D "cut gem": an
 * extruded top face plus one shaded side facet per boundary edge, each lit
 * by a fixed simulated light direction. This is presentation-only geometry
 * (nothing here is part of game state) and is deterministic per archetype,
 * so callers can compute it once and reuse it across every piece of that
 * type on the board.
 */

interface V2 {
  x: number;
  y: number;
}

function add(a: V2, b: V2): V2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: V2, b: V2): V2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(a: V2, s: number): V2 {
  return { x: a.x * s, y: a.y * s };
}

function norm(a: V2): V2 {
  const len = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / len, y: a.y / len };
}

function dot(a: V2, b: V2): number {
  return a.x * b.x + a.y * b.y;
}

function fmt(p: V2): string {
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}

function polyStr(pts: V2[]): string {
  return pts.map(fmt).join(' ');
}

function parsePoints(points: string): V2[] {
  return points
    .trim()
    .split(/\s+/)
    .map((p) => {
      const [x, y] = p.split(',').map(Number);
      return { x, y };
    });
}

function centroidOf(pts: V2[]): V2 {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

/** Upper-left key light, matching the rest of the UI's consistent light source. */
const LIGHT = norm({ x: -0.55, y: -0.9 });

export interface SideFacet {
  points: string;
  /** -1 (fully shadowed) .. 1 (fully lit), from this facet's angle to the light. */
  shade: number;
}

export interface ExtrudedShape {
  /** The original outline, unchanged — this is the gem's lit top face. */
  top: string;
  /** One quad per boundary edge, extruded toward the viewer and individually shaded. */
  sides: SideFacet[];
}

/**
 * Extrude a flat polygon outline (as an SVG `points` string) into a faceted
 * 3D-looking gem: a bevel `depth` deep, with each side facet shaded by how
 * directly its outward face points toward the light.
 */
export function extrudePolygon(pointsStr: string, depth: number): ExtrudedShape {
  const pts = parsePoints(pointsStr);
  const center = centroidOf(pts);
  const down: V2 = { x: 0, y: depth };
  const n = pts.length;
  const sides: SideFacet[] = [];

  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const b1 = add(p1, down);
    const b2 = add(p2, down);
    const edge = sub(p2, p1);
    let normal = norm({ x: edge.y, y: -edge.x });
    const mid = scale(add(p1, p2), 0.5);
    if (dot(normal, sub(mid, center)) < 0) normal = scale(normal, -1);
    sides.push({ points: polyStr([p1, p2, b2, b1]), shade: dot(normal, LIGHT) });
  }

  return { top: pointsStr, sides };
}

/**
 * Mix a `#rrggbb` color toward white (positive amount) or black (negative),
 * clamped so a facet never goes fully flat white/black — it should still
 * read as the same colored crystal at every shade level.
 */
export function shadeHex(hex: string, amount: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return hex;
  const clamped = Math.max(-1, Math.min(1, amount));
  const t = Math.abs(clamped) * 0.72;
  const target = clamped >= 0 ? 255 : 0;
  const mix = (channel: number) => Math.round(channel + (target - channel) * t);
  const [r, g, b] = [match[1], match[2], match[3]].map((h) => mix(parseInt(h, 16)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
