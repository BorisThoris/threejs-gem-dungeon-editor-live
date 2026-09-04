# Steam Demo: findings, plan, and current state

> **The game was rebuilt from scratch.** Sections 1 and 2 are history: they
> describe the original tree and the work done inside it, and the files and
> numbers they name mostly no longer exist. That tree is preserved at the
> `pre-greenfield` tag and branch. Section 0 explains the rebuild, and
> sections 3 onwards describe the game as it stands now.

## 0. The rebuild

After the fixes below, the tree was 63,000 lines in 303 files. An import
walk from the game's entry point showed that the game reached 168 of them;
54 were the editors and 83 were reachable from nothing at all. Of what the
game did reach: six state stores, 99 room kinds of which eight were played,
a `Room` type with forty optional fields including `humidity`, and a floor
positioned from a number that came from the 2D map view. Every bug fixed in
the last week was the same bug - two modules holding different values for
one fact - and the architecture invited it because nothing owned anything.

Three decisions were taken: keep the editors and port them onto the new
architecture; replace the mouse-driven hand with the game's one interaction
verb; and build in a fresh `src/` rather than refactor in place.

What exists now is about 5,300 lines. One store, one bus, one owner for
every constant, one place that computes positions inside a room, one
catalogue of props, one registry of surfaces, one registry of room
templates. The generator is connected by construction and stressed over
300 seeds. The editor writes into the registries the game reads, so a room
laid out in the builder is placed by the generator the next run, and a
surface painted in the painter is on the walls at once.

Verified: `yarn typecheck` and `yarn lint` are clean with no error budget;
the smoke test drives the real game through menu, floor, exploration by E,
gems, the exit toll refused and admitted, a win, a restart and a death - 18
of 18; browser probes confirmed the memory trial, the number tome, the
plate trap and the carry mechanic, and the editor authoring a room that the
generator then placed.

A polish round followed, driven by a screenshot tour of every room kind.
Rooms had read as black: point light intensity is in candela since three
r155, so the torches lit nothing. Torches are now braziers with real light,
doorways have glowing frames and their own light (the exit's frame is gold
when the toll can be paid, red when it cannot), the stone surface is
masonry, and there is fog for depth. Mouse look became the usual click to
capture, Esc to release, with a lost pointer opening the pause menu. Pause
now pauses physics. Doors fade through black, damage flashes the screen
edges, a quiet ambient bed plays under a run, and the summary shows the
run's time.

Then the gaps were closed as far as this machine allows. Two independent
reviews of the tree found that trap rooms had never had spikes and the
memory trial had never had crystals - both ring layouts fell entirely in
the door lanes - along with a dozen smaller confirmed defects; all are
fixed, and `yarn test:layout` guards the geometry. A run is now three
floors, because one floor's shortest path was twenty seconds of walking.
The desktop shell is a game window (no menu bar, fullscreen when
packaged, F11), the product is named Gem Dungeon, `steam/` holds the
depot scripts and upload steps, overlay text scales for a Steam Deck, and
[PLAYTEST.md](PLAYTEST.md) records what an automated playtest can say.
The macOS zip builds on Linux; the Windows package needs a Windows host or
Wine.

Then the loop itself was reworked, because the automated playtest showed
the run had no decision in it: about eleven gems on a floor against a toll
of three, and nothing in the dungeon that moved. Now the toll rises with
every floor (3, 5, 7), the gems still carried when the last exit opens are
the run's score, and every gem taken rouses a Warden that walks the floor
room to room. It cannot be fought or blocked and is slower than a walk, so
it never simply catches anyone - it wins by being in the doorway. Gems also
buy six relics at the shop, each of which changes a rule of the run, so
every gem spent there is a gem not carried out. The decision the game now
asks, once a room, is whether the four gems still on this floor are worth
what taking them will wake.

Since then the dungeon has grown a loot layer and a set piece. Chests hold
eight consumables whose appearances are shuffled every run, so the only way
to learn what a cloudy potion does is to drink one, and the shop will name
one for a gem. The arena, which had been the largest room in the game with
nothing in it, now bars its doors and sweeps itself with three turning arms
of spikes when its gem is lifted. Room shapes are now only used at sizes
whose floor can actually hold the props, which had been placing them on
bare slab in every shaped room.

