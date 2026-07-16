import { useId, useMemo } from 'react';
import { baseRing } from '../engine/passives';
import { ARENA_RADIUS, DEPLOY_LINE, type GameState, type Piece, type PlayerId, type Vec2 } from '../engine/types';
import { extrudePolygon, shadeHex } from './crystal';
import { ARCHETYPE_GLYPH, BOARD_BG, PIECE_SHAPE, PLAYER_THEME, type ShapeDef } from './theme';

const PIECE_RADIUS = 2.6;

export interface Trail {
  id: string;
  from: Vec2;
  to: Vec2;
  owner: PlayerId;
}

export interface FlashEvent {
  id: string;
  pos: Vec2;
}

interface BoardProps {
  state: GameState;
  viewer: PlayerId;
  selectedId: string | null;
  pendingPivotId: string | null;
  legalRange: number | null;
  trails: Trail[];
  flashes: FlashEvent[];
  onPieceClick: (pieceId: string) => void;
  onBoardClick: (point: Vec2) => void;
}

function svgPoint(evt: React.MouseEvent<SVGSVGElement>): Vec2 {
  const svg = evt.currentTarget;
  const rect = svg.getBoundingClientRect();
  const size = 110;
  const px = ((evt.clientX - rect.left) / rect.width) * size - 55;
  const py = ((evt.clientY - rect.top) / rect.height) * size - 55;
  return { x: px, y: py };
}

export function Board({
  state,
  viewer,
  selectedId,
  pendingPivotId,
  legalRange,
  trails,
  flashes,
  onPieceClick,
  onBoardClick,
}: BoardProps) {
  const livingPieces = useMemo(() => state.pieces.filter((p) => p.alive), [state.pieces]);
  const selected = livingPieces.find((p) => p.id === selectedId) ?? null;

  return (
    <svg
      viewBox="-55 -55 110 110"
      className="echelon-board"
      onClick={(e) => {
        if ((e.target as SVGElement).dataset.piece) return;
        onBoardClick(svgPoint(e));
      }}
    >
      <defs>
        <radialGradient id="glass" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#141c33" />
          <stop offset="55%" stopColor={BOARD_BG.glass} />
          <stop offset="100%" stopColor={BOARD_BG.outer} />
        </radialGradient>
        <radialGradient id="sheen" cx="30%" cy="20%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Genuinely round forms (Tether's beads, Orbiter's ring and core) read as
            polished glass/metal with a radial gradient — unlike a flat polygon, a
            sphere or torus really does shade this way under a point light. */}
        {(['sapphire', 'garnet'] as PlayerId[]).map((owner) => (
          <radialGradient key={owner} id={`bead-${owner}`} cx="32%" cy="28%" r="75%">
            <stop offset="0%" stopColor={PLAYER_THEME[owner].rim} />
            <stop offset="45%" stopColor={PLAYER_THEME[owner].base} />
            <stop offset="100%" stopColor={PLAYER_THEME[owner].deep} />
          </radialGradient>
        ))}
      </defs>

      <circle cx={0} cy={0} r={ARENA_RADIUS} fill="url(#glass)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.4} />
      <circle cx={0} cy={0} r={ARENA_RADIUS} fill="url(#sheen)" />

      <line x1={-ARENA_RADIUS} y1={-DEPLOY_LINE} x2={ARENA_RADIUS} y2={-DEPLOY_LINE} stroke={PLAYER_THEME.sapphire.glow} strokeDasharray="1.5 1.5" strokeWidth={0.3} />
      <line x1={-ARENA_RADIUS} y1={DEPLOY_LINE} x2={ARENA_RADIUS} y2={DEPLOY_LINE} stroke={PLAYER_THEME.garnet.glow} strokeDasharray="1.5 1.5" strokeWidth={0.3} />

      {state.hazards.map((h) => (
        <circle
          key={h.id}
          cx={h.center.x}
          cy={h.center.y}
          r={h.radius}
          className="echelon-hazard"
          fill="rgba(255,80,60,0.12)"
          stroke="rgba(255,110,70,0.55)"
          strokeWidth={0.3}
        />
      ))}

      {/* Rings for every living piece (chain-trigger / passive AOE radius) */}
      {livingPieces.map((p) => {
        if (p.type === 'core') return null;
        const ring = baseRing(p);
        const theme = PLAYER_THEME[p.owner];
        return (
          <circle
            key={`ring-${p.id}`}
            cx={p.pos.x}
            cy={p.pos.y}
            r={ring}
            fill="none"
            stroke={theme.glow}
            strokeWidth={0.18}
            opacity={0.35}
          />
        );
      })}

      {/* Tripwires: hidden from the opponent, per the rules. */}
      {livingPieces
        .filter((p) => p.type === 'sentinel' && p.tripwire && p.owner === viewer)
        .map((p) => (
          <line
            key={`wire-${p.id}`}
            x1={p.tripwire!.from.x}
            y1={p.tripwire!.from.y}
            x2={p.tripwire!.to.x}
            y2={p.tripwire!.to.y}
            className="echelon-tripwire"
            stroke={PLAYER_THEME[p.owner].rim}
            strokeWidth={0.15}
          />
        ))}

      {trails.map((t) => (
        <line
          key={t.id}
          x1={t.from.x}
          y1={t.from.y}
          x2={t.to.x}
          y2={t.to.y}
          className="echelon-trail"
          stroke={PLAYER_THEME[t.owner].rim}
          strokeWidth={0.6}
          strokeLinecap="round"
        />
      ))}

      {selected && legalRange !== null && Number.isFinite(legalRange) && (
        <circle
          cx={selected.pos.x}
          cy={selected.pos.y}
          r={legalRange}
          fill="none"
          stroke="white"
          strokeDasharray="0.6 0.6"
          strokeWidth={0.25}
          opacity={0.5}
        />
      )}

      {livingPieces.map((p) => (
        <PieceGlyph
          key={p.id}
          piece={p}
          viewer={viewer}
          selected={p.id === selectedId}
          pendingPivot={p.id === pendingPivotId}
          onClick={() => onPieceClick(p.id)}
        />
      ))}

      {flashes.map((f) => (
        <circle key={f.id} cx={f.pos.x} cy={f.pos.y} r={4} className="echelon-flash" fill="white" />
      ))}
    </svg>
  );
}

