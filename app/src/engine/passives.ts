import { dist } from './geometry';
import { ROSTER } from './roster';
import type { GameState, Piece } from './types';

/** Archetypes whose passive is a generic "affects pieces inside my ring" field. */
export type FieldArchetype = 'warden' | 'beacon' | 'anchor';

export function baseRange(piece: Piece): number {
  if (piece.type === 'core') return 0;
  return ROSTER[piece.type].range;
}

export function baseRing(piece: Piece): number {
  if (piece.type === 'core') return 0;
  return ROSTER[piece.type].ring;
}

/** For chain-halving math, Lance's infinite range needs a finite stand-in. */
export function chainBaseRange(piece: Piece): number {
  const r = baseRange(piece);
  return Number.isFinite(r) ? r : 100;
}

function livingPieces(state: GameState): Piece[] {
  return state.pieces.filter((p) => p.alive);
}

export function nearestEnemy(state: GameState, piece: Piece): Piece | null {
  let best: Piece | null = null;
  let bestDist = Infinity;
  for (const other of livingPieces(state)) {
    if (other.owner === piece.owner) continue;
    const d = dist(piece.pos, other.pos);
    if (d < bestDist) {
      bestDist = d;
      best = other;
    }
  }
  return best;
}

/**
 * Which field-style passive (if any) a piece currently grants. Normal
 * warden/beacon/anchor pieces grant their own. A Prism grants whichever of
 * those three archetypes is its currently-nearest enemy (Prism does not
 * copy non-field passives like Sentinel's tripwire or Orbiter's shield,
 * since those don't generalize to an arbitrary piece's ring).
 */
export function grantedFieldArchetype(state: GameState, piece: Piece): FieldArchetype | null {
  if (piece.type === 'warden' || piece.type === 'beacon' || piece.type === 'anchor') {
    return piece.type;
  }
  if (piece.type === 'prism') {
    const enemy = nearestEnemy(state, piece);
    if (enemy && (enemy.type === 'warden' || enemy.type === 'beacon' || enemy.type === 'anchor')) {
      return enemy.type;
    }
  }
  return null;
}

function fieldSources(state: GameState, archetype: FieldArchetype): Array<{ piece: Piece; ring: number }> {
  const result: Array<{ piece: Piece; ring: number }> = [];
  for (const p of livingPieces(state)) {
    if (grantedFieldArchetype(state, p) === archetype) {
      result.push({ piece: p, ring: ROSTER[archetype].ring });
    }
  }
  return result;
}

/** Is `piece` currently standing inside an enemy Warden-style slow field? */
export function isSlowed(state: GameState, piece: Piece): boolean {
  return fieldSources(state, 'warden').some(
    (s) => s.piece.owner !== piece.owner && dist(s.piece.pos, piece.pos) <= s.ring,
  );
}

/** Is `piece` currently standing inside an allied Beacon-style range field? */
export function isBeaconed(state: GameState, piece: Piece): boolean {
  return fieldSources(state, 'beacon').some(
    (s) => s.piece.owner === piece.owner && s.piece.id !== piece.id && dist(s.piece.pos, piece.pos) <= s.ring,
  );
}

/** Is `piece` currently standing inside an enemy Anchor's chain-null ring? */
export function isChainNullified(state: GameState, piece: Piece): boolean {
  return fieldSources(state, 'anchor').some(
    (s) => s.piece.owner !== piece.owner && dist(s.piece.pos, piece.pos) <= s.ring,
  );
}

/** Is `piece` currently shielded by an allied Orbiter circling it? */
export function isShielded(state: GameState, piece: Piece): boolean {
  return livingPieces(state).some((p) => p.type === 'orbiter' && p.orbiting === piece.id && p.owner === piece.owner);
}

/**
 * The move range a piece has *right now*, after Warden slow / Beacon boost.
 * Ghost's blink ignores fields entirely, per its passive.
 */
export function effectiveRange(state: GameState, piece: Piece): number {
  let r = baseRange(piece);
  if (piece.type === 'ghost') return r;
  if (isSlowed(state, piece)) r *= 0.5;
  if (isBeaconed(state, piece)) r *= 1.5;
  return r;
}
