import { PIECE_SHAPE, PLAYER_THEME, type ShapeDef } from './theme';

interface TutorialScreenProps {
  onClose: () => void;
}

function MiniPiece({ shape, owner, x, y }: { shape: ShapeDef; owner: 'sapphire' | 'garnet'; x: number; y: number }) {
  const theme = PLAYER_THEME[owner];
  return (
    <g transform={`translate(${x} ${y})`}>
      {shape.kind === 'polygon' ? (
        <polygon points={shape.points} fill={theme.base} stroke={theme.rim} strokeWidth={0.6} />
      ) : (
        <path d={shape.d} fillRule="evenodd" fill={theme.base} stroke={theme.rim} strokeWidth={0.6} />
      )}
    </g>
  );
}

function BoardDiagram() {
  return (
    <svg viewBox="-50 -50 100 100" className="echelon-tutorial-diagram">
      <circle cx={0} cy={0} r={48} fill="#0b0e1c" stroke="rgba(255,255,255,0.15)" strokeWidth={0.6} />
      <line x1={-48} y1={-14} x2={48} y2={-14} stroke={PLAYER_THEME.sapphire.glow} strokeDasharray="2 2" strokeWidth={0.5} />
      <line x1={-48} y1={14} x2={48} y2={14} stroke={PLAYER_THEME.garnet.glow} strokeDasharray="2 2" strokeWidth={0.5} />
      <text x={0} y={-41} textAnchor="middle" className="echelon-diagram-label" fill={PLAYER_THEME.sapphire.rim}>
        Sapphire deploys here
      </text>
      <text x={0} y={0} textAnchor="middle" className="echelon-diagram-label" fill="rgba(255,255,255,0.5)">
        neutral ground — no pieces placed here
      </text>
      <text x={0} y={44} textAnchor="middle" className="echelon-diagram-label" fill={PLAYER_THEME.garnet.rim}>
        Garnet deploys here
      </text>
      <MiniPiece shape={PIECE_SHAPE.lance(6)} owner="sapphire" x={-20} y={-27} />
      <MiniPiece shape={PIECE_SHAPE.warden(6)} owner="sapphire" x={10} y={-20} />
      <MiniPiece shape={PIECE_SHAPE.ram(6)} owner="garnet" x={-8} y={21} />
      <MiniPiece shape={PIECE_SHAPE.ghost(6)} owner="garnet" x={22} y={28} />
    </svg>
  );
}

function ChainDiagram() {
  return (
    <svg viewBox="-50 -36 100 72" className="echelon-tutorial-diagram">
      {/* Tether's ring */}
      <circle cx={12} cy={0} r={26} fill="none" stroke={PLAYER_THEME.sapphire.glow} strokeWidth={0.5} opacity={0.6} />
      {/* trail of the primary mover into the ring */}
      <line x1={-38} y1={-10} x2={2} y2={-2} stroke={PLAYER_THEME.sapphire.rim} strokeWidth={1} strokeLinecap="round" opacity={0.8} />
      {/* bonus move trail, half range, dashed to mark it as the chain link */}
      <line x1={12} y1={0} x2={30} y2={14} stroke={PLAYER_THEME.sapphire.rim} strokeWidth={0.8} strokeDasharray="2 1.5" strokeLinecap="round" opacity={0.8} />
      <MiniPiece shape={PIECE_SHAPE.ghost(5)} owner="sapphire" x={-40} y={-12} />
      <MiniPiece shape={PIECE_SHAPE.ghost(5)} owner="sapphire" x={2} y={-2} />
      <MiniPiece shape={PIECE_SHAPE.tether(6)} owner="sapphire" x={12} y={0} />
      <MiniPiece shape={PIECE_SHAPE.tether(6)} owner="sapphire" x={30} y={14} />
      <text x={-40} y={-20} textAnchor="middle" className="echelon-diagram-label" fill="rgba(255,255,255,0.6)">
        1. moves in
      </text>
      <text x={12} y={-30} textAnchor="middle" className="echelon-diagram-label" fill="rgba(255,255,255,0.6)">
        Tether's ring
      </text>
      <text x={30} y={26} textAnchor="middle" className="echelon-diagram-label" fill="rgba(255,255,255,0.6)">
        2. bonus move, half range
      </text>
    </svg>
  );
}

export function TutorialScreen({ onClose }: TutorialScreenProps) {
  return (
    <div className="echelon-tutorial">
      <div className="echelon-tutorial-header">
        <h1 className="echelon-tutorial-title">How to play</h1>
        <button className="echelon-btn small" onClick={onClose}>
          Back to draft
        </button>
      </div>
      <div className="echelon-tutorial-body">
        <div className="echelon-tutorial-section">
          <h2>The board</h2>
          <BoardDiagram />
          <p>
            There's no grid. The arena is a continuous circle of glass — positions, distances, and angles all matter exactly, not just which
            square you're in.
          </p>
          <p>
            Each side has its own half to set up in, split by a neutral strip down the middle that no piece may be placed in during
            formation.
          </p>
        </div>

        <div className="echelon-tutorial-section">
          <h2>Formation is secret</h2>
          <p>
            Before a match starts, each player privately arranges their army — including their Core, the crystal that loses them the game
            if it shatters.
          </p>
          <p>
            Both players get the exact same 8 pieces, drawn at random from the roster. The only edge either side has is how they read the
            board and how they set their trap.
          </p>
        </div>

        <div className="echelon-tutorial-section">
          <h2>Every piece moves differently</h2>
          <p>
            A Warden steps a short distance. A Lance strikes in a straight line at unlimited range. A Ghost blinks past fields and
            tripwires. An Orbiter arcs around an ally and shields it. Check the roster card on the draft screen for exactly how each
            piece in your match moves — its silhouette is a hint too.
          </p>
          <p>Landing on (or striking) an enemy destroys it, unless something is shielding it.</p>
        </div>

        <div className="echelon-tutorial-section">
          <h2>The chain rule</h2>
          <ChainDiagram />
          <p>
            Every piece has a ring around it. If your move ends inside an ally's ring, that ally immediately gets a bonus move — at half
            its normal range.
          </p>
          <p>
            That bonus move can chain into a third piece's ring too, at a quarter range, and so on, until the range gets too small to
            matter. You can always decline a chain if you'd rather not.
          </p>
        </div>

        <div className="echelon-tutorial-section">
          <h2>Winning</h2>
          <p>
            Shatter the enemy Core and the match ends immediately. Nothing else on the board matters except how it gets you there — or
            keeps them from getting to yours.
          </p>
        </div>
      </div>
      <div className="echelon-tutorial-footer">
        <button className="echelon-btn" onClick={onClose}>
          Got it — back to draft
        </button>
      </div>
    </div>
  );
}
