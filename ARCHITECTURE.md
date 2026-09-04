# Architecture

Gem Dungeon is a first-person dungeon run: find gems, buy your way out of the
exit, do not die. This document is the map of the code and the one rule it is
built on.

## The rule: one owner per fact

Every bug the previous tree had in its last month was the same bug: two
modules with different opinions about one fact. Five different ideas of
where the floor was. Doors placed from one room size and spawns from another.
Two stores that both claimed the player's stats. So:

- Geometry lives in `src/game/world.ts`. The ground plane, the capsule, the
  spawn height, the door width, the interact radius. Nothing else defines a
  height.
- Everything that changes with depth is one table in the same file,
  `floorRules(floor)`: how big a floor is generated, how long it leaves you
  alone before the Warden wakes, how roused it already is when you arrive,
  how many of its rooms are watched, how it is lit, and the line the player
  is shown on reaching it. The generator, the run store, the Sentry
  placement, the scene's lights and the arrival hint all read that row
  rather than each keeping a number of their own, which is what made the
  floors differ only in price before.
- Every sound is a one-shot except the Warden crossing your room, which is
  built once and then written to every frame - three AudioParam values, no
  new nodes. A cue rebuilt per frame would allocate an oscillator, a gain
  and a panner sixty times a second, which is the shape of every stutter
  this project has had; `yarn test:perf` drives it twenty thousand times and
  checks that one sound came out rather than twenty thousand.
- Which side a sound is on comes from `src/game/systems/bearing.ts` and
  nowhere else. Two things need it - the Warden through a wall and a Sentry
  from its post - and they have to agree, because a cue panned the wrong way
  sends the player towards the thing it is warning them about. It is pure so
  the layout check can walk it from all 360 headings; the same sign was
  already got backwards once on the minimap, where it survived because it
  was only wrong facing east or west.
- Nothing in the game casts a real shadow. A point light's shadow is a cube
  map - six renders a frame, per room, for scenery that never moves - so
  `src/game/props/ContactShadows.tsx` does the cheap half instead: one soft
  blob under everything that stands on the floor, all of them in a single
  geometry, so a room's grounding costs one draw call and nothing per frame.
- What a prop is - footprint, solidity, collider - is data in
  `src/game/props/specs.ts`, apart from the components that draw it. Four
  things need those numbers and none of them wants a React tree: the room's
  single collider body, the placement filters, the editor's outlines, and
  the layout check, which runs in node.
- Which anchors a kind's own content stands on is one table in
  `src/game/rooms/anchors.ts`. It used to be a third argument to
  `registerRoomKind`, which put the answer wherever the component happened
  to be written and out of reach of anything that cannot mount one - so an
  authored template could be placed on the shop counter and nothing would
  say so.
- How a room of each kind is furnished lives in `src/game/rooms/layouts.ts`,
  as arrangements that only ever name an anchor - so an arrangement is clear
  of the door lanes by construction rather than by being checked. The kinds
  a player walks through over and over have several, drawn from the room's
  own seed; the set pieces have one, because their content is what makes
  them. It is a plain module with no React in it, so the layout check can
  bundle it for node and walk every arrangement at every size.
- Positions inside a room come from `src/game/dungeon/layout.ts`. Doors,
  spawns, the door lanes, and three anchor families in the four diagonal
  quadrants - `near`, `far` and the corners - that are distinct by
  construction.
- A `Room` carries the seed of the dungeon it belongs to, because its id is
  not its identity: the generator names the first room of every floor
  `start` and digs it at the grid origin, so without the seed the start room
  of floor two was the start room of floor one down to the furniture.
- Which way round a room is furnished is a seeded property of the room:
  four quarter turns and a mirror, applied to the quadrant and corner
  anchors and to an authored template's props. Everything a room holds comes
  off those anchors, so the whole frame turns together and a turned room is
  still a laid-out room rather than a scramble. It is what took a run from
  24 of 34.6 rooms looking different to 32, and the game from 98 distinct
  room appearances to 555. The doors, the spawns and the middle pair do not turn:
  they are fixed by which walls the room has.
- A prop's shapes and materials are shared for the life of the program,
  from `src/game/props/shared.ts`. Written as plain JSX every mesh built its
  own: 85 geometry objects and 85 material objects in one room, for 32
  distinct shapes, rebuilt on every room mount. Nothing in there is ever
  disposed, deliberately - it is a small fixed set every room needs - so
  nothing may mutate one, and the props that animate do it to a light.
