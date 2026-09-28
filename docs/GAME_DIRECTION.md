# Game direction

Gem Dungeon's strongest promise is a scavenging expedition through a place
that hears and reacts to you. Gems are both escape money and temptation.
The useful question is whether another discovery is worth the harder journey
back. The block-cut architecture, practical light and working watercourse
give that decision a place to belong.

Three existing strengths should guide expansion:

- Tools change situations: barricades change pursuit routes, bombs open
  passages and interrupt threats, and the lantern trades visibility for exposure.
- Creatures and mechanisms share signals. Learning a response can help in a
  later encounter without introducing another special-case rule.
- Exploration leaves evidence: district landmarks, physical secret trails,
  visited room outlines and persistent environmental changes.

The next improvements should make these relationships easier to discover and
use. Additional scenery earns its place when it helps someone recognize a
route, anticipate a threat, or choose an optional detour.

## Implemented refinement: remember controlled passages

The maps previously showed the same connection through open and barricaded
doors. That hid the consequences of one of the player's strongest tactical
choices precisely where they plan a return route.

The rotating minimap and paused floor map now distinguish player barricades
from temporary grates. Both read existing run state, preserve pause, clear
expired grates and retain independent barricades. Connections between two
unexplored rooms remain private until visited or mapped. This records learned
geography without supplying a route through unknown rooms.

Browser coverage exercises construction and recovery through real controls,
grate expiry, simultaneous barriers, floor-map agreement, knowledge boundaries,
Gloom and a new run. Desktop and phone captures support visual review.

## Implemented refinement: recover an expedition

The learned maintenance and landmark clues now also remember ways back.
They identify blocked passages, offer a detour through visited rooms when one
exists, and resume their original directions when a grate lifts. Both use one
navigation owner. A clue cannot reveal a bypass the player has never walked,
and the physical marks continue to describe the original building route.
This lets the player change the floor and still make use of earlier discoveries.

## Implemented refinement: remember useful places

Visited shops and shrines now remain recognizable on both maps. The pause
chart keeps their place names, bomb stock, font use and locked-entry reminder
together, and lets the player highlight one while planning. A hidden font
uses its actual district history and remains independent of the ordinary
shrine. Mapping does not reveal undiscovered services. These are memories of
places the player found, with no new waypoint route or travel action.

Discovered district landmarks also appear by their arrival names in the pause
chart. Selecting one highlights its existing map symbol, and the tally's source
identifies where its trail begins. A clue that says to return to a landmark now
has a named place to find on the chart, even after an interrupted expedition.

## Implemented refinement: let the ecology remember

A frightened toad colony now stays quiet when the player leaves and returns.
Its existing recovery deadline survives the room remount, including a paused
revisit, while new floors begin with fresh animal memory. This makes the
absence of a familiar chorus a reliable trace of recent noise. The ecology
browser check covers recovery without restarting the timer, initial hidden
meshes, pause, fresh-floor isolation and the existing drainage migration.
The ground readout now names the actual chorus: singing or quiet. It follows
the same count as the audio, and quiet colonies stop their singing throat
motion. Habitat presence alone no longer claims that a drained or frightened
colony is singing.

Opening a secret passage also preserves recent wildlife responses. All eight
ambient creatures that retain recovery state share the room-memory lifetime,
so discovering a wall cannot reset a retreat, folded shell or cooling warning.
The building changes while its inhabitants remember what just happened.

## Implemented refinement: read a threat's body

The Warden now has a faceted hood, shoulders and reaching arms instead of a
featureless column. Its approach warning changes the silhouette, while a real
stagger visibly bows the hood and lowers the arms and light. The window a
shove buys is readable without consulting a HUD line. Both poses follow the
existing combat state, pause and recovery; no new threat rule or timer is added.

The player's hand also rests lower during exploration, leaving more of the
floor and its clues visible. Charging raises it into the existing shove pose;
full extension, reach and combat timing remain unchanged. Desktop and portrait
captures confirm the relaxed hand remains visible with its sleeve attached.

