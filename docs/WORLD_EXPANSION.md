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

Passages now use visible hanging oil lamps with district-specific wooden,
iron or stepped bronze frames. Spacing follows passage length and shifted
centres, independently of floor tessellation: the world sweep uses 2,824 lamps
where the former per-course fill created 3,777 lights. The fixtures clear raised
landings, retain warm practical lighting and flutter gently on the pause-aware
run clock. Frames and panes use two instanced batches per room. The shaped
gallery browser check verifies paused/resumed lighting alongside traversal.

Channel ripples now use metre-based coordinates along the actual current.
Incoming strips flow toward the room centre and outgoing strips follow the
bronze arrows, with the same spacing in short and long passages. A shared
material draws stepped highlights across narrow lanes. Opening the sluice
smoothly slows the current with the falling water level; its integrated phase
never jumps backwards and stops completely when dry. Pause and revisits read
the same run-clock phase. Dry beds and their bronze direction marks remain.

The atlas now overlays the actual passage lamps and directional channel marks.
Its gallery navigation opens a side elevation of each raised wing, using the
same ramp lengths, landing heights, changing course widths and fixture locations
as the game. The floor blueprint remains the authority for the horizontal shape;
the side view makes elevation legible alongside it. Flowing/dry previews retain
direction marks, and the lamp overlay can be hidden independently of habitats.

Deeper floors now close useful exploration loops across existing shared walls.
Depth two seeks one independent loop and depth three seeks two, choosing the
longest available detour each time. Floors without suitable adjacent chambers
retain their geography. This happens before stairs, vaults, secrets and districts
are assigned, so their reachability rules inspect the final connected graph.
Explicit loopChance settings remain authoritative. In the current 120-seed
sweep, 115 depth-two floors and all 120 depth-three floors offer alternate routes.
The changed graphs retain 343 complete waterworks circuits and 293 service
expeditions; the browser check traverses a full circuit using real door controls.

District boundaries now carry carved lintels naming the district beyond the
door. Rootwater stalks, iron-work studs and the choir's stepped crest provide
distinct block silhouettes as well as words. Signs use actual linked rooms,
remain above doorway clearance and announce the correct destination from both
sides. Sealed branches add no signs. The world sweep checks placement and
reciprocity, and a browser traversal checks the two rendered faces in play.

Flowing channels now have their own held water sound beneath the native biome
ambience. The nearest point on the actual wet strips determines distance and
stereo direction. Gain falls with the same six-second water level used by the
shader and habitats; pause, drainage and room unmount stop the voice. Returning
to a dry channel cannot restart it. A single reused voice supplies the layer,
and drainage leaves independent damp-biome sounds intact.

Procedural rooms now carry continuous district wall courses: timber growing
rails, iron service bands and stepped stone bases. Short masonry courses follow
the actual wall edges and local terrace height, interrupting at doorways, secret
cracks and water stations. Their faces project only two centimetres beyond the
existing wall collider. Authored compositions remain intact. Two instanced
batches draw each room's courses; generation checks verify their attachment and
portal clearance, and all three traditions have been visually reviewed in play.

The integrated gameplay suite passes with these systems together. Performance
sampling now stays on the requested floor (inspecting stairs previously caused
descent), resets the camera and measures four fresh viewing directions. Native
Windows rendering replaces the unreliable forced software path. Repeated-room
geometry and retained-memory checks pass, but the existing rendering budgets
are still exceeded: before optimization, the 78-room sweep peaked at 84 draws,
11,992 triangles and 150 live geometries. These are open engineering work,
not a passing performance result. Removing buried faces from wall trims cuts
the worst room's course geometry from 3,312 to 552 triangles, with the visible
district treatment retained. Further profiling and optimization remain required.

Building blocks, terrain deposits and wall-course faces now reuse the existing
shared geometry registry. The same room and camera view measured 32 live
geometries instead of 42, with unchanged draws and triangles. This reduces
duplicate shape allocation; it does not establish that the full rendering
budgets now pass. Room-owned instance transforms and materials remain separate.

The full post-sharing sample confirms a reduction to 9,232 triangles and 130
live geometries in the worst measured room; 84 draw calls still exceeded the
existing limit. Floor service marks now batch their six notches and two tips
into two draws, and bronze flow arrows batch into one instead of four. Rotated
block instances preserve the original positions, directions and materials.
The real waterworks/secret-route browser test passes after this change. A new
full rendering sample is still required before claiming the budgets pass.

District crests now batch their three raised pieces into one draw and share
the sign backing geometry. The repeated 78-room sample peaks at 78 draws,
9,232 triangles and 116 live geometries, with 10 textures. Per-room revisit
and retained-memory checks pass. The existing 72/4,800/88 rendering limits
still fail; these measurements are improvement evidence, not a green suite.

Pure generation checks must cover hundreds of floors and actual room shapes.
Runtime checks must operate mechanisms through player controls, revisit affected
rooms, inspect map clues and rewards, and cross floor/run resets. Visual and
audio review must show a readable handmade world. Passing old tests alone does
not establish that the expansion above is complete.
