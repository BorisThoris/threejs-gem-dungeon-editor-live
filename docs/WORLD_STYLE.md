# World style

Old-school, blocky, handmade. This is a permanent art-direction rule, also
shown in the game's Credits and the editor's World Style panel. The shared
in-app wording lives in `src/game/rooms/style.ts`.

Terrain shaders follow the same rule. Effects are tied to the room's authored
land use and use a few hard value steps in world space: planted rows, mortar
wear, water glints, kiln bands, saw cuts, bone flecks, crystal facets, spore
rings, ash windrows, condenser weeps and block-cut wick shadows. They must not become smooth noise, screen-space polish
or free-floating decoration. Adjacent terrain beds share their marks, the run
clock freezes every moving effect on pause, and the thirteen biomes retain separate
compiled variants without extra geometry, textures, lights or draw calls.

Biome identity continues above eye level. Every material tradition owns one
purposeful roof motif: quarry wedges, root combs, burial tallies, sluice rails,
kiln dampers, pit props, ossuary ribs, resonator forks, growing shelves, flue
baffles, pan rakes, pipe yokes or votive ladders. These repeat by structural bay, remain above doorway clearance and are
clipped to the same irregular floor union as the walls. They join the existing
three architecture batches; do not turn them into loose ceiling clutter or a
new mesh, material or light per ornament.

Geology must remain legible between connected rooms. When two open doorways
share a district and stratum, that material carries a named block-cut vein
inward along the threshold shoulders. The centre stays available for the
district's circulation marks, so building use and underlying material read as
two related layers. Where the stratum changes, transition chips interrupt the
vein and preview the destination material. Both systems must stay paint-depth,
clip to the true room footprint and share one bounded instanced batch.
The preview continues inward as a short fan in that material's course, thread,
tie or tessera grammar. Its paired cuts occupy the doorway shoulders and leave
the central circulation line readable. Render these flat marks as upward-facing
planes: their visible tops are the entire authored surface, and side faces waste
triangles without making the terrain more legible.

Where a real open door joins two districts, cut four transverse handover bars
under its named lintel. The inner pair takes the current district's pigment;
the outer pair takes the destination's. Both room faces use this order, so the
threshold reads as a deliberate change of builders from either direction.
Check each rectangular corner against the actual floor, including circular,
concave and graph-shaped rooms. Keep the bars shallow enough to walk over,
bright enough to read in passage light, and in the same instance batch as the
geological marks. No border treatment belongs on an unlinked wall.

- Chunky silhouettes, visible stone courses, earthy palettes, imperfect surfaces.
- Warm practical light; cold light belongs to water and mineral deposits.
- Restrained effects. No photorealistic assets, glossy generic materials, or
  visual clutter that hides a threat, puzzle cue, pickup, or doorway.
- Build places with purposes and histories. Creatures need habitats; secrets
  need clues. Furnish arrangements, not disconnected random objects.

Blender may supply bespoke creature bodies, landmarks and modular structure
when hand modeling makes the result clearer. Keep the same chunky silhouette,
simple materials, imperfect cuts and authored purpose. Check imports at player
eye height and measure their triangles, materials and draw calls in game;
repeated room construction should remain batched or instanced.

Room shape must change how a place is used. Service-ring chambers wrap one
continuous walk around a sealed, block-cut machinery core. Floor, ceiling,
inner and outer walls, collision, routing, terrain, landmarks and the minimap
must all use that same void. A system that needs an open centre moves to a real
walk or avoids the room; it may not paint, spawn or route through the core.

Elbow halls remove one seeded outer quadrant and keep the other three as one
working L-shaped floor. The missing corner turns between all four orientations,
while every cardinal doorway still opens onto real ground. A retained pier,
paired overhead rails and floor tallies explain the turn in the room's district
tradition. Terrain, walls, ceiling, collision, routing, props and the minimap
must agree on the same concave outline; furniture assigned to the absent work
quadrant is omitted rather than scattered somewhere unrelated.

Topology halls are drawn from the generated doorway graph. Their central work
bay grows an arm only toward a real door, cracked wall or raised side gallery,
so the same rule produces a terminus, straight passage, turn, T-junction or
crossing. A district frame and worn tally mark every surviving neck. Floor,
walls, ceiling, collision, routes, terrain and minimap must read the same graph;
an unlinked wall must never receive a decorative false corridor.

