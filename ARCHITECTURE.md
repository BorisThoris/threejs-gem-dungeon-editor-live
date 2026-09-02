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
- Positions inside a room come from `src/game/dungeon/layout.ts`. Doors,
  spawns, the door lanes, and three anchor families in the four diagonal
  quadrants - `near`, `far` and the corners - that are distinct by
  construction. The gem takes an anchor nothing else has claimed; a trap's
  spikes sit between the gem and the lanes. A room kind that puts content
  on anchors says so when it registers (`registerRoomKind(kind, component,
  reserved)`), and the dressing and the gem keep clear of what it claimed.
  Every function takes a `Room` and reads `room.size`; nothing else does the
  arithmetic. `yarn test:layout` checks all of this over every size.
- Run state lives in `src/game/state/run.ts`. One Zustand store.
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
5. The exit door charges `GEMS_FOR_EXIT`. Entering the exit room descends
   to a fresh floor, lives and gems carried; the exit of floor `FLOORS`
   wins. Losing the last life loses. Both show the summary; both offer a
   new run. A puzzle failed for good is remembered in `failed`, as a
   solved one is in `cleared`, so leaving and returning changes nothing.

## Content pipeline

The editor (`?editor`, development builds only) writes into the same
registries the game reads:

- **Rooms**: a `RoomTemplate` is a kind, a size, a shape and a list of props
  at positions. Drafts live in localStorage; an enabled draft is registered
  and the generator picks templates by kind when it places a room. Export
  the JSON to ship it.
- **Surfaces**: the painter and the mosaic tool save a 128x128 image under a
  surface id. `useSurface(id)` in any room picks it up at once.
- **Props**: the inspector shows one catalogue entry at a time; the
  catalogue is the only list of props, and the room builder places from it.

Nothing the editor produces can fail to reach a run, because there is no
second model for it to be written in.

## Verification

- `yarn typecheck` must be clean. There is no error budget.
- `yarn lint` must be clean.
- `yarn test:layout` checks the room geometry over every size and 500
  seeds: anchors clear of the lanes and of each other, spikes in every trap
  room and never in a lane, the gem reachable, the generator connected.
- `yarn test:smoke` drives the real game in a browser: start, stand on the
  floor, explore by pressing E, collect, reach the exit's neighbour, be
  refused unpaid and admitted paid, win, restart, die. Every serious bug this
  project has had was invisible to the type checker and the build.
