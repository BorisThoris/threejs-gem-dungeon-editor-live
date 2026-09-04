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

- **Six relics on a shelf nobody could reach.** The shop sells relics for
  2 to 4 gems, a gem more per floor down, and nothing had ever put those
  prices next to what the game gives a player to spend. A purchase may not
  leave anyone short of the exit - the rule from two cycles before this -
  so what the shop actually asks for is the price **plus that floor's
  toll**: 5 gems in hand on the first floor, 8 on the second, 11 on the
  third.

  What the floors hold, counting only gems a player is guaranteed: **5.1,
  7.5 and 10.5.** On the second and third floors the cheapest relic cost
  more than the whole floor contained, and on the first it cost every gem
  on it. Over 400 seeds a floor, the share that held enough at all was
  74%, 51% and **50%** - and that is the ceiling, assuming a player sweeps
  every room before walking into the shop, which is also the play that
  maxes the alarm. On the shortest route to the shop a player passes 1.7,
  2.0 and 2.3 gems.

  The surcharge was pulling the same way as the toll, which already climbs
  with depth: a relic on the third floor cost two gems more out of a purse
  that had to keep four more back. It is gone - a relic costs what it costs
  wherever you meet the shop - and the third floor, which is where a player
  who has banked a couple on the way down actually shops, goes from **50%
  of seeds holding enough to 100%**. `yarn test:layout` holds the prices
  inside the economy from now on: what the shop asks may not exceed what a
  floor typically holds, and on the deepest floor no seed may fall short.
  Run against the prices as shipped, both fail and name the floors.

  This does not make relics cheap. Buying one on the first floor still
  costs a player very nearly everything that floor is worth, which is the
  decision the shop is for. It makes the decision reachable.

- **A question this report has been asking since the items were built.**
  "Is identification worth anything over one run? Learning that the inky
  bottle is healing only pays if you find a second one." It was written
  down as something a human playtest would have to settle, and it turns out
  to be arithmetic. Over 300 runs of three floors: **a run passes 28.4
  chests** (5.7 on the first floor, 9.4 on the second, 13.3 on the third),
  and **every single run turned up the same item at least twice** - about
  seven distinct ones repeated per run. So the knowledge pays. What a
  playtest still has to decide is whether a player *notices*, which is a
  different question and is now the one written down.

  Counting the chests turned up the bug. Two of the nine items are cruel -
  Dread and Mire - and they are the only downside in the loot: they are
  what makes drinking an unidentified bottle a decision rather than a free
  refill. `rollItem` says a quarter of what is down there is a bad idea,
  easing to an eighth as you descend. What came out was **10%**.

  The line was `ITEMS[id].cruel === (rng() < cruelChance)` inside a
  `filter`, which draws a number **for every item in the list** rather than
  one for the choice. Each item was kept or dropped on its own flip, so the
  pool came out weighted by how many of each kind exist: at a quarter, each
  of the two cruel items survived a quarter of the time and each of the
  seven kind ones three quarters, which is a shelf one part in twelve
  cruel rather than one in four. One coin decides it now, and the measured
  shares are 24%, 20% and 15% against the 25, 20 and 15 the code intends.
  Run against the line as shipped, the check reports 13%, 9% and 7%.

  A share is a statistical claim, so the check counts enough chests for the
  answer to be steady - 691, 1053 and 1548 of them - rather than trusting
  one floor of one seed.

- **A quarter of the watchers were standing inside the furniture.** The
  Sentry's post is a two-metre column with a collider a fifth of a metre
  across, and it was dropped on a far quadrant anchor picked at random. The
  furniture goes on the same ring. So does the gem. Nothing on any side
  knew about the others: the dressing keeps clear of the room's own
  content, the gem and the spikes, and the post was in none of those lists,
  because it is placed in its own file and cycle 23's footprint rules never
  reached it.

  Measured over 1,346 watched rooms: **27% of posts stood inside a prop,
  22% inside a solid one so that two colliders shared the same space, and
  27% stood on the gem.** Not near it - *on* it, the same anchor to two
  decimal places. A player walking up to take a gem in one room in four was
  walking into an iron post growing out of it.

  The watcher is chosen first now, keeping clear of what the room's kind
  stands in it and of the gem, and the dressing is handed the spot and
  keeps away from it - which is the same shape as every other placement
  rule in the room, and is why it did not need the two files to import each
  other. All four measures read 0%. Run against the placement as shipped,
  the check names them: "chest in a normal on floor 2 of seed 1", "urn in a
  treasure on floor 2 of seed 4".

  Worth noting what this was found by: not by looking at the Sentry, but by
  asking what else in the game is placed somewhere and never checked
  against what is already there. The props were checked, the gem was
  checked, the braziers were checked, the spikes were checked, the key was
  checked. The watcher was the one thing placed by a file of its own.