- The braziers are one instanced set per room, in
  `src/game/props/Braziers.tsx`. Four per room, seven identical meshes each,
  in every room in the game: the largest group of draw calls there was, and
  the same argument the colliders already won. The lights are not instanced
  and cannot be - a light is not drawn - so there is still one per brazier,
  flickering out of step.
- The anchor rings are spaced from `PROP_SPECS`, not from magic numbers: the
  widest furnishing an arrangement can place decides how far `near` stands
  from the lanes, how far `far` stands from `near`, and how far the corner
  braziers stand from both. Every placement rule in this project used to
  test a centre point while every prop had a footprint the specs already
  carried, so a table stood in a door lane, inside a bookshelf, and through
  a brazier, and every check passed. The gem takes an anchor nothing else has claimed; a trap's
  spikes sit between the gem and the lanes.
- The door lanes are only as wide as the room's own doors. `inDoorLane`
  reads `room.links`, so a room with doors on one axis only - two in five of
  them - keeps the band across its middle, and `centreSpots` offers a pair
  either side of it. For years that rule reserved all four doorways in every
  room whether or not the room had them, which is why everything a room held
  stood in a diagonal quadrant and the middle of every room was empty.
  Called without a room, `inDoorLane` still answers for every wall doored:
  that is the case an authored template has to survive, because the
  generator can place a template anywhere. A room kind that puts content
  on anchors says so when it registers (`registerRoomKind(kind, component,
  reserved)`), and the dressing and the gem keep clear of what it claimed.
  Every function takes a `Room` and reads `room.size`; nothing else does the
  arithmetic. `yarn test:layout` checks all of this over every size.
- Run state lives in `src/game/state/run.ts`. One Zustand store. The floor,
  the gems, the alarm, the relics held and which room the Warden is in are
  all here; nothing keeps a second copy.
- What survives a run is `src/game/state/records.ts`, folded in from the
  two places a run can end and nowhere else, so a run is never counted
  twice. It holds no progression: nothing it remembers changes what a run
  is. Settings live beside it in `settings.ts`, separately, because a run
  is a thing you lose and a preference is not.
- Whether a room can be locked is `reachableWithout` in `generate.ts`: a
  vault only goes on a room that every other room can be reached without.
  Being off the shortest path is not enough - a room can be off the route
  and still be the only way through to the far side of a floor.
- Which shapes a room may take at a given size is `shapeFits` in
  `layout.ts`. A shaped room is a polygon inscribed in its box, so it has
  less floor than its size suggests, and a shape that cannot hold its own
  outer ring of props is not used - the generator asks before it picks and
  the room builder offers only what passes.
- What an item is, what it looks like this run, and what it does are in
  `src/game/items/catalog.ts`; the effect itself is applied in one place,
  `useItem` in the run store. How fast the player moves after drinking one
  is `speedNow(state)`, and it is the only answer to that question.
- Which ground the arena's arms sweep is `src/game/arena/sweep.ts` -
  where the rings go, how close to the middle a player can get, and how
  far out. The room draws from it and `yarn test:layout` checks it, which
  matters because the room's own copy of the ring loop had left a hole
  around the plinth that a check named after covering the floor did not
  look for.
- A room is assembled in one order: **gem, key, watcher, furniture**. Each
  is worked out from the room and the seed alone - `gemFor` and `keyFor` in
  `rooms/kinds.ts`, `sentryFor` in `sentry/placement.ts`, `placementsFor` in
  `rooms/Dressing.tsx` - so the room shell and the dressing arrive at the
  same answers without talking to each other, and each step is handed what
  the ones before it took. Every gap in that order was a bug that shipped:
  a quarter of watchers stood inside a prop or on the gem, and two thirds
  of keys lay under the furniture.
- What the Sentry's four constants mean together is
  `src/game/sentry/beam.ts`: how long the beam holds a fixed direction, and
  how long it takes to walk out of it at a given distance. One line, checked
  - standing still in the light is always seen, walking out of it never is -
  and the margin on the second is six hundredths of a second.
