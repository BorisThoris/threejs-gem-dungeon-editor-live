# Full verification triage · 25 September 2026

`yarn verify:full` ran the layout, world, audio, performance, creature, and
focused browser checks. Every check except one smoke assertion passed. The
first smoke run reported that a keyboard dash did not raise the bats in a
seed-five roost fixture. The roost has a 1.2-second warning that cancels when
the player leaves its five-metre range; a later run ended 4.82 metres away
after alternating W and S on the software renderer. The fixture now returns
the player to the actual generated roost between real keyboard dash bursts,
waits for a fresh flight if an earlier encounter already roused it, and
records the noise at the `batsRoused` event rather than after a fixed delay.

The next complete smoke run passed the roost check but found an unrelated
fixed-time sprint assertion. It pressed Shift+W for 900 ms while retaining a
camera heading from an earlier run; on a slow frame the player could reach a
wall without the check observing a running footstep. The fixture now places
the player on open start-room ground, faces inward, waits for teleport to
settle, and waits for the game's own hearing probe. A focused keyboard sprint
check joins the short verification gate and tests movement, Warden hearing,
hunting, and eventual quiet.

The final `node scripts/smoke-test.mjs 5199` run passed **455 checks, zero
failures, and no uncaught page errors**. Both repaired assertions passed in
that same long browser session. The local log is `output/smoke-verified.log`.
The focused seed-five moth/roost check, sprint-noise check, typecheck, and
lint also passed. At that point the full gate had not yet been rerun after
the fixture edits; its other checks had passed in the original run.

The short `yarn verify` gate initially exposed one more fixture error: its
core-flow check chose the generated vault door and expected an ordinary
`Open` prompt. The game correctly required the vault key. The check now
chooses a linked room other than the exit or vault and waits for the actual
prompt before interacting. Its focused run passed, followed by a complete
`yarn verify` pass, including the new keyboard sprint check. That gate's log
is `output/verify-final.log`.

The complete `yarn verify:full` gate was then rerun with `test:prod` and
`test:desktop` added before the browser suite. It passed end to end in
2304.56 seconds. The run covered the shipped web build, a packaged Windows
desktop launch and pause/resume, 78 measured rooms, the long smoke test,
all 19 creature render states, the scenario matrix, and the remaining focused
checks. The local log is `output/verify-shipping.log`.

A subsequent short gate added an independent Rapier oracle for authored prop
overlap. It compared 9,600 transformed solid-prop pairs (3,390 physical
overlaps) with the placement predicate; all agreed. `yarn verify` passed with
that check included. Its local log is `output/verify-overlap.log`.

The Test Hall later added sweeps with the actual player capsule from
`world.ts`, alongside its existing rays. The focused hall check and the
subsequent `yarn verify` passed all 80 ray/player lanes across 20 props,
including transformed chest and wall fixtures. The latter log is
`output/verify-player-hall.log`.

The hall then added a capsule bypass beside every prop, offset beyond the
larger of its placement guide and real collider reach. Its focused browser
check passed all 120 center and side lanes across 20 props; the subsequent
`yarn verify` pass is logged at `output/verify-clearance.log`.

The scenario review capture then measured luminance for all 18 generated
room-kind and footprint cases. Every raised-lantern scene was visibly brighter
and above the black-scene guard; the darkest case, a third-floor elbow, rose
from 7.0 to 29.3 in the sampled 0–255 scene exposure. The complete capture
passed and its local log is `output/scenario-exposure.log`. The full gate now
runs this visual check and refreshes its browsable gallery.

The verification runner now records each check's outcome and duration in
ignored JSON reports. A subsequent short gate passed 14/14 checks in 214.2
seconds; its report is `output/verification/short.json`, and CI uploads that
file even when the verification step fails. The local log is
`output/verify-report.log`.

The Signals graph now opens its selected source or listener room as a playable
development scenario using the shared URL builder. A focused browser check
verified the listener opens at run seed 72, floor three while the graph stays
open, and that Foreman's Tally bias is carried into the link. The short gate
passed 14/14 checks on its complete retry; its local log is
`output/verify-signal-links-retry.log`.

The Signals browser check now drives the live Din with the graph's selected
seed, room, source, footing and bar, then compares arrival strength and the
number of answering receivers. Silent theft, doorway carry, a barred edge,
impulse decay, a held lantern and a water sprint all agreed. The subsequent
short gate passed 14/14 checks; its local log is `output/verify-live-din.log`.

The layout gate then audited 8,228 generated sound routes, including floors
with and without Foreman's Tally room bias, against an independent
breadth-first distance with sampled barred doorways. Every
audible route used the expected number of real open edges and carried the
expected strength; inaudible and disconnected routes stayed absent. The
focused run passed; its local log is `output/layout-route-bias-audit.log`.

A fresh short gate passed 14/14 checks in 266.7 seconds after the carry
boundary fix. Its report is `output/verification/short.json`, and its local
log is `output/verify-current.log`. The subsequent full gate ran all 32
checks and passed 30. It found one Works gallery response below the measured
room-tone audibility bar and a smoke fixture that could set `transitioning`
on the already mounted room, leaving no remount to call `roomReady`. Its
local log is `output/verify-full-current.log`.

The smoke fixture now waits for room readiness only when it changes rooms.
The complete smoke suite passed on its focused rerun in 1019.7 seconds;
see `output/smoke-room-ready-fix.log`. Navigation cues in Gardens, Works,
Tombs and the rootwell trail gained measured headroom. The audio check now
prints its eight tightest cue margins for tuning; all 67 cues and the full
audio suite passed on a fresh server after the final mix change. The Works
gallery response measured 33% above the room-tone bar in that run; see
`output/audio-works-attack.log`. Typecheck, lint and syntax checks also
passed.

The verifier now accepts repeated `--only=<check>` selectors, validates
check names before starting work, and writes focused results separately from
the gate reports. A source-only typecheck passed without starting Vite, and
a two-check browser run passed the dev-run links and Signals graph on a fresh
server. The focused report is `output/verification/focused.json`. An invalid
name failed immediately without running a check. A later focused run passed
audio and smoke together (2/2) in 1231.4 seconds. That latest focused report
is `output/verification/focused.json`, and its local log is
`output/verify-audio-smoke-focused.log`.

The final integrated `yarn verify:full` run passed all 32 checks in 2956.0
seconds after the fixes and verifier change. Audio's 67 cues all cleared the
room-tone threshold; its lowest measured cue had 11% headroom. The complete
smoke run passed, as did the shipped builds, performance budgets, creature
rendering, 18-case scenario matrix, lighting gallery and overlays. The
current report is `output/verification/full.json`; the local log is
`output/verify-full-after-fixes.log`.

Visual inspection of the scenario contact sheet found that its Play links
still named the full gate's temporary Vite port after that server shut down.
The gallery now stores the shared scenario URL owner's path and has an editable
development-server field, defaulting to port 5199. A focused normal/elbow
capture verified the generated page preserves the path while switching all
links to another server origin; its artifact is
`output/scenario-review/check/index.html`.
