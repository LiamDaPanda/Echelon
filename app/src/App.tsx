import { useState } from 'react';
import { beginFormation, createGame } from './engine/game';
import { ROSTER } from './engine/roster';
import type { GameState, PlayerId } from './engine/types';
import { BattleScreen } from './ui/BattleScreen';
import { FormationScreen } from './ui/FormationScreen';
import { RevealScreen } from './ui/RevealScreen';
import { PLAYER_THEME } from './ui/theme';
import { TutorialScreen } from './ui/TutorialScreen';

function DraftScreen({
  state,
  aiPlayer,
  onSetAiPlayer,
  onBegin,
  onShowTutorial,
}: {
  state: GameState;
  aiPlayer: PlayerId | null;
  onSetAiPlayer: (p: PlayerId | null) => void;
  onBegin: () => void;
  onShowTutorial: () => void;
}) {
  return (
    <div className="echelon-draft">
      <h1 className="echelon-title">
        <span style={{ color: PLAYER_THEME.sapphire.rim }}>ECHE</span>
        <span style={{ color: PLAYER_THEME.garnet.rim }}>LON</span>
      </h1>
      <p className="echelon-subtitle">Formation, foresight, and reads are everything.</p>

      <button className="echelon-btn small echelon-tutorial-link" onClick={onShowTutorial}>
        How to play
      </button>

      <div className="echelon-mode-picker">
        <button className={`echelon-mode-btn ${aiPlayer === null ? 'active' : ''}`} onClick={() => onSetAiPlayer(null)}>
          Local hotseat — two players, one device
        </button>
        <button className={`echelon-mode-btn ${aiPlayer === 'garnet' ? 'active' : ''}`} onClick={() => onSetAiPlayer('garnet')}>
          Play vs AI — you are Sapphire
        </button>
      </div>

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
  const [aiPlayer, setAiPlayer] = useState<PlayerId | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  function restart() {
    setState(createGame());
    setAiPlayer(null);
  }

  if (showTutorial) {
    return (
      <div className="echelon-app">
        <TutorialScreen onClose={() => setShowTutorial(false)} />
      </div>
    );
  }

  return (
    <div className="echelon-app">
      {state.phase === 'draft' && (
        <DraftScreen
          state={state}
          aiPlayer={aiPlayer}
          onSetAiPlayer={setAiPlayer}
          onBegin={() => setState(beginFormation(state))}
          onShowTutorial={() => setShowTutorial(true)}
        />
      )}
      {state.phase === 'formation' && (
        <FormationScreen state={state} onChange={setState} onBothReady={setState} aiPlayer={aiPlayer} />
      )}
      {state.phase === 'reveal' && <RevealScreen state={state} onChange={setState} />}
      {state.phase === 'battle' && <BattleScreen state={state} onChange={setState} aiPlayer={aiPlayer} />}
      {state.phase === 'gameover' && <GameOverScreen state={state} onRestart={restart} />}
    </div>
  );
}
