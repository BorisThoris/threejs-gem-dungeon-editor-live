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

Measured over 400 generated floors at each depth, with the shipped room
templates registered, so these are the floors the game actually builds.

| Measure (min / mean / max) | Floor 1 | Floor 2 | Floor 3 |
| --- | --- | --- | --- |
| Rooms on a floor | 8 / 9.0 / 10 | 10 / 11.6 / 13 | 12 / 13.8 / 16 |
| Doorways from start to exit | 3 / 4.3 / 8 | 3 / 4.9 / 8 | 4 / 5.4 / 9 |
| Gems available | 9 / 10.0 / 11 | 11 / 12.6 / 14 | 13 / 14.8 / 17 |
| Chests | 3 / 4.7 / 8 | 5 / 8.6 / 13 | 7 / 11.4 / 19 |
| Watchers | none | 0 / 2.1 / 6 | 0 / 4.5 / 9 |
| Locked vaults | 400 of 400 | 400 of 400 | 400 of 400 |
| Walking the shortest path, no stops | 14 / 19 / 31 s | 14 / 21 / 32 s | 17 / 22 / 33 s |
| Alarm on arrival | 0 | 1 | 2 |
| Rooms before the Warden wakes | 3 | 2 | 1 |
| Light: ambient / overhead / fog | 0.70 / 18 / 46 | 0.50 / 14 / 41 | 0.34 / 11 / 36 |

A run is three floors, and each is larger and worse than the one above it.
The exit charges 3 gems, then 5, then 7: fifteen in tolls against about
thirty-seven on the ground, so a run that took everything and paid every
toll would climb out with twenty-two. That number is the score, and nothing
else is.

**The other bargain.** A dash is 8 units a second against a walk of 5 and
used to cost nothing, so the whole game was played holding shift. It is loud
now: while the player runs, and for four seconds after, the Warden walks
straight for the room they are in whatever the alarm says. Nothing about it
is permanent - stop, and it loses you - which is what makes it a different
cost from a gem.

**The bargain.** Every gem taken raises the floor's alarm, and the alarm is
the only thing the Warden reads. Six gems fully rouse it, and the shallowest
floor holds ten, so the back half of any floor is worked against a Warden
that hunts rather than wanders, steps between rooms every four seconds
instead of nine, and crosses a room at 4.4 units a second. Deeper floors
start part-roused, so the third needs only one gem to set it hunting. The
player walks at 5 and runs at 8, so it can never simply catch someone who
keeps moving. It wins by being in the doorway you wanted.

That is the whole decision the game asks, once a room: the toll is paid,
the exit is open, and there are four more gems on this floor. Do you go
back for them?

**Three things push back in different ways.** The Warden roams and makes
you leave a floor. The Sentry is nailed down and makes you time your
crossing of a room; it never takes a life, only rouses the floor. The arena
is a fixed fourteen seconds of keeping ahead of turning spikes, once, when
you choose to start it.

**Identification pays now.** About twenty-two chests over a run against
eight kinds of item means duplicates are common, so learning that the inky
bottle is healing is knowledge you will get to use. Earlier this was not
true and the report said so.

**What each thing costs.**

| | Cost | What it buys |
| --- | --- | --- |
| Exit, floor 1 / 2 / 3 | 3 / 5 / 7 gems | The way down, and the way out |
| A life | 1 gem | One more mistake |
| A name for an item | 1 gem | Knowing without spending it |
| A chest | free | One potion or scroll, contents unknown |
| A vault | one iron key, found on the floor | A room with three chests and a gem |
| Warden's Lantern | 2 gems | Always knowing which room it is in |
| Robber's Chart | 2 gems | Rooms that still hold a gem, on the map |
| Soft Boots | 3 gems | A quarter more speed |
| Bone Charm | 3 gems | The first hit on each floor |
| Ash Censer | 4 gems | Gems rouse the floor half as much |
| Toll Ledger | 4 gems | A gem off every exit |

Relic prices rise by one per floor. The shop offers two, fixed per floor
and per seed, so a shop is the same shop every time you walk back into it.

## 2. What three independent code reviews found

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

A third review, after five rounds of additions, found ten more. The worst
were all one bug class - a fact computed twice from different premises,
which is exactly what ARCHITECTURE.md is written against:

- **The minimap turned the wrong way.** SVG rotation by the camera's yaw
  puts the facing direction at the top; the code used minus that, so the
  map was mirrored east to west. It was right when facing north or south,
  which is why looking at it did not catch it.
- **The arena had four safe corners.** Its arms swept circles out to the
  drawn floor, but its walls are a square whatever shape the floor is, so
  a player could stand in a corner the rings never reached - in the one
  room whose whole promise is that there is nowhere safe to stand.
- **The run's seed was destroyed on the way down.** Each floor generates
  from a seed derived from the last, and the summary was showing that
  rather than the run's, so every "same dungeon again" replayed a dungeon
  nobody had played.
- **The Sentry's beam angle was `Math.random()`**, so a replayed seed put
  the watchers back in the right places pointing the wrong ways.
- **The arena's cleanup timer was cancelled by the unmount that needed
  it**, so dying to the arms and starting a new run left its hint pinned to
  the screen.
- **Timed potions ran on wall time**, so twenty seconds in the pause menu
  spent a Potion of Swiftness. The run now owns a clock that stops.
- The Sentry wrote the alarm directly rather than through the store, the
  gem could be collected mid-transition, one array was holding both "the
  key has been taken" and "this door is open", and the shop would sell a
  life that left a player under the toll on a floor with no gems left.

All ten are fixed, and the tests grew to match: the arena's arms must reach
the corners of the box, a replayed seed must reproduce every watcher's beam
angle, the run's seed must survive a descent, and a pause must not spend a
potion.

Twenty-nine more turned up on the next passes, all of them things nobody
had looked at because the tests were green:

