# The Deepworks Plan

**What fifteen deep researches and one audit of our own code say Gem Dungeon
should become.**

Not a survey of other games. A design document for this one, with numbers.

---

## Part 0 — how to read this

Every claim behind this document went through adversarial verification: three
independent votes, two refutes to kill it. **Roughly a third of what the
research proposed died**, including several things I had already written into a
draft. Where a proposal below rests on something that did not verify, it says
so in the text rather than in a footnote.

Three conventions:

- **(3-0)** means unanimous verification against a primary source.
- Where I extend a finding beyond what the source says, it is marked as my
  inference, not theirs.
- Part 6 is the register of what *failed*. It is the most useful part of the
  document for anyone who has read the same blog posts I had.

---

## Part 1 — the diagnosis, measured

79 declared bus events. 140 listener registrations. **120 are presentation
only** — Audio.tsx (62), Captions.tsx (40), deeds/watch.ts (12),
Transitions.tsx (6). Twenty do anything else.

Files that listen at all, per threat system:

    warden/  0 of 7     sentry/  0 of 3     thief/  0 of 4
    keeper/  0 of 3     reaper/  0 of 2     mobs/   1 of 11

The Warden, Sentry, Cutpurse, Keeper and Reaper subscribe to nothing. Each is a
frame loop polling the store for its own private facts. They cannot react to
each other, to a trap firing, to a barrel bursting, to a wall opening, or to the
player being seen by something else.

**That is the whole of the flatness.** Not bad systems — ten good ones with no
channel between them, so the player can never cause anything they did not
already know they were causing. Every "spectacular" moment in every game
researched here is a second system reacting to the first.

Harvey Smith described our codebase in 2001, before it existed (3-0):

> "Design object behaviors by **type**, rather than by instance. This is central
> to designing a behavior system rather than a set of puzzles."

and named our failure mode exactly: *"each instance of a gameplay element must
be visited and reconfigured manually."*

---

## Part 2 — the seven laws

**Law 1 — one vocabulary, not n² wires.**
Noita ships ~488 material definitions, ~40 capability tags and **~146 reaction
rows** against a naive pairwise space of ~10⁵ (3-0, verified against the shipped
`materials.xml`). Rules name a *tag* where a thing would go. And the largest
saving is not the tags — it is that **no rule means no interaction**. Silence is
the default, not a fallback.

**Law 2 — the receiver declares susceptibility.**
*"How much damage a material deals is not a property of the material, but rather
a property of the DamageModelComponent of the to-be-damaged entity"* (2-1).
Every actor defaults to immune. A material knows nothing about creatures.

**Law 3 — the rule is transparent; the magnitude is not.**
Four independent studios, four different words for one calibration. Red Hook
exposed the stress meter numerically and kept afflictions opaque (3-0).
Frictional: *"when we tweaked it so it was much less clear how it worked, it
sparked player's imaginations"*. DCSS wants *"transparent rules"* and a game
winnable without spoilers (3-0). Smith wants plans to *"fail or succeed
comprehensibly — the system does not care, it has no agenda"* (3-0). They agree
once you split rule from magnitude. Prey states the boundary precisely:
**ambiguity about *which* is fine; ambiguity about *what happens when* is what
turns tension into frustration.**

