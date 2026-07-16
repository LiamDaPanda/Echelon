import { describe, expect, it } from 'vitest';
import { applyMoveRequest, findChainTrigger } from '../moves';
import { makePiece, makeState } from './testUtils';

describe('step move', () => {
  it('allows a move within range and captures a landed-on enemy', () => {
    const mover = makePiece('sapphire', 'warden', { x: 0, y: -20 });
    const enemy = makePiece('garnet', 'ghost', { x: 4, y: -20 });
    const state = makeState([mover, enemy]);

    const result = applyMoveRequest(state, { kind: 'step', pieceId: mover.id, to: { x: 4, y: -20 } });

    expect(result.ok).toBe(true);
    const newEnemy = result.state.pieces.find((p) => p.id === enemy.id)!;
    expect(newEnemy.alive).toBe(false);
  });

  it('rejects a move beyond the piece range', () => {
    const mover = makePiece('sapphire', 'warden', { x: 0, y: -20 }); // range 8
    const state = makeState([mover]);
    const result = applyMoveRequest(state, { kind: 'step', pieceId: mover.id, to: { x: 0, y: -30 } });
    expect(result.ok).toBe(false);
  });

  it('rejects landing on an ally', () => {
    const mover = makePiece('sapphire', 'warden', { x: 0, y: -20 });
    const ally = makePiece('sapphire', 'ghost', { x: 4, y: -20 });
    const state = makeState([mover, ally]);
    const result = applyMoveRequest(state, { kind: 'step', pieceId: mover.id, to: { x: 4, y: -20 } });
    expect(result.ok).toBe(false);
  });
});

describe('Warden slow field & Beacon extension', () => {
  it('halves an enemy piece move range while inside a Warden ring', () => {
    const warden = makePiece('sapphire', 'warden', { x: 0, y: 0 }); // ring 12
    const enemy = makePiece('garnet', 'tether', { x: 5, y: 0 }); // inside ring, base range 8 -> 4
    const state = makeState([warden, enemy]);

    // 4.5 units away should now be out of range (half of 8 is 4)
    const tooFar = applyMoveRequest(state, { kind: 'step', pieceId: enemy.id, to: { x: 5 + 4.5, y: 0 } });
    expect(tooFar.ok).toBe(false);

    const justRight = applyMoveRequest(state, { kind: 'step', pieceId: enemy.id, to: { x: 5 + 3.9, y: 0 } });
    expect(justRight.ok).toBe(true);
  });

  it('does not slow Ghost blinks, which ignore fields', () => {
    const warden = makePiece('sapphire', 'warden', { x: 0, y: 0 });
    const ghost = makePiece('garnet', 'ghost', { x: 5, y: 0 }); // inside ring, base blink range 8
    const state = makeState([warden, ghost]);
    const result = applyMoveRequest(state, { kind: 'blink', pieceId: ghost.id, to: { x: 5 + 7.9, y: 0 } });
    expect(result.ok).toBe(true);
  });

  it('extends an allied piece move range while inside a Beacon ring', () => {
    const beacon = makePiece('sapphire', 'beacon', { x: 0, y: 0 }); // ring 14
    const ally = makePiece('sapphire', 'tether', { x: 5, y: 0 }); // base range 8 -> 12
    const state = makeState([beacon, ally]);
    const result = applyMoveRequest(state, { kind: 'step', pieceId: ally.id, to: { x: 5 + 11.9, y: 0 } });
    expect(result.ok).toBe(true);
  });
});

describe('Lance line-strike', () => {
  it('captures the first enemy in line and stops at contact', () => {
    const lance = makePiece('sapphire', 'lance', { x: 0, y: 0 });
    const enemy = makePiece('garnet', 'ghost', { x: 10, y: 0 });
    const state = makeState([lance, enemy]);
    const result = applyMoveRequest(state, { kind: 'line-strike', pieceId: lance.id, angle: 0 });
    expect(result.ok).toBe(true);
    const newEnemy = result.state.pieces.find((p) => p.id === enemy.id)!;
    expect(newEnemy.alive).toBe(false);
    const newLance = result.state.pieces.find((p) => p.id === lance.id)!;
    expect(newLance.pos.x).toBeCloseTo(8.5, 1);
  });

  it('is blocked entirely by an allied piece in the line', () => {
    const lance = makePiece('sapphire', 'lance', { x: 0, y: 0 });
    const ally = makePiece('sapphire', 'ghost', { x: 10, y: 0 });
    const state = makeState([lance, ally]);
    const result = applyMoveRequest(state, { kind: 'line-strike', pieceId: lance.id, angle: 0 });
    expect(result.ok).toBe(false);
  });

  it('travels to the arena wall when nothing is in the way', () => {
    const lance = makePiece('sapphire', 'lance', { x: 0, y: 0 });
    const state = makeState([lance]);
    const result = applyMoveRequest(state, { kind: 'line-strike', pieceId: lance.id, angle: 0 });
    expect(result.ok).toBe(true);
    const newLance = result.state.pieces.find((p) => p.id === lance.id)!;
    expect(newLance.pos.x).toBeCloseTo(50, 1);
  });
});