Authored rooms keep that rule in their data. A composition may carry a name
and one sentence explaining its former use; the HUD and World atlas preserve
the name instead of reducing it to a generic chamber. Furniture repeats around
the room's work: paired cutting tables, a curved counting floor, four machine
arms or mirrored writing bays. District substitutions may change the stored
materials without changing what the arrangement means.

## Connected geography

Geology follows the room graph. Each district grows an underlying stratum in
three-room depth bands, so nine links in ten continue the same material layer
instead of rerolling terrain room by room. A library, shrine or machine room
may line that layer with a material its purpose can safely use; the atlas names
both. A real change of stratum leaves five shallow, block-cut chips at both
faces of the doorway. District borders keep their named lintels and do not also
pretend to be geological seams.

The buried choir also carries a salt-and-brine stratum: stepped evaporation
shelves, scored rake lanes and overhead pan rakes belong to one former use.
Its pale crust has a sharp footfall, cold mineral bounce and sparse drying
ticks. These cues travel together; salt is never just a white material swap.

The Old Works carries a verdigris condenser stratum in connected three-room
bands. Oxidized drain plates run beneath paired pipe yokes, transverse service
lanes preserve the crossing, and a slow block-stepped weep follows the plates.
Metal footfalls, a held pressure hiss and cold green mineral bounce belong to
that same former use. Warm practical lamps remain the readable source of light;
verdigris must not become a uniform teal colour grade.

The Buried Choir also carries tallow chantries as a connected primary stratum.
Paired wax runs leave a processional lane, cross cuts join them at structural
bays, and overhead votive ladders suspend squared wick tabs above the same
route. Wax footfalls are close and damped, the air answers with sparse wick
ticks, and a restrained amber bounce supports existing practical lamps. The
wax layout, crown, acoustics, air and Votive Chantry history must travel as one
place rule through circular, concave, topology and gallery footprints.

Wicklings belong to those wax runs. Their dark block bodies and ember tips use
two shared instance batches and no individual lights. At rest every tip leans
into the room's draft; in a secret host the entire colony therefore points at
the actual cracked wall. A loud room snuffs them into the wax and quiet lets
them rise again. Terrain, airflow, creature behavior, sound, accessibility text
and secret language must continue to describe that one relationship.

Copperbacks belong to those plates rather than being general dungeon clutter.
Their paired block-cut shells open with the condenser's slow breath and fold at
a loud sound. A colony follows the room's pressure gradient; where a real
cracked wall exists, every shell points toward that leak. Creature placement,
animation, sound and secret language must continue to read the same authored
terrain rule.

The generator grows three regions through actual doorways. Rootwater galleries
are the damp, reclaimed wing; the old works are the industrial middle; the
buried choir surrounds the exit. On the deepest floor the entrance is already
in the works. A seeded material ordering is shared by each region, with room
compatibility preserved: libraries stay dry and puzzle crystals stay distinct.
Hidden rooms inherit their host's district but retain their dry, older materials.
Existing cracks, drafts, sounds behind walls and rewards remain their clues.

Closed side galleries are part of that connected plan, not random alcoves. On
deeper floors the door graph may open two opposite wings into a transept. A
secret host prefers paired wings beside its cracked wall when the available
links permit it, turning the final approach into a memorable room shape without
giving away the hidden door. Rootwater galleries end in root tending bays, Old
Works galleries in sorting gantries, and Buried Choir galleries in listening
apses. Their ramps, raised floors, walls, collision and minimap outline all come
from the same footprint; their terminal beams and marks stay in the existing
three architecture batches.

Reaching a gallery's raised landing should complete the same story in sound
and light. Root tending bays breathe through dry timber, sorting gantries count
three uneven iron ticks, and listening apses return a low two-note answer. The
last existing gallery lamp carries a restrained district tint and a few hard
intensity steps; travel-passage lamps remain steady. The answer uses the room's
bounded reflection taps, plays once per landing per visit, and becomes slightly
deeper on a wing that flanks a cracked wall. Do not add a light, mesh, looping
voice or floating secret marker for this response.

