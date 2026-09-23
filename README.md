# Gem Dungeon

A first-person dungeon run built on React Three Fiber, Rapier and Zustand,
packaged for the desktop with Electron.

Three floors down. Each floor is a fresh dungeon, and the door out charges a
toll that rises as you descend: three, then five, then seven. Whatever you
are still carrying when you climb out is what you got away with.

Each floor down is also worse than the one above it. The upper vaults are
small, unwatched, and slow to notice you. Below that the halls widen,
watchers stand in them, and the floor is stirring before you touch anything.
The bottom is large enough to get lost in, watched almost everywhere, one gem
short of being hunted the moment you step off the stair, and dark enough that
the braziers are the only reason a corner has anything in it.

The catch is that every gem you take wakes the thing that walks the floor.
The Warden can be briefly staggered with a shove and respects solid
furniture, but it is slower than you are, so the question is
never whether you can escape it. It is whether one more room is worth
having it between you and the door.

Space or left click (RT on a controller, SHOVE on touch) winds up the hand
for 0.3 seconds, then pushes back a threat within three metres in front of you. It drives off the Harrier, scatters the
Cutpurse and recovers anything it stole, or staggers the Warden for a short
escape window. Each shove needs 2.4 seconds to recover. Solid cover,
including watcher posts, blocks the hand; a blocked shove prompts you to
step around it. Shoves do not wound the Warden; traps and bombs remain
the stronger tools. A shove aimed at the Keeper or Reaper explains that
enemy's counterplay instead of telling you to come closer. Ordinary rats flee
and do not attack. The Harrier gives you time to orient after entering and
hovers before committing to a dive.
Ceiling bats stir and flutter for 1.2 seconds before bursting in response
to nearby noise. Moving clear of the roost cancels that burst; blasts
startle them immediately. Their noise draws attention but does not hurt you.

Chambers grow as you descend. Later floors have longer corridor wings and
more branching, concave room outlines, with matching walls and collisions.
Closed side galleries widen and shift sideways on deeper floors, creating
asymmetric room outlines. In generated chambers and
treasure rooms, the room's gem waits inside that gallery, rewarding a detour
without adding extra income. Trap gems keep their chamber positions.
The minimap records visited corridor rooms with their real concave outlines,
including closed galleries. Unexplored rooms remain simple markers.
Floor two advises packing a shop bomb before descending, and the HUD
confirms when it is packed. Bombs carry between floors, so preparing early
avoids a final-floor shopping detour while the Reaper is closing in.
Gather the full final toll before lighting that bomb: the Keeper's kneeling
window is for escaping, and does not leave time to hunt for missing gems.
Corridor wings carry seeded ceiling ribs and wall markings, giving long
passages stable landmarks without obstructing their travel lanes.
Watcher beams stop at room walls, and corridor corners block visual
detection by watchers and the Warden. Sound can still carry around them.
Ground creatures and fliers steer around the watcher's solid post. Their
look-ahead checks the whole path so small props cannot be skipped over.
When you leave its view quietly, the Warden pursues your last known spot
instead of tracking your movement through walls. Noise or the moth's
light signal gives it a fresh destination.
The Reaper follows through corridor wings and closed galleries as well as
the main chamber; a dead end buys time rather than permanent shelter.
Its movement, facing and ghostly bob freeze while the run is paused.
The Keeper's facing, idle bob and halberd warning freeze with pause too.
Entrance lanes stay clear of damaging traps; dart plates sit off those
lanes, light before firing, and hurt only across their visible footprint.
Grates wait until you have moved clear of the landing before dropping.
Pursuers enter off the doorway lane, using the full corridor outline.
Placement seeks five metres between arrivals and both the player and every
landing, with furniture and live hazards checked before placement. Crowded
authored rooms use the greatest available clearance and retain arrival grace.
Returning Harriers choose a fresh clear approach, so waiting at their old
position does not make them reappear on top of you.