describe('Ram line-shove', () => {
  it('displaces an enemy instead of capturing it', () => {
    const ram = makePiece('sapphire', 'ram', { x: 0, y: 0 });
    const enemy = makePiece('garnet', 'ghost', { x: 5, y: 0 });
    const state = makeState([ram, enemy]);
    const result = applyMoveRequest(state, { kind: 'line-shove', pieceId: ram.id, angle: 0 });
    expect(result.ok).toBe(true);
    const newEnemy = result.state.pieces.find((p) => p.id === enemy.id)!;
    expect(newEnemy.alive).toBe(true);
    expect(newEnemy.pos.x).toBeCloseTo(11, 1); // shoved 6 units further
    const newRam = result.state.pieces.find((p) => p.id === ram.id)!;
    expect(newRam.pos.x).toBeCloseTo(3.5, 1);
  });
});

describe('Orbiter shield', () => {
  it('prevents capture of the piece it is orbiting', () => {
    const orbiter = makePiece('sapphire', 'orbiter', { x: 0, y: 0 });
    const ally = makePiece('sapphire', 'tether', { x: 20, y: 0 });
    const attacker = makePiece('garnet', 'ghost', { x: 24, y: 0 });
    const state = makeState([orbiter, ally, attacker]);

    const arcResult = applyMoveRequest(state, {
      kind: 'arc',
      pieceId: orbiter.id,
      pivotId: ally.id,
      to: { x: 20 - 6, y: 0 },
    });
    expect(arcResult.ok).toBe(true);
    const shieldedState = arcResult.state;

    const captureAttempt = applyMoveRequest(shieldedState, {
      kind: 'step',
      pieceId: attacker.id,
      to: { x: 20, y: 0 },
    });
    expect(captureAttempt.ok).toBe(false);
  });
});

describe('Sentinel tripwire', () => {
  it('halts the first enemy move that crosses it and is then consumed', () => {
    const sentinel = makePiece('sapphire', 'sentinel', { x: 0, y: -10 }, {
      tripwire: { from: { x: -20, y: 0 }, to: { x: 20, y: 0 } },
    });
    const enemy = makePiece('garnet', 'tether', { x: 0, y: 5 }); // range 8, will cross y=0 line
    const state = makeState([sentinel, enemy]);

    const result = applyMoveRequest(state, { kind: 'step', pieceId: enemy.id, to: { x: 0, y: -3 } });
    expect(result.ok).toBe(true);
    const movedEnemy = result.state.pieces.find((p) => p.id === enemy.id)!;
    expect(movedEnemy.pos.y).toBeCloseTo(0, 1);

    const newSentinel = result.state.pieces.find((p) => p.id === sentinel.id)!;
    expect(newSentinel.tripwire).toBeUndefined();
  });

  it('does not affect Ghost blinks', () => {
    const sentinel = makePiece('sapphire', 'sentinel', { x: 0, y: -10 }, {
      tripwire: { from: { x: -20, y: 0 }, to: { x: 20, y: 0 } },
    });
    const enemy = makePiece('garnet', 'ghost', { x: 0, y: 5 });
    const state = makeState([sentinel, enemy]);
    const result = applyMoveRequest(state, { kind: 'blink', pieceId: enemy.id, to: { x: 0, y: -3 } });
    expect(result.ok).toBe(true);
    const movedEnemy = result.state.pieces.find((p) => p.id === enemy.id)!;
    expect(movedEnemy.pos.y).toBeCloseTo(-3, 1);
  });
});