District data lives on rooms and drives the HUD, corridor rhythms and biome
selection. Biomes drive terrain colors, lighting, footstep surfaces, sound carry,
ambient creature habitat and the air's timbre. Moths favor the rootwater
district, which also contains the fungal biome. Ash mites belong to settled
kiln windrows in the old works and nearby choir rooms; loud steps send the
whole colony under, making disturbed ash a recent trace rather than decoration.
Kiln newts bask only on the foundry's rendered ember aprons. Noise sends them
along a physically clear route to a wall seam; in a secret host they prefer the
actual cracked wall, so animal behavior reinforces the same geography instead
of adding an unrelated hint marker.
Brine crabs graze only on rendered salt shelves. Raised lantern light sends
their pale block shells and dark jointed legs toward a physically clear wall
shadow; in a secret host they prefer the actual cracked seam. Their claws,
eye stalks and legs share one dark instance batch, their shells another, and
they add no creature light or texture. Lowering the lantern lets them return.
Each district also draws its old circulation system across the actual room
graph: paired root lines in Rootwater, iron sleepers in the Old Works, and
processional stones in the Buried Choir. The marks stop at real thresholds,
stay inside shaped floors, have no collision, and cost at most two draw calls.
The audio changes the existing held ambience voice rather than allocating more
voices at each doorway.

Each district also owns one graph-selected landmark room per floor. Rootwater
has a hanging root knot, the old works a chain hoist, and the buried choir a
cantor's resonator. They use floor inlays and overhead blockwork, keep the
whole walking volume clear, announce themselves with a short material cue,
and retain a small symbol on the minimap after discovery. Landmarks should be
places a player can navigate by, rather than large decorations repeated in
every room.

The landmark in the sealed room's district also begins one old tally route.
Its marks follow only real doors, stay out of the vault and descending stairs,
turn visibly through irregular rooms and end at the actual cracked wall. The
marks use the district's block language and become legible after the landmark
is visited. Later steps repeat that landmark's material sound quietly. This is
the preferred form of a secret clue: a chain through places the player can
understand, rather than an icon that gives away an unseen destination.

Terrain uses contiguous fields of deposits and courses of paving. Its low relief
is decorative, with at most two additional draw calls; it does not introduce
invisible movement obstacles or change the existing room-wide noise rule. Water
uses a slow, stepped shader glint that respects scene lighting and fog. Terrain
stays inside shaped floor outlines; authored furniture and interaction anchors
keep their existing placement rules.

## Real room shapes

Circular, hexagonal, octagonal, diamond, triangular and concave cross chambers
use block-cut floor courses. The union of these courses and corridor wings is
the single source for walls, colliders, movement clearance, beam clipping and minimap
outlines. Cardinal door collars connect pointed chambers to the room graph;
shifted side galleries make asymmetric footprints, while paired opposite
galleries form larger transepts. Gallery placement must reserve real closed
edges in the room graph, and each wing must remain part of the shared terrain,
collision and minimap footprint. Unvisited rooms keep their shape hidden until
explored or mapped.

Generation enlarges unusual chambers when the furnishings and corner braziers
need room, with sizes up to 40 metres available in the builder. Authored layouts
retain explicit dimensions and are validated against their revised anchors.
Walls and ceilings are instanced; the floor uses one continuous surface mesh,
so a stepped outline does not cost a draw call per block. Region growth remains based on real door connectivity,
while the minimap fits each footprint inside its graph cell.

Processional bays use a hammer-shaped plan tied to the room graph. A square
furnished court narrows into a measured neck and opens onto one broad working
platform; other arms exist only for real doors, cracked walls or galleries.
The broad end must face one of those destinations and must not rotate when a
secret is opened. Two overhead gates and floor tallies mark the neck inside the
existing architecture batches. Rootwater reads the plan as a grafting bay, the
Old Works as a receiving bay and the Buried Choir as a vigil bay. Floor, walls,
ceiling, collision, navigation, terrain, furnishing clearance and the minimap
must continue to consume the same footprint.

The shipped authored set includes purpose-built diamond, circle, cross and
hexagon layouts as well as square rooms. Every layout must survive all four
turns and both mirrors, keep its full prop count, preserve door-to-door paths,
leave rewards and traps approachable, and stay below the room performance
watch band in a native browser render.

