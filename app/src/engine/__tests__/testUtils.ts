import type { Archetype, GameState, Piece, PlayerId, Vec2 } from '../types';

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makePiece(
  owner: PlayerId,
  type: Piece['type'],
  pos: Vec2,
  overrides: Partial<Piece> = {},
): Piece {
  return {
    id: id(type),
    owner,
    type,
    pos,
    alive: true,
    hasActedThisTurn: false,
    ...overrides,
  };
}

export function makeState(pieces: Piece[], overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'battle',
    roster: [] as Archetype[],
    pieces,
    hazards: [],
    turn: 'sapphire',
    turnNumber: 1,
    formation: { sapphireReady: true, garnetReady: true },
    chain: null,
    winner: null,
    log: [],
    ...overrides,
  };
}