- **And two thirds of the keys were under the furniture.** The lens that
  found the Sentry - *what else is placed somewhere and never checked
  against what is already there?* - had one more answer, and a worse one.
  A floor hides its key in one room, at the anchor furthest from what that
  room's kind stands in it and from the gem. The furniture then goes down
  knowing nothing about it. Measured over 600 floors: **65% of keys lay
  inside a prop, 59% inside a solid one.** The thing a player is hunting
  for, under a pillar.

  It was worse than the Sentry for a reason worth writing down: the key
  seeks the anchor *furthest* from what it knows about, and what it does
  not know about is the furniture - which is placed on those same far
  anchors and is thickest exactly where the key was told to go. Avoiding
  half the room drove it into the other half.

  Same fix, and the room now has an order: **gem, key, watcher, furniture**,
  each worked out from the room and the seed alone so the room shell and
  the dressing arrive at the same answers without talking to each other.
  All three measures read 0%. Where the key lies also has one owner now
  (`keyFor`) instead of being worked out identically in the room shell and
  the template checker - which is the same one-owner slip underneath, and
  the reason nothing had ever noticed.

  What this pair of cycles really says is that a room is assembled by five
  files that each knew about some of the others. The props knew about the
  gem, the content and the spikes; the gem knew about the content; the key
  knew about the content and the gem; the watcher knew about nothing. Every
  gap in that grid was a bug, and every one of them had been shipping.

- **The pictures were thirty-six cycles out of date, and reshooting them
  found things the checks could not.** Section 4 was shot once, by hand, at
  cycle 5. The props were rebuilt after that, five more were added, the
  arena's arms were re-laid, the bookshelves got their books out of the
  carcass, the vault was given a vault's furniture, and the watcher and the
  key were moved out of the furniture they had been standing in. The
  section a reader looks at first showed a game that no longer existed.
  It is `yarn tour` now, so it can be redone in two minutes rather than an
  afternoon.

  Framing it took four attempts and every one of them failed in a way the
  picture made obvious, which is the argument for looking at pictures. A
  **doorway** is on an axis, so half the room is behind the camera: the trap
  room came out with neither its spikes nor its gem in shot. A **corner**
  put the camera on the gem, which collected it, so the photograph of the
  room had no gem in it and a 1 in the HUD - and inside the spike ring, and
  two metres from a brazier, which filled the arena with a flame. Pulled in
  **along the diagonal**, the camera stood against a pillar that hid three of
  the memory chamber's crystals. The **wall furthest from the room's
  content** put the camera beside the shop's counter, looking along it,
  which is a picture of a shop that sells nothing. What works is a wall
  with no door in it for a plain room, and the wall directly opposite the
  counter or the lectern or the plate for a room that has one.

  Three things the pictures then found:

  - **The Sentry's beam was too faint to judge.** It was drawn at 0.28 over
    a dim floor and photographed as a slight lightening rather than a cone
    with an edge - in a room whose whole question is where the light is,
    and where a walking player has 0.84 seconds to cross out of it against
    the 0.9 it waits. Confirmed in the scene graph that the wedge was there
    all along (radius 11, a 48-degree fan) and simply too pale; it is 0.45
    now, and the picture shows an edge.
  - **The memory chamber has four crystals, and the caption had said five
    since cycle 5.** `anchors.slice(0, 4)` for the pedestals, the fifth
    anchor for the lectern.
  - The tour's own first shot of a sentry room had the post in it and no
    light on the floor at all, because the beam turns once every eleven
    seconds and happened to be aimed elsewhere. It waits for the beam now.

  Everything else the pictures showed was a fix from an earlier cycle,
  working: books on the bookshelves, the key lying in the open beside the
  arena's plinth, the watcher standing clear of the furniture, and the shop
  refusing a relic with "that would leave you short of the 3 the exit
  wants".

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

`yarn tour` takes these, so they are the game as it stands rather than the
game as it stood. They had been shot once by hand and left for thirty-six
cycles, over which the props were rebuilt, five more were added, the
arena's arms were re-laid, the bookshelves got their books out of the
carcass, the vault was given a vault's furniture, and the watcher and the
key were moved out of the furniture they had been standing in. The section
a reader looks at first showed a game that no longer existed.

Each is taken from a wall with no door in it, looking across the room, on a
software renderer; a real GPU is brighter and smoother.

