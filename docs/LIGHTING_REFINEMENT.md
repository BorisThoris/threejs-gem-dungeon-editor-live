# Lighting and visual refinement

The aim is a coherent refinement of the whole rendered dungeon: legible block
forms, practical warm lamps, distinct materials, dark spaces worth carrying a
lantern into, and clear threats and useful objects. Screen effects are optional
tools; they must improve those qualities and leave text and controls readable.

## Starting evidence

The isolated baseline lighting check passed on 2026-09-29. Its thirteen biome
views and lantern comparison are retained locally under
`output/verification/lighting-baseline/`. The old field supplies the same local
irradiance to every surface normal. Vases read as flat discs, and masonry and
furniture lose their orientation under a carried lamp. Raising every exposure
would preserve that problem while washing out the practical sources.

## Direction and materials

The shared field now also accumulates a light centroid and angular coherence.
Materials use world-space normals and actual surface height to distinguish
faces turned toward the flame, with retained bounce for the opposing face.
Opposing lamps blend toward fill rather than selecting one arbitrary source.
The existing occluded transport, lantern bands and stealth irradiance remain
the owners of reach and gameplay visibility. The change adds one bounded
nearest-filtered texture and no scene draw calls or shadow renders.

The material response also uses Three's existing GGX function and each
material's authored roughness and metalness. The virtual-source highlight is
kept broad and bounded; rough stone stays matte while metal and wet surfaces
can catch the practical lamps. This adds no lights, render targets or passes.

The isolated `lighting-material-report.json` records five passing checks:
typecheck, lint, the transport invariants, rendered lighting and the 78-room
performance sweep. Opposite faces measured 190 versus 124; rotating the instance
preserved both values. Moving a lamp above and below reversed the top/underside
response. Rough and polished metal measured 137 and 200, retaining highlight
headroom. The sweep peaked at 79 calls, 8,254 triangles, 92 geometries and 12
textures, with no growth across settled revisits or retained sprint heap.
The thirteen biome captures and desktop/portrait checks remain readable. These
are core-lighting results; the wider visual review is recorded below.

## Review scope

- Calibrate ambient fill, local contrast, fog and the descent through all three
  floors. Empty-lantern navigation must remain possible; carrying a flame must
  reveal useful surfaces without clipping pale objects.
- Review contact grounding and material response across stone, wood, iron,
  water, mineral deposits and creatures at actual player eye height.
- Evaluate whether restrained presentation effects improve the result. Retain
  the handmade world-space texture language and avoid obscuring threats, clues,
  interaction prompts, or accessibility settings.
- Review representative room kinds and irregular footprints, raised and lowered
  lanterns, warning and combat states, and desktop and portrait layouts.
- Verify source invariants, lighting and material checks, creature readability,
  performance and resource lifetime, gameplay visibility and shipped builds.

All browser and desktop work must use the noninteractive Windows isolation
launcher. Existing tests and generated visual galleries supply the evidence;
this document does not claim that a narrow lighting check proves the entire
visual refinement complete.

## Atmosphere and contact pass

Background fill now retains the three floors' depth curve instead of clamping
the lower floors to one brightness. Ceiling bounce and a restrained air tint
read the room's actual biome, while practical sources retain their colours.
Fog reach includes the true room span so a long gallery keeps its terminal
silhouette. Empty-lantern capture checks cover all three depths; the deepest
navigation fill was lifted slightly after visual review of the first pass.

Contact shadows now use physical prop dimensions, turn and scale. Thin shelving
gets a thin footprint, hanging banners stop painting contact onto the floor,
and raised gallery gems get contact on their actual landing. Only a footprint
crossing a ramp needs subdivision; all ordinary contacts remain two triangles.
The gem and its contact now disappear together through the existing collection
record. Source checks cover silhouette, rotation, scale and upward winding;
the browser check mounts and collects a real generated raised-gallery gem.

`lighting-contact-report.json` records all five focused checks passing, including
the thirteen biomes, depth comparison, material response, resource lifetime,
desktop and portrait view, and contact geometry and collection.

## Wider review evidence

`lighting-wide-review-report.json` records the 78-room performance sweep,
nineteen creature states and all eighteen room-kind/footprint scenarios passing.
Peak room cost after the contact changes was 78 calls, 8,226 triangles, 92
geometries and 12 textures. Every scenario retained a visibly stronger raised
lantern; the unlit elbow and bright ring views were also inspected directly.