- **Every floor in the game was a smeared barcode.** Surfaces were filtered
  at a fixed anisotropy of 4, which is not enough for a plane seen almost
  edge-on - which is how a first-person player sees the floor for the entire
  game. It collapsed into wide bands running to the horizon. The filtering
  is now taken from the renderer's own maximum, and the floor reads as
  flagstones. It was only found by taking a screenshot at eye level; every
  earlier screenshot had been from above.
- **A thrown noise never stopped being thrown.** The Scroll of Echoes sends
  the Warden to a room and the rule is that it stops caring when it gets
  there and finds nothing - but the lure was only masked while it stood in
  that room, not cleared. The step after it arrived, the lure came back, and
  it walked in circles around an empty room until the timer ran out, with
  the HUD flickering between two labels every step. It is cleared on
  arrival now, and on anything else that repositions the Warden.
- **Two systems both claimed the Warden's attention, and the weaker one
  won.** A Sentry's whole stated purpose is to tell the Warden where the
  player is, but a lure kept it walking the other way - so standing in the
  light after throwing a scroll cost the alarm and bought nothing. Being
  told where the player is now outranks a noise: the store has one action
  for "something gave the player away", and the watcher and the Potion of
  Dread both go through it.
- **A treasure room shipped three chests and showed two.** An authored
  template's props are filtered by the same rules as the seeded dressing,
  and the gem takes a seeded anchor - so on some floors the gem landed
  1.56 units from the template's first chest, inside the 1.6 a solid prop
  must keep clear, and the chest was dropped. Silently, on some seeds only,
  in the one room kind whose whole point is chests. The gem and the key now
  keep clear of what an author placed, the template is re-authored off the
  anchor diagonals, and `yarn test:layout` validates every shipped template
  over sixty seeds.
- **A single authored room replaced a whole kind.** The generator preferred
  a template whenever one existed for the kind, so every treasure room in
  the game was the same authored room and the two seeded treasure
  arrangements were unreachable. The seeded arrangement is one of the
  options now.
- **A burned book could be read again.** Losing the library's number
  puzzle - out of misses or out of clock - and closing it with Escape were
  the same callback, so the run recorded neither and the room was never
  marked failed. Walk out, walk back in, and the same gem was there for
  another go. The memory trial and the challenge room had always recorded
  their own failures; the library was the third place and it had been
  missed. There are three ways out of the tome now, not two.
- **The tool could not tell an author what the game would throw away.** The
  Room Builder validated a template as JSON - right kinds, right size - and
  said nothing about the placement rules, which are what actually decide
  whether a prop appears. So the tool would happily let you build a room
  that renders half empty. That is why the templates before this were
  written by editing JSON by hand, and it is the same silence that hid the
  missing chest. The rules have one owner now, and the builder shows them.
- **A Steam launch configured from our own instructions would not have
  started the game.** The Linux executable was named after the npm package -
  `threejs-gem-dungeon-editor` - because nothing told the builder otherwise,
  while `steam/README.md` told whoever set up the store page to launch
  `gem-dungeon`. Nobody had ever looked inside the package. The build config
  names it deliberately now, and `yarn test:desktop` holds the document and
  the artifact to each other.
- **The layout check was not checking the game's dungeons.** It never
  registered the shipped room templates, and the generator draws a random
  number when it asks for templates by kind - so with an empty registry it
  produced a different dungeon for the same seed. Every dungeon those 500
  seeds validated was one the game would never build. It registers them now
  and fails if none of the 500 contains an authored room.
- **The middle of every room was empty, in every room, always.** Nothing may
  stand in the path between two doorways, and the rule that enforced it
  reserved all four doorways in every room regardless of which doors the
  room actually had. Everything a room holds has to stand clear of the
  lanes, so everything a room holds stood in one of four diagonal quadrants
  and the band across the middle - the part a player walks down and looks
  along - was bare floor in all 2,054 rooms measured. Two in five of them
  have doors on one axis only and never needed the other lane at all. The
  rule reads the room's doors now, and those rooms get a pair of anchors
  either side of the way through.
- **You could not start the game with a controller.** The demo targets
  Steam and the Deck, which has no keyboard, and the run itself has read a
  standard gamepad mapping since long before this tree existed - stick to
  walk, A to use, Start to pause. None of that reached the DOM. Every menu
  is a column of `<button onClick>` with no focus handling and nothing
  under `src/ui` had ever read the pad, so a player holding a controller
  could not press Start on the title screen, resume after pausing, quit, or
  restart after dying. The game was unplayable with the only input a Deck
  has, from its first screen, and every check we had passed because they
  all type. Menus take the d-pad, A and B now, and `yarn test:pad` plays
  the game with a synthetic pad - on the dev build and on the packaged
  Linux build a Deck would actually run.
- **Button presses were dropped in proportion to how busy the frame was.**
  The pad was polled by whichever system read it first, memoised on a 4ms
  wall-clock window, with rising edges computed against the previous poll -
  so when two of the four readers in a frame fell more than four
  milliseconds apart, the second re-polled, saw the button already down and
  reported nothing. A did nothing, intermittently, more often the more work
  the frame had in it, which is the worst possible shape for an input bug.
  Scene even carried a comment warning the next person not to add a reader
  rather than fixing it. One animation frame, one poll, edges true for
  exactly one frame, and `readGamepad` is a read: four readers spread
  across a frame now see one press four times out of four.
- **A run is 34 rooms and 24 of them looked different.** Named twice in this
  document as "the same props in the same quadrants" without anyone
  measuring it, which is how a hunch becomes received wisdom. Measured over
  120 runs: a player walks through 34.6 rooms of which 24.1 look different,
  the first room that looks like one already seen arrives at room 11.7 - in
  120 runs out of 120 - and only 98 distinct room appearances exist in the
  whole game, the most common of them, the authored hall, being one room in
  every twelve. The cause was not the fifteen props. Every room of a kind at
  a given size rendered in exactly the same corners, because the anchors
  were the same four points in every room. They are read in a seeded order
  now - four quarter turns and a mirror, and the whole frame turns together,
  so the gem, the braziers, the shop's counter and an authored template all
  turn with the dressing and a turned room is still a room somebody laid
  out.

  The figures first written here for that change - 23.0 rooms of 34.4
  looking different before, 31.4 after - came from an instrument with a bug
  in it: the probe passed the run's seed to all three floors, where the game
  derives a new one for each, so it generated the same dungeon three times
  and reported its own mistake as the game repeating itself. Re-measured
  with that fixed, and the same instrument pointed at all three trees: 24.1
  of 34.6 rooms looked different before the turn, 32.1 after it, and the
  first repeat moved from room 11.7 to room 18.1. The direction was right
  and the numbers were not.
