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

Then the dungeon stopped being a stage set. Its spikes had applied to one
of the two things in it: a player could back into a trap room and watch
the Warden come straight through three patches without breaking stride.
Now the floor wounds it - it reels, and two wounds rout it across the
floor and take a point off the alarm - and afterwards it walks round
anything that has bitten it, so a trap room is somewhere to choose to
fight from exactly twice and then a trap room again. It still cannot be
killed and it still cannot be fought; a wound buys a window and a rout
buys a room. The satchel grew a third family to carry that off the trap
room floor: three devices set down where you stand and left behind when
you go - a snare that wounds the next thing across it and that a routed
Warden has not been taught to see, a ward stone that empties a room and
holds it empty for thirty seconds, and a knot of loose iron that lands
loudly and tells the floor exactly where you are.

Building it turned up a second bug worth more than the first: the event
bus dispatched to its subscribers bare, so the first handler to throw
ended the loop and every listener after it never ran. A new sound cue
passed a pan where the oscillator wanted a sweep target, and what that
looked like from the outside was not a missing sound - it was the Warden
being routed with no line on screen. Handlers are isolated now, still
loud, and `tone` floors its sweep target so that particular footgun
cannot fire again.

Then nine more rounds, each deployed before the next began, and each one
verified in the real browser rather than argued for.

The Cutpurse arrived: a third thing in the dungeon and the first that
wants something. It comes for a player who has stopped moving with gems on
them, takes exactly one and runs for the doorway it came in by. Touch it
and the gem comes back; let it out and the gem is in a nest that is then
on your map. A theft is a detour, not a loss, priced in the only currency
the game has. It runs at six against a walk of five and a sprint of eight,
so it is the only thing here answered by reacting rather than by moving
well, and `systems/pace.ts` holds that sentence over every relic and
potion alongside the Warden's mirror of it.

Then five delvers, each trading one thing the run needs for another, all
available from the first game. The Pilgrim paid with a gem on every exit
for about a minute before the economy check threw it out: the thinnest
first floor holds four guaranteed gems against a toll of three, so one
more on the door left a run that had to take every gem on the floor to
leave. The floors have no slack to spend on a delver; the alarm does.

Then the lantern, which is the sprint's bargain asked once a room instead
of once a corridor: seeing, or unseen. Raised, it lights the room and
makes you the brightest thing on a dark floor - the Warden walks for you
and a watcher is twice as quick. It starts down, and that took three
failing checks to learn: raised as a default meant every run opened
already seen, for nothing the player had done.

Then barring a doorway - the one thing the player does to the dungeon
rather than to themselves - and blessed and cursed items, where a curse is
always a cost and never a lie. Then ten deeds - fifteen since run 19 - with a real seam to Steam's
achievements, and thirteen options with every key rebindable, captions for
the sounds that carry information, and marks so that nothing is said in
colour alone.

Along the way the checks found things reasoning had not: an event bus
where one throwing handler silenced every listener after it; two files
whose names differed only in case, which no macOS or Windows checkout can
hold; a menu taller than a Steam Deck's screen with a button nobody could
press; a brazier's prompt that out-reached the memory trial and made the
room unplayable; a volume slider that did nothing on the screen it was
offered on; and a key row labelled "Back" beside every menu's Back button.

One thing about the checks themselves is worth saying before somebody
reads a red line and goes looking for a bug in the dungeon. The smoke
suite has grown from 189 checks to 275 and the page has grown a lot of
overlays, and on this machine - a software rasteriser at three to five
frames a second - it now fails two to four checks intermittently, never
the same ones twice, always in the same shape: the harness read a prompt
too early, or stood a little wrong. Three of them were tracked down and
fixed properly this round; the rest are described in PLAYTEST §47 along
with what would actually fix them, which is waiting on a condition the
game publishes rather than on a clock. The checks that cover the new
mechanics pass on every run.

