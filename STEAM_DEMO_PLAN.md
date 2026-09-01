# Steam Demo: findings, plan, and current state

This document records why the game was not playable, what was changed to make it
playable, how each change was verified, and what still stands between here and a
Steam demo. It covers the 14 commits from `5c928fc` to `fc6340d`.

The short version: the project was not suffering from a collision bug. Its
simulation loop was switched off, its rooms never mounted, and its systems were
never wired to one another. Those are fixed. There is now a core loop you can
play start to finish, and a desktop build that launches. Everything Steam-side
is still ahead.

---

## 1. Findings

Every one of these was invisible to `tsc` and to `yarn build`. All of them were
found by running the game in a real browser and measuring it.

### 1.1 The simulation loop was never running

`StartScreen.tsx` mounted the canvas with `frameloop="demand"`, and nothing in
the codebase ever called `invalidate()` — zero occurrences anywhere in `src/`.
React Three Fiber therefore scheduled no animation frames at all.

Measured with `requestAnimationFrame` instrumentation in headless Chromium:

| Route | rAF callbacks in 3s |
| --- | --- |
| Game (`frameloop="demand"`) | **0** |
| Editor (default canvas, same browser) | 1,862 |
| Game with that one prop removed | 1,406 |

With no frames, `useFrame` never ran: no player movement, no camera follow, and
Rapier never stepped on a regular cadence. Frames only happened as a side effect
of React re-rendering, and because the physics world used `timeStep="vary"`,
each of those accidental frames handed Rapier the entire wall-clock delta since
the last one. A one-second gap integrated a full second of gravity in a single
step, which teleports the capsule past any collider.

### 1.2 Falling through the floor

Four faults stacked, and room transitions triggered all of them at once:

1. **The floor was deleted.** While `isTransitioning` was true,
   `UnifiedRoomManager` returned two decorative planes and nothing else — the
   entire room, including every floor collider, was unmounted.
2. **Gravity kept running.** The movement freeze zeroed X and Z but deliberately
   preserved `velocity.y`, so the player fell in a world with no floor in it.
3. **For 2.5 seconds.** `loadRoom` slept a fake extra second, then movement was
   restored on a hardcoded `setTimeout(…, 1500)` with no relationship to whether
   the new room's colliders had mounted.
4. **The safety nets had no thickness.** Every floor — room floors, the ground
   plane, and both invisible "catch" floors whose entire job was catching a fall
   — was a `planeGeometry` with `colliders="trimesh"`. A trimesh built from a
   plane has zero thickness, and the player body had no CCD.

### 1.3 Nothing was rendering

drei's `<Text>` suspends while troika loads and compiles a font. Every room,
door and sign in the game draws text, and there was no Suspense boundary
anywhere inside the canvas — so the nearest boundary was the one wrapping the
whole room subtree.

A single pending font therefore kept the room, its floor colliders, its
collectibles and its frame loop unmounted indefinitely, with no error reported.
Measured directly: both Suspense boundaries sat in their fallback for an entire
session while the store happily reported an active room, and
`UnifiedRoomManager`'s frame callback ran exactly once.

### 1.4 Room detection had never worked

Three independent faults:

- **Wrong coordinate space.** `RoomInstanceRenderer` always draws the active
  room at the origin, but detection bounds were built from each room's position
  on the map grid. The player was tested against a room sitting somewhere else
  entirely and matched nothing.
- **The loop was dead**, per 1.3 — detection ran once per session.
- **`ROOM_CHANGE` had a subscriber but no emitter.** `domUIManager` listened for
  it; no code in the repository emitted it. The HUD's room readout could not
  update even in principle, and the panel rewrote its own innerHTML every second,
  resetting the value to its `Unknown` placeholder.

The game could not tell where the player was: no room was marked visited, no
room-enter event fired, and the HUD read `Room: Unknown` for the whole session.

### 1.5 Systems that never touched each other

- **Four score counters.** `gameStore.playerStats.points`, `gameStore.totalScore`
  (two counters in the same store, written by `addPoints` and `addScore`),
  `consolidatedGameStore.playerStats.points`, and `refBasedPlayerState.points`.
  Rooms paid into whichever their author reached for. No screen summed them.
- **The richest content was unreachable.** `MemoryGamePuzzleBiome` (1,127 lines)
  and `PressurePlatePuzzleBiome` were registered only in the editor's biome
  registry and in `RoomFactory`, which is reachable solely through
  `SingleRoom.tsx` — a file nothing imports. Roughly 1,400 lines of finished
  puzzle content no player could ever see.
