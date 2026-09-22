# World style

Old-school, blocky, handmade. This is a permanent art-direction rule, also
shown in the game's Credits and the editor's World Style panel. The shared
in-app wording lives in `src/game/rooms/style.ts`.

Terrain shaders follow the same rule. Effects are tied to the room's authored
land use and use a few hard value steps in world space: planted rows, mortar
wear, water glints, kiln bands, saw cuts, bone flecks, crystal facets, spore
rings and ash windrows. They must not become smooth noise, screen-space polish
or free-floating decoration. Adjacent terrain beds share their marks, the run
clock freezes every moving effect on pause, and the ten biomes retain separate
compiled variants without extra geometry, textures, lights or draw calls.

Biome identity continues above eye level. Every material tradition owns one
purposeful roof motif: quarry wedges, root combs, burial tallies, sluice rails,
kiln dampers, pit props, ossuary ribs, resonator forks, growing shelves or flue
baffles. These repeat by structural bay, remain above doorway clearance and are
clipped to the same irregular floor union as the walls. They join the existing
three architecture batches; do not turn them into loose ceiling clutter or a
new mesh, material or light per ornament.

- Chunky silhouettes, visible stone courses, earthy palettes, imperfect surfaces.
- Warm practical light; cold light belongs to water and mineral deposits.
- Restrained effects. No photorealistic assets, glossy generic materials, or
  visual clutter that hides a threat, puzzle cue, pickup, or doorway.
- Build places with purposes and histories. Creatures need habitats; secrets
  need clues. Furnish arrangements, not disconnected random objects.

Authored rooms keep that rule in their data. A composition may carry a name
and one sentence explaining its former use; the HUD and World atlas preserve
the name instead of reducing it to a generic chamber. Furniture repeats around
the room's work: paired cutting tables, a curved counting floor, four machine
arms or mirrored writing bays. District substitutions may change the stored
materials without changing what the arrangement means.

## Connected geography

The generator grows three regions through actual doorways. Rootwater galleries
are the damp, reclaimed wing; the old works are the industrial middle; the
buried choir surrounds the exit. On the deepest floor the entrance is already
in the works. A seeded material ordering is shared by each region, with room
compatibility preserved: libraries stay dry and puzzle crystals stay distinct.
Hidden rooms inherit their host's district but retain their dry, older materials.
Existing cracks, drafts, sounds behind walls and rewards remain their clues.

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
shifted side galleries make asymmetric footprints. Unvisited rooms keep their
shape hidden until explored or mapped.

Generation enlarges unusual chambers when the furnishings and corner braziers
need room, with sizes up to 40 metres available in the builder. Authored layouts
retain explicit dimensions and are validated against their revised anchors.
Walls and ceilings are instanced; the floor uses one continuous surface mesh,
so a stepped outline does not cost a draw call per block. Region growth remains based on real door connectivity,
while the minimap fits each footprint inside its graph cell.

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

`npm run test:creatures` checks all thirteen creature types in generated rooms
using native Chrome rendering. It compares frames with and without creature
meshes while preserving scene lights, and saves standing-eye-height review
images in `output/creature-review`. This checks representative visible states;
intentional hiding, spawning conditions and behavioral transitions have separate
world and ecology checks. The ash-mite render fixture also makes a loud footfall
and verifies that the visible colony burrows as one.

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

Performance budgets and the issue ledger live in `docs/PERFORMANCE.md`.