- **The check for the core loop was a hope.** "Collected gems while
  exploring" asserted that the random walker had picked up at least one gem
  on its way between doorways, which is a matter of luck: it came up empty
  about one run in five, and a check that says the core loop is broken on a
  fifth of runs is one people stop reading. It walks to a gem now - in a
  room that still has one, chosen from the store rather than from wherever
  the walker stopped - so taking it is the thing being tested rather than a
  side effect of wandering.
- **The shop would sell you into a floor you could not leave.** The economy
  had never been measured. Over 400 seeds a floor, counting only the gems a
  player is guaranteed - not behind the locked vault, not a reward for
  solving a puzzle or surviving the arena - every floor could be paid for,
  but a quarter of seeds on every floor left exactly one spare gem and the
  third floor could leave none: a seed where paying the exit means taking
  literally every gem, which is exactly what wakes the Warden, on the floor
  that starts at alarm 2. The third floor holds one more room now, so its
  worst seed leaves two, and the invariant is checked rather than hoped for.

  Underneath that, the rule that you may not spend yourself below the toll -
  which the shop's life purchase enforces, with a refusal written for it -
  was not applied to the other two things the shop sells. Naming what you
  are carrying costs a gem and a relic costs several, and neither asked. On
  a floor with one gem to spare, either would strand a run. The rule has one
  owner now and all three ask it.
- **Twenty-five sounds, and nothing had ever listened to one.** The whole
  sound design is synthesised - a few oscillators and an envelope each, no
  audio files - which is a nice property and also means there is no asset
  whose absence would be obvious. A build that shipped silent would have
  passed every check this project had. `yarn test:audio` taps whatever
  connects to the speakers, before the app loads, and measures samples: the
  context is running, all 25 cues are heard over the room, the cues a player
  is meant to notice are well clear of it, the held Warden sound starts and
  stops, muting silences everything including the bed, the bed opens up when
  the floor is roused, and no cue exists that nothing plays.
- **A footstep was quieter than the room it played into.** Measured at 1.2
  times the ambient bed - the most frequent sound in the game, and a walking
  player could not hear themselves walk. It is at about twice the bed now,
  still the quietest thing the game plays on purpose, which is right for a
  sound that happens every stride.
- **Being seen was quieter than picking something up.** A Sentry calling out
  measured 0.078 against a gem's 0.170, which is the wrong way round by some
  distance: taking a gem is a thing you chose to do, and being seen is a
  thing that happens to you and changes the rest of the floor. The thrown
  scroll's clatter, whose only job is to say the noise happened over there,
  was at not quite twice the room. Both are up.
- **A check that was talking to a different copy of the program.** The bed
  check called `ambience.setTension` through its own `import()` of the audio
  module - and the dev server hands the running app an updated module after
  an edit and a bare import the original, so every call went to a second,
  never-started bed and returned immediately. It read as the bed not
  responding to the alarm, and the game's tuning was nearly changed on the
  strength of it; the replacement numbers measured slightly worse once the
  check was fixed, and were reverted. It talks to the probe now, and the bed
  turns out to put 2.4 times the energy into 420-900Hz on a roused floor.
- **And three measurements of the same thing that each said something
  different.** A 600ms peak of the bed disagreed with itself one run in
  three; a long average read the change as 1.5%; a long peak read it as
  nothing. The bed's own low-pass is wobbled at 0.07Hz - a fourteen-second
  cycle - so its level wanders by more than the alarm moves it. The control
  that settled it was stopping the bed and watching the level go up. What
  the tension does is open a filter, so the check looks at the spectrum, and
  three runs now agree to within one per cent.
- **A room built eighty-five geometries and eighty-five materials, for
  thirty-two shapes, and threw them all away on the way out.** The perf
  budget had been named as the thing now limiting content - the worst room
  was at 60 draw calls of 72 - so the room was measured before anything was
  done about it. 85 visible meshes, 85 distinct geometry objects, 85
  distinct material objects, 32 distinct shapes, all of it allocated when
  the room mounted and discarded when the player walked out, and allocated
  again in the next room. The same cost this project has already paid twice:
  once for procedural textures regenerated per room, once for the fifteen
  rigid bodies that are now one static body. The props share their shapes
  and their materials now - 43 geometries and 38 materials for the whole
  program - and the count stopped moving: walking a floor four times over
  read 56 then 56, where the leak guard had been written to tolerate twelve
  of drift because the number genuinely wandered. It is strict now.
  Sharing did almost nothing for draw calls, which is what the budget
  actually measures, and saying so is the point: the draw calls were the
  braziers. Four per room, seven identical meshes each, in every room in the
  game, before any furniture - 28 of them. They are one instanced set now,
  five draws, and the worst room went from 60 to 51.
- **Five more props moved the tail and not the number.** The last thing this
  document kept naming was the fifteen props, so five more were added - a
  crate, a statue, an urn, rubble and a banner - along with a fourth
  arrangement for chambers and a third for vaults and traps. Distinct room
  appearances went from 555 to 637 and the numbers that matter did not move
  at all: still 32 of 34.6 rooms looking different, first repeat still at
  room 18. Which is the useful half of measuring something: the repetition
  left in a run was not coming from the common rooms. It was coming from the
  set pieces, one per floor and three per run, with one arrangement each -
  and from the start room, which the generator names `start` and digs at the
  grid origin on every floor, so it drew the same orientation all three
  times. A room carries its dungeon's seed now, and every set piece has a
  second dressing with its content left where it was. 33.0 of 34.6 rooms
  look different, the first repeat moves to room 20.7, only 95 runs in 120
  repeat at all, and the most common look is 1.4% of rooms rather than 8.2%
  before any of this.