- **An economy with no spenders.** `addKey`, `useKey`, `addBomb`, `useBomb`,
  `gainLife` and `updateStreak` had zero call sites outside the store. Doors had
  a `locked` state that never consulted a key.
- **No ending.** `EndBiome` took an `onVictory` prop that was never passed and
  never called. Reaching the end of the dungeon did nothing; losing every life
  did nothing. There was no game-over path anywhere in the repository.
- **39 orphaned top-level components**, including `MainMenu`, `GameUI`,
  `TutorialSystem`, `GameManager` and `InteractionManager` — all written, none
  mounted. The live HUD instead showed `Health: 100/100` and `Mana: 100/100`,
  stats that exist in no store.
- **The map was generated twice on boot**, by `GameInitializer` and by
  `UnifiedRoomManager`. The dungeon the player explored was whichever call
  landed last, and only one of the two passed the biome filter.

### 1.6 The desktop build had never been launched

`package.json` declares `"type": "module"`, so the packaged `electron/main.js`
loaded as ESM and died on `ReferenceError: require is not defined in ES module
scope`. The AppImage would not start at all.

The same entry point also opened DevTools on every launch including production,
injected a WebGL and pointer-lock probe into the renderer ending in a
`console.log` on **every mousemove**, and injected a stylesheet forcing
`animation-duration: 0.01ms` on every element. `build.icon` pointed at
`public/favicon.ico`, which does not exist.

### 1.7 Type checking was not run

`yarn build` ran `vite build` with no typecheck, hiding 280 `tsc` errors —
including two imports of modules that do not exist.

---

## 2. What changed

Fourteen commits, `5c928fc..fc6340d`.

### Phase 1 — make it run

- Removed `frameloop="demand"`; set `<Physics timeStep={1/60}>`.
- Every floor on the shipping path — room floors, the ground plane and both
  catch floors — is a solid box with a cuboid collider instead of a
  zero-thickness plane trimesh.
- Player body gets `ccd`, and fall speed is clamped to a terminal velocity so no
  single step can exceed the floor thickness.
- The transition state carries its own catch floor; `loadRoom` no longer sleeps;
  control returns when the destination room reports loaded.
- Movement applied the full camera quaternion, folding pitch into the direction
  vector — looking down slowed the player. Yaw only now.
- `components/GameText.tsx` wraps drei's `<Text>` in its own Suspense boundary;
  all 66 call sites import from there. A slow font now costs that one label.

### Phase 2 — make it one game

- Room detection moved into `RoomDetection.tsx`, which renders nothing and loads
  nothing, so room content cannot suspend it. Bounds are origin-local and are
  re-registered from the live store rather than from render state.
- `ROOM_CHANGE` is emitted; the HUD reads the real room.
- One map generation, owned by `GameInitializer`. `generateMap()` is idempotent
  in the store — call `clearMap()` first to build a new dungeon deliberately.
- Deleted the duplicate `usePlayerTeleportation.tsx` (Vite resolved the `.ts`
  sibling first, so it had never run).
- `gameStore`'s stat actions forward to the consolidated store and its
  `playerStats` is a live mirror, so all four counters became one without
  rewriting 35 call sites. `addScore` folds into `addPoints`.
- `yarn check-types` ratchets the type-error count: **280 → 138**, and the count
  may only go down. Fixing these surfaced three real runtime bugs — every
  skeleton joint anchored at the wrong point, a `console.warn` rendered as JSX,
  and action cards that threw when clicked.

### Phase 3 — make it a loop

- **Find.** One gem per room, placed at a position derived from the room id so
  it is stable across revisits. Collection is recorded per room, so walking in
  and out cannot farm it.
- **Spend.** The door to the end room stays shut until the player carries
  `GEMS_REQUIRED_FOR_END` gems, and walking through it spends them.
- **Risk.** Trap rooms place real hazards. Damage is reported as an event and
  adjudicated centrally by `RunManager`, which owns the invulnerability window,
  so one patch of spikes cannot drain three lives in three frames.
- **Resolve.** `RunManager` watches for the end room and for the last life.
  Either way the run ends, movement stops, and `RunSummary` shows gems found,
  rooms explored and time taken, with a button that resets the stores, builds a
  fresh dungeon and starts again.
- Traversal is walking through a doorway, not clicking the door mesh. Clicking
  still works; it is just no longer the only way through.

### Phase 4 — make it good