| Kind | What the player finds |
| --- | --- |
| ![start](docs/playtest/room-start.png) | **Start.** Where a floor begins: furniture, braziers in the corners, and the doorways lit blue. The line across the top says what floor this is and how awake it is. |
| ![normal](docs/playtest/room-normal.png) | **Chamber.** The commonest room. A gem, a chest or two with something unidentified in them, and whatever the arrangement put down. |
| ![treasure](docs/playtest/room-treasure.png) | **Vault.** More chests than an ordinary chamber - and if it is the floor's locked room, it is furnished as a vault whatever kind it was drawn as. |
| ![shop](docs/playtest/room-shop.png) | **Shop.** A counter that sells a life for a gem, names what you are carrying for a gem, and keeps two relics on pedestals. |
| ![library](docs/playtest/room-library.png) | **Library.** Bookshelves with their books showing, and a lectern that opens the tome of numbers. Solving it pays a gem; there are keys on screen for it, so a controller can answer. |
| ![trap](docs/playtest/room-trap.png) | **Trap room.** A ring of spikes around the gem. The door into it calls it a dark chamber and nothing else, so the first one is a surprise. |
| ![arena](docs/playtest/room-arena.png) | **Arena.** The gem on a plinth in the middle. Lifting it bars the doors and sets three arms of spikes sweeping the whole floor for fourteen seconds - here with the floor's iron key lying beside it, in the open. |
| ![memory](docs/playtest/room-memory.png) | **Memory chamber.** Four crystals on pedestals and a lectern to begin at: watch the order, then choose them in it. |
| ![challenge](docs/playtest/room-challenge.png) | **Challenge room.** An idol on a pressure plate. Weigh the plate with a candle before lifting it, or lose a life. |
| ![end](docs/playtest/room-end.png) | **Exit.** The door out charges the floor's toll; whatever you still carry past it is what you got away with. |
| ![sentry](docs/playtest/sentry.png) | **The Sentry**, on the third floor. A post with a turning beam, drawn as a wedge on the floor you can judge the edge of. Held in it for nine tenths of a second and it calls out: the floor wakes and the Warden is told where you are. |
| ![warden](docs/playtest/warden.png) | **The Warden**, in the room with you. It drifts rather than walks and passes through everything; its eyes go from cold to orange to red as the floor wakes. Five to seven of every eight hits in a finished run come from this. |

## 5. What every screen looks like

The rooms had been photographed and the screens never had. The title
screen, the controls, the records page, the satchel, the tome, the pause
menu and the two run summaries are what a first-time player reads and what
a store page shows, and not one of them had ever been looked at. `yarn
tour` shoots them alongside the rooms now.

Shooting them found three things wrong, all of them in the pictures:

- **The tome could not be left while it was showing its numbers.** It says
  "Esc or B leaves" in its footer from the first frame. For the five to
  seven seconds it shows the sequence, neither did anything: the exit lived
  inside the typing handler, and B is on the keypad, which is not drawn
  yet. The tome holds the input lock the whole time, so a player who
  pressed E at a lectern by accident stood frozen in a lit room, with the
  Warden walking the floor, and no key that did anything. Every check we
  had waited the showing phase out before touching a key, because that is
  what somebody solving it does, so none of them had ever asked to leave.
- **The tome outlived the run.** Whether it was open was held in the
  overlay and nowhere else, and nothing that ends a run knew to say so.
  Three of the eight screens came out with a tome over them - over the win
  summary, over the death summary, and over the pause menu - still counting
  down, still holding the input lock. When its clock ran out it recorded a
  failure against a room in a dungeon that had been thrown away.
- **"1 rooms".** Four counts on the summary line and three of them guarded
  their plural. A run that ends in the room it started in - every death on
  the way in, which is the first thing a new player does - read "1 rooms"
  on the last screen it showed them. The first count had no noun on it
  either: "9 found" sat directly under "You got out with 9 gems" and is a
  different nine.

All three are fixed, and `yarn test:smoke` and `yarn test:pad` hold the
line on them; each check was run against the old code first and went red.

| Screen | What it shows |
| --- | --- |
| ![title](docs/playtest/screen-title.png) | **Title.** Three floors, the tolls, the thing that walks, and three lives - the whole contract before the first press. |
| ![controls](docs/playtest/screen-controls.png) | **Controls.** Keyboard and pad side by side on every line, and the two settings that persist. |
| ![records](docs/playtest/screen-records.png) | **Records.** What every run so far came to, and a seed box with a keypad beside it so a Deck can type one. |
| ![satchel](docs/playtest/screen-satchel.png) | **The satchel.** Four slots along the bottom, each showing what the thing looks like rather than what it is until the run learns. |
| ![tome](docs/playtest/screen-tome.png) | **The tome, showing.** Five numbers for six seconds, then they go. Escape or B leaves from the first frame - which is what this shot found was not true. |
| ![pause](docs/playtest/screen-pause.png) | **Paused.** The world stops. Head bob and sound are here as well as in the menu, because that is where you notice you want them off. |
| ![won](docs/playtest/screen-won.png) | **Escaped.** What came out with you, what it beat, the seed, and the same dungeon again. |
| ![lost](docs/playtest/screen-lost.png) | **Died.** What you were carrying and how far down, and none of it comes back up. |

