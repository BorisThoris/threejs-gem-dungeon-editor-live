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
  construction. The gem takes an anchor nothing else has claimed; a trap's
  spikes sit between the gem and the lanes. A room kind that puts content
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
- What a relic does is decided in `src/game/relics/catalog.ts`, by
  `modifiers(relics)`. Nothing else asks whether the player holds the boots -
  it asks the modifiers what the walk speed is.
- Where the camera is pointing is `src/game/input/look.ts`, written once a
  frame by the look controls. The minimap turns with it. It is deliberately
  not store state: it changes every frame a mouse moves, and the HUD would
  re-render at that rate.
- How roused the Warden is comes from `src/game/warden/tuning.ts`. The
  driver, the figure itself, the audio and the HUD all read the same
  function, so "Hunting" in the corner and the thing in the doorway can
  never disagree.
- Anything that is not state goes over `src/game/events.ts`. One typed bus.
- Textures come from `src/game/textures/registry.ts`, by id.
- Templates come from `src/game/rooms/templates.ts`, by id.

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
    props/catalog.tsx    the fifteen props, with footprint and solidity
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
- `yarn test:layout` checks the room geometry over every size and 500
  seeds: anchors clear of the lanes and of each other, spikes in every trap
  room and never in a lane, the gem reachable, the generator connected.
- `yarn test:smoke` drives the real game in a browser: start, stand on the
  floor, explore by pressing E, collect, reach the exit's neighbour, be
  refused unpaid and admitted paid, win, restart, die. Every serious bug this
  project has had was invisible to the type checker and the build.