The dungeon is not on its side, though. The spikes in a trap room do not
care which of you stands on them, so a trap room is somewhere you can
choose to fight from: stand with a patch between you and the door, and the
thing walking at you takes a wound and reels. Two wounds and it is thrown
across the floor. It learns, though - after that it walks round anything
that has bitten it - so the room is worth exactly twice, and then it is a
trap room again.

There is one thing you can do to the dungeon rather than to yourself.
Each floor gives you three reusable barricade kits. Press B at a doorway
(D-pad down on a controller, BAR on touch) to put one up. The planks stay
until you remove them and block that doorway from both sides, including
an enemy chase already underway. The Warden may take another open route;
it cannot instantly smash your barricade. Harriers, Cutpurses and the Reaper
also stop at barred doorways. Building still makes noise.

Press B again, or use the doorway's tear-down prompt, to recover the kit.
Removing a barricade does not also open the door: use it again to travel.
Your remaining kits and standing barricades appear in the HUD. Timed trap
grates are separate and never consume or replace your barricades.

The lantern has five light bands. Lowering it is instant; raising it from
darkness takes 1.4 seconds and costs four oil. Lit travel costs six oil for
a new room and one for a revisit. Standing still costs nothing; replacement
oil is bought at the shop. Braziers provide light and clear clinging gloom.

Warm fixture light spreads around the actual room outline. Corner braziers
reach across larger chambers, passage lamps mark the galleries, and unlit
chambers still make the carried lantern valuable. The hand responds to local
light and shows shove recovery. The visibility readout reports the light on
you and your movement: a watcher acquires you faster in bright light, whether
it comes from your lantern or a nearby fixture. Dark corners reduce that
exposure; solid cover and room walls still matter. The Warden remains blind
to light and follows its existing movement, sound, and pursuit rules.

Speed is not free either. A sprint is loud, and while it can hear you the
Warden stops wandering and walks straight for the room you are in. Walking
is quiet. So every corridor is the same small question as the floor itself:
fast, or unnoticed.

Gems also buy relics at the shop, which change a run's rules: a lantern
that shows you where the Warden is, boots that make you quicker, a charm
that eats a hit, a ledger that makes every exit cheaper. Every gem spent
there is a gem you do not carry out.

The arena is the one room that fights back. Its gem sits on a plinth in the
middle, and lifting it bars the doors and sets three arms of spikes turning
across the whole floor. There is no corner to wait in: the only safe ground
is the moving gap between two arms, and holding it means walking a circle
for fourteen seconds. The inner line is a stroll; the outer wall needs a
dash to keep up. The Warden does not stop for any of this.

Sound is the only thing that can tell you what is behind you, so the cues
that come from somewhere have a side to them. The Warden stepping into the
room next door is heard through that wall - left, right or ahead, turning as
you turn - and a watcher calling out is heard from its post. It is the
difference between knowing something is close and knowing which door not to
take.

Once it is in the room with you it is heard continuously rather than
announced: a low presence that swells as it closes and moves across the
stereo field as it comes round a pillar. You can shut your eyes and still
know which way to go, which is the point of a threat you are only ever
allowed to run from.

The floor is alive, and it plays by one set of rules. Rats scatter from
your footsteps - and from a barrel bursting, a grate dropping, a blast
two rooms away - and spring the snares you set; a moth goes to the
brightest thing in its room, which is your raised lantern until you turn
it down to a glimmer, and the wisp when the wisp is brighter; bats burst
from a roost when you dash; a Sentry acquires you twice as fast in any
light over half, yours or the wisp's; and the toads at the water's edge
of the flooded and fungal rooms sing until something is loud, then they
are under and the room is silent - so a cistern that is already quiet
when you walk in was not quiet a moment ago, and the splash they made
going under told the Warden which room. Every creature is one row of a
contract - name, body, what it answers to, its voice, its events, its
lesson, its file - and every biome is one row of another, with the life
that lives in it and the sound it makes when nothing is happening: a
drip in the cistern, embers in the foundry, boards settling in the
timbered rooms, spores ticking in the fungal caves. Every creature declares a body - ground, flying or ghost - and the
floor reads it: spikes and snares bite anything with feet, solid props
are walked round by anything with a body, and a ghost passes through all
of it. That table is the whole reason the rest of this works. The
Warden has feet, so the floor's own traps are yours to use: a plate
partway down the lane to a doorway looses darts at whatever is in the lane, a
cracked flagstone gives way under whoever steps on it and is a spike
patch from then on, and a grate drops behind you and bars the doorway
you came in by. Walk the Warden over a plate. Drop a grate with it at
your heels.