## 6. What the chase actually does

The Warden is the only threat in the game and evasion is the only thing
the player can do about it. `systems/pace.ts` proves the promise - *a
sprint always gets away, a walk does not* - over 2,496 combinations of
relic set, potion and alarm level. All of that is arithmetic on three
constants, in node. Nothing had ever run from the thing in the game, and
`yarn test:run` said so in its own output every time it ran: *the walker
does not evade the Warden*, and of the last ten hits over three runs, ten
came from the Warden.

Measured in the running game, on the software rasteriser here:

| | Measured | The constant |
| --- | --- | --- |
| Player walk | 4.75 m/s | `WALK_SPEED` 5 |
| Player sprint | 7.64 m/s | `DASH_SPEED` 8 |
| Sprint / walk | 1.61 | 1.60 |
| Warden, fully roused, median frame | 4.35 m/s | `WARDEN_SPEED_ROUSED` 4.4 |
| Warden, worst single frame | **36.8 m/s** | - |

The last row is the finding. The Warden walks by adding `speed * delta` to
its own position and nothing bounded the delta, so a frame that took nine
tenths of a second moved it **four metres in one step** - in a room
twenty-four metres across, against a strike radius of 1.05. Its step was
already clamped to land just inside touching range rather than past the
player, so the lunge did not overshoot: it arrived, and struck. A garbage
collection, a room mounting, a window coming back to the front - any of
them, and the thing you were outrunning is on you, from anywhere in the
room, whatever `pace.ts` says.

The same lesson was already written down across the room, in `Scene.tsx`:
the physics timestep is fixed rather than variable *precisely because* a
variable one hands Rapier the whole hitch and tunnels the player through
the floor. The player was held to a fixed step and the thing chasing them
was not, so a hitch moved the threat and not the target - the one
direction that is never fair.

`WARDEN_MAX_STEP` is a quarter of the reach it strikes from, so there is
always a frame between seeing it close and being touched. It binds only
below about seventeen frames a second; above that it is inert. The same
stall now moves it 0.26 m instead of 4.08. Two checks in `test:layout`
hold the cap between the strike radius and a step at twenty frames a
second, and `test:smoke` stalls the main thread on purpose and measures
the largest single step the Warden takes across it.

### The same bug, in the room with the thinnest margin

The Sentry is the third of the three things that can catch a player, and
the one whose promise is finest. Its check reads:

> Standing still in the light is always seen. Walking out of it never is.

The second half is true by **sixty-four milliseconds**. A walking player
needs 0.836 s to cross out of the beam at its furthest reach; the post
waits 0.9 s before calling. And it counted that time the same way the
Warden moved - `lit += delta`, one unbounded frame delta a frame.

| One frame at | is | against a 64 ms margin |
| --- | --- | --- |
| 60 fps | 17 ms | inside it |
| 30 fps | 33 ms | inside it |
| 20 fps | 50 ms | inside it, by 14 ms |
| 15 fps | 67 ms | **wider than the whole margin** |
| a 0.9 s hitch | 900 ms | convicts outright |

Measured: lit for 0.258 s of the 0.9 it waits, then one dropped frame added
0.903 s and the post called out. The beam turns most of a full width in
that time, so a long frame is precisely when "it was in the light when I
looked" says least about where it was the rest of the time.

The unfair case is narrower than that first looked, and finding the edge of
it took walking the room. The beam takes 11.4 s to come round and covers one
direction for 1.53 s, so it cannot leave a player and return inside a hitch:
lit at both ends of a dropped frame means lit throughout it, and charging
for that is right. What is wrong is the **arrival** - on the frame the light
first touches you, a hitch takes the count from nothing to past the patience
in one go, and you are called out on the instant of contact with no chance
to move.

Capping each frame's contribution fixed that and bought a worse problem.
The count is also how *standing still in the light is always seen* is
decided, and a machine whose frames run longer than the cap accrues only
the capped share of each — below about twelve frames a second the post
stopped calling anybody out at all. That was found by walking a beam in the
running game, on the rasteriser here, which renders at four or five: a
motionless player stood in the light for a second and a half untroubled.
Half the room's promise, switched off.