- Eight curated room types instead of thirty-eight (`DEMO_ROOM_TYPES`), including
  the two puzzle rooms that were previously unreachable. Solving either hands
  over that room's gem. Portal rooms are off — their destination was never wired
  to anything.
- Real HUD (`GameHUD`) driven by the consolidated store: lives, gems against the
  end-door target, current room. `GameUI.tsx` deleted; domUIManager's fabricated
  stats panel removed.
- `MainMenu` mounted at last. Pause no longer unmounts the canvas — it overlays
  and freezes movement through the store, so the physics world and player
  survive.
- Sound synthesised with the Web Audio API — no audio files to ship or license.

### Phase 5 — make it shippable

- `electron/main.cjs` / `preload.cjs`; `"main"` repointed. The build launches.
- Debug cruft removed from the packaged app (see 1.6).
- `node_modules` excluded from the asar: **132 MB → 6.2 MB**; AppImage
  **150 MB → 114 MiB**.
- Bundled Liberation Sans (OFL 1.1) with its license. Setting `font` alone is
  not enough — troika still queries `cdn.jsdelivr.net` for any character the
  font lacks, and the labels are full of emoji — so `GameText` also strips
  uncovered characters and the resolver is never consulted.
- Editor and authoring tools gated behind `import.meta.env.DEV` via a lazily
  imported dev-only route module. App chunk **552 kB → 344 kB**; zero tool
  strings in the production bundle.
- `scripts/generate-icon.mjs` draws the app icon using only `node:zlib`.

---

## 3. How it is verified

`scripts/smoke-test.mjs` drives the real game in Chromium: start from the menu,
walk the rooms, step on the gems, walk through the doorways, die, restart. It
asserts the player is on a floor, that traversal changed rooms, that gems were
collected, that the run ends and that restarting is clean — and fails on any
uncaught page error.

```bash
yarn dev --port 5199        # one terminal
node scripts/smoke-test.mjs # another
```

Currently **13/13 passing**. It needs `playwright-core` and a Chromium binary,
which are not project dependencies, so it is deliberately not a commit gate —
it is what you run before shipping a build.

Other measurements taken during this work:

- Dropped from y=200, the player falls at the clamped terminal velocity, lands,
  and stays. Five consecutive room transitions with no fall.
- Pause/resume leaves the canvas count at 1 and the room, room instances,
  visited set and player position byte-identical.
- Three generated dungeons contained only curated room types.
- The unpacked desktop build runs for 40 seconds with **every DNS lookup
  blackholed** and logs no errors — the game is genuinely playable offline.
- A legacy-store `addPoints(250)` / `loseLife()` moves the consolidated store and
  visibly updates the HUD.

---

## 4. What is still ahead

Nothing below is started. This is the honest gap between "playable" and
"shipped".

### Blocking a Steam release

- **Nothing Steam-side exists.** No appid, no store page, no capsule art, no
  Steamworks integration, no build uploaded.
- **Only the Linux AppImage is verified.** Windows NSIS and macOS dmg have never
  been built; they need their own hosts.
- **Nobody has played it.** The smoke test proves the loop *functions*. It says
  nothing about whether the demo is *fun*, whether three gems is the right gate,
  whether the puzzle rooms are enjoyable, or whether 15–20 minutes of content is
  actually there. Only playing it answers that.
- **No Steam Deck testing.** Gamepad support exists and was verified with a
  synthetic pad; nobody has run this on a Deck or audited UI legibility at
  1280×800.

### Known, deliberately deferred

- 138 type errors behind the ratchet, plus 53 more in a test file — there is no
  test runner installed at all, so someone must decide whether to add one or
  exclude tests from `tsconfig.app.json`.
- `useRoomActions` silently ignores callbacks for four room types, so those
  rooms' completion handlers never fire.
- ~37 orphaned components remain in the tree (`TutorialSystem`,
  `InteractionManager`, `GameManager`, …).
- `usePhysicalKeyboard` re-renders the player on every keypress.
- Two `colliders="trimesh"` floors remain, in `SpecialBiome` and the orphaned
  `SecretRoom`. Both are box geometry rather than planes, so they have volume
  and are not the tunnelling bug, and neither is in `DEMO_ROOM_TYPES` — but at
  0.2 units thick they should become cuboids before either ships.
- The dynamic-body character controller works, but Rapier's own answer is
  `KinematicCharacterController`, which react-three-rapier 2.1 does not wrap.
  A post-demo consideration, not a now one.

---

## 5. Tuning

