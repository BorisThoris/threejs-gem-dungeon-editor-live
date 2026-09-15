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

Bookshelf batching brings the next complete 78-room sample to 76 draw calls;
triangles and live geometry still peak at 9,232 and 116. Revisit and memory
checks pass, while the three rendering limits remain exceeded.

Paint-depth terrain now draws only its upward-facing surface, preserving the
original top elevation, tile footprint, texture orientation and stepped water
shader. Each tile uses two triangles instead of twelve; the narrow decorative
side faces are omitted. Native browser reviews cover fungal, flooded and hewn
materials, with build, typecheck and lint passing. This is an 83% reduction in
terrain tile geometry, not a claim that the full room budget now passes; the
complete sample above predates this terrain change. The subsequent complete
sample measures 76 calls, 8,112 triangles and 116 geometries, with revisit and
retained-memory checks passing. The same three rendering limits still fail.

The base floor now renders a disjoint union of the physical floor rectangles.
Overlapping door collars no longer submit coplanar slab faces, and the separate
polygon overlay has been removed. Chamber, collar and passage surfaces share
world-space texture coordinates at one repeat per four metres. Raised terraces
retain their existing shared mesh and collision. Coverage checks prove complete
physical-floor coverage without overlapping surface strips across all 4,539
generated rooms. Native browser checks pass ramp ascent/descent and tapered
wall collision in all four apse directions; three biome renders, build,
typecheck and lint pass. The full performance sample above predates this base
floor change.

Raised galleries now inherit the chamber floor's biome material and use the
same world-space texture direction and four-metre repeat. This removes the
separate stone treatment and reversed texture alignment at ramp mouths.
The apse browser check verifies shared texture identity, matching color and
vertex-level texture coordinates in all four directions, alongside real
ascent, descent and tapered wall collision. Build, typecheck and lint pass.

The atlas gallery section now supports inspecting a position along the ramp
and landing. Its marker reports the actual floor height, changing floor width,
ceiling clearance and room coordinates through the shared terrain functions.
The slider supports keyboard input. Browser review checks mouth and landing
values, keyboard stepping, direction changes and new seed/depth selections;
build, typecheck and lint pass.

The plan probe and gallery section share one inspected position. Selecting a
gallery in the plan chooses its section, and moving the section slider updates
the plan and material readout. A chamber selection hides the gallery marker.
Browser checks verify matching coordinates in both directions and center reset.

Paving and deposit fields now extend into passages and raised galleries.
The passage center stays paved; side beds use the chamber's continuous field.
Tiles follow the actual slope and split at ramp-to-landing transitions, while
curved end widths limit the available bed. Flooded deposits stay off slopes.
The existing two terrain batches render both chamber and gallery pieces.
World checks cover 464,219 pieces across 4,539 rooms, checking every corner
against the floor footprint and height. Native apse tests also inspect actual
instance transforms before walking up and down all four orientations. Build,
typecheck, lint and the browser checks pass. The broader rendering budgets
still need a new full sample after the floor and gallery additions.

That full 78-room sample now peaks at 75 calls, 8,160 triangles and 110 live
geometries, with 10 textures. Revisit, sprint and retained-memory checks pass;
the three rendering budgets still fail. These figures include the continuous
base floor and the extended gallery terrain.

The atlas now projects the actual generated paving and deposit tiles into the
room blueprint. Its terrain toggle is independent of habitats and lamps, and
water, furnishings and interaction markers remain above the terrain layer.
Browser review compares tile counts for every room across three depths, checks
the toggle and captures a gallery blueprint. Build, typecheck and lint pass.

Footsteps now sample the visible terrain under the player. Stone paving,
soft growth, timber, iron and water have distinct procedural cues; live channel
water covers the underlying sound and independent wet beds remain wet after
drainage. The room's existing noise propagation rules remain in force. Terrain
classification checks pass across 4,539 rooms, the full audio suite measures
all new cues above its audibility threshold, and a real walking check confirms
the transition from soft ground to paving. Build, typecheck and lint pass.

Toad refuges now prefer the visible, flat damp and mossy terrain beds, with
furniture clearance and spacing between refuges. Channel gathering still
requires an unobstructed route to that refuge; blocked routes leave the toad
in its independent habitat. Bodies sample the shared floor height during
movement and at rest. The world check verifies deposit-backed refuges and
748 clear migration routes. Browser checks pass drainage, pause, dry chorus,
revisit persistence and rendered body height; build, typecheck and lint pass.
Initial toad positions now use that same persistent drain clock, so entering
a drained room while paused shows sheltered animals immediately. Browser
checks remount the room while paused, inspect the bodies before resuming and
verify that they remain still. The world check also covers migration timing.

