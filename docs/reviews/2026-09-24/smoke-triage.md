# Deep smoke triage · 24 September 2026

The initial `node scripts/smoke-test.mjs 5199` run reported 32 failures on
Windows under software rendering. After fixture corrections and two game
fixes, a fresh solo run completed with **455 passing checks, zero failures,
and no uncaught page errors**. Its local log is `output/smoke-rerun-5.log`
(not a tracked artifact).

The following assertions were based on obsolete or incorrect test fixtures:

- Thirteen interaction assertions read the controls hint via a body-wide
  `E ...` regex. `stepTo` now reads `[data-testid="prompt-text"]`.
- Four barricade assertions described the old single movable bar. The block
  now checks three reusable kits, refusal while a door is barred, kit recovery,
  and independence from timed grates. `test:barricades` passes independently.
- The dart-hole assertion compared an off-lane plate with the entrance lane's
  width. It now checks that the holes flank the plate's volley path.
- The floor blurb, HUD child list, authored-slot variety, and names-wall
  fixtures were updated to read current content and live placement.

The first complete rerun reduced the count from 32 to 12, and the second to
6. A third run overlapped type checking and lint on this software-rendered
machine and reported 10 failures, including a measured arena walk of only
1.45 m/s. The final solo run measured the walk at 2.38 m/s and passed the
arena check. Focused checks also resolved these fixtures:

- The hidden-wall interaction check now reads the dedicated prompt element.
- The lantern range ends at zero when guttered; the old assertion excluded
  that valid final state.
- The moth's hold begins when it leaves. The four slow dimming steps spent
  most of the six-second hold before the old assertion sampled it.
- The bat check now keeps the sprint within five metres of the roost during
  its warning. `ambient-behavior-browser-check.mjs` passes both behaviors.
- The grate check now moves five metres beyond the doorway and waits for the
  two-second run-clock delay before reading the bars.
- The dart check selects a room without a competing pit. Its pursuit setup
  still needs to steer the Warden across the off-lane plate.
- The editor check waits for the lazily loaded tab to appear.
- The opening exploration walker now uses the game's actual door positions,
  including wings, and reaches the exit again.
- The Reaper now starts from a visible position, records its own strike, and
  waits for its delayed doorway arrival. Both assertions passed in the third
  complete run.
- The trap check uses generated floors with visible, short approaches. A
  noisy bait spot beyond the dart plate keeps the Warden on it through the
  warning, while test-only damage cooldown stops its first strike from
  banishing it. `trap-combat-browser-check.mjs` passes dart wound and pit
  opening on clean runs.
- The Harrier spike check uses a clear south approach on seed 2. The focused
  check passes its spike crossing, downing, and death.
- The Warden's after-rout check waits for the replacement body's arrival
  clock before sampling its position. The final run saw zero spike samples
  in 41 frames.
- The Warden tell check now watches an audible 2.2 m approach. The final run
  observed a tell of 1 and the Warden's own strike event.

One real game bug was found during this work: a Harrier following through a
doorway landed 0.9 m inside it, but its movement required 1.0 m of wall
clearance. Its first and every later step were rejected, leaving it frozen
at the doorway despite seeing the player. It now lands 1.1 m in. The focused
Harrier scenario passes, and `pursuit-browser-check.mjs` checks its landing
against the movement margin.

The complete smoke suite passes after these changes. `yarn verify` and
`yarn build` also pass. The build still reports Vite's existing mixed
static/dynamic import and large chunk warnings; they did not fail the build.

Separately, `test:bat-flight` found a real geometry bug: bat roosts could
spawn inside ring-room cores or ceiling structure. `roostFor` now validates
the real room footprint and available flight orbit. The focused test passes
188 roosts and 52,640 airborne poses; `test:world` and `test:perf` also pass.

The short `yarn verify` gate runs on every change, while the full browser
suite remains available through `yarn verify:full` for broader validation.
