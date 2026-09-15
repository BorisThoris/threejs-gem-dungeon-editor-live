# The inhabited dungeon

The expansion keeps the old-school, blocky, handmade contract in WORLD_STYLE.md.
Its measure is a richer playable place, not a line count. This is ongoing work;
the earlier districts-and-footprints pass is the foundation, not the finish.

## Intended world

1. Working geography: watercourses, drainage, industrial services and ruined
   routes connect real rooms. Changes upstream have legible consequences below.
2. Places with purposes: sources, sluice houses, settling galleries, workshops,
   ossuaries and sanctuaries have recognizable architecture and useful landmarks.
3. Ecology: creatures occupy habitats, leave evidence, react to environmental
   changes and offer different encounters, with readable tells and counterplay.
4. Terrain and architecture: broad landforms, irregular spaces, elevation,
   traversable connections and coherent furnishing. Geometry, collision,
   navigation and maps must agree, including non-square rooms.
5. Discovery: clues lead to linked secrets and optional expeditions; rewards
   change the run without becoming mandatory gates on the exit.
6. Atmosphere: material-specific sound, practical lighting, restrained shaders
   and environmental motion all communicate the same world state.
7. Authoring and usability: inspect the real generated world, understand its
   rules, identify landmarks, and retain clear routes and interaction prompts.

## First implementation: the old watercourse

- Generate an optional source-to-outfall circuit over actual open door links.
- Keep the control and reward reachable without the locked vault or a secret.
- Render continuous shallow channels and flow markers through those doors.
- A wall sluice lowers the circuit water, exposing a downstream cache.
- The action has a mechanical sound and a noise consequence; the changed floor
  stays changed on revisits and resets on descent and a new run.
- Introduce the mechanism through physical labels and prompts, not debug UI.
- Verify deterministic graphs, safe anchors, door continuity, reset behavior,
  remote-action guards, one-time rewards and real browser interaction.

## Following work

The first watercourse implementation and World atlas are now in the worktree.
The circuit crosses 1,772 rooms in the 360-floor world check; 343 of those
floors support both safe endpoints. The remaining floors omit the expedition
rather than putting a mechanism in a doorway or behind a vault lock. Channels
reach actual door thresholds, retain directional bronze markers when dry and
make splashing footsteps only where the player crosses the wet strip. A wall
wheel drains the water in six seconds of unpaused run time. The downstream
reliquary pays once, and both states reset on descent or a new run.

The World atlas supports seed/depth selection, connected districts, hidden
branches, directional water routes and room blueprints with furniture and
mechanism approaches. Its habitat overlay also previews flowing and drained
water: toads move between actual channel edges and refuges, bellcaps become
dormant, and exposure ranges remain visible alongside furnishings. A habitat
button locates populated rooms without scanning every blueprint. The preview
reads the same habitat functions as the game and never changes the live run.
This is the first infrastructure layer; the broader
ecology, landmarks, vertical terrain and longer discovery chains below remain
open work. The expansion goal is not complete.

Develop district landmarks and furnishing grammars around the infrastructure;
add habitat changes and new creature behavior; expand the geography into
terraced, vertical and ruined spaces; build longer clue chains and optional
routes. Integrate each addition into the same world model and verify it in play.

Next priority: traversable landforms and longer discovery chains around the
infrastructure. Elevation needs a shared height model for rendering, collision,
arrivals, props and pursuers. Door thresholds should connect at their existing
height; ramps must provide real routes onto terraces, and movement must respect
cliffs rather than letting creatures snap vertically between levels. The
watercourse remains the organizing feature for these spaces and discoveries.

The next layer is now implemented: nine place identities across three building
traditions. Rootwater uses growing trellises, the works use iron service frames,
and the choir uses stepped vaulting. Structural bays follow the exact floor
union and stay above doorway clearance. Unauthored chambers now furnish growing
areas, work areas or paired memorials on the shared validated anchors. The
World atlas names the identity and its history alongside the room's encounter.

Native toads gather at usable channel edges when there is a clear route to a
damp wall refuge. Draining that channel starts a visible retreat and silences
its chorus. Pauses freeze the movement and revisits preserve the destination;
toads that stay in independent damp habitats keep their original behavior.
The world check currently covers 763 clear migration routes.

Closed side galleries now have full-width ramps and raised landings. A shared
height model places rewards, moving creatures, dropped keys, devices and blast
effects on the terrain; rendering and collision use the same wedge mesh.
Connected doorways and secret thresholds retain their original height. The
minimap and World atlas show the raised landings within each actual footprint.
Generation checks cover 645 galleries in all four directions. Broader vertical
landforms and longer linked discoveries remain open expansion work.

## Completion evidence

Rootwater and choir side galleries can now end in block-cut half-round apses.
Their one-metre floor courses taper toward the end wall while retaining the
full shifted mouth. The same courses shape the floor, raised ramp/landing,
physical walls, roof ribs and minimap fill. Industrial galleries retain their
rectangular service geometry, and connected travel doorways stay unchanged.
The world sweep covers 234 apses in all four directions; navigation checks
cover real gallery centers and the changing side clearances.

The reliquary now holds a maintenance rubbing on floors with a valid service
route. Three-notch copper marks run through real doors to an existing secret
wall. The rubbing teaches the catch, supplies persistent room-specific guidance
and records already visited marks on the minimap. The service catch opens the
same passage as the existing bomb/darkness interactions. It does not generate
a second secret, spend a bomb or alter the required exit route. Its knowledge
is owned by the reliquary's floor-local state and clears on descent. The atlas
shows the route for authoring. Generation checks cover 292 linked expeditions.

Further work remains in larger landforms, richer creature encounters and
multi-stage environmental consequences beyond the first waterworks circuit.

Bellcap colonies now occupy clear Rootwater channel banks. A raised lantern
within three metres causes a 2.8-second swelling warning; lowering one light
band or retreating cancels it. A discharge produces a positional spore hiss and
a real Din noise signal, allowing the existing listeners to react. Twelve
seconds of recovery persist across revisits. Drainage collapses the caps,
extinguishes their glow and prevents further discharges. The colonies use
instanced block geometry and a short, sparse cube-particle puff. Generation
checks cover 492 colonies, with real keyboard lantern counterplay tested in
the browser alongside pause, recovery and floor/run resets.

Glow beetles now feed around bellcaps in mossy, flooded and fungal habitats.
They make low flights within the colony's clear space, lighting the living
bank in darkness. Bright light or a Din noise signal sends them under the caps;
they return after quiet settles, and dry beds keep them sheltered. Their body,
hearing thresholds, awareness cap, lesson, positional voice and runtime probe
are registered alongside the other creatures. Three instanced batches draw a
room's beetles, with one small pooled light per colony. The generation sweep
checks 1,140 beetles and their full foraging/retreat paths against walls and
furniture. The atlas includes their feeding positions and habitat rules.

Pure generation checks must cover hundreds of floors and actual room shapes.
Runtime checks must operate mechanisms through player controls, revisit affected
rooms, inspect map clues and rewards, and cross floor/run resets. Visual and
audio review must show a readable handmade world. Passing old tests alone does
not establish that the expansion above is complete.