It measures a **span** now — the clock read when the light arrives, and how
long ago that was. Neither problem, and no constant: the arrival starts the
span at nought rather than finishing it, and a slow machine measures the
same second and a half a fast one does.

> Cap a thing that is being *moved*. Read the clock twice for a thing that
> is being *timed*.

### Walking it, at last

Nothing had ever walked out of a beam. Every check that had touched a
Sentry either stood still or teleported, so both halves of the promise were
arithmetic on four constants and nothing more. `yarn test:smoke` walks one
now, at a spot chosen rather than assumed: far enough out that a mired walk
would be caught there — beyond about 8.5 of the beam's 11 — with five clear
metres of tangential run left in the room, which rules out the corners, and
the corners are the only places a player can be a full eleven metres from a
post standing on a far anchor. The first attempt stood the player in one and
measured them walking into a wall at 0.36 m/s.

It checks the game against `beam.ts`, not against `WALK_SPEED`. The player
is a rigid body driven by `setLinvel` once a rendered frame, and on the
software rasteriser here — four or five frames a second — Rapier's damping
eats a third of the walk: five metres a second on the constant, three and a
bit in fact. Asserting the promise as written would be asserting that this
machine is a Steam Deck. Asserting that the simulation and the arithmetic
agree at whatever speed the body *did* move is the stronger statement, and
it is the one thing about that room nothing had ever checked. Measured:
3.81 m/s at 10.4 m out, `beam.ts` says caught, the game called out; mired at
2.55 m/s, caught, called out; standing still, called out at 210 ms frames.

Two things were measured on the way and turned out to be fine, which is
worth writing down so nobody spends the afternoon again:

- **The door handover.** Control comes back when the destination room
  reports its colliders mounted, and a 1500 ms timeout hands it back
  anyway if the room never does. Over 24 doors across three floors the
  handover took 14 to 39 ms, median 22. The fallback has never fired; it
  has forty times the margin it needs.
- **Everything else that moves on the clock.** The arena's arms and the
  Sentry's beam are placed from `elapsedTime` rather than advanced by
  `delta`, so a hitch skips them past the player rather than through them.
  The Warden was the only one integrating. And the arms do not skip a
  player in play either: the furthest ring moves 1.19 m between frames at
  ten frames a second, against the 1.5 m that would carry the patch over a
  0.3 m body.

## 7. What the player can reach

The tome, the memory trial and the challenge room had been walked up to and
pressed E at for many cycles. The shop had not: every check of it called
`spendGems`, `gainLife`, `identifySlot` or `addRelic` on the store, so what
was checked was the arithmetic of a purchase and never the counter. Nor was
the key: `takeKey` and `unlockRoom` were called, never walked onto or stood
in front of. That is the shape that hid a tome no controller could answer
and a title screen no controller could start — the rule held, and the way in
was missing.

Walking up to them found one:

- **A thing you cannot do stood in front of a thing you can.** The shop's
  counter carries the life purchase on one anchor and the naming a metre
  and a bit along it, and the prompt went to whichever was *nearest*. So a
  player at full health stood at the counter reading "Already at full
  health", with a purchase they could afford a stride away, and E did
  nothing. The rule is now the nearest thing that can actually be used,
  falling back to the nearest thing at all — so blocked reasons still show
  when you walk to the one thing in reach and cannot afford it, which is
  what they are for.

And one in the check harness itself, which is worth recording because it
would have hidden the first: `stepTo` returned the first non-null prompt it
read after teleporting, and a prompt is a DOM element that stays on screen
until a trigger frame replaces it. It got away with that for as long as
every use teleported in from somewhere with no prompt at all. The first use
that stepped from one thing to *another* — along a counter, from a counter
to a pedestal — read the old prompt at the new place and reported the shop
broken three times over. It waits for the reading to settle now.

Five things a player does with gems and keys are done in `yarn test:smoke`
by standing in front of them and pressing the key, for the first time: buy
a life, buy a name for something unidentified, buy a relic off its
pedestal, take the iron key off the floor, and spend it on a barred vault
door.

Walking to a chest found the same thing again, one trigger further on.
Three interact triggers in the game carried no guard at all — the gem, the
key and the chest — and only the chest can refuse: `takeItem` declines a
full satchel. So it went on saying "Open the chest — a green potion" with
four things already carried, and E did nothing but drop a hint after the
fact. Rude on its own; not rude once the prompt goes to the nearest thing
that can be *used*, because a chest claiming it can be then outranks the
door standing beside it and a player with a full satchel is told to loot a
room they cannot leave. It says so before the press now.