Run rules live in `src/configs/runRules.ts`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `GEMS_REQUIRED_FOR_END` | 3 | Gems the end door costs |
| `STARTING_LIVES` | 3 | Lives a run begins with |
| `DAMAGE_COOLDOWN_SECONDS` | 1.5 | Invulnerability after a hit |

Which rooms the demo generates: `DEMO_ROOM_TYPES` in
`src/configs/mapGeneration.ts`.

---

## 6. What walking the dungeon found

`scripts/smoke-test.mjs` proved the loop was wired together, but it moved the
player with `playerTeleport` events and located each gem by re-deriving the
placement hash in the test file. Both hid faults: teleporting sets a position
directly, so it never exercises movement, collision, or arrival in a room, and a
test that recomputes the game's own formula agrees with itself no matter what the
game does.

`scripts/seeded-run.mjs` plays instead - W/A/S/D, walking over gems, walking
through doorways - and reads every position out of the running scene. Dungeon
generation is now seeded (`?seed=`), so each of the following was reproducible
before it was fixed, and the test moved one room further after each one.

### 6.1 The player was set down inside the floor on every transition

`calculatePlayerSpawnPosition` returned `y = 0.5`. The player capsule is 1.1
units tall from its centre and room floors are solid slabs, so arriving put the
capsule 0.6 units inside the floor; Rapier resolved the overlap downwards and
the player finished the transition underneath the room. Movement still ran and
still set a velocity every frame - the body simply had nowhere to go. Walking
through the first door ended the run's mobility permanently.

The old smoke test could not see this: it teleports the player to `y = 2.5`
after every transition, which is exactly the correction the bug needed.

### 6.2 Arriving spawned the player in the doorway on the far wall

`direction` is the way the player travelled, so travelling north means entering
through the new room's *south* wall. The spawn used the north edge - the far
side of the room, standing inside the doorway that leads out the other end. That
trigger fired on the next frame and travelled again. One step north out of the
start room carried the player through three rooms without a key being pressed,
and the rooms in between were never explored and never marked visited.

A doorway now also starts disarmed and arms only once the player is clear of it,
so travel means walking *into* a doorway rather than being stood in one.

### 6.3 The transition's catch floor was above the ground, not below it

`TRANSITION_FLOOR_Y` is already the slab's centre, below ground level. It was
rendered at `-TRANSITION_FLOOR_Y`, which put a hidden 2-unit slab at `+1.5` -
exactly where an arriving player is placed. It caught nothing, and the player
was pushed out of the bottom of it.

### 6.4 Rooms were built at one size and furnished at another

The generator gives rooms varying widths and records the real one in
`actualSize`. Doorways, the gem, trap hazards and the arrival spot all measured
from `actualSize`; only `Room.tsx` still built its walls and floor from the
nominal `size`. In every widened room the doors and the gem sat outside the
walls, and walking through a door left the player in the void behind them. The
collision floor also spanned `room.width`/`room.height` - the decorative shape,
derived from the nominal size - so a widened or triangular room had a floor
smaller than its own walls and a gap to fall through at the edges.

### 6.5 The exit could be placed inside another room

`createEndRoom` dropped the exit at a hardcoded `z = roomSize * 3` without
checking whether anything was there. When generation had already filled that
cell, two rooms shared one position, and door placement - which works from the
vector between two rooms - put both of that room's doorways on the same wall.
The exit is now placed in a free cell beside the room furthest from the start,
and claims that cell.

### 6.6 Winning gave control straight back

Walking through the final door starts a transition and then wins the run, in
that order, so the transition's completion re-enabled movement after the victory
freeze. The player could walk around the exit room behind their own summary
screen. The run-end freeze is now recorded in the store and outlives anything
else that hands movement back.

### Still open

- **Trap rooms can be inescapable.** Hazards are placed in a ring at
  `roomSize / 2 - 3.5`, which in a 16-unit room is the same radius as the props
  the biome furnishes it with. A player blocked by a crate there is standing on
  spikes, and loses a life every cooldown until the run ends. Seeds `demo-run-1`
  and `alpha-7` both fail this way.
- **`yarn check-types` fails at 141 against a baseline of 138**, unchanged by
  this work - the same three errors are present at `8060fd4`. Two of them are
  `Cannot find module 'fs'/'path'` in `primitiveScanner.ts`, which look like a
  missing `@types/node` rather than a code change.
- The walk itself is not perfectly reliable in heavily furnished rooms. It
  sidesteps obstacles and retries a doorway three times, which is enough for the
  default seed, but a cluttered room can still stall it.
