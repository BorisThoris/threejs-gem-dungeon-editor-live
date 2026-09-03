# Playtest report

**This is an automated playtest, not a human one.** Everything below was
measured by scripts driving the real game in a headless browser, or
computed from the generator. It says what the game *does*. Whether it is
*fun* is still a question only a person can answer, and the last section
says what to watch for when one does.

The first version of this report found that the run had no decision in it:
eight gems on a floor, a toll of three, and nothing that moved. The game
has since been reworked around that finding, and section 1 describes what
it is now.

## 1. The run, by the numbers

Measured over 400 generated floors.

| Measure | Min | Mean | Max |
| --- | --- | --- | --- |
| Rooms on a floor | 8 | 10.0 | 12 |
| Doorways from start to exit | 3 | 4.6 | 8 |
| Gems available on a floor | 9 | 11.0 | 13 |
| Walking time along the shortest path, no stops | 14 s | 20 s | 32 s |

A run is three floors. The exit charges 3 gems, then 5, then 7: fifteen in
tolls against about thirty-three on the ground, so a run that took
everything and paid every toll would climb out with eighteen. That number
is the score, and nothing else is.

**The bargain.** Every gem taken raises the floor's alarm, and the alarm is
the only thing the Warden reads. Six gems fully rouse it, and a floor holds
eleven, so the back half of any floor is worked against a Warden that hunts
rather than wanders, steps between rooms every four seconds instead of
nine, and crosses a room at 4.4 units a second. The player walks at 5 and
runs at 8, so it can never simply catch someone who keeps moving. It wins
by being in the doorway you wanted.

That is the whole decision the game now asks, once a room: the toll is
paid, the exit is open, and there are four more gems on this floor. Do you
go back for them?

**What each thing costs.**

| | Cost | What it buys |
| --- | --- | --- |
| Exit, floor 1 / 2 / 3 | 3 / 5 / 7 gems | The way down, and the way out |
| A life | 1 gem | One more mistake |
| A chest | free | One potion or scroll, contents unknown |
| Warden's Lantern | 2 gems | Always knowing which room it is in |
| Robber's Chart | 2 gems | Rooms that still hold a gem, on the map |
| Soft Boots | 3 gems | A quarter more speed |
| Bone Charm | 3 gems | The first hit on each floor |
| Ash Censer | 4 gems | Gems rouse the floor half as much |
| Toll Ledger | 4 gems | A gem off every exit |

Prices rise by one per floor. The shop offers two relics, fixed per floor
and per seed, so a shop is the same shop every time you walk back into it.

## 2. What two independent code reviews found

Two reviewers read the whole tree after the rebuild. Their confirmed
findings, all fixed on this branch:

- **Trap rooms had no spikes and the memory trial had no crystals.** Both
  used a ring of points filtered against the door lanes, and at every size
  the generator makes, every point of both rings fell in a lane. The
  screenshot tour had shown an empty trap room and nobody noticed. Rooms
  now use three anchor families (near, far, corner) that are distinct by
  construction; spikes sit between the gem and the lanes; the trial has
  four crystals on the far anchors.
- **The shop sold nothing worth buying.** It now sells relics as well as
  lives, and the pedestals take two of the far anchors.
- **The gem could land inside a prop or on the challenge altar.** The gem
  now takes the anchor farthest from what the room's content has claimed,
  and the dressing keeps clear of the gem, the content and the spikes.
- **Doorways were open holes.** Walking through one led onto the invisible
  ground plane with no way back. Each gap now has an invisible collider;
  doors are taken with E.
- **A failed puzzle was forgotten on leaving the room.** The run now owns
  `failed` alongside `cleared`, so a sprung trap or a burned book stays so.
- **A second miss in the memory trial's flare could award the gem** from a
  burned book. Input closes on the first miss.
- **The pause poll ate gamepad presses**, and Esc inside the number puzzle
  opened the pause menu under it. Pad pause is read in the frame loop; Esc
  belongs to the puzzle while one is open.
- **The editor accepted any JSON as a template**, including unknown prop
  kinds that crashed it on every reload, and offered room sizes the game
  does not define. Templates are validated on import and on load.
- **A painted surface never reached materials already on screen**, and the
  painter could open on the default and overwrite the painting on save.

`yarn test:layout` now checks the geometry over every size and 500 seeds,
so the first two cannot come back silently.

## 3. What the automated walkthrough does

`scripts/smoke-test.mjs` plays a run the way a player does, with the
keyboard: it walks to doorways and presses E, prefers doors to rooms it has
not seen, picks up gems by walking into them, tries the exit unpaid and
paid, descends, wins from the last floor, restarts, and dies. Twenty checks
pass on the current build. Separate probes (kept in the session, not the
repo) drove the memory trial to a solve, the number tome, the plate trap
with the carry mechanic, a spike patch costing a life, the shop counter,
pause and resume, and the pointer capture.

## 4. What every room looks like

Captured from the doorway on a software renderer; a real GPU is brighter
and smoother.