- **The instrument had a bug, and it had been reported from.** The probe
  behind those measurements passed the run's seed to all three floors, where
  the game derives a new one per floor - so it generated the same dungeon
  three times and read that back as the game repeating itself. It made the
  start room look like it repeated in 120 runs out of 120. The figures in
  the entry above are re-measured with it fixed, and the entry says what the
  old ones were.
- **A harness that said the built site does not load, on one run in five.**
  The production check retried its first page load forty times with nothing
  in between, and a connection to a port nothing is listening on is refused
  immediately - so all forty attempts were spent inside a second while
  `vite preview` was still binding. Everything after it passed, because by
  then the server was up. One red line in an otherwise green run, saying
  the thing that ships does not load, which is the kind of flake people
  learn to ignore rather than chase. It waits between attempts now: three
  consecutive runs green, having reproduced it first.
- **Props stood inside each other, and every check said they did not.**
  `PROP_SPECS` has carried a footprint radius for every prop since the specs
  were split out, and nothing that placed a prop had ever read one: the
  anchor rings were spaced by four magic numbers, none of which was the size
  of anything. The widest furnishing is a metre from its centre to its edge,
  and the numbers assumed 0.9 - so in every fourteen-unit room the generator
  made, a table on the outer ring stood inside a bookshelf on the inner one;
  a table on the inner ring reached a hand's width into a door lane; and in
  every sixteen-unit circle a table went clean through a brazier, because a
  shaped room's floor is cut off exactly where the braziers stand and they
  had been pulled inside the furniture to sit on it. Solid props are merged
  into the room's one collider body, so two of them overlapping is a
  collision shape as well as a picture. The rings are derived from the props
  now, the braziers are outermost by construction, and the check walks every
  arrangement in every room the generator can make: 360 of 1,440 of them had
  a pair standing inside each other.
- **The shipped hall lost its wall.** The same footprint rule, applied to
  the authoring path, found a wall segment and a table in `hall-a` reaching
  into a doorway - the wall by 0.85 of its three-unit width. In a room with
  east and west doors the game would have dropped both, silently, which is
  the third time this project has found content going missing that way. The
  Room Builder measures from a prop's edge now, and both moved by less than
  a unit.
- **Hexagonal rooms had been costed out by five centimetres.** `shapeFits`
  asked whether the outer ring of props fitted inside the floor a shape
  draws, and measured that floor in its narrowest direction - while every
  anchor stands on a diagonal, where the floor is wider. Widening the rings
  tipped hexagons at sixteen units just over the line and they vanished from
  the game, 8% of every dungeon. The floor's reach is computed for the
  direction actually being asked about now, and the shape mix came back
  exactly as it was: 56% square, 25% circle, 11% octagon, 8% hexagon.
- **No bookshelf in the game has ever shown a book.** Its four rows of
  colour were modelled at z = 0.05 inside a carcass 0.45 deep, so every one
  of them was buried in the box: from any angle a bookshelf was a plain
  brown slab, including the three standing in a row in the library. Worse,
  once the books were pushed out to the front face it was clear the
  library's three had been turned to face their own corners since the day
  they were written - which nobody could see while both sides looked
  identical. There is one rule now for which way a thing with a front
  faces, and the library, the shop and the new middle pair all use it. Found
  by standing in the middle of a room and looking at what this cycle had
  just put there.
- **An unidentified potion broke the game's own promise.** The Warden's
  comment in `world.ts` said its chase speed stays under a walk at every
  alarm level, so a player who keeps moving is never simply caught. That was
  written when the game had two speeds in it. A Potion of Mire at 0.55 left
  a player walking at 2.75 and sprinting at 4.40 against a fully roused
  Warden at 4.40 - slower on foot, and exactly level at a sprint, which is
  also the thing that keeps the Warden pointed at you. In a game whose only
  verb against the Warden is running, on a floor that arrives at alarm 2,
  from a bottle you cannot identify without drinking it, there was no play
  to make. 0.55 was the precise breaking point: anything above it gets away.

  The multiplier is 0.65 now - a mired sprint of 5.20 against 4.40, and a
  mired walk of 3.25 that still loses to a hunting floor, so the potion
  keeps its teeth. But the number was never the problem; three files tuned
  separately were. The relics scale the walk, the potions scale it again,
  and the Warden's curve is a third file, and nothing had ever compared
  them. `systems/pace.ts` owns the comparison, `yarn test:layout` walks all
  2,496 combinations of 64 relic sets, 3 potions and 13 alarm levels, and
  the promise is now one line that can be checked rather than a paragraph
  that could quietly stop being true: **a sprint always gets away, a walk
  does not.** Both halves are asserted - the first because there must always
  be an answer to the Warden, the second because a Warden that cannot catch
  a walking player is furniture. Run against the old 0.55 the check reports
  32 of 2,496 combinations caught at a sprint; run against a mire of 0.9 it
  reports the potion costing nothing.