The atlas drainage timeline can scrub the ten seconds after opening the sluice.
Water level, probe footing, bellcap dormancy and toad retreat use the same
timing functions as the game. The endpoint presets remain available. Browser
checks verify half-full water, the exact retreat midpoint, both endpoint
positions and dormancy; build, typecheck and lint pass.

The accumulated floor, terrain, habitat and sound changes pass the full
gameplay suite on a fresh Vite server, including combat, physical galleries,
minimap privacy, pursuit, paused encounters and Keeper escape. The older server
failed a Harrier retreat assertion; the fresh run passed without combat changes.
Toads, rats and bats now share their identical body geometries and materials
through the existing prop registry. A two-lap browser check observes 98 mesh
visits using six geometries and six materials, with no shared-resource disposal.
Build, typecheck and lint pass after that resource change. No new full rendering
budget measurement is claimed for it.

Calm and noise-triggered rat returns now use room-aware obstacle routing;
wandering also checks furniture instead of choosing an unchecked heading.
Their body bob uses the paused run clock and initial placement samples floor
height. A native browser sequence scatters a rat, observes its homeward path
clear of furniture, and verifies arrival at its hole. Build, typecheck and
lint pass for the movement change.

The atlas ground probe reports floor height and footstep material at a selected
plan position. It supports pointer selection, arrow-key movement and a center
reset, stays within the floor union, and resets when the selected room changes.
Its material reading responds to the flowing/drained preview. Browser checks
cover physical landing height, drainage, keyboard controls and seed reset;
build, typecheck and lint pass.

Rat fleeing and wandering now test the actual room outline as well as furniture
before choosing a heading. Their local steering can turn along angled walls;
when every candidate is blocked, an ambient rat waits instead of using the
pursuing enemy's straight-through fallback. Newly placed furniture still allows
an animal already inside its footprint to escape outward. Generation checks
exercise 34,167 legal boundary turns across 4,539 rooms, plus a closed furniture
ring and an outward escape. The native browser scatter-and-return check passes
(59 homeward observations), as do typecheck and lint. Rendering budgets remain
an open issue; this movement pass does not establish broader completion.

Flooded terrain glints now use the persistent run clock, matching the timing
model of the channel current. Paused remounts preserve the exact ripple phase
instead of resetting the pool animation to zero. The three-step handmade glint
is unchanged. `scripts/terrain-browser-check.mjs` checks the live material's
shader uniform, advancement, pause, room remount and resumed animation in Chrome.

The subsequent full performance sweep samples 78 rooms: worst values are
75 draw calls, 7,880 triangles, 106 geometries and 10 textures. Draw calls,
triangles and geometries still exceed the unchanged budgets. Room revisits do
not accumulate geometries; sprinting and held-audio memory checks pass.

Barrel hoops previously stood vertically through the barrel. They now wrap
horizontally around its tapered sides, with fourteen facets aligned to the
wood body and a square cross-section. Both hoops share one geometry. A native
Chrome asset render confirms the corrected silhouette and a reduction from
536 to 280 triangles per barrel. This change follows the full sweep above;
those room totals do not include the barrel reduction.

Sentries use a faceted metal housing and a simpler luminous lens, keeping the
blue/red acquisition cue and the independently animated floor wedge. Their
static post, housing and lens share cached geometry and immutable materials;
the clipped beam remains owned by each sentry. Native Chrome rendering counts
176 triangles including the beam, down from 416. Visual inspection and live
acquisition/release verify the blue lens turns red and returns to blue. Typecheck
and lint pass. The full room performance totals above predate this change too.

Sprint stealth now samples the same ground as audible footsteps. Moss and
fungal beds, paving, boards, metal and live water crossings use existing tuned
material carry values. Independent wet beds remain noisy after channel drainage.
Bone rooms retain their authored carry value. Walking remains below creature
hearing thresholds and non-footstep emissions ignore the surface override.
The Warden's noise deadline uses the sampled carry; throttled sprint events
carry player coordinates and surface into the Din instead of treating a Warden
reaction as a fresh sound at the centre of the room. Earlier louder deadlines
are not shortened by stepping onto quieter ground.

`scripts/terrain-stealth-browser-check.mjs` verifies all five material magnitudes
and Warden deadlines through the live event driver, then holds sprint with real
keyboard input and checks the emitted material against its world position.
It passes on a fresh Vite server; the older HMR session returned a separate
dynamically imported Din instance and could not observe the live signals.
World checks pass across 4,539 rooms, including material ordering, quiet walking
and unchanged bomb magnitude.

