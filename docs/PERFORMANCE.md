# Performance budget and issue ledger

World detail is allowed to grow when its rendering cost stays legible. Run
`npm run test:perf` against a development server after adding room geometry,
creatures, effects, lights or shaders. The audit visits every generated room
for two fixed seeds, looks in all four directions, walks repeated laps to find
geometry leaks, and measures retained heap while sprinting.

The audit writes two local review artifacts:

- `output/world-review/performance-summary.json` for tools and comparisons.
- `output/world-review/performance-report.md` for a ranked human review.

The report marks a metric **regressed** above the recorded baseline, **watch**
at 85% of budget and **breached** above the budget. Its hottest-room list ranks
rooms by their worst ratio, so a change can be investigated before it becomes a
broad slowdown.

| Metric | Budget | Why it is tracked |
|---|---:|---|
| Draw calls | 96 | Finds decorative meshes that should be instanced or batched. |
| Visible triangles | 8,800 | Limits geometric density in the busiest view. |
| Live geometries | 112 | Finds new shapes and room-transition leaks. |
| Live textures | 16 | Finds duplicate or unbounded procedural surfaces. |
| Retained heap after sprint | 8 MB | Finds data that survives collection during the busiest frame loop. |

The recorded pre-strata baseline across the fixed 78-room corpus is 78 draw
calls, 7,208 visible triangles, 87 live geometries and 10 live textures. The
latest run peaks at 79 calls, 7,288 triangles, 91 geometries and 10 textures.
The previous sweeps reached 79 calls and 7,352 triangles, or 85 calls and
7,400 triangles, as the active Warden shifted through sampled rooms; all are
within budget. Geological and district border marks share one batch, and the
new channel banks use terrain's existing deposit instance draw with per-cell
color. Threshold approach sounds add no scene geometry or held audio voice.
Ten repeated room laps showed no geometry growth, and the 574-frame sprint
sample retained no heap after
collection. The conservative 85-call observation leaves 11 calls of
hard-budget headroom. New ecology should keep using fixed
instanced batches, as the shardback, kiln-newt and brine-crab colonies do with two
submissions per room.

Frame rate is recorded only as a liveness observation. The automated browser
often uses a software rasterizer, so its frames per second do not predict a
player's GPU. Draw calls, triangles, resource counts and retained heap remain
comparable across that environment.

## Open watch items

