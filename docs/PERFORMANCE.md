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

Current measured baseline across the fixed 78-room corpus: 78 draw calls,
6,980 visible triangles, 93 live geometries and 10 live textures in the worst
room. Repeated room laps showed no geometry growth, and the 158-frame sprint
sample retained no heap after collection. Draw calls remain below the watch band
with 18 calls of hard-budget headroom. New ecology should keep using fixed
instanced batches, as the shardback and kiln-newt colonies do with two
submissions per room.

Frame rate is recorded only as a liveness observation. The automated browser
often uses a software rasterizer, so its frames per second do not predict a
player's GPU. Draw calls, triangles, resource counts and retained heap remain
comparable across that environment.

## Open watch items

| Area | State | Action |
|---|---|---|
| Dense trap rooms | Measure | Use the ranked report to identify the owning scene groups before adding another high-detail hazard. |
| Draw calls | Monitored | Hidden histories and district paths batch repeated marks by material. Keep room-scale decoration to a fixed number of submissions. |
| Structural faces | Monitored | Shaped-room architecture is the largest triangle owner. Simplify hidden or repeated construction faces before raising the budget again. |
| Terrain shaders | Stable | Ten biome variants share existing bed submissions and textures. Keep future material effects quantized and free of extra lights or passes. |
| Biome crowns | Stable | Ten roof motifs add 120 worst-case triangles inside the three existing architecture submissions; preserve that batching. |
| Ambient colonies | Stable | Kiln newts add two instanced submissions for a whole colony, no individual lights or timers, and keep the measured peak at 78 calls. |
| Authored irregular rooms | Stable | Four new diamond, circle, cross and hexagon compositions peak at 87 calls in direct review; the fixed 78-room corpus remains at 78 calls. |
| Connected strata | Stable | Only real intra-district material transitions add geometry: five shallow chips share one instanced draw call, with sampled transition rooms at 25–28 calls. |

Update this ledger when a measured issue is fixed, accepted with a new budget,
or replaced by a more precise check. Never increase a budget solely to make a
red run green.
