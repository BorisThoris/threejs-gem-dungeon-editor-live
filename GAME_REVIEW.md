# Whole-repository game review
Date: 14 September 2026. Reviewed current upstream commit `67afe31`.

## Assessment

The current game has a substantial, connected playable core. It is **not ready for a Windows release as checked in**, and the newer shared awareness architecture is only partly connected to the creatures it claims to govern. Passing the existing gameplay checks does not cover those integration gaps.

The most useful next work is fixing the build, completing the existing mechanics' connections, and making release checks reliable. Adding more rooms or mechanics first would enlarge the surface of these problems.

This is a broad repository and runtime audit, not a claim that every possible seed, device, or interaction has been exhaustively tested.

## Git scope: the whole repository, not only the checkout

Fetched all configured remotes and branches before selecting the code to test.

| Ref | Position and review treatment |
| --- | --- |
| Checked-out `fix/seeded-run-e2e` at `28703e8` | Old engine; 9 commits unique against current upstream, which has 273 unique commits. Built it and ran its type checker. |
| Local `main` at `8060fd4` | 273 commits behind current upstream. Not the current game. |
| `origin/main` at `67afe31` | Primary current-game audit target, isolated in a detached worktree. |
| `origin/claude/steam-demo-core-loop-6eh975` | Same commit as current upstream. |
| `origin/claude/mobile-touch-controls-si4fcm` at `7fe1f6d` | Fully incorporated in upstream; upstream is 95 commits ahead. No unique feature changes to recover. |
| `origin/pre-greenfield` at `a715a3f` | Historical engine, ancestor of upstream; upstream is 254 commits ahead. |
| `origin/fix/seeded-run-e2e` at `cb95f5f` | Historical seeded-run work; local branch adds five metadata/media commits. |

The rewrite changes 627 file paths relative to local main. Findings about the old components are not automatically findings about the current game. Do not merge the old engine wholesale to recover one test or tool. Its real-keyboard seeded traversal test is worth adapting to the new engine, however.

## Prioritized findings

### 1. P1 — The current game cannot start/build normally on Windows

**Verified:** original `npm run build` fails with:
`"Audio" is not exported by "src/game/systems/audio.ts", imported by "src/App.tsx"`.
Type checking also reports TS2305 and TS1149.

The component is `Audio.tsx`, while the synthesizer is `audio.ts`. The extensionless component import resolves to the wrong module on this case-insensitive filesystem. The dev dependency scan fails for the same reason.

**Fix:** give the React component a distinct basename, such as `GameAudio.tsx`, and update its import. That temporary change alone allowed this audit's type check and production build to pass.

Reference: [src/App.tsx:20](<src/App.tsx>). The worktree currently contains that temporary rename; the original upstream filename is `src/game/systems/Audio.tsx`.

### 2. P2 — Shared awareness/susceptibility rules do not govern most creatures