- Whether the player can get away from the Warden is
  `src/game/systems/pace.ts`, and it owns both halves of that: `paceFor`
  turns relics and a potion into a walk and a sprint, `wardenSpeedAt` asks
  the Warden's own curve, and `ESCAPE_MARGIN` says how much faster than it
  the slowest sprint in the game has to be. The invariant is one line - a
  sprint always gets away, a walk does not - and `yarn test:layout` walks
  all 2,496 combinations of relic set, potion and alarm level to hold the
  three files that feed it to that line. It exists because they disagreed:
  the potion of mire once left a sprint level with a roused Warden, in a
  game whose only verb against it is running.
- What a relic does is decided in `src/game/relics/catalog.ts`, by
  `modifiers(relics)`, and what it costs by `priceOn` in the same file -
  checked against what a floor actually holds, because the two had never
  been compared and the answer was that most floors could not afford one. Nothing else asks whether the player holds the boots -
  it asks the modifiers what the walk speed is.
- Where the camera is pointing is `src/game/input/look.ts`, written once a
  frame by the look controls. The minimap turns with it. It is deliberately
  not store state: it changes every frame a mouse moves, and the HUD would
  re-render at that rate.
- How roused the Warden is comes from `src/game/warden/tuning.ts`. The
  driver, the figure itself, the audio and the HUD all read the same
  function, so "Hunting" in the corner and the thing in the doorway can
  never disagree.
- Menus a pad can use are `src/ui/padMenu.ts`, and numbers a pad can enter
  are `src/ui/Keypad.tsx`. Where a d-pad press takes the focus is read off
  the page - things whose boxes overlap vertically are a row - rather than
  from a declared column count, because the pages that need it are neither
  lists nor grids. One owner each, because the reason the tome
  could not be answered with a controller is that it had its own idea of
  what a key press was. Which buttons the satchel's slots sit on is
  `src/game/input/gamepad.ts`, as a list as long as `SATCHEL_SLOTS` - it
  was two fields for a satchel of four.
- Anything that is not state goes over `src/game/events.ts`. One typed bus,
  and `yarn test:layout` holds both ends of it together: every event it
  declares must be emitted somewhere and listened to somewhere. A typed bus
  checks what an event carries, not whether anybody is at the far end, and
  three events had nobody - among them `wardenStruck`, which meant the
  Warden catching you sounded exactly like walking into spikes.
- Textures come from `src/game/textures/registry.ts`, by id.
- Templates come from `src/game/rooms/templates.ts`, by id.
- What furniture a room gets is `placementsFor` in
  `src/game/rooms/Dressing.tsx`, and being the floor's locked room is part
  of that question rather than a separate one: a vault is dressed as a
  vault whatever kind it was drawn as, and never ends up poorer for being
  locked. `yarn test:layout` checks it room by room.
- How long one frame is allowed to count for is `MAX_FRAME_S` in world.ts,
  a twentieth of a second, and nothing that *moves* on a delta may believe
  one longer than that. Two things do: the Warden, and the stick the player
  looks with. A frame delta is a claim that whatever was true at
  the end of the frame was true for all of it; over sixteen milliseconds
  that is close enough and over nine hundred it is a fiction. The Warden
  added `speed * delta` to its own position and a nine-hundred-millisecond
  frame carried it four metres in one step - measured, in a room
  twenty-four across, against a strike radius of one. `WARDEN_MAX_STEP` is
  a quarter of that radius; `yarn test:layout` holds it against
  `MAX_FRAME_S` and `yarn test:smoke` stalls the main thread on purpose and
  watches it across the frame that never happened. The physics has said
  this since the beginning, in Scene.tsx, where the timestep is fixed
  rather than variable for exactly the same reason.
- But cap a thing that is being *moved*, and read the clock twice for a
  thing that is being *timed*. The Sentry added the same delta to how long
  it had held you in its beam, and on the frame the light first touched a
  player a hitch took that from nothing to past its patience in one go -
  called out on the instant of contact. Capping each frame's contribution
  fixed that and quietly broke the other half of the same promise: the
  count is also how "standing still in the light is always seen" is
  decided, so a machine whose frames ran longer than the cap accrued only
  the capped share of each, and below about twelve frames a second the post
  called nobody out at all. It measures a span now - the clock read when
  the light arrives, and how long ago that was - which has neither problem
  and needs no constant. The beam takes 11.4s to come round and covers one
  direction for 1.53s, so it cannot leave a player and return inside a
  hitch: lit at both ends of a dropped frame means lit throughout it, and
  charging for that is right.
