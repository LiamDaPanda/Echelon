import { angleTo, dist, pointAtAngle } from './geometry';
import { legalMoveRange, placePiece, playChainMove, playPrimaryMove } from './game';
import type { MoveRequest } from './moves';
import { ROSTER } from './roster';
import { ARENA_RADIUS, DEPLOY_LINE, type GameState, type Piece, type PlayerId, type Vec2 } from './types';

/**
 * A lightweight heuristic opponent. It doesn't search ahead — for each of its
 * unmoved pieces it samples a handful of plausible targets (enemies worth
 * hitting, allies worth chaining off of, and some exploration), asks the real
 * engine whether each resulting request is legal via `playPrimaryMove`/
 * `playChainMove` (which are pure functions), and scores the resulting state.
 * The candidate with the best score wins. This keeps the bot bound to the
 * same rules everyone else plays by — it can't cheat, it can only be dumb.
 */

function randomDeployPoint(owner: PlayerId, random: () => number): Vec2 {
  const yMagMin = DEPLOY_LINE + 2;
  const yMagMax = ARENA_RADIUS - 3;
  const yMag = yMagMin + random() * (yMagMax - yMagMin);
  const y = owner === 'sapphire' ? -yMag : yMag;
  const maxX = Math.sqrt(Math.max(0, ARENA_RADIUS * ARENA_RADIUS - yMag * yMag)) - 2;
  const x = (random() * 2 - 1) * maxX;
  return { x, y };
}

/** Place every one of the bot's pieces (including its Core) inside its own deployment zone. */
export function chooseFormation(state: GameState, player: PlayerId, random: () => number = Math.random): GameState {
  let next = state;
  const ownIds = state.pieces.filter((p) => p.owner === player).map((p) => p.id);
  for (const id of ownIds) {
    let point = randomDeployPoint(player, random);
    for (let attempt = 0; attempt < 5; attempt++) {
      const placedSoFar = next.pieces.filter((p) => p.owner === player && p.id !== id);
      const tooClose = placedSoFar.some((p) => dist(p.pos, point) < 6);
      if (!tooClose) break;
      point = randomDeployPoint(player, random);
    }
    next = placePiece(next, id, point);
  }
  return next;
}

function livingEnemies(state: GameState, player: PlayerId): Piece[] {
  return state.pieces.filter((p) => p.alive && p.owner !== player);
}

function livingAllies(state: GameState, player: PlayerId, excludeId: string): Piece[] {
  return state.pieces.filter((p) => p.alive && p.owner === player && p.id !== excludeId);
}

function candidatesForPiece(state: GameState, piece: Piece, range: number, random: () => number): MoveRequest[] {
  if (piece.type === 'core') return [];
  const moveKind = ROSTER[piece.type].moveKind;
  const enemies = livingEnemies(state, piece.owner);
  const allies = livingAllies(state, piece.owner, piece.id);
  const candidates: MoveRequest[] = [];

  const jitterPoint = (): Vec2 => {
    const angle = random() * Math.PI * 2;
    const distance = range * (0.35 + 0.65 * random());
    return pointAtAngle(piece.pos, angle, distance);
  };

  switch (moveKind) {
    case 'step':
    case 'blink': {
      for (const enemy of enemies) {
        const d = dist(piece.pos, enemy.pos);
        const target = d <= range ? enemy.pos : pointAtAngle(piece.pos, angleTo(piece.pos, enemy.pos), range);
        candidates.push({ kind: moveKind, pieceId: piece.id, to: target });
      }
      for (const ally of allies) {
        if (ally.type === 'core') continue; // the Core has no ring; nothing chains off it
        const ring = ROSTER[ally.type].ring;
        const nudgeAngle = random() * Math.PI * 2;
        const spot = pointAtAngle(ally.pos, nudgeAngle, ring * 0.6);
        const d = dist(piece.pos, spot);
        const target = d <= range ? spot : pointAtAngle(piece.pos, angleTo(piece.pos, spot), range);
        candidates.push({ kind: moveKind, pieceId: piece.id, to: target });
      }
      for (let i = 0; i < 6; i++) candidates.push({ kind: moveKind, pieceId: piece.id, to: jitterPoint() });
      // Guaranteed-legal fallback: a tiny nudge always fits inside any positive range.
      candidates.push({ kind: moveKind, pieceId: piece.id, to: pointAtAngle(piece.pos, random() * Math.PI * 2, 0.05) });
      break;
    }
    case 'line-strike':
    case 'line-shove': {
      for (const enemy of enemies) {
        candidates.push({ kind: moveKind, pieceId: piece.id, angle: angleTo(piece.pos, enemy.pos) });
      }
      for (let i = 0; i < 4; i++) {
        candidates.push({ kind: moveKind, pieceId: piece.id, angle: random() * Math.PI * 2 });
      }
      break;
    }
    case 'arc': {
      const arcMin = ROSTER.orbiter.params?.arcMin ?? 4;
      const arcMax = Math.min(ROSTER.orbiter.params?.arcMax ?? 14, range);
      for (const pivot of allies) {
        const toward = enemies[0] ? angleTo(pivot.pos, enemies[0].pos) : random() * Math.PI * 2;
        for (let i = 0; i < 3; i++) {
          const angle = i === 0 ? toward : random() * Math.PI * 2;
          const radius = arcMin + random() * Math.max(0, arcMax - arcMin);
          candidates.push({ kind: 'arc', pieceId: piece.id, pivotId: pivot.id, to: pointAtAngle(pivot.pos, angle, radius) });
        }
      }
      break;
    }
    case 'swap': {
      for (const ally of allies) {
        if (dist(piece.pos, ally.pos) <= range) {
          candidates.push({ kind: 'swap', pieceId: piece.id, allyId: ally.id });
        }
      }
      break;
    }
    default:
      break;
  }
  return candidates;
}

