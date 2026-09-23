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

The purposeful-terrain/named-trail performance checkpoint measures 73 calls,
7,591 triangles, 112 geometries and 10 textures across 78 rooms. The same three
rendering budgets remain exceeded. Settled revisits, sprint memory and held
audio checks pass. This checkpoint predates the sediment refinement below.

## What drainage leaves behind

The channel's existing dark base is now a textured sediment bed: muted garden
silt, rusty works deposits, or pale tomb sediment. Shared world-space grain
continues across its segments. The base retains its original 0.041m surface
height and bronze surround; each segment submits one top face instead of a
box. It adds no collision or navigation obstacle.

The moving water and the reliquary's water cover remain separate from this dry
surface. The expanded native watercourse check verifies that water disappears
while textured sediment stays visible, with two triangles per segment and the
original height. Keyboard drainage, current sound, pause, revisits, cache
rewards, the secret catch and resets still pass. Garden, works and tomb renders
have no shader errors; typecheck, lint and build pass.

The World atlas reads the same sediment palette and names as the physical
channel. Its preview layers fading water over a persistent bed instead of
substituting a generic dark rectangle when drained. A three-second timeline
sample shows half the water layer; dry direction marks remain legible. The
selected-room heading also uses the shared place name from clues and arrival
readouts. Native checks cover all four watercourse rooms of the default atlas
floor in flowing, half-drained and drained states; typecheck, lint and build pass.

## Continuous ceiling underside

Ceilings now render the disjoint union of their old slab footprints as downward
faces at the original underside height. The half-metre slab expansion is
preserved, covering wall tops and gallery collars without overlapping roof
faces. Physical walls, floors and traversal are unchanged; the existing
ceiling visibility option still controls the whole surface.

Native room comparisons from below differ by at most one pixel color level,
with 212 slab-face triangles reduced to 78 in the comparison fixture. Generation
checks cover all 4,539 rooms: panels do not overlap, stay inside the old outline,
and completely cover every original slab. Typecheck, lint and build pass. The
full rendering budget remains unresolved; these are ceiling-specific results.

Secret-wall seams now pulse on the persistent run clock, including their first
material value after mounting. The clue no longer advances while paused or
restarts its phase on a paused room revisit. The native browser check verifies
clock alignment, pause, remount and resume.

The authored normal-room library now includes a 28-metre circular workroom.
Two opposed table-and-chair groups have nearby supplies, with separate storage
groups in the other quadrants. Its 14 furnishings leave the central crossing,
door approaches, braziers, gem and key anchors clear. The existing polygonal
footprint remains the source for walls, collision and map geometry.

Placement validation covers all eight orientations and 60 anchor seeds. A
native generated fixture (seed 30, room_8, floor 2) keeps all 14 furnishings;
both table groups were visually reviewed. The generation sweep covers 4,539
rooms and 491,864 terrain cells. Slotted-template variety checks now collect
at least 60 generated examples per template before measuring variation,
with a bounded seed search and explicit failure for insufficient samples.

Authored supply slots can now declare `byDistrict` choices for `gardens`,
`works` and `tombs`; the ordinary `into` list remains the fallback for rooms
without a district. Substitution keeps the authored positions and makes one
consistent choice for the entire slot group. The circular workroom uses urns
or barrels in gardens, crates or barrels in the works, and urns in tombs.
This changes dressing without changing its reward count.

All regional choices participate in footprint and reward validation. Imported
slot rules reject empty lists, unknown props and unknown districts. Native
generated fixtures in all three districts retain all 14 furnishings and produce
stable results on repeated reads; the shipped templates also pass the editor's
import guard. Layout checks, typecheck, lint and build pass.

Footsteps now feed a quiet three-tap early-reflection effect. Its delay derives
from the union area of the physical floor, including polygon cuts and galleries;
moss and fungi absorb more of the return than stone, with timber between them.
Threat cues retain their directional dry signal. The effect uses eight shared
audio nodes, with no feedback loop or per-room buffers, and is disabled on pause
and outside a run.

Native offline audio checks measure the rendered impulse: a 20-metre square
returns at about 58 ms, a 36-metre square at 105 ms, and a same-size circular
room sooner than the square. Moss yields about 3% of the stone fixture's returned
energy. Tails end before half a second, disabling the return produces silence,
and 10,000 profile changes create no further nodes. Live checks cover room entry,
pause and resume. The isolated audio suite now unmounts generated room sound
drivers before probing voices, because a live watercourse otherwise overwrites
the test's current-volume commands. The full native audio suite passes, including
cue audibility, water drainage, event wiring, music and mute behavior; typecheck,
lint and build also pass.

The Room Builder can copy a shipped room into an independent, initially disabled
draft. District, biome and seed controls preview its architecture, terrain and
resolved supply groups while exports preserve the authored layout. Automatic
biomes use the district's preference among the room kind's supported biomes;
an explicit biome remains available for inspection.

Preview templates now live outside the generation registry. Turning a draft off
or deleting it removes its generation eligibility and restores a shipped room
when the draft overrides that ID. Native editor checks cover copying, regional
supplies, unchanged exports, enable/disable, preview cleanup and restoring
shipped overrides; the circular fungal-room preview was visually reviewed.

Skulls now use a flat-faceted cranium, lower jaw, individual teeth and dark
socket shapes instead of three smooth spheres. The shared prop uses 93 triangles
and two meshes instead of 376 triangles and three meshes. Native generated-room
checks confirm shared geometry across instances, finite normals, a grounded base
and the existing 0.2-metre footprint; the prop was reviewed both close up and at
gameplay scale. Typecheck, lint and build pass.

The performance sweep immediately before this prop change still exceeds the
full budgets: 73 calls, 6,918 triangles and 106 geometries across 78 rooms.
Textures (10), repeated room visits, sprinting memory and held-audio checks pass.
The skull reduction is a local improvement, not proof that the full budget fits.

