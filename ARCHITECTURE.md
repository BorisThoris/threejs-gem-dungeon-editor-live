# Architecture

Gem Dungeon is a first-person dungeon run: find gems, buy your way out of the
exit, do not die. This document is the map of the code and the one rule it is
built on.

## The rule: one owner per fact

The development interaction probe retains only mounted triggers. Each trigger
owns its debug row and removes its previous label on change and on unmount;
cleanup cannot remove a row currently owned by another same-labelled trigger.

Timed grate expiry is published by the run store's `expireGrate`, stepped by
the room's Barring frame loop. Doors and grate meshes therefore observe the
same opening without waiting for unrelated state changes. It reads the paused
run clock and clears only the timed grate, leaving player barricades intact.
Each mounted grate attempts one drop per visit, so lifting or blocking it
with wire does not retrigger it every frame. Re-entering re-arms the trap.
`traps/geometry.ts` owns the bar positions and their contact with floor wire.
Only a live snare touching that sweep catches the grate. It then becomes a
committed `holdingDoor` device rather than remaining a creature trap. A nearby
player can also spend an unlit bomb to jam a dropped grate open. Its device has
no fuse and cannot detonate. Both holds persist on that door through revisits
and clear with placed devices on descent. The grate, traversal and feedback
read that same state; other doorways and player barricades remain independent.
Its `trapSprung` event owns the falling-metal sound, caption, guidance and
Din impulse. `doorBarred` means the player constructed a barricade; a trap
must not also claim construction, hammering or a spent kit. The grate check
holds those visible and simulation responses together.
The movement probe waits for the visible open-door prompt after expiry. Its
planner derives wall clearance from the player capsule and wall thickness,
turns before moving, and permits only outward escape from an existing hazard
overlap. A focused geometry check preserves that escape without allowing
solid penetration or crossing hazards; run seed 404 exercises the full route.
At the shop it approaches the small bomb stand precisely and waits for its
actual prompt before pressing Use, then verifies the payment. Reaching a
nearby waypoint is not evidence that the intended offer owns the interaction.
When defending, the probe reacts to the Warden's visible approach warning
and keeps aiming at the threat until the real shove finishes charging, then
re-samples its route. It never grants health or
shortens the game's windup to compensate for missed attacks.

The art-direction contract is [World Style](docs/WORLD_STYLE.md), also visible
in Credits and the editor. `rooms/districts.ts` grows connected regions on the
door graph and assigns each room's biome. Every biome consumer reads that
assignment. `dungeon/footprint.ts` defines the actual block-cut room outline,
including round and polygonal chambers, door collars and shifted galleries;
walls, collisions, navigation and the minimap all use it.

`wingCourses` supplies the longitudinal floor courses for both rectangular and
half-round side galleries. A room with a shaped wing uses the union outline
for wall and movement checks even when its central chamber is square. Terraces
and roof ribs read those same course widths rather than spanning the gallery's
bounding rectangle.

`worldbuilding/watercourse.ts` owns the optional watercourse: its directed door
route, shallow channel geometry, safe wall anchors and drainage curve. The run
store owns opening time and the one-time reliquary reward. The renderer, wet
footstep sounds and world atlas read those facts.
`channelUnderfoot` samples those same strips and terminal basins after drainage.
The exposed bed becomes silt footing rather than inheriting paving underneath;
`channelSediment.ts` owns its name and quiet carry. HUD guidance, sprint strength,
noise duration and the soft footstep voice all follow that material. Independent
wet beds outside the channel stay wet. The world sweep checks the full rendered
bed and terrain boundaries, and the underfoot browser check compares real
sprints along the same channel before and after paused-clock drainage.
Mechanisms use the existing
interaction system; turning a sluice advertises a loud metal signal through
Din, so listeners react without learning a new special-case object name.
The editor's World tab inspects the full generated graph and room blueprints;
the player's minimap remembers only visited waterworks landmarks. Their map
titles and pause-chart entries share `rooms/services.ts`'s remembered-waterworks
view. It reads the store's opening/reward facts and `waterLevel`'s drainage
completion; the existing map poll follows the paused run clock. The circuit's
`waterworkDescription` supplies the remembered status and local reliquary
prompt, so an opened sluice cannot still send the player upstream to find it.
Turning a known sluice can update a previously discovered reliquary, but cannot reveal
an unvisited endpoint. Selecting a place only highlights its room. The
watercourse browser check holds map state together with actual valve operation,
drainage, reward collection, Gloom and floor reset.

The ongoing expansion is tracked in [The inhabited dungeon](docs/WORLD_EXPANSION.md).

`dungeon/runFloor.ts` owns the run seed's descent sequence and the generation
options for each depth, including the last-floor tableau and Foreman's Tally
room bias. The run store, World atlas, Signals graph, and seeded checks call
that recipe. A seed from the run summary therefore names the same floor in
the tools that the player entered.
The development-only Atlas scenario link starts a real run and uses the run
store's floor descent reset before staging the chosen room. It spawns at a
real doorway; a hidden chamber first uses the run store's `revealSecret` action
to open its return door. The author can play the exact generated room without shipping
scenario controls or a second floor-state initializer to players.
Each generated dungeon records whether Tally biased its rooms when that floor
was built. Development links in the pause menu read that snapshot, so buying
Tally mid-floor cannot make the Atlas or a fresh replay show a different layout.
The editor's Scenario shelf and the full browser matrix call the same
`scenarioCoverageCases` selector. It scans generated floors until every
declared room kind and footprint has a playable representative, so new kinds
and shapes surface as missing coverage instead of silently escaping review.
`capture-scenario-review.mjs` uses those cases and the live WebGL scene for
lantern-down and raised-lantern architecture and gameplay images. It pauses
each run before capture and records the scenario URLs and image hashes in a
local gallery, keeping visual review tied to the same rooms
the browser matrix mounts. The full gate also measures scene exposure in each
dark and raised-lantern pair, catching black or ineffective light without
freezing the art to pixel goldens.
Gameplay review captures hide paused arrival and deed cards while retaining
the HUD. Their exposure is checked against the matching unobstructed scene,
so a frozen full-screen card cannot silently replace the room being reviewed.
The gallery stores the scenario URL owner's path and lets reviewers choose
the current development-server origin, so links remain usable after the
verification server's temporary port closes.
The world review starts a fresh run for each environment, checks that the
player is alive in the expected room, then pauses before photographing it.
Accumulated pressure from earlier fixtures cannot turn a later room review
into a screenshot of the defeat screen.
`creature-render-check.mjs` stages each creature in a generated native room,
checks its visible contribution and selected responses, then builds a local
gallery and contact sheet from those same live renders for visual review.
Vite ignores generated review and desktop-package directories. The development
artifact check writes packaging files while a run is paused and verifies that
neither the page nor the server restarts.

`worldbuilding/serviceTrail.ts` selects the optional real-door route from the
reliquary to an existing secret wall. Its stored route drives copper masonry
marks, rubbing guidance and the authoring atlas. Reading the reliquary enables
the guarded catch interaction; opening it delegates to `revealSecret`, keeping
the actual passage, collision and map changes under their existing owner.
`worldbuilding/trailGuide.ts` owns recovery for both the maintenance rubbing
and the district landmark tally. It uses the existing barred-edge path finder
through visited rooms, rejoins beyond blocked trail legs, and never turns a
clue into knowledge of an unexplored shortcut. Both HUD readers subscribe to
`barsNow`, including the same published grate expiry as the doors and maps.
Physical trail marks retain their authored route; only learned guidance changes
when the player changes the available passages. The source check follows 285
generated detours to completion without loops; the browser check constructs a
barricade, walks its known bypass and checks paused grate expiry and clue reset.

`worldbuilding/bellcaps.ts` places light-sensitive colonies on clear channel
banks and owns exposure, warning and recovery constants. `BellcapColony.tsx`
animates their warning and spore puff; `bellcapBursts` keeps floor-local recovery
times. Discharges go through the event bus, positional audio and Din, so the
existing creatures hear the actual environmental event. Drainage is sampled
from the watercourse's shared curve.

`worldbuilding/identity.ts` names the nine building identities and their three
traditions. `structuralPattern.ts` fits their overhead bays to the same floor
union used by collision; `furnishing.ts` places their work areas on the normal
room's validated anchor rings. Authored layouts keep control of their props.
`mobs/croakerHabitat.ts` derives clear channel-to-refuge routes for native toads.
Their movement reads the existing drain time rather than keeping a second
environment clock, so pauses and revisits cannot restart the migration.
`mobs/roomMemory.ts` preserves transient creature state against a room's generated
grid-address object. Opening a secret replaces the room and links while retaining
that address; generating a new floor or replay creates fresh addresses. Croakers,
beetles, mites, shardbacks, newts, brine crabs, copperbacks and wicklings share this
lifetime rule, with separate state for each species and weak keys for collection.
`mobs/chorusState.ts` publishes the colony's actual singing count from the same
frame that drives its audio. The HUD polls this room-scoped fact rather than
calling the habitat generator to infer singing from presence. A quiet colony
also stops its singing throat animation. Leaving clears the published room;
new floor grid addresses cannot inherit an old chorus. The ecology browser
check follows the text through noise, recovery, drainage and empty rooms.
The paused run clock owns recovery; initial
mesh visibility, active responses and the inspection probe read the same
submersion predicate. Leaving a room cannot erase its frightened silence,
and a new floor's rooms cannot inherit it. The ecology check opens a real secret
while the frogs are hidden, then verifies revisits, recovery and fresh-floor reset.
The creature render check also preserves retreat across opening the cracked wall
for newts, brine crabs, copperbacks and wicklings.
Diagnostic scene captures create their camera renderer through
`scripts/review-renderer.mjs`, which copies tone mapping, exposure and colour
space from the mounted game renderer. Review lighting must not become a second
colour pipeline; the creature manifest records those settings with each view.

`worldbuilding/elevation.ts` owns raised gallery surfaces. `Terraces.tsx` feeds
the same wedge vertices to rendering and physics; moving creatures, rewards,
dropped devices and effects sample its height. Full-width ramps connect the
landings to the chamber while travel doorways retain their shared floor datum.

`rooms/floorSurfacePattern.ts` partitions the physical floor union into
non-overlapping strips for `FloorSurface.tsx`. World-space UVs continue across
chambers, door collars and terraces. `terrainPattern.ts` supplies paving and
deposit tiles, including slope-aligned gallery pieces split at ramp knees.
`rooms/underfoot.ts` samples visible surfaces and live channels for footstep
timbre, sprint carry and the HUD's ground description. Its material owner
supplies both the ground name and acoustics; the existing HUD sense poll
samples player position and the paused drainage clock, so crossing paving or
draining a channel changes the description without requiring a room change.
`underfoot-readout-browser-check.mjs` checks both directions across moss and
paving, stationary drainage and its pause boundary.
`Player` publishes its actual stride state through `playerAt.gait` alongside
footsteps and sprint noise. The HUD reads that state rather than inferring
running from speed: swift walking stays walking, slow running stays running,
and blocked movement stays still. The sprint-noise and footstep-collision
checks exercise those distinctions through real movement. The readout retains
the confirmed stride between fixed physics steps; a render frame without a
physics update is not evidence that the body stopped.
The player's after-step callback accumulates the world's actual timestep.
Position speed and stride distance use that elapsed physics time, while the
head-bob envelope follows the confirmed gait. Render frames without a step
retain physical speed; teleports and control locks clear it. Footfalls retain
their distance remainder instead of dropping a frame's travel at every step.
The stride-clock browser check drives the mounted Rapier scene at 30, 60, 144
and 240 render frames per second and compares distance, footsteps and speed.
Player movement supplies the same material and world
position to audio and `makeNoise`; the store preserves earlier louder deadlines
and emits throttled `sprinted` signals. `DinDriver` translates those samples
through the existing room-graph propagation rules. `wardenHeard` remains a
reaction cue, not a second sprint at the room centre. The Atlas ground probe
uses these same material values and `carriesTo` for its optional noise overlay.
Toad refuges prefer clear, flat deposit beds and sample the shared floor height.
`mobs/ambient.ts` derives rat homes from real wall courses with level, clear
approaches. `RatShelters.tsx` draws their recesses in one batch. `ratLosses` in
run state records spike casualties by room and home index until floor descent
or a new run; initial creature visibility reads it even during a paused revisit.
The Atlas uses the live dungeon seed for ambient habitats and applies initial
key and sentry reservations when previewing scaled furniture.

The atlas projects the same terrain tiles and uses one ground probe for plan
and gallery section. Its drainage timeline reads `waterLevel` and
`croakerMigration`, so the authoring preview does not maintain a second set of
water or retreat timings.