| Kind | What the player finds |
| --- | --- |
| ![start](docs/playtest/room-start.png) | **Start.** A table, a chest, braziers, two glowing doorways. The hint says how to look. |
| ![normal](docs/playtest/room-normal.png) | **Chamber.** Dressing only; the gem is the reason to enter. |
| ![treasure](docs/playtest/room-treasure.png) | **Vault.** Chests and a crystal; an authored layout from the Room Builder ships here. |
| ![shop](docs/playtest/room-shop.png) | **Shop.** A counter that sells a life for a gem. |
| ![library](docs/playtest/room-library.png) | **Library.** A lectern opens the number puzzle; solving it pays a gem. The red frame is a locked exit. |
| ![trap](docs/playtest/room-trap.png) | **Trap room.** A ring of spikes between the doors and the gem. |
| ![arena](docs/playtest/room-arena.png) | **Arena.** The big octagon; pillars and space. |
| ![memory](docs/playtest/room-memory.png) | **Memory chamber.** Five crystals on pedestals; watch the order, repeat it with E. |
| ![challenge](docs/playtest/room-challenge.png) | **Challenge room.** An idol on a pressure plate; weigh the plate with a candle before lifting it, or lose a life. |
| ![end](docs/playtest/room-end.png) | **Exit.** Crystals and pillars; reaching it descends or wins. |
| ![warden](docs/playtest/warden.png) | **The Warden**, in a room with you. It drifts, it does not walk; it passes through everything; its eyes go from cold to orange to red as the floor wakes. |

## 5. Steam Deck

Checked at 1280x800: HUD, hint, prompt and menu text scale with the
viewport (about 15 px on the Deck's panel, capped on desktop). The pad
mapping is the standard one and was verified with a synthetic gamepad;
nobody has held a Deck with this on it.

## 6. What a human playtest should watch for

- **Is the Warden frightening or annoying?** It cannot be fought, blocked
  or outpaced, only avoided. That is either tense or it is a tax. The two
  dials are `WARDEN_SPEED_ROUSED` and `WARDEN_STEP_ROUSED_S`.
- **Does anyone go back for the last gems?** If players always leave the
  moment the toll is paid, the alarm is too punishing or the score is not
  visible enough. If they always strip the floor, it is not punishing at all.
- **Do the relics get bought?** A relic costs gems that would otherwise be
  score, so a player who never buys one is telling you the relics are weak
  or the score is too precious. Watch whether anyone buys the Ash Censer,
  which is the one that explicitly pays for greed.
- **Is the arena's fourteen seconds the right length?** It is the only
  timed thing in the game. Too short and it is a formality; too long and it
  is a chore, and the Warden may arrive in the middle of it either way.
  `ARENA_DURATION_S` and `ARENA_SPIN` are the dials.
- **Is the head bob too much, or not enough?** It is small on purpose and
  can be switched off in the pause menu, because it makes some people ill.
  Watch whether anyone reaches for that.
- **Does anyone work out the inner line?** Keeping ahead of the arms near
  the middle is a walk and near the wall is a dash. That is the whole skill
  of the room, and it is never explained.
- **Is the first meeting readable?** The Warden wakes after two rooms and
  the game says one line about it, once. If players do not understand that
  running works, that line is not doing its job.
- **Three floors of the same ten room kinds.** Watch for the point where a
  player recognises a room and stops looking at it.
- **Does anyone drink the unknown potion?** Four slots, eight items, two of
  which wake the floor. If players hoard and never use them, the good ones
  are not good enough or the bad ones are too frightening. If they drink
  everything the moment they find it, there is no decision there either.
- **Is identification worth anything over one run?** Learning that the inky
  bottle is healing only pays if you find a second one. Watch whether
  anyone gets to use that knowledge, and if not, chests need to be commoner
  or the run longer.

## 7. Tuning knobs

All in `src/game/world.ts`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `FLOORS` | 3 | Floors in a run |
| `TOLL_BASE` / `TOLL_STEP` | 3 / 2 | The exit's price, and how much it rises per floor |
| `GEMS_PER_LIFE` | 1 | Shop price |
| `STARTING_LIVES` | 3 | Lives at the start; carried between floors |
| `DAMAGE_COOLDOWN_S` | 1.5 | Invulnerability after a hit |
| `WALK_SPEED` / `DASH_SPEED` | 5 / 8 | Units per second |
| `ALARM_PER_GEM` | 1 | How much a gem rouses the floor |
| `ALARM_HUNTS_AT` / `ALARM_MAX` | 3 / 6 | When it starts hunting, and when it stops getting worse |
| `WARDEN_SPEED_CALM` / `_ROUSED` | 2.2 / 4.4 | How fast it crosses a room |
| `WARDEN_STEP_CALM_S` / `_ROUSED_S` | 9 / 4 | Seconds between rooms |
| `WARDEN_GRACE_ROOMS` | 2 | Rooms entered before it wakes |
| `ARENA_DURATION_S` / `ARENA_SPIN` | 14 / 0.75 | How long the arms turn, and how fast |

Room counts per floor: `minRooms` / `maxRooms` in `generateDungeon`, in
`src/game/dungeon/generate.ts`.
