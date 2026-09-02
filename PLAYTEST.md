# Playtest report

**This is an automated playtest, not a human one.** Everything below was
measured by scripts driving the real game in a headless browser, or
computed from the generator. It says what the game *does*. Whether it is
*fun* is still a question only a person can answer, and the last section
says what to watch for when one does.

## 1. The run, by the numbers

Generator statistics over 500 seeds, one floor each:

| Measure | Min | Mean | Max |
| --- | --- | --- | --- |
| Rooms on a floor | 8 | 10.0 | 12 |
| Doorways from start to exit | 3 | 4.6 | 8 |
| Rooms on the shortest path | 4 | 5.6 | 9 |
| Rooms holding a gem | 6 | 8.0 | 10 |
| Walking time along the shortest path, no stops | 14 s | 20 s | 32 s |

Every floor has exactly one shop, library, arena, memory chamber and
challenge room; trap rooms appear on 58 % of floors; the rest are chambers
and vaults.

**Finding: one floor is short.** The exit toll is 3 gems and a floor holds
about 8, so a player who walks the shortest path and grabs the first three
gems they see is out in under two minutes. The plan's "15-20 minutes of
content" was never true of a single floor.

**Change made: three floors.** Taking an exit now descends to a fresh floor;
the third floor's exit wins. Lives and gems carry down, rooms do not. A
full run is therefore three tolls (9 gems), three generated dungeons and
every special room three times. A careful player who clears puzzles and
explores should see 8-12 minutes; a rushed one about 5. That is demo-sized.
The number is one constant, `FLOORS` in `src/game/world.ts`.

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

## 5. Steam Deck

Checked at 1280x800: HUD, hint, prompt and menu text scale with the
viewport (about 15 px on the Deck's panel, capped on desktop). The pad
mapping is the standard one and was verified with a synthetic gamepad;
nobody has held a Deck with this on it.

## 6. What a human playtest should watch for

- **The arena is empty.** It is the largest room and has nothing to do in
  it but cross it. It wants either a hazard pattern or a reason to linger.
- **Three gems is generous.** With ~8 gems per floor, the toll is rarely a
  constraint. If runs feel trivial, raise `GEMS_FOR_EXIT` to 4 or 5 before
  adding content.
- **The plate trap is a one-shot lesson.** Once a player knows to weigh
  the plate, the room is a formality. Fine for a demo; the full game wants
  variations.
- **Trap rooms can be crossed without touching a spike** by hugging a
  door lane. Intended - the ring is a risk, not a wall - but note whether
  players find it tense or trivial.
- **Does anyone read the hint bar?** The memory and challenge rooms explain
  themselves in one line at the top of the screen. If players ignore it,
  the lectern and the plate need to teach by doing.
- **Sound.** All cues and the ambient bed are synthesised. Whether they
  read as a dungeon or as a synthesiser is a judgement call for ears.

## 7. Tuning knobs

All in `src/game/world.ts`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `FLOORS` | 3 | Floors in a run |
| `GEMS_FOR_EXIT` | 3 | Toll per floor |
| `GEMS_PER_LIFE` | 1 | Shop price |
| `STARTING_LIVES` | 3 | Lives at the start; carried between floors |
| `DAMAGE_COOLDOWN_S` | 1.5 | Invulnerability after a hit |
| `WALK_SPEED` / `DASH_SPEED` | 5 / 8 | Units per second |

Room counts per floor: `minRooms` / `maxRooms` in `generateDungeon`, in
`src/game/dungeon/generate.ts`.
