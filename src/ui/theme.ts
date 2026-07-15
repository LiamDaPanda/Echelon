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

/** Silhouette generator keyed by archetype, so each piece is readable at a glance. */
export const PIECE_SHAPE: Record<PieceType, (r: number) => string> = {
  core: (r) => diamond(r * 1.3),
  lance: (r) => spike(r),
  warden: (r) => polygon(r, 6),
  ghost: (r) => teardrop(r),
  tether: (r) => polygon(r, 5),
  orbiter: (r) => polygon(r, 7),
  ram: (r) => arrowhead(r),
  sentinel: (r) => obelisk(r),
  beacon: (r) => burst(r, 8),
  anchor: (r) => anchorShape(r),
  prism: (r) => polygon(r, 3),
  thorn: (r) => burst(r, 5),
  herald: (r) => bowtie(r),
  facade: (r) => polygon(r, 9),
};

function pt(x: number, y: number): string {
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

function polygon(r: number, sides: number, rotate = -Math.PI / 2): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotate + (i / sides) * Math.PI * 2;
    pts.push(pt(Math.cos(a) * r, Math.sin(a) * r));
  }
  return pts.join(' ');
}

function diamond(r: number): string {
  return [pt(0, -r), pt(r * 0.7, 0), pt(0, r), pt(-r * 0.7, 0)].join(' ');
}

function spike(r: number): string {
  return [pt(0, -r * 1.3), pt(r * 0.35, r * 0.3), pt(0, r * 0.7), pt(-r * 0.35, r * 0.3)].join(' ');
}

function teardrop(r: number): string {
  return [
    pt(0, -r),
    pt(r * 0.6, r * 0.2),
    pt(r * 0.35, r),
    pt(-r * 0.35, r),
    pt(-r * 0.6, r * 0.2),
  ].join(' ');
}

function arrowhead(r: number): string {
  return [pt(0, -r * 1.2), pt(r * 0.9, r * 0.6), pt(0, r * 0.1), pt(-r * 0.9, r * 0.6)].join(' ');
}

function obelisk(r: number): string {
  return [pt(0, -r * 1.3), pt(r * 0.3, -r * 0.2), pt(r * 0.3, r), pt(-r * 0.3, r), pt(-r * 0.3, -r * 0.2)].join(' ');
}

function burst(r: number, spikes: number): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? r * 1.1 : r * 0.42;
    pts.push(pt(Math.cos(a) * radius, Math.sin(a) * radius));
  }
  return pts.join(' ');
}

function anchorShape(r: number): string {
  return [
    pt(-r * 0.55, -r),
    pt(r * 0.55, -r),
    pt(r * 0.55, -r * 0.3),
    pt(r * 0.15, -r * 0.3),
    pt(r * 0.15, r * 0.8),
    pt(r * 0.7, r * 0.5),
    pt(r * 0.45, r),
    pt(0, r * 0.75),
    pt(-r * 0.45, r),
    pt(-r * 0.7, r * 0.5),
    pt(-r * 0.15, r * 0.8),
    pt(-r * 0.15, -r * 0.3),
    pt(-r * 0.55, -r * 0.3),
  ].join(' ');
}

function bowtie(r: number): string {
  return [
    pt(-r, -r * 0.8),
    pt(0, -r * 0.15),
    pt(r, -r * 0.8),
    pt(r, r * 0.8),
    pt(0, r * 0.15),
    pt(-r, r * 0.8),
  ].join(' ');
}

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
