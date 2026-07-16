import { useMemo } from 'react';
import { baseRing } from '../engine/passives';
import { ARENA_RADIUS, DEPLOY_LINE, type GameState, type Piece, type PlayerId, type Vec2 } from '../engine/types';
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

/** Fixed diagonal light-split used to fake gem facets, clipped to each piece's own silhouette. */
const FACET_SPAN = PIECE_RADIUS * 1.7;
const HIGHLIGHT_FACET = `${pt2(-FACET_SPAN, -FACET_SPAN)} ${pt2(FACET_SPAN, -FACET_SPAN)} ${pt2(-FACET_SPAN, FACET_SPAN)}`;
const SHADOW_FACET = `${pt2(FACET_SPAN, -FACET_SPAN)} ${pt2(FACET_SPAN, FACET_SPAN)} ${pt2(-FACET_SPAN, FACET_SPAN)}`;

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

function ShapeOutline({ shape, ...rest }: { shape: ShapeDef } & React.SVGProps<SVGPolygonElement | SVGPathElement>) {
  if (shape.kind === 'polygon') {
    return <polygon points={shape.points} {...(rest as React.SVGProps<SVGPolygonElement>)} />;
  }
  return <path d={shape.d} fillRule="evenodd" {...(rest as React.SVGProps<SVGPathElement>)} />;
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
  const clipId = `clip-${piece.id}`;
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
      {(selected || pendingPivot) && (
        <circle r={PIECE_RADIUS + 1.1} fill="none" stroke={selected ? 'white' : theme.rim} strokeWidth={0.3} opacity={0.85} />
      )}
      <defs>
        <clipPath id={clipId}>
          <ShapeOutline shape={shape} />
        </clipPath>
      </defs>
      <ShapeOutline shape={shape} fill={theme.base} stroke={theme.rim} strokeWidth={0.22} />
      {shown === 'orbiter' && <circle cx={0} cy={0} r={PIECE_RADIUS * 0.3} fill={theme.rim} />}
      <g clipPath={`url(#${clipId})`}>
        <polygon points={HIGHLIGHT_FACET} fill="#ffffff" opacity={0.22} />
        <polygon points={SHADOW_FACET} fill="#000000" opacity={0.24} />
      </g>
      <polygon points={SPARKLE} fill="white" opacity={0.95} transform={`translate(${glintX} ${glintY})`} />
      {shown !== 'core' && (
        <text y={PIECE_RADIUS + 1.6} textAnchor="middle" className="echelon-glyph">
          {ARCHETYPE_GLYPH[shown]}
        </text>
      )}
    </g>
  );
}