- **The safest ground in the arena was the plinth you had just robbed.** The
  arena bars its doors, sets three arms of spikes sweeping the whole floor
  for fourteen seconds, and pins a hint to the screen saying *keep walking*.
  The innermost ring of spikes sat 2.4 out and a patch reaches 1.2, so no
  arm ever came within 1.2 of the middle - and a player against the plinth
  stands 0.8 from its axis. That is not an obscure corner: it is the exact
  spot you are standing on when you lift the gem that starts the arms.
  Driven in the running game, standing still where the gem was: seventeen
  seconds, three lives in, three lives out. Doing nothing was the winning
  play in the game's only set piece.

  What makes this one worth writing down is that there was already a check.
  It is called *the arms cover everywhere the player can stand*, it ran on
  every room size, and it passed - because it measured the outermost ring
  against the corner of the box and the gap between rings against a
  player's width, and never once asked about the inside. It also carried
  its own copy of the loop that lays the rings out, which is the same
  one-owner failure the bug itself was. `arena/sweep.ts` owns where the
  patches go now, the room and the check both read it, and the question is
  asked as a sweep of every radius a player can occupy rather than as three
  spot measurements. Only the radius matters - an arm passes every angle
  once a turn - which is what makes it answerable at all.

  The innermost ring is 1.8 now, which puts the plinth's shadow inside a
  patch's reach with 0.2 to spare, and costs nothing: the largest arena
  lays the same eight rings it did before, and the perf budget is
  unchanged. The room is now the two lines it always claimed to be, both
  checked: **there is always a circle you can walk, and there is no spot
  you can stand.** The first reads the slowest walk in the game out of
  `systems/pace.ts` rather than `WALK_SPEED`, because the cycle before this
  one established that a potion can halve it - the tightest circle needs
  0.90 units a second against a mired 3.25. The second is the sweep. Run
  against the shipped 2.4 the layout check reports a player standing 0.80
  from the middle untouched, and the played check reports 0 hits where it
  now reports 5.

  Two smaller things fell out of it. The paragraph in `world.ts` describing
  the room's difficulty curve had drifted from the numbers: it said the
  wall needs 8, which is exactly a dash, when at the arena's actual size it
  needs 8.77, which is more than a dash - so the outer half of the room
  cannot be held at all without a Potion of Swiftness, which is a better
  fact than the one that was written. It is measured in the check now
  rather than asserted in prose. And the corners the last cycle of this
  room went after are genuinely covered: at every size, the last ring lands
  within a patch's reach of the furthest standable corner and no further.

- **A controller could open the tome, read the numbers, and then sit
  there.** The library's tome - one of the ten kinds of room the game
  builds, and the only one that pays a gem for a puzzle - listened for
  digits on the window and drew nothing to press. There was no way to
  answer it without a keyboard, in a demo aimed at a machine that has none.
  It is the same hole, in the same shape, as the title screen a controller
  could not start, and it survived that cycle because the check written
  then plays the menus and the run and never opens a book.

  Next to it, a smaller one of the same kind: the satchel holds four and
  the pad was bound to two of them, X and Y. A player on a Deck who filled
  their satchel could drink the first two things they found and nothing
  else, for the rest of the run. Four slots, four buttons now - X, Y and
  the two shoulders - and the list of buttons is as long as `SATCHEL_SLOTS`
  says the satchel is, rather than a pair of fields that happened to be
  written twice.

  The tome has an on-screen keypad that the d-pad drives, and `usePadMenu`
  learned what a grid is: left and right move one key, up and down move a
  row. `yarn test:pad` now plays the whole thing on the pad alone - A at
  the lectern to open it, the d-pad and A across the keys - and the run
  reports the room cleared and a gem paid. Run against the code as shipped,
  it reports no keypad and no gem, and the satchel check reports the third
  and fourth slots consuming nothing.

  Three things this turned up on the way, all of them mine to begin with.
  The commit key was `disabled` while no digit was pending, and a disabled
  button is not focusable - so the grid was eleven keys one moment and
  twelve the next and the d-pad landed somewhere different depending on
  what had been typed. It is dimmed and reachable now, which is also the
  right answer for a player. The first version of the satchel check pressed
  X before RB, and using a slot closes the gap, so the fourth was empty by
  the time it was tested and the check reported the bug whether or not the
  bug was there. And the keypad's keys refuse focus from a mouse click, so
  a player who clicks one and then presses Space does not press it a second
  time as well as committing.

  One real change came out of it. The tome's clock ran from the moment it
  opened, so five to seven seconds of the limit were spent looking at
  numbers that could not yet be answered, with the countdown visibly
  ticking. That was merely ungenerous while typing was the only way in;
  with keys on screen it takes several presses to enter what a keyboard
  enters in one, so the head start came out of the slower input's time and
  not the faster one's. The clock starts when the answering does.

  What it is *not*: the check measures 24 seconds to enter five numbers on
  this machine, which renders through a software rasteriser at a few frames
  a second. That is the harness, not the game - at a Deck's frame rate the
  same walk is a few seconds - and the clock was not touched to
  accommodate it. The harness renders at 800x600 instead of 1280x800
  instead, which is its own business: nothing in it reads a layout.

  Left keyboard-only at the time: the seed box on the Records page, which
  the cycle after this one closed.

- **Nobody had ever finished the game.** Every check in this project drives
  a piece of it - a room, a puzzle, a purchase, a sound, a gamepad - and the
  one thing a player actually does, start at the top and come out of the
  bottom, was the one thing nothing did. The evidence that the demo could be
  completed was this line, in the smoke test:

  ```
  run.setState({ gems: 9, floor: 3, currentRoomId: d.endId })
  ```

  which is not finishing the game. It is telling the game it has been
  finished, and it would have gone on passing if the third floor's toll had
  been set past what the floor holds, if a door had stopped charging, or if
  the exit had stopped noticing the last floor.

  `yarn test:run` walks it instead. It reads the dungeon the way a player
  reads the map, plans a route to a room that still holds a gem, goes and
  takes it, and when it can afford the door it goes and pays - three floors,
  ending on the victory screen. Doors are taken by standing in them and
  pressing E. Nothing is set on the run except lives.

  It comes out the far side on all three seeds. **A finished run is 21 to 24
  rooms entered, 26 to 41 doors taken, and exactly 15 gems** - which is 3
  plus 5 plus 7, the three tolls to the gem. A player who takes only what
  the doors ask for banks nothing at all; every point of score in the game
  is something taken beyond the price of leaving, which is the decision the
  whole design is built on and is now a measured fact rather than an
  intention. Run against a third floor whose toll is raised past what it
  holds, the check reports the walker taking every gem on the floor and
  never reaching the exit.

  What it does not say is that you can *survive* it. Lives are topped up,
  because the walker makes no attempt to evade the Warden and a check that
  fails at random is worse than no check - it reports how often it had to,
  which is one to five times a run. Nor is the two and a half minutes it
  takes a run length: this machine has no GPU, and the walker steps between
  doorways rather than crossing rooms on foot. Rooms, doors and gems are
  what it measured.

  The bug in it was mine and worth recording. The walker runs inside the
  page - fifty teleports and waits a floor, each one a round trip if driven
  from node - and asks node for the one thing it cannot do, a real key
  press. The first version had node listening for that request on a fixed
  budget rather than until the walk finished, so a floor crossed in twenty
  seconds still cost a hundred and fifty and the whole check took twenty
  minutes. It was waiting on a clock instead of on the thing it was waiting
  for.

