# Gem Dungeon cloud continuation

The user requested moving the ongoing development goal to cloud execution on
28 September 2026. This record accompanies branch `codex/gem-dungeon-direction`.
It describes an incomplete refinement effort, not a release approval.

## Direction

A compact dungeon heist in an inhabited, reactive place: light, sound, routes,
traps, ecology and spending should produce understandable consequences. The
player learns those relationships and uses them to escape with more than they
spent. Preserve the three-floor loop, optional discoveries, readable creature
counterplay and handmade blocky art. Read `AGENTS.md`, `ARCHITECTURE.md`, current
README, `DEEPWORKS.md` and `docs/WORLD_EXPANSION.md`; current implementation and
verified behavior take precedence over older playtest notes.

## Changes already made

- `853125b`: held Din sources refresh their reach when routes change, and
  impulse-history overflow no longer removes continuing light/key/wisp sources.
- `7b7cccc`: trap events carry their real room and position through creature
  investigation and stereo sound. Physical-contact and stereo regressions cover
  darts, pits, grates and placed snares.
- `c360453`: threats, objectives and resources precede equipment controls in
  the HUD. The crowded desktop check guards order and the existing size budget.
- `f2cef0b`: the keyboard sprint fixture waits for both movement and detection
  before releasing its keys. This is a test-only synchronization fix.

No gameplay changes after `c360453` were included in the local shipping checks.
The branch has been pushed; main has not been changed and nothing was deployed.

## Verification and remaining work

The local full gate was deliberately stopped for the requested cloud transfer.
[Its compact result snapshot](verification/cloud-transfer.json) lists 36 passed
checks, one original failure and the interrupted Cutpurse loot check. Checks
absent from that snapshot had not started. **The complete gate has not passed.**

The sole failure was the sprint fixture: hearing became true with only
0.09894 metres of reported displacement, and it released the keys before
asserting movement beyond 0.1 metres. Commit `f2cef0b` waits for both outcomes.
Its separate direct rerun passed movement, detection, noise decay, toggle sprint
and mode switching. The snapshot preserves the original failure and records
the correction separately; it does not rewrite the gate as green.

The passed portion includes generation/layout/world/navigation, production web,
Windows directory packaging, signals and physical interaction, gameplay,
simulated gamepad, touch, audio, performance and a complete expedition. Windows
packaging verified startup, run, pause/resume, packaged-file loading and absence
of captured runtime errors. It did not validate an installer, signing, Steam
upload, macOS or Linux. Production web also passed malformed/old-save recovery
and removal of all 90 development probes and the editor.

Earlier focused verification also passed an expedition on seed 404: 26 doors,
three floors, stolen-gem recovery, Harrier counterplay, shop bomb purchase/carry,
Keeper escape and restart, finishing with three lives and three gems. The walker
knows the map; this is mechanical evidence, not a novice playtest. An 18-case
room/footprint gallery passed dark/raised-lantern exposure checks. HUD and overlay
checks passed desktop, phone and tablet at default and 1.6x text, both thumb
layouts, scrolling and input isolation.

Continue the remaining integration checks and investigate their actual causes.
Keep this gate's interrupted status distinct from later focused reruns. Broader
environmental coverage is registered separately in `yarn verify:systems`.

## Environment

The successful local environment used Node 22 and Yarn 1.22.22 with
`yarn install --frozen-lockfile`. An initial Windows packaging error was caused
by this checkout's shared `node_modules` junction: npm reported a Drei dependency
missing only through the junction. A normal isolated dependency install fixed
it without changing tracked files. Do not recreate that junction in the cloud.

Discover the cloud runtime's Chromium and set `CHROMIUM_PATH` if needed. Do not
copy Windows executable paths. The movement probe used `WALK_RENDERER=hardware`
on Windows; cloud software rendering may need its default setting. Existing
scripts own their server/browser cleanup. Wait on live process handles rather
than restarting a quiet check.

`yarn verify --only=<registered-script.mjs>` runs focused checks with a fresh
server; repeat `--only=` to select more than one. `yarn verify:full` runs the
full integration gate. Reports and per-check logs are in `output/verification/`.
Use the existing development probes, scenario tools and editor for diagnosis.