Pursuers use cached routes when groups of props or hazards block the direct
approach. Wall clearance and solid furniture stay fixed; a wary creature can
relax its preferred distance from spikes to pass a narrow gap, while still
avoiding the damaging area. The navigation suite checks 2,240 such approaches.

Validation: `npm run test:world`, `npm run test:layout`, `npm run typecheck`,
`npm run lint`, `npm run build`, plus browser gameplay/audio checks.

### Creature readability

Ground creatures need a recognizable silhouette at standing eye height, with
feet above the terrain surface. Frogs use a block-cut head, folded hind legs,
front toes, pale throat and amber eyes; only the throat inflates when calling.
Their wall habitat candidates follow the actual room footprint. Refuges and
migration paths use the same furniture seed as the rendered room and clear the
whole body. Noise still makes them dive, and draining still sends them to cover.

`npm run test:creatures` checks all seventeen creature types in generated rooms
using native Chrome rendering. It compares frames with and without creature
meshes while preserving scene lights, and saves standing-eye-height review
images in `output/creature-review`. This checks representative visible states;
intentional hiding, spawning conditions and behavioral transitions have separate
world and ecology checks. The ash-mite render fixture also makes a loud footfall
and verifies that the visible colony burrows as one. Kiln-newt and brine-crab
fixtures verify that colonies run toward a real cracked wall and freeze while
the game is paused.

Crystal fauna belongs to crystal terrain. Shardbacks use squat block-cut bodies
and paired rectangular plates, graze only actual resonance-ring cells and never
appear in memory trials where crystals already form a puzzle language. Their
silhouette, rising plates and three rough glass notes carry the warning; no
particle cloud, dynamic light or smooth imported surface should replace that
handmade read. A whole colony remains two instanced draw calls.

Bats hang with folded angular wings and pointed ears, then open their wings
and wheel below the ceiling when disturbed. The flock uses two instanced mesh
batches. Its orbit radius is limited by the nearest real wall, leaving room for
open wings; wingbeats and movement both use the paused run clock. The creature
render check includes roosting and airborne states and checks paused instance
transforms. `npm run test:bat-flight` samples full-wing clearance across generated
roosts and shaped rooms.

The Harrier uses a block-cut head and beak, a short tail, and swept angular
feathers. Flight navigation reserves a metre of clearance for the open wings.
When stunned it rests above the floor with wings folded behind it, rather than
rolling the full span through the ground. Its animation uses the run clock.
The creature rendering check covers both airborne and grounded poses and
asserts that the grounded model's bounds remain above the room floor.

Bat colonies now hang in a row from a timber perch fastened to the ceiling.
Their flight band stays below the central roof details, and low corbels reduce
the available orbit just as walls do. The generated flight check tests open-wing
clearance against the actual structure, detail and marking blocks, in addition
to the room outline. The perch stays in the room when the colony takes flight.

## Hidden-room histories

The sound through a cracked wall, the room name, its furniture, its floor
marks and its reward are one story. Rootwater hides seed stores, graft-keeper
cells and buried springs. The old works hides pay rooms, master-tool cabinets
and shift fonts. The buried choir hides funeral treasuries, cantor reliquaries
and last-water chapels. Each district supports the same three reward rules
(hoard, free relic or shrine), but expresses them through its own former use.

Hidden-room decoration is low and non-blocking. It follows the shaped floor,
reserves one legal focal anchor for the reward, and leaves a clear approach.
Repeated story marks are instanced by material, so a richer history remains two
draw calls instead of becoming one draw call per object. World building should
make a room more coherent without making its rendering cost harder to explain.
The layout suite checks all nine histories, their district materials, the
actual footprint of every mark and the clearance around every focal reward.

The host wall also keeps evidence that the hidden route belonged to the
building. Rootwater uses a root-bound blind gate, the Old Works a bricked
service hatch, and the Buried Choir a stopped processional arch. Each threshold
frames only the actual cracked wall with an overhead silhouette, small district
details and wear underfoot. It shares the room's three architecture batches and
adds a restrained second return to footsteps. Opening the wall removes both the
blind construction and its acoustic cavity. Never put this language on an
ordinary closed wall or leave it floating after the route opens.

Performance budgets and the issue ledger live in `docs/PERFORMANCE.md`.
