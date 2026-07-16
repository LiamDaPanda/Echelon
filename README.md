# Echelon

A turn-based, one-versus-one digital strategy game where the only thing
that decides a match is player skill. No levels, no unlockable characters,
no rank-gated content, no external meta — every tool exists from the first
match, and both players always field perfectly mirrored resources.

Play unfolds on a freeform board with no grid: a continuous plane of
polished black glass where movement is measured in distances, angles,
rings, and sightlines. Each match deals both players the same random
selection of pieces, followed by a secret formation phase where each
player privately arranges their army before a simultaneous reveal.
Victory comes from shattering the enemy Core.

See [`DESIGN.md`](./DESIGN.md) for the full, formal ruleset — arena
geometry, the chain rule, and exact numbers for all 13 archetypes.

## Running it

The app lives in [`app/`](./app); the repo root is reserved for the
published static site (see "Deployment" below).

```bash
cd app
npm install
npm run dev      # local dev server
npm run test     # engine unit tests (vitest)
npm run build    # typecheck + production build
```

## What's here

- **`app/src/engine/`** — the rules engine: pure TypeScript, no rendering
  concerns. `types.ts` and `geometry.ts` are the primitives; `roster.ts`
  encodes each archetype's stats; `passives.ts` computes rings, fields,
  and shields; `moves.ts` resolves a single move/capture/chain-trigger;
  `game.ts` is the phase state machine (draft → formation → reveal →
  battle → gameover). Covered by unit tests in `app/src/engine/__tests__/`.
- **`app/src/ui/`** — the React/SVG presentation layer: a duotone
  sapphire-vs-garnet palette, a glossy black-glass arena, crystalline
  piece silhouettes (one shape per archetype, each with a signature glint
  point), rings as refracted halos, capture flashes, and fading movement
  trails.
- **`app/src/engine/bot.ts`** — a heuristic AI opponent. It doesn't search
  ahead; for each unmoved piece it samples plausible targets (enemies
  worth hitting, allies worth chaining off of, some exploration), asks
  the real engine whether each candidate move is legal, and scores the
  resulting positions (captures, proximity to the enemy Core, chain
  setups). It plays by the same rules as everyone else — it can't cheat,
  it can only be dumb.
- **`app/src/App.tsx`** — screen orchestration, for both local hotseat and
  vs-AI matches.

## Deployment

This repo's GitHub Pages is configured to serve straight from the `main`
branch's root — not from a GitHub Actions artifact — and that setting isn't
reachable through the API tools available to automate it. So instead of
fighting that, [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)
builds `app/` on every push to `main` and commits the output (`index.html`,
`favicon.svg`, `assets/`) straight into the repo root, which is exactly what
Pages already serves — no settings changes required. `app/vite.config.ts`
builds with a relative base and `outDir: '../'` to make that work.

## Playing a match

Pick a mode on the draft screen:

- **Local hotseat** — two players, one device, pass-and-play.
- **Play vs AI** — you play Sapphire; the bot plays Garnet and moves on
  its own turns.

1. **Draft** — the app draws 8 of the 13 archetypes at random; both
   players get identical armies.
2. **Formation** — a "pass the device" gate opens the board privately for
   each human player in turn. Select a piece from the list, then click
   your deployment zone (your half of the arena) to place it. Ready up to
   hand the device to the other player. In vs-AI mode, the bot places its
   own formation instantly the moment you ready up — no gate, no wait.
2. **Reveal** — once both players are ready, formations are shown and the
   match begins.
3. **Battle** — click one of your own not-yet-acted pieces to select it,
   then click the board to act:
   - **Step/blink pieces** (Warden, Ghost, Tether, Beacon, Anchor, Prism,
     Thorn, Facade, Sentinel) — click a destination point.
   - **Lance/Ram** — click anywhere to aim; the piece strikes/shoves along
     that angle at unlimited/fixed range.
   - **Orbiter** — click an allied pivot first, then a point on the orbit
     band around it.
   - **Herald** — click an allied piece to swap with it.
   - **Sentinel** — check "aim tripwire" to re-aim its hidden tripwire
     instead of stepping.

   Landing inside an ally's ring offers a chain bonus move at half range;
   accept it by acting with the highlighted piece, or decline.

**On hidden information**: real hiddenness (secret formations, Sentinel
tripwires, an unrevealed Facade) is enforced in the data model, not just
the UI. Formation phase is genuinely private via the pass-the-device gate.
Battle-phase Sentinel tripwires and Facade masks are rendered only to the
piece's non-owner by data, matching the intended "invisible to the
opponent" rule — but because hotseat play shares one physical screen the
whole time, an opponent who keeps watching during your turn can peek.
Treat that as an honor-system limit of local hotseat, not a rules bug; a
networked mode would enforce it for real.