Then five rounds of improvement, each one deployed before the next began.
Walking gained footsteps, a head dip and a shake when something hits you,
with head bob switchable off because it makes some people ill. Every floor
grew a locked vault whose key lies elsewhere - the lock only ever goes on a
room the floor can be walked without, checked by walking it with that door
shut. Runs stopped vanishing: a best haul, a deepest floor and a fastest
escape are kept between sessions, every dungeon shows its seed, and a seed
can be typed back in. A second threat arrived that does not roam - a
watcher on a post turning a beam around a plain room, which rouses the
floor rather than costing a life, so the Warden makes you leave and the
Sentry makes you time your crossing.

What is still ahead: a human playtest, Windows and signed macOS builds on
their own hosts, and the Steamworks account side (app ID, depots, store
page, capsule art).

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

Five commands. Between them they cover the geometry and the content with no
browser, the game as it is played, what a room costs to run, the web bundle
that ships, and the desktop package that would go on Steam.

| | What it does | Needs |
| --- | --- | --- |
| `yarn test:layout` | 153 checks over every room size, shape and hundreds of seeds: anchors clear of the door lanes and of each other, every arrangement legal, every shipped template one the game will draw whole, the descent's rules never gentler with depth, a floor's exit payable from gems lying on the floor and still costing a real share of what the floor holds, the pan of a sound correct from all 360 headings, the Warden outrun by every sprint in the game and never able to cross its own reach in a single frame, the Sentry's sixty-four millisecond margin wider than a whole frame, no ground in the arena its arms do not reach, and every plate, lectern, pedestal and counter walkable to from a doorway past the room's own furniture | nothing |
| `yarn test:smoke` | 187 checks driving the real game: the whole loop from menu to victory and to death, the economy, the Warden and the noise it hears, the locked vault, the three puzzles won, lost and walked away from, the shop's three purchases made across its counter, the key taken off the floor and spent on a vault door, a chest opened and a full satchel refused, the satchel's keys as well as its buttons, the arena's gauntlet walked on the circle this machine's own measured walk can hold, which is fewer hits than standing still takes, a trap room's spikes stood on and walked round, the arena's gauntlet proof against the pause key, the arena's arms, the memory trial played badly - a mistake, a door out and back, and the mistake after it that takes the life - and its pattern not played out behind the pause menu, a room's own line surviving a passing one, the challenge room won for the first time by weighting its plate with a candle and taking the idol for a gem, and saying which state the plate is in rather than only colouring it, a watcher's beam that neither turns nor counts while the game is paused, what a deliberately stalled frame does to the Warden and to a beam arriving on the player, the Warden moving as fast as it is allowed to rather than merely no faster, and walking in through the doorway the player is standing in without taking a life in the same frame, a beam walked out of at a walk and mired, a satchel that is dead through the black frame between two rooms - a potion pressed at the exit door still in the satchel a floor down - and a Scroll of Banishment refused on a floor it can neither throw nor calm but still spent on a roused one, the records, the editor and the content pipeline | a dev server on 5199, Chromium |
| `yarn test:pad` | 39 checks played on a synthetic gamepad and nothing else: the title screen, the pause menu, quitting, walking and looking, every satchel slot, a seed typed into the records page, and the library's tome opened, answered on the d-pad alone, and backed out of with B before it has drawn a key, and a stalled frame that must not swing the view. Runs against the dev build and, with `--desktop`, the packaged one | as above |
| `yarn test:audio` | 15 checks that listen, reporting the tightest margin any of them had and taking the best of up to three tries for a cue near its bar: it taps whatever connects to the speakers before the app loads and measures samples - every cue heard over the room tone, the loud ones well clear of it, muting silent, the ambient bed opening up when the floor is roused | as above |
| `yarn test:run` | Plays three seeded runs from the first room to the victory screen: routes to gems, pays each floor's toll at the door, three floors down. The only check that finishes the game - a run is 21 to 24 rooms and exactly 15 gems, the sum of the tolls - and it now holds the run to that: gems taken against tolls owed, something took a life, and the lives it was given to finish did not collapse | as above |
| `yarn test:perf` | Draw calls, triangles, live geometries and textures for every room of every floor against a written budget, a leak guard that walks a floor four times and compares each room's geometry count with its own rather than with a number that swings eight between rooms, plus what survives a forced collection while sprinting | as above |
| `yarn test:prod` | 17 checks on what ships. Builds `dist`, serves it and plays it through the menu and the keyboard alone - the shipped bundle has no probe handles - and reads the rest off the built files: no editor in the bundle, nothing 404ing, under 1.35 MB over the wire, and it still starts for somebody whose saved data was written by a build that no longer exists | Chromium |
| `yarn tour` | Not a check: photographs one room of every kind, a Sentry with its beam this way, the Warden in the room with you, and the eight screens the player reads - title, controls, records, satchel, tome, pause and both run summaries - into `docs/playtest`. Looking at the pictures is the check; the first eight screen shots found three real bugs, and each of them now has one in `test:smoke` or `test:pad` | a dev server, Chromium |
| `yarn test:desktop` | Packages the Linux build, reads what is inside it, then starts it under a virtual display and plays it. Holds the build config and the Steam instructions to each other | Xvfb, Chromium |