function displayType(piece: Piece, viewer: PlayerId) {
  if (piece.type === 'facade' && !piece.revealed && piece.owner !== viewer) {
    return piece.maskType ?? 'facade';
  }
  return piece.type;
}

function pt2(x: number, y: number): string {
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

/** A small four-point sparkle, hand-drawn rather than a plain dot. */
function sparklePoints(size: number): string {
  const pts: [number, number][] = [
    [0, -size],
    [size * 0.22, -size * 0.22],
    [size, 0],
    [size * 0.22, size * 0.22],
    [0, size],
    [-size * 0.22, size * 0.22],
    [-size, 0],
    [-size * 0.22, -size * 0.22],
  ];
  return pts.map(([x, y]) => pt2(x, y)).join(' ');
}
const SPARKLE = sparklePoints(0.5);

/** How deep the extruded bevel reads, in board units. */
const EXTRUDE_DEPTH = PIECE_RADIUS * 0.42;

/** Fixed diagonal light-split, layered on top of a crystal's flat top face for extra sparkle. */
const FACET_SPAN = PIECE_RADIUS * 1.7;
const HIGHLIGHT_FACET = `${pt2(-FACET_SPAN, -FACET_SPAN)} ${pt2(FACET_SPAN, -FACET_SPAN)} ${pt2(-FACET_SPAN, FACET_SPAN)}`;
const SHADOW_FACET = `${pt2(FACET_SPAN, -FACET_SPAN)} ${pt2(FACET_SPAN, FACET_SPAN)} ${pt2(-FACET_SPAN, FACET_SPAN)}`;

/** A faceted low-poly gem: an extruded bevel of individually-lit side facets under a flat top face. */
function CrystalGlyph({ shapePoints, owner }: { shapePoints: string; owner: PlayerId }) {
  const theme = PLAYER_THEME[owner];
  const extrusion = useMemo(() => extrudePolygon(shapePoints, EXTRUDE_DEPTH), [shapePoints]);
  const clipId = useId();

  return (
    <g>
      {extrusion.sides.map((facet, i) => (
        <polygon key={i} points={facet.points} fill={shadeHex(theme.base, facet.shade)} stroke="rgba(0,0,0,0.35)" strokeWidth={0.06} />
      ))}
      <defs>
        <clipPath id={clipId}>
          <polygon points={extrusion.top} />
        </clipPath>
      </defs>
      <polygon points={extrusion.top} fill={shadeHex(theme.base, 0.5)} stroke={theme.rim} strokeWidth={0.2} />
      <g clipPath={`url(#${clipId})`}>
        <polygon points={HIGHLIGHT_FACET} fill="#ffffff" opacity={0.18} />
        <polygon points={SHADOW_FACET} fill="#000000" opacity={0.16} />
      </g>
    </g>
  );
}

/** Two linked glass beads — rendered as separate circles so each gets its own radial highlight. */
function TetherGlyph({ owner }: { owner: PlayerId }) {
  const theme = PLAYER_THEME[owner];
  const cr = PIECE_RADIUS * 0.62;
  const dy = PIECE_RADIUS * 0.5;
  return (
    <g>
      <circle cx={0} cy={-dy} r={cr} fill={`url(#bead-${owner})`} stroke={theme.rim} strokeWidth={0.22} />
      <circle cx={0} cy={dy} r={cr} fill={`url(#bead-${owner})`} stroke={theme.rim} strokeWidth={0.22} />
    </g>
  );
}

/** A lit glass ring around a small shielded core-bead. */
function OrbiterGlyph({ shape, owner }: { shape: ShapeDef; owner: PlayerId }) {
  const theme = PLAYER_THEME[owner];
  return (
    <g>
      {shape.kind === 'path' && (
        <path d={shape.d} fillRule="evenodd" fill={`url(#bead-${owner})`} stroke={theme.rim} strokeWidth={0.22} />
      )}
      <circle cx={0} cy={0} r={PIECE_RADIUS * 0.3} fill={`url(#bead-${owner})`} stroke={theme.rim} strokeWidth={0.14} />
    </g>
  );
}

function PieceGlyph({
  piece,
  viewer,
  selected,
  pendingPivot,
  onClick,
}: {
  piece: Piece;
  viewer: PlayerId;
  selected: boolean;
  pendingPivot: boolean;
  onClick: () => void;
}) {
  const shown = displayType(piece, viewer);
  const theme = PLAYER_THEME[piece.owner];
  const shape = PIECE_SHAPE[shown](PIECE_RADIUS);
  const glintX = -PIECE_RADIUS * 0.4;
  const glintY = -PIECE_RADIUS * 0.42;

  return (
    <g
      transform={`translate(${piece.pos.x} ${piece.pos.y})`}
      data-piece={piece.id}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="echelon-piece"
    >
      {/* Invisible, larger-than-the-glyph hit area so pieces stay tappable on touch screens. */}
      <circle r={PIECE_RADIUS + 2.2} fill="transparent" pointerEvents="all" />
      {(selected || pendingPivot) && (
        <circle r={PIECE_RADIUS + 1.1} fill="none" stroke={selected ? 'white' : theme.rim} strokeWidth={0.3} opacity={0.85} />
      )}
      {shown === 'tether' ? (
        <TetherGlyph owner={piece.owner} />
      ) : shown === 'orbiter' ? (
        <OrbiterGlyph shape={shape} owner={piece.owner} />
      ) : (
        <CrystalGlyph shapePoints={shape.kind === 'polygon' ? shape.points : ''} owner={piece.owner} />
      )}
      <polygon points={SPARKLE} fill="white" opacity={0.95} transform={`translate(${glintX} ${glintY})`} />
      {shown !== 'core' && (
        <text y={PIECE_RADIUS + 1.6} textAnchor="middle" className="echelon-glyph">
          {ARCHETYPE_GLYPH[shown]}
        </text>
      )}
    </g>
  );
}
