import type { Archetype, PieceType, PlayerId } from '../engine/types';

export const PLAYER_THEME: Record<PlayerId, { base: string; deep: string; rim: string; glow: string; label: string }> = {
  sapphire: {
    base: '#2d5bff',
    deep: '#101a4a',
    rim: '#7ff5ff',
    glow: 'rgba(127, 245, 255, 0.55)',
    label: 'Sapphire',
  },
  garnet: {
    base: '#8a1030',
    deep: '#3a0712',
    rim: '#ff9d7a',
    glow: 'rgba(255, 157, 122, 0.5)',
    label: 'Garnet',
  },
};

export const BOARD_BG = {
  outer: '#03040a',
  glass: '#070b18',
  sheen: 'rgba(255,255,255,0.06)',
  line: 'rgba(255,255,255,0.08)',
};

export type ShapeDef = { kind: 'polygon'; points: string } | { kind: 'path'; d: string };

function pt(x: number, y: number): string {
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

/** A hand-placed outline, scaled by r. Each archetype gets its own silhouette family
 * (a spear, a shield, a mask, a ring...) rather than an interchangeable N-gon, so a
 * piece is readable by shape alone before you ever read its letter. */
function poly(r: number, unitPoints: Array<[number, number]>): ShapeDef {
  return { kind: 'polygon', points: unitPoints.map(([x, y]) => pt(x * r, y * r)).join(' ') };
}

function ringPath(r: number, outer: number, inner: number): ShapeDef {
  const o = r * outer;
  const i = r * inner;
  return {
    kind: 'path',
    d: `M ${-o} 0 A ${o} ${o} 0 1 0 ${o} 0 A ${o} ${o} 0 1 0 ${-o} 0 Z M ${-i} 0 A ${i} ${i} 0 1 1 ${i} 0 A ${i} ${i} 0 1 1 ${-i} 0 Z`,
  };
}

function chainLinkPath(r: number): ShapeDef {
  const cr = r * 0.62;
  const dy = r * 0.5;
  const loop = (cx: number, cy: number) =>
    `M ${cx - cr} ${cy} A ${cr} ${cr} 0 1 0 ${cx + cr} ${cy} A ${cr} ${cr} 0 1 0 ${cx - cr} ${cy} Z`;
  return { kind: 'path', d: `${loop(0, -dy)} ${loop(0, dy)}` };
}

export const PIECE_SHAPE: Record<PieceType, (r: number) => ShapeDef> = {
  // A faceted heart-cut gem: taller than wide, the crystal the whole match protects.
  core: (r) =>
    poly(r * 1.15, [
      [0, -1.3],
      [0.62, -0.55],
      [0.8, 0.25],
      [0, 1.25],
      [-0.8, 0.25],
      [-0.62, -0.55],
    ]),
  // A spear with a crossguard — the unlimited-range striker.
  lance: (r) =>
    poly(r, [
      [0, -1.5],
      [0.16, -0.55],
      [0.5, -0.4],
      [0.16, -0.15],
      [0, 1.3],
      [-0.16, -0.15],
      [-0.5, -0.4],
      [-0.16, -0.55],
    ]),
  // A squat heraldic shield — the slowing bastion.
  warden: (r) =>
    poly(r, [
      [-0.85, -0.85],
      [0.85, -0.85],
      [0.95, 0.15],
      [0, 1.2],
      [-0.95, 0.15],
    ]),
  // An asymmetric wisp with a curling tail — never quite the same shape twice.
  ghost: (r) =>
    poly(r, [
      [0, -1.2],
      [0.5, -0.35],
      [0.32, 0.35],
      [0.62, 1.05],
      [0.05, 0.6],
      [-0.35, 1.15],
      [-0.48, 0.3],
      [-0.5, -0.4],
    ]),
  // Two linked loops — literally a chain link.
  tether: (r) => chainLinkPath(r),
  // A ring around a small core — a piece that shields whatever it circles.
  orbiter: (r) => ringPath(r, 1.05, 0.5),
  // A blunt, wide-based wedge — mass built to shove, not to pierce.
  ram: (r) =>
    poly(r, [
      [0, -1.3],
      [0.9, 0.15],
      [0.5, 0.15],
      [0.5, 1.05],
      [-0.5, 1.05],
      [-0.5, 0.15],
      [-0.9, 0.15],
    ]),
  // A tall thin watch-obelisk with a narrowed eye slit.
  sentinel: (r) =>
    poly(r, [
      [0, -1.35],
      [0.3, -0.75],
      [0.22, -0.5],
      [0.3, 1.05],
      [-0.3, 1.05],
      [-0.22, -0.5],
      [-0.3, -0.75],
    ]),
  // A lit bulb on a flared base — the piece that throws light further.
  beacon: (r) =>
    poly(r, [
      [0, -1.3],
      [0.55, -0.9],
      [0.65, -0.15],
      [0.35, 0.25],
      [0.35, 1.0],
      [-0.35, 1.0],
      [-0.35, 0.25],
      [-0.65, -0.15],
      [-0.55, -0.9],
    ]),
  // A literal anchor.
  anchor: (r) =>
    poly(r, [
      [-0.55, -1],
      [0.55, -1],
      [0.55, -0.3],
      [0.15, -0.3],
      [0.15, 0.8],
      [0.7, 0.5],
      [0.45, 1],
      [0, 0.75],
      [-0.45, 1],
      [-0.7, 0.5],
      [-0.15, 0.8],
      [-0.15, -0.3],
      [-0.55, -0.3],
    ]),
  // A single clean triangular prism.
  prism: (r) =>
    poly(r, [
      [0, -1.2],
      [1.05, 0.9],
      [-1.05, 0.9],
    ]),
  // An irregular jagged bramble — organic, not a clean symmetrical star.
  thorn: (r) =>
    poly(r, [
      [0, -1.3],
      [0.2, -0.4],
      [0.75, -0.55],
      [0.3, 0.05],
      [0.85, 0.55],
      [0.15, 0.45],
      [0.35, 1.2],
      [-0.1, 0.5],
      [-0.7, 0.9],
      [-0.25, 0.15],
      [-0.8, -0.25],
      [-0.15, -0.3],
    ]),
  // Two opposed chevrons — a swap/exchange glyph.
  herald: (r) =>
    poly(r, [
      [-1, -0.85],
      [0, -0.15],
      [1, -0.85],
      [1, 0.85],
      [0, 0.15],
      [-1, 0.85],
    ]),
  // A mask: a rounded face outline with one eye-slit notch, never a perfect regular shape.
  facade: (r) =>
    poly(r, [
      [0, -1.2],
      [0.68, -0.85],
      [0.55, -0.15],
      [0.9, 0.05],
      [0.55, 0.9],
      [0, 1.2],
      [-0.55, 0.9],
      [-0.9, 0.05],
      [-0.55, -0.15],
      [-0.68, -0.85],
    ]),
};

export const ARCHETYPE_GLYPH: Record<Archetype, string> = {
  lance: 'L',
  warden: 'W',
  ghost: 'G',
  tether: 'T',
  orbiter: 'O',
  ram: 'R',
  sentinel: 'S',
  beacon: 'B',
  anchor: 'A',
  prism: 'P',
  thorn: 'H',
  herald: 'E',
  facade: 'F',
};