The prop catalogue now shares one unit-cube geometry across 15 formerly sized
box meshes and the instanced bookshelf books. Mesh scales retain the furniture's
dimensions; book dimensions live in their instance transforms. Existing parent
rotations, scales, materials and collider specifications remain in effect.
Native render comparisons cover eight prop views and 23 meshes, including the
books: maximum pixel difference is one colour level, with mean difference below
0.000001. Typecheck, lint and build pass.

The subsequent full sweep measures 78 rooms and meets the 72-call draw budget.
The remaining failures are 6,635 triangles against 4,800 and 90 live geometries
against 88. Textures peak at 10. Ten revisited rooms show no geometry growth;
1,498 sprint frames over 10.4 seconds retain no additional heap after collection,
and 20,000 held-audio updates retain one voice. The heaviest triangle case remains
seed 4242, floor 3, trap room_6; the geometry peak is room_7 on that floor.
These are current sweep measurements, not a claim that all performance work is
complete. Full per-room results are retained in the local review artifacts.

Potion bulbs, statue heads and urn bodies now share their identical sphere
topology at unit radius, with their original radius applied as mesh scale.
Six native views across all three materials compare pixel-for-pixel with the
previous geometry. Typecheck, lint and build pass.

The resulting full 78-room sweep meets the draw-call (72), geometry (88) and
texture (10) budgets. Revisit stability, sprint memory and held-audio checks
also pass. The remaining performance failure is the triangle peak: 6,634 against
4,800 in seed 4242, floor 3, trap room_6. A separate inspection now excludes
hidden ancestors and respects geometry draw ranges when identifying contributors,
so inactive particles and unused beam-buffer capacity cannot misdirect the work.

Sentry warning projection now splits at changes in floor slope, rather than
extending every gallery masonry-course edge across the whole chamber. The
visibility polygon still follows every actual wall corner. This removes redundant
subdivision of flat floors and landings while retaining ramp entrances and knees.

Projection checks now include 72 generated watched galleries, all shifted and
20 with rounded ends, with 266,444 interior samples checked against walls and
physical floor height. Across 144 native render comparisons, beam triangles drop
from 11,364 to 3,585; the mean pixel difference is below 0.00005, with sparse
pixel differences. Native raised-gallery, pause and resume checks,
typecheck, lint and build pass.

The subsequent live sweep remains over the triangle budget at 6,708, with 72
calls, 88 geometries and 10 textures; all other performance checks pass. This
does not establish a reduction in the full room peak. The sweep samples moving
actors rather than matching their poses across versions, so the controlled beam
comparison is the evidence for this change's reduction, not the live peak.

Pure generation checks must cover hundreds of floors and actual room shapes.
Runtime checks must operate mechanisms through player controls, revisit affected
rooms, inspect map clues and rewards, and cross floor/run resets. Visual and
audio review must show a readable handmade world. Passing old tests alone does
not establish that the expansion above is complete.

Cross chambers are now a first-class concave room shape. Their floor is the
union of two broad rectangular arms, producing twelve real wall courses and
four sheltered inward corners. The same footprint drives floor slabs, walls,
collision, terrain clipping, creature placement, furnishings, line checks and
the minimap. Generation uses the shape for ordinary halls, libraries, trials
and treasure rooms; the authored crossroads stages paired work desks in the
north and south arms and district-specific stores in the east and west arms.

The room validator now asks the physical footprint whether each prop and its
radius fit. This replaces its former circular approximation, allowing useful
space in long arms without admitting objects into clipped corners. A 7,566-room
generation sample gives cross chambers 8.7% of generated rooms. Native review
of a flooded cross fixture measured 38 calls, 3,170 triangles, 27 geometries
and five textures, with the concave walls, clipped terrain and minimap footprint
all matching.

Foundry kiln aprons now breathe visible embers from deterministic vent lines.
The lines follow the same side aprons as the terrain grammar and are clipped by
the real room footprint, so polygonal and cross rooms shorten the effect around
their missing floor. Up to sixteen block motes rise and turn in one instanced
draw call, using the room's existing ember ambience rather than adding another
held audio voice. A native foundry fixture checks that the effect is present and
keeps its declared one-call cost.

The full 78-room performance sweep after both additions peaks at 76 draw
calls, 6,731 triangles, 93 live geometries and 10 textures, within the written
96 / 8,800 / 112 / 16 budgets. Ten repeated room laps show no geometry growth,
616 sprint frames retain 0.00 MB after collection, and 20,000 held-audio updates
retain one voice. The heaviest room remains the floor-three trap in seed 4242;
neither a cross chamber nor the foundry effect becomes the new worst case.

Ash settling halls extend the old works into the buried choir. Their flue
baffles, warm low light and one-sided windrows describe where kiln exhaust was
slowed before it reached the tombs. Deep ash is quieter than bare stone, absorbs
early footstep returns, supports rats, and carries a sparse falling-grit room
tone. Deposits keep the central service crossing open and continue as edge
windrows through galleries; they use dirt grain and the same physical footprint
clipping as every other terrain bed.

Ash mites make those deposits a habitat. Up to six block-cut bodies comb real
windrow cells in one instanced draw call, outside the clear central crossing and
away from solid furnishings. A sprint or blast sends the whole colony beneath
the ash for five seconds, with one panned scurry and one first-time lesson. The
generation sweep finds 4,082 valid homes across 4,539 rooms, and the native
render check verifies both visible pixels and the shared burrow response.

The full 78-room performance sweep with ash halls and active mite colonies
peaks at 76 draw calls, 6,578 triangles, 87 live geometries and 10 textures,
within the 96 / 8,800 / 112 / 16 budgets. Ten repeated room laps show no
geometry growth, 1,493 sprint frames retain no heap after collection, and
20,000 held-audio updates still retain one voice.