Every floor hides a room the map does not show, behind a wall with a
crack in it, and the only way through is a bomb - one a floor at the
shop, more in chests. Nothing marks the wall; the floor tells you, if
you listen. A draft of cold air near it. A clink, a chime or a drip
through it, saying what is behind. A gap on the map the shape of a room.
`M` marks the room you are in with a "?" that nothing in the game reads,
for the player who wants to remember where the draft was. Raise the
lantern and a wisp gathers to lead you toward the crack - and the wisp
is light, so the Warden sees you for exactly as long as it is out.

Going down a floor is a moment rather than a cut: the screen holds the
floor's number and one line about what is new below, which is the only
warning you get. The cracked wall coming down and the Keeper going to its
knee each get their own, and none of them take the controls away from
you.

The readout is ordered by what is about to happen to you rather than by
what was built first: the thing taking a life is at the top, then the
clock you are losing, then what the door costs, then what you can spend,
then where you are. Nothing urgent is said in colour alone, and the map
marks the places the readout names - the roost you have walked into, the
stairs the Keeper is standing across.

A blast is seen as well as heard - a flash, embers thrown out and pulled
back down, dust across the floor, the view knocked harder the nearer it
was - and the wall it opens is left with its stone at the gap. Taking
something is seen too, and deliberately unlike a blast: a smaller light
and a handful of motes drawn upward and inward, over in about half a
second, cold blue for a gem and gold for a relic. A chest you have
emptied stands with its lid back, so a vault tells you which of its
three you have already been to. And what you are carrying shows in what
you carry: the Warden's Lantern gives your own flame a cold cast and the
Ash Censer a smokier one, which for two floors was a line in the HUD and
nothing you could see. It does
more than open walls. Barrels, crates and urns burst, and
one standing between the bomb and you takes the blast for you; now and
then a gem glints in the wreck. The Warden inside a blast is routed. And
from the second floor down something with wings hunts by the alarm: the
Harrier, which the spikes cannot touch and the furniture does not slow,
which cannot be walked from and can be dashed from, and which a blast
knocks out of the air - and a flier on the ground is just another thing
the floor can bite. On the last floor the stairs are kept. The Keeper
stands in that doorway, cannot be walked past, and kneels for nine
seconds when a bomb goes off in its room. Keep two gems beyond the toll
for the shop's bomb. Move clear of its blast and keep moving while the
fuse burns, then take the stairs while the Keeper kneels.

From the second floor down there is also something small in the dark that
wants what you are carrying. The Cutpurse cannot hurt you. It waits until
you have stopped moving with gems on you, comes in at a doorway, takes
exactly one and runs back out with it. It moves faster than you walk and
slower than you run, so catching it means reaching for shift the moment
you hear it - and if you do not, the gem is not gone. It is in a nest
somewhere on the floor, and the nest is on your map from the moment it
costs you something. Whether one gem is worth walking back through a floor
that is more awake than when you crossed it is the same question the game
asks everywhere else, in a smaller shape.

From the second floor down, some plain rooms have a watcher on a post,
turning a beam slowly around the room. It never takes a life. Being held in
its light rouses the floor and tells the Warden where you are, which is
worse, and which you pay for later. The Warden makes you leave a floor; the
Sentry makes you time your crossing of a room.

