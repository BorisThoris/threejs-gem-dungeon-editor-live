# Development tooling and regression review

## Delivered tools

- The editor Test Hall lays out the prop catalog on a flat floor. Its ray,
  player-capsule and clear-side-lane sweeps measure the live Rapier bodies;
  selecting a result shows the measured query and contact.
- The World atlas and Signals graph inspect the same generated floor, open
  doors, sound attenuation and receiver thresholds used by the game. Their
  source/listener links open those exact rooms as playable scenarios.
- The Scenarios shelf covers every declared room kind and footprint. Its
  generated gallery pairs normal and raised-lantern views with exposure
  measurements and replay links.
- Short, full and specialist verification gates own their check inventory,
  start fresh servers, retain individual logs, and write incremental JSON
  reports. A runner regression tests selection, inventory failures, live
  progress and failed-child reporting. CI runs short and specialist gates
  and retains their reports and logs.
- Room drafts and surface overrides report persistence failures, keep the
  session's work available, provide recovery downloads, and allow retries.

## Bugs fixed in this pass

- Timed grates now publish expiry to the run store, so blocked door prompts
  update without waiting for an unrelated state change. A grate attempts one
  drop per visit, respects paused time, and rearms on re-entry.
- Interaction inspection rows are removed when their trigger unmounts or
  changes label. Cleanup cannot delete another trigger's currently owned row.
- Chained room-slot substitutions preserve earlier substitutions; zero/all
  selection counts no longer invent impossible prop variants in validation.
- Draft imports validate metadata and rule types, isolate malformed entries,
  and support IDs that coincide with inherited object property names.
- Painter loading ignores stale image results and keeps edits disabled until
  ready. Custom IDs cannot select inherited functions. Mosaic preview and
  saved output use the same shape geometry.
- The physical walker turns before moving, uses the player's actual wall
  clearance, escapes existing hazard overlap only outward, and waits for
  usable door prompts. Recovery lives are purchased with collected gems.
- The production rendering check now decodes screenshot pixels. Its former
  compressed-byte sampling could mistake PNG encoding variation for a drawn
  world. Encoded solid black and white images now explicitly fail the guard.

## Verification evidence

- Specialist gate: 29/29 checks passed in 589.7 seconds before the interaction
  cleanup check was added. The added check, core flow, typecheck and lint then
  passed together (4/4).
- Physical three-floor runs with seeds 11 and 404 escaped and restarted
  without teleports or granted lives. Seed 404 traversed 36 doors and bought
  recovery using earned gems.
- The corrected production pixel check passed against the current web build,
  including startup with corrupt, incorrectly shaped and old saved data.
  Its log is `output/prod-pixels-check.log`. Lint also passed after the edit.
- The full release gate completed in 2801.2 seconds: 36/37 checks passed.
  Its report is `output/verification/full.json`; its log is
  `output/full-after-tooling-fixes.log`. The sole failure was the ambience
  margin described below. The production check in that gate preceded the
  pixel correction; the separate run above verifies the change.
  The long smoke test passed in 987.2 seconds with no uncaught page errors.
  All 78 performance rooms, 19 creature render states, 18 playable scenarios,
  and 18 paired lighting cases passed. The physical seed-11 run escaped with
  two lives and restarted through the victory screen.
- That gate found hiss ambience at 0.0390 against an audibility threshold of
  0.0392. An isolated rerun passed, with hiss only 8% above its threshold.
  The audio check now reads the game's `AIRS` table, lets the previous air
  fade before sampling the next, and reports every air's measured headroom.
  The isolated full audio suite passed in 223.9 seconds; its log is
  `output/audio-isolated-airs.log`. Hiss gain was then raised from 0.16 to
  0.22, preserving its filter and modulation. The fresh focused gate passed
  all five checks (production, desktop, audio, types and lint) in 419.2
  seconds. Hiss had 36% headroom; every biome air passed. Its report is
  `output/verification/focused.json` and its log is
  `output/verify-final-audio-builds.log`.

The full report intentionally retains the original audio failure. Its
resolution is established by the focused rerun above; the entire full gate
was not repeated after changing the hiss level. No finding from these runs
remains unresolved. The final diff whitespace check also passed.

These are local Windows results. The CI workflow is configured but has not
been run remotely in this pass. Browser input emulation and software rendering
do not establish physical controller feel, mobile Safari behavior, or GPU
frame times. Passing the gates establishes the tested contracts, not a proof
that no undiscovered bug can exist.