District landmarks now give the connected regions fixed navigation anchors.
Every generated floor selects one real room in Rootwater, the old works and
the buried choir, preferring broad ordinary junctions without changing the
room graph. The rootwater knot, chain hoist and cantor's resonator each combine
paint-depth floor marks with overhead blockwork, keep doorway-height movement
clear, replace the generic place name in the readout and remain on the minimap
after discovery. Three short procedural arrival cues make them recognizable
without looking at the HUD.

A 360-floor generation sweep finds all 1,080 expected landmarks with every
block inside its room's true footprint. Native browser review covers all three
structures and their map marks. The full 78-room performance sweep peaks at
78 draw calls, 6,637 triangles, 87 geometries and 10 textures; repeated visits,
sprint memory and held-audio stability remain within budget. All 48 measured
one-shot cues, including the three landmark signatures, clear the room tone.

Those landmarks now begin a longer discovery instead of serving only as room
names. The landmark belonging to the sealed room's district traces a physical
tally through actual open doors to the cracked wall. Generation excludes the
locked vault and descending stairs; each turn uses paint-depth marks clipped to
the real room footprint. The route is unreadable until its landmark is visited,
then its visited steps persist on the minimap and a concise heading reports the
next door. Root, iron and choir routes retain distinct floor alphabets and quiet
continuation cues. The World atlas draws the whole authoring route and projects
the same marks into each selected blueprint.

The 360-floor sweep finds a route on every floor: 315 are multi-room chains,
covering 932 rooms in total, and the longest crosses six rooms. Browser checks
cover hidden and learned states, live rendering, HUD direction and minimap
persistence; the representative learned room uses 39 calls, 2,542 triangles,
21 geometries and three textures. The integrated 78-room performance sample
peaks at 78 calls, 6,661 triangles, 87 geometries and 10 textures. Ten repeated
room laps show no geometry growth, 1,501 sprint frames retain no heap after
collection, and 20,000 held-audio updates retain one voice.

Crystal resonance rings now support shardbacks: small mineral grazers placed on
the actual rendered deposit cells, clear of furniture and the room crossing.
Memory trials exclude them so the authored puzzle crystals keep one meaning. A
raised lantern within 4.5 metres lifts the colony's paired plates over a
1.6-second warning; lowering the lantern or leaving cancels it. If the warning
finishes, the ring answers with a panned three-note chime that enters the Din and
can alert the room. A blast produces the same immediate response. The colony
then folds for nine seconds. Bodies and plates remain two instanced draw calls,
with no creature lights or per-animal timers. The World atlas draws each home,
its blocked-by-walls light range and the same counterplay used in the game.

The generation sweep finds 75 valid shardback homes across 4,539 shaped rooms.
Native Chrome verifies visible pixels, pause freezing, lantern cancellation, one
warning and chime per completed approach, cooldown and the resulting Din signal.
All 53 procedural cues remain audible. The 78-room performance sweep peaks at
78 draw calls, 6,789 triangles, 87 geometries and 10 textures, within the
96 / 8,800 / 112 / 16 budgets. Ten repeated room laps add no geometries, 1,085
sprint frames retain no heap after collection, and 20,000 held-audio updates
retain one voice.

Terrain materials now carry the same place-specific vocabulary as terrain
layout. All ten biomes compile a separate world-space, block-quantized rule:
chisel checks, tended rows, mortar wear, stepped ripples, kiln heat bands,
saw-cut bays, ossuary flecks, resonant facets, spore breathing and sifting
windrows. The moving five read the persistent run clock and freeze through
pause and room remount; the fixed five stay attached to the floor. Merged beds
continue marks across former tile seams. The atlas names the rule and whether
it moves, so an author can review layout and finish together.

Native Chrome compiles and inspects every biome variant, checks unique shader
cache keys and verifies the water phase across play, pause, remount and resume.
Overhead review renders cover all ten materials. The full 78-room performance
sweep remains at 78 draw calls, 6,603 triangles, 87 geometries and 10 textures.
Ten repeated laps add no geometry; 1,500 sprint frames and 20,000 held-audio
updates retain no heap or extra voice. The new finish costs no scene submission,
texture, light or geometry.

Biome construction now carries the same vocabulary above the player. Every one
of the ten materials owns a repeated working remnant: quarry lifting wedges,
nursery root combs, burial tally tabs, sluice-screen rails, kiln dampers, pit
props, ossuary ribs, resonator forks, growing shelves or ash-settling baffles.
The motif repeats through alternating structural bays so it reads as how a room
was used, rather than as objects scattered against the ceiling. The World atlas
names the construction and explains its former purpose beside the district
identity and terrain rule.

All crown blocks are derived from the structural spans cut out of the actual
floor union. The 360-floor sweep checks their corners against circular,
polygonal, cross and gallery footprints and keeps their lowest face above full
doorway clearance. Native Chrome visits all ten biomes, verifies ten distinct
face signatures and confirms the additions remain in the architecture
component's existing structure, detail and mark batches. Review renders keep
the handmade block silhouettes visible from standing eye height.

The integrated 78-room performance sweep remains at 78 calls, 87 geometries
and 10 textures. The worst view rises from 6,603 to 6,723 triangles, still well
inside the 8,800 budget; the crown adds no scene submission or resource type.
Ten repeated room laps show no geometry growth, 618 sprint frames retain no
heap after collection, and 20,000 held-audio updates retain one voice.

Foundry rooms now support kiln-newt colonies on the same deterministic ember
vents that draw their fired aprons. Their bask and retreat paths are clipped to
the true shaped floor and swept clear of solid furnishings. When a foundry
hosts a secret, eligible newts flee to the actual cracked-wall approach after a
loud signal; ordinary colonies choose a nearby wall seam. This turns resident
life into a readable geographic clue instead of placing a separate marker.

