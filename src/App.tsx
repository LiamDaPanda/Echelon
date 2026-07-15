import { useState } from 'react';
import { beginFormation, createGame } from './engine/game';
import { ROSTER } from './engine/roster';
import type { GameState } from './engine/types';
import { BattleScreen } from './ui/BattleScreen';
import { FormationScreen } from './ui/FormationScreen';
import { RevealScreen } from './ui/RevealScreen';
import { PLAYER_THEME } from './ui/theme';

function DraftScreen({ state, onBegin }: { state: GameState; onBegin: () => void }) {
  return (
    <div className="echelon-draft">
      <h1 className="echelon-title">ECHELON</h1>
      <p className="echelon-subtitle">Formation, foresight, and reads are everything.</p>
      <h2>This match's roster</h2>
      <div className="echelon-roster-grid">
        {state.roster.map((a) => (
          <div key={a} className="echelon-roster-card">
            <strong>{ROSTER[a].label}</strong>
            <p>{ROSTER[a].description}</p>
          </div>
        ))}
      </div>
      <p className="echelon-hint">Both players receive identical pieces. Only your formation and your reads decide the match.</p>
      <button className="echelon-btn" onClick={onBegin}>
        Begin formation
      </button>
    </div>
  );
}

function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const winner = state.winner!;
  const theme = PLAYER_THEME[winner];
  return (
    <div className="echelon-gameover" style={{ background: `radial-gradient(circle at 50% 30%, ${theme.deep}, #05060c)` }}>
      <h1 style={{ color: theme.rim }}>{theme.label} shatters the enemy Core</h1>
      <p>{theme.label} wins the match.</p>
      <button className="echelon-btn" onClick={onRestart}>
        New match
      </button>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<GameState>(() => createGame());

  return (
    <div className="echelon-app">
      {state.phase === 'draft' && <DraftScreen state={state} onBegin={() => setState(beginFormation(state))} />}
      {state.phase === 'formation' && <FormationScreen state={state} onChange={setState} onBothReady={setState} />}
      {state.phase === 'reveal' && <RevealScreen state={state} onChange={setState} />}
      {state.phase === 'battle' && <BattleScreen state={state} onChange={setState} />}
      {state.phase === 'gameover' && <GameOverScreen state={state} onRestart={() => setState(createGame())} />}
    </div>
  );
}