`dungeon/explorationLoops.ts` closes useful shared-wall detours before stairs,
vaults and secrets are assigned. `worldbuilding/districtThresholds.ts` reads
real open links to label both sides of district boundaries. No map-only link
or decorative doorway can imply a route the game cannot traverse.

`worldbuilding/passageLighting.ts` spaces lamps by passage length, independent
of floor tessellation. `wallCoursePattern.ts` fits shallow building courses to
the wall union, leaving portals and mechanisms clear. The atlas reads the same
lamp positions and terrace profiles for its plan and side elevation.

The watercourse's `waterFlowUV` and `waterTravel` own directional ripple spacing
and integrated drainage phase. Its held sound samples the same wet strips and
water level while biome air remains independent. `mobs/beetleHabitat.ts` keeps
feeding and retreat paths inside validated bellcap space; the shared room memory
preserves recent disturbances on revisits without surviving a new floor.

Every bug the previous tree had in its last month was the same bug: two
modules with different opinions about one fact. Five different ideas of
where the floor was. Doors placed from one room size and spawns from another.
Two stores that both claimed the player's stats. So:

- Geometry lives in `src/game/world.ts`. The ground plane, the capsule, the
  spawn height, the door width, the interact radius. Room-specific floor rises
  live in `worldbuilding/elevation.ts` and are sampled rather than copied.
- Everything that changes with depth is one table in the same file,
  `floorRules(floor)`: how big a floor is generated, how long it leaves you
  alone before the Warden wakes, how roused it already is when you arrive,
  how many of its rooms are watched, how it is lit, and the line the player
  is shown on reaching it. The generator, the run store, the Sentry
  placement, the scene's lights and the arrival hint all read that row
  rather than each keeping a number of their own, which is what made the
  floors differ only in price before.
- Every sound is a one-shot except a creature moving in your room, which
  is a held voice: built once and then written to every frame - a level, a
  side and at most a filter, a beat rate or a pitch, no new nodes. The
  Warden's stalk was the first and the registry in `audio.ts` is what made
  the rest cheap: the roost while it is up, the Harrier's wings (the beat
  quickens as it dives, which is the tell from behind), the moth at the
  lantern, the wisp's hum, the Sentry's beam acquiring you and the
  Reaper. Each creature writes its voice from its own frame loop, because
  that is where its position is, and stops it on unmount. A cue rebuilt
  per frame would allocate an oscillator, a gain and a panner sixty times
  a second, which is the shape of every stutter this project has had;
  `yarn test:perf` drives the stalk twenty thousand times and checks that
  one sound came out rather than twenty thousand, and `yarn test:audio`
  starts and stops every held voice and checks the room goes back to the
  room. The one-shots at a creature's moments - waking, striking, falling,
  wheeling away - are its own rather than borrowed from another creature,
  so a player who has learned what the Cutpurse sounds like is not told
  the Cutpurse is here when the Harrier wakes.
  The audio check measures the score's heartbeat at its real master input,
  before the room drone masks it. Intermediate tension keeps the melody
  above the pulse band, so low melody notes cannot pass for a heartbeat.
- **What a thing on the floor IS lives in `src/game/din/`, and what a
  creature ANSWERS TO lives beside it in `susceptibility.ts`.** This is the
  same rule pushed one level further and it is the one worth understanding.
  A bomb declares `[blast] [loud] [bright] [hot]` and never learns the
  Warden exists; the Warden declares `hears [loud] >= 0.30, fears [blast]`
  and never learns what a bomb is. The alternative - each threat carrying a
  private list of the specific events it reacts to - is exactly the shape
  this codebase had, and it is why the floor was flat: 120 of 140 bus
  listeners were Audio and Captions, and across the six threat systems
  exactly one file subscribed to the bus at all.
  Two properties are load-bearing and both are checked. **Silence is the
  default**: a receiver that has not declared a tag is not slightly
  affected, it is unaffected, and there is no fallback that makes
  everything sensitive to everything. And **matching is by tag, never by
  name** - `hears [loud]`, not `hears bombBurst, barrelBurst, grateDrop` -
  so a new noisy thing is heard by everything that listens for `[loud]` the
  day it lands, with no other file touched.
  A third property was written down and not true for a dozen runs: **the
  rows are read by the things they describe.** The Harrier's row said
  `blast 0.20` while the store downed it by "same room as the bomb"; the
  rats' row said `loud 0.45` while they ran from feet and nothing else;
  the Sentry's row said `bright 0.50` while it read a boolean about the
  player's lantern. Each is wired now - the store asks `din.reaches` for
  the Warden, the Harrier and the Keeper, the rats and the moth ask
  `din.answering`, the Sentry asks `din.reaches` - and the layout suite
  greps for each call, because a runtime check passes for as long as the
  hard-coded rule and the table happen to agree. The consequences are
  checked too: a bomb next door puts up a roost, downs the Harrier and
  routs the Warden, does not kneel the Keeper (its row is half, so the
  blast has to be in the room the door is in), and two doors on only the
  rats notice. The Reaper is the one exception and it is written where
  the rule is: deaf to `[blast]` as a signal, held by the pressure wave in
  the room it stands in, which the store applies directly.
- **What a creature IS, all of it, is one row of `src/game/mobs/contract.ts`.**
  Ten creatures were built one at a time over thirty runs and each was
  complete in a different way: the Warden had a held voice and no body
  for eight runs, the Harrier had a body and a row and four borrowed
  sounds, the rats had a row nothing read. Nothing said what "a creature"
  was. The contract does: a name and where it lives, a role (threat,
  ambient, helper) and what it costs you, the verbs that answer it, its
  body, its voice (a held sound and its moments), the events it announces,
  the lesson that introduces it, the file that draws it and the probe that
  file publishes, and whether it wears a tell before it takes a life. The
  layout suite holds every row to every field against the tables and
  files the fields name - `BODIES`, `SUSCEPTIBILITY`, `CAPS`, `sfx`,
  `events.ts`, `LESSONS`, the component - so a creature can no longer be
  as finished as the run that added it. Add a creature by adding a row;
  the suite says what is missing. The toads (`croaker`) were the first
  added against it.
  The Warden's faceted body and open hood use shared geometry from
  `warden/geometry.ts`. Its reaching arms read the existing approach warning;
  its bowed hood, lowered arms and dim light read `wardenStaggered`. The
  inspection probe receives that same frame's warning. Pose changes stop with
  the run clock, and recovery restores the silhouette without a separate timer.
  The readability check uses a real shove and verifies pause, recovery, floor
  clearance and the model's six-draw budget.
- **What an environment IS is one row of `BIOME` in `rooms/biomes.ts`,
  and it has grown two fields.** A biome was a look, a floor that carries,
  litter and a name for its ground. It now also says what lives in it
  (`life`, which `mobs/ambient.ts` reads instead of keeping a list of
  biomes per creature) and what it sounds like when nothing is happening
  (`air`, one of eight, `still` being a real value so silence is a choice
  rather than a gap). `ambience.setAir` in `audio.ts` runs the room's air
  under the bed and under every cue, set from the room's biome on entry,
  and `yarn test:audio` measures each air against a stilled room. The
  fungal biome was the first added against the contract; the eight before
  it were completed to it.
- **How far a thing is heard is `din/carry.ts` and nothing else.** The room
  graph is `Room.links`, which the generator already writes; a doorway costs
  x0.35, a wall costs x0.00, and a barred doorway is a wall. A signal's
  reach is computed once when it happens and never again, so a frame loop
  asking "what can I hear" is a map lookup rather than a flood.
  `carryRoute` records the winning predecessors during that same flood for
  the editor's Signals graph. The route and arrival strength therefore use
  the game's doorway and bar decisions, not a second path finder. Source and
  listener play links use the same scenario URL builder as the rest of the
  editor, so the graph's seed, floor and room bias open playable fixtures. The
  browser gate compares graph readouts with the live Din's strike, hold and
  receiver answers across representative sources and routes. The layout gate
  separately checks generated carry routes against shortest-path distances
  and verifies every displayed edge stays open when a bar is placed.
  `DinDriver` advances that same paused run clock before translating each
  event as well as on frames. A new impulse cannot inherit the previous
  frame's age after a long task. The Din clock browser check delays a frame,
  emits a real event, and checks fresh strength, pause and resumed decay.
  Breaking or lifting a bar preserves its edge and actor-side doorway in
  the event. `warden/bars.ts` resolves that site through `doorPosition`, and
  Din uses it even when the player is elsewhere. The barricade browser
  check verifies both remote grate breaking and local kit recovery.
  Broken furniture likewise carries its actual placement in `propBroken`.
  Din preserves that origin for creature hearing, and the clatter uses the
  object's local bearing or its neighbouring doorway. The Din browser check
  detonates a real device against generated furniture and compares event,
  hearing and audio positions, including repeat-detonation refusal.
  Floor resets clear old emissions and rebuild carried lantern, key and wisp
  signals from current run state. Room entry uses the same reconstruction,
  preserving the lantern's actual band without trailing duplicate sources.
  The carried-signals browser check follows full, dimmed and dark lanterns,
  the floor-local key and the wisp through entry, descent and restart.
- **Where a creature is on the awareness ladder is `ladder/state.ts`, and
  only `LadderDriver` steps it.** Two informants know different halves of
  the world - a floor-level driver knows what the Din is delivering into a
  room, a mounted component knows where the creature is standing and which
  way it is looking - so both `report` and exactly one caller advances the
  machine. Two callers stepping the same capacitor gives a guard that
  flickers between their two views.
  The Cutpurse asks Din for declared impulse responses before pursuing
  pockets. A metal clatter turns it toward the source while the sound remains
  above its hearing threshold; held metal instead reveals the carrier.
  Din owns that impulse/held distinction and the thresholds, so the creature
  never lists keys, rattles or grates by name. Its existing body navigation
  and hazard list govern the investigation. A sound in another room points
  it at an open doorway using the existing barred-door route owner; reaching
  that doorway ends the visit. Turning aside forgets the old player trail,
  while a thief already escaping with loot ignores new distractions.
  `cutpurse-distraction-browser-check.mjs` exercises actual drop inputs,
  physical movement, pause, escape and a rattle leading into a placed snare.
  A sprung snare names the actual body. Catching the Cutpurse spends the
  wire and recovers its loot without crediting a wound on a distant Warden.
  Warden wound events carry their actual cause: spikes, pit, darts or snare.
  The shared body hazard keeps that cause when an opened pit becomes a
  permanent patch. Captions read the event rather than calling every wound
  spikes. The trap combat check follows real dart, pit and placed-snare
  contact through the event and rendered caption, including an open pit.
  A key kept by the Company Seal remains a carried signal after unlocking;
  Din reads the remaining inventory rather than treating every vault opening
  as a spent key. The carried-signals check holds both cases to that rule.
  The vault's exposed latch also accepts one known Wire Snare through `wireVault`.
  `vaultMechanismPosition` owns its visible fitting, interaction and store reach
  check. This explicit use consumes wire, records an item spent for the vow,
  and emits the existing vault sound; it creates no live trap. Requiring a
  named device preserves unknown-item identities and the Ratcatcher's knowledge.
  Ground placement still refuses glazed tile, while wire attached to a wall
  mechanism works there. All three opening methods use `unlocked` for one entry
  and the same bar reset on arrival. The vault-choice browser check exercises
  real wire and key interactions on every doorway orientation, including tile,
  Company Seal retention, pause/reach guards and the actual entry reset.
- **The difference between the creatures is `ladder/caps.ts`, not their
  files.** Every one of them runs the same state machine; a rat is a rat
  because its cap is 2 and a Reaper is a Reaper because its min and max are
  both 3. Capping below the engage rung means it perceives, reacts and
  barks and never commits, which is most of the population in one table.
- **How much pressure a floor is under is `heat/coefficient.ts` and nothing
  else, and it is a PURE FUNCTION.** `FLOOR_PATIENCE_S = 300` is gone. Heat
  is `(dwellMinutes + alarm x 0.5) x 1.15 ^ floorsDescended`, recomputed
  every tick and never mutated on a transition - a mutated accumulator has
  a history, so the same player in the same situation gets different
  pressure depending on the route they took to it. It compounds with depth
  rather than adding, which is what "floors get worse as you go down" was
  always trying to be. And it never kills: it BUYS, at named thresholds,
  and the accumulator crossing an integer is what makes pressure arrive as
  an event instead of as a slider moving.
- **The floor's heat is named and never counted.** Five band names carry
  zero mechanical weight and do the work a number cannot. The rule stays
  transparent (lingering and taking things heats a floor); the magnitude
  does not, because a player who can count does not hurry. The same
  deletion applies to the bar and the oil: economic facts - the toll, the
  gem count, the price - stay numeric because the player is entitled to
  plan against them, and every deleted fear clock is replaced by a physical
  tell rather than by a hidden state.