The creature contact sheet exposed an error in the review tools: independent
renderers used their default tone mapping instead of the game's ACES pipeline.
All diagnostic scene renderers now share `scripts/review-renderer.mjs`, which
copies tone mapping, exposure and colour space from the live renderer. The
creature manifest records those values. `lighting-review-colors-report.json`
records the regenerated nineteen-state gallery and lighting comparisons passing
with ACES, exposure 1 and sRGB, plus lint. These replace the earlier creature
captures as colour evidence; the scenario gallery already captured the live
game canvas.

## Pause consistency and release checks

Candle flicker, gem/key/hoard rotation, ward glow, memory crystals and creature
phase animations now share the paused run clock. The generated-room regression
failed before this correction, then passed for candles, gems, keys and crystals:
poses and practical lights stay still while paused and animate again on resume.

`lighting-release-report.json` records seven passing checks: typecheck, lint,
light transport, contact geometry, the complete core escape flow, rendered
lighting and the pause regression. The final close-up review retains the
existing texture sampling and ACES presentation: masonry courses, wood grain,
cloth silhouettes and pale mineral surfaces remain distinct. No additional
fullscreen filter is needed for this release.

The current production web and packaged Windows checks also pass: the world
renders, movement and pause work, old save shapes still boot, and development
probes and authoring tools are absent from the shipped game. The first visit
downloads 1.18 MB compressed. Native and browser checks ran sequentially under
the private Windows window station with isolated profiles.

`lighting-shipped-report.json` records all ten release checks passing, including
those web/Windows builds and Warden readability, architecture, terrain,
waterworks, hidden-room history, authored rooms, strata and channel frames.

## Combat presentation and narrow screens

The final audit found danger and damage overlays painting above the HUD and
touch controls. A before-fix browser check reproduced the stacking error for
lives, Pause and Lamp, and the strongest combined-effect screenshot showed
those controls visibly dimmed. Both effects now tint the world beneath the
controls. The proximity pulse freezes on pause; the system's reduced-motion
preference makes it steady while retaining the warning.

Portrait review also found captions squeezed into a single-letter column by
thumb controls below them, and Pause overlapping the HUD. Portrait now uses
the available horizontal band above those controls and puts Pause beneath the
minimap. Short landscape retains its separate side lane. The two checks in
`visual-layout-final-report.json` pass for the combined effects, desktop,
landscape phone, portrait and tablet, normal and enlarged text, and both thumb
layouts. Readout focus/scrolling was independently verified in
`visual-presentation-report.json`; its first layout failure was corrected and
superseded by the final layout run.

The exposure audit of all eighteen captured room pairs is saved locally in
`lighting-exposure-audit.json`. No pixel in those JPEG scene captures had all
three channels at or above 250. The deepest unlit elbow is intentionally much
darker: its door frames, floor route and pickups remain visible, and the raised
lantern reveals near-field surfaces while the distant roof stays dark. This
was inspected in the saved scene pair; an image-wide brightness average alone
would not establish navigability. The presentation retains ACES and the
handmade texture sampling without adding a fullscreen filter.

## Scope audit

| Requirement | Current evidence |
| --- | --- |
| Directional depth and distinct material response, with one gameplay light owner | Transport and rendered face/roughness checks in `lighting-release-report.json`; the shader reads the same field used by perception. |
| Depth-dependent ambient fill, biome colour, fog reach and usable darkness | Three-depth and thirteen-biome captures; eighteen actual scene pairs; exposure audit and inspection of the darkest elbow and bright ring. |
| Grounded props and raised pickups | Physical-footprint invariants and live raised-gem collection in `lighting-contact-report.json`. |
| Paused visual state | The before/after visual-clock regression covers practical lights, gems, keys and memory crystals; the final effects check covers the proximity pulse. |
| Threats, clues and controls remain readable | Nineteen creature states, Warden approach/shove/recovery, authored room and waterworks checks; final combined-effect captures and browser paint-order checks; caption layout and scrolling checks. |
| Preserve the handmade style and resource budget | Shared ACES capture pipeline, bounded broad highlights, unchanged texture sampling, no added fullscreen filter; 78-room performance sweep with settled revisit and heap checks. |
| Ship working web and Windows builds | `visual-final-builds-report.json`: both current builds pass rendering, play, pause and packaging checks; web also boots older save formats. |

These are focused visual and release results, not a claim that every repository
gate is green. GitHub verification of `cfb4bc3` separately reported a descent
gem-balance assertion (two versus one) and stale promotional trailer metadata;
the local core-flow check passed. Those broader CI findings remain open.