function scoreResult(before: GameState, after: GameState, player: PlayerId, random: () => number): number {
  if (after.phase === 'gameover') {
    return after.winner === player ? 1_000_000 : -1_000_000;
  }
  let score = 0;
  for (const piece of after.pieces) {
    const prior = before.pieces.find((p) => p.id === piece.id);
    if (prior && prior.alive && !piece.alive) {
      const weight = piece.type === 'core' ? 100_000 : 45;
      score += piece.owner === player ? -weight : weight;
    }
  }
  const enemyCore = after.pieces.find((p) => p.type === 'core' && p.owner !== player && p.alive);
  if (enemyCore) {
    const mine = after.pieces.filter((p) => p.owner === player && p.alive && p.type !== 'core');
    if (mine.length > 0) {
      const avgDist = mine.reduce((sum, p) => sum + dist(p.pos, enemyCore.pos), 0) / mine.length;
      score += (120 - avgDist) * 0.25;
    }
  }
  if (after.chain) score += 12;
  score += (random() - 0.5) * 6;
  return score;
}

/** Choose the primary move for `player`'s turn, or null if somehow nothing is legal. */
export function choosePrimaryMove(state: GameState, player: PlayerId, random: () => number = Math.random): MoveRequest | null {
  const movers = state.pieces.filter((p) => p.owner === player && p.alive && p.type !== 'core' && !p.hasActedThisTurn);
  let best: { req: MoveRequest; score: number } | null = null;

  for (const piece of movers) {
    const range = legalMoveRange(state, piece.id);
    const candidates = candidatesForPiece(state, piece, range, random);
    for (const req of candidates) {
      const result = playPrimaryMove(state, req);
      if (!result.ok) continue;
      const score = scoreResult(state, result.state, player, random);
      if (!best || score > best.score) best = { req, score };
    }
  }
  return best?.req ?? null;
}

/** Choose the chain bonus move for the currently eligible piece, or null to decline. */
export function chooseChainMove(state: GameState, random: () => number = Math.random): MoveRequest | null {
  if (!state.chain) return null;
  const piece = state.pieces.find((p) => p.id === state.chain!.eligiblePieceId);
  if (!piece) return null;
  const player = piece.owner;
  const range = legalMoveRange(state, piece.id);
  const candidates = candidatesForPiece(state, piece, range, random);
  let best: { req: MoveRequest; score: number } | null = null;
  for (const req of candidates) {
    const result = playChainMove(state, req);
    if (!result.ok) continue;
    const score = scoreResult(state, result.state, player, random);
    if (!best || score > best.score) best = { req, score };
  }
  // Decline unless the best option is actually an improvement over doing nothing.
  if (best && best.score > 0) return best.req;
  return null;
}