- **How OFTEN the floor sends something is `cycle/`, and it is a different
  question from how bad.** That split is not an inference: "Algorithm
  adjusts pacing, not difficulty - Amplitude (difficulty) is not changed,
  frequency (pacing) is." The Cycle's only power is to refuse a NEW threat
  during a valley; everything already in flight keeps acting, which is what
  stops the valley reading as a scripted intermission. Heat earned during
  one is held, not cancelled.
- **And decompression is SCHEDULED, not earned: `cycle/menace.ts`.** The
  paragraph above is only half of the Cycle, and the half that shipped
  first. Refusing to send something new does nothing for a player already
  being hounded - they have no valley at all until they wound the Warden
  twice, bomb it, or spend a scroll. So a second accumulator measures how
  long the player has been LEANED ON, over a whole floor, and when it fills
  the Warden turns aside and walks off on its own. A minute of unbroken
  pressure to fill, ninety seconds between two, and two a floor. It is
  deliberately weaker than a rout: no wound is credited, the alarm stands,
  and the Warden is not made wary, because a rout is earned and this is
  not. Its inputs are pressure the player is UNDER and never player noise -
  which is exactly why the Din and the Cycle are two systems and not one -
  and it only fires where the player can see it happen.
- **Where a room's own offers stand is `rooms/anchors.ts`, not the component
  that draws them.** The shop's five - a life, a naming, a blessing, a bomb,
  oil - were five hand-written offsets inside `rooms/content.tsx`, and two of
  them were the same offset. The prompt takes the nearest thing that CAN be
  used, so two interactions at one point are one interaction: one of those
  two could never be reached by anybody, and had not been for as long as
  both existed. Nothing caught it because no check could see where an offer
  stood. The counter keeps the ordinary three-metre reach because it is what
  a player walks to; the goods laid out on it are a metre and a half, so
  standing at the counter offers the counter and stepping up to one offers
  that one. The five spots are reserved anchors too, so nothing gets dressed
  on top of an offer, which is the same bug in its next form.
- **And the finale is paced by a preset, not by the curve turned up:
  `tempoFor` in `cycle/state.ts`.** `CRESCENDO` shipped with the Cycle and
  nothing read it for as long as it existed - a table written, checked, and
  never wired, exactly like the menace gauge. It is the same machine with
  five numbers swapped: a twenty-five to thirty second hold at the top
  against a two to five second valley, inverted from the base curve, and
  it cannot be walked out of. It applies on the approach to the last
  floor's exit - three doorways out, which is where the foreshadowing
  tableau is staged, so the pacing changes about where the player reads
  the thing that tells them what is coming. The Keeper's own doorways were
  already exempt from the director; what had no pacing of its own was the
  walk up to them, and the last ninety seconds of a run were paced exactly
  like the first ninety.
- **Pressure the player ASKS FOR is `heat/pledge.ts`.** The Coefficient was
  entirely imposed - depth, dwell and greed push it and the player elected
  nothing - and the research names both the fix and the condition on it: let
  them add to it deliberately, at a named price for a named payout, with the
  target rising as they clear it, because that is what makes elected
  difficulty an achievement rather than a setting. A pledge is sworn at the
  font, about the floor you are standing on: no lantern, no barred doorway,
  or nothing out of the satchel. Three things keep it a promise. The cost
  lands first, in alarm, which is the currency greed already spends, so
  elected and taken pressure arrive by one door and heat stays a pure
  function of dwell, alarm and depth rather than an accumulator with a
  history. It cannot be withdrawn: break it and the heat stays and the stair
  pays nothing. And it is judged only on facts the run store was keeping
  anyway - the lantern went up, a doorway was barred, something left the
  satchel - so nothing is tracked FOR the pledge and it never becomes a
  second economy running beside the first.
  Device placement records spending only when the item actually leaves the
  satchel. A snare refused by glazed ground keeps the Unspent pledge; the
  store-level layout check covers both slot use and direct placement.
  `rooms/anchors.ts` owns the three vow-stone positions. They fit the room's
  actual floor, stay out of travel lanes and stand apart from the font and
  one another. Rendering, prompts, reward placement and furniture reservations
  all read them. Each offer has a visible stone; the browser check selects all
  three through real prompts in ordinary and revealed hidden shrines.
  Vows begin when accepted. Unlit requires the lantern fully down first;
  the store and shrine prompt share `pledgeBlock`, so an already lit flame
  cannot bypass the sacrifice. The HUD reads `wasKept` from the same floor
  record used at settlement and keeps the rule, reward or broken status visible.
  The settlement lesson names the vow and its actual payout. The browser check
  keeps and breaks each vow, checks the stair's payment, and follows its reset
  on descent alongside the physical shrine selection.
- Which side a sound is on comes from `src/game/systems/bearing.ts` and
  nowhere else. Everything that makes a sound from somewhere needs it - the
  Warden through a wall, a Sentry from its post, every creature's held
  voice - and they have to agree, because a cue panned the wrong way
  sends the player towards the thing it is warning them about. It is pure so
  the layout check can walk it from all 360 headings; the same sign was
  already got backwards once on the minimap, where it survived because it
  was only wrong facing east or west.
- Nothing in the game casts a real shadow. A point light's shadow is a cube
  map - six renders a frame, per room, for scenery that never moves - so
  `src/game/props/ContactShadows.tsx` does the cheap half instead: one soft
  blob under everything that stands on the floor, all of them in a single
  geometry, so a room's grounding costs one draw call and nothing per frame.
  `props/contactShadowGeometry.ts` derives each footprint from the existing
  physical prop, including turn and scale, instead of its broad placement radius.
  It samples `floorHeightAt` for raised gallery pickups and subdivides contact
  crossing a ramp knee. The gem's shadow reads the same `gemRooms` collection
  record as its visible model, so it cannot remain after the pickup disappears.
- `lighting/field.ts` transports local light through the room's existing floor
  union. Alongside RGB irradiance it keeps a luminance-weighted source centroid
  and angular coherence in one bounded texture. `BlockLighting` uses the real
  world normal and surface height to shade faces toward that source, retaining
  diffuse bounce on the opposing face. Balanced opposing lamps become fill.
  This is a directional approximation of the existing field, not a shadow map
  or a second gameplay light calculation: stealth still samples its irradiance.
  All source positions and heights come from the existing animated PointLights.
  The lighting checks compare instanced faces, rotations, overhead and low lamps,
  extinction, room revisits and all thirteen biome renders.
  The same virtual source supplies a bounded GGX highlight using the material's
  existing roughness and metalness, so fittings and water retain a different
  response from rough masonry without a per-source fragment loop.
  `lighting/ambience.ts` derives background fill and air from the floor's light
  rules and the room's actual biome. Each descent retains its own intensity;
  the unlit profile keeps a navigation floor. Fog reach also reads the true
  floor union so long authored galleries keep their terminal silhouette.
- What a prop is - footprint, solidity, collider - is data in
  `src/game/props/specs.ts`, apart from the components that draw it. Four
  things need those numbers and none of them wants a React tree: the room's
  single collider body, the placement filters, the editor's outlines, and
  the layout check, which runs in node. Placement radii are broad clearances,
  not the exact corners of a rotated collider; `propCollidersOverlap` uses the
  catalog's cylinder and cuboid shapes to check authored templates and final
  generated dressing for physical intersections. `propColliderAxisExtents`
  checks the actual rotated reach against doorway lanes and square walls;
  template validation reports these failures while the author can still move
  the prop. `rooms/propClearance.ts` checks cuboid corners and edges or a
  cylinder's radius against the shared floor outline, including shaped room
  shoulders and inner walls. The layout gate checks final dressing with it;
  the Test Hall browser check sweeps rays and the player capsule against the
  mounted Rapier bodies, checks a side lane beyond each physical footprint,
  and confirms the catalog's rotated axis extents match live physics. Selecting
  a hall result draws its recorded query origin, direction and measured contact;
  the capsule ghost uses the same player dimensions as the sweep. The short gate also
  compares `propCollidersOverlap` against Rapier's shape intersection query
  for every solid prop pair under varied scales and rotations.
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
- `src/game/props/FurnitureBatches.tsx` draws repeated fixed furniture,
  including urns, in room-local instance batches. The catalog's standalone
  urn delegates to that renderer, so the editor and rooms share its geometry.
  Urn facets stay modest because instancing submits all copies in a visible
  batch even when an individual urn would have been culled.
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
  The damage action records `lastDamageSource` only when it removes a life.
  Enemy strikes, floor hazards, puzzle penalties and blasts pass their source
  through that same action. Cooldown-refused and post-run hits cannot replace
  the fatal cause, and starting either kind of replay clears it. The loss
  summary reads `player/damage.ts` for the explanation and next-run tip;
  an escape never presents an earlier hit as its ending. The death-review
  browser check follows real strikes, hazard contact and a satchel bomb through
  the summary and replay, including large phone text.
  The ending's optional knowledge review reads `learnedThisRun` and
  `readThisRun` from the existing Ledger and lore stores. Entries and benefits
  come from their catalogs; only discoveries first recorded in this run appear.
  Both outcomes retain knowledge, and both replay actions clear only the
  per-run lists. `run-discoveries-browser-check.mjs` covers duplicate and old
  entries, loss and escape, both replays, keyboard/controller reading and
  maximum phone text. Focusable entries let the shared pad menu scroll through
  long reviews without adding another input handler.
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
- What may stand where in a room is `rooms/Dressing.tsx`'s one `allowed`
  filter, and every rule about it lives there: out of the door lanes, clear
  of the kind's own content, the gem, the spikes, the watcher and the key -
  and, in the memory chamber, off the lines of sight from the lectern to
  each crystal, because a pillar you can walk round is still a pillar you
  cannot see through. Litter goes through the same filter, so a biome
  cannot put something where an arrangement was forbidden to.
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
  of keys lay under the furniture. `Room` uses one key-aware Sentry placement
  for the drawn post and the threats that read it; the fast browser gate
  holds those positions together on a seed where omitting the key moves the
  post to the opposite anchor.
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
  `delvers/catalog.ts` owns starting equipment, known item families and
  satchel capacity. Starting knowledge is rebuilt for each new delver and
  persists through descent. The Ratcatcher knows devices they have yet to
  find, as promised on the selection screen. Shops read `satchelSlots`
  before offering or selling a bomb and charge only after inventory accepts
  it. `delver-choices-browser-check.mjs` chooses the Courier, Vagrant and
  Ratcatcher from the menu, exercises a full bag and a freed slot at a real
  shop, and checks device recognition across finding, descent and restart.
- What a PAIR of relics unlocks is declared once in `PAIRS` in
  `src/game/relics/offer.ts` and read through `modifiers(relics)` like any
  other relic effect, so a duo payoff is never a second switch beside the
  first. Two of the three had been declared and wired to nothing, which is
  the failure mode a table invites: `cracksShow` had a reader from the day
  it landed, `fullCount` and `booksBalance` had none, and a player who
  assembled either pair over three floors was told they had and then played
  a run that was identical. The Full Count's floor is selected by
  `hoardFloorFor` when the pair is completed and recorded as `fullCountFloor`
  in the run store. It selects a remaining floor, including the last when
  acquired there, survives descent and resets with the run. Replaying the
  same seed and acquisition floor gives the same destination. The shared
  `rooms/dressingContext.ts` resolves vault, key, Sentry and hoard facts for
  rendering, creature obstacles, shove and blast furniture, chest inspection
  and the atlas. `placements.ts` appends the extra chests after ordinary
  vault furniture so existing loot identities stay stable. Its lattice
  follows the room outline and leaves player-sized aisles. The independent
  flood in `test:full-count` checks access from entrances to every chest
  across generated vaults; `full-count-browser-check.mjs` checks late pair
  acquisition, real chest interaction, shared obstacles and run lifetime.
  The Books Balance offers a
  one-time key trade when cash would touch the exit reserve. `shopPayment`
  owns that quote; shop prompts, `canSpend` and `spendAtShop` read it.
  The key leaves inventory and its carried sound, while gems remain for
  passage. `booksSpent` survives descent and resets with the run. Ordinary
  `spendGems` pays the exit and cannot consume the pair. Free relics need no
  reserve. `shop-payment-browser-check.mjs` holds these promises together.
  Relic offers preview newly completed pairs from that same recipe table.
  `relicDescription` names the Tally's later-floor timing and warns when no
  later floor remains. Pause-menu relic inspection reads the catalogue,
  missing partners, recorded `fullCountFloor` and `booksSpent`; reviewing a
  kit cannot buy, use or identify anything. The relic-planning browser check
  follows each advertised pair through a real shop purchase, then checks its
  reminder, spent trade, new-run reset, phone layout and controller access.
  Long offers wrap beneath the interaction key when a narrow screen cannot
  fit both columns, keeping the whole purchase legible at large text sizes.