The Atlas ground probe displays relative sprint noise and the base noise-memory
duration. Its optional sprint overlay calls the same room-graph propagation
function as the live Din: dashed rings and relative strengths show a fresh
signal from the selected surface. Moving the probe or previewing drainage
changes the source. Closed secret walls stay outside propagation. The legend
states that doors are unbarred, item effects are omitted, and creature thresholds
differ. Native browser comparison verifies every shown room and strength against
the propagation function in flowing and drained states, plus overlay toggling;
the rendered view was inspected. The full layout suite also passed following
the terrain-stealth changes.

The full gameplay suite passes after terrain stealth and the faceted sentry
change, including combat, controls, ramp traversal, watcher cover, pursuit and
pause behavior. A subsequent physical wall test exposed synthetic footfalls:
the player stayed in exactly one place but generated seven more steps and three
fresh sprint signals. Gait now uses measured horizontal motion, capped by the
requested movement, and teleports reset the movement sample. The browser test
now verifies silence against a wall, a quiet short teleport and resumed steps
when walking away. Earlier noise still fades naturally. This footstep fix
postdates the full gameplay run; its collision and terrain-stealth checks are
targeted native-browser regressions.

Rat homes now derive from real wall courses rather than four invisible corner
points. Seeded selection keeps up to three homes separated, checks scaled
furniture along the approach, avoids door openings and requires level ground.
Small dark recesses with district-tinted lintels mark the homes. All shelters
share one instanced draw (eight triangles per shelter) and add no colliders.
Their faces clear the low construction trim; native visual inspection caught
and corrected partial occlusion by that trim. Pure generation checks cover body
clearance, continuous approaches, floor height and actual wall anchoring across
4,539 rooms. Typecheck, lint and build pass.
The native scatter-and-return check also passes using the live room's sentry
reservation when constructing its obstacle list. Its earlier overlap report
counted a pillar removed by that reservation, rather than a rendered obstacle.

Atlas habitat inspection now uses the dungeon seed used by the live room for
toads and rats. Tan shelter brackets and short approach lines show rat homes,
and Next habitat includes rooms inhabited only by rats. Furniture preview uses
the initial key and sentry reservations and includes prop scale in its drawn
radius. A native browser check compares all habitat positions, rat-home counts
and furniture coordinates/radii across the eleven rooms of seed 72, depth 2,
and verifies that hiding habitats removes the animal markers. The view was
visually inspected; typecheck and lint pass.

Rat losses now persist for the current floor. The spike-contact branch records
the room and rat index in run state, and both active frames and initial render
read that record. Returning while paused cannot briefly revive an animal; its
wall shelter remains. New runs and floor descent clear the records. A native
browser check invokes the loss action and verifies live hiding, paused revisit,
an unaffected survivor, retained shelters and both reset boundaries. This checks
persistence after a recorded loss. A subsequent `test:rats` regression finds
a generated room with a reachable spike path, moves the player behind a rat,
and waits for its actual fleeing movement to enter the spikes. It verifies the
recorded loss occurred inside a hazard after leaving home, then revisits while
paused and confirms the animal remains absent. That native Chrome check passes.
The player follows behind during this test: a stationary initial scare proved
sensitive to the animal's random wander and could miss the narrow spike patch.

The habitat-checkpoint performance sweep covers 78 rooms and now meets the
72-call budget. It still exceeds triangle and geometry budgets at 7,500 and
105 respectively; textures peak at 10. Settled room revisits do not accumulate
geometry, and sprint/held-audio memory checks pass.

Architectural block batches now instance shared plane faces with the original
cube UV orientation. A face is omitted only when all four corners just outside
it lie inside one opaque neighboring block; partial coverage is retained.
Architecture shares occluders across its three material batches. A textured
native-render comparison is pixel-identical across three views, including a
rotated block and a buried joint. In the busiest room the main detail batch
drops from 1,152 to 1,056 triangles, and its accent batch from 576 to 480; lamp
frames also lose buried faces. The 78-room totals above predate this change.

Deposit tiles now meet along shared edges instead of leaving four-centimetre
dry seams through water and planted beds. Paving stones retain their joints.
Footprint checks use the full expanded tile corners, including tapered gallery
widths and ramp cuts. Deposits sample world-space texture grain, so neighboring
tiles do not restart the moss pattern. Generation checks verify continuous
footing at adjoining wet/soft tile edges after drainage; native fungal, flooded
and hewn renders have no shader errors. The sentry floor beam now clears all
three paint-depth overlays at 0.06m above the chamber datum. Native fungal,
flooded and hewn checks verify every beam vertex is above the channel's 0.041m
surface, with depth testing retained; rendered review confirms a continuous
warning wedge instead of illuminated paving joints.

