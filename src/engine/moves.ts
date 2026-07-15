import {
  clampToArena,
  dist,
  distanceToArenaBoundary,
  isInsideArena,
  pointAtAngle,
  segmentIntersection,
  sub,
} from './geometry';
import { baseRing, chainBaseRange, effectiveRange, isChainNullified, isShielded } from './passives';
import { ROSTER } from './roster';
import type { GameState, Piece, PlayerId, Vec2 } from './types';
import { ARENA_RADIUS, CAPTURE_RADIUS } from './types';

export type MoveRequest =
  | { kind: 'step'; pieceId: string; to: Vec2 }
  | { kind: 'blink'; pieceId: string; to: Vec2 }
  | { kind: 'line-strike'; pieceId: string; angle: number }
  | { kind: 'line-shove'; pieceId: string; angle: number }
  | { kind: 'arc'; pieceId: string; pivotId: string; to: Vec2 }
  | { kind: 'swap'; pieceId: string; allyId: string }
  | { kind: 'aim-tripwire'; pieceId: string; to: Vec2 };

export interface MoveResult {
  ok: boolean;
  reason?: string;
  state: GameState;
  events: string[];
  /** New position the primary mover ended up at, for chain-trigger evaluation. */
  landedAt?: Vec2;
  moverId?: string;
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function findPiece(state: GameState, id: string): Piece | undefined {
  return state.pieces.find((p) => p.id === id && p.alive);
}

const EPS = 1e-6;

/** Truncate a straight path [from,to] at the nearest crossing of an enemy's tripwire, consuming it. */
function applyTripwireTruncation(state: GameState, mover: Piece, from: Vec2, to: Vec2): { to: Vec2; events: string[] } {
  const events: string[] = [];
  let closestT = Infinity;
  let closestPoint: Vec2 | null = null;
  let ownerTripwireOwnerId: string | null = null;

  for (const p of state.pieces) {
    if (!p.alive || p.owner === mover.owner || !p.tripwire) continue;
    const hit = segmentIntersection(from, to, p.tripwire.from, p.tripwire.to);
    if (hit && hit.t < closestT) {
      closestT = hit.t;
      closestPoint = hit.point;
      ownerTripwireOwnerId = p.id;
    }
  }

  if (closestPoint && ownerTripwireOwnerId) {
    const wireOwner = state.pieces.find((p) => p.id === ownerTripwireOwnerId);
    if (wireOwner) wireOwner.tripwire = undefined;
    events.push(`${mover.type} tripped a hidden Sentinel tripwire and was halted early.`);
    return { to: closestPoint, events };
  }
  return { to, events };
}

function destroyPiece(state: GameState, piece: Piece, events: string[]) {
  piece.alive = false;
  events.push(`${piece.owner}'s ${piece.type} was destroyed.`);
  if (piece.type === 'thorn') {
    const def = ROSTER.thorn;
    const radius = def.params?.hazardRadius ?? 8;
    const turns = def.params?.hazardTurns ?? 3;
    state.hazards.push({
      id: `hazard-${piece.id}-${state.hazards.length}`,
      owner: piece.owner,
      center: { ...piece.pos },
      radius,
      turnsRemaining: turns,
    });
    events.push(`A Thorn hazard blooms where ${piece.owner}'s Thorn fell.`);
  }
  if (piece.type === 'core') {
    state.winner = piece.owner === 'sapphire' ? 'garnet' : 'sapphire';
    state.phase = 'gameover';
    events.push(`${piece.owner}'s Core shattered. ${state.winner} wins!`);
  }
}

/** Contact-capture check at a landing point; mutates state, returns whether landing is legal. */
function resolveLandingCapture(state: GameState, mover: Piece, landing: Vec2, events: string[]): boolean {
  for (const other of state.pieces) {
    if (!other.alive || other.id === mover.id) continue;
    if (dist(other.pos, landing) > CAPTURE_RADIUS) continue;
    if (other.owner === mover.owner) return false; // can't land on an ally
    if (isShielded(state, other)) return false; // shielded enemy blocks the landing spot
    destroyPiece(state, other, events);
  }
  return true;
}

function checkHazards(state: GameState, mover: Piece, events: string[]) {
  for (const hazard of state.hazards) {
    if (hazard.owner === mover.owner) continue; // only hurts the opponent of the Thorn's owner
    if (dist(hazard.center, mover.pos) <= hazard.radius) {
      destroyPiece(state, mover, events);
      return;
    }
  }
}

function firstPieceAlongRay(
  state: GameState,
  mover: Piece,
  dir: Vec2,
  maxDist: number,
): { piece: Piece; t: number } | null {
  let best: { piece: Piece; t: number } | null = null;
  for (const p of state.pieces) {
    if (!p.alive || p.id === mover.id) continue;
    const rel = sub(p.pos, mover.pos);
    const t = rel.x * dir.x + rel.y * dir.y;
    if (t < -EPS || t > maxDist + EPS) continue;
    const perp = Math.hypot(rel.x - dir.x * t, rel.y - dir.y * t);
    if (perp > CAPTURE_RADIUS) continue;
    if (!best || t < best.t) best = { piece: p, t };
  }
  return best;
}

export function applyMoveRequest(state: GameState, req: MoveRequest, rangeOverride?: number): MoveResult {
  const draft = cloneState(state);
  const mover = findPiece(draft, req.pieceId);
  const events: string[] = [];

  if (!mover) return { ok: false, reason: 'Piece not found or already destroyed.', state, events };
  if (mover.type === 'core') return { ok: false, reason: 'The Core cannot act.', state, events };

  const range = rangeOverride ?? effectiveRange(draft, mover);

  switch (req.kind) {
    case 'step':
    case 'blink': {
      if (ROSTER[mover.type].moveKind !== req.kind) {
        return { ok: false, reason: `${mover.type} cannot perform a ${req.kind} move.`, state, events };
      }
      if (!isInsideArena(req.to)) return { ok: false, reason: 'Destination is outside the arena.', state, events };
      const d = dist(mover.pos, req.to);
      if (d > range + EPS) return { ok: false, reason: 'Destination is beyond move range.', state, events };

      let landing = req.to;
      if (req.kind === 'step') {
        const trunc = applyTripwireTruncation(draft, mover, mover.pos, req.to);
        landing = trunc.to;
        events.push(...trunc.events);
      }
      mover.pos = landing;
      if (!resolveLandingCapture(draft, mover, landing, events)) {
        return { ok: false, reason: 'Destination is occupied or protected.', state, events };
      }
      mover.hasActedThisTurn = true;
      if (mover.type === 'facade') mover.revealed = true;
      checkHazards(draft, mover, events);
      return { ok: true, state: draft, events, landedAt: mover.alive ? mover.pos : undefined, moverId: mover.id };
    }
    case 'line-strike':
    case 'line-shove': {
      if (ROSTER[mover.type].moveKind !== req.kind) {
        return { ok: false, reason: `${mover.type} cannot perform a ${req.kind} move.`, state, events };
      }
      const dir = { x: Math.cos(req.angle), y: Math.sin(req.angle) };
      const wallDist = distanceToArenaBoundary(mover.pos, dir);
      const maxDist = Math.min(Number.isFinite(range) ? range : Infinity, wallDist);
      const hit = firstPieceAlongRay(draft, mover, dir, maxDist);

      if (hit && hit.piece.owner === mover.owner) {
        return { ok: false, reason: 'An allied piece blocks the line.', state, events };
      }

      let stopDist = maxDist;
      let struckEnemy: Piece | null = null;
      if (hit) {
        stopDist = Math.max(0, hit.t - CAPTURE_RADIUS);
        struckEnemy = hit.piece;
      }
      let landing = pointAtAngle(mover.pos, req.angle, stopDist);
      landing = clampToArena(landing);

      const trunc = applyTripwireTruncation(draft, mover, mover.pos, landing);
      const wasTruncated = dist(trunc.to, landing) > EPS;
      landing = trunc.to;
      events.push(...trunc.events);
      mover.pos = landing;
      mover.hasActedThisTurn = true;
      if (mover.type === 'facade') mover.revealed = true;

      if (struckEnemy && !wasTruncated) {
        if (req.kind === 'line-strike') {
          if (isShielded(draft, struckEnemy)) {
            events.push(`${struckEnemy.type} shrugs off the Lance strike, shielded by an Orbiter.`);
          } else {
            destroyPiece(draft, struckEnemy, events);
          }
        } else {
          // line-shove: displaces regardless of shield (a shield only blocks capture)
          const shoveDir = dir;
          const shoveDistance = ROSTER.ram.params?.shoveDistance ?? 6;
          const shoveWall = distanceToArenaBoundary(struckEnemy.pos, shoveDir);
          const blocker = firstPieceAlongRay(draft, struckEnemy, shoveDir, Math.min(shoveDistance, shoveWall));
          let shoveStop = Math.min(shoveDistance, shoveWall);
          if (blocker) shoveStop = Math.max(0, blocker.t - CAPTURE_RADIUS);
          struckEnemy.pos = clampToArena(pointAtAngle(struckEnemy.pos, Math.atan2(shoveDir.y, shoveDir.x), shoveStop));
          events.push(`${struckEnemy.type} is shoved back by the Ram.`);
        }
      }
      checkHazards(draft, mover, events);
      return { ok: true, state: draft, events, landedAt: mover.alive ? mover.pos : undefined, moverId: mover.id };
    }
    case 'arc': {
      if (ROSTER[mover.type].moveKind !== 'arc') {
        return { ok: false, reason: `${mover.type} cannot perform an arc move.`, state, events };
      }
      const pivot = findPiece(draft, req.pivotId);
      if (!pivot || pivot.owner !== mover.owner || pivot.id === mover.id) {
        return { ok: false, reason: 'Invalid pivot ally.', state, events };
      }
      const arcMin = ROSTER.orbiter.params?.arcMin ?? 4;
      const arcMax = Math.min(ROSTER.orbiter.params?.arcMax ?? 14, range);
      const d = dist(pivot.pos, req.to);
      if (d < arcMin - EPS || d > arcMax + EPS) {
        return { ok: false, reason: 'Destination is not on a valid orbit band around the pivot.', state, events };
      }
      if (!isInsideArena(req.to)) return { ok: false, reason: 'Destination is outside the arena.', state, events };

      mover.pos = req.to;
      if (!resolveLandingCapture(draft, mover, req.to, events)) {
        return { ok: false, reason: 'Destination is occupied or protected.', state, events };
      }
      mover.orbiting = pivot.id;
      mover.hasActedThisTurn = true;
      if (mover.type === 'facade') mover.revealed = true;
      checkHazards(draft, mover, events);
      events.push(`${mover.owner}'s Orbiter now shields ${pivot.type}.`);
      return { ok: true, state: draft, events, landedAt: mover.alive ? mover.pos : undefined, moverId: mover.id };
    }
    case 'swap': {
      if (ROSTER[mover.type].moveKind !== 'swap') {
        return { ok: false, reason: `${mover.type} cannot perform a swap.`, state, events };
      }
      const ally = findPiece(draft, req.allyId);
      if (!ally || ally.owner !== mover.owner || ally.id === mover.id) {
        return { ok: false, reason: 'Invalid swap target.', state, events };
      }
      const d = dist(mover.pos, ally.pos);
      if (d > range + EPS) return { ok: false, reason: 'Ally is beyond swap range.', state, events };

      const tmp = mover.pos;
      mover.pos = ally.pos;
      ally.pos = tmp;
      mover.hasActedThisTurn = true;
      if (mover.type === 'facade') mover.revealed = true;
      checkHazards(draft, mover, events);
      checkHazards(draft, ally, events);
      return { ok: true, state: draft, events, landedAt: mover.alive ? mover.pos : undefined, moverId: mover.id };
    }
    case 'aim-tripwire': {
      if (mover.type !== 'sentinel') {
        return { ok: false, reason: 'Only a Sentinel can aim a tripwire.', state, events };
      }
      const tripRange = ROSTER.sentinel.params?.tripwireRange ?? 20;
      const d = dist(mover.pos, req.to);
      if (d > tripRange + EPS) return { ok: false, reason: 'Tripwire target is too far.', state, events };
      if (!isInsideArena(req.to)) return { ok: false, reason: 'Tripwire target is outside the arena.', state, events };
      mover.tripwire = { from: { ...mover.pos }, to: req.to };
      mover.hasActedThisTurn = true;
      events.push(`${mover.owner}'s Sentinel re-aims its tripwire.`);
      return { ok: true, state: draft, events, moverId: mover.id };
    }
    default:
      return { ok: false, reason: 'Unknown move kind.', state, events };
  }
}

/** After a primary/bonus move lands, find an ally (not yet acted) whose ring contains the landing point. */
export function findChainTrigger(
  state: GameState,
  mover: Piece,
  landedAt: Vec2,
): { ally: Piece; ring: number } | null {
  if (isChainNullified(state, mover)) return null;
  for (const ally of state.pieces) {
    if (!ally.alive || ally.owner !== mover.owner || ally.id === mover.id) continue;
    if (ally.hasActedThisTurn) continue;
    if (ally.type === 'core') continue;
    if (isChainNullified(state, ally)) continue;
    const ring = baseRing(ally);
    if (dist(ally.pos, landedAt) <= ring) {
      return { ally, ring };
    }
  }
  return null;
}

export function chainChildRange(parentPiece: Piece, depth: number): number {
  return chainBaseRange(parentPiece) * Math.pow(0.5, depth);
}

export function tickHazards(state: GameState) {
  state.hazards = state.hazards
    .map((h) => ({ ...h, turnsRemaining: h.turnsRemaining - 1 }))
    .filter((h) => h.turnsRemaining > 0);
}

export function resetTurnActions(state: GameState, player: PlayerId) {
  for (const p of state.pieces) {
    if (p.owner === player) p.hasActedThisTurn = false;
  }
}

export function distanceToArenaEdgeFrom(pos: Vec2): number {
  return ARENA_RADIUS - Math.hypot(pos.x, pos.y);
}