The block-cut bodies, heads and tails share one instanced draw and their warm
dorsal plates share a second. A colony owns no lights or per-animal timers. The
Din, creature contract, awareness cap, directional three-step skitter, teaching
line and World atlas all describe the same behavior. Generation checks cover
548 native baskers across square and irregular rooms, including 20 verified
cracked-wall routes. The native render suite now verifies all 14 creature types,
including frogs and kiln newts. The integrated 78-room performance sweep peaks
at 78 calls, 6,712 triangles, 87 geometries and 10 textures. Ten repeated room
laps add no geometry, 1,493 sprint frames retain no heap after collection, and
20,000 held-audio updates retain one voice.

The authored room library now grows from 21 to 25 compositions with four
named irregular spaces: Cutters' Diamond, the Round Counting House, the Cross
Machine Floor and the Hex Scriptorium. Their furnishings repeat around actual
work instead of filling spare anchors: paired stone-cutting stations, a curved
strongbox count, counterweights across four trap arms and mirrored writing
bays. District-aware slots change stored urns, barrels and crates without
changing each room's purpose. Their authored names reach the HUD and their
purpose sentences appear in the World atlas.

Validation turns and mirrors every room eight ways, retains every authored
prop, walks all door pairs, approaches gems, keys, traps and room mechanisms,
and samples native generation. The four designs produce 16–24 visibly distinct
arrangements each and raise non-square generated share while preserving the
generator's one-third authored-room rate. Native review renders cover diamond,
circle, cross and hexagon fixtures; direct costs are 87, 61, 50 and 69 draw
calls respectively.

Terrain geography now has a graph rule beneath the room palette. Each district
lays down three-room strata from its own root through real door links. Room
purpose can still choose a safe lining—a timber library over a moss layer, for
example—without inventing a geological break. Hidden rooms continue the host
wall's stratum, keeping the secret physically tied to the place that concealed
it. The World Atlas names the underlying layer separately from the visible
lining.

When the underlying material really changes inside a district, both doorway
faces carry five shallow masonry chips in the colour of the destination layer.
They are non-colliding, block-cut, and rendered in one instanced batch. Across
360 sampled floors, 93.5% of intra-district links continue the same stratum;
217 real two-sided transitions use 2,170 chips. Native browser fixtures cover
gardens, works and tombs transitions at 25–28 calls. The world check also keeps
all ten biomes, every shaped footprint, terrain sound, and existing creature
habitat under test.

The integrated 78-room sweep remains at 78 calls and 10 textures. The denser
Cutters' Diamond and shallow seam blocks move the measured peaks to 6,980
triangles and 93 geometries, inside the 8,800 and 112 budgets. Repeated laps do
not grow room resources, 158 sprint frames retain no heap after collection,
and 20,000 held-audio updates still retain one voice.

The buried choir now includes an eleventh material tradition: last-water salt
pans. Salt is one of the choir's connected primary strata, so it arrives in
three-room geological bands and uses the same block-cut threshold language as
the older stone. Its rooms retain a dry central crossing while stepped crust
shelves and scored rake lanes follow the true floor shape. Paired pan rakes and
drying pegs repeat in the existing roof batches, and the Last-water Chapel
history ties the material to the choir's former work.

The crust has its own sharp footstep carry, crisp room return, cold mineral
bounce, static raked-check shader and sparse drying ticks. Up to twelve small
salt chips shed above actual crust cells in one instanced draw call. Their
positions remain inside square, circular, polygonal and concave floors; their
stepped rotation and fall use the persistent run clock and freeze exactly on
pause. Native review covers a furnished circular salt room at 51 calls and 5,009
triangles. The audible-air sweep measures the new drying tick above the room
tone alongside every existing biome voice.

Across 360 generated floors the salt layer appears in 169 rooms across six
room shapes, shedding 850 bounded chips, while all eleven biomes and place
histories remain reachable. The current 78-room performance sweep peaks at 78 calls,
6,897 triangles, 87 geometries and 10 textures. Ten repeated laps add no
geometry, 1,499 sprint frames retain no heap after collection, and 20,000
held-audio updates still retain one voice.

Salt shelves now support brine-crab colonies. Their deterministic homes come
from actual rendered crust cells, remain clear of solid furnishings and keep a
continuous body-width route to a real wall shadow. Raised lantern light or a
blast sends the colony under cover for six seconds; lowering the light lets it
return. In a room that hosts a secret, eligible crabs prefer the actual cracked
wall, so light, habitat and discovery use one rule instead of adding a marker.

The broad pale shell, splayed dark legs, front claws and eye stalks use two
instanced batches for up to four animals. They add no texture, dynamic light or
per-animal timer. Their short brittle-shell scuttle joins the procedural sound
set, their first response has a teaching line, and their Din and awareness rows
describe the same light behavior. The full native renderer now verifies all 15
creature types, including the light-triggered retreat and paused pose.

Across 360 generated floors, 513 brine crabs occupy valid salt shelves and 35
retreat routes reach actual cracked-wall approaches. All 55 procedural cues are
audible above room tone. The current 78-room performance sweep remains at 78
draw calls, 87 geometries and 10 textures; the triangle peak is 7,256 against
the 8,800 budget. Ten repeated room laps show no geometry growth, a 1,496-frame
sprint retains no heap after collection, and 20,000 held-audio updates retain
one voice.

Copperbacks now make the condenser plates a living habitat. Up to five small,
block-cut grazers occupy actual oxidized bed cells while leaving the paved
service crossing and solid furniture clear. Their two shell plates breathe
open against the slow condenser weep. A loud signal folds the whole colony
shut with one paired metal click, and the persistent run clock freezes that
motion while paused.

The animals also extend the world's secret language. Their resting heading
follows the local pressure gradient; in a room with a sealed doorway, every
shell points at the real cracked-wall approach. Across 360 generated floors,
673 copperbacks occupy legal condenser cells and 80 colonies align with an
actual secret-wall leak. Two shared instanced batches draw the entire colony.
All sixteen creature types contribute visible pixels in native room lighting,
including frogs and copperbacks. The 78-room performance corpus remains at 78
calls, 6,878 triangles, 87 geometries and 10 textures, with no geometry growth
over ten repeated laps and no retained heap after a 1,498-frame sprint.