The warning now follows raised galleries too. Its wall-clipped fan is split at
terrace course boundaries and ramp knees, then projected onto each floor plane.
One mesh retains depth testing and reuses its vertex buffer between frames;
paused sweeps skip projection entirely. The pure projection check covers four
shapes and all four gallery directions, with 459,440 interior surface samples
and upward triangle winding. Extra rays on either side of wall corners keep
the fan inside concave room outlines; interior samples also check containment. Its largest fixture uses 170 triangles instead of
the flat fan's 28; the full performance sweep must be repeated before claiming
this fits the existing budget. Native runtime checks confirm raised ramp height,
surface alignment, pause and resume; a close render shows the marking above
ramp paving. The initial undersized browser fixture placed its sentry outside
the octagon; the corrected fixture uses a valid 20m chamber.

The subsequent 78-room sweep measures 73 calls, 7,149 triangles, 104 live
geometries and 10 textures. Calls, triangles and geometries exceed their existing
budgets. Settled revisits show no geometry growth; sprinting retains no extra
heap after collection, and held-audio checks pass. A separate CPU-only beam
probe over the same seeds finds up to 711 projected triangles in a watched
room, above the smaller synthetic fixture's 170; its slowest room averages
about 0.93ms per projection on this machine. This is not a device frame-time
guarantee.

Waterworks panels, wheel spokes, seal bars, inscriptions, beetles and spore
clouds now reuse shared geometries. Size changes are mesh transforms, preserving
their silhouettes and UVs. Service catches batch their three copper notches
into one draw. These changes follow the performance sweep above; their full
budget impact still needs measurement.

The shared-geometry sweep completed at 73 calls, 8,166 triangles, 106 geometries
and 10 textures. All 78 rooms were sampled; revisits, sprint memory and held
audio passed, but the same three rendering budgets failed. These animated
snapshots do not establish a lower overall peak from geometry sharing.

Beam projection now removes redundant collinear wall hits before splitting
at changes of floor plane. A straight wall needs one fan triangle instead of
28. Native render comparisons across 144 generated-room views were
pixel-identical, with 15,330 triangles reduced to 9,368 across those views.
The surface/winding/containment check now samples 129,080 points and reaches
140 triangles in its synthetic fixtures. The generated-room CPU probe peaks
at 522 triangles, down from 711 before simplification. These beam-specific
results are not a claim that the full-world budgets pass.

## Terrain with a purpose

The shared terrain grammar replaces the broad sinusoidal deposit threshold
with room-scale land use: nursery furrows and tending paths, rounded settling
basins, mycelium fans, kiln aprons, loading bays, service courses, processional
and ossuary margins, and a broken mineral ring. Central crossings stay paved;
gallery beds flank the travel aisle, and standing water stays off ramps.
Perimeter bands measure the actual shaped chamber boundary instead of its
bounding square. The World atlas names and explains each pattern beside the
same floor plan used by the game.

Habitat cells remain available to creatures and footsteps. Rendering coalesces
touching deposit rectangles only when they share a floor plane, preserving
holes, ramp knees and world-space grain. Across 4,539 generated rooms, 153,133
deposit cells become 51,324 render faces. Every original cell remains fully
covered, with the same floor plane and total area. A native textured comparison
reduces 78 cells to 20 faces with a maximum one-level pixel difference across
three views. Paving retains its individual stone joints.

The world check covers 489,928 terrain cells across nine biomes. Native checks
pass shaped-gallery ascent/descent, toad gathering and retreat, persistent dry
refuges, material-specific sprint signals, and paused behavior. Typecheck, lint
and build pass. These rendering changes still need a new full performance sweep.

## Named discovery journeys

The maintenance rubbing now names the next place and the number of real doors
remaining before the catch. Its place-name helper is shared with the arrival
HUD: former purpose or waterworks role remains visible alongside a nonstandard
encounter, such as "Sluice house (Library)". A clue and the place reached through
that door no longer use different names.

Leaving the trail offers the shortest known route back. Recovery traverses only
visited rooms and real links, excluding the vault and descending stairs. If no
known connection exists, the rubbing retains its reliquary hint instead of
revealing an unexplored shortcut. No guidance appears before the rubbing is
learned; opening the passage completes it, and descent clears it as before.
Checks cover 293 generated trails and 907 named legs, plus unknown/known
shortcuts, gates, completion and native HUD updates. The watercourse browser
test still passes keyboard operation, physical catch travel, rewards and reset
behavior; typecheck, lint and build pass.

Pure generation checks must cover hundreds of floors and actual room shapes.
Runtime checks must operate mechanisms through player controls, revisit affected
rooms, inspect map clues and rewards, and cross floor/run resets. Visual and
audio review must show a readable handmade world. Passing old tests alone does
not establish that the expansion above is complete.