And the keyboard's satchel keys had never been pressed. The pad's four
satchel buttons were checked when cycle 36 found only two of them worked;
the keys they mirror — the ones a desktop player uses all run — were only
ever exercised as `useItem(0)` on the store. They work: 1 uses the leftmost
slot, the rest close up behind it, and 4 on a satchel of three does
nothing. It is the same hole cycle 24 found in the other direction, where
every check typed and the pad could not start the game.

## 8. Walking the arena's circle

The arena holds itself to two lines:

> There is always a line you can walk. There is no line you can stand on.

The second has been checked in the running game since cycle 31 — standing
where the gem was takes five hits in fourteen seconds. The first was
arithmetic on four constants in node, and nobody had ever walked the gap.

Walked now, and the walking taught something the arithmetic did not. Which
circle a player can hold is set by how fast they move: `orbitSpeed(r)` is
0.75r, so

| Walking at | holds a circle of |
| --- | --- |
| 3.25 m/s (mired) | 4.3 |
| 5 m/s (plain) | 6.7 |
| 6.25 m/s (boots) | 8.3 |
| 9.38 m/s (boots + swiftness) | 12.5 |

`ARENA_INNER_ORBIT` is 1.2 — the innermost circle the geometry allows — and
holding it takes 0.9 m/s. **No keyboard can walk that slowly.** W is on or
off, so the inner stroll the room's comment describes is available only to
somebody with a stick they can half-deflect; a player on a keyboard holds
the line their speed fits. Measured: a body moving at 4.6 m/s aimed at a
circle of 1.2 laps the arms and takes seven hits, and the same body on a
circle of 3 walks the whole gauntlet untouched. The arms sweep a circle of
3 twice over, from the rings at 1.8 and 3.8 — it is a gap in the turn, not
a hole in the arms.

So `test:layout` gained the mirror of the check it already had. It asked
whether the tightest circle can be held by the slowest walk; it now also
asks whether the circle the *fastest* walk has to hold still fits inside
the room. Walking 9.38 holds a circle of 12.5, and a player can get 16.5
from the middle of the arena the generator builds — four units of room to
spare.

One thing about steering, which cost two attempts: aiming at the gap's
middle makes the player cut the chord. They leave the circle, drift a metre
off it and fetch up at a radius where the angular gap is narrow — nineteen
degrees either side at 1.2, against forty-five at 3. The check aims a
quarter of a radian along the circle from where the player already is
instead, which is how somebody with a mouse holds a line: by nudging, not
by pointing at the destination.

## 9. Two loose ends, six cycles on

**The stick swung the view a third of a turn on a dropped frame.** Cycle 44
went hunting for raw frame deltas because the Warden crossed four metres on
one, and found it in the thing that chases the player. It did not find the
thing the player *steers* with. `GAMEPAD_LOOK_SPEED * delta` is 2.4 radians
a second, so a 900 ms hitch with the stick held over turned the camera
**124 degrees in a single frame** — measured — on the only input a Steam
Deck has, at exactly the moment a player can least afford to lose track of
the room. Bounded by `MAX_FRAME_S`, which also gives that constant a live
consumer again: cycle 46 took the Sentry off it and left a rule with
nothing obeying it. The same stall now turns 7 degrees.

The mouse is deliberately not held to this. It reports pixels moved, and a
long frame carries more of them because the hand moved that far. A stick
reports a *position*, and how long it stood there is the game's to decide.

**A check that names what it is looking for.** `yarn test:prod` asserted
that three probe handles were absent from the shipped build — `__run`,
`__bus`, `__perf` — which were all the probes there were when it was
written. The source declares twenty-eight now. Every one of them is
stripped, which is why nothing noticed, and the check would have gone on
passing if one leaked. It reads the list out of `src/` instead of keeping
it, so a new probe is covered without being told.

That was proved rather than assumed: a probe was leaked on purpose, outside
the DEV guard, and it **walked straight past the first version of the fix**.
The pattern was anchored on `window.__name` and `w.__name`, and most
components write theirs through a cast — `(window as unknown as {…}).__sentry`
— so the object-anchored pattern missed exactly the idiom most of them use.
Widened to any `.__name`, it caught the leak, and picked up three more real
probes the first pattern had been missing.

## 10. A place to stand is not a way to get there

The trap room's check asked whether some point within reach of the gem was
outside every spike patch, and called that *"the gem can be taken without
touching spikes"*. It passed on every seed for the whole life of the room.

A place to stand is not a way to get there. A player arrives through a
doorway and has to walk. Two of the three patches sat on the gem's own
coordinate, and a corner gem in a room sixteen across sits 6.41 out: the
patch reaches 1.2 past that, to **7.61, against a wall a player can press
to 7.7**. Nine centimetres of corridor — in a room whose own comment reads
*"the direct line to the reward is the dangerous one and the way round,
along the walls, is safe"*.

