import { describe, expect, it } from 'vitest';
import { chooseChainMove, choosePrimaryMove, chooseFormation } from '../bot';
import { playChainMove, playPrimaryMove } from '../game';
import { isInsideArena } from '../geometry';
import { ARCHETYPES, DEPLOY_LINE } from '../types';
import { makePiece, makeState } from './testUtils';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe('bot formation', () => {
  it('places every piece legally inside its own deployment zone', () => {
    const core = makePiece('sapphire', 'core', { x: 0, y: -45 });
    const pieces = [core, ...ARCHETYPES.slice(0, 8).map((a) => makePiece('sapphire', a, { x: 0, y: -45 }))];
    const state = makeState(pieces, { phase: 'formation' });
    const next = chooseFormation(state, 'sapphire', seeded(7));
    for (const p of next.pieces) {
      expect(isInsideArena(p.pos)).toBe(true);
      expect(p.pos.y).toBeLessThanOrEqual(-DEPLOY_LINE);
    }
  });
});

describe('bot move selection', () => {
  it('always proposes a legal primary move when one exists', () => {
    const mover = makePiece('sapphire', 'tether', { x: 0, y: -20 });
    const enemy = makePiece('garnet', 'ghost', { x: 30, y: 20 });
    const state = makeState([mover, enemy], { phase: 'battle', turn: 'sapphire' });
    const req = choosePrimaryMove(state, 'sapphire', seeded(3));
    expect(req).not.toBeNull();
    const result = playPrimaryMove(state, req!);
    expect(result.ok).toBe(true);
  });

  it('takes a free capture over a random wander', () => {
    const mover = makePiece('sapphire', 'warden', { x: 0, y: 0 });
    const juicyTarget = makePiece('garnet', 'ghost', { x: 4, y: 0 }); // within step range 8, instant capture
    const decoy = makePiece('garnet', 'ram', { x: 40, y: 40 }); // far away, irrelevant
    const state = makeState([mover, juicyTarget, decoy], { phase: 'battle', turn: 'sapphire' });
    const req = choosePrimaryMove(state, 'sapphire', seeded(11));
    expect(req).not.toBeNull();
    const result = playPrimaryMove(state, req!);
    expect(result.ok).toBe(true);
    const target = result.state.pieces.find((p) => p.id === juicyTarget.id)!;
    expect(target.alive).toBe(false);
  });

  it('produces a legal chain move or declines when a chain is offered', () => {
    const mover = makePiece('sapphire', 'ghost', { x: 0, y: 0 });
    const ally = makePiece('sapphire', 'tether', { x: 5, y: 5 }, { hasActedThisTurn: false });
    const state = makeState([mover, ally], { phase: 'battle', turn: 'sapphire' });
    const primary = playPrimaryMove(state, { kind: 'blink', pieceId: mover.id, to: { x: 2, y: 2 } });
    expect(primary.state.chain).not.toBeNull();

    const chainReq = chooseChainMove(primary.state, seeded(5));
    if (chainReq) {
      const result = playChainMove(primary.state, chainReq);
      expect(result.ok).toBe(true);
    } else {
      expect(chainReq).toBeNull();
    }
  });
});

describe('bot never picks up an already-acted or core piece', () => {
  it('skips pieces that cannot act', () => {
    const acted = makePiece('sapphire', 'tether', { x: 0, y: -20 }, { hasActedThisTurn: true });
    const core = makePiece('sapphire', 'core', { x: 0, y: -30 });
    const state = makeState([acted, core], { phase: 'battle', turn: 'sapphire' });
    const req = choosePrimaryMove(state, 'sapphire', seeded(1));
    expect(req).toBeNull();
  });
});
