import { isInsideArena } from './geometry';
import {
  applyMoveRequest,
  chainChildRange,
  findChainTrigger,
  resetTurnActions,
  tickHazards,
  type MoveRequest,
} from './moves';
import { effectiveRange } from './passives';
import { drawRoster, ROSTER } from './roster';
import {
  ARENA_RADIUS,
  DEPLOY_LINE,
  type Archetype,
  type GameState,
  type Piece,
  type PlayerId,
  type Vec2,
} from './types';

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function opponentOf(player: PlayerId): PlayerId {
  return player === 'sapphire' ? 'garnet' : 'sapphire';
}

export function createGame(random: () => number = Math.random): GameState {
  const roster = drawRoster(random, 8);
  const pieces: Piece[] = [];

  for (const owner of ['sapphire', 'garnet'] as PlayerId[]) {
    pieces.push({
      id: nextId('core'),
      owner,
      type: 'core',
      pos: { x: 0, y: owner === 'sapphire' ? -ARENA_RADIUS + 5 : ARENA_RADIUS - 5 },
      alive: true,
      hasActedThisTurn: false,
    });
    const maskPool = [...roster];
    for (const archetype of roster) {
      const piece: Piece = {
        id: nextId(archetype),
        owner,
        type: archetype,
        pos: { x: 0, y: owner === 'sapphire' ? -ARENA_RADIUS + 5 : ARENA_RADIUS - 5 },
        alive: true,
        hasActedThisTurn: false,
      };
      if (archetype === 'facade') {
        const otherOptions = maskPool.filter((a) => a !== 'facade');
        const mask = otherOptions[Math.floor(random() * otherOptions.length)] ?? 'facade';
        piece.maskType = mask;
        piece.revealed = false;
      }
      pieces.push(piece);
    }
  }

  return {
    phase: 'draft',
    roster,
    pieces,
    hazards: [],
    turn: 'sapphire',
    turnNumber: 1,
    formation: { sapphireReady: false, garnetReady: false },
    chain: null,
    winner: null,
    log: [`A match begins. Roster: ${roster.map((a) => ROSTER[a].label).join(', ')}.`],
  };
}

export function beginFormation(state: GameState): GameState {
  return { ...state, phase: 'formation' };
}

function isInOwnZone(owner: PlayerId, pos: Vec2): boolean {
  if (!isInsideArena(pos)) return false;
  if (owner === 'sapphire') return pos.y <= -DEPLOY_LINE;
  return pos.y >= DEPLOY_LINE;
}

export function placePiece(state: GameState, pieceId: string, pos: Vec2): GameState {
  const piece = state.pieces.find((p) => p.id === pieceId);
  if (!piece) return state;
  if (!isInOwnZone(piece.owner, pos)) return state;
  const next = { ...state, pieces: state.pieces.map((p) => (p.id === pieceId ? { ...p, pos: { ...pos } } : p)) };
  return next;
}

export function setReady(state: GameState, player: PlayerId, ready: boolean): GameState {
  const formation = { ...state.formation };
  if (player === 'sapphire') formation.sapphireReady = ready;
  else formation.garnetReady = ready;
  let phase = state.phase;
  if (formation.sapphireReady && formation.garnetReady) phase = 'reveal';
  return { ...state, formation, phase };
}

export function startBattle(state: GameState): GameState {
  return { ...state, phase: 'battle', turn: 'sapphire', turnNumber: 1, log: [...state.log, 'Formations revealed. Sapphire moves first.'] };
}

export interface TurnResult {
  ok: boolean;
  reason?: string;
  state: GameState;
}

/** Apply the primary move for the current player's turn. */
export function playPrimaryMove(state: GameState, req: MoveRequest): TurnResult {
  if (state.phase !== 'battle') return { ok: false, reason: 'Not in battle phase.', state };
  if (state.chain) return { ok: false, reason: 'Resolve the current chain before starting a new move.', state };

  const mover = state.pieces.find((p) => p.id === req.pieceId);
  if (!mover || !mover.alive) return { ok: false, reason: 'Piece not found.', state };
  if (mover.owner !== state.turn) return { ok: false, reason: "It is not this piece's turn." , state };
  if (mover.hasActedThisTurn) return { ok: false, reason: 'This piece already acted this turn.', state };

  const result = applyMoveRequest(state, req);
  if (!result.ok) return { ok: false, reason: result.reason, state };

  let next = result.state;
  next = { ...next, log: [...next.log, ...result.events] };

  if (next.phase === 'gameover') {
    return { ok: true, state: next };
  }

  if (result.landedAt && result.moverId) {
    const freshMover = next.pieces.find((p) => p.id === result.moverId)!;
    const trigger = findChainTrigger(next, freshMover, result.landedAt);
    if (trigger) {
      const availableRange = chainChildRange(freshMover, 1);
      next = {
        ...next,
        chain: { player: state.turn, depth: 1, eligiblePieceId: trigger.ally.id, availableRange },
      };
      return { ok: true, state: next };
    }
  }

  next = endTurn(next);
  return { ok: true, state: next };
}

/** Accept the currently offered chain bonus move. */
export function playChainMove(state: GameState, req: MoveRequest): TurnResult {
  if (state.phase !== 'battle' || !state.chain) return { ok: false, reason: 'No chain is available.', state };
  if (req.pieceId !== state.chain.eligiblePieceId) {
    return { ok: false, reason: 'That piece is not the eligible chain mover.', state };
  }

  const result = applyMoveRequest(state, req, state.chain.availableRange);
  if (!result.ok) return { ok: false, reason: result.reason, state };

  let next = result.state;
  next = { ...next, log: [...next.log, ...result.events], chain: null };

  if (next.phase === 'gameover') {
    return { ok: true, state: next };
  }

  if (result.landedAt && result.moverId) {
    const freshMover = next.pieces.find((p) => p.id === result.moverId)!;
    const trigger = findChainTrigger(next, freshMover, result.landedAt);
    if (trigger) {
      const depth = state.chain.depth + 1;
      const availableRange = chainChildRange(freshMover, depth);
      if (availableRange >= 1) {
        next = {
          ...next,
          chain: { player: state.turn, depth, eligiblePieceId: trigger.ally.id, availableRange },
        };
        return { ok: true, state: next };
      }
    }
  }

  next = endTurn(next);
  return { ok: true, state: next };
}

export function declineChain(state: GameState): TurnResult {
  if (!state.chain) return { ok: false, reason: 'No chain to decline.', state };
  const next = endTurn({ ...state, chain: null });
  return { ok: true, state: next };
}

function endTurn(state: GameState): GameState {
  const nextPlayer = opponentOf(state.turn);
  let next: GameState = {
    ...state,
    pieces: state.pieces.map((p) => ({ ...p })),
    hazards: state.hazards.map((h) => ({ ...h })),
  };
  tickHazards(next);
  next.turn = nextPlayer;
  next.turnNumber = state.turnNumber + 1;
  resetTurnActions(next, nextPlayer);
  return next;
}

export function legalMoveRange(state: GameState, pieceId: string): number {
  const piece = state.pieces.find((p) => p.id === pieceId);
  if (!piece) return 0;
  if (state.chain && state.chain.eligiblePieceId === pieceId) return state.chain.availableRange;
  return effectiveRange(state, piece);
}

export function archetypeLabel(type: Archetype): string {
  return ROSTER[type].label;
}