One room on every floor is locked, and its iron key lies in another. The
generator will only put the lock on a room the floor can be walked without,
and never on the way to the exit, so a vault is a detour worth taking
rather than a wall across the run - you can always leave without it, and
you will always wonder what was in it.

You pick who goes down. Five delvers, each trading one thing the run needs
for another: the Vagrant brings nothing and owes nothing, the Tomb Robber
opens with a chart and two gems on a floor that is already stirring, the
Ratcatcher knows every device on sight and has one life fewer, the Courier
is a quarter faster with half a satchel, and the Pilgrim gets four lives
and a charm because the dungeon minds them being here twice as much. None
of them is the easy one, and all of them are available from the first run.

Rooms of a kind are not rooms of a pattern: each one draws its furniture
from its own seed out of two or three arrangements, so a chamber you have
walked into before is not the chamber you walked into before.

Chests hold potions, scrolls and devices, and which look means which item
is shuffled at the start of every run. A cloudy potion is a different thing
each game, and the only way to learn is to drink one. Most of them help;
a few of them wake the floor. You carry four at a time and use them with
the number keys, which means the real question is whether now - with
something walking towards you - is the moment to find out what you picked
up.

Every kind of thing in a dungeon is also blessed, plain or cursed, and
unlike its name that is visible from across the room. So a chest offers "a
cursed cloudy potion" and you get to decide whether finding out what it is
is worth what a curse will cost - because a curse here is always a cost
and never a lie. Cursed healing still heals; the floor just hears you do
it. The shop will lift one kind a step for two gems, and it is the only
thing that answers a curse.

The devices are the ones you take with you. They are set down where you
stand rather than used on yourself, and they are still there when you come
back through: a snare that wounds the next thing to walk into it, wherever
you set it, and which works even on a Warden that has learned about the
floor's own spikes; a ward stone that empties the room it lies in and holds
it empty for half a minute, which is the one place in the game where
standing still is the answer; and a knot of loose iron, which lands loudly
and tells the floor exactly where you are.

One of them is the answer to the noise. A Scroll of Echoes throws a clatter
to the far end of the floor, and the Warden goes to find it: it does not
move it, it makes it walk, which takes a while and tells you exactly where
it will be. While it is chasing a sound it already heard, it is not
listening for you - so the scroll is also the one thing that buys you the
right to run.

The options screen is one page from the title or the pause menu: head bob
and screen shake off independently, sprint on a hold or a press, mouse and
stick sensitivity, inverted look, volume, captions for the sounds that
carry information, high-contrast marks so nothing is said in colour alone,
overlay size, and every key rebindable. There is not one drag control on
it, because a gamepad cannot drag and the Steam Deck is a gamepad. On a
touchscreen it carries three more rows: the on-screen controls on auto,
on or off, how far a drag turns the view, and which thumb walks.

Sixteen deeds are listed at the title screen, with what each is for whether or
not you have done it. None of them changes a run - everything the game has
is there from the first one - and they exist to name the things the systems
support that you might not think to try.

The title screen carries which build it is, because a demo goes out to
people whose only way to tell you which one broke is what is on the
screen.

Every dungeon is a seed, and the summary shows it. A run worth telling
someone about is a run they can walk themselves, and the one you just lost
is usually the one you want another go at, so the summary offers the same
dungeon again and the main menu takes a seed you type in. What a machine
remembers between runs is a best haul, a deepest floor, a fastest escape
and a count of how runs ended - a record, not a progression system.