Closed side galleries now grow from the real room graph into larger authored
footprints. Deeper chambers may reserve two opposite closed edges for a paired
transept, and cracked-wall hosts prefer wings that flank the secret when their
links permit it. Every wing remains one continuous system: its shaped terrain,
ramp, wall collision, creature clearance and minimap outline use the same floor
union. This adds room-scale structure instead of scattering more props through
the chamber.

Every raised landing now explains its former use through its district. The
Rootwater Galleries end in root tending bays, the Old Works in sorting gantries,
and the Buried Choir in listening apses. Crossbeams, hanging details and floor
marks join the architecture component's existing structure, detail and mark
batches. The World Atlas names the terminus, identifies paired transepts and
calls out wings that flank a cracked wall.

Across 360 generated floors, the audit finds 853 district-owned terminal
stations, 87 paired rooms and 21 secret-host transepts, with all three district
traditions represented. Native review confirms a paired secret room has two
physical raised landings, continuous terrain and only the existing three
architecture submissions. All four gallery directions still pass real ascent,
descent and tapered-wall collision checks. The current 78-room performance
sweep remains at 78 draw calls, 6,875 triangles, 87 geometries and 10 textures.
Ten repeated laps add no geometry, a 1,499-frame sprint retains no heap after
collection, and 20,000 held-audio updates retain one voice. The creature render
suite also confirms all 15 creature types, including frogs and kiln newts,
contribute visible pixels under native room lighting.

The three gallery termini now carry a sensory rule as well as a silhouette.
Walking onto a Rootwater landing produces a filtered timber breath, an Old
Works gantry answers in three uneven counting ticks, and a Buried Choir apse
returns two low notes. A secret-flanking station adds a quieter answer from the
opposite side, reinforcing the cracked-wall geography without exposing it as a
marker. Each station fires once per room visit and only after the player reaches
the physical raised landing.

The response also uses the existing final passage lamp: district tint and a
small block-stepped pulse distinguish the station while ordinary travel lamps
remain steady. Gallery area, district material and paired or secret wings now
shape the existing three-tap room return. Ten thousand acoustic profile changes
retain the original eight audio nodes, pause removes the return, and resuming
restores it. All 58 procedural cues measure above live room tone. The integrated
78-room sweep remains at 78 draw calls, 6,876 triangles, 87 geometries and 10
textures; ten repeated laps show no geometry growth, and a 1,500-frame sprint
retains no heap after collection.

The Old Works now has a fourth primary connected stratum: verdigris condenser
halls. These are former pressure-cooling rooms rather than green variants of
ordinary stone. Oxidized metal plates form two broad drain fields around a
paved service cross, continue into raised galleries, and leave transverse
inspection lanes at a repeated structural interval. The layout is clipped by
the same circular, polygonal, concave and gallery footprint union as every
other terrain field.

Paired pipe yokes and valve tabs repeat above those plates inside the existing
three architecture batches. The terrain material carries a slow three-step
condensation weep in world space, driven by the persistent run clock. Iron
footfalls use the visible plates' noise carry, the room has a low pressure hiss,
and cold green mineral bounce sits beneath warm practical lamps. The Copper
Condenser Hall identity and its history reach the HUD and World Atlas through
the same room data.

Across 360 generated floors, 164 condenser rooms appear in five room shapes.
The generator keeps them inside the Old Works and lays them down in three-room
geological bands; terrain, underlying stratum, threshold seams, sound, crown,
lighting and place history therefore describe the same connected machinery.
Native review renders the complete room at 50 calls and 3,818 triangles. The
integrated 78-room sweep remains at 78 calls, 6,853 triangles, 87 geometries
and 10 textures. Ten repeated laps show no geometry growth, a 1,497-frame
sprint retains no heap after collection, and 20,000 held-audio updates retain
one voice.

Service-ring chambers add a second kind of concave room to ordinary halls and
treasure vaults. Four broad walks surround a sealed square machinery core, so
opposite doors require a real turn through the room instead of another straight
crossing. The same four-bar footprint cuts the floor and ceiling, builds four
outer and four inner wall courses, drives collision and pursuit routing, clips
terrain beds and appears as a hollow outline on the minimap.

Landmark structures shift onto the north service walk when a district chooses
a ring, retaining their full floor signature without crossing the core. The
directed watercourse excludes rings because its central channel cannot pass
through sealed masonry. Normal furniture remains on legal anchors and the room
has no false middle slots. Across 500 generated dungeons, rings account for
3.1% of rooms and every declared shape remains reachable.

Native review renders a 24-metre ring at 38 calls and 4,888 triangles. In the
fixed 78-room performance corpus, the two generated rings peak at 51 calls and
5,584 triangles. The overall peak is a dense square trap room at 84 calls,
7,334 triangles and 93 geometries; 10 textures, repeated-room resources and
retained sprint heap remain stable.

Elbow halls add a seeded asymmetric room to ordinary halls and treasure
vaults. Each removes one outer quadrant while preserving real floor at all four
cardinal doorways. The missing corner rotates through all four orientations;
six wall courses, the ceiling, collision, routing, terrain clipping and the
minimap are derived from the same two-rectangle floor union. Furnishings stay
in the three usable work quadrants instead of being moved into arbitrary gaps.

The retained corner is treated as a working pier. Paired overhead rails, one
hanging joint and two floor tallies trace its faces inside the existing three
architecture batches. Rootwater calls the space a Tending elbow, the Old Works
a Transfer elbow, and the Buried Choir a Processional turn, so shape, district
history and visible construction describe the same former use.

Across the generated layout corpus, elbows account for 2.6% of rooms and all
nine declared shapes remain reachable. Native review renders a fungal elbow at
41 calls and 4,516 triangles. All sixteen creature types remain visible, with
the frog changing 5,854 pixels in native room light. The fixed 78-room sweep
peaks at 78 calls, 6,869 triangles, 87 geometries and 10 textures; ten repeated
transitions add no geometry, a 562-frame sprint retains no heap after
collection, and 20,000 held-audio updates retain one voice.

