# Working on Gem Dungeon

Read `ARCHITECTURE.md` before changing a system. Its central rule is **one owner
per fact**: the renderer, editor, simulation, and tests should read the same
geometry, room graph, costs, and timings. Extend an existing owner rather than
adding a second calculation of the same value.

## Find the right check

- `yarn typecheck` and `yarn lint` catch source errors.
- `yarn test:layout` checks generation, room placement, reachability, and
  contracts over many seeds without a browser, including generated sound
  routes against an independent shortest-path oracle with barred doors.
- `yarn test:prop-overlap` compares every solid prop pairing under varied
  transforms against Rapier's own intersection query.
- `yarn verify` runs those checks plus Sentry projection and key-room rendering, bat flight geometry, a short browser flow, keyboard sprint noise, the prop test hall,
  the atlas route graph, a crowded HUD screen-space check, and the signal response graph. It starts and stops a fresh Vite server itself.
- `yarn verify:full` adds shipped web and desktop builds, the long smoke run, and focused system checks. Treat a
  failure as a finding to investigate; browser timing can vary substantially
  under software rendering.
- Both gates write per-check status and elapsed time to ignored
  `output/verification/short.json` or `full.json` for triage.
- `yarn verify --only=audio-check.mjs` reruns a named check with a fresh Vite
  server; repeat `--only=` to select several. Source-only selections skip
  Vite. Focused results go to ignored `output/verification/focused.json`,
  leaving both gate reports intact.
- `yarn test:prod` and `yarn test:desktop` exercise shipped builds separately.

The editor is at `/?editor` in development. Its Test Hall lays out every prop
on a flat floor and sweeps rays and the game-owned player capsule through live
Rapier collision lanes, including a clear side lane around each prop. The World atlas takes a
run seed and depth, derives the actual floor seed, and can highlight the
shortest open-door route. Its Play this room link stages a development-only
scenario through the real run store; a secret scenario opens the host wall with
the store's reveal action. `scenario-matrix-browser-check.mjs` mounts every room
kind and footprint through that link in the full gate. The Signals tab uses the same run-floor generator for its graph of emission tags,
doorway attenuation, and receiver thresholds from their game-owned tables.
Its source and listener links stage those exact rooms through the scenario URL owner.
The Signals browser check compares the graph's displayed strength and receiver
count with the live Din's `strike`, `hold` and `answering` responses.
The Scenarios tab and matrix check share `scenarioCoverageCases`; adding a room
kind or footprint should make the coverage assertion fail until a generated
playable case is found.
`yarn review:rooms` captures scene and gameplay views of those cases from a
running Vite server on port 5199 into ignored `output/scenario-review/`; use
the gallery for visual QA alongside invariant checks. The full gate regenerates
it and measures raised-lantern exposure for every case.
The development pause menu links a live room to Atlas and a fresh replay. Read
`dungeon.roomBias`, which records the choice at generation time; current relics
may have changed since then. `dev-run-links-browser-check.mjs` verifies both
links and that the original paused run remains intact.
Existing browser probes (`window.__run`, `window.__scene`, and others) are development inspection surfaces; look for a
system's existing probe before adding another.

When fixing a bug, add the smallest check that would have detected the real
failure. Prefer an invariant over a screenshot or a duplicate implementation.
Keep generated files and another worker's uncommitted changes out of the edit.