`yarn typecheck` must be clean; there is no error budget and no ratchet.
`yarn lint` likewise. The browser checks need `playwright-core` and a
Chromium binary, which are not project dependencies, so they are what you
run before shipping a build rather than a commit gate.

What the numbers say today: the worst room costs 51 draw calls and 1,950
triangles; a first visit downloads 1.05 MB gzipped; a floor is 8 to 16
rooms depending on depth and takes 19 to 22 seconds to cross at a walk.

Every screen and every room can be played with a controller alone, which is
what the Deck needs - the seed box on the Records page included, which was
the last thing wanting a keyboard and now has the tome's keys under it.
PLAYTEST.md has the rest.

---

## 4. What is still ahead

### Needs someone with the Steamworks account

- **Nothing Steam-side exists.** No app ID, no store page, no capsule art,
  no depots configured, no build uploaded. `steam/` holds the app and depot
  vdf files and a README with the `steamcmd` steps, launch options and Deck
  notes - they need the real app ID filling in and nothing else.
- **Windows and macOS packages need their own hosts.** Both are configured
  and both name their executables correctly, and the checks hold those names
  against the Steam instructions. But Windows packaging needs Wine or
  Windows for the icon step, and macOS needs Xcode's tooling to sign and
  notarise. Only the Linux package can be built and started here.

### Needs a person, not a machine

- **Nobody has played it.** Everything above proves the game *functions*.
  None of it says whether it is *fun*: whether the toll is set right,
  whether the Warden is frightening or tedious, whether the bottom floor
  has tipped from tense into hopeless. PLAYTEST.md ends with the specific
  questions worth watching for.
- **No Steam Deck has run it.** Gamepad support exists and was driven with a
  synthetic pad; the overlay was scaled for 1280x800 by eye. Neither has met
  a Deck.

### Known and deliberately left

- The challenge room's solved path - weight the plate, then take the idol -
  is verified by hand rather than automatically. A carried thing is put down
  where the camera aims, and no approach the harness tried reproduced a
  player's aim reliably enough to trust. PLAYTEST.md says so.
- The demo is three floors of ten room kinds. The kinds walked through most
  have two or three arrangements each and two rooms are authored, but it is
  still the same props in the same quadrants, and that is what runs out
  next.

---

## 5. Tuning

Every number the world is built from lives in `src/game/world.ts`, and
everything that changes with depth is one table in it, `floorRules(floor)`:
how big a floor is generated, how long it leaves you alone before the Warden
wakes, how roused it already is when you arrive, how many of its rooms are
watched, how it is lit, and the line the player is shown on reaching it.

PLAYTEST.md section 7 lists the knobs with their current values and what
each one does.