What is still ahead: a human playtest, Windows and signed macOS builds on
their own hosts, and the Steamworks account side (app ID, depots, capsule
art and screenshots). The store copy itself is written and lives in
[steam/STORE.md](steam/STORE.md), with `yarn test:layout` holding its
numbers against `world.ts` so the page and the game cannot drift apart.

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
- A score, synthesised the same way: a title theme, and underground a phrase
  that closes up and drops an octave as the floor wakes, with a heartbeat once
  something is hunting. Mixed under every cue the player must hear.

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
| `yarn test:layout` | 385 checks over every room size, shape and hundreds of seeds: anchors clear of the door lanes and of each other, every arrangement legal, every shipped template one the game will draw whole, the descent's rules never gentler with depth, a floor's exit payable from gems lying on the floor and still costing a real share of what the floor holds, no kind of room always built at the same size and no single size most of the dungeon, every shape the game declares one a player can walk into, no kind always made of the same thing and every biome one a player can stand in, every biome saying how far a run through it carries and the ordinary rooms never all the same underfoot, painted with a surface the registry has and furnishing the room with props of its own that are never a room's own mechanism, a shrine on every floor with its font placed where a player can reach it, the pan of a sound correct from all 360 headings, the Warden outrun by every sprint in the game and never able to cross its own reach in a single frame, the Sentry's sixty-four millisecond margin wider than a whole frame, no ground in the arena its arms do not reach, and every plate, lectern, pedestal and counter walkable to from a doorway past the room's own furniture, every crystal of the memory trial visible from its lectern, every floor hiding one sealed room that exactly one wall cracks onto, a bomb's fuse and blast held to the shape of the room, every mob declaring a body and the floor reading it in one place, a ground body never stranded by the furniture it now walks round, and a floor's patience held to the shape of its promise - minutes not moments, a warning before the end, a Reaper faster than a walk and slower than a dash, the longest floor walkable in half the time, and the floor's ambient life - rats, a moth, a roost - placed where the floor says, never in a puzzle, never inside the furniture, and the floor's traps speaking the body table's language - a plate that re-arms after its volley, a grate that holds for less than a bar, and over 120 floors every plate at a real doorway, every grate off the exit's, no pit in a lane or under the furniture, a bomb priced under the first toll, a draft that reaches past arm's length and not to the middle of the room, and the wall hiding a hoard, a reliquary or a shrine about as often as each other with a chest in nearly every hoard, everything that breaks solid before it broke, a wreck holding a gem about three times in ten by the seed, a barrel on the line between a blast and a body shielding it and one beside it not, and a burst barrel out of a ground body's way, marking the map a real bound action the README names, the through-wall cadence between a breath and the floor's warning, and every flavour behind a wall with a caption and a sound, the wisp a ghost slower than a walk that leads, on every floor, to the room behind the crack through the first doorway of the shortest path and to the exit once the wall is open, the Harrier a flier faster than a walk and slower than a dash that clears the low furniture and rounds the tall, roosting on every floor from the second down in a room that is none of the start, the exit, the shop or the hidden one, and coming in from every room by the first doorway of the shortest path to its roost, and the Keeper in the body table with its reach inside a blast's radius, its kneel long enough to walk in and pay, its posts at every doorway into the exit on the last floor and none above, a shop on every floor, and the door and the walk asking the store whether it holds, and fifteen deeds each with a name, a blurb and a Steam API name, the five from run 19 earned by the watcher from events the game already sends, with the floor saying how much patience it had left | nothing |
| `yarn test:smoke` | 349 checks driving the real game: the whole loop from menu to victory and to death, the economy, the Warden and the noise it hears, the locked vault, the three puzzles won, lost and walked away from, the shop's three purchases made across its counter, the key taken off the floor and spent on a vault door, a chest opened and a full satchel refused, the satchel's keys as well as its buttons, the arena's gauntlet walked on the circle this machine's own measured walk can hold, which is fewer hits than standing still takes, a trap room's spikes stood on and walked round, the arena's gauntlet proof against the pause key, the arena's arms, the memory trial played badly - a mistake, a door out and back, and the mistake after it that takes the life - and its pattern not played out behind the pause menu, a room's own line surviving a passing one, the challenge room won for the first time by weighting its plate with a candle and taking the idol for a gem, and saying which state the plate is in rather than only colouring it, a watcher's beam that neither turns nor counts while the game is paused, what a deliberately stalled frame does to the Warden and to a beam arriving on the player, the Warden moving as fast as it is allowed to rather than merely no faster, and walking in through the doorway the player is standing in without taking a life in the same frame, a beam walked out of at a walk and mired, a satchel that is dead through the black frame between two rooms - a potion pressed at the exit door still in the satchel a floor down - and a Scroll of Banishment refused on a floor it can neither throw nor calm but still spent on a roused one, the ground of a room deciding how long a dash gives the player away - two seconds on moss against seven in standing water, and the bare four between floors - the run's own timer kept off the wall clock, so five seconds in the pause menu is five seconds the summary and the records do not charge for, a shrine knelt at for a gem that puts the floor's alarm back to its baseline and drops the lure with it, and refuses out loud with nothing to pay, nothing to buy, or a font already dry, the score under it all - a title theme, a sparse delve that closes up as the floor wakes, a heartbeat when it hunts, quiet behind the pause menu - the tome answered a digit a press and left by a key that works under pointer lock, a bomb set at a cracked wall that hurts the player standing in it, routs the Warden, and opens the room the map does not show, the Warden put in a furnished room and never once standing inside the furniture, a floor's patience run out on the run's clock and the Reaper woken, chased by, held under a blast, followed through a doorway and left behind by the floor below, rats scattered from where you stand and a snare sprung by one for nothing, a moth come to a raised lantern and the light held in the Warden's eye after it is lowered, a roost roused by a dash and the noise carried further, a dart plate stepped on for a life and the Warden wounded walking in over it after you, a pit opened under the Warden and listed among what bites from then on, a grate dropped behind you and the doorway barred, a bomb bought at the shop and a second refused, the cracked wall's draft felt at it and not from the middle, and the room behind it worth the bomb, a barrel burst by a bomb set beside it and out of every body's way from then on, a barrel between the bomb and the player taking the blast for them and the same spot costing a life with it gone, and the wreck paying what the seed says, a room marked on the map and cleared again by the key as by the store, the mark staying where it was made, and the wall letting through what is behind it while you stand in its draft and never from the middle, the wisp brought by a raised lantern and leading where the one owner says, drifting to the doorway, settling on the crack, and gone with the light, the Harrier woken by the alarm, coming in by the doorway its owner names, taking a life and wheeling away, knocked down by a blast, and spiked in the trap room, the last stairs refused by the HUD, the prompt and the store while the Keeper stands, a life lost within its reach, a bomb outside its reach making it kneel, and the stairs taken while it kneels for the run won, the five new deeds earned by playing them - a wall opened, the Warden bombed, a floor left on its last breath, the Harrier spiked, the Keeper slipped - and the run summary naming what this run earned, a dart plate's jamb holes read off the scene and held to either side of the lane, the records, the editor and the content pipeline | a dev server on 5199, Chromium |
| `yarn test:pad` | 39 checks played on a synthetic gamepad and nothing else: the title screen, the pause menu, quitting, walking and looking, every satchel slot, a seed typed into the records page, and the library's tome opened, answered on the d-pad alone, and backed out of with B before it has drawn a key, and a stalled frame that must not swing the view. Runs against the dev build and, with `--desktop`, the packaged one | as above |
| `yarn test:touch` | 51 checks played with two thumbs through the debugger's touch events, on an emulated phone, the same phone held upright, a tablet, and a desktop that must never grow a stick: the stick appears under the thumb and walks, the rim runs, the other thumb looks, both at once, USE opens a door, a tap on the satchel drinks, LAMP and the pause answer, the options' touch rows work and switching the controls off takes them away | a dev server, Chromium |
| `yarn test:audio` | 15 checks that listen, reporting the tightest margin any of them had and taking the best of up to three tries for a cue near its bar: it taps whatever connects to the speakers before the app loads and measures samples - every cue heard over the room tone, the loud ones well clear of it, muting silent, the ambient bed opening up when the floor is roused | as above |
| `yarn test:run` | Plays three seeded runs from the first room to the victory screen: routes to gems, pays each floor's toll at the door, three floors down. The only check that finishes the game - a run is 21 to 24 rooms and exactly 15 gems, the sum of the tolls - and it now holds the run to that: gems taken against tolls owed, something took a life, and the lives it was given to finish did not collapse | as above |
| `yarn test:perf` | Draw calls, triangles, live geometries and textures for every room of every floor against a written budget, a leak guard that walks a floor four times and compares each room's geometry count with its own rather than with a number that swings eight between rooms, plus what survives a forced collection while sprinting | as above |
| `yarn test:prod` | 17 checks on what ships. Builds `dist`, serves it and plays it through the menu and the keyboard alone - the shipped bundle has no probe handles - and reads the rest off the built files: no editor in the bundle, nothing 404ing, under 1.35 MB over the wire, and it still starts for somebody whose saved data was written by a build that no longer exists | Chromium |
| `yarn tour` | Not a check: photographs one room of every kind, a Sentry with its beam this way, the Warden in the room with you, and the eight screens the player reads - title, controls, records, satchel, tome, pause and both run summaries - into `docs/playtest`. Looking at the pictures is the check; the first eight screen shots found three real bugs, and each of them now has one in `test:smoke` or `test:pad` | a dev server, Chromium |
| `yarn test:desktop` | Packages the Linux build, reads what is inside it, then starts it under a virtual display and plays it. Holds the build config and the Steam instructions to each other | Xvfb, Chromium |