| Area | State | Action |
|---|---|---|
| Handbuilt furniture | Stable | Chairs, tables, crates and barrels now join fixed pieces by material. A one-of-each set falls from 17 to eight draws and 448 to 302 triangles; that fixture is a model-level comparison, not a claim about the full room. The isolated 78-room sweep peaks at 79 calls, 7,288 triangles, 91 geometries and 10 textures. Ten revisits add no geometry, a 419-frame sprint retains no heap, and 20,000 held-audio updates retain one voice with zero bytes per update. The new furnished Sealkeepers' Circuit renders at 71 calls and 5,166 triangles in direct review. |
| Dense trap rooms | Tracked | The report now attributes hot rooms to named scene owners. The 85-call trap is led by building blocks and room architecture at 1,796 triangles each; unlabelled content owns 43 smaller batches, while the active Warden adds six. Consolidating unlabelled content remains the clearest draw-call opportunity. |
| Draw calls | Watch | The fixed corpus peaks at 85 of 96 calls in a dense trap room with the Warden present. The border handover adds no separate batch; keep new room-scale decoration in shared batches. |
| Structural faces | Monitored | A dense trap room owns the 7,400-triangle peak with 1,400 triangles of hard-budget headroom. The previous 8,072 peak fell when flat strata marks became planes. Simplify hidden or repeated construction faces before raising the budget. |
| Terrain shaders | Stable | Thirteen biome variants share existing bed submissions and textures. Keep future material effects quantized and free of extra lights or passes. |
| Biome crowns | Stable | Thirteen roof motifs remain inside the three existing architecture submissions; preserve that batching. |
| Ambient colonies | Stable | Kiln newts and brine crabs each use two instanced submissions for a whole colony, with no individual lights or timers; the measured peak remains 78 calls. |
| Authored irregular rooms | Stable | Four new diamond, circle, cross and hexagon compositions peak at 87 calls in direct review; the fixed 78-room corpus remains at 78 calls. |
| Connected strata | Stable | Matching doors carry visible material veins; real transitions preview the destination with five chips and eight inward contact cuts. Their shared plane instance batch replaces six-sided boxes and returns 672 triangles of peak headroom despite the added detail. Keep the per-room mark ceiling. |
| District border handovers | Stable | Four shallow pigment cuts below each real named lintel join the same strata instance batch. Native review shows both districts from inside a border room at 26 calls and 1,830 triangles; the full corpus peaks at 85 calls and 7,400 triangles. |
| Threshold approach sounds | Stable | One room-level watcher uses short procedural cues only at real district or material boundaries. The 78-room sweep peaks at 79 calls, 7,352 triangles, 87 geometries and 10 textures; ten laps show no geometry growth, a 612-frame sprint retains no heap, and 20,000 held-audio updates retain one voice with zero bytes per update. |
| Watercourse silt banks | Stable | Existing terrain deposit instances carry district sediment colors alongside real waterway strips through shaped chambers and passage arms. The isolated 78-room sweep peaks at 79 calls, 7,248 triangles, 87 geometries and 10 textures; ten repeated laps add no geometry, the 574-frame sprint retains no heap, and 20,000 held-audio updates retain one voice with zero bytes per update. |
| Silt-bank frogs | Stable | Rootwater moss gains frogs only on real watercourse banks, and migrating frogs use rendered bank cells with clear refuge routes. Scaling the shared body changes no mesh count. The latest fixed sweep peaks at 79 calls, 7,248 triangles, 93 live geometries and 10 textures; ten revisits add none, a 613-frame sprint retains no heap, and 20,000 held-audio updates retain one voice with zero bytes per update. The geometry peak varies with sampled live scene state, so keep watching its 112 budget. |
| Channel frames | Stable | The real directed watercourse receives one overhead district frame per eligible room, clipped to irregular floors and rendered in the three existing architecture batches. The 78-room sweep peaks at 79 calls, 7,304 triangles, 93 geometries and 10 textures; ten revisits add no geometry, the 599-frame sprint retains no heap, and 20,000 held-audio updates retain one voice with zero bytes per update. |
| Live channel surface | Stable | Incoming and outgoing reaches now share one water mesh per room, with route-relative flow UVs retained at each vertex and the dry sediment bed separate. The 78-room sweep still peaks at 79 calls, 7,304 triangles, 93 geometries and 10 textures; the improvement applies to two-reach rooms while the corpus peak remains unchanged. Ten revisits add no geometry; a 614-frame sprint retains no heap, and 20,000 held-audio updates retain one voice with zero bytes per update. |
| Terminal basins | Stable | The sluice and outfall each widen into one shallow, cut-stone basin joined exactly to the narrow reach. Water, sediment, banks, footsteps, ecology and Atlas use the same footprint, with no extra surface submission. The 78-room sweep peaks at 79 calls, 7,304 triangles, 87 geometries and 10 textures; ten revisits add no geometry, a 574-frame sprint retains no heap, and 20,000 held-audio updates retain one voice with zero bytes per update. |
| Salt-pan biome | Stable | The eleventh terrain and crown variant reuses the two terrain and three architecture batches. Twelve paused-clock flakes share one extra instance draw; a furnished circular fixture uses 51 calls and the corpus peak remains 78. |
| Salt-pan ecology | Stable | Up to four brine crabs share two instance batches. The 360-floor audit finds 513 legal homes and 35 real cracked-wall retreats; the corpus peak remains 78 calls and 7,256 triangles. |
| Paired gallery transepts | Stable | Raised wings, ramps and terminal stations reuse the terrain surface and three architecture batches. District answers reuse one lamp and the three bounded reflection taps, with no looping voice or added node. The 360-floor audit finds 853 stations, 87 paired rooms and 21 secret-host transepts; the corpus peak remains 78 calls. |
| Verdigris condenser biome | Stable | The twelfth shader and crown variant reuse the two terrain and three architecture batches. Its hiss replaces the held room-air voice on entry. Across 360 floors, 164 rooms and five shapes stay inside the Old Works; the corpus peak remains 78 calls. |
| Tallow chantry biome | Stable | The thirteenth shader and crown variant reuse the terrain and three architecture batches. Across 360 floors, 75 connected Choir rooms span nine shapes; wax footsteps, wick air and bounded absorption add no audio nodes. The corpus remains at 78 calls, 7,208 triangles, 87 geometries and 10 textures. |
| Wickling colonies | Stable | Up to five wax grazers share two instanced submissions and no lights. Across 360 floors, 240 legal homes occupy rendered wax cells and 40 secret-host colonies lean toward the real cracked wall. The corpus remains at 78 calls, 7,208 triangles, 87 geometries and 10 textures. |
| Copperback colonies | Stable | Up to five grazers share two instanced batches, with no individual lights or timers. The 360-floor audit finds 673 legal homes and 80 secret-aligned colonies; the measured peak remains 78 calls, 6,878 triangles, 87 geometries and 10 textures. |
| Service-ring rooms | Stable | Four floor bars, four inner walls and four outer walls share the existing floor, wall, ceiling and map systems. The two sampled rings peak at 51 calls and 5,584 triangles; neither owns the 78-call corpus peak. |
| Elbow halls | Stable | The seeded L-shaped footprint and its retained-pier rails use existing floor, wall, ceiling, minimap and three architecture batches. Direct review costs 41 calls and 4,516 triangles; the current fixed corpus peak is 78 calls and 7,208 triangles. |
| Topology halls | Stable | Their central bay grows arms from actual doors, cracked walls and galleries, while doorway frames remain in the three architecture batches. A reviewed T-junction costs 40 calls and 4,441 triangles; the fixed corpus peak remains 78 calls and shifts to 7,208 triangles in a dense cross room. |
| Sealed thresholds | Stable | Root-bound gates, service hatches and stopped arches join the existing three architecture batches and are removed with the wall. The fixed corpus stays at 78 calls, 7,208 triangles, 87 geometries and 10 textures; ten repeated room laps show no growth and the 551-frame sprint retains no heap. |

Update this ledger when a measured issue is fixed, accepted with a new budget,
or replaced by a more precise check. Never increase a budget solely to make a
red run green.
