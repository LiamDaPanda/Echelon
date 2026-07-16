export type PlayerId = 'sapphire' | 'garnet';

export interface Vec2 {
  x: number;
  y: number;
}

export const ARCHETYPES = [
  'lance',
  'warden',
  'ghost',
  'tether',
  'orbiter',
  'ram',
  'sentinel',
  'beacon',
  'anchor',
  'prism',
  'thorn',
  'herald',
  'facade',
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export type PieceType = Archetype | 'core';

export type MoveKind =
  | 'line-strike' // Lance
  | 'step' // Warden, Tether, Sentinel(step), Beacon, Anchor, Prism, Thorn, Facade
  | 'blink' // Ghost
  | 'arc' // Orbiter
  | 'line-shove' // Ram
  | 'aim-tripwire' // Sentinel(aim)
  | 'swap' // Herald
  | 'none'; // Core

export interface Piece {
  id: string;
  owner: PlayerId;
  type: PieceType;
  pos: Vec2;
  alive: boolean;
  /** True once this piece has acted during the current turn/chain. */
  hasActedThisTurn: boolean;
  /** Facade only: the archetype shown to the opponent until revealed. */
  maskType?: Archetype;
  /** Facade only: true once true identity has been revealed to both players. */
  revealed?: boolean;
  /** Sentinel only: current tripwire segment, if aimed. */
  tripwire?: { from: Vec2; to: Vec2 };
  /** Orbiter only: id of the ally currently being orbited/shielded, if any. */
  orbiting?: string;
}

export interface HazardField {
  id: string;
  owner: PlayerId; // owner of the Thorn that spawned it (hazard hurts the OTHER player)
  center: Vec2;
  radius: number;
  turnsRemaining: number;
}

export type GamePhase = 'draft' | 'formation' | 'reveal' | 'battle' | 'gameover';

export interface FormationState {
  sapphireReady: boolean;
  garnetReady: boolean;
}

export interface ChainState {
  /** Player whose turn it is / who owns the chain currently resolving. */
  player: PlayerId;
  /** Depth of the next bonus move, if any (1 = first bonus link). */
  depth: number;
  /** Piece id eligible to take the next bonus move. */
  eligiblePieceId: string | null;
  /** Range available to the eligible piece for its bonus move. */
  availableRange: number;
}

export interface GameState {
  phase: GamePhase;
  roster: Archetype[]; // the 8 archetypes drawn for this match
  pieces: Piece[];
  hazards: HazardField[];
  turn: PlayerId;
  turnNumber: number;
  formation: FormationState;
  chain: ChainState | null;
  winner: PlayerId | null;
  log: string[];
}

export const ARENA_RADIUS = 50;
export const DEPLOY_LINE = 15;
export const DEFAULT_RING = 5;
export const CAPTURE_RADIUS = 1.5;