Flooding the floor from every doorway, past the spikes and past the
furniture:

| | walled the gem off |
| --- | --- |
| Trap rooms | **70 of 113** |
| Every other room | 0 of 945 |

So in 62 % of trap rooms the gem cost a life, unavoidably — a toll rather
than a decision, which is the same flaw cycle 31 found in the arena, in the
opposite direction. There *was* a clear spot beside the gem, hard in the
corner, with no route to it, which is exactly what the old check measured.

`WALL_CORRIDOR` keeps a patch half a metre off the wall. 70 of 113 → 0 of
113, with the corridor a player walks now 0.4 wide either side.

Two things worth recording:

- **The furniture is innocent.** The flood fill blocks on solid props as
  well, and not one of 945 rooms is cut by its own dressing. That was worth
  measuring rather than assuming — it is the first check in the project
  that asks whether a room can be *walked* rather than whether things are
  spaced far enough apart.
- **Nothing had ever been hurt by spikes.** `yarn test:run` reports it in
  its own output every time: of the hits it takes over three whole runs,
  none come from rooms. `test:smoke` now stands on a patch and loses a
  life, then walks the wall corridor and does not — the room's two claims,
  tried for the first time.

## 11. The gauntlet you could wait out

The arena is the game's one timed room: take the gem and the doors bar
themselves for fourteen seconds while three arms of spikes sweep the floor.
It timed those fourteen seconds with `window.setTimeout` — the wall clock.

The run store keeps `runClock`, which is wall time **less every second
spent in a menu**, and the comment beside `pausedFor` says exactly why:
*"so a Potion of Swiftness is not burnt by twenty seconds in a menu."* The
arena never asked it.

Measured: take the gem, press Escape, wait seventeen seconds, come back.

| | before | after |
| --- | --- | --- |
| Doors after 17 s paused | **open** | still barred |
| Standing where the gem was | **0 hits** | 2 hits |

The room's one demand — keep walking for fourteen seconds — cost nothing at
all. Both its phases and its arms read the run clock now; the arms too,
because driven by `elapsedTime` they kept turning through a pause and the
player unpaused into whichever one had arrived.

Two more assumptions were measured this cycle and hold, and are now
guarded rather than assumed:

- **A room joins the rooms it links to.** The generator checks connectivity
  on the room graph and takes for granted that a room can be crossed. The
  flood fill walks from each doorway to the others: 0 of 969 rooms with two
  or more doors are cut in half by their own furniture.
- **The key is never behind the door it opens.** If the generator ever put
  the floor's key inside the vault, or in a room only reachable through it,
  the lock would be unopenable — and the check that a floor is payable
  would not notice, because a floor is payable *without* the vault by
  construction. 0 of 900 locked floors.

## 12. What the memory trial costs

The trial is four crystals, a pattern, and a stated price: **a life at two
mistakes, and the book burned for good at two attempts.** The suite had
played it once, correctly, and taken the gem. Nothing had ever played it
badly, which is where the whole shape of the room is.

Both counts lived in `useState` inside the room's component, and `Scene`
mounts only the room the player is standing in. So:

| | before | after |
| --- | --- | --- |
| One mistake, then out of the door and back | **forgotten** | still spent |
| The mistake after that | **nothing** | the life it is meant to cost |
| Attempts, across a door | **always 0** | 1, and the second burns the book |

One step through a doorway and one step back handed you a fresh allowance,
every time, for nothing. The trial had no price at all. Both counts are the
run's now, in `trials`, keyed by room and cleared on a new floor because
room ids repeat between floors.

Its display was on `window.setTimeout` besides, which is the wall clock.
Measured: begin the trial, press Escape during "Watch.", wait eight seconds
— longer than the whole 4.3-second display — and come back.

| | before | after |
| --- | --- | --- |
| Eight seconds in the pause menu | pattern **played out behind it** | still showing |
| On resume | asking for an answer nobody saw | the rest of the display, then the question |

The pause screen is seven-tenths opaque with a panel over the middle of it,
so this was not a display the player could watch through the menu. It is the
mirror of the arena in §11: there the wall clock let the player skip the
room's demand, here it let the room skip the player.

### And the line the room writes on

Found while measuring the above, by a probe that read a blank screen where
an instruction should have been. The teaching lines — a floor's opening
blurb, the Warden waking, a scroll thrown — cleared themselves six and a
half seconds later by emitting `hint: null`, and that is the same single
line every room writes its standing instruction on.

So: walk into a memory chamber within six and a half seconds of arriving on
the floor, and the instruction telling you what the room even is was wiped
by somebody else's timer, with nothing anywhere to write it again. Measured
in the running game, nine seconds after arriving: the room's line was gone.