Two of the layout checks hold documents to code rather than code to code,
which is unusual enough to be worth saying: every deed's Steam API name
has to appear in `steam/README.md`, the file somebody will type those
names out of into the Steamworks partner site, and every number in
`steam/STORE.md` - floors, tolls, item kinds, delvers, deeds, the two
wounds that rout the Warden - has to match `world.ts`. A store page that
says three floors while the game ships four is a mistake that is
embarrassing in public and invisible in a diff.

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
- The demo is three floors of eleven room kinds. The rooms were once "the
  same props in the same quadrants"; measured over forty runs after the
  size, shape, biome, litter and ground work, 98% of the rooms a run walks
  through are furnished unlike the rest of it, and `yarn test:layout` holds
  that number. What runs out next is not variety but *things to do* in
  them, which is the next arc.

---

## 5. Tuning

Every number the world is built from lives in `src/game/world.ts`, and
everything that changes with depth is one table in it, `floorRules(floor)`:
how big a floor is generated, how long it leaves you alone before the Warden
wakes, how roused it already is when you arrive, how many of its rooms are
watched, how it is lit, and the line the player is shown on reaching it.

PLAYTEST.md section 7 lists the knobs with their current values and what
each one does.

---

## 6. The next arc: things to do in the rooms

The base is a game with a hook: gems, a toll, and one thing on the floor
you cannot fight. Runs 1 to 6 made the floors worth looking at and
listening to. What runs out next is not variety but *things to do in the
rooms* - and the brief for this arc names its inspirations plainly:
Barony, The Binding of Isaac, Spelunky. Secrets. Bombs. An environment
that treats what lives in it the way it treats the player. A reason not
to linger, and a reason to.