Topology halls make the generated door graph visible as room-scale terrain.
A broad central work bay grows a paved arm only toward a real door, cracked
wall or raised side gallery. The same footprint therefore becomes a terminus,
straight passage, turn, T-junction or crossing without painting a false route
onto an unlinked wall. Floor, ceiling, wall courses, collision, pursuer routes,
terrain clipping and the minimap all consume that shared rectangle union.

Every open neck receives one overhead district frame, two hanging tabs and one
floor tally in the existing architecture batches. Rootwater names these Root
exchanges, the Old Works Marshalling junctions and the Buried Choir Cantor
junctions. Furnishings remain inside the central bay while watercourses,
secrets and offset rounded galleries continue through the arms supplied by
their actual graph positions.

Across 360 generated floors, 91 topology halls cover all five plans and all 18
building identities occur. The layout audit crosses every pair of doors in all
15 non-empty cardinal combinations and checks that no absent side receives
floor, props or a frame. Native review renders a third-floor marshalling
T-junction at 40 calls and 4,441 triangles. The fixed 78-room sweep remains at
78 calls, 87 geometries and 10 textures; its triangle peak is 7,208 in a dense
cross room. Ten repeated transitions add no geometry, a 461-frame sprint
retains no heap after collection, and 20,000 held-audio updates retain one
voice.

Hidden routes now retain a district-built threshold on the host side of the
actual cracked wall. Rootwater ties a lintel over trimmed root ends, the Old
Works leaves a counting beam and rivet tallies around a bricked service hatch,
and the Buried Choir preserves the corbels and centre tooth of a stopped
processional arch. Their overhead silhouette, detail and floor wear join the
existing three architecture batches and are clipped to the same real approach
used by polygonal, concave, offset-gallery and topology rooms.

The threshold also changes the existing bounded room return: while sealed,
footsteps carry one slightly later and stronger answer from the cavity. Opening
the real wall removes the blind construction and the acoustic tell together.
The World Atlas can jump to the host and names both cues. Across 360 generated
floors every hidden route receives exactly one threshold and all three district
traditions occur; ordinary and opened walls receive none.

Native review shows the bricked service hatch as a heavy, readable wall frame
with its floor tally aligned to the crack. The fixed 78-room sweep remains at
78 calls, 7,208 triangles, 87 geometries and 10 textures. Ten repeated room
laps add no geometry, a 551-frame sprint retains no heap after collection, and
20,000 held-audio updates retain one voice with no bytes per update.

Tallow chantries add a sixth connected primary stratum to the Buried Choir.
These are former votive workrooms rather than loose candles on an ordinary
floor. Two broad wax runs follow the room's outer work lanes, repeated cross
cuts join them into one processional system, and every tile is clipped by the
same circular, polygonal, concave, topology and raised-gallery footprint used
by walls, collision and navigation.

Overhead votive ladders and squared hanging wick tabs repeat by structural bay
inside the existing architecture batches. A hard, quantized shader cuts wick
shadows into the wax without another texture, light or animated pass. Wax
footsteps have a damp scuff and low body, the room return sits between soft
growth and bare stone, sparse wick snaps replace the existing air voice, and a
restrained amber bounce preserves the readability of practical lamps. The
Votive Chantry identity and its history reach the HUD and World Atlas through
the same biome data.

Across 360 generated floors, 75 chantries span nine room shapes and remain
inside the Choir's connected geological bands. Native review confirms all 13
terrain shaders and 13 overhead traditions compile and mount in the existing
submissions. The fixed 78-room performance corpus remains at 78 draw calls,
7,208 triangles, 87 geometries and 10 textures; repeated laps show no geometry
growth, a 1,492-frame sprint retains no heap after collection, and 20,000
held-audio updates retain one voice. The performance report now also records
the named scene owners behind its draw-call and triangle peaks.

Wicklings make the chantry a living habitat. Up to five small wax grazers
occupy actual rendered tallow cells while leaving the processional paving and
solid furnishings clear. Their low block bodies carry a single squared ember
tip that rises and breathes on the persistent run clock. A loud signal snuffs
the whole colony into the wax for five seconds with one dry shared cue; pause
freezes both the grazing motion and the snuff response.

Their resting lean turns the chantry's airflow into secret language. Ordinary
colonies face the central processional lane. In a host room, every wickling
instead leans toward the real cracked-wall approach, and the first reaction is
explained through the teacher, captions and the World Atlas. The Atlas now also
draws the previously missing brine-crab retreats and copperback pressure
headings from their authoritative habitat data.

Across 360 generated floors, 240 wicklings occupy legal wax cells and 40
secret-host colonies align with cracked-wall drafts. The native renderer shows
all 17 creature types in room lighting, with wicklings contributing 1,519
changed pixels and remaining entirely above their wax beds. Their two shared
instance batches add no light or texture; the fixed 78-room sweep remains at
78 calls, 7,208 triangles, 87 geometries and 10 textures. Repeated laps show no
geometry growth and a 1,497-frame sprint retains no heap after collection.

Processional bays add an eleventh generated room shape. Their hammer plan has
one safe furnished court, a narrow route neck and a broad work platform facing
one destination the room graph actually supplies. Every other arm is likewise
earned by a door, sealed route or gallery. Revealing a secret preserves the
chosen direction, so the physical chamber never turns around the player.

Two block-cut overhead gates and paired floor tallies explain the transition
from court to neck to platform without adding a render batch. The three
districts name and furnish the same inherited plan differently: Rootwater uses
a Grafting bay, the Old Works a Receiving bay and the Buried Choir a Vigil bay.
Across 360 generated floors, 72 bays span all four orientations and all three
traditions. The layout audit exercises every one of the 15 non-empty cardinal
door graphs, real and absent doorway mouths, routes back to the court, prop
clearance, both structural gates and secret-opening stability.

