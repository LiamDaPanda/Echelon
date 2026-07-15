import { useEffect, useMemo, useState } from 'react';
import { angleTo } from '../engine/geometry';
import { declineChain, legalMoveRange, playChainMove, playPrimaryMove } from '../engine/game';
import type { MoveRequest } from '../engine/moves';
import { ROSTER } from '../engine/roster';
import type { GameState, Vec2 } from '../engine/types';
import { Board, type FlashEvent, type Trail } from './Board';
import { PLAYER_THEME } from './theme';

interface BattleScreenProps {
  state: GameState;
  onChange: (state: GameState) => void;
}

let trailCounter = 0;
let flashCounter = 0;

export function BattleScreen({ state, onChange }: BattleScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingPivotId, setPendingPivotId] = useState<string | null>(null);
  const [sentinelAiming, setSentinelAiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [flashes, setFlashes] = useState<FlashEvent[]>([]);

  const theme = PLAYER_THEME[state.turn];

  useEffect(() => {
    if (state.chain) {
      setSelectedId(state.chain.eligiblePieceId);
      setPendingPivotId(null);
      setSentinelAiming(false);
    }
  }, [state.chain]);

  const selected = useMemo(() => state.pieces.find((p) => p.id === selectedId && p.alive) ?? null, [state.pieces, selectedId]);
  const legalRange = selectedId ? legalMoveRange(state, selectedId) : null;

  function pushEffects(before: GameState, after: GameState, moverId: string, moveKind: string) {
    const beforePiece = before.pieces.find((p) => p.id === moverId);
    const afterPiece = after.pieces.find((p) => p.id === moverId);
    if (beforePiece && afterPiece && moveKind !== 'aim-tripwire') {
      trailCounter += 1;
      const trail: Trail = { id: `trail-${trailCounter}`, from: beforePiece.pos, to: afterPiece.pos, owner: beforePiece.owner };
      setTrails((t) => [...t.slice(-5), trail]);
      setTimeout(() => setTrails((t) => t.filter((x) => x.id !== trail.id)), 1600);
    }
    const diedNow = after.pieces.filter((ap) => {
      const bp = before.pieces.find((p) => p.id === ap.id);
      return bp && bp.alive && !ap.alive;
    });
    for (const dead of diedNow) {
      flashCounter += 1;
      const flash: FlashEvent = { id: `flash-${flashCounter}`, pos: dead.pos };
      setFlashes((f) => [...f, flash]);
      setTimeout(() => setFlashes((f) => f.filter((x) => x.id !== flash.id)), 700);
    }
  }

  function submit(req: MoveRequest) {
    const isChain = Boolean(state.chain);
    const result = isChain ? playChainMove(state, req) : playPrimaryMove(state, req);
    if (!result.ok) {
      setError(result.reason ?? 'Illegal move.');
      return;
    }
    setError(null);
    pushEffects(state, result.state, req.pieceId, req.kind);
    onChange(result.state);
    if (!result.state.chain) {
      setSelectedId(null);
      setPendingPivotId(null);
      setSentinelAiming(false);
    }
  }

  function handlePieceClick(id: string) {
    if (state.phase !== 'battle') return;
    const piece = state.pieces.find((p) => p.id === id && p.alive);
    if (!piece) return;
    const selectedKind = selected && selected.type !== 'core' ? ROSTER[selected.type].moveKind : null;

    if (selected && selectedKind === 'arc' && !pendingPivotId) {
      if (piece.owner === selected.owner && piece.id !== selected.id) {
        setPendingPivotId(id);
        return;
      }
    }
    if (selected && selectedKind === 'swap') {
      if (piece.owner === selected.owner && piece.id !== selected.id) {
        submit({ kind: 'swap', pieceId: selected.id, allyId: id });
        return;
      }
    }

    if (state.chain) {
      if (id !== state.chain.eligiblePieceId) return;
      setSelectedId(id);
      return;
    }

    if (piece.owner !== state.turn || piece.hasActedThisTurn || piece.type === 'core') return;
    setSelectedId(id);
    setPendingPivotId(null);
    setSentinelAiming(false);
    setError(null);
  }

  function handleBoardClick(point: Vec2) {
    if (!selected || selected.type === 'core') return;
    const kind = ROSTER[selected.type].moveKind;
    switch (kind) {
      case 'step':
        if (selected.type === 'sentinel' && sentinelAiming) {
          submit({ kind: 'aim-tripwire', pieceId: selected.id, to: point });
        } else {
          submit({ kind: 'step', pieceId: selected.id, to: point });
        }
        return;
      case 'blink':
        submit({ kind: 'blink', pieceId: selected.id, to: point });
        return;
      case 'line-strike':
        submit({ kind: 'line-strike', pieceId: selected.id, angle: angleTo(selected.pos, point) });
        return;
      case 'line-shove':
        submit({ kind: 'line-shove', pieceId: selected.id, angle: angleTo(selected.pos, point) });
        return;
      case 'arc':
        if (!pendingPivotId) {
          setError('Choose an allied pivot piece first.');
          return;
        }
        submit({ kind: 'arc', pieceId: selected.id, pivotId: pendingPivotId, to: point });
        return;
      default:
        return;
    }
  }

  return (
    <div className="echelon-battle">
      <div className="echelon-battle-board">
        <Board
          state={state}
          viewer={state.turn}
          selectedId={selectedId}
          pendingPivotId={pendingPivotId}
          legalRange={legalRange}
          trails={trails}
          flashes={flashes}
          onPieceClick={handlePieceClick}
          onBoardClick={handleBoardClick}
        />
      </div>
      <aside className="echelon-hud">
        <h2 style={{ color: theme.rim }}>{theme.label}'s turn — turn {state.turnNumber}</h2>
        {selected && selected.type !== 'core' && (
          <div className="echelon-selection">
            <strong>{ROSTER[selected.type].label}</strong> selected
            <p className="echelon-hint">{ROSTER[selected.type].description}</p>
            {selected.type === 'sentinel' && !state.chain && (
              <label className="echelon-toggle">
                <input type="checkbox" checked={sentinelAiming} onChange={(e) => setSentinelAiming(e.target.checked)} />
                Aim tripwire instead of stepping
              </label>
            )}
            {ROSTER[selected.type].moveKind === 'arc' && (
              <p className="echelon-hint">{pendingPivotId ? 'Now click a point on the orbit band.' : 'Click an allied piece to orbit.'}</p>
            )}
          </div>
        )}
        {state.chain && (
          <div className="echelon-chain-prompt">
            <p>
              Chain available! Depth {state.chain.depth}, range {state.chain.availableRange.toFixed(1)}.
            </p>
            <button
              className="echelon-btn small"
              onClick={() => {
                const result = declineChain(state);
                if (result.ok) {
                  onChange(result.state);
                  setSelectedId(null);
                }
              }}
            >
              Decline chain
            </button>
          </div>
        )}
        {error && <p className="echelon-error">{error}</p>}
        <div className="echelon-log">
          {state.log
            .slice(-8)
            .reverse()
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
      </aside>
    </div>
  );
}
