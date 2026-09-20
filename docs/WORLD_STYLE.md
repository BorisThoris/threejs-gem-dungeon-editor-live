# World style

Old-school, blocky, handmade. This is a permanent art-direction rule, also
shown in the game's Credits and the editor's World Style panel. The shared
in-app wording lives in `src/game/rooms/style.ts`.

- Chunky silhouettes, visible stone courses, earthy palettes, imperfect surfaces.
- Warm practical light; cold light belongs to water and mineral deposits.
- Restrained effects. No photorealistic assets, glossy generic materials, or
  visual clutter that hides a threat, puzzle cue, pickup, or doorway.
- Build places with purposes and histories. Creatures need habitats; secrets
  need clues. Furnish arrangements, not disconnected random objects.

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
ambient rat/bat/croaker habitat and the air's timbre. Moths favor the rootwater
district, which also contains the fungal biome.
The audio changes the existing held ambience voice rather than allocating more
voices at each doorway.

Terrain uses contiguous fields of deposits and courses of paving. Its low relief
is decorative, with at most two additional draw calls; it does not introduce
invisible movement obstacles or change the existing room-wide noise rule. Water
uses a slow, stepped shader glint that respects scene lighting and fog. Terrain
stays inside shaped floor outlines; authored furniture and interaction anchors
keep their existing placement rules.

## Real room shapes

Circular, hexagonal, octagonal, diamond and triangular chambers use block-cut
floor courses. The union of these courses and corridor wings is the single
source for walls, colliders, movement clearance, beam clipping and minimap
outlines. Cardinal door collars connect pointed chambers to the room graph;
shifted side galleries make asymmetric footprints. Unvisited rooms keep their
shape hidden until explored or mapped.

Generation enlarges unusual chambers when the furnishings and corner braziers
need room, with sizes up to 40 metres available in the builder. Authored layouts
retain explicit dimensions and are validated against their revised anchors.
Walls and ceilings are instanced; the floor uses one continuous surface mesh,
so a stepped outline does not cost a draw call per block. Region growth remains based on real door connectivity,
while the minimap fits each footprint inside its graph cell.

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

`npm run test:creatures` checks all eleven creature types in generated rooms
using native Chrome rendering. It compares frames with and without creature
meshes while preserving scene lights, and saves standing-eye-height review
images in `output/creature-review`. This checks representative visible states;
intentional hiding, spawning conditions and behavioral transitions have separate
world, ecology, rat and beetle checks.

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