describe('Thorn hazard', () => {
  it('spawns a hazard when Thorn dies and destroys the next enemy that enters it', () => {
    const thorn = makePiece('sapphire', 'thorn', { x: 0, y: 0 });
    const attacker = makePiece('garnet', 'lance', { x: 5, y: 0 });
    const state = makeState([thorn, attacker]);

    const strike = applyMoveRequest(state, { kind: 'line-strike', pieceId: attacker.id, angle: Math.PI });
    expect(strike.ok).toBe(true);
    const afterThorn = strike.state.pieces.find((p) => p.id === thorn.id)!;
    expect(afterThorn.alive).toBe(false);
    expect(strike.state.hazards.length).toBe(1);

    const victim = makePiece('garnet', 'ghost', { x: -15, y: 0 });
    const withVictim = { ...strike.state, pieces: [...strike.state.pieces, victim] };
    const enter = applyMoveRequest(withVictim, { kind: 'blink', pieceId: victim.id, to: { x: -7, y: 0 } });
    expect(enter.ok).toBe(true);
    const deadVictim = enter.state.pieces.find((p) => p.id === victim.id)!;
    expect(deadVictim.alive).toBe(false);
  });
});

describe('Herald swap', () => {
  it('exchanges positions with an ally within range', () => {
    const herald = makePiece('sapphire', 'herald', { x: 0, y: 0 });
    const ally = makePiece('sapphire', 'tether', { x: 10, y: 0 });
    const state = makeState([herald, ally]);
    const result = applyMoveRequest(state, { kind: 'swap', pieceId: herald.id, allyId: ally.id });
    expect(result.ok).toBe(true);
    const newHerald = result.state.pieces.find((p) => p.id === herald.id)!;
    const newAlly = result.state.pieces.find((p) => p.id === ally.id)!;
    expect(newHerald.pos.x).toBeCloseTo(10);
    expect(newAlly.pos.x).toBeCloseTo(0);
  });
});

describe('Facade reveal', () => {
  it('reveals true identity after its first action', () => {
    const facade = makePiece('sapphire', 'facade', { x: 0, y: 0 }, { maskType: 'lance', revealed: false });
    const state = makeState([facade]);
    const result = applyMoveRequest(state, { kind: 'step', pieceId: facade.id, to: { x: 3, y: 0 } });
    expect(result.ok).toBe(true);
    const revealed = result.state.pieces.find((p) => p.id === facade.id)!;
    expect(revealed.revealed).toBe(true);
  });
});

describe('Chain rule trigger', () => {
  it('finds an eligible ally when a mover lands in its ring', () => {
    const mover = makePiece('sapphire', 'ghost', { x: 0, y: 0 });
    const ally = makePiece('sapphire', 'tether', { x: 5, y: 5 }); // ring 8
    const state = makeState([mover, ally]);
    const trigger = findChainTrigger(state, mover, { x: 2, y: 2 });
    expect(trigger?.ally.id).toBe(ally.id);
  });

  it('ignores an ally that already acted this turn', () => {
    const mover = makePiece('sapphire', 'ghost', { x: 0, y: 0 });
    const ally = makePiece('sapphire', 'tether', { x: 5, y: 5 }, { hasActedThisTurn: true });
    const state = makeState([mover, ally]);
    const trigger = findChainTrigger(state, mover, { x: 2, y: 2 });
    expect(trigger).toBeNull();
  });
});

describe('Anchor chain-null', () => {
  it('prevents an enemy piece inside its ring from receiving a chain bonus', () => {
    const anchor = makePiece('garnet', 'anchor', { x: 0, y: 0 }); // ring 12
    const mover = makePiece('sapphire', 'ghost', { x: 2, y: 2 }); // landed inside the Anchor's ring
    const ally = makePiece('sapphire', 'tether', { x: 5, y: 5 });
    const state = makeState([anchor, mover, ally]);
    const trigger = findChainTrigger(state, mover, { x: 2, y: 2 });
    expect(trigger).toBeNull();
  });
});

describe('Core destruction ends the game', () => {
  it('sets the winner and phase when a Core is captured', () => {
    const mover = makePiece('sapphire', 'warden', { x: 0, y: -20 });
    const core = makePiece('garnet', 'core', { x: 3, y: -20 });
    const state = makeState([mover, core]);
    const result = applyMoveRequest(state, { kind: 'step', pieceId: mover.id, to: { x: 3, y: -20 } });
    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('gameover');
    expect(result.state.winner).toBe('sapphire');
  });
});