- Where the camera is pointing is `src/game/input/look.ts`, written once a
  frame by the look controls. The minimap turns with it. It is deliberately
  not store state: it changes every frame a mouse moves, and the HUD would
  re-render at that rate.
- What the game is being played on is `src/game/input/device.ts`: a
  desktop, a phone or a tablet, decided once from what the platform says
  about its pointer and the short side of its screen, and whether the
  on-screen controls are drawn - the player's setting, with `auto` meaning
  anything held in the hands and a desktop once it is touched. Everything
  that lays out differently for a phone asks it. The on-screen stick and
  the look drag are `src/game/input/touch.ts`, module data written by the
  layer's pointer handlers and read from the frame loop like the pad; the
  on-screen buttons are not there, because a button is a key whose code is
  the action's name (`keyboard.pressAction`), so the trigger that consumes
  E consumes USE without knowing the difference.
  Immediate actions and the frame-read keyboard buffer share `isGameplayKey`
  in `input/bindings.ts`. Standalone Ctrl and Alt remain bindable, while
  browser shortcut chords cannot become held movement or buffered actions.
  `keyboard-bindings-browser-check.mjs` rebinds both sides of each modifier
  through the pause menu and checks real play, repeat suppression and chords.
  Saved bindings restore through `input/bindings.ts`: valid saved rows claim
  keys before missing or invalid rows receive defaults. Empty rows remain
  unbound, forbidden keys fall back, and duplicate assignments are removed.
  Ordinary key codes must match a complete supported physical code, so
  truncated or invented saved names cannot replace working controls.
  Extended keypad names retain the standard's open Numpad suffix convention.
  The same browser check reloads an older partial save and confirms its
  custom map key does not also trigger the lantern, then saves and reloads
  the repaired mapping without losing unrelated preferences.
  Interaction prompts and satchel key labels read those same live bindings.
  Prompt events carry the interaction text and availability, not a second
  key mapping. `SLOT_ACTIONS` supplies the keyboard dispatcher and satchel;
  touch labels retain USE and numbered slots. The control-labels browser
  check rebinds a real door, checks item labels and measures long prompts
  at maximum text size across narrow and wide viewports.
  The Controls page shares lantern, barricade and shove explanations across
  keyboard and touch, reading kit count and shove recovery from their game
  owners. Its sprint instructions follow the current hold/press setting;
  controller sprint remains held. The same browser check changes the setting
  through the menu and guards the room-based oil and reusable-kit guidance.
  Dropping the iron key uses the store's `dropKey` action on keyboard, d-pad
  left and the contextual touch DROP KEY button. The store owns placement,
  sound and control guards; both help layouts explain its use as a lure.
  `key-drop-input-browser-check.mjs` drops and recovers it through real pad
  and touch inputs, checks maximum text size and both thumb layouts, and
  guards held presses and input boundaries against queued drops.
  The store's shove action builds its notice from the effects it applied:
  Harrier retreat, Warden stagger, and Cutpurse recovery. One shove can name
  several targets; an empty-handed Cutpurse never claims recovered loot.
  The gameplay check compares these notices with the actual combat and
  inventory changes, alongside misses, solid cover and immune targets.
  Furniture cover reads the actual rotated and scaled collider through
  `props/specs.ts`'s `propBlocksSegment`, at the hand's height. Broad furnishing
  radii cannot block an otherwise clear shove beside a narrow bookshelf.
  The prop oracle compares cover rays with Rapier; the gameplay check follows
  both clear side lanes and blocked faces through the actual shove and feedback.
  Cutpurse theft, escape and recovery events carry both the gem count and
  whether the iron key changed hands. Captions, the stolen-loot HUD and shove
  feedback name that payload through `thief/loot.ts`; they never infer it from
  inventory after the action. A key-only theft reveals the nest and its map
  marker, while stealing a gem leaves the carried key's Din signal intact.
  The cutpurse-loot browser check follows both items through escape and recovery,
  checks the visible map and HUD, and guards empty-handed catches.
  The nest renders and offers recovery even when it holds only the key, using
  the floor key's shared `IronKeyModel`; the same check takes it back through
  the ordinary E-key interaction and verifies the empty nest disappears.
  `thief/nest.ts` also owns the heap's position and radius. It keeps the old
  corner when clear, otherwise finds a nearby patch using the room's real
  footprint, dressing, key, watcher, content anchors and spike beds. The
  existing obstacle route planner verifies an approach from an entry landing;
  floor height comes from the shared elevation owner. The heap never shifts
  because furniture breaks or the player revisits it. `test:nest-placement`
  checks placement over generated floors and uses an independent flood to
  verify a safe pickup route. The recovery browser check visits a generated
  native nest and uses the same mounted interaction as play.
  `player/combat.ts` also owns `shoveStatusAt`, the charge and recovery
  readout used by both the HUD and the touch SHOVE button. The larger touch
  target shows readiness, windup and recovery beside the thumb; unavailable
  presses cannot queue an attack. The focused touch-shove browser check taps
  the real button on phone and tablet, compares its countdown with the HUD,
  pauses recovery and checks text fit at maximum scale.
  Keyboard and touch help share a responsive definition-list layout: narrow
  screens put the label above the instruction so the text gets the full
  reading width. The control-labels check measures both modes at maximum
  text size and verifies that Back remains visible and reachable by scrolling.
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
- A bomb is the fourth item family, and the first thing in the game that
  is done to everything in reach at once, the player included. It is set
  down through `placeDevice` like a device, carries a `fuseAt` on the
  run's clock, and `systems/BombDriver.tsx` calls `detonate` from the
  frame loop when it is due - never a timer, because a fuse lit and then
  paused is a fuse that has not burned. What the blast does is decided
  in one place, `detonate`: the player in reach is hurt, the Warden in the
  room is routed through `routWarden` (the same owner a second spike wound
  uses, so a bomb and the spikes can never come to differ), the thief
  drops what it holds, and a cracked wall in reach gives.
- **A relic that promises something must have a reader.** The Cutter's Cant
  said "you may take the third offer the shop was not going to show you"
  and the shop sliced its list to two unconditionally - nothing in the tree
  read `thirdOffer`. Four gems for nothing, and the Courier *brings* it and
  pays two satchel slots for it at the character screen, so choosing that
  delver was a permanent cost for a permanent no-op. `offeredAt` is the one
  owner of what a shop shows now, read by the shop and by the checks, and
  the layout check fails on any `RunModifiers` field nothing reads. Note
  the second bug the check found on the way: the list has to be shuffled
  WHOLE and filtered afterwards, because filtering first draws a different
  shuffle - the relic beside the Cant changed identity in 167 of 200 shops
  the moment it was bought, which is under the player's hand as they turn
  round. The shop's third shelf anchor is reserved whether or not anyone
  holds the Cant, so the furniture does not move either.
- **Naming is batched, locking, and free, and it lives in the pause menu.**
  A run learns what a bottle is by drinking it, by paying the shop, or by
  working it out - and the third of those was written down, built, and
  reachable by nothing: `identifyBatch` had no caller anywhere in `src`.
  It also was not a guess. It took slots and named whatever was in them,
  which is a free reveal wearing the words of a guess. It takes what the
  player SAYS each unknown kind is now, and either every name in the batch
  is right and they all settle or none of them do - and the game does not
  say which one was wrong, because telling them that turns one batch into
  three single guesses, which is the thing a batch exists to prevent. A
  batch short of its size is refused for the same reason. Nothing is spent
  either way: the cost of guessing is the right answers wasted beside the
  wrong one. `unknownKinds` and `batchSize` are the one owner of what a
  batch is, read by the store and by the screen, so the button can never
  offer a batch the store will refuse.
- **A slot press is `useItem`, and `useItem` is the only door into all four
  families.** Nothing else is wired to the keyboard, the pad or the touch
  button, so a family `useItem` does not name is a family that cannot be
  reached at all. The bomb was that family for as long as it existed:
  `useItem` delegated to `placeDevice` under `isDevice(id)` alone, so the
  press fell past the potion and scroll switches, matched nothing, and
  spent the slot anyway - the bomb was eaten and nothing was set down, and
  the whole chain below it (the fuse, the burst, the wall it opens, the
  room behind that wall) was unreachable from play. Every bomb check
  passed throughout, because each called `placeDevice` directly. A check
  that stands in for a player has to press what the player presses.
- A secret is an edge, not a link. `room.secret = { dir, to }` names the
  room behind a cracked wall; `links` are what the walls cut doorways
  for, what the minimap draws and what the Warden walks, and a secret is
  none of those until `revealSecret` moves it into `links` on both rooms.
  The generator places it after the vault and the key, because those
  reason about what the floor can be walked without and a room with no
  doorway would count as a room nobody can reach.
- A creature has a body, and the floor reads it in one place.
  `mobs/body.ts` owns what a `ground`, `flying` or `ghost` body walks
  round (`obstaclesFor`) and what bites it (`bitesFor`), from the room,
  the seed and the placed devices. `Room.tsx` asks it for the Warden and
  the Cutpurse; neither creature builds its own list. Before this the
  Cutpurse carried its own copy of the snare's radius, and both walked
  through the furniture the player has to walk round. Anything added to
  a floor later - a trap, a creature - reads these two functions rather
  than inventing a third answer.
  A patch a body steers round may name its own berth (`Patch.berth`):
  spikes keep the Warden's wide margin, furniture asks only a body's
  half-width, and a chest given the spikes' berth sealed the treasure
  room's corner hoard against it.
