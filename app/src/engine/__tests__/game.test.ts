import { describe, expect, it } from 'vitest';
import {
  beginFormation,
  createGame,
  declineChain,
  placePiece,
  playChainMove,
  playPrimaryMove,
  setReady,
  startBattle,
} from '../game';
import { makePiece, makeState } from './testUtils';

describe('createGame', () => {
  it('draws 8 unique archetypes and mirrors them for both players', () => {
    const state = createGame(() => 0.42);
    expect(state.roster.length).toBe(8);
    expect(new Set(state.roster).size).toBe(8);

    const sapphirePieces = state.pieces.filter((p) => p.owner === 'sapphire' && p.type !== 'core');
    const garnetPieces = state.pieces.filter((p) => p.owner === 'garnet' && p.type !== 'core');
    expect(sapphirePieces.map((p) => p.type).sort()).toEqual(garnetPieces.map((p) => p.type).sort());
    expect(state.pieces.filter((p) => p.type === 'core').length).toBe(2);
  });

  it('starts in the draft phase', () => {
    const state = createGame();
    expect(state.phase).toBe('draft');
  });
});

describe('formation phase', () => {
  it('only allows placement inside the owning player deployment zone', () => {
    let state = beginFormation(createGame(() => 0.1));
    const sapphirePiece = state.pieces.find((p) => p.owner === 'sapphire' && p.type !== 'core')!;

    const illegal = placePiece(state, sapphirePiece.id, { x: 0, y: 20 }); // garnet's zone
    expect(illegal.pieces.find((p) => p.id === sapphirePiece.id)!.pos.y).not.toBe(20);

    const legal = placePiece(state, sapphirePiece.id, { x: 0, y: -20 });
    expect(legal.pieces.find((p) => p.id === sapphirePiece.id)!.pos).toEqual({ x: 0, y: -20 });
  });

  it('moves to reveal once both players ready up, then battle can start', () => {
    let state = beginFormation(createGame(() => 0.1));
    state = setReady(state, 'sapphire', true);
    expect(state.phase).toBe('formation');
    state = setReady(state, 'garnet', true);
    expect(state.phase).toBe('reveal');
    state = startBattle(state);
    expect(state.phase).toBe('battle');
    expect(state.turn).toBe('sapphire');
  });
});

describe('turn flow', () => {
  it('rejects moves from the piece owned by the player who is not on turn', () => {
    const mine = makePiece('sapphire', 'tether', { x: 0, y: -20 });
    const theirs = makePiece('garnet', 'tether', { x: 0, y: 20 });
    const state = makeState([mine, theirs], { phase: 'battle', turn: 'sapphire' });
    const result = playPrimaryMove(state, { kind: 'step', pieceId: theirs.id, to: { x: 0, y: 25 } });
    expect(result.ok).toBe(false);
  });

  it('passes the turn to the opponent after a move with no chain', () => {
    const mine = makePiece('sapphire', 'tether', { x: 0, y: -20 });
    const theirs = makePiece('garnet', 'tether', { x: 0, y: 20 });
    const state = makeState([mine, theirs], { phase: 'battle', turn: 'sapphire' });
    const result = playPrimaryMove(state, { kind: 'step', pieceId: mine.id, to: { x: 0, y: -15 } });
    expect(result.ok).toBe(true);
    expect(result.state.turn).toBe('garnet');
    expect(result.state.chain).toBeNull();
  });

  it('offers a chain bonus move when the primary move lands in an allied ring, and halves range on each link', () => {
    const mover = makePiece('sapphire', 'ghost', { x: 0, y: 0 });
    const ally = makePiece('sapphire', 'tether', { x: 5, y: 5 }); // ring 8, base range 8
    const state = makeState([mover, ally], { phase: 'battle', turn: 'sapphire' });

    const primary = playPrimaryMove(state, { kind: 'blink', pieceId: mover.id, to: { x: 2, y: 2 } });
    expect(primary.ok).toBe(true);
    expect(primary.state.chain).not.toBeNull();
    expect(primary.state.chain!.eligiblePieceId).toBe(ally.id);
    expect(primary.state.chain!.availableRange).toBeCloseTo(4); // 8 * 0.5^1
    expect(primary.state.turn).toBe('sapphire'); // turn has not passed yet

    const chainMove = playChainMove(primary.state, { kind: 'step', pieceId: ally.id, to: { x: 5, y: 5 - 3.9 } });
    expect(chainMove.ok).toBe(true);
    expect(chainMove.state.turn).toBe('garnet'); // chain resolved, no further trigger, turn passes
  });

  it('allows declining an offered chain, which ends the turn', () => {
    const mover = makePiece('sapphire', 'ghost', { x: 0, y: 0 });
    const ally = makePiece('sapphire', 'tether', { x: 5, y: 5 });
    const state = makeState([mover, ally], { phase: 'battle', turn: 'sapphire' });
    const primary = playPrimaryMove(state, { kind: 'blink', pieceId: mover.id, to: { x: 2, y: 2 } });
    expect(primary.state.chain).not.toBeNull();
    const declined = declineChain(primary.state);
    expect(declined.ok).toBe(true);
    expect(declined.state.chain).toBeNull();
    expect(declined.state.turn).toBe('garnet');
  });

  it('resets hasActedThisTurn for the new player at the start of their turn', () => {
    const mine = makePiece('sapphire', 'tether', { x: 0, y: -20 });
    const theirs = makePiece('garnet', 'tether', { x: 0, y: 20 }, { hasActedThisTurn: true });
    const state = makeState([mine, theirs], { phase: 'battle', turn: 'sapphire' });
    const result = playPrimaryMove(state, { kind: 'step', pieceId: mine.id, to: { x: 0, y: -15 } });
    const newTheirs = result.state.pieces.find((p) => p.id === theirs.id)!;
    expect(newTheirs.hasActedThisTurn).toBe(false);
  });
});
