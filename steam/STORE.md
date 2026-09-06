# Store page copy

Everything a Steam store page asks for in words, written once here so the
page and the game cannot drift apart. `yarn test:layout` holds the numbers
in this file against `src/game/world.ts`: if the toll changes, this fails
until somebody updates it.

## Name

Gem Dungeon

## Short description (max 300 characters on Steam)

> Take what you can carry and pay the door. Every gem you lift wakes the
> thing that walks the floor - and the floor's own spikes do not care
> which of you stands on them.

## About this game

**Three floors down, and every door out costs gems.**

Three, then five, then seven. Whatever you are still carrying when you
climb out is what you got away with, and nothing else counts. Die down
there and none of it comes back up.

**Every gem you take wakes the Warden.**

It cannot be fought and it cannot be outrun quietly - it hears a sprint,
and while it can hear you it walks straight for the room you are in. It
wins by being in the doorway you wanted. So the game asks you the same
question once a room: the exit is open and there are four more gems on
this floor. Is one more room worth it?

**The dungeon is not on its side.**

Trap rooms are somewhere you can choose to fight from - the spikes wound
whatever walks into them, and two wounds throw it across the floor. It
learns, though. After that it walks round anything that has bitten it, so
the trick is worth exactly twice and then the room is a trap room again.

**Light is a decision, not a setting.**

Raise your lantern and you can see the room; you are also the brightest
thing on a dark floor, and everything down here knows it. Put it down and
you have a hand's worth of glow and nobody knows where you are. It only
burns oil while it is up. Raise it and a wisp gathers to lead you toward
the room the map does not show - and it is the brightest thing on the
floor, for exactly as long as the Warden can see your light.

**Bring your own answers.**

Thirteen kinds of thing hide in the chests, and which look means which is
shuffled every run - the only way to learn what a cloudy potion does is to
drink one. A fifth of them are blessed and a fifth cursed, and that much
you can see from across the room. Three of them are set down on the floor
rather than used on yourself, and they are still there when you come back
through: a snare, a ward stone, and a knot of loose iron you will only
drop once. A fourth is set down and is gone three seconds later, with
whatever stood near it - you, the thing hunting you, or a wall that was
hiding a room.

**Five ways to go down.**

A Vagrant with nothing and no debts. A Tomb Robber who opens with two gems
on a floor that already knows them. A Ratcatcher who knows every device on
sight and has one life fewer. A Courier, faster, with half a satchel. A
Pilgrim with four lives, whom the dungeon minds twice as much. None of
them is the easy one, and all of them are there from the first run.

## Features list (short bullets for the page)

- Three floors, each larger, darker and more awake than the last
- A Warden that hunts by sound and light, and can be wounded but never killed
- A Cutpurse that takes what you carry to a nest you can walk to
- Twelve items whose names are hidden and whose blessings are not
- Five delvers, all available from the first run
- Ten deeds, and a seed on every run so you can walk the same dungeon again
- Full gamepad support, key rebinding, captions, and high-contrast marks
- Verified on a 1280x800 screen for Steam Deck

## System requirements

| | Minimum |
| --- | --- |
| OS | Windows 10, macOS 11, or a modern Linux (incl. SteamOS) |
| Processor | Any 64-bit dual core |
| Memory | 4 GB RAM |
| Graphics | Any GPU with WebGL 2 |
| Storage | 300 MB |

## Accessibility (Steam's accessibility fields)

- Subtitles/captions for the sound cues that carry information
- Colour is never the only carrier of meaning (high-contrast marks option)
- Camera shake and head bob can be turned off independently
- Sprint on a press rather than a hold
- Full key rebinding; full gamepad play including every menu
- Adjustable overlay text size

## What is not on this page yet

Capsule art, screenshots and a trailer. `scripts/tour.mjs` photographs
every room and every screen and is a starting point for the screenshots,
but it should be run on a real GPU rather than the software renderer the
checks use.