**[ARCHITECTURE.md](ARCHITECTURE.md)** explains how the code is laid out and
the rule it follows. **[STEAM_DEMO_PLAN.md](STEAM_DEMO_PLAN.md)** is the
history: what was wrong, what was done about it, and what still stands
between here and a Steam demo. **[AI_DEVELOPMENT.md](AI_DEVELOPMENT.md)** is
for the agent that writes most of this: what the repo gives one, what it
still owes one, and in what order.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows, or left stick | Move |
| Mouse (click the game to take it, Esc gives it back), or right stick | Look |
| `E`, or `A` on a pad | Use what you are standing at: a door, a chest, the shop counter, a lectern, an idol |
| `1` to `4`, or X and Y on a pad | Drink, read, or set down that satchel slot |
| `F`, or R3 | Raise or lower the lantern. Seeing, or unseen. |
| `M`, or d-pad up | Mark the room on the map, or unmark it. Nothing reads the mark but you. |
| `B`, or d-pad down | Bar the doorway you are standing at. Loud. |
| `Shift`, or L3 | Run. The Warden is slower than you are. |
| `Esc`, or Start on a pad | Pause: the settings, and naming what you carry |
| D-pad or left stick, `A`, `B` | Move the focus in a menu, press what is focused, back out |

There is one interaction verb. Anything you can act on tells you so when
you are close enough, and E does it.

Working out what is in your satchel is done in the pause menu, where it
costs nothing but being wrong. Name all three unknown kinds at once: get
one wrong and none of them settle, and you are not told which one it was.
Drinking one tells you too, of course, and the shop will name one for a
gem - what the shop is really selling is finding out sooner.

Every menu can be driven from the pad alone - the title screen, the pause
menu, the end of a run - so the game can be played on a machine with no
keyboard. `yarn test:pad` plays it that way. The one thing that still wants
a keyboard is typing a seed and answering the library's tome; on a Deck
those go through Steam's on-screen keyboard.

### On a phone or a tablet

The same game, with two thumbs. Anything held in the hands - a coarse
pointer, touch points, no hover, which is what the platform says rather
than what the user agent claims - gets the on-screen controls; a desktop
gets them the first time its screen is touched, and can turn them on or
off in the options.

| Touch | Action |
| --- | --- |
| Drag on the walking half of the screen | Move. The stick appears under the thumb. |
| Drag on the other half | Look |
| Shove the stick past its rim, or `RUN` | Run, until the stick is let go |
| `USE` | Use what you are standing at. It lights when something is in reach. |
| Tap a satchel slot | Drink, read, or set down what is in it |
| `LAMP` | Raise or lower the lantern |
| `BAR` | Bar the doorway you are standing at |
| `II`, by the map | Pause |

Which is a phone and which is a tablet is the short side of the screen,
and the two are laid out differently. A phone held sideways is under four
hundred pixels tall, so it gets a tighter HUD, a smaller minimap, a
narrower satchel, a stick and buttons a thumb can find without looking,
the whole screen and a landscape lock where the browser allows it, and a
line asking to be turned sideways where it does not. A tablet keeps the
monitor's layout and gets the controls at a size for hands held further
apart. The tome has a `Leave` button on a touchscreen, because "Esc or B"
is a promise it cannot keep there. `yarn test:touch` plays all three.

## Rooms

Ten kinds, of which the five special ones appear at most once per run:

- **Start**, **Exit** and plain **Chambers**.
- **Vault** - more loot to look at, one gem to take.
- **Trap room** - a ring of spikes between the door and the gem.
- **Shop** - a life for a gem.
- **Library** - a tome that shows you numbers and asks for them back.
- **Memory chamber** - crystals glow in an order; choose them in the same order.
- **Challenge room** - an idol on a plate. Weigh the plate down before you lift it.
- **Arena** - an open floor with cover at the edges.

## Run it

```bash
yarn install
yarn dev            # http://localhost:5173
```

```bash
yarn build          # dist/, what Cloudflare Pages and Electron ship
yarn typecheck      # must be clean; there is no error budget
yarn lint
yarn test:smoke     # drives the real game in a browser (see below)
yarn test:perf      # what a room costs, against a written-down budget
yarn test:prod      # builds dist and plays it, the way it actually ships
yarn test:desktop   # packages the desktop build, opens it, and plays that
yarn electron-dev   # the desktop shell against the dev server
yarn electron-dist  # a packaged desktop build in dist-electron/
yarn generate-icon  # redraw build/icon.png
```