**Law 4 — pressure must oscillate, not ramp.**
Left 4 Dead's Director is a four-phase state machine with published durations
(3-0, Booth's own GDC PDF): Build Up → Sustain Peak (3–5 s past the peak) →
Peak Fade (waits for a natural break so the relax is not consumed by an
in-progress fight) → **Relax: 30–45 s, or until the team has travelled far
enough toward the next safe room.** Dead Cells shipped the monotonic version,
players hated it, and Motion Twin's own patch notes target *"a Malaise that
should stay in-between 3 and 7 during most of the run"* — a cycle, not a ramp
(3-0). Our `FLOOR_PATIENCE_S = 300` is the version that failed.

**Law 5 — escalation compounds across depth, and is spent in lumps.**
Risk of Rain 2 (3-0, wiki plus two independent reimplementations):
`coeff = (playerFactor + minutes × timeFactor) × 1.15^stagesCompleted`.
Descending multiplies everything already accrued. And the coefficient reaches
the player **only through spawn budgets** — `accumulatedAward` is floored to an
integer each tick with the fraction carried, so pressure **arrives in pulses**,
which is what makes it read as *the world sent something* rather than a slider
moving.

**Law 6 — darkness must pay, in named steps.**
Darkest Dungeon's light is 0–100 in five named bands, and every increment of
danger is bought with a quantified increment of reward: at zero light, +40%
stress and +12.5 monster accuracy — but also +3% player crit, +30% gold, and a
75% chance of *two* bonus rewards (3-0). Our lantern is a pure penalty. Lowering
it gives nothing.

**Law 7 — a flat mechanic must be cut, and there is a stated test.**
DCSS's manual, verbatim (3-0): the anti-grinding test is conjunctive —
*"activities that have **low risk**, take **a lot of time**, and bring **some
reward**… it encourages players to bore themselves. Even worse, it may be
optimal to do so."* And the no-brainer test: *"wherever there's a no-brainer…
that's a horrible lost opportunity for fun."*

Run against our own game, three systems fail: the unidentified potions and
scrolls, sweeping a floor for gems past the toll, and walking back to a brazier
to refill oil. **Part of what we are missing is removal.**

---

## Part 3 — the systems

### 1. THE DIN — the shared vocabulary

*Laws 1 and 2. Everything after this gets cheaper; nothing else should be built
first.*

Not a new subsystem. **`body.ts` generalised.** We already ship a three-member
tag vocabulary — `"ground" | "flying" | "ghost"` — and it is the one place in
the codebase where a rule written once (spikes bite ground, not flying) pays off
across systems with no wiring. Extend it to about twenty tags:

    emitted      [loud] [bright] [blast] [hot] [metal] [wet]
    borne        [ground] [flying] [ghost]          ← already shipped
    surfaces     [stone] [moss] [tile] [dirt] [water]
    states       [lit] [barred] [broken] [snared] [carried] [owed]

A bomb declares what it **is**: `[blast] [loud] [bright] [hot]`. It never learns
the Warden exists. Each threat carries a susceptibility block declaring what it
**answers to**, and **defaults to answering nothing**:

    Warden    hears  [loud] ≥ 0.30   → investigates the source room
              fears  [blast]         → staggers; two staggers rout it
              blind to [bright]      → it carries its own lamp
    Sentry    sees   [bright] ≥ 0.50 → acquires
              deaf   to [loud]       → it is a post, not an ear
    Cutpurse  wants  [carried] [metal]
    Harrier   answers [blast]; deaf to [loud]
    Reaper    answers NOTHING

**The Reaper's empty block is the design, not an omission.** Everything else on
the floor can be routed, lured, blinded or bombed. It is Noita's snowcrystal —
the creature whose susceptibility list is empty — and one data row now carries
what is currently implicit across five files.

Take the one improvement the research says Noita left on the table: their
receiver lists match by exact material *name*, so a new material harms nobody
until added to every entity. **Ours match by tag** — `hears [loud]`, not `hears
bombBurst, barrelBurst, grateDrop, …` — so a new noisy thing is heard by
everything that listens for `[loud]` the day it lands. We are authoring the
vocabulary from scratch, so this costs us nothing.

Propagation uses Thief's room-portal graph, which we already have in
`dungeon/layout.ts`. Leonard says the sound design would probably have failed
without it (3-0):

    same room  × 1.00     doorway × 0.35     wall × 0.00     half-life 2.5 s

    bomb burst      1.00    grate dropping   0.70    barrel      0.60
    bar breaking    0.50    key dropped      0.50    dart        0.40
    sprint (stone)  0.35    snare springing  0.35    sprint (moss) 0.15
    walking         0.05    cutpurse         0.20    gem taken   0.00

That last row is a design statement: **theft is silent.** Stealing and smashing
should not feel alike.

**The honest cost.** Noita's own file warns that tagging a material obligates
you to author its companion (`[meltable]` needs a `_molten` variant). Budget one
companion rule per tag. Tags make *variants* free, not *ideas*.

**What it buys on day one, with no new content:** the Warden investigating a
trap it did not spring. The Sentry turning toward a burst. Rats fleeing a bomb.
The Harrier roused by a dropped grate. Every one is a moment the player caused
without being told they could.

### 2. THE LADDER — awareness with rungs

*Law 3, and Thief's numbers, every one of them verified 3-0 and every one a
constant we do not currently have.*

Four rungs replacing calm/roused, one bark each:

    0 Unaware   1 Uneasy   2 Searching   3 Hunting

    reaction delay        750 ms (moderate stimulus) / 500 ms (strong)
                          break the stimulus inside the window → nothing happens
    retrigger window      12 s of instant reaction after any alert
    discharge             Uneasy 6 s → Searching 14 s → Hunting 22 s
    descent               never skips a rung
    min relax after peak  once it has Hunted, it never returns below Uneasy
                          for the rest of the floor

Two of these are worth more than they look.

**The reaction delay** is what makes stealth forgiving without being easy: you
can be seen and *un-see* yourself. That is a verb we do not offer at all today.

**Min relax after peak** is one number, and it gives the floor a memory of what
you did on it. A large part of what "the systems don't feel connected" means is
that nothing on our floors remembers anything.

Thief's stated goal is our brief exactly (3-0): *"we tried to design AIs with a
broader range of awareness than the typical two states that AIs exhibit:
'oblivious' and 'omniscient.'"*

### 3. THE COEFFICIENT — replacing the floor timer

*Law 5. Delete `FLOOR_PATIENCE_S = 300` and `REAPER_WARNING_S = 45`.*

One number, three inputs, recomputed each tick as a pure function (not mutated
on transition — that is how RoR2 does it and the distinction matters):

    heat = (dwellMinutes × 1.0 + alarm × 0.5) × 1.15 ^ floorsDescended

Dwell, greed and depth stop being three unrelated pressures and become one that
compounds. A slow floor one now costs you on floor three, which is the "floors
get worse as you go down" intent of cycle 6 finally given a mechanism instead of
three hand-tuned tables.

And `heat` never kills. It **buys**, in lumps, exactly as RoR2 spends credits:

    1 credit   a Cutpurse enters the floor
    2          the bats are roused
    3          the Warden's alert ceiling rises one rung
    6          a Harrier goes up

Never a stat nudge the player cannot see. The accumulator floors to an integer
with the fraction carried, so pressure arrives as *events*, not as drift.

**Opt-in greed feeds the same budget** and the same payout. RoR2's Shrine of the
Mountain multiplies the boss budget by `(1 + stacks)` and the reward by the same
term (3-0) — *"that is what makes it read as raising the stakes rather than as a
separate minigame."* Our alarm should have been this from the start.

### 4. THE CYCLE — the thing we have none of

*Law 4. This is the single largest omission the research found, and it is
separate from the coefficient.*

We have nothing that ever relaxes. Left 4 Dead's shipped phases, with Valve's
own durations (3-0):

    Build Up      spend the budget until intensity crosses the peak threshold
    Sustain Peak  hold full threat 3–5 s past the peak
    Peak Fade     wait for a natural break in the action — this exists so the
                  relax period is not consumed by a fight already in progress
    Relax         30–45 s of minimal threat, OR until the player has travelled
                  far enough toward the exit, whichever comes first

**Relax is dual-gated: time OR forward progress.** That is the detail to copy.
A player who keeps moving earns quiet; a player who camps waits it out.

The synthesis — and this part is my design decision, not Valve's stated rule,
because the claim that the Director modulates *pacing* rather than *difficulty*
errored out under the session limit and is unverified:

> **The coefficient sets the amplitude. The cycle sets the frequency.**
> How much the budget buys comes from depth, greed and dwell. *When* it spends
> comes from the cycle.

At roughly 90–120 s per cycle, a twenty-minute run holds **ten to thirteen
cycles, three or four per floor.** Our intensity proxy needs no biometrics — we
already emit everything required: damage taken, `wardenProximity`, being in a
Sentry beam, the alarm level, and time since the last threat contact.

### 5. THE LANTERN BARGAIN

*Law 6, plus Grip's shipped-failure finding on hoardable resources.*

**(a) The oil stops being a stockpile.** `LANTERN_FULL_S = 150` is a tank, and
DCSS cut a food clock for exactly this — *"the flavour of eating food didn't
really make up for the inherent busywork of inventory juggling"* (3-0), plus the
second charge that one shared clock standing in for many pressures is worse than
tuning each separately. Both apply to our oil.

Ours becomes a wick: burns only while raised, caps at **60 s**, refills to the
cap at any brazier. You can never carry more than a room's worth. The decision
moves from "when do I spend my tank" (once a run) to "is this room worth light"
(thirty times a run).

Follow DCSS's deletion recipe (3-0): when the Ghoul lost chunk-eating they did
*not* invent a replacement resource — the heal became automatic on kill and the
rot timer was deleted outright. **Collapse a deleted resource's beneficiaries
into triggers on actions the player is already taking.**

**(b) Darkness pays, in five named bands.** The meter is `glim` — how lit *you*
are, 0–100, read from the Din.

| band | glim | seen at | the floor gives back |
|---|---|---|---|
| Raised | 76–100 | 15 m; Sentry acquires in 0.5 s | — |
| Guttered | 51–75 | 9 m | — |
| Shrouded | 26–50 | 5 m | one chest in four holds a second thing |
| Dark | 1–25 | 3 m | **gemveins show in the walls** |
| Blind | 0 | 1 m | **cracked walls show without a bomb** |

**Gemveins are the key idea.** Gems visible only below 25 glim turn "lower the
lantern to hide" into "lower the lantern to see a different world": the same
room means two things depending on how you enter it. It is the cheapest possible
version of Prey's principle that a space should have more than one reading, and
it uses two systems we already ship. Critically, it is a reward you can only
take *while* in the danger — it cannot be banked, which is Grip's whole point.

### 6. SEMI-LEGIBILITY — resolving run 26

Run 26 made the HUD maximally legible on purpose. Law 3 says that was half
right.

    keep as words      "the floor tires of you"   "wary of spikes"
    delete as numbers  "· 9s"   "· 5s"   "· 12s oil"
    keep as numbers    the toll, the gem count, the price

Economic facts stay numeric because the player is entitled to plan against
them; fear clocks do not, because a player who can count does not hurry. Every
deleted number is replaced by a **physical** tell, not a hidden state: the flame
shortens, the drone rises a semitone, the Keeper's slab visibly lifts.

And the floor's heat is **named, never counted** — RoR2's nine unhinged band
names carry zero mechanical weight and do the emotional work a number cannot
(3-0):

    the floor is quiet · the floor has noticed · the floor is looking
    the floor is awake · IT KNOWS WHERE YOU ARE

### 7. VERBS, NOT KEYS — audited per gate

Arkane's rule has a hedge that is the useful part (3-0). Prey ships literal
keycards. It is **not "no locks" — it is "no lock whose only solution is its
key"**, and the audit is per *gate*, not per tool:

    vault door     the key · bomb the weakened wall beside it · snare the
                   closing mechanism
    cracked wall   a bomb · or simply visible and passable below 25 glim
    grate          an unlit bomb props it · a snare holds it
    barred stair   the toll · the Keeper stalled

**Brief a tool as a physical behaviour, never a genre function** (3-0). Ours,
restated, and one fails:

    bomb     "a pressure wave that moves and breaks things"    ✓
    lantern  "a portable source of light and heat"             ✓
    snare    "a device that holds a moving thing in place"     ✓
    key      "the thing that opens the vault"                  ✗ — a function

**The key is the tool most in need of redesign, and the report says so in as
many words.** Rebrief it as *a heavy piece of cut metal* and three verbs fall
out, all of them Din writes: heavy weights a pressure plate; metal dropped is
`[loud] 0.50`; unique makes carrying it bait for the Cutpurse.

**Every verb needs a legible limit** (3-0). Arkane could not stick gloo to gloo
— a console perf ceiling — and converted it into design language: certain
surfaces visibly repel it. *A universal verb is unreadable*; you cannot plan
against a tool with no edges. One signposted exception each:

    bomb: wet stone does not crack   ·   lantern: a draft kills the flame
    snare: will not set on tile      ·   key: a vault re-locks behind you

### 8. THE OFFER — six relics that finally matter

Blizzard's surviving claim (3-0) is the diagnosis of our relics: legendaries
should **alter ability behaviour or unlock new play**, not carry generic stat
affixes. Ours are meant to be rules changes and read as modifiers.

Four changes, all table rows:

- **Three offers, not a shelf.** Show 3 of 6, seeded. Hades prices removing one
  choice at 2 then 3 Heat — *more per rank than enemy damage, count or health,
  which are 1 each* (3-0). Choice count is the most expensive thing in the game.
- **Slots and exchange.** Relics occupy named slots (Light, Step, Hand, Luck). A
  second relic in an occupied slot is offered as an **exchange that upgrades a
  tier**, never a refusal (3-0).
- **Risk rolls rarity.** A relic found behind a cracked wall, in a vault, or
  below 25 glim rolls the better tier (3-0). This makes the darkness bargain and
  the secret system *feed* the relic system — three flat things become one.
- **Two duos.** Named pairs unlocking a third effect (3-0). Six relics is fifteen
  pairs; author three. Three table rows, and the shop has a build in it.

### 9. THE SATCHEL THAT RESOLVES

Our players hoard because we told them to. DCSS states the rule (3-0): an
unknown consumable earns its slot only if the bad outcome is **interestingly
dual-sided** — *"if the worst case is pure loss, never drinking is correct
play."* Returnal adds the second half (3-0): the penalty should be a **named
task cleared by playing**, not a subtraction.

Combine them. Every cruel item gets a second edge *and* a named cure:

| item | dual edge | cure |
|---|---|---|
| the dark clings to you | glim 0 — the Sentry loses you, gemveins show | stand in brazier light |
| your hands shake | footsteps go quiet, `[loud] × 0.2` | open three containers |
| something followed you | it is `[loud]` and not where you are — a lure | leave the floor |
| the satchel spills | the fall is `[loud] 0.9`, the best lure in the game | pick it up |

And **identification must resolve.** DCSS: *"It is a feature, not a bug, that
most consumables are identified by around midgame"* (3-0), with late pressure
put into monster design instead of ID gating. In a twenty-minute run this is
decisive: a kind identified once stays known for the run and *"all draughts
known"* becomes a deed. The shop then sells **speed of resolution**, not
permanent knowledge — a much better thing to sell.

The load-bearing sentence, from Returnal: a flat cost is a subtraction computed
once and forgotten, but a banded chance makes the player price **their own
current fragility**, so the same object gives a different correct answer at
different moments.

### 10. ROOMS AS TEMPLATES WITH SLOTS

DCSS's level docs endorse authored set-pieces inside procedural content —
*"they can provide challenges random levels would rarely come up with"* — and in
the same breath name the cost: déjà vu and *"a spoiled edge"* for veterans
(3-0). The shipped mitigation is placement-time glyph rewriting — `SUBST`,
`SHUFFLE`, `NSUBST` — resolved per instance before markers, under the rule
*"In order to provide fun and reduce spoiler effects, randomise."*

**We already have the room-template pipeline and an editor feeding it. What we
lack is substitution slots.** A treasure chamber whose gem, chest and secret
wall each land in one of three authored positions is nine rooms for the price of
one — and it attacks the "23 of 34 rooms look different" measurement from cycle
25 at its root rather than by adding props.

Two more from the same doc: **the power spiral trap** — benchmark loot against
peer content at the same depth, never make new content both harder and richer
(3-0); and the cheap trick that **sheer volume gives the spectacle of a large
reward without the power**, so a hoard behind a cracked wall should look enormous
and be worth three gems.

### 11. THE LEDGER — knowledge as progression

Outer Wilds excludes, by name, every reward except knowledge — XP, abilities,
items, upgrades, cosmetics, unlocked areas, relationships, scores, collectibles
(3-0) — and accepted that this alienates some players. We are not going that
far. But two of its rules transplant exactly.

**The log records only what the player is 100% certain to have learned, with no
inferences made for them** (3-0):

> "Keeping track of what they've learned should not be the challenging part of
> the game."

So: a **Ledger** that fills in as the delver *observes*, never deduces for them.
A draft was felt here. A moth came to the lantern in that room. This kind of
draught blinded me once.

Our tells — a draft means a secret wall, a moth means your lantern is showing —
currently pay almost nothing. Under the Ledger they pay in the only currency a
twenty-minute run can offer: **knowing lets you skip a step.** A recorded draft
marks the wall without a bomb. A known draught is named in the satchel without
the shop. A learned Warden bark tells you the rung without seeing it.

One honest caution: the seductive "three-part anatomy of a clue" — every text
carrying story, a *Previously* and a *Next* — was **refuted 0-3.** It is not
Outer Wilds' rule and I am not building on it.

### 12. THE WORLD — the Deepworks

*The thing the previous round did not cover at all.*

**The fiction is read off the mechanics, never painted on them:**

| what we ship | what it says |
|---|---|
| the toll rises 3, 5, 7 | a **debt** is being collected, and it compounds |
| the Warden carries a lantern | it was the one **left holding the lamp** |
| the floor's patience runs out | the place is not hostile, it is **finishing a shift** |
| gems are set in the walls | not treasure — **the currency the place was paid in** |
| the Keeper bars the last stair | somebody **decided** nothing else leaves |
| run records persist | you are **the latest of many** |

The Deepworks was a company town cut into a seam. The workers were paid in what
they dug. When the seam ran out the company took the wages back, floor by floor,
at a rising rate, and the ones who could not pay stayed. The Warden was the
shift foreman. The Keeper was the man on the last stair told to let nobody up
until the books balanced. Nobody has told either of them the company is gone.

**You are not a hero. You are a creditor.** — and that is load-bearing, because
Jenkins notes embedded narrative mostly takes the form of **detective or
conspiracy stories** *"since these genres help to motivate the player's active
examination of clues"* (3-0). A creditor auditing books that do not add up is a
detective motive, arrived at from the toll rather than chosen for flavour.

**The distribution rule is the law of three** (3-0, and the alternative —
shatter one linear backstory and scatter it — was **refuted 0-3**). Every
load-bearing fact gets three carriers of three different kinds:

| fact | text | object | rule |
|---|---|---|---|
| gems were wages, not treasure | *"Whatever you find in the dark is still ours"* | sockets cut square, tool marks | the toll takes gems back |
| the Warden was the foreman | *"Leave the lamp with him"* | its lantern matches the wall brackets | blind to `[bright]` |
| the debt compounds | *"Owing: 3. Owing: 5. Owing: 7. Owing:"* | a tally board, last column unfinished | TOLL_BASE 3, TOLL_STEP 2 |
| you are the latest of many | *"You are not the first. Read the wall."* | the names wall | run records persist |

Deliberate gaps stay single-sourced — the planted contradiction (the bell is a
receipt / the bell ends the shift) is a gap, not a fact.

**Fragments are written in four shapes and never contain "then", "after" or
"next":** an instruction to someone else, a complaint, an inventory, a
correction. Any three imply a fourth thing the player assembles.

**Rooms tell stories in four props, never in an event.** Worch & Smith's
canonical example is a Fallout 3 slaver den built from four ordinary objects
(3-0) — *"we never saw the act… the concept behind this is the Law of Closure."*
Ours ride the dressing system we already have:

    a barred door, from the inside; a stool; a lamp burned out; scratches
    a full pay-tin, sealed, beside a skeleton with nothing in its hands
    a bell rope cut, and the cut end coiled tidily
    a ledger, a chair, and the chair on the far side of the desk

Carson's staged-damage vocabulary (3-0) points **both ways** — staged areas lead
to conclusions about a past event *"or to suggest a potential danger just
ahead."* That second clause is a feature: a door frame scored with the marks the
Keeper's bar leaves, placed two rooms before the Keeper.

**And the cheapest idea in the document, because the data already exists.** We
persist run records. Every start room gets a wall with the last three delvers cut
into it:

    KESTREL   floor 2   took 11   the warden
    ADDER     floor 1   took  4   the dark
    you

Dark Souls' bloodstain, from a save file we already write, and on the twentieth
run the wall is full of you.

**One idea taken deliberately half.** Cook's *Generative Forensics* — simulate a
history forward until it collapses, then render the ruin from the final state
(3-0) — is exactly what the Deepworks wants, and we have a seeded generator. But
Cook recommends players **only play once**, because resampling teaches the
generator's variation limits: a small lake stops reading as drought and starts
reading as one draw from a range. A twenty-minute repeated run erodes precisely
the effect. So: simulate **one** variable — how the seam ended: *worked out /
flooded / sealed with people inside* — let it choose a dressing set and three
fragments per floor, and stop. One variable with three values cannot be
reverse-engineered into noise in twenty minutes.

Cook also names his own failure, which becomes our rule: when rendering has no
basis in the simulation, *"players end up drawing conclusions that the
simulation cannot back up"* — a trident read as a fishing past. **Never place a
prop implying a fact the game does not hold. Dressing is evidence or it is
decoration, and it may not be both.**

---

## Part 4 — the demo, on thin evidence

The Steam research was the weakest of the fifteen: the session limit killed 69
of 106 agents, and almost every measured figure — Zukowski's benchmarks, Valve's
own Next Fest wishlist statistics, the median-playtime curves — **errored out
before verification**. Two things survived, and one of them is a useful
negative.

**Valve publishes no numeric demo-length guidance at all** (3-0). Its only
stated rule is qualitative:

> "You need to balance giving the customer enough content to get them excited,
> without giving away so much that they feel like they've experienced everything
> the game has to offer."

So *"a demo should be twenty minutes"* — a number I have seen repeated
everywhere, and which happens to describe our demo — **is a community heuristic,
not a platform recommendation.** We should stop citing it as though Valve said
it.

**Valve's default advice is to ship the demo at launch, not before** (2-1):
*"We generally recommend waiting until launch, but there are circumstances where
putting a demo out prior to release is effective."* The Next Fest pattern is
framed by Valve as the exception.

That is genuinely all that verified. **I am not going to write a demo strategy
on it.** What the other fourteen researches do license, for the first ninety
seconds, is design rather than marketing:

- the core loop must be visible immediately — one gem, one door, one toll, no
  tutorial room;
- the first floor should open in **Relax**, so the first thing the player does
  is read a room rather than react to one (Law 4, and our sanctuary already does
  this);
- the names wall in the first start room is the first thing that says this place
  had people in it, and it costs nothing;
- one fragment — *"You are not the first. Read the wall."* — is the only
  fragment that points at another fragment, and it teaches that the wall is real.

If demo strategy is going to drive a decision, **it needs its own research
round.** Flagging that rather than dressing up two claims as a plan.

---

## Part 5 — order of work

Sorted by what each composes with, divided by what it costs.

| # | system | why here | rough size |
|---|---|---|---|
| 1 | **The Din** | everything after is cheaper; it is `body.ts` widened | medium |
| 2 | **The Ladder** | six constants, reads the Din | small |
| 3 | **Semi-legibility** | mostly deletions | small |
| 4 | **The Coefficient** | replaces `FLOOR_PATIENCE_S`; one pure function | small |
| 5 | **The Cycle** | the largest omission; needs 1–4 to have anything to spend | medium |
| 6 | **The Lantern Bargain** | non-bankable wick + five bands + gemveins | medium |
| 7 | **Verbs, not keys** | near-free once the Din exists; per-gate audit | small |
| 8 | **The Satchel that resolves** | dual edges are Din writes | small |
| 9 | **The Offer** | four table changes | small |
| 10 | **Rooms as templates with slots** | rides the existing pipeline and editor | medium |
| 11 | **The Ledger** | needs the tells to already pay | medium |
| 12 | **The World** | fragments, four-prop rooms, the names wall | small, ongoing |

**Three deletions, and they are not optional** — Law 7 says a flat mechanic must
go, and these three fail the studio's own test: the oil tank, the floor patience
timer, and hoardable unidentified items. Each is *replaced* in the list above
rather than merely removed.

---

## Part 6 — the register of what did not survive

The most useful part of the document. Roughly a third of everything proposed
died under verification, including things I had already drafted.

**Things I had written into a draft and then had to remove:**

- **Four scalar channels** (noise/glim/force/scent) that emitters write and
  actors poll — my original Din. Refuted 0-3 *as a description of Noita*. The
  real shape is tags plus a sparse rule table plus receiver-declared
  susceptibility.
- **"No then, no after, no next"** as the fragment rule. Necessary but not
  sufficient; the verified rule is the law of three. The alternative I nearly
  built — shatter one linear backstory, scatter the pieces — was **refuted 0-3**,
  and survives only if the player finds every piece.
- **The Toll Bell.** Argued from Malaise (verified) and DRG's drop-pod countdown
  (**zero surviving claims**). It stands on one leg; the coefficient replaces it
  on better evidence. Flagged, not recommended.

**Famous things that did not verify:**

- **Alien Isolation's two-AI Director** — the menace gauge, the coarse
  proximity hints, "psychopathic serendipity", the creature learning to check
  lockers: all **refuted 0-3**. What survived (3-0) is that the Alien's
  behaviour tree simply has nodes **disabled at start and unlocked by
  progression**, *"creating the illusion that the Alien is learning."* No
  learning. A gate.
- **Whether an absolute-rule sanctuary is a feature or a mistake** — the
  question I most wanted answered — **got no verified answer.** Our spawn-room
  sanctuary stays as specified, and the Amnesia warning that any clean-boundary
  hiding rule is found in hour one remains unrebutted and unconfirmed.
- **Nine of eleven Prey paranoia/mimic claims**, including that mimics choose
  their objects emergently — they are hand-placed. So there is no "threatening
  room without a monster" section here.
- **Most of the loot psychology** — near-miss, variable-ratio dopamine, the
  Blizzard "excitement not comparison" design test, "drop fewer, drop better":
  all refuted or errored. Two claims survived and the document uses only those.
- **Spelunky's shopkeeper aggro rules and the ghost's escalation** (0-3, 1-2).
- **Dwarf Fortress entirely** — no surviving claims, so no "simulate causes, not
  effects" law, however much I wanted one.
- **Every FromSoftware craft question** — item-description word counts, the
  Undead Parish elevator, Hallownest's layered functions, bosses as tragedy, the
  silence rule. Nothing. The world-building section rests on Jenkins, Worch &
  Smith, Carson and Cook instead, which is a better foundation anyway.

**Two useful negatives to stop repeating:**

- Valve has never published a demo-length number.
- Outer Wilds has no "three-part anatomy of a clue" (0-3).

---

## The one line

Emergence is not bought with more interaction code. It is bought by moving the
rules out of the things and into a shared vocabulary the things advertise,
defaulting to silence, and letting the receiver say what it answers to.

Everything else in this document is that idea applied to light, to time, to
rewards, and to a dead company town that is still trying to balance its books.