- **Being caught by the Warden sounded exactly like walking into spikes.**
  Everything in this game that is not state goes over one typed bus, and
  nothing had ever asked whether its two ends match up. Three of the
  thirty-three events did not. `wardenStruck` has been emitted since the
  Warden could land a hit and **nothing anywhere listened to it** - so the
  single most dramatic thing that can happen in a run, the thing the entire
  floor is built around, was presented with the same sound, the same flash
  and the same shake as stepping on a spike. `alarmRaised` was emitted
  twice into nothing. `hazard` was declared and never emitted at all.

  TypeScript is happy with all three: a typed bus checks what an event
  carries, not whether anybody is at the far end. It is the same shape of
  hole as a quarter of the sound cues never being played, which nothing
  noticed either until a check went looking.

  The Warden's strike has a voice now - the lowest and longest thing in the
  game, playing *over* the ordinary damage rather than instead of it, so a
  hit is still a hit and this is what hit you. It measures 0.29 to 0.31
  against `hurt`'s 0.20, which makes it the loudest moment the game has,
  which is right. The other two are deleted; a rule with no listener is
  dead weight, and the check now enforces that. `yarn test:layout` reads
  the bus's declarations off the source and greps the tree for both ends of
  each: run against the code as shipped it names all three, by name.

  **The check I wrote for it was wrong twice, and that is the part worth
  keeping.** The first version landed a real strike and asked whether the
  result was louder than the room - and it passed with the listener
  deleted, because a strike also does damage and `hurt` on its own is over
  that line. It was measuring that *something* happened, not that *this*
  happened, which is precisely the failure the audio harness was built to
  end. The second tried to be clever: the strike is 55 and 82Hz and
  `hurt` is a 220Hz square, so the bottom two octaves should say whether
  the Warden's own voice played. But the ambient bed sits in those same
  octaves and swamped it - 0.65 against 0.60 - and stopping the bed still
  left the band reading 0.24. What works is the plainest thing available:
  play `hurt` alone, then land a real strike, and compare the two peaks
  under identical conditions. 1.33 to 1.68 times wired up, 1.05 with the
  one line removed.

- **What actually takes a life, and the last hazard nobody had measured.**
  The run-through said the walker had to be picked up one to five times a
  run and nothing said by what, which describes a run as dangerous without
  saying what is dangerous about it. Now that the Warden announces its own
  hits, every life lost can be attributed: **five to seven of every eight
  hits in a finished run come from the Warden**, and the rest from a trap
  room's spikes. The demo's danger is the thing the demo is about, which is
  worth knowing rather than assuming.

  The first version of that measurement said the exact opposite - **zero**
  hits from the Warden, and hits in treasure and library rooms, which have
  nothing in them that can hurt anybody. `wardenStrike` calls `damage`
  first and announces itself second, so a listener that asks "was there a
  strike just now" when the damage arrives always hears no. Every Warden
  hit was being labelled with the room it happened in. The strike relabels
  the hit it caused instead. An impossible number in the output - a hit in
  a room with no hazard in it - is what gave it away.

  That left one number that was not an artefact: **the Sentry called out
  zero times across three complete runs.** It is placed - none on the first
  floor by design, two to six rooms on the second and third - so the zero
  is the walker, which steps between doorways and gems and never stands
  anywhere for the nine tenths of a second the Sentry needs. Said plainly
  in the output rather than left to look like a bug.

  But it did point at the one thing in the game that had never been
  measured at all. The Warden's promise is checked in `systems/pace.ts`,
  the arena's in `arena/sweep.ts`, and the Sentry was four constants in
  `world.ts` and a paragraph saying the room is "about judging it".
  `sentry/beam.ts` says what they mean together, and `yarn test:layout`
  holds them to one line: **standing still in the light is always seen, and
  walking out of it never is.** Both halves matter - a beam that sweeps
  past faster than it can call is a light show, and a beam nobody can leave
  is a toll rather than a decision.

  Both hold, and the second is thinner than it looks: at the far edge of
  the beam's reach a walk takes **0.84 seconds** to cross out of it against
  the **0.9** the Sentry waits, a margin of six hundredths of a second. That
  is the room working as designed - it is about judging it - but it was a
  coincidence of four numbers tuned separately and is now a written-down
  invariant that a change to any of them will trip. Nothing was retuned on
  the strength of a fresh measurement. The exception is mire, which pushes
  the same crossing to 0.99 seconds and makes the outer half of the beam's
  reach genuinely inescapable: the check asserts that too, because a cruel
  potion that costs nothing in the room built around moving is not cruel.