## The editor

In a development build, `http://localhost:5173/?editor` opens the authoring
tools. They write into the same registries the game reads, so nothing made
in them can fail to reach a run:

- **Rooms** - lay out a room on a grid, see it in the real room shell, and
  mark it live. The generator then places it whenever it needs a room of
  that kind, alongside the seeded arrangements rather than instead of them.
  Anything the game would refuse to draw - a prop in a doorway's path, one
  standing in a brazier, one where the gem or the floor's key can land - is
  listed in red under the grid as you place it, by the same rules that hold
  what ships. Export the JSON to ship it.
- **Props** - inspect one of the twenty props: footprint, solidity, rotation.
- **Surfaces** - paint a 128x128 tile and save it under a surface id. Every
  floor and wall using that surface changes at once, in a running game too.
- **Mosaic** - a 16x16 grid of coloured shapes, saved as a surface.

The editor is behind `import.meta.env.DEV` and a dynamic import; a
production build does not contain it.

## Keeping the frame time steady

Three things were found to allocate on a timer, which is what an
intermittent stutter usually is, and all three are fixed. Rapier's
interpolation snapshotted a position and rotation object for every body on
every physics step, and a fixed timestep runs several steps on a late frame,
so the frames that were already slow allocated the most - interpolation is
off, and nothing here needs it. A room's props were one rigid body each,
bodies that never move; they are one static body now. Every noise-based
sound effect built and filled its own buffer, so the Warden knocking on a
wall was a synchronous stall every few seconds; there is one shared buffer.
Surface textures are cached per tiling rather than cloned and disposed on
every walk through a doorway.

If you are chasing a new one, measure allocation rather than frame time -
frame time on a software renderer tells you nothing:

```js
// In the console, with a run going.
const h = () => performance.memory.usedJSHeapSize;
let a = h(); setTimeout(() => console.log((h() - a) / 1024, "KB/s"), 1000);
```

`yarn test:perf` measures every room in a fixed 78-room corpus across all three
floors and holds the result to a budget. It also writes a ranked local report
with the hottest rooms, accepted baseline and remaining headroom. What a room
costs today:

| | Worst room | Budget |
| --- | --- | --- |
| Draw calls | 82 | 96 |
| Triangles | 6,945 | 8,800 |
| Live geometries | 93 | 112 |
| Live textures | 10 | 16 |
| Held after a collection, sprinting 10 s | 0 MB | 8 MB |

The budgets are the measured worst case with about a third on top. They are
not aspirations; they are a tripwire for the day a cycle adds a mesh per
prop or an allocation per frame, which has happened twice here and was
caught by nothing.

The memory figure is what survives a forced collection, not allocation per
frame. Allocation rate was the first thing measured here and it turned out
not to be a measurement: whether a collection lands inside a ten second
window is luck, and the same unchanged build read -94, -42, +0.04 and +23
KB a frame across four runs. What a collector keeps up with is not a
problem; what outlives one is.

The maintained policy, baseline and issue ledger are in
[`docs/PERFORMANCE.md`](docs/PERFORMANCE.md).

## Testing

`yarn test:smoke` starts a browser against a dev server on port 5199 and
plays: menu, start, stand on the floor, explore by pressing E, collect gems,
walk to the exit's neighbour, be refused without the toll and admitted with
it, descend a floor, win from the last one, restart, die, then check the
economy and the Warden - the toll rising per floor, a relic changing a rule,
a charm eating a hit, the Warden walking into the room. It fails on any
uncaught page error.

`yarn test:layout` needs no browser: it checks the room geometry over every
room size, every shape, all fifteen combinations of doors and 500 seeds -
anchors clear of the door lanes and of each other, nothing standing in a
lane the room it is in actually has, no two solid props standing inside each
other and no prop's footprint reaching into a lane or through a wall, spikes
in every trap room, the gem reachable, the generator connected, every
arrangement standing each prop on an anchor of its own, every shipped
template legal in all eight ways round a room can be furnished, and every
item findable with a look nothing else has.

