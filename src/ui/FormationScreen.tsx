import { useMemo, useState } from 'react';
import { chooseFormation } from '../engine/bot';
import { opponentOf, placePiece, setReady } from '../engine/game';
import { ROSTER } from '../engine/roster';
import { ARCHETYPES, type GameState, type PlayerId, type Vec2 } from '../engine/types';
import { Board } from './Board';
import { ARCHETYPE_GLYPH, PLAYER_THEME } from './theme';

interface FormationScreenProps {
  state: GameState;
  onChange: (state: GameState) => void;
  onBothReady: (state: GameState) => void;
  /** If set, this player's formation is placed and readied automatically by the bot. */
  aiPlayer?: PlayerId | null;
}

export function FormationScreen({ state, onChange, onBothReady, aiPlayer = null }: FormationScreenProps) {
  const humanFirst: PlayerId = aiPlayer === 'sapphire' ? 'garnet' : 'sapphire';
  const [gateOpenFor, setGateOpenFor] = useState<PlayerId>(humanFirst);
  const [gateShown, setGateShown] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const player = gateOpenFor;
  const theme = PLAYER_THEME[player];

  const own = useMemo(
    () => state.pieces.filter((p) => p.owner === player).sort((a, b) => (a.type === 'core' ? -1 : b.type === 'core' ? 1 : 0)),
    [state.pieces, player],
  );

  if (gateShown) {
    return (
      <div className="echelon-gate" style={{ background: `radial-gradient(circle at 30% 20%, ${theme.deep}, #04060d)` }}>
        <h1 style={{ color: theme.rim }}>Pass the device to {theme.label}</h1>
        <p>Arrange your formation in secret. Your opponent should look away.</p>
        <button className="echelon-btn" style={{ borderColor: theme.rim }} onClick={() => setGateShown(false)}>
          I am {theme.label} — begin formation
        </button>
      </div>
    );
  }

  return (
    <div className="echelon-formation">
      <div className="echelon-formation-header" style={{ color: theme.rim }}>
        <h2>{theme.label} formation</h2>
        <p>Select a piece below, then click your deployment zone to place it. Place all pieces, including your Core, to ready up.</p>
      </div>
      <div className="echelon-formation-body">
        <Board
          state={state}
          viewer={player}
          selectedId={selectedId}
          pendingPivotId={null}
          legalRange={null}
          trails={[]}
          flashes={[]}
          onPieceClick={(id) => {
            const piece = state.pieces.find((p) => p.id === id);
            if (piece && piece.owner === player) setSelectedId(id);
          }}
          onBoardClick={(point: Vec2) => {
            if (!selectedId) return;
            const next = placePiece(state, selectedId, point);
            onChange(next);
          }}
        />
        <aside className="echelon-formation-roster">
          {own.map((p) => (
            <button
              key={p.id}
              className={`echelon-roster-item ${selectedId === p.id ? 'active' : ''}`}
              style={{ borderColor: theme.rim }}
              onClick={() => setSelectedId(p.id)}
            >
              <span className="echelon-glyph-badge">{p.type === 'core' ? '◆' : ARCHETYPE_GLYPH[p.type]}</span>
              {p.type === 'core' ? 'Core' : ROSTER[p.type].label}
            </button>
          ))}
        </aside>
      </div>
      <div className="echelon-formation-footer">
        <button
          className="echelon-btn"
          style={{ borderColor: theme.rim }}
          onClick={() => {
            let next = setReady(state, player, true);
            if (aiPlayer && next.phase !== 'reveal') {
              // The bot plays instantly — no gate, no waiting.
              next = chooseFormation(next, aiPlayer);
              next = setReady(next, aiPlayer, true);
            }
            if (next.phase === 'reveal') {
              onBothReady(next);
              return;
            }
            onChange(next);
            setGateOpenFor(opponentOf(player));
            setGateShown(true);
            setSelectedId(null);
          }}
        >
          Ready — pass device
        </button>
      </div>
    </div>
  );
}

export const ROSTER_COUNT = ARCHETYPES.length;