- **The last screen a controller could not use.** Three cycles of gamepad
  work went past the seed box on the Records page, each one writing down
  that it was still keyboard-only: a d-pad could put the focus in the box
  and then there was nothing it could do. It is a convenience rather than a
  room you cannot finish, which is exactly why it kept being left - and
  three notes saying "still keyboard-only" is a thing nobody is going to
  fix by accident.

  What actually blocked it was the pad's navigation. Menus in this game
  were a column of buttons, so moving meant "one place along, either axis";
  the tome's keypad made that a grid, so it took a column count. The
  Records page is neither - a box, a keypad, and buttons underneath - and
  no column count describes it. So the rows are read off the page instead:
  anything whose box overlaps another's vertically is on the same row,
  left and right move within a row, up and down go to the nearest thing by
  horizontal centre on the row above or below. A column of buttons is then
  just a page where every row holds one thing and behaves exactly as it
  did. The `columns` parameter is gone.

  Laying it out then mattered as much as the code. `Run it` sat beside the
  box, which is where a mouse looks for it and nowhere a d-pad pressing
  down will ever arrive. The page is a sequence now - box, keys, run it,
  the rest - so holding one direction walks all of it. `yarn test:pad`
  types 407 on the pad, a digit from a different row of the keypad each
  time, and asserts the run that starts is dungeon 407.

  And one more check that passed on broken code, which is becoming this
  project's most reliable kind of bug. "Every digit of a seed can be
  reached" walked the keypad by index, and with no keypad on the page
  `indexOf` returns -1 and so does "where is the focus": it walked zero
  steps, decided it had arrived, and passed on a page with no keys on it at
  all. It asserts the keys exist first now. Run against the page as it was,
  three checks fail rather than one.

- **The lock that paid nothing.** Every floor puts one door behind a key.
  What was behind it was whatever room the floor could be walked without,
  furnished as whatever kind it happened to be - and nobody had ever asked
  what that came to. Over 899 locked rooms: **a vault held 0.97 chests, an
  ordinary chamber 0.90, and the treasure rooms standing open elsewhere on
  the same floors held 2.35.** The key bought you the price of any room on
  the floor, which is to say nothing, and 71% of the time the room behind
  the lock was not a treasure room at all - the generator wants one, but
  eligibility (off the critical path, and sparable without cutting the
  floor in two) rules them out. The code that fills the chests carried a
  comment about "the vault, with three of them, finally worth its name",
  written on an assumption that held less than a third of the time.

  Being the vault decides the furniture now, not the kind the room was
  drawn as. A set piece keeps its own content - a locked shop is still a
  shop - and gets a treasure room's chests around it. That takes a vault to
  **1.85 chests against an ordinary chamber's 0.89**.

  Two things fell out of doing it, both caught by the check rather than by
  me. Dressing a set piece as a treasure room can *fail*: its chests have
  to fit around what the room already holds, and two locked rooms in 360
  came out with **less** in them than they would have had unlocked. It
  takes whichever dressing is richer now, so the lock never removes
  anything. And 8% of vaults ended up with no chest at all, every one of
  them a set piece whose anchors were all spoken for. One chest goes back
  where there is room for it; the rest are locked challenge rooms, memory
  trials and shops, whose own content is the reward. That is the line the
  check holds: a locked room is never a plain chamber with nothing extra in
  it. Run against the code as shipped it names them - "normal on floor 1 of
  seed 24, trap on floor 3 of seed 25" - rooms you find a key for and open
  onto nothing.

- **A performance check that failed one run in three.** Found while
  verifying the above, and worth more than it. "Walking the floor four
  times over does not pile up geometries" took the count after one lap as
  its baseline, on the premise that one lap visits every room and builds
  every shape. True of a machine that can draw them: this one renders
  through a software rasteriser, and on a loaded run a room had not
  finished mounting before the walker moved on, so the baseline read 43
  where a settled one reads 55 - and the twelve shapes built on later laps
  were reported as a leak. The question it is actually asking does not need
  the first lap to be special, so it laps until two in a row agree and
  measures from there. Three runs, three passes, and the warm-up needed one
  lap twice and three once - which is the flake, made visible instead of
  fatal.

One thing is deliberately not automated. The challenge room's other half -
weight the plate with a candle, then take the idol for a gem instead of a
life - is verified by hand only. Putting a carried thing down places it
where the camera is aimed, and the plate is a metre and a half across on
top of an altar with a body of its own, so a probe that teleports and turns
can stand where the prompt reads "put down the candle" and still not have
an aim the drop accepts. Four approaches were tried. A check that passes on
some of them is a check nobody will trust, which is what the heap
measurement and the walk to the exit both taught, so the automated half is
the half that is solid: the trap springs, the candle lifts, and carrying it
to the plate offers to put it down.

## 3. What the automated walkthrough does

`scripts/smoke-test.mjs` plays a run the way a player does, with the
keyboard: it walks to doorways and presses E, prefers doors to rooms it has
not seen, picks up gems by walking into them, tries the exit unpaid and
paid, descends, wins from the last floor, restarts, and dies. It then
drives the systems that a random walk would not reliably reach - the toll
curve, relics, the satchel, the arena's doors barring and letting go, the
vault and its key, the records, and where the Sentries are. A hundred and
four checks pass on the current build.

One thing in it is a fixture rather than a test: the walker stands still to
sample the floor and to read a prompt, and standing still is how you die
here - on spikes, in the arena, or to a Warden its own gem-taking roused -
so it is kept on its feet through every phase that stands still. That used
to cover the exploration loop only, until a run lost all three lives on the
walk to the exit and reported the exit door as having no prompt: a check
failing for a reason it was not about, roughly one run in ten. Dying has
its own checks further down.

`yarn test:layout` needs no browser and guards the geometry over every room
size, every shape, all fifteen combinations of doors and 500 seeds: anchors
clear of the door lanes and on the floor a shaped room actually draws,
nothing standing in a lane the room it is in actually has, spikes in every
trap room, the gem reachable without touching one, the generator connected,
and a vault that never blocks the way to the exit.

## 4. What every room looks like

Captured from the doorway on a software renderer; a real GPU is brighter
and smoother.