- The stick the player looks with is the other one, and it took until cycle
  50 to find. `GAMEPAD_LOOK_SPEED * delta` is 2.4 radians a second, so a
  nine-hundred-millisecond hitch with the stick held over swung the view a
  hundred and twenty-four degrees in one frame - on the only input a Steam
  Deck has. The mouse is deliberately not held to this: it reports pixels
  moved, and a long frame carries more of them because the hand moved that
  far. A stick reports a position, and how long it stood there is the
  game's to decide.
- What is left reads `elapsedTime` and is placed rather than advanced - the
  arena's arms, the beam's own angle - so a hitch skips them past the
  player rather than through them, which is the generous direction. At ten
  frames a second the furthest arm still steps only 1.19m against the 1.5m
  that would take it over a player, so it never skips one in play. The
  footsteps take distance walked rather than time, and fire at most one
  step a frame, so a hitch drops a footstep rather than firing a burst.
- A trigger that can refuse says so before the press, not after. Three in
  the game carried no `enabled` guard - the gem, the key and the chest -
  and only the chest can refuse: `takeItem` declines a full satchel, so it
  went on offering "Open the chest - a green potion" with four things
  carried and E did nothing but drop a hint afterwards. That was merely
  rude until the prompt began going to the nearest *usable* thing, at which
  point a chest claiming to be usable outranked the door beside it and a
  player with a full satchel was told to loot a room they could not leave.
- Which of several things in reach the player is talking to is
  `src/game/interact/InteractTrigger.tsx`, and it is the nearest one that
  can actually be *used*, falling back to the nearest one at all. Straight
  distance was the rule, and it let a thing you cannot do stand in front of
  a thing you can: the shop's counter carries the life at one anchor and
  the naming a metre and a bit along it, so a player at full health stood
  reading "Already at full health" with a purchase they could afford a
  stride away and E doing nothing. Blocked reasons still surface whenever
  nothing better is in reach, which is the case they exist for, and
  `yarn test:smoke` holds both halves - a fix that only ever surfaced usable
  things would swallow every blocked reason in the game and nothing would
  notice.
- Which ground the arena's arms reach is `src/game/arena/sweep.ts`, and it
  answers both halves of the room: `arenaShelter` is null for every size
  the game builds, so there is no line to stand on, and `orbitSpeed(r)`
  says what holding a line of radius r costs. Both ends of that are
  checked, and the second end was the one missing: the innermost line can
  be held at the slowest walk in the game, *and* the circle the fastest
  walk has to hold still fits inside the room. A player on a keyboard
  cannot walk slower than they walk, so the line they hold is the one their
  speed fits and the inner stroll is only available to a stick.
- A place to stand is not a way to get there, and until cycle 51 no check
  in the project knew the difference. The trap room's asked whether some
  point within reach of the gem was outside every spike patch and called
  that "the gem can be taken without touching spikes"; a player arrives
  through a doorway and has to walk. Two of the three patches sat on the
  gem's own coordinate and reached to within nine centimetres of the wall,
  so in seventy of a hundred and thirteen trap rooms there was a clear spot
  hard in the corner and no route to it - in a room whose own comment says
  "the way round, along the walls, is safe". `WALL_CORRIDOR` in
  `dungeon/layout.ts` keeps a patch off the wall by half a metre, and
  `yarn test:layout` floods the floor from every doorway, past the spikes
  and past the furniture, and asks whether the walk arrives. It is the only
  check that asks whether a room can be *walked* rather than whether things
  are spaced; the furniture turns out to be innocent in all 945 rooms, and
  it is worth knowing that rather than assuming it. The same fill holds two
  more assumptions nobody had stated: that a room joins the rooms it links
  to, by walking from each of its doorways to the others, and that the
  floor's key is neither inside the vault it opens nor behind it.
- A timed thing in the game is a deadline on `runClock`, which is wall time
  less every second spent in a menu. The store keeps `pausedFor` precisely
  for that - the comment beside it says so about the Potion of Swiftness -
  and the arena did not ask: its wind-up and its fourteen seconds were
  `window.setTimeout`s, so taking the gem and pressing Escape for seventeen
  seconds unsealed the doors and finished the gauntlet. Measured in the
  game, standing exactly where the gem had been afterwards took no hits at
  all. Its phases and its arms both read `runClock` now - the arms too,
  because driven by `elapsedTime` they kept turning through a pause and the
  player unpaused into whichever one had arrived.