Native review renders a 24-metre receiving bay at 44 calls and 4,542 triangles.
The fixed 78-room sweep remains at 78 calls, 7,208 triangles, 87 geometries and
10 textures. Ten repeated room laps retain no geometry, a 195-frame sprint
retains 0.00 MB after collection, and 20,000 held-audio updates retain one voice
with zero bytes per update.

Connected geology now continues visibly through matching doorways. Every one
of the thirteen strata owns a named block-cut grammar: courses, braided
threads, structural ties or tesserae. These marks begin at both threshold
shoulders and travel toward the room court, leaving the central district route
clear. At a material change, the existing destination-colored chips interrupt
that continuity and turn the same doorway into a readable transition.

Across 360 generated floors, all 3,137 two-sided same-stratum doorways receive
more than 84,000 paint-depth marks inside their real irregular footprints. The 217
two-sided material transitions retain 2,170 preview chips. Native district
fixtures mount both systems in one batch: Rootwater renders 14 continuity
marks, the Old Works 16 and the Buried Choir 12, while each fixture also shows
five transition chips. The generator caps continuity at 144 instances per room
and the fixed 78-room sweep peaks at 79 calls, 8,072 triangles, 87 geometries
and 10 textures. Ten repeated room laps retain no geometry, a 554-frame sprint
retains 0.00 MB after collection, and 20,000 held-audio updates retain one
voice with zero bytes per update.

The three district traditions now meet visibly at their actual open borders.
Four shallow transverse cuts sit below each named lintel: two in the room's
pigment and two in the arriving district's pigment. The opposite face repeats
the handover in its own travel direction. The cuts are clipped by all four
corners to the true chamber or gallery floor, share the existing strata mark
batch, and appear in the World Atlas. Native standing-height review confirms
the two pigments read clearly over the threshold floor. The same review also
exposed and fixed a color-material setting that had rendered earlier stratum
veins and transition chips almost black. Across 360 generated floors, 1,017
two-sided district borders receive all 8,136 color cuts. The fixed 78-room performance sweep
peaks at 85 calls, 8,072 triangles, 87 geometries and 10 textures. Ten
repeated room laps retain no geometry, a 590-frame sprint retains 0.00 MB
after collection, and 20,000 held-audio updates retain one voice with zero
bytes per update.

Geological contacts now reach farther than the five threshold chips. Eight
paired cuts fan inward from each material-changing doorway, using the
destination's course, thread, tie or tessera grammar and leaving the central
travel line open. All 217 two-sided contacts across 360 generated floors carry
their complete fans: 3,472 new cuts, clipped to the actual shaped floor. The
Atlas draws the same marks, and native review shows them in all three districts.

The entire geological and district-threshold batch now uses upward-facing
planes for its paint-depth marks. The visible top remains the same while five
unseen box faces disappear from each instance. Even with the new contact fans,
the fixed 78-room sweep falls from 8,072 to 7,400 peak triangles. It remains
at 85 draw calls, 87 geometries and 10 textures; ten repeated room laps retain
no geometry, a 429-frame sprint retains 0.00 MB after collection, and 20,000
held-audio updates retain one voice with zero bytes per update.

Approaching an actual open district or geological boundary now gives one
quiet, directional answer from the place ahead. Rootwater breathes through the
opening, the Old Works gives a short iron note, and the Buried Choir answers
with a hollow pitched return. Material contacts use the same course, thread,
tie or tessera vocabulary as their floor cuts. The room entered through stays
quiet; each other approach sounds once per visit, pause silences the watcher,
and the held biome air continues until the room actually changes. The Atlas
marks each approach point. Across 360 generated floors, the graph provides
1,017 two-sided district borders and 217 two-sided material contacts with
exactly one valid cue on each face, and no cue on an ordinary matching door.
The native browser approach check confirms entry silence, one cue per later
approach, pause silence and unchanged held biome air. Sample-level audio checks
hear all seven signatures above room tone. The fixed 78-room sweep peaks at
79 calls, 7,352 triangles, 87 geometries and 10 textures; ten laps show no
geometry growth, a 612-frame sprint retains 0.00 MB after collection, and
20,000 held-audio updates retain one voice with zero bytes per update.

The watercourse now shapes the terrain beside it as well as occupying a
narrow strip. Paired silt banks are selected from the same generated channel
blocks that carry the water, follow bends into shaped chambers and side
passages, and keep the central wet crossing clear. They remain after drainage
as a readable dry route. Each district uses its existing sediment color;
the bank cells and ordinary biome beds share one instanced terrain draw while
their colors remain separate through bed merging. The World Atlas projects
those same cells. The 360-floor world audit finds 34,903 bank cells across all
1,699 watercourse rooms and none in unrelated rooms. Paused drainage now reads
one saved run-clock timestamp, so the water level and terrain effects freeze
exactly until play resumes.

The isolated 78-room performance sweep peaks at 79 calls, 7,248 triangles,
87 geometries and 10 textures; ten revisited rooms add no geometry, a
574-frame sprint retains 0.00 MB after collection, and 20,000 held-audio
updates retain one voice with zero bytes per update.

Toads now use those banks as real feeding ground. Their former fixed offset
from a channel could leave them hovering beside the newly drawn silt; each
feeding point now lands on a rendered bank cell with a clear route back to an
independent damp refuge. Rootwater moss rooms gain frogs only where the
generated watercourse actually passes, while ordinary dry moss retains its
beetle ecology. The frog's block-cut body is slightly broader and lighter in
the room's practical light. Across the 360-floor audit, 818 toads have clear
channel-to-refuge routes, including 62 new moss-bank feeders. Native browser
checks confirm gathering, drainage retreat, pause, revisit and dry silence;
the creature render sweep confirms all 17 types contribute visible pixels,
with the frog changing 7,735 pixels at standing eye height.
The latest isolated 78-room sweep peaks at 79 draw calls, 7,248 triangles,
93 geometries and 10 textures; ten repeated room laps add no geometry, a
613-frame sprint retains 0.00 MB after collection, and 20,000 held-audio
updates retain one voice with zero bytes per update.

