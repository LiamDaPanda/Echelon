import { ARCHETYPES, DEFAULT_RING, type Archetype, type MoveKind } from './types';

export interface ArchetypeDef {
  type: Archetype;
  label: string;
  moveKind: MoveKind;
  /** Base move range in arena units. Infinity for Lance's strike. */
  range: number;
  ring: number;
  description: string;
  /** Extra numeric parameters specific to a handful of archetypes. */
  params?: Record<string, number>;
}

export const ROSTER: Record<Archetype, ArchetypeDef> = {
  lance: {
    type: 'lance',
    label: 'Lance',
    moveKind: 'line-strike',
    range: Infinity,
    ring: DEFAULT_RING,
    description: 'Unlimited straight-line strikes at any angle.',
  },
  warden: {
    type: 'warden',
    label: 'Warden',
    moveKind: 'step',
    range: 8,
    ring: 12,
    description: "A slowing field: enemies inside Warden's ring move at half range.",
  },
  ghost: {
    type: 'ghost',
    label: 'Ghost',
    moveKind: 'blink',
    range: 8,
    ring: 4,
    description: 'Short blinks that ignore fields and sightlines.',
  },
  tether: {
    type: 'tether',
    label: 'Tether',
    moveKind: 'step',
    range: 8,
    ring: 8,
    description: "Grants an ally a bonus chain move via its enlarged ring.",
  },
  orbiter: {
    type: 'orbiter',
    label: 'Orbiter',
    moveKind: 'arc',
    range: 14,
    ring: 6,
    description: 'Arcs around an ally and shields the piece it circles.',
    params: { arcMin: 4, arcMax: 14 },
  },
  ram: {
    type: 'ram',
    label: 'Ram',
    moveKind: 'line-shove',
    range: 10,
    ring: DEFAULT_RING,
    description: 'A shoving dash that displaces instead of captures.',
    params: { shoveDistance: 6 },
  },
  sentinel: {
    type: 'sentinel',
    label: 'Sentinel',
    moveKind: 'step',
    range: 6,
    ring: DEFAULT_RING,
    description: 'An invisible tripwire that halts the first enemy crossing it.',
    params: { tripwireRange: 20 },
  },
  beacon: {
    type: 'beacon',
    label: 'Beacon',
    moveKind: 'step',
    range: 8,
    ring: 14,
    description: "Extends nearby allies' move range by 50%.",
    params: { rangeBonus: 0.5 },
  },
  anchor: {
    type: 'anchor',
    label: 'Anchor',
    moveKind: 'step',
    range: 7,
    ring: 12,
    description: 'Nullifies enemy chain moves within its ring.',
  },
  prism: {
    type: 'prism',
    label: 'Prism',
    moveKind: 'step',
    range: 8,
    ring: DEFAULT_RING,
    description: "Copies the nearest enemy's passive ability.",
  },
  thorn: {
    type: 'thorn',
    label: 'Thorn',
    moveKind: 'step',
    range: 8,
    ring: DEFAULT_RING,
    description: 'Leaves a lingering hazard field when destroyed.',
    params: { hazardRadius: 8, hazardTurns: 3 },
  },
  herald: {
    type: 'herald',
    label: 'Herald',
    moveKind: 'swap',
    range: 14,
    ring: DEFAULT_RING,
    description: 'Swaps positions with a nearby ally.',
  },
  facade: {
    type: 'facade',
    label: 'Facade',
    moveKind: 'step',
    range: 8,
    ring: DEFAULT_RING,
    description: 'Disguised as another piece until it acts.',
  },
};

export function drawRoster(random: () => number = Math.random, count = 8): Archetype[] {
  const pool = [...ARCHETYPES];
  const drawn: Archetype[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(random() * pool.length);
    drawn.push(pool.splice(idx, 1)[0]);
  }
  return drawn;
}