- Whether a puzzle is open is `src/ui/PuzzleOverlay.tsx`, and it is tied to
  the run it belongs to rather than held on its own: the overlay closes
  when the run's seed, floor or room changes, which covers dying, climbing
  out, quitting and starting again. It was local state and nothing that
  ends a run knew to say so, so a tome opened at a lectern stayed on screen
  over the death summary, still counting down, still holding the input
  lock, and eventually recorded a failure against a room in a dungeon that
  had been thrown away.
- A modal that holds the input lock owns the way out of itself for as long
  as it is up, not for the part of it that takes input. The tome's exit
  lived in its typing handler and its B button lives on its keypad, so for
  the six seconds it shows the numbers - with the player frozen in place
  and the Warden walking - neither Escape nor B did anything, under a
  footer that said "Esc or B leaves" the whole time.

If you need a number and it is not in one of those places, add it there, not
where you need it.

## The tree

```
src/
  main.tsx, App.tsx      boot; menu | run | (dev only) editor
  game/
    world.ts             every constant the world is built from
    events.ts            the typed event bus
    rng.ts               seeded randomness; a seed is a whole run
    dungeon/
      types.ts           Room {id, kind, grid, size, shape, links, template?}
      generate.ts        grid walk, connected by construction, exit farthest
      layout.ts          where everything in a room is
    state/run.ts         the run: phase, lives, gems, current room, visited
    input/               keyboard (edge presses), gamepad, mouse look
    player/Player.tsx    the capsule the camera rides on
    interact/            InteractTrigger (E on anything), DoorTrigger
    rooms/
      Room.tsx           the shell: floor, walls with doorways, ceiling, light
      Walls.tsx          four walls, a doorway cut per link
      Dressing.tsx       seeded props per kind, door lanes kept clear
      kinds.ts           kind -> tint, title, content component
      content.tsx        what each kind puts in the shell
      templates.ts       authored layouts, by id
    props/catalog.tsx    the twenty props, with footprint and solidity
    puzzles/             memory trial, number tome, plate trap, Carryable
    textures/registry.ts surfaces by id: procedural defaults, overridable
    systems/             audio (synthesised), bus-driven
    Scene.tsx            the canvas, physics, ground, player, current room
  ui/                    DOM overlays: HUD, minimap, prompt, hint, menus,
                         summary, puzzle overlay
  editor/                dev only: rooms, props, surfaces, mosaic
```

## How a run works

1. `startRun(seed)` generates a dungeon: a random walk on a grid, every room
   linked to the one it was dug from, extra doorways between neighbours for
   loops, the exit hung off the room farthest from the start. Each of shop,
   library, memory chamber, challenge room and arena appears at most once.
2. One room is mounted at a time, at the world origin. `Room` reports
   `roomReady` once its colliders exist; until then `transitioning` holds
   the player still over an invisible ground plane that always exists.
3. Standing near anything interactive raises a prompt; E acts on the nearest
   one. Doors travel: the run sets the new room, teleports the player just
   inside the wall they came through, and waits for `roomReady` again.
4. Gems are picked up by proximity. Traps damage on entry with a cooldown in
   the store. The shop sells a life for a gem. Puzzles pay a gem when solved.
5. Every gem taken raises the floor's `alarm`. The alarm decides how often
   the Warden steps from room to room, whether it wanders or walks towards
   the player, and how fast it crosses a room. Sprinting gives the player's
   room away for as long as it lasts and a few seconds after - the same
   "walks towards you", bought for nothing permanent, which is what makes
   the dash a decision rather than a free upgrade. A Scroll of Echoes sets a
   lure room instead: the Warden walks there rather than towards the player
   and stops listening for footsteps until it arrives or the sound goes
   cold, which is the one thing in the run that buys the right to sprint. It cannot be fought and is
   slower than a walk at every level: it wins by being between the player
   and the door. Touching the player costs a life and throws it three
   doorways away.
6. The exit door charges `tollForFloor(floor)`, which rises on every floor.
   Entering the exit room descends to a fresh dungeon - lives, gems and
   relics carried, alarm and Warden reset to what the new floor's own rules
   say - and the exit of floor `FLOORS` wins. The gems still held at that point are the run's score. Losing the
   last life loses everything. A puzzle failed for good is remembered in
   `failed`, as a solved one is in `cleared`, so leaving and returning
   changes nothing.