> **Update, 15 September 2026.** Wired since this review: the store's blast handling asks the Warden's, Harrier's and Keeper's rows through `din.reaches` (the Keeper's threshold raised to 0.5 so a bomb next door does not open the last stairs); the rats scatter from what their row names through `din.answering`; the moth is drawn by `[bright]` from whoever carries it; the Sentry halves its patience on its declared `[bright]` threshold rather than a flag about the player. The Reaper's blast hold is kept as the explicit exception, documented in the table and in `detonate`. The layout suite checks each wiring by source and the consequences by number. Still separate: the Cutpurse's arrival (heat-driven, its `carried`/`metal` row unread) and the awareness ladder's rung for creatures other than the Warden.

**Verified source tracing and targeted runtime probes.** The Warden reports into and reads the shared awareness ladder. The Harrier, Cutpurse, Keeper, rats, moth, wisp and Sentry largely retain their separate behavior, rather than feeding and obeying that same ladder. Waking a ladder entry is not equivalent to using it.

Concrete measurements:

- Cutpurse successfully entered `stalking`, while its shared awareness rung remained **0**.
- The Reaper's susceptibility explicitly rejects blasts, but detonating a bomb still sets its stall deadline through a hard-coded call in the run store.
- The Sentry's detection uses its own beam timer and `lanternLit`; it does not consult its declared bright-signal threshold.
- Rats and moths do not consume the shared sound/light declarations that describe their reactions. Bats do consume the sound system.

This is the largest “written but not fully connected” subsystem. Changing a table can pass a table-level test while leaving the creature unchanged. The Reaper immunity description also conflicts with actual gameplay.

**Fix:** choose the intended rule for each creature, connect the actual decision/movement/damage path, and test creature behavior after changing the declared stimulus. Keep intentional exceptions explicit.

References: [src/game/ladder/LadderDriver.tsx:33](<src/game/ladder/LadderDriver.tsx>), [src/game/din/susceptibility.ts:41](<src/game/din/susceptibility.ts>), [src/game/sentry/Sentry.tsx:149](<src/game/sentry/Sentry.tsx>), [src/game/state/run.ts:2494](<src/game/state/run.ts>), [src/game/warden/Warden.tsx:178](<src/game/warden/Warden.tsx>).

### 3. P2 — Descending loses the raised lantern's awareness signal

**Runtime reproduction:** raise the lantern, then resolve a floor descent through the real store action. Before: `glim=100, holding("lantern")=true`. On floor 2: `glim=100, holding("lantern")=false`, with no registered signal in the destination.

The floor-change listener clears the signal registry, but the room-entry listener only moves signals that already exist. The carried lantern's state survives the descent; its signal does not. Operating it again recreates the signal.

**Impact:** rendered/run light and the shared awareness model disagree. The incomplete consumers in finding 2 mean this should not be interpreted as proof that every enemy becomes blind.

**Fix:** rebuild persistent carried signals from run state after reset, including the actual brightness and destination room.

Reference: [src/game/din/DinDriver.tsx:60](<src/game/din/DinDriver.tsx>) and [src/game/din/DinDriver.tsx:137](<src/game/din/DinDriver.tsx>).

### 4. P2 — A remotely broken bar produces sound at the player

**Runtime reproduction:** a bar joined `room_1` and `room_2`; the player stood in `start`. Breaking it produced a `barBroken` sound whose `fromRoomId` was **start**.

`breakBar` discards the edge before emitting an event that contains only `byWarden`. The sound translator falls back to the current player room. The Warden can break a bar while the player is elsewhere, so this invents a noise at the player instead of at the obstruction.

**Fix:** preserve the broken edge/source room in the event, then use that position for sound propagation and investigation.

References: [src/game/state/run.ts:2125](<src/game/state/run.ts>), [src/game/din/DinDriver.tsx:76](<src/game/din/DinDriver.tsx>), [src/game/warden/WardenDriver.tsx:135](<src/game/warden/WardenDriver.tsx>).

### 5. P2 — Dropping the iron key is keyboard-only

The new key-as-bait mechanic has a `G` binding and an App keyboard handler. There is no corresponding controller action or touch button. The controller state includes use, slots, lantern, mark and bar, but no drop-key action.

The key can therefore be carried and used on those inputs, but its deliberate drop/lure mechanic is inaccessible without switching to a keyboard. Existing controller checks can pass without covering it.

**Fix:** expose the action through a shared input action and a controller/touch-accessible control or inventory menu.

References: [src/App.tsx:107](<src/App.tsx>), [src/game/input/gamepad.ts:19](<src/game/input/gamepad.ts>), [src/ui/TouchControls.tsx:280](<src/ui/TouchControls.tsx>), [src/game/input/bindings.ts:51](<src/game/input/bindings.ts>).

### 6. P2 — Invalid slot rules pass room import validation and can crash rendering

**Runtime reproduction:** a template with valid id/kind/shape/size/props and `slots: {}` passes `isRoomTemplate`. Passing the accepted data to the renderer's slot resolver throws **TypeError: rules is not iterable**.

The validator predates the optional slot rules. It validates ordinary props but not the new rule array, operations, substitution targets or their required structure. Importing a file can persist the accepted malformed template; selecting/using it then reaches the unguarded resolver.

**Fix:** validate the complete current schema on import and load, including slot operations and nonempty valid substitution lists. Show validation errors before storing/previewing a draft.

References: [src/editor/drafts.ts:33](<src/editor/drafts.ts>), [src/editor/RoomBuilder.tsx:72](<src/editor/RoomBuilder.tsx>), [src/game/rooms/slots.ts:95](<src/game/rooms/slots.ts>).

### 7. P2 — Losing focus without pointer lock does not pause the run

**Verified:** dispatching a blur event during a controller-style run leaves `paused=false, phase=playing`. Source inspection finds key clearing on blur, but automatic pause is tied to losing pointer lock. A controller or touch session need never acquire pointer lock.

Electron explicitly disables background throttling. Switching away can therefore leave an uncontrolled player in a live dungeon. Browser/mobile suspension also advances the wall-clock-based run timers unless pause was entered.

**Fix:** handle document visibility/window focus loss independently of pointer lock, with a deliberate resume flow. Verify actual desktop Alt-Tab and mobile suspend/resume on hardware; this audit used a browser event probe rather than those hardware actions.

References: [src/game/input/keyboard.ts:48](<src/game/input/keyboard.ts>), [src/game/input/mouseLook.ts:124](<src/game/input/mouseLook.ts>), [src/game/state/run.ts:2600](<src/game/state/run.ts>), [electron/main.cjs:34](<electron/main.cjs>).

### 8. P2 — The release verification scripts are not portable to this Windows checkout

**Verified failures:**

- Layout suite initially rejects `/C:/Users/Gaming%20PC/...` as a working directory.
- After a URL-to-filesystem-path workaround, it reaches an undeclared `grep` executable and fails with ENOENT.
- With Git's grep supplied, it progresses through hundreds of checks but reports a path-sensitive source assertion and eventually fails with ENOBUFS. This is not a complete green layout run.
- Production suite fails scanning `C:\\C:\\Users\\Gaming%20PC\\...\\dist`.

Production setup also uses a Unix-style process-group lifecycle and `spawn("npx")`, which need Windows handling. Browser binaries default to an absolute Linux path unless `CHROMIUM_PATH` is set.

**Fix:** use `fileURLToPath`, portable Node source inspection, bounded output, and cross-platform process startup/cleanup. Declare test dependencies directly; the layout suite imports esbuild through the dependency tree rather than declaring it itself.

References: [scripts/layout-check.mjs:17](<scripts/layout-check.mjs>), [scripts/layout-check.mjs:1553](<scripts/layout-check.mjs>), [scripts/layout-check.mjs:5710](<scripts/layout-check.mjs>), [scripts/prod-check.mjs:39](<scripts/prod-check.mjs>), [scripts/prod-check.mjs:101](<scripts/prod-check.mjs>).

### 9. P2 — The current full-run check does not establish that a real player can finish

The current `run-through.mjs` teleports between positions, presses E, and replenishes lives. That checks routes, interactions and economy, but bypasses ordinary movement/collision and survival. It cannot rule out an obstructed walking path or an unavoidable death sequence. The script documents this limitation; it remains a coverage gap.

The old branch contains a materially different seeded check that drives W/A/S/D. That coverage was not preserved as a normal-input full-run check for the rewritten game.

**Fix:** adapt that approach to the current engine, record failing seeds and delvers, and include at least a small set of unmodified-health, ordinary-input completions. Supplement with human playtests for learnability and fairness.

References: [scripts/run-through.mjs:18](<scripts/run-through.mjs>) and the old checkout's `scripts/seeded-run.mjs`.

### 10. P3 — electron-dev waits for Vite but does not select it

The package script starts Vite, waits for its port, and invokes Electron without setting `NODE_ENV=development`. Electron's URL/file decision checks that environment variable alone. On a normal shell it therefore opens `dist/index.html`, which is either stale or absent, rather than the running dev server.

**Fix:** give the dev command an explicit portable environment/flag and test hot updates through that command.

References: [package.json:20](<package.json>), [electron/main.cjs:38](<electron/main.cjs>).

## What is connected, and what still needs work

| Area | Current assessment |
| --- | --- |
| Menu, new runs, HUD, pause, summaries | Present and exercised by browser checks. |
| Dungeon generation, geometry, door traversal | Connected; many geometry checks run. Full Windows suite is blocked by tooling. |
| Three floors, exit toll, Keeper gating | Implemented. Full ordinary-input survival coverage is missing. |
| Gems, shops, relics, inventory, identification, pledges | Substantial working paths exercised by smoke tests. Economy/balance needs human runs, not only fixtures. |
| Memory, tome and pressure-plate puzzles | Real input paths tested by the smoke suite. Not merely unreachable old editor components. |
| Warden, traps, bombs, ambient creatures, thief | Mounted and interactive. Shared awareness integration is incomplete and inconsistent. |
| Keyboard/controller/touch | All exist; controller and emulated touch exercised in this audit. Drop-key parity is missing. Physical touch/Deck behavior remains unverified here. |
| Audio, captions, settings | Connected. Do not confuse audible feedback with correct world-signal placement. No fresh waveform/performance certification in this audit. |
| Room builder, props, painter, mosaic | Current authoring tools exist. JSON slot validation is incomplete. Draft export into shipped content is a manual documented step. |
| Persistence | Settings, records, deeds, ledger and lore persist. The active run has no save/resume snapshot; quitting loses it. Decide explicitly whether that is acceptable for the demo. |
| Steam | IDs/upload placeholders and documentation exist. Achievement bridge is a stub, not actual Steamworks reporting. No store/release operations were performed. |
| CI/release safety | No tracked GitHub Actions workflows found. Build and separate test commands do not form an enforced green release gate. |
| Documentation | README still describes older lantern oil/refill and threat behavior. Reconcile it with current rules rather than treating its promises as implementation evidence. |

## Missing pieces versus intentional scope

**Actual unfinished release work:** Windows startup fix; working cross-platform verification; decisions and integration for the shared creature rules; complete input parity; robust content validation; platform packaging/launch verification; Steam IDs and live achievement integration; hardware suspend/resume and controller/touch playtests.

**Product decisions, not automatically bugs:** active-run save/continue, localization, controller rebinding, broader graphics scalability, and additional content. Establish requirements before implementing these.

**Do not count as missing by default:** player combat, multiplayer, the old 38-biome catalog, or every legacy editor experiment. The current game is deliberately an evade-and-extract design and the rewrite intentionally replaced large parts of the historical engine.

## Validation and evidence

The review used Windows, Node 26.3.1, the installed dependency tree linked into an isolated worktree, and Chromium 1194. This was not a clean install against the lockfile or certification on the documented Node 22 deployment host.

The only current-game source workarounds were renaming the audio component/import and correcting the layout script's URL path. They were made in the detached review worktree, not on the user's working branch. Extra review scripts/logs are there too. No gameplay fixes, merges, commits, pushes or deployment were performed.

| Check | Result |
| --- | --- |
| Old checked-out engine build | Passed. Its separate type check failed. |
| Current upstream build and type check, unmodified | Both failed on the audio filename collision. |
| Current upstream ESLint | Passed. |
| Current build and type check after temporary audio rename | Both passed. Build emitted chunk-size/dynamic-import warnings. |
| Full current smoke suite | **457 passed, 1 failed**; no uncaught page errors. |
| Controller suite | **41 passed**, all controller checks passed. |
| Touch suite | **51 passed**, all emulated-touch checks passed. |
| Layout suite | Original script failed before checks. With Windows workarounds, **773 passed, 1 source assertion failed**, then the process aborted with grep ENOBUFS. Not a complete suite pass. |
| Original production suite | Blocked by malformed filesystem path. |
| Separate production browser probe after audio rename | Start/HUD, pause/resume, absence of dev store probes, and editor exclusion verified; no page errors. Missing favicon request found. |
| Targeted integration probes | Reproduced signal loss, wrong bar sound origin, missing focus pause, accepted invalid slot rules, and creature-rule contradictions. |
| Static dependency scan | Completed; most flagged exports are test/debug interfaces. Did not misclassify Electron preload or standalone authoring scripts as dead gameplay. |

**Unresolved arena failure:** the smoke check “every hit in the gauntlet came from a spike that was actually there” failed. Of two hits, one was attributed to a trap, and one had no source announcement at 12 seconds with the nearest sampled rotating spike 3.85 m away. The allowed reach plus frame allowance was 2.18 m. Walking still beat standing still (2 hits versus 6). This is a real failing check, but the root cause could be damage attribution, sampling/order, another damage source, or arena collision. It was not isolated enough here to assign a specific code defect. Add explicit source/position metadata to damage before concluding which mechanic is wrong.

**Verified polish defect:** `index.html:5` still requests `/vite.svg`, which is absent and returned 404 in the production browser probe; the title is still `mygem`. Use the game's own favicon/title and a packaged-file-compatible asset path.

Not run here: fresh audio waveform suite, exhaustive performance/memory suite, native installer launch/signing, Steam/Deck hardware, iOS/Safari, and an unassisted three-floor survival run. Existing documentation's claims about these are historical evidence, not new certifications from this audit.

Targeted evidence: [docs/reviews/2026-09-14/probes.json](<docs/reviews/2026-09-14/probes.json>). Logs are in the review worktree as `review-*.log`.

## Recommended order

1. Fix the Windows audio import and make build/type/lint/layout/production checks reproducible.
2. Resolve the creature-rule contradictions and connect every intended consumer.
3. Fix signal reset/location, input parity, focus handling, and import validation.
4. Add genuine normal-input seeded run coverage and fresh production/platform checks.
5. Playtest the existing game for readability, difficulty and pacing before expanding content.
