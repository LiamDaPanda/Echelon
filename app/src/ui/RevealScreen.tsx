import { startBattle } from '../engine/game';
import type { GameState, PlayerId } from '../engine/types';
import { Board } from './Board';
import { PLAYER_THEME } from './theme';

interface RevealScreenProps {
  state: GameState;
  onChange: (state: GameState) => void;
}

export function RevealScreen({ state, onChange }: RevealScreenProps) {
  return (
    <div className="echelon-reveal">
      <h1>Formations revealed</h1>
      <p>Both armies are locked in. Study the board, then begin the match.</p>
      <div className="echelon-battle-board">
        <Board
          state={state}
          viewer={state.turn}
          selectedId={null}
          pendingPivotId={null}
          legalRange={null}
          trails={[]}
          flashes={[]}
          onPieceClick={() => {}}
          onBoardClick={() => {}}
        />
      </div>
      <div className="echelon-legend">
        {(['sapphire', 'garnet'] as PlayerId[]).map((owner) => (
          <span key={owner} style={{ color: PLAYER_THEME[owner].rim }}>
            ● {PLAYER_THEME[owner].label}
          </span>
        ))}
      </div>
      <button className="echelon-btn" onClick={() => onChange(startBattle(state))}>
        Begin battle
      </button>
    </div>
  );
}