## Content pipeline

The editor (`?editor`, development builds only) writes into the same
registries the game reads:

- **Rooms**: a `RoomTemplate` is a kind, a size, a shape and a list of props
  at positions. Drafts live in localStorage; an enabled draft is registered
  and the generator may pick a template when it places a room of that kind -
  *may*, because the seeded arrangement is one of the options rather than a
  fallback. Preferring a template whenever one existed meant a single
  authored treasure room made every treasure room that room, and the seeded
  treasure arrangements became code nothing could reach. Export the JSON to
  ship it.

  An authored room's props go through the same filters the seeded dressing
  does, and anything that fails is dropped without a word - so a template
  that breaks a rule renders as a sparse room rather than as an error.
  Those rules live in `src/game/rooms/validate.ts` and nowhere else, because
  two very different things need them: `yarn test:layout` holds every
  shipped template to them over sixty seeds, and the Room Builder shows the
  author the same list live, under the grid, as they place things. The
  editor's own `isRoomTemplate` answers a much weaker question - is this
  well-formed JSON with kinds the game knows - and a template can pass it
  and still lose half its props.
- **Surfaces**: the painter and the mosaic tool save a 128x128 image under a
  surface id. `useSurface(id)` in any room picks it up at once.
- **Props**: the inspector shows one catalogue entry at a time; the
  catalogue is the only list of props, and the room builder places from it.

Nothing the editor produces can fail to reach a run, because there is no
second model for it to be written in.

## Verification

- `yarn typecheck` must be clean. There is no error budget.
- `yarn lint` must be clean.
- The three puzzles are played by `yarn test:smoke`, not merely mounted: the
  tome is opened, read and typed back, and typed wrong until it closes for
  good; the memory trial is begun and repeated; the challenge room's trap is
  sprung. Each exposes what a probe cannot see - the number sequence and the
  pattern - behind `import.meta.env.DEV`.
- `yarn test:desktop` packages the Linux build, reads what is in it, then
  starts it under a virtual display and plays it. Electron is Chromium, so
  it opens a debugging port and the same tooling that drives the web build
  drives the desktop one. It also holds the build config and the Steam
  instructions to each other: the name of the executable is one fact
  written in two places, and they had drifted.
- `yarn test:run` is the only check that finishes the game. It plays a
  whole run - route to a room that still has a gem, take it, and when the
  toll is affordable go and pay it, three floors to the victory screen -
  pressing E at every door and setting nothing on the run but lives. It
  says the dungeon can be finished, not that you can survive it: the walker
  does not evade the Warden and reports how often it had to be picked up.
  Before it, the only evidence a run could be completed was a `setState`
  that put the player in the last room of the last floor with the gems
  already in hand.
- A check that names what it is looking for goes on passing while the thing
  it was written to catch walks past it. `yarn test:prod` asserted that
  three probe handles were absent from the shipped build, by name, of the
  twenty-eight the source now declares - all stripped, which is why nothing
  noticed. It reads the list out of `src/` now. The pattern matches any
  `.__name`, not `window.__name`, because most components write theirs
  through a cast and an object-anchored pattern misses exactly that idiom:
  proved by leaking a probe on purpose, which walked past the first version
  and was caught by the second.
- `yarn test:prod` is the only check that touches what ships. Every other
  one drives the dev server, where the DEV blocks still exist; the
  production bundle has no probe handles and no editor, so that one is
  played through the menu and the keyboard alone and the rest is read off
  the built files.
- `yarn test:perf` reads three's own counters - draw calls, triangles, live
  geometries and textures - for every room of every floor, and the heap
  while the player sprints. Frame time is not measured, because the machine
  this runs on has no GPU and a millisecond here says nothing about a Steam
  Deck; those counters are CPU-side and mean the same thing everywhere.
- Whether a purchase may be made is `canSpend` in `src/game/state/run.ts`,
  and the shop asks it about all three things it sells. The exit is the only
  thing a run must be able to afford - a floor can hold as few as one gem
  more than its toll - so anything else that takes gems has to leave enough
  behind. The rule used to be written into the life purchase alone.