| Kind | What the player finds |
| --- | --- |
| ![start](docs/playtest/room-start.png) | **Start.** A table, a chest, braziers, two glowing doorways. The hint says how to look. |
| ![normal](docs/playtest/sentry.png) | **Chamber.** A gem, a chest, and from the second floor down often a watcher turning a beam around the room. |
| ![treasure](docs/playtest/room-treasure.png) | **Vault.** Chests and a crystal; an authored layout from the Room Builder ships here. |
| ![shop](docs/playtest/room-shop.png) | **Shop.** A counter that sells a life for a gem. |
| ![library](docs/playtest/room-library.png) | **Library.** A lectern opens the number puzzle; solving it pays a gem. The red frame is a locked exit. |
| ![trap](docs/playtest/room-trap.png) | **Trap room.** A ring of spikes between the doors and the gem. |
| ![arena](docs/playtest/arena-gauntlet.png) | **Arena.** A plinth in the middle. Lifting its gem bars the doors and sets three arms of spikes turning. |
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
- **Is the Sentry read or endured?** Its beam is drawn on the floor so it
  can be judged. If players walk through it rather than round it, either
  the wedge is not visible enough or the alarm it costs is too cheap to
  care about.
- **Does anyone chase a personal best?** The records screen is the only
  reason to play a fourth run once the novelty of the first three is gone.
  If people ignore it, the demo needs a reason to replay that is inside the
  dungeon rather than beside it.
- **Does the vault get opened?** The key is somewhere on the floor and the
  vault is never on the way out, so finding it is entirely optional. If
  nobody bothers, three chests is not enough of a prize; if everybody
  detours for it, the alarm cost of the extra walking is too cheap.
- **Is the head bob too much, or not enough?** It is small on purpose and
  can be switched off in the pause menu, because it makes some people ill.
  Watch whether anyone reaches for that.
- **Does anyone work out the inner line?** Keeping ahead of the arms near
  the middle is a walk and near the wall is a dash. That is the whole skill
  of the room, and it is never explained.
- **Does anyone stop running?** A sprint is 60% faster and tells the Warden
  which room you are in for four seconds. If players sprint everywhere
  anyway, the noise costs too little; if they never sprint, it costs too
  much. The interesting answer is that they sprint between rooms and walk
  inside them.
- **Is the first meeting readable?** The Warden wakes after three rooms on
  the first floor, and the game says one line about it, once. If players do
  not understand that running works, that line is not doing its job.
- **Three floors of the same ten room kinds.** Watch for the point where a
  player recognises a room and stops looking at it. The deeper floors are
  bigger, which buys variety and spends patience; the third is around half
  again the size of the first. The kinds walked through most now have two or
  three arrangements each, drawn from the room's seed; two in five rooms have
  something standing either side of the way through rather than only in
  their corners; and every room is furnished in one of eight orientations,
  so 31 of the 34 rooms in a run look different and the first repeat is at
  room 21, with twenty props rather than fifteen and every kind furnished
  more than one way. The perf budget is no longer the thing in the way: the
  worst room is 51 draw calls of 72 rather than 60, and the props share
  their shapes for the life of the program instead of rebuilding them per
  room. What is left to run out is the ten room kinds themselves.
- **Is the bottom floor too much?** It arrives at alarm 2 with one room of
  grace and two thirds of its plain rooms watched. That is meant to read as
  the bottom of something. If players stop taking gems there rather than
  hurrying, it has tipped from tense to hopeless.
- **Is the Warden in the room too much, or not enough?** It is heard the
  whole time it is in there now, swelling as it closes. That is meant to
  turn the last few seconds from a surprise into a decision. If players
  freeze rather than move, the sound has become a jump scare with a longer
  fuse rather than information.
- **Does the panning read as a direction?** The Warden's footfall through a
  wall and a watcher's call are both panned by where they are relative to
  where the player is looking. On speakers in a room it may read as nothing
  at all; the question is whether anyone in headphones turns the right way.
- **Is the Scroll of Echoes read too late?** It is the only counter to the
  noise the player makes and the only way to move the Warden without a
  Banishment. Watch whether anyone throws it before they are cornered - if
  it is only ever read in a panic, it is doing the Banishment's job and not
  its own.
- **Does anyone drink the unknown potion?** Four slots, nine items, two of
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
| `NOISE_HOLD_S` | 4 | Seconds a sprint keeps the Warden pointed at you |
| `ECHOES_S` | 14 | Seconds a thrown noise holds its attention |
| `ALARM_PER_GEM` | 1 | How much a gem rouses the floor |
| `ALARM_HUNTS_AT` / `ALARM_MAX` | 3 / 6 | When it starts hunting, and when it stops getting worse |
| `WARDEN_SPEED_CALM` / `_ROUSED` | 2.2 / 4.4 | How fast it crosses a room |
| `ESCAPE_MARGIN` | 1.15 | How much faster than a roused Warden the slowest sprint must be (`systems/pace.ts`) |
| `WARDEN_STEP_CALM_S` / `_ROUSED_S` | 9 / 4 | Seconds between rooms |
| `ARENA_INNER_RADIUS` / `ARENA_RING_GAP` | 1.8 / 2 | Where the arena's spike rings sit; coverage is checked in `arena/sweep.ts` |
| `SENTRY_SPIN` | 0.55 | Radians a second the beam turns |
| `SENTRY_PATIENCE` / `SENTRY_ALARM` | 0.9 s / 1 | How long in the light before it calls, and what that costs |
| `ARENA_DURATION_S` / `ARENA_SPIN` | 14 / 0.75 | How long the arms turn, and how fast |

Everything that changes with depth is one table, `floorRules(floor)` in the
same file - the generator, the Warden's grace, the alarm a floor starts at,
how many rooms are watched, how the floor is lit, and the line the player is
shown on arriving:

| Floor | Rooms | Warden grace | Alarm on arrival | Rooms watched |
| --- | --- | --- | --- | --- |
| 1 | 8-10 | 3 rooms | 0 | none |
| 2 | 10-13 | 2 rooms | 1 | 45% |
| 3 | 12-16 | 1 room | 2 | 65% |

Floor three therefore arrives one gem short of `ALARM_HUNTS_AT`: the first
thing taken down there sets the Warden hunting, and it is dark enough that
the braziers are the only reason a corner has anything in it. A floor's
arrival alarm is a baseline as well as a starting value - a Scroll of
Banishment calms the floor but never past it. `yarn test:layout` checks that
no row is gentler or brighter than the one above it, and `yarn test:smoke`
walks a seed down all three floors twice and compares them room for room.