## Implemented refinement: trust the ground beneath you

The ground readout now follows the surface beneath the player's feet, using
the same material owner as footsteps and sprint noise. Crossing from moss
onto paving changes the guidance within the room; draining a channel changes
it even while standing still. Pausing preserves the water and its description.
This makes existing quiet paths and water crossings understandable before a
dash, instead of describing every part of a chamber by its biome.

## Implemented refinement: return to unfinished waterworks

Discovered waterworks now also remain useful in the pause chart: the sluice
and reliquary show whether the circuit is untouched, draining, ready or emptied.
Selecting either highlights its known room. This lets an interrupted expedition
become a deliberate return for the remaining reward, without revealing an
undiscovered endpoint or adding a separate objective tracker.
The reliquary's local prompt acknowledges drainage too: returning early asks
the player to wait for the water, instead of sending them back to a sluice
they already opened. Its status wording shares the watercourse owner with
the remembered map entry.

## Implemented refinement: leave time to read the warning

The first danger's teaching line now survives simultaneous passive wildlife
reactions. Ambient observations remain eligible for a later occurrence rather
than counting as taught while immediately erasing a more useful warning.
Reading time uses the paused run clock and stays protected while a player
focuses the text to read it; direct action feedback stays immediate.

## Implemented refinement: distinguish quiet walking from running

The visibility readout now names the actual stride used by footsteps and
sprint noise. Ordinary walking was previously fast enough to be mislabeled
as running. Walking and running remain distinct under swift and mire effects,
while pushing against a wall reads as still. This makes the player's own
movement feedback agree with the noise that creatures can hear.
Footsteps and head movement now also follow distance consistently across
display rates. They measure travel using elapsed physics time, which prevents
fast displays from suppressing footsteps or publishing alternating zero and
inflated movement speeds to creature awareness.

## Implemented refinement: bring knowledge back from a loss

The ending now offers a compact review of lessons and inscriptions first
recorded during the expedition. It reuses the existing observations, benefits
and wall text, and explains that this knowledge is kept for the next run.
Previously learned entries stay out of the review. Expanding it is optional;
keyboard and controller readers can reach each entry, including on a phone.
This gives an unsuccessful expedition a visible lasting discovery without
adding rewards or changing what the Ledger remembers.

## Implemented expansion: a quieter return along the watercourse

Draining the waterworks now exposes usable quiet footing along the drawn
channel and its terminal basins. The garden silt, rust-stained sediment and
pale mineral bed keep their existing appearance and names, with soft footsteps
and a shorter, weaker sprint signal. Water outside the channel stays wet.
The mechanism therefore changes the return journey as well as revealing the
reliquary: a player who opened the circuit can follow its bed back while
advertising less noise. Earlier loud sounds still expire on their original
deadlines; stepping onto silt does not erase an alarm already raised.

## Next design questions

The latest 2026-09-28 integration check rebuilt and exercised both the web
and Windows targets with the corrected physics-time movement readings. The
movement probe escaped all three floors on seed 11 through 19 doors, bought
two recovery lives and its Keeper bomb with scavenged gems, carried the bomb
downstairs, and finished with two lives and one gem. The escape summary then
started a fresh run. It used no teleports or granted resources after starting.
All three integration checks passed under desktop input/display isolation.
This establishes traversal, pursuit and economy evidence; it does not
substitute for observing a first-time human player.

1. Can a first-time player explain why they were detected and choose a different
   response on the next attempt? Observe an unassisted run before adding more
   threats or HUD explanation.
2. Does following an optional clue change the return journey in an interesting
   way? Evaluate the loud sluice activation and newly quiet return path before
   extending the circuit further. Keep the paid exit achievable without that
   expedition.
3. Can a player recognize a useful place after leaving it? Evaluate remembered
   services and landmarks before adding more room types. Preserve the distinction
   between what was discovered and what the generator knows.

These are follow-up design questions, not claims that the broader inhabited
dungeon expansion is finished. Its implementation history remains in
[World Expansion](WORLD_EXPANSION.md).
