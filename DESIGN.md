# Echelon — Formal Ruleset

Echelon's premise is that skill, not accumulation, decides every match. This
document is the authoritative rules specification implemented by
`src/engine`. The pitch doc describes the fantasy; this document nails down
the numbers so the engine, the UI, and a human rules-lawyer all agree on what
happens on the glass.

## 1. The Arena

- The board is a circle of radius **50** units centered on `(0, 0)` — "the
  glass." There is no grid; every position is a continuous `(x, y)` point.
- **Deployment zones**: Sapphire (Player A) deploys with `y ≤ -15`; Garnet
  (Player B) deploys with `y ≥ 15`. The band `-15 < y < 15` is neutral no
  man's land — nothing may be placed there during formation, but pieces may
  move through and fight there once the match starts.
- All positions are clamped to stay inside the radius-50 circle. A move that
  would exit the arena is clamped to the boundary point along the same path.

## 2. Armies

- The roster has 13 piece archetypes (Lance, Warden, Ghost, Tether, Orbiter,
  Ram, Sentinel, Beacon, Anchor, Prism, Thorn, Herald, Facade) plus each
  player's **Core**.
- At the start of a match, **8 archetypes are drawn at random** from the
  13-entry roster (no repeats). Both players receive one copy of each of the
  8 drawn archetypes — armies are always identical in composition, so the
  only asymmetry in a match is the secret formation and the play that
  follows.
- Each player also has exactly one **Core**: a stationary, non-combatant
  crystal with no move action and no passive. Destroying the enemy Core wins
  the game instantly.

## 3. Formation Phase

- Each player privately places their 8 pieces and their Core anywhere inside
  their own deployment zone, without seeing the opponent's placement.
- Once both players confirm, formations are **revealed simultaneously** and
  the battle begins. Sapphire always takes the first turn (a random coin
  flip does not favor either side over the long run because formations are
  symmetric in composition, only reads differ).

## 4. Turns, Movement, and the Chain Rule

- Players alternate turns. On your turn you choose one of **your** pieces
  that has not yet acted this turn as the **primary mover** and resolve its
  move/ability per its archetype rules (§6).
- **Rings.** Every piece projects a ring of a fixed radius around itself
  (see §6 for per-archetype ring sizes; default is 5). Rings are always
  visible to both players (except the Sentinel tripwire, §6.7, which is
  hidden).
- **Chain Rule.** If a piece's move ends at a point inside an *allied*
  piece's ring, that ally becomes eligible for a **bonus move** — provided
  the ally hasn't already acted this turn and isn't nullified by an enemy
  Anchor (§6.9). A bonus move has range equal to `baseRange * 0.5^depth`
  (depth starts at 1 for the first bonus move, 2 for a bonus move triggered
  by a bonus move, etc.). The acting player may decline any bonus move. A
  chain ends when the computed range drops below **1 unit**, when the player
  declines, or when no legal targets/directions remain.
- A turn ends after the primary move and the full resolution (accept/decline)
  of any chain it triggers.

## 5. Capturing

- **Contact capture**: for step, blink, swap, and arc moves, if the
  destination point lands within **1.5 units** of an enemy piece, that piece
  is destroyed (unless shielded, §6.5).
- **Line strike** (Lance) and **line shove** (Ram) resolve capture/displacement
  as described in their archetype entries below.
- Destroying the enemy Core ends the game immediately — Sapphire or Garnet
  wins on the spot, no further resolution needed.

## 6. The Roster

Every entry lists: move type, range/parameters, ring size, and passive.