`yarn test:walk` checks the collect–pay–descend loop using physical walking,
door interaction, shoves, a shop bomb purchase and the Keeper escape. It
never teleports or restores lives. The
walker knows the full generated map and avoids known furniture and hazards;
this is traversal and counterplay evidence, not a human balance playtest.
Set `PORT` to the running dev server (default 5200), `CHROMIUM_PATH` to your
Chromium executable, `WALK_SEED` to choose a run (default 11), and
`WALK_FLOORS=1` to check only the first descent. `WALK_SHOVE=off` compares
the route without combat counterplay. Notices and damage events are logged
to help explain failures.
On Windows, `WALK_RENDERER=hardware` uses D3D11 instead of software rendering;
the probe reports the actual WebGL renderer so the timing evidence is clear.

`yarn test:audio` listens: it taps whatever the game connects to the
speakers and measures samples, so a cue that runs without making a sound
fails. Every cue heard over the room, the ones you are meant to notice well
clear of it, muting silent, and the ambient bed opening up as the floor is
roused.

`yarn test:rows` asks whether the creatures read their rows. The
susceptibility table says what each thing on the floor answers to, and
for a dozen runs most of it was a document: the store put the Harrier
down by "same room as the bomb" while its row said [blast] 0.20, the rats
ran from feet while their row said [loud] 0.45. In the running game: a
barrel bursting across the room scatters the rats, the moth goes to the
brightest thing in its room and leaves your lantern for the wisp when the
flame is low, the Sentry's patience follows the light in the room rather
than the lantern's switch - and the wisp beside you keeps it halved until
the lantern is down and the wisp gone, which is the wisp's price - and a
bomb in the room next door puts the Harrier on the floor.

`yarn test:touch` plays it with two thumbs, on an emulated phone, the same
phone held upright, a tablet, and a desktop that is never touched: the
stick appears under the thumb and walks, the rim runs, the other thumb
looks, both at once, USE opens a door, a tap on the satchel drinks, LAMP
and the pause answer, the options' touch rows work and switching the
controls off takes them away, and the desktop never grows a stick. It
sends real touch events through the debugger, so it drives the game's own
reading of a touch and not a stand-in for one.

`yarn test:perf` walks every room of every floor and holds what it costs to
the budget above. It also walks one floor four times over to catch a room
that forgets to dispose what it made.

`yarn test:prod` is the only one that touches the build that actually
ships. Everything else drives the dev server, and the production bundle is
a different program: `import.meta.env.DEV` is statically false, so every
probe the other checks lean on is gone and the editor is dropped entirely.
So this one builds `dist`, serves it, and plays it the way a stranger
would - through the menu, the keyboard and what is on the screen - and
reads the rest off the built files: no probe handles shipped, no editor
strings in the bundle, `?editor` giving the game, nothing 404ing, and a
first visit under 1.35 MB over the wire (1.05 MB today, almost all of it
rapier and three).

```bash
yarn dev --port 5199   # one terminal
yarn test:smoke        # another
```

It needs a Chromium binary; set `CHROMIUM_PATH` if it is not at the
Playwright default.

## Desktop packaging

Electron Builder produces `dist-electron/`. The entry point is CommonJS
(`electron/main.cjs`) because `package.json` sets `"type": "module"`. The
Linux AppImage is verified to launch and run with no network; Windows and
macOS targets need their own hosts.

## Cloudflare Pages

- Pages project name: `threejs-gem-dungeon-editor-git`
- GitHub repository: `BorisThoris/threejs-gem-dungeon-editor-live`
- Production branch: `main`
- Root directory: `.`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION=22.16.0`
- Public URL target: `https://threejs-gem-dungeon-editor-git.pages.dev/`

Do not enable Cloudflare Access for the demo deployment. Leave frame-blocking
headers unset so the portfolio can iframe the public build.