- `yarn test:layout` checks the room geometry over every size, every shape,
  all fifteen door combinations and 500 seeds: anchors clear of the lanes
  and of each other, nothing in a lane the room it stands in actually has,
  no two solid props standing inside each other and no footprint reaching
  into a lane or through a wall, spikes in every trap room and never in a
  lane, the gem walkable to from a doorway past the spikes and the furniture, the generator connected, and every floor payable
  from the gems a player is guaranteed with at least one to spare. It also
  checks the one promise the Warden makes, over every relic set the shop can
  sell, every potion and every alarm level: a sprint always gets away, a
  walk does not. The arena is held to its own two lines the same way -
  there is always a circle you can walk, and there is no spot you can
  stand - and the first of them asks pace.ts for the slowest walk in the
  game rather than assuming WALK_SPEED. The numbers behind that live in three files and were tuned
  separately, which is how the potion of mire came to leave a sprint level
  with a roused Warden.
- `yarn test:audio` listens to the game. It wraps
  `AudioNode.prototype.connect` before the app loads, so anything that
  reaches the speakers also reaches an analyser the check owns, and measures
  samples rather than calls: every cue heard over the room tone, the loud
  ones well clear of it, muting silent, and the ambient bed opening up when
  the floor is roused - measured in the spectrum, because the bed's own
  filter wobble is larger than what the alarm does to its volume. It talks
  to the game through `window.__ambience` and `window.__sfx`, never through
  its own import of the module: the dev server will hand it a second copy.
- `yarn test:pad` plays the game with a synthetic standard-mapping
  controller, through the menus and the sticks: the title screen, both
  sticks, A, B, Start, pause, quit. `--desktop` runs the same thing against
  the packaged Linux build, which is what a Steam Deck runs. It drives the
  game's own reading of a pad, not the browser's gamepad driver, and says
  so.
- `yarn test:smoke` drives the real game in a browser: start, stand on the
  floor, explore by pressing E, collect, reach the exit's neighbour, be
  refused unpaid and admitted paid, win, restart, die. Every serious bug this
  project has had was invisible to the type checker and the build.
- `yarn test:smoke` stalls the main thread on purpose and watches what the
  two things that can catch you do across the frame that never happened. An
  average over a second is exactly the shape that hides a lunge - the
  Warden read a steady 4.4 m/s with single frames at twenty-three and
  thirty-seven - so it samples every frame and takes the largest single
  step. The Sentry's stall is timed to land as the beam arrives, which is
  the case that is actually unfair: stalling while the player is already
  lit convicts them too, and that conviction is correct.
- `yarn test:smoke` walks to the shop counter and buys each of the three
  things it sells, walks onto the floor's key and takes it, stands at a
  barred door and opens it, opens a chest and is refused by one with a full
  satchel, and presses 1 to 4 - the keyboard half of the satchel, whose pad
  half was checked in cycle 36 and whose keys never were. The tome, the memory trial and the challenge
  room had been played that way for cycles; the shop and the key were only
  ever exercised through the store's own actions, so what was checked was
  the arithmetic of a purchase and never the counter. That is the shape
  that hid a tome no controller could answer and a title screen no
  controller could start: the rule held, the way in missing.
- `yarn test:smoke` walks the arena's circle for the full fourteen-second
  gauntlet, which nothing had ever done either. The room's two lines are
  "there is always a line you can walk" and "there is no line you can stand
  on"; standing where the gem was had been checked and takes five hits, and
  the other half was arithmetic in node. Which circle a player can hold is
  set by how fast they move, and the check steers along the line rather
  than at the gap - aiming at the gap's middle makes the player cut the
  chord, drift a metre off the circle and end up where the gap is narrow.
- `yarn test:smoke` also walks a beam, which nothing had ever done, and
  checks the game against `beam.ts` rather than against `WALK_SPEED`. The
  player is a rigid body driven once a rendered frame and this runs on a
  software rasteriser at four or five, where Rapier's damping eats a third
  of the walk: asserting the promise as written would be asserting that
  this machine is a Steam Deck. Asserting that the simulation and the
  arithmetic agree at whatever speed the body did move is the stronger
  statement, and it is the one thing about that room nothing had checked.
- `yarn tour` asserts nothing. It photographs every kind of room and every
  screen the game puts in front of the player, and looking at the pictures
  is the check. The screens had never been in it, and the first eight shots
  found three things wrong - a tome that could not be left while it showed
  its numbers, a tome that outlived the run and sat over the summary, and
  "1 rooms" on the last screen a new player sees. What it turns up gets a
  check in `test:smoke` or `test:pad` afterwards, run against the old code
  first to see it go red.