### 6.1 Lance — unlimited straight-line striker
- **Move**: choose any angle; Lance travels in a straight line with
  **unlimited range** (bounded only by the arena wall) until it meets the
  first obstruction. An allied piece blocks the line entirely (illegal
  target, Lance does not move). An enemy piece is struck: it is destroyed
  and Lance comes to rest at the point of contact (1.5 units short of the
  enemy's former position).
- **Ring**: 5. **Passive**: none — the strike range *is* the power.

### 6.2 Warden — the slowing field
- **Move**: normal step, range 8.
- **Ring**: 12 (the "slow field").
- **Passive**: any enemy piece whose position is inside a Warden's ring has
  its move range halved for the duration it remains inside the ring.

### 6.3 Ghost — the blink
- **Move**: blink up to 8 units in any direction. Ghost's blink **ignores**
  Warden fields, Sentinel tripwires, and other pieces' blocking — it simply
  reappears at the destination (still subject to the arena boundary and to
  landing close enough to an enemy to capture it by contact).
- **Ring**: 4. **Passive**: none — immunity to fields/tripwires while
  moving is the ability.

### 6.4 Tether — the chain anchor
- **Move**: normal step, range 8.
- **Ring**: 8 (larger than the default 5), making Tether the most reliable
  chain trigger/receiver on the board.
- **Passive**: none beyond the enlarged ring — Tether's whole job is to sit
  where a chain needs it.

### 6.5 Orbiter — the shield that circles
- **Move**: arc. Choose an allied pivot piece within 14 units; Orbiter moves
  along the circle of radius **4–14** around that pivot to any point on the
  arc not obstructed by another piece.
- **Ring**: 6. **Passive**: while Orbiter occupies a point on the arc around
  its current pivot (i.e., is "orbiting" that ally), the pivot ally **cannot
  be captured** by any means. Moving Orbiter away, or destroying Orbiter,
  removes the shield immediately.

### 6.6 Ram — the shove
- **Move**: choose an angle; Ram travels in a straight line, range 10. If it
  meets an enemy piece, Ram does **not** capture — instead the enemy is
  shoved **6 units** further along the same line (clamped to the arena wall,
  or stopped early if another piece blocks the shove path). Ram itself stops
  1.5 units short of the enemy's original position. Allied pieces block the
  line normally (illegal target).
- **Ring**: 5. **Passive**: none — displacement control is the ability.

### 6.7 Sentinel — the invisible tripwire
- **Move**: on its turn, Sentinel either (a) takes a normal step (range 6),
  or (b) re-aims its tripwire: a straight segment from Sentinel's current
  position out to a chosen point up to 20 units away. The tripwire is drawn
  only on the owner's screen (a "hair-thin lens-flare thread").
- **Trigger**: the first time any enemy piece's move path crosses the
  tripwire segment, that piece's move is **truncated at the crossing point**
  and the tripwire is consumed (removed). Setting a new tripwire replaces
  the old one.
- **Ring**: 5. **Passive**: the tripwire itself.

### 6.8 Beacon — the range extender
- **Move**: normal step, range 8.
- **Ring**: 14. **Passive**: allied pieces inside a Beacon's ring get **+50%**
  to their move range for as long as they remain inside it.

### 6.9 Anchor — the chain-null
- **Move**: normal step, range 7.
- **Ring**: 12. **Passive**: enemy pieces inside an Anchor's ring can
  neither trigger nor receive Chain Rule bonus moves (§4) while inside it.

### 6.10 Prism — the mirror
- **Move**: normal step, range 8.
- **Ring**: 5. **Passive**: Prism continuously copies the passive ability of
  whichever enemy piece is currently nearest to it (recomputed whenever
  passives are evaluated). If the nearest enemy is a Lance or Ghost (no
  passive), Prism has no active effect until a nearer enemy with a passive
  is in range.

### 6.11 Thorn — the lingering hazard
- **Move**: normal step, range 8.
- **Ring**: 5. **Passive**: when Thorn is destroyed, it leaves a hazard
  field (radius 8) at its final position for the next **3 turns** (counting
  both players' turns). Any enemy piece that ends a move inside the hazard
  is destroyed; the hazard itself persists (reusable) until it expires.

### 6.12 Herald — the swap
- **Move**: instead of stepping, Herald may swap positions with an allied
  piece within 14 units (both pieces simply exchange coordinates). This
  counts as Herald's move for the turn and can itself land Herald (or the
  ally, depending on which ends up where) inside a ring to trigger the Chain
  Rule.
- **Ring**: 5. **Passive**: none — repositioning utility is the ability.

### 6.13 Facade — the disguise
- **Move**: normal step, range 8.
- **Ring**: 5. **Passive**: at formation time, Facade is secretly assigned a
  **mask** — the icon/label of a different randomly chosen archetype from
  the match's roster. The opponent sees the mask, not "Facade," until the
  piece takes its first action, at which point its true identity is
  revealed to both players permanently. The owner always sees the truth.
  Facade's actual movement/ring values are always its own, regardless of the
  mask shown.

## 7. Victory

The moment a Core is destroyed, the match ends and the Core's owner loses.
There are no other win/draw conditions — attrition of every other piece is
irrelevant except insofar as it opens a lane to the Core.