No combat yet. What the player gets is not a weapon but leverage.

Ten loops on the brief after the ten runs before it - runs 7 to 10 finish
the current goal on the brief's first four items, and 11 to 20 are the ten
loops. Each run below is shipped the same way as the sixty-odd cycles before it:
a check that goes red on the old code, the change, the docs, the nine
suites (eight until the touch suite joined at run 18), `main`, and the
live site. In order:

Runs 7 to 10 have shipped in this order, each on `main` and the live site; the ten loops begin at run 11, and runs 11 to 20 have shipped. Runs 21 to 25 are the refinement - the brief after the loops: what is there works together and is worth looking at - and run 21 has shipped.

| Run | What | Why this order |
| --- | --- | --- |
| 7 | **The puzzle rooms, refined.** The memory trial's crystals must be visible from the lectern - a sightline rule in the placement filter, an arrangement without pillars across the room, and a layout check that every crystal can be seen from where the trial is started. The tome: every number a single digit so a slot commits on the keypress, difficulty by length rather than by range; "I have it" to end the showing phase early; a way out that works under pointer lock, on screen, that a first Escape does not swallow. | The most concrete complaint in the brief, and polish before content. |
| 8 | **Bombs, and what they are for.** A fourth item family: set down, a short fuse, a blast. Inside it the Warden is routed and the thief drops what it holds; the player is hurt too, which is the risk. And the reason to carry one: rooms can have a **cracked wall** the blast opens onto a secret room the map does not show. Found in chests and never enough of them; the shop's counter is full, so selling them is run 13's. | Isaac's core loop of secrets, on top of a floor that already has a map. |
| 9 | **The environment treats what lives in it as it treats the player.** Every mob declares a body - `ground`, `flying`, `ghost` - and the floor's rules read it: spikes and snares bite ground bodies, solid props are steered round by anything with a body, a ghost passes through all of it. The Warden and the Cutpurse are ground. A layout check that every mob has a body and every hazard says who it bites. | Needed before more mobs exist, or each one re-invents the rules. |
| 10 | **The one you cannot escape if you linger.** Every floor has a patience, and it runs out. When it does something wakes that has no room, no alarm and no lure - a ghost body, through walls and spikes and wards, faster than a walk, and it does not leave. A bomb stalls it. The HUD says how long the floor has left before it says nothing more, and the score's heartbeat comes in under it. Risk against reward: the treasure room you have not opened, or the door. | Spelunky's ghost and Barony's minotaur, and the missing shape of a run. |
| 11 | **Floors that are alive.** Two or three ambient creatures with bodies: rats that scatter from footsteps and spring snares, a moth that drifts to a raised lantern and gives it away, a wisp that lights braziers ahead of you. Each one reads the run 9 rules rather than its own. | The brief's "each level should feel alive", built on run 9 so it costs nothing to add a creature. |
| 12 | **Environmental traps.** Plates that loose darts across a doorway, a grate that drops behind you, a floor that gives way over spikes - each one a body-aware hazard, so a ground mob triggers it and a ghost does not. | Traps a player can *use*, which is the Spelunky half of the brief. |
| 13 | **Secrets, deeper.** Cracked walls in more kinds; alcoves behind them holding a relic, a key, a shrine; a draft of air where a wall is thin. | The second pass on run 8 once bombs have been played with. |
| 14 | **Breakables.** Urns, crates and barrels smash - under a blast, or by a bomb set beside them - and sometimes there is something inside. And a barrel is the one thing on a floor a player can put between themselves and a bomb. | Isaac's rocks and pots: the bomb becomes a tool as well as a weapon. |
| 15 | **The map that lies.** A floor that hides a room says so, if you listen: a draft of air across a doorway near the crack, a sound through the wall, a brazier that gutters. Nothing marks the map; the player marks it. | Secrets are only secrets if there is a way to suspect them. |
| 16 | **A helper that costs something.** A lamplighter wisp that drifts ahead of a raised lantern and lights the braziers on the way - and, because it is light, gives the player away to the Warden exactly as the lantern does. Follow it to the secret; or put the lantern down and lose it. | The brief's helper mob, built on run 9's bodies and run 11's creatures, with a price. |
| 17 | **A second threat with a different body.** Something that flies: spikes do not bite it, snares do not hold it, props do not stop it - and a blast does. It is what makes the body rules a fact a player can use rather than a table. | Run 9 has to pay off in play, not only in a check. |
| 18 | **The Keeper.** Floor three's exit is watched by a thing that does not wander and cannot be evaded by walking. It is stalled by a bomb and by nothing else, for long enough to pay the toll and go. The last floor gets an ending; the game still has no weapon. | A boss for a game without combat: the door is the fight. |
| 19 | **Deeds and the run summary catch up.** New deeds for the arc - the first secret found, a Warden bombed, a floor left with seconds to spare, the Keeper stalled - and a summary that says which of them this run earned. | The records are the reason to run again. |
| 20 | **Review and polish.** Play the arc end to end, fix what it finds, refresh the docs, re-measure the suites, and the human-playtest list in PLAYTEST for the arc. | The same closing pass every arc has had. |
| 21 | **The blast is seen.** Nothing visual listened to the burst: the one thing that routs the Warden, downs the Harrier, kneels the Keeper and opens walls was a boom and a state change. A flash that dies in half a second, forty embers, a disc of dust, a shake that depends on how near it was, and the wall's stone lying at the gap it opened. | The refinement's first rule: every moment the systems share gets a body. |

What this arc deliberately does not do: give the player a weapon. The
Warden stays the thing you cannot fight, because that is the hook. Bombs
stop it; they do not kill it.