- A floor's pressure is one function in `heat/coefficient.ts` and one field
  in the store - `floorEnteredAt`, the run-clock second the floor began -
  and `heatNow(s)` is the only arithmetic on them. `heat/HeatDriver.tsx`
  reads it from the frame loop, never a timer, because the run's clock is
  the one the pause menu stops; it announces each band once and buys each
  lump once, all keyed on the second the floor began so a new run's first
  floor is announced again. The Reaper is a `ghost` in the body table and
  `reaper/Reaper.tsx` is what ghost means: it asks the floor for nothing.
  Its store-owned room identity controls where it mounts; the pursuit driver
  follows a perceived doorway after a delay, and a broken trail leaves it
  behind. The store also owns the three things
  that can happen to it: waking, striking (through the ordinary damage
  path, like the Warden's strike) and being held by a blast, which
  `detonate` calls the same way it routs the Warden.
- Where the floor's ambient life is comes from `src/game/mobs/ambient.ts`
  - `ratsFor`, `roostFor`, `mothRoom` - derived from the room and the
  seed the way the furniture is, so the rats a check counts are the rats
  the room draws and the roost the HUD names is the roost the bats burst
  from. Each creature is a body in the table and a component that reads
  `obstaclesFor`/`bitesFor` for it; none owns a rule. Where the Warden
  stands is `src/game/warden/position.ts`, module data written by the
  Warden and read by what flees it; `__warden` is the dev copy, not a
  second owner. A snare says who sprang it (`springSnare(key, by)`): a
  rat spends the wire and wounds nothing. The moth holds the light in
  the Warden's eye through `mothLeaves` writing `litUntil`, and a roused
  roost carries a dash through `rouseBats` writing `noisyUntil` - the
  same two deadlines the lantern and the sprint write, so `wardenSenses`
  did not learn a third sense.
  Every lantern action extends `litUntil` without shortening an existing
  moth hold. The layout suite checks these competing deadlines through real
  store actions; the smoke check observes departure and preservation after
  the last dimming press, independently of frame timing.
- Where the floor's traps are is `src/game/traps/placement.ts` -
  `trapsFor(room, seed, endId)` - and what each is to a body is `TRAPS`,
  in the body table's own words (`springs`, `hurts`). The store owns
  what has gone off (`sprung`, by key and run-clock second: a plate
  re-arms, a pit stays open) and the two things a trap can do to the
  run: `springTrap` and `dropGrate`, the latter a bar the player did not
  make. An open pit reaches every creature through `bitesFor`, which
  reads `sprung` beside `placed` - the one list of what bites a ground
  body, now with the floor's own holes in it.
  Trap candidates must fit the real room outline. Exit protection filters
  grates after seeded placement, so knowing the exit cannot change a pit's
  location or identity between the scene and creature damage. Trap
  placement also reserves secret approaches from the start; opening a
  cracked wall never rerolls existing traps or discards their sprung state.
  Dart plate dimensions live in `traps/geometry.ts`; drawing, hit detection and ground
  reservations read them. `roomDressingOptions` reserves seeded trap ground
  before vault furniture and Full Count chests are placed, keeping the tell
  exposed without moving an already sprung trap. `test:trap-placement`
  checks ordinary and brimming rooms, bounds, exit safety and open-pit damage.
- What is behind the cracked wall is `src/game/dungeon/secret.ts` -
  `secretFlavour(d)` - one owner beside `secretId`; the content
  (`Secret` in `rooms/content.tsx`) asks it and draws a hoard, a
  reliquary or a shrine, reusing the vault's dressing, the relic stand
  with a price the floor set, and the shrine's own component rather
  than copies. The draft is `rooms/Draft.tsx`, reading `room.secret` and
  writing one module flag the HUD polls. The shop's bomb is one more
  trigger at the counter and one flag in the store (`bombBought`, reset
  with the floor), because the counter already owned how a purchase is
  refused.
- What a blast does to the furniture is `src/game/props/breakable.ts`:
  which kinds burst, the key a burst prop is remembered by (where it
  stood, not an index), whether a wreck holds a gem, and whether a
  breakable stands between a blast and a body. `detonate` asks it; the
  store keeps `broken` for the floor; the dressing draws wrecks and
  leaves burst props out of the colliders; `obstaclesFor` leaves them out
  of every creature's list. The pure half of the dressing -
  `placementsFor` - lives in `src/game/rooms/placements.ts` now, out of
  the component module, so the store, the body table, the ambient life
  and the traps can read the list the room draws without a React tree
  or a cycle.
- The player's marks on the map are store state (`marks`, per floor)
  that nothing in the game reads; `toggleMark` is the one writer, the
  key and the pad button both call it, and the minimap draws it. The
  wall's tells are one owner each: `Draft.tsx` knows whether the player
  is in the draft and paces the sound through the wall on the run's
  clock; `dungeon/secret.ts` says what is behind it; `Walls.tsx`'s
  `Crack` breathes. None of them marks anything.
- The lamplighter wisp has no state of its own: `wispOut` in the store
  is written by one driver from `wardenSeesLight`, so the wisp and the
  Warden's eye agree by construction. `mobs/lamplighter.ts` owns where it leads
  (`wispTargetFor`: the unopened secret's host, else the exit, through
  the first doorway of the shortest path; the crack itself in the host)
  and where it is (`wispAt`, module data). The braziers read `wispAt`
  to flare; the store never hears of it.
- The Harrier is the second thing on the floor with a body, and the
  first flier: `mobs/harrierRoost.ts` owns where it roosts (`harrierRoostFor`)
  and comes in (`harrierEntryFor`, the wisp's path logic pointed the
  other way) and where it is (`harrierAt`, module data). The store owns
  whether it is awake, away, down or slain and the three things that
  change that (`wakeHarrier`, `harrierStrike`, `downHarrier`,
  `slayHarrier`), and `harrierBody` says what the floor treats it as
  right now - a flier, or downed, a thing with feet. `body.ts` decides
  what a flier clears (`clearedInFlight`: anything whose collider stops
  under `FLIGHT_HEIGHT`); the Harrier, the moth and the bats all read it.
  Its mounted attack loop owns windup and recovery. Leaving attack reach or
  breaking sight cancels the dive and gives it one `HARRIER_WINDUP_S` beat
  to regroup; a knockdown clears the interrupted windup. The focused Harrier
  browser check walks away through the reach boundary and verifies a fresh,
  complete warning after getting up, using real movement and store actions.
- The Keeper is one state and many posts: `keeper/posts.ts` owns where
  it stands (`keeperPostsFor`: every doorway into the exit room on the
  Keeper's floor), the store owns whether it holds the stairs
  (`keeperHolds`, `keeperStalled`, `stallKeeper`, `keeperStrike`) and
  refuses the exit in `travel` from the same selector the door's prompt
  reads. `detonate` asks the posts whether the blast's room is one it
  stands in; `KeeperDriver` says when the kneel ends. It never walks, so
  nothing on the floor bites it, and it is in the body table because
  everything with a body is.
- Deeds stay in one watcher (`deeds/watch.ts`) fed by facts the game
  already says; the ten loops' five are no exception, and where a fact
  was missing the event grew it (`floorDescended.left`) rather than the
  watcher reaching into the store to count. `earnedThisRun` in the deeds
  store is the summary's list, cleared on `runStarted`.
- Effects listen and own nothing: `props/Burst.tsx` gives the blast a body
  (a flash, embers, dust) off the same `bombBurst` the sound plays on, and
  the player's shake reads the same event. The store never learns the
  light exists; the checks read the effect's probe rather than the scene.
- One teacher, one table: `teaching/teacher.ts` holds every first-time
  line the game says - the event, the words, whether it is once a run or
  every time - and is the only thing that emits a teaching `notice`. A
  system that grows a rule the player cannot see adds a row; the store
  changes facts and never says sentences.
  Passive wildlife lessons are marked `ambient` in that same table. They
  cannot replace a notice during its reading window. `Hint` alone writes
  `teaching/noticeReading.ts`'s deadline using `NOTICE_HOLD_S` and the paused
  run clock; the teacher reads that deadline and the same panel's reading
  focus. A skipped observation is not marked taught and is
  eligible on its next occurrence; there is no queue of stale observations.
  Threat lessons and direct action feedback still interrupt immediately.
  `teaching-priority-browser-check.mjs` checks concurrent danger/wildlife
  events, paused reading time, later teaching, once-per-run behavior and reset.
  The readout interaction check also fires a wildlife event while the player
  reads beyond the timeout, then verifies teaching resumes after focus leaves.
  Lantern-out guidance reads the store's `lanternRaiseBlock`: Gloom points to
  firelight, insufficient oil to a shop, and a snuffed lamp with oil to the
  current relight control. Raising with the last oil is allowed, but entering
  another room extinguishes that empty lamp. The item-feedback browser check
  covers both sides of the raise-cost boundary, the resulting guidance, and
  the actual scene light. `lanternLit` reads the glim alone: remaining oil
  pays for future actions, not for a flame already paid for in this room.
- One rule, asked by everything it binds: `sanctuaryRoom` in the run store
  is the floor's first room while the player has not left it and the floor
  has not reached its last band, and the Warden's step, the Harrier's waking and the
  thief's arrival each ask it rather than deciding for themselves.
- Taking something is drawn the same way a blast is: `props/Taken.tsx`
  listens to `gemCollected`, `relicTaken` and `itemTaken` and plays one
  light and one instanced ring of motes, deliberately smaller and shorter
  than the burst so the two are never confused. Where each event happened
  travels with it as an optional pair of numbers; the store does no
  geometry with them and only passes them on, and the three pickups that
  are puzzle rewards give none, so the flourish plays at the player.
- How far the delver's own flame reaches is `GLIM_BANDS` in
  `src/game/lantern/glim.ts`, and its brightness is `candelaAt` beside it -
  one fact about a fire rather than two, so no band can be declared bright
  and short. `world.ts` used to hold a raised reach and a lowered one and
  `Lantern.tsx` eased between them, which meant the glim's five named steps
  had two lights between them: a player tapping down from Raised to
  Guttered, or Dark to Blind, changed the readout and not the room. The
  candela curve is fitted through the two lights that shipped (15 units at
  24 candela, 5 at 4) so the bands a player has seen are unchanged and the
  three that never had a light are filled in on the curve those two
  describe.
- The game has ONE palette and it is torchlight. `colors` in
  `src/ui/overlay.ts` is the only palette every DOM overlay reads from, and
  `glow` per biome in `src/game/rooms/biomes.ts` is what lights a room. They
  used to disagree: the UI was blue-white ink, blue-grey secondary text and
  a cyan accent on blue-black panels, while the commonest biome in the game
  lit its rooms with a cold blue-grey fill - and the doorways were three
  strips of `meshBasicMaterial`, an unlit flat colour no light in the world
  could touch, so the most saturated thing in every room was its four exits
  glowing teal. Three different pieces of the game each picked their own
  temperature, which is what "it looks disconnected" actually is. The UI's
  accent is now the same gold that burns over an exit you can afford, its
  danger the same red as one you cannot, a doorway is cut stone lit by the
  room it stands in, and a lamp over a lintel means something because only
  the doorways worth marking carry one. The cold biomes - flooded, crystal -
  stay cold on purpose, and now read as exceptions rather than as more of
  the same.
- What a relic does to the screen is decided in `modifiers` with
  everything else it does: `lightTint` is the colour of the carried
  lantern, so two relics that both tint it agree whichever was bought
  first, and `player/Lantern.tsx` asks rather than deciding.
- A chest's key is its index in the room's full placement list, owned by
  `rooms/placements.ts` so the trigger that loots one, the prop that draws
  it open, and the store's probe cannot disagree. The drawn list is
  shorter in a room where something has burst, so the open flag is looked
  up by where the chest stands rather than by its place in either list.
- The readout is a list, not a block: `ui/hudLines.ts` is the only thing
  that decides what each line is called, what it says, and how urgent it
  is, over five ranks from "this is taking a life" down to "this is where
  you are". The component builds a snapshot of the facts and draws what it
  is handed, so a new system adds a row rather than appending markup at
  whatever point in the file it happens to reach. No two lines may share a
  label and nothing drawn in the danger tone may lack a high-contrast
  mark; both are held by `yarn test:layout`.
  Harrier and Reaper presence reads their store-owned room identities.
  Threats elsewhere retain a floor warning without claiming to be overhead
  or here, and rank below immediate attackers. The pursuit browser check
  verifies the visible guidance before arrival, after arrival and after a
  broken trail; the layout suite holds their urgency ordering.
  The desktop card keeps those lines but uses tighter leading. The quick
  browser gate measures a crowded third-floor HUD against a 425-pixel height
  budget at 1280×800 and checks that the guidance panel remains clear.
  On compact screens the status card is capped at half the viewport height.
  The line owner puts lives first there; threat and resource lines precede
  the instrument readouts so scrolling cannot hide the initial life count.
  `ui/Readouts.tsx` reserves the live HUD, map and touch-control footprints,
  including swapped thumb sides. Captions and guidance share that space in
  a vertical stack, with at least one full line of each visible; longer
  messages scroll inside their own panel. These readouts and the status card
  use `ui/usePanelOverflow.ts` to accept scrolling only when their content
  overflows; otherwise pointer gestures still reach the game. The overlay
  check verifies visible reading space, control clearance and keyboard scroll
  access at maximum text scale.
  Overflow measurement also observes the root style that owns UI text scale:
  larger text can outgrow a capped panel without changing its outer box.
  The readout interaction check holds that box fixed while enlarging and
  shrinking text, verifying actual keyboard scrolling and restored gestures.
  A new notice or a life-count change resets its readout to the top, keeping
  fresh combat information visible after the player scrolls older details.
  Readout clicks cannot capture the view or shove. Focused readouts keep
  reading keys out of gameplay while allowing Escape
  to pause. A caption or guidance notice whose lifetime expires while focused stays until blur,
  so scrolling cannot lose the sentence mid-read. The readout-interaction
  browser check verifies scrolling, expiry, movement and shove isolation,
  and access to pause through the real keyboard path.
- The four moments the arc turns on are a table in `ui/momentBeats.ts` and
  one player in `ui/Moments.tsx`: an event, a hold, a wash and what it
  says. The descent holds the floor's blurb on the black rather than
  putting it in a corner notice while the player is reading a new room,
  and it takes those words from `floorRules` like everything else about
  the descent - so the teacher does not also say them. None of the beats
  take a keypress.
  Moments, captions, deed cards and item feedback retain their remaining display
  time while paused; moment fades pause as well. Their DOM callbacks share the tome's
  `state/runTimer.ts` scheduler, which reads `runClock` rather than a second
  countdown. The focus-pause check holds each message past its normal display
  duration, resumes it and confirms that only the remaining time is spent.
  The overlay check exercises environmental warnings and the longest Ledger
  entry on desktop, phone and tablet, checking that captions clear guidance
  and controls as well as fitting within the viewport.
  A new run clears captions, deed cards and moments through `runStarted`,
  including a replay of the same seed. The restart check uses both summary
  buttons and confirms that old messages disappear while new opening
  guidance remains.
  Mire, Gloom and Dread descriptions come from `items/afflictions.ts` through
  the item catalogue. Item feedback keeps the drawback, useful side and cure
  in one panel that fits the viewport; guidance keeps the cure available longer.
  Consecutive notices must not erase the explanation.
  `items/feedback.ts` describes the charged kind just used. Avarice's gem
  count and Healing's capacity read the same charge helpers as the store;
  cursed Healing names its noise cost and cursed Mapping includes Gloom's
  effects and cure. The browser check compares the text with actual rewards.
  Pause-menu satchel inspection reads that same description before use, with
  the current kind's charge. It exposes effects only for identified kinds
  and the visibly named bomb. Unknown appearances keep their secrets; opening
  a slot only expands its description. The satchel-inspection browser check
  covers knowledge privacy, charged effects, paused input and changing slots.
  The long smoke check reads the visible explanation, not retired notice wording.
  Gloom and cursed Mapping share one application in the run store: the map
  darkens, the flame goes out, and the lantern-out lesson explains the cure.
  Clearing either effect preserves the floor revealed by Mapping.
  Mire cure progress belongs to the current affliction. Swiftness clears it,
  and a fresh Mire after expiry starts at zero; renewing an active Mire keeps
  the containers already worked. The layout check exercises these actions.
  The item-feedback browser check uses the real consumables and checks both
  messages together, including large phone text.
- The map marks what the readout names. A place the HUD tells you about -
  the harrier's roost, the stairs the Keeper holds - is on the minimap
  too, because a readout and a map that disagree about what is worth
  knowing are two readouts.
  `Minimap` also draws the north-up floor map opened from the pause menu;
  both views share the same room knowledge, outlines, marks and Gloom state.
  The pause view centres the known floor and turns the player's arrow;
  the small dial centres the player and turns the floor. `mapLayout` in
  `ui/minimapGeometry.ts` fits the entire known layout, using radial reach
  for the rotating dial rather than a minimum zoom that clips distant rooms.
  `map-navigation-browser-check.mjs` uses a real Mapping scroll on a long
  floor, checks orientation and phone sizing, and verifies that route planning
  preserves pause, private room shapes, player marks and Gloom. The pad check
  opens the map through the same pause button using the d-pad and A.
  Both maps draw each learned doorway once, with its endpoints taken from
  the two room footprints. Barricade crosses read the store's `barricades`;
  temporary grate bars read `barredNow` and its existing expiry publication.
  A grate lifting cannot erase a barricade on the same edge. Knowing that two
  unexplored rooms exist does not reveal a connection between them; visiting
  either endpoint or Mapping teaches that doorway. The map browser check
  covers this boundary, simultaneous barriers, pause and reset; the barricade
  check verifies markers through the actual build and recovery controls.
  `rooms/services.ts` derives remembered shops and fonts from visited rooms,
  the existing secret story, bomb stock, cleared fonts and vault unlock state.
  Both maps use those records; Mapping alone never discovers a service.
  The expanded map lists their real place names and lets keyboard, touch or
  controller input highlight a room without changing the run or the player's
  own marks. Gloom hides the list with the chart. The service browser check
  enters generated rooms through real doors, buys a bomb, uses a locked font,
  discovers a hidden font, and checks stock, pause, large text and descent.
  The same memory owner supplies discovered district landmarks, using the
  arrival name and district table. Their existing map symbols gain titles and
  the pause chart can highlight their rooms, including the landmark where a
  learned tally begins. Mapping cannot discover these names. The trail browser
  check covers naming, selection without run changes, Gloom, phone text and reset.
- Everything that can take a life publishes `tell`, nought to one: how near
  it is to doing it. The body shows that number and the checks read it, so a
  warning cannot be true on screen and false in a test.
- Anything that is not state goes over `src/game/events.ts`. One typed bus,
  and `yarn test:layout` holds both ends of it together: every event it
  declares must be emitted somewhere and listened to somewhere. A typed bus
  checks what an event carries, not whether anybody is at the far end, and
  three events had nobody - among them `wardenStruck`, which meant the
  Warden catching you sounded exactly like walking into spikes.
- Textures come from `src/game/textures/registry.ts`, by id.
- Where a set piece STANDS is the generator's, and one of them is placed by
  meaning rather than by the draw: the tableau flagged `ahead` in the corpus
  is staged in the last ordinary chamber on the approach to the exit, on the
  floor the Keeper stands on, by `foreshadowOn` in
  `src/game/deepworks/placement.ts`. A template placed that way is excluded
  from `templatesForKind` - `placedByMeaning` is the predicate - because a
  set piece that is both foreshadowing and scenery is scenery.
- How often an authored room turns up at all is `AUTHORED_CHANCE` in
  `generate.ts`, a fixed third. It has to be a constant rather than a
  by-product of the draw: `pick(rng, [undefined, ...authored])` makes the
  chance `1 - 1/(n+1)`, so the share climbed with the library and six
  templates would have made five normal rooms in six hand-made. A growing
  library must mean more DIFFERENT set pieces, never more set pieces.
- **A template exists for every kind of room a run hands out, and each holds
  eleven props.** Both numbers are held by `yarn test:layout` and both were
  measured before they were chosen. The first: only `normal` and `treasure`
  had templates, and a run is mostly the other ten kinds, so a third of the
  eligible rooms was eight percent of the run - a player met one hand-made
  room in twelve, and the room builder, the validator and the slot system
  were all serving that twelfth. It is 34% now. The second is worse and had
  never been measured: a templated room draws ITS OWN props and nothing else
  - no seeded arrangement, no biome litter - so the four-to-six prop
  templates that shipped first drew rooms EMPTIER than the generator would
  have furnished, and the authoring pipeline was making the game barer. The
  eleven is the draw-call budget's, not taste: a dressed room reads 51-59
  calls against a written 72, and what makes an authored room read as made
  is the arrangement rather than the count.
- Sizes and shapes come from the template, so an authored room is only ever
  built at a size and shape its own kind allows - `SIZE_RANGE` and
  `SHAPES_FOR` in `generate.ts` - and the shipped set spreads across the
  ladder deliberately. Fourteen templates all authored at sixteen metres
  made sixteen metres half the dungeon, which the size-variety check caught
  the same afternoon.
- What the walls SAY is `src/game/deepworks/fragments.ts` - forty fragments,
  none of which contains "then", "after" or "next" - and where each of them
  is cut is `src/game/deepworks/placement.ts`, which is the one place that
  decides. Two separate owners on purpose: a fragment's `on` is a fact about
  the fiction (a line on the Keeper's slab has to be one a man on the last
  stair would have written), and `SURFACES_OF` is a fact about the game's
  rooms. `on` says where a line could have been CUT and never what is
  standing in the room, so no fragment can imply a prop the game does not
  place.
  - The run's ending weights the corpus rather than filtering it: three
    disjoint corpora would be three places rather than one seen from three
    angles, and would put the planted contradiction out of reach of the runs
    that most want it. `yarn test:layout` measures that it still leaks.
  - Reading one is an `InteractTrigger`, which is the whole design: reading
    costs time, and the floor already charges for time. Never a marker on
    the map, never voiced. What has been read lives in
    `src/game/state/lore.ts` and buys nothing.
- What the delver has WORKED OUT is `src/game/state/ledger.ts`, and the one
  place an entry gets written is `src/game/ledger/watch.ts` - the same shape
  as `deeds/watch.ts`, and for the same reason: the alternative is a line of
  bookkeeping in every system that can teach something.
  - A deed records what happened and changes nothing. A lesson changes the
    NEXT run, by letting the delver skip a step they have already paid for
    once. That is why they are two stores and not one list: a store that
    mixed them would invite a deed to start paying.
  - The rule the recording side obeys, and it is a constraint on the game
    rather than on the player: **an entry is written when its observation
    happened, and never when something merely implies it.** Opening a wall
    the delver never stood at teaches nothing. Three of the nine entries are
    about a thing FAILING to react, which no event can carry, so they are
    counted on a quarter-second tick rather than fired.
  - What a lesson buys is spent by the system that owns the thing: the
    Minimap marks a felt draft, `Captions.tsx` names what is behind a wall
    and says a rung heard through one, and `hudLines.ts` carries the DARK
    line's vein band and the KNOWN line. `knows(id)` in `state/ledger.ts` is
    the one question any of them asks.
- Templates come from `src/game/rooms/templates.ts`, by id - and the
  content is registered by `App.tsx` importing `src/game/rooms/shipped.ts`
  for its side effect. That import is load-bearing and was missing for the
  whole life of the pipeline: the registry is not allowed to reach for
  content, so the entry point has to, and nothing did. Two authored rooms
  were held to sixty seeds in all eight orientations by `yarn test:layout`
  (which imports the content itself) and never once drawn for a player.
  The smoke suite now reads the registry the game holds, through
  `window.__templates`, without importing the content to make its own
  assertion true.
- What an authored room actually contains is `authoredProps` in
  `src/game/rooms/templates.ts`, and it is the one place a template's
  substitution slots are resolved. A template's props may be placeholders
  with a `slot` name, and its `slots` rules say what each may become -
  `subst` (the whole room agrees on one drawn kind), `shuffle` (the
  composition is kept, what stands where is not), `nsubst` (the first N
  become one thing, the rest another). They are resolved once, from the
  room's own identity, *before* the props are turned - so the dressing, the
  gem's placement and the door-lane filters all read an ordinary prop list
  and have no idea a placeholder was ever there. A placeholder never leaves
  `resolveSlots`. Two shipped templates are thirty-six rooms this way, and
  eight orientations on top of that.
  - Keyed on `room.seed`, `room.id` and `room.grid` rather than the floor
    seed, for the same reason the orientation is: a run's three start rooms
    share an id and a grid square, so a template drawn from the floor seed
    would have furnished all three alike.
  - A slot decides what a room *looks* like and never what it *pays*.
    `keepsItsWorth` in `src/game/rooms/slots.ts` is that rule, and
    `yarn test:layout` holds every shipped rule to it - the first slotted
    hall put its chest in a `subst` beside a statue, and a third of the time
    a key opened onto a chamber with nothing in it.
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
  player a hitch took that from nothing to past its own tolerance in one go -
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
- Whether the player is in control at all is `canControl` in
  `src/game/state/run.ts`: playing, not paused, not mid-transition, no
  input locks. Anything that spends something asks it rather than spelling
  it out again. `useItem` spelled out three of those four terms and left
  out `transitioning`, which is the one a satchel key needs most - 1 to 4
  and the pad's slot buttons stay live through the black frame between two
  rooms, so a Potion of Swiftness could be drunk on a player who cannot
  move. At the exit door it cost the whole bottle: the descent wipes
  `effects` a beat later, so the potion left the satchel and did nothing at
  all. Measured before the fix - swift set to 30.7, floor 2, swift 0,
  satchel empty. The three places that still name the terms themselves are
  the pause toggles and the pointer, and they are the ones that should
  still work while the screen is dark.
  The keyboard buffer reads that same predicate when accepting physical or
  on-screen presses and clears pending edges whenever control changes.
  Its one-second grace covers slow gameplay frames, never menus, puzzles or
  room transitions. Held movement keys retain their physical state. The
  input-boundary browser check guards both sides of each boundary and then
  uses a fresh physical key to travel through a real door.
  Consuming an action drains all of its pending keyboard and on-screen
  alternatives together, so simultaneous inputs cannot repeat it on the
  next frame. Held keys and later presses remain independent of that drain.
  Changing hold/press sprint mode clears the player's toggle synchronously
  with the setting. The sprint-noise check switches modes through the pause
  menu and confirms fresh movement stays quiet until sprint is requested.
  Window blur and a hidden document pause through the run store even when
  no pointer lock is held. Focus returning never resumes automatically.
  The pause menu sits above an open tome; the tome disables its controls
  and reads `runClock` for memorization, answering and result delivery.
  Escape or controller Start can resume that paused puzzle without also
  closing it. The focus-pause browser check covers the free-cursor path,
  preserved puzzle state, paused deadlines and reachable Resume controls.
- What a room is *made of* is `src/game/rooms/biomes.ts`, and it is a
  different question from what the room is *for*. Kind decides content and
  rules; biome decides stone, damp and light. They used to be one fact -
  `KIND_TINT` gave each kind one floor colour, one wall colour and one
  surface - so every chamber in the game was the same grey box and the only
  thing separating two of them was where the furniture fell, over the
  twenty-one to twenty-four rooms a finished run walks through. Each kind
  now lists at least two biomes it may be built in and the room's own seed
  picks one, so a trap room can be a dry catacomb or a flooded cistern and
  still be the same trap room. `yarn test:layout` holds it the way it holds
  the sizes: no kind always made of the same thing, no biome declared that
  a player cannot stand in, every biome painted with a surface the registry
  actually has, and the same room the same place when you walk back in.
- A biome furnishes as well as tints: each one names two props as its
  `litter`, scattered by `placementsFor` on anchors the kind's own
  arrangement did not want. They go through exactly the same `allowed`
  filter as everything else in the room - out of the door lanes, clear of
  the gem, the spikes, the watcher, the key and the kind's content - so a
  biome can never make a room unwalkable or bury its point, and an authored
  template is left alone because somebody placed those by hand. It lands in
  90% of rooms; the tenth that misses is the small crowded ones, where a
  shop's counter leaves nowhere to put a crate.
- How big a room is comes from `SIZE_RANGE` in
  `src/game/dungeon/generate.ts`, rolled per room from the ladder in
  `ROOM_SIZES`, and how it is shaped from `SHAPES_FOR` filtered by
  `shapeFits`. Size used to be one constant per kind, which meant every
  room of a kind was the same room: over 13,996 generated rooms there were
  three distinct sizes in the whole game and 65.7% of them were the same
  sixteen-metre box. It is nine sizes now and no kind is pinned to one.
  The two facts are not independent - a shape has to have the floor to hold
  its own outer ring of props, so a diamond needs twenty metres and a
  triangle twenty-eight - which is why the game declared six shapes and
  built four: nothing was ever big enough for the other two. `yarn
  test:layout` sweeps every size on the ladder and holds the output rather
  than the table: no kind always the same size, no single size most of the
  dungeon, and no shape declared that a player cannot walk into.
- How long a run took is `runSeconds` in `src/game/state/run.ts`, and it is
  on `runClock` like everything else the game times. It was neither: the
  sum `endedAt - startedAt` was written out twice, in the records and on the
  summary, and both copies read the wall clock, so the pause menu counted
  towards the run. A run of about seven seconds with a five-second pause in
  it was recorded and shown as 0:07, and `fastestEscape` is a saved
  personal best sitting on that number. `startedAt` and `endedAt` are read
  off the run clock now, in seconds, so the subtraction is already right
  wherever it is done - and there is one place it is done.
- A card the player cannot benefit from is refused before it is spent, and
  the refusal says why. Two scrolls need a Warden on the floor and only one
  of them checked: Echoes told you nothing was listening yet, while
  Banishment - the stronger of the two - was consumed in silence on a floor
  whose Warden had not woken and whose alarm was still its own baseline,
  throwing nothing and calming nothing. The guard has to be exactly as wide
  as the no-op: a roused floor is a real reason to read Banishment early
  even with nothing walking it, so both sides are asserted in
  `yarn test:smoke`.
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
  player unpaused into whichever one had arrived. The memory trial's display
  was the other half of the same thing: its glows and its phase changes were
  `setTimeout`s, so opening the pause menu during "Watch." played the whole
  pattern out behind a screen seven-tenths opaque and the player came back
  to a question nobody had seen asked. Its deadlines go on `runClock` now,
  drained soonest-first by a frame so that a frame long enough to cover two
  of them still runs them in order.
  Candle flicker, pickup and hoard rotation, ward glow, puzzle crystals and
  creature phase animations also read that same clock, so their poses and
  moving highlights freeze through pause without jumping on resume. The
  visual-clock browser check verifies paused and resumed practical lights,
  gems, keys and memory crystals in generated rooms.
- How far into a room's trial the player is belongs to the run, not to the
  component drawing the room. `Scene` mounts only the room the player is
  standing in, so anything a room remembers in `useState` is forgotten at
  its own doorway - and the memory trial's whole price, a life at two
  mistakes and the book burned at two attempts, was two `useState` counters.
  One step out and one step back handed you a fresh allowance every time,
  so the room cost nothing at all. They live in the store's `trials`, keyed
  by room, and are cleared on a new floor because room ids repeat between
  floors. A room may still restart its own *display* by walking out; what it
  cannot do is unspend what the player has spent.
- There are two lines of guidance on screen and they have two owners:
  `hint` is the standing instruction of the room the player is in, and
  `notice` is a passing line the game says and then takes back. They were
  one line, and the passing one cleared itself by writing null over it - so
  a floor's opening blurb, six and a half seconds after it was shown, erased
  the standing instruction of whatever room the player had walked into in
  the meantime, and nothing anywhere would write it again. A notice's
  lifetime is `NOTICE_HOLD_S` on `runClock`, held in `src/ui/Hint.tsx`
  rather than by each thing that says one, so a line read in the pause menu
  is still there afterwards.
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
    delvers/catalog.ts   the five ways to start, each a trade not an upgrade
    items/
      catalog.ts         twelve consumables in three families, and the
                         appearance shuffle that hides which is which
      charge.ts          blessed / plain / cursed, per kind, per run
    deeds/
      catalog.ts         ten achievements, with the Steam names they map to
      watch.ts           the only thing in the game that earns one
    state/run.ts         the run: phase, lives, gems, current room, visited
    din/                 the shared vocabulary the floor is written in
      tags.ts            ~20 tags: emitted / borne / surfaces / states
      emissions.ts       what each thing declares itself to be, and how loud
      susceptibility.ts  what each creature answers to - and what it does not
      carry.ts           the room-portal flood: doorway 0.35, wall 0.00
      din.ts             what is currently being broadcast, and who it reaches
      DinDriver.tsx      the one place an event becomes something audible
    heat/                the Coefficient: one number replacing the floor timer
      coefficient.ts     heat = (dwell + alarm x 0.5) x 1.15 ^ floorsDescended,
                         five named bands, four purchases at four thresholds
      HeatDriver.tsx     spends it in lumps, and wakes the last band
    heat/                how bad a floor is allowed to get
      pledge.ts          the one pressure the player asks for, and its price
    cycle/               the Cycle: pacing that oscillates instead of ramping
      director.ts        build up / sustain peak / peak fade / relax
      menace.ts          the gauge that walks the Warden off unearned
      state.ts           the director, the gauge, which tempo the floor runs,
                         and whether it may send anything new
      CycleDriver.tsx    steps it, and stokes it from what happens to you
    ladder/              awareness with rungs, and the asymmetry that reads
      rungs.ts           four named rungs, ordered cones, the analog inputs
      awareness.ts       the machine: up is a gated jump, down is a slide
      caps.ts            one archetype, many creatures, by cap alone
      sight.ts           the three separable inputs, honouring susceptibility
      state.ts           where every creature is; informants report, one steps
      LadderDriver.tsx   steps it once a frame, and says every rung out loud
    input/
      keyboard.ts        edge presses, asked by action rather than by key;
                         an on-screen button is a key named for its action
      bindings.ts        which key does what, and what a player may change
      device.ts          desktop, phone or tablet, and whether the on-screen
                         controls are drawn
      touch.ts           the on-screen stick and the look drag, per frame
      gamepad.ts, mouseLook.ts, look.ts
    player/
      Player.tsx         the capsule the camera rides on
      where.ts           where it is standing, for the things outside the
                         frame loop that need it (setting a device down)
      Lantern.tsx        the light they carry, and the oil it burns
    interact/            InteractTrigger (E on anything), DoorTrigger,
                         Barring (B at the nearest doorway)
    rooms/
      Room.tsx           the shell: floor, walls with doorways, ceiling, light
      Walls.tsx          four walls, a doorway cut per link
      Dressing.tsx       seeded props per kind, door lanes kept clear
      kinds.ts           kind -> tint, title, content component
      content.tsx        what each kind puts in the shell
      templates.ts       authored layouts, by id; the one place slots resolve
      slots.ts           substitution rules: subst, shuffle, nsubst
    props/
      catalog.tsx        the twenty props, with footprint and solidity
      Hazard.tsx         a patch of spikes: costs the player a life, and
                         wounds the Warden that walks into it
      Placed.tsx         the devices the player has set down in this room
    thief/
      Cutpurse.tsx       the body: comes in, takes one gem, runs out
      CutpurseDriver.tsx when it tries; a timer and a set of conditions
      nest.ts            which room it nests in, derived from the floor
      Hoard.tsx          the heap of what it took, and taking it back
    warden/
      Warden.tsx         the body, in the room the player is standing in
      WardenDriver.tsx   its walk through the rooms nobody is standing in
      roam.ts            which room next: hunt, wander, wake, be thrown back
      steer.ts           walking round what has already bitten it
      bars.ts            barred doorways as edges, and the floor without them
      tuning.ts          alarm -> speed, step, hunts; and what the HUD calls it
    puzzles/             memory trial, number tome, plate trap, Carryable
    textures/registry.ts surfaces by id: procedural defaults, overridable
    systems/             audio (synthesised), bus-driven
    Scene.tsx            the canvas, physics, ground, player, current room
  ui/                    DOM overlays: HUD, minimap, prompt, hint, menus,
                         summary, puzzle overlay, and TouchControls - the
                         stick, the look drag and the buttons for two thumbs
  editor/                dev only: rooms, props, surfaces, mosaic
```

## How a run works

1. `startRun(seed)` generates a dungeon: a random walk on a grid, every room
   linked to the one it was dug from, extra doorways between neighbours for
   loops, the exit hung off the room farthest from the start. Each of shop,
   library, memory chamber, challenge room, arena and shrine appears at most
   once.
2. One room is mounted at a time, at the world origin. `Room` reports
   `roomReady` once its colliders exist; until then `transitioning` holds
   the player still over an invisible ground plane that always exists.
3. Standing near anything interactive raises a prompt; E acts on the nearest
   one. Doors travel: the run sets the new room, teleports the player just
   inside the wall they came through, and waits for `roomReady` again.
4. Gems are picked up by proximity. Traps damage on entry with a cooldown in
   the store, and they do it to the Warden too: a patch of spikes wounds
   whatever walks into it, so a trap room is somewhere the player can
   choose to fight from. Two wounds rout it and teach it - a routed Warden
   steers round anything that has bitten it for the rest of the floor
   (`warden/steer.ts`), which keeps the trick finite. The shop sells a life
   for a gem. Puzzles pay a gem when solved.
   The satchel's third family, devices, is set down on the floor rather
   than used on the player, and stays in the room after they leave it: a
   Wire Snare (wounds the next thing across it, and is not in the list a
   routed Warden avoids, which is why it still works), a Ward Stone (the
   Warden will not enter this room while it holds) and a Knot of Loose Iron
   (it rouses the floor and makes a loud metal signal where it lands, then
   can be recovered through the normal interaction prompt). `recoverIron`
   guards control, room and reach and uses `takeItem` for satchel capacity.
   The positioned `devicePlaced` event feeds Din's `ironDropped` emission;
   its doorway attenuation and receiver thresholds use the existing sound
   owners. Its `lingerSeconds` in the emission table lets the metal ring long
   enough for a nearby listener to react; Din and the editor age preview share
   that delay before normal decay. The iron-knot browser check drops and
   recovers it with real keys and checks the signal's origin and a neighbouring
   Warden's remembered investigation target.
   The dropped key also publishes its stored landing coordinates through
   `keyDropped`; the same browser check verifies that its sound originates
   at the key rather than the room centre.
5. Every gem taken raises the floor's `alarm`. The alarm decides how often
   the Warden steps from room to room, whether it wanders or walks towards
   the player, and how fast it crosses a room. Sprinting gives the player's
   room away for as long as it lasts and a few seconds after - the same
   "walks towards you", bought for nothing permanent, which is what makes
   the dash a decision rather than a free upgrade. A Scroll of Echoes sets a
   lure room instead: the Warden walks there rather than towards the player
   and stops listening for footsteps until it arrives or the sound goes
   cold, which is the one thing in the run that buys the right to sprint.
   How long that giveaway lasts follows the actual surface: `noiseHoldFor`
   scales `NOISE_HOLD_S` by its material's `carry`, so the same dash is two
   seconds across deep moss and seven through standing water, and the HUD
   names the ground so the choice can be made before the dash rather than
   learned by being caught.
   The shrine is the other, and the slower one: kneel at the font for a gem
   and the alarm goes back to the floor's own baseline and the lure with it,
   once per floor. It is the only thing in the game a spare gem buys that is
   not the exit, and it is worthless on a quiet floor, so the question it
   asks is when. It cannot be fought and is
   slower than a walk at every level: it wins by being between the player
   and the door. Touching the player costs a life and throws it three
   doorways away.
6. From floor two, the Cutpurse comes for a player who has stopped moving
   with gems or the iron key on them. It takes a gem, or the key when no gems
   remain, and runs for the doorway it came in by:
   touch it and the loot comes back, let it out and the loot is in its nest,
   which is then on the map. Nothing is destroyed - a theft is a detour,
   and `thief/nest.ts` guarantees the detour is walkable (never the vault,
   never a room only reachable through it).
7. The exit door charges `tollForFloor(floor)`, which rises on every floor.
   Its affordable prompt still quotes `tollNow`, names the next floor and
   says there is no return; the last stair offers escape. Unrecovered gems
   in the Cutpurse's hands or nest are shown as loot left behind, using those
   existing balances. The core browser flow checks the quote and real payment,
   recovery clearing the warning, and abandoned loot resetting on descent.
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

  Draft storage treats IDs as dictionary keys without inherited properties.
  Persisted entries must match their template ID; only boolean `true` enables
  a draft, and invalid timestamps fall back to zero. The systems gate imports
  reserved-looking IDs, reloads them, and checks registration and removal.
  Optional names, stories, tableau IDs and prop slot names must be strings;
  slot operations must be actual operation strings, without coercion. Mixed
  imports report malformed entries while retaining valid room templates.
  Failed writes retain session edits and expose a store-owned save status to
  the Room Builder. Its warning stays until a successful save; authors can
  retry or export all current templates as an importable JSON array. The same
  check forces quota failure, rescues the unsaved room by export, and verifies
  retry persistence across reload.

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

  A slotted template is held to *every kind every slot can produce*, not
  only the kind the author placed - a template validated only as authored
  is a template validated in a shape the player may never be shown. It does
  that per-prop and per-pair rather than by enumerating variants, so the
  check stays cheap while the content multiplies.
  When slot rules are chained, shuffle validation carries forward the kinds
  produced by preceding rules. A layout invariant compares those possible
  kinds with the resolver across seeds and district supply traditions.
  Counted substitutions share their clamped count between resolution and
  validation, so zero/all replacements do not warn about impossible props.
- **Surfaces**: the painter and the mosaic tool save a 128x128 image under a
  surface id. `useSurface(id)` in any room picks it up at once.
  The painter owns a unique request token for each image decode. A callback
  from a previous selection or an unmounted painter cannot draw into its tile.
  Painting, undo and save wait for the selected image; failed decodes preserve
  the stored override until the author explicitly resets it. The systems gate
  tests out-of-order loads, corrupt images, save guards and unmount cleanup.
  Custom surface IDs only select a built-in painter when the registry owns
  that key. Inherited names such as `__proto__` use the procedural fallback;
  the Painter check creates and saves these IDs without crashes or blank tiles.
  Its active custom ID stays in the surface selector before its first save and
  after reset, so the visible selection always agrees with the save destination.
  The registry owns failed-save status shared by Painter and Mosaic. Failed
  writes retain session overrides, with PNG recovery downloads and a retry
  that saves all overrides without invalidating textures. The systems gate
  forces quota errors and verifies downloads, cross-tool warnings and reload.
  Mosaic cells and their saved texture use the same normalized shape paths,
  rendered as SVG in the grid and Path2D in the output canvas. Its browser check
  compares all five preview shapes with saved pixels and opens the result in
  the painter, so preview-only geometry cannot drift from the authored surface.
- **Props**: the inspector shows one catalogue entry at a time; the
  catalogue is the only list of props, and the room builder places from it.

Nothing the editor produces can fail to reach a run, because there is no
second model for it to be written in.

The score lives in `systems/audio.ts` beside the cues and the bed, driven
from `Audio.tsx` off the run's `phase`, `paused` and alarm. It is
scheduled on the audio clock from a timer that only has to stay ahead of
it, never from the frame loop, and it is mixed under every cue: the audio
suite measures the room tone the cues are heard over with the score
running, and the score is the one thing in the mix allowed to be turned
down until they clear it.

## Verification

The runner replaces progress reports atomically. Brief Windows file locks
receive bounded retries; persistent locks fail without truncating the previous
report. `test:verification` injects both cases into the real runner.

A note that cost a day to learn. **Nothing in a test may `import()` a
module the app has already loaded.** On a dev server the app's copy of a
source file can be served under a URL the bare path does not match, and
the import then executes a second copy of the module. For most modules
that is only waste; for `state/run.ts`, which publishes `window.__run`, it
was a second store that nothing rendered from - the screen froze on its
last commit and forty checks failed for reasons that were not their own,
with no exception raised. The store now publishes its dev handles only if
nothing holds them, anything a test needs is exposed on `__derived`, and
the smoke suite asks twice per run whether the screen is still drawn from
the store it is writing to.

- `yarn typecheck` must be clean. There is no error budget.
- `yarn lint` must be clean.
- The three puzzles are played by `yarn test:smoke`, not merely mounted: the
  tome is opened, read and typed back, and typed wrong until it closes for
  good; the memory trial is begun and repeated; the challenge room's trap is
  sprung. Each exposes what a probe cannot see - the number sequence and the
  pattern - behind `import.meta.env.DEV`.
  The focused `tome-browser-check.mjs` also guards the answer timer during
  memorization, held-digit repeat, correction and keypad completion. Its
  responsive panel and six slots fit portrait and landscape screens at the
  player's maximum text size; each digit submits immediately, without a
  separate confirmation step.
- Playing a puzzle correctly says nothing about what it costs to play it
  badly, and the cost is the room. The memory trial was played once, right,
  and its gem taken, for thirty-odd cycles; the first probe to press a wrong
  crystal found that the price could be avoided for good by stepping through
  a doorway. It is now played wrong too: a mistake, a door out and back, and
  the mistake after it, which is the one that takes the life. The challenge
  room was the mirror - its trap springing was checked and its winning half
  was not - and what had blocked that for six cycles was having nowhere to
  look: `carry` is module data, so nothing outside the component could say
  whether a candle had landed on the plate, and every attempt inferred it
  from the outcome under test. Exposed as a probe, the approach is
  arithmetic: a drop lands 1.4 metres ahead and snaps to the plate from 1.5,
  so standing 2.6 out is inside the snap and outside the altar's body.
  The optional key sacrifice reads that same live weight result: once a
  candle holds the plate, its coincident key trigger withdraws so the next
  press takes the idol. Solved and sprung plates also withdraw the offer;
  the store refuses key spending on either finished outcome. The focused
  plate-choice check plays both solutions with a key in hand and confirms
  that a candle preserves it while the key solution spends it once.
  Carryable positions remain frame data, while the carried object ID has a
  shared subscription. Every carry prompt observes pickup, put-down and
  room-unmount cleanup, so leaving with an idol cannot leave the next room's
  objects claiming the player's hands are full. The same check returns to a
  solved room and starts another puzzle while the previous idol is carried.
- The fill that walks a room reaches the anchors a kind's own content stands
  on as well as the gem - the plate, the lectern, the four pedestals, the
  shop counter. The dressing keeps its props off them, which is not the same
  as leaving a way to them: a table and a bookshelf either side of a pedestal
  are both clear of it and both in the way. 0 of 1440.
- `yarn test:desktop` packages the current host's build, reads what is in it,
  then plays it on an isolated display. Windows rejects an interactive window
  station; Linux starts a private Xvfb display. Each check uses a fresh profile
  under ignored verification output and verifies that records start empty.
  Electron is Chromium, so
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
- A number that moves for a reason other than the one being watched cannot
  be watched by sampling it once. `renderer.info.memory.geometries` is not
  the program-wide constant the perf check took it for: the props share
  their shapes for the life of the program, but a room's floor and walls are
  sized to the room and go with it, so the count is a property of which room
  is mounted - 55 58 51 55 54 51 51 58 59 over a lap, and exactly that every
  lap after. The leak guard sampled it once at the end of a lap, compared
  with once at the end of a later lap, and allowed two of drift against a
  swing of eight; it failed at random for two cycles and could not have seen
  a room leaking one a visit either. It compares each room with itself now,
  which is stable to the unit and names the room that grew.
- A check whose subject is sampled coarsely cannot assert an outcome. The
  arena's arms test the camera's point once a frame; at six frames a second
  the player crosses two thirds of a metre between samples, and a walk that
  passed within 0.35 of a spike - well inside the 1.2 one reaches - recorded
  no hit. The walk of the arena's circle asserted "no hits" on top of that
  and gave 0, 1 and 2 on the same code. What it asserts now is what survives
  a coarse sampler: that the walk held its line, that nothing hit the player
  which was not within a spike's reach plus a frame's slip, and - the room's
  actual promise - that walking the line takes fewer hits than standing still
  in it. Comparing two samples under the same conditions is the only form of
  an outcome a sampler cannot corrupt.
- A probe that drives the game is a player, and it has the player's controls
  and no others. Holding W is one speed, so the only way it can change how
  fast it goes round a circle is to change the radius it goes round at - and
  the arena walk's steering could only *point*, at fixed distances on a fixed
  circle. It bled its surplus speed by wandering a metre and a half off a
  three metre line, which is what walked it onto the spikes. A circle it can
  hold is `measured speed / ARENA_SPIN`, measured rather than read from
  `WALK_SPEED`, because damping at six frames a second costs a fifth of it.
- Everything read back from `localStorage` states the shape it accepts, and
  falls back rather than throwing. Four keys ship, and the boot is the one
  moment where a bad byte costs the whole session: there is no game yet to
  fall back into, so a demo that ships updates has to survive its own older
  saves. Records and settings check every field against a default; the
  surface override store took whatever it parsed and got away with it only
  because a bad `img.src` never fires `onload`, which is safety by accident.
  `yarn test:prod` starts the built bundle with garbage, with JSON of the
  wrong shape, and with an older build's fields, and asks whether it reaches
  the menu and draws a room.
- A guard on one side of a number is half a guard. The economy has always
  checked that a floor holds enough free gems to pay its exit - a real
  fairness promise, since a player who cannot answer the tome is never locked
  out - and nothing checked the other side, while the comment beside it
  claimed the toll "eats most of a floor's free gems". It eats 43% to 75% of
  them. The economy could have drifted until a floor held ten times its toll
  with every check green. Both sides are bounded now.
- A measurement that guards nothing is the mirror of a guard that measures
  nothing. `yarn test:run` is the only check that plays a run end to end and
  it printed the whole shape of one - rooms entered, doors taken, gems picked
  up, lives it had to be given, and what took them - while asserting none of
  it. What can be tied to the game's own numbers is asserted now, and read
  out of the running game rather than copied into the check.
- Anything the frame loop reads is established by the frame loop. An effect
  runs after commit and `useFrame` runs on the next animation frame, and the
  order is not fixed: the Warden's arrival time was set in an effect keyed on
  the room, and on a run where the frame won the ref was still null - so the
  grace that stops it striking on the frame it walks in did nothing, and it
  struck 0.11s after arriving. Where a default has to stand for "not known
  yet", it is the safe reading and not the convenient one.
- A rule that guards how a thing moves does not guard where it is put. The
  Warden's step cap gives the player frames between seeing it close and being
  touched, and cycle 44 wrote that down as "it can never appear on top of
  you" - true of the walk and false of the arrival, because it enters at the
  doorway it came through and a player standing in that doorway had it appear
  at a gap of 0.00 and take a life 0.07s later. Placement is the route a cap
  on movement cannot reach. `WARDEN_ARRIVAL_GRACE_S` is the guard for it, on
  `runClock` like every other deadline in the game.
- Nothing the player has to act on is said in colour alone. The HUD's
  colours are decoration over counts and words - lives are hearts, gems are
  numbers, being short of the toll says "short" - and the memory trial's red
  flare is redundant with a hint that counts the mistakes left. The challenge
  room's plate was the exception and the only one: green for held and red for
  bare, with the room's standing line describing the trap in general and
  never the plate in front of you. Red against green is the commonest
  colour-blind failure there is. The room says which it is now, on the same
  frame that repaints it.
- A guard is not a measurement. Every check on the Warden bounded it from
  above - a step shorter than its reach, a cap that does not bind at twenty
  frames a second, a slow frame that cannot carry it across that reach, and
  `pace.ts` proving on paper that every sprint outruns it - and a Warden
  frozen at nought would have passed all of them, because "the Warden walks
  into the room and is dangerous" reads `wardenMet`, which entering a room
  sets. `yarn test:smoke` measures its pace against what it is allowed now:
  its own speed, or the cap over a frame, whichever is less. Crippled to a
  tenth on purpose it reads 0.42 against 1.02 and the check fires.
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
  Its rendered-world guard decodes screenshot pixels before measuring light
  and shade variation, and must reject encoded solid black and white frames.
  Compressed image bytes are not evidence that the scene drew anything.
- `yarn test:perf` reads three's own counters - draw calls, triangles, live
  geometries and textures - for every room of every floor, and the heap
  while the player sprints. Frame time is not measured, because the machine
  this runs on has no GPU and a millisecond here says nothing about a Steam
  Deck; those counters are CPU-side and mean the same thing everywhere. Its
  room report attributes meshes to the closest named scene owner and requires
  every visible mesh to have one. New render components should name their
  root group so a draw-call regression points to its source.
- Whether a purchase may be made is `canSpend` in `src/game/state/run.ts`,
  derived from the same `shopPayment` quote used by every shop offer. The exit is the only
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
- `yarn test:touch` plays the game with two thumbs, on an emulated phone,
  the same phone held upright, a tablet, and a desktop that is never
  touched. It sends real touch events through the debugger rather than
  synthetic pointer events, so it drives the game's own reading of a touch:
  the capture, the stick's throw, the rim that starts the run, two fingers
  down at once. What it cannot say is how a thumb feels about the sizes,
  or what iOS Safari does with the full-screen request.
  The full verification gate runs both input playthroughs with its fresh
  development server, using the installed Playwright browser on Windows.
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