There are two slots now. The room owns the lower line for as long as the
player is in it; a notice owns the upper one until it runs out, on the run's
clock, so a line read in the pause menu is still there when the game comes
back.

## 13. The watcher and the pause key

Cycle 52 found the arena's gauntlet running on the wall clock and cycle 53
the memory trial's display. The Sentry was the third, and the worst of the
three, because it breaks in **both** directions.

Its beam sweeps a full circle in 11.4 seconds and covers any one direction
for 1.53 of them. All three things it timed — the beam's own angle, the span
the light has held you for, and the cooldown between calls — read the
renderer's clock, which keeps turning while the game is paused.

Measured on floor three, with the player standing in the beam:

| Pause | before | after |
| --- | --- | --- |
| Half a sweep (5.7 s) | beam has moved on: **never seen** | still on you |
| A whole sweep (11.4 s) | beam is back, and the span still runs from before the menu: **called out on the first frame back** | a fresh 0.9 s, as if you had never paused |

So the room's one demand — do not stand in the light — was met by pressing
Escape; and a player who paused for the wrong length was convicted before
they could take a step. The measurement the check keeps is the number
underneath both: across six paused seconds the beam used to travel **3.85
radians**, more than half its circle, and now travels the quarter-second of
play at the end of the pause.

The check does not assert the outcome. Waiting for the beam to arrive is a
coin toss at four frames a second — the first version of it reported the
room broken and then working on the same code — so the player is put on the
beam's own bearing instead and the two numbers underneath are read directly.

## 14. The check that gave three answers

Cycle 49 added a walk of the arena's circle and asserted it took no hits.
Over four runs of identical code it reported **0, 1, 2 and 0 hits**. By this
project's own rule that is worse than no check, so this cycle went and found
out why. Three things, all measured:

**The circle was one no player can hold.** `orbitSpeed(r)` is 0.75r, so a
circle of three has to be walked at 2.25 m/s — and W gives 3.9 to 5.0. A
player on a keyboard has one speed and nowhere to put the surplus except by
leaving the line, which is exactly what happened: the walk drifted up to 1.5
metres off a 3-metre circle. And the hits were not the arms catching up; they
were the drift carrying the player inward onto the inner ring, where the same
angular gap is a much shorter real distance. At r = 1.5 an arm half a radian
away is only 0.87 m of actual distance, inside the 1.2 a spike reaches.

**W was pressed before the player was aimed.** The teleport left the yaw at
zero, so the first second went wherever that pointed — and the arms come
alive two seconds after the gem is taken. Every failing run took its first
hit at t = 0.9.

**The aim point was behind the player's own feet.** It looked a fixed *angle*
ahead: 0.06 rad, which at r = 3 is 18 cm against a stride of 70. The yaw it
produced was noise.

The circle is now derived from the speed the machine actually walks at
(measured, not read from `WALK_SPEED` — damping at 6 fps costs a fifth of
it), the player is aimed before walking, the aim leads by a distance, and the
correction is applied by *radius*, since changing radius is the only way a
one-speed player can change how fast they go round. Drift falls from 1.0–1.5
to 0.7–0.8.

### And it stopped asserting the outcome

Even fixed, "no hits" is not assertable here. The arms test the camera's
point once a frame; at 6 fps the player crosses two thirds of a metre between
samples, and one run passed within **0.35 m of a spike** — well inside the
1.2 it reaches — and recorded no hit at all. Asserting the outcome was
asserting the sampling.

So the walk now asserts three things that hold:

| | |
| --- | --- |
| This machine's walk can hold a circle that fits the room | arithmetic, from the measured speed |
| The walk held its line | drift < a quarter of the radius; measured 0.73–0.81 of 1.38 |
| Walking the line beats standing still in it | 0 hits against the 5 that standing on the plinth takes |

The third is the room's actual promise, and comparing two samples under the
same conditions is the only form of it a coarse sampler cannot corrupt.

## 15. Steam Deck

Checked at 1280x800: HUD, hint, prompt and menu text scale with the
viewport (about 15 px on the Deck's panel, capped on desktop). The pad
mapping is the standard one and was verified with a synthetic gamepad;
nobody has held a Deck with this on it.

## 16. What a human playtest should watch for

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
- **Does anyone bother identifying?** Answered for the arithmetic below -
  a run passes 28 chests and every run turns up the same item twice - so
  the knowledge is there to be used. What a human playtest still decides is
  whether anyone *notices*: whether a player remembers the inky bottle
  three floors later, or drinks each one as a fresh coin toss.

## 17. Tuning knobs

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