The old watercourse now has a visible building language above its wet strip.
Each linked channel room receives one overhead frame on the real directed
reach, clear of doorways and walking height. Rootwater's root comb, the Old
Works' settling screen and the Buried Choir's last-water tally distinguish
the three histories without adding a draw call per frame. The frame footprint
is checked against the same irregular room outline as the floor, and the Atlas
shows its actual span. The 360-floor audit finds 1,699 frames on real channel
rooms and none elsewhere. Native standing-height review confirms all three
forms mount in the existing three architecture batches.
The isolated 78-room sweep peaks at 79 draw calls, 7,304 triangles,
93 geometries and 10 textures. Ten revisited rooms add no geometry, a
599-frame sprint retains 0.00 MB after collection, and 20,000 held-audio
updates retain one voice with zero bytes per update.

The live water now joins a room's incoming and outgoing reaches into one
four-triangle surface mesh. Each vertex retains its direction along the actual
route, so the glint remains continuous through turns, while the sediment bed
stays separate and visible after drainage. The browser route check covers a
two-reach room, the sluice, paused drainage, revisits and the dry reliquary.
The fixed 78-room sweep still peaks at 79 draw calls, 7,304 triangles,
93 geometries and 10 textures; the improvement applies to rooms with two
reaches while the fixed corpus peak remains unchanged. Ten revisits add no
geometry, a 614-frame sprint retains 0.00 MB,
and 20,000 held-audio updates retain one voice with zero bytes per update.

The sluice and reliquary now terminate in a shallow square basin rather than
an unshaped end of the wet strip. Its narrow reach meets the basin edge with
no gap or overlapping water; a cut-stone surround, textured sediment, wet
footsteps, silt banks and channel fauna all follow that same geometry. The
Atlas draws the wider footprint. Across 360 generated floors, 339 circuits
have both basins fitted inside their true shaped rooms. Native standing-height
review shows the widening at both ends of the route, and the browser route
check still passes operation, drainage, pause, revisits and the dry cache.
The 78-room sweep peaks at 79 draw calls, 7,304 triangles, 87 geometries
and 10 textures; ten revisits add no geometry, a 574-frame sprint retains
0.00 MB after collection, and 20,000 held-audio updates retain one voice
with zero bytes per update.

The authored library now includes the Sealkeepers' Circuit, a 30-metre
service ring with four inspection tables around its real sealed machinery
core. Twelve furnishings preserve a continuous walk among all four doors;
the storage props substitute by district without changing the arrangement's
purpose. The layout suite checks every orientation and mirror, all props,
rewards and traversable routes. Native browser review mounts the ring from
generation at 71 calls and 5,166 triangles.

Four repeated handmade furniture types now join fixed parts per material.
Chairs, tables, crates and barrels fall from 17 to eight material draws per
one-of-each set. Removing buried leg faces and reducing barrel facets cuts
that set from 448 to 302 triangles while retaining the original silhouettes,
materials and independent colliders. Animated chest lids remain separate.
The isolated 78-room sweep peaks at 79 calls, 7,288 triangles, 91 geometries
and 10 textures. Ten revisits add no geometry; a 419-frame sprint retains
0.00 MB after collection, and 20,000 held-audio updates retain one voice.

Repeated barrels, chairs, crates and tables now render through room-local
instance batches, retaining every placement's rotation, scale, collider and
contact shadow. Breaking a stored barrel or crate removes only that copy.
The generated Sealkeepers' Circuit drops from 71 to 59 draw calls with its
same 5,166 triangles; browser inspection confirms all four tables and four
chairs occupy one batch per model part. The fixed 78-room sweep peaks at 78
calls, 7,288 triangles, 97 geometries and 11 textures. Ten revisits add no
geometry and a 361-frame sprint retains 0.00 MB after collection.

Hidden-room history now continues from the real cracked-wall entrance into
the sealed chamber. Paired paint-depth root slats, iron punches or stone
cuts flank the approach to its existing district-specific reward, following
local floor height and clipping to square and octagonal outlines. The
360-floor generation audit finds 2,616 legal entrance cuts across all four
approach directions and both hidden-room shapes. Browser review confirms all
nine district/reward histories still render their matched marks and rewards.

Raised gallery stations keep their existing practical terminal lamps even
when the enclosing chamber is unlit. The lamp remains visible with the
carried lantern lowered, while the chamber retains its dark-room rule. The
world audit verifies the terminal lamp for every one of 853 gallery stations,
including 209 rooms that retain the dark-room rule.
The fixed 78-room sweep remains at 78 calls, 7,288 triangles, 97 geometries
and 11 textures. Ten revisits add no geometry, a 573-frame sprint retains
0.00 MB after collection, and 20,000 held-audio updates retain one voice.

Authored elbow halls now turn their L-shaped floor with the same seed-based
orientation and mirror as their furnishings. The Turnkeepers' Relay uses its
three surviving corners as two handoff stations and a tally shelf, while
the fourth remains uncut rock. District stores substitute without blocking
door routes or changing that purpose. The authoring bench now runs on Windows
and can show shipped compositions as well as drafts. Its placement probe finds
no problems across the sampled turns and seeds; the full layout suite verifies
all nine props, door routes, and every orientation. Native browser review
renders the generated elbow at 61 calls and 4,764 triangles. Across 360
generated floors, 16 relays use all four uncut corners and both mirrors,
with every prop inside its actual map footprint.
The fixed 78-room sweep remains at 78 calls, 7,288 triangles, 97 geometries
and 11 textures. Ten revisits add no geometry, a 579-frame sprint retains
0.00 MB after collection, and 20,000 held-audio updates retain one voice.
