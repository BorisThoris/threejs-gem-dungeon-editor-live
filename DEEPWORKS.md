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

**A note on the passes.** Nine of the fifteen researches were truncated by a
session limit on the first attempt and were later resumed; **all nine eventually
completed with zero errors.** The resumed runs overturned several of their own
earlier refutations *and* downgraded several earlier confirmations — a 0-3 from a
limit-starved run means the verifiers never ran, not that the claim is false, and
a 3-0 from one sample is not settled either. Where three passes disagree, the
disagreement is shown rather than resolved by preference. Part 6 records
everything that moved.

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
Left 4 Dead's Director is a four-phase state machine whose durations are both
published *and* shipped as engine defaults (3-0, verified three ways: Booth's
GDC deck, the `director_*` ConVars, and the `TEMPO_BUILDUP / SUSTAIN_PEAK /
PEAK_FADE / RELAX` enum recovered from `server.dll`). Build Up → Sustain Peak
(3–5 s past the peak) → Peak Fade (waits for a natural break so the relax is not
consumed by an in-progress fight) → **Relax: 30–45 s, or until the team has
travelled far enough toward the exit.** **The asymmetry is the design: the peak
is a spike, not a plateau.** Valve's stated reason: *"Constant, unchanging
combat is fatiguing • Long periods of inactivity are boring • Unpredictable peaks
and valleys of intensity create a powerfully compelling and replayable
experience."* Dead Cells shipped the monotonic version,
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

**The architecture is verified; the numbers above are ours.** The third pass
closed most of the sound gap. Verified 3-0, with Leonard's counterfactual —
*"without this, it is unlikely the sound design could have succeeded"*:

    a coarse room graph connected by portals, separate from render geometry
    an attenuation cost on each portal edge
    flood the graph from the source with a decaying loudness budget
    AI hearing reads the arriving loudness in its own room
    a per-room volume scalar (0.0 silent → 1.0 full) as authored terrain
    a two-key material table (mover, struck) → sound schema, external data

**Two corrections that would have cost us a day.** Footsteps do *not* go through
the object-collision material table — they use a separate schema with the
material on the **texture**, and the stronger "keyed on a material pair" version
was refuted 0-3. And Thief's room graph was **hand-authored per mission**, a
labour cost the "what went right" framing omits; ours should derive from
`dungeon/layout.ts` automatically.

**Still ours:** no source survived verification for a movement-speed → loudness
mapping, or for per-material loudness numbers. The table above is our invention.
The architecture is transplanted; the values are to be tuned.

**The honest cost.** Noita's own file warns that tagging a material obligates
you to author its companion (`[meltable]` needs a `_molten` variant). Budget one
companion rule per tag. Tags make *variants* free, not *ideas*.

**What it buys on day one, with no new content:** the Warden investigating a
trap it did not spring. The Sentry turning toward a burst. Rats fleeing a bomb.
The Harrier roused by a dropped grate. Every one is a moment the player caused
without being told they could.

### 2. THE LADDER — awareness with rungs

*Law 3, with three passes of evidence and a clean split between what is verified
and what is ours.*

**Leonard's own statement of the goal is the best sentence in the research, and
it is our brief exactly:**

> the point is **"broadening out the gray zone of safety and danger that in most
> first-person games is razor thin."**

**Verified 3-0 across passes:**

    ordered 3D viewcones — a SET (9 active by default), each with its own
      angle / Z angle / range / acuity; only the FIRST cone the target enters
      counts, and each emits constant output regardless of position within it
    visibility is a continuous 0..1 scalar from three separable inputs —
      lighting, movement, exposure — with multiple raycasts for the player
    per-cone profiles as (light, movement, exposure) multipliers:
      Normal 1.0/1.0/1.0 · Peripheral 0.3/3.0/1.0 · Omni 0.8/1.4/1.2
      Night vision 6.0/1.0/1.0
    reaction delay      750 ms moderate / 500 ms strong; break the stimulus
                        inside the window and there is no alert at all
    retrigger           12 s / 22 s of instant reaction afterwards
    ignore-delay        anything within 9 ft skips the delay entirely

**The asymmetry, stated precisely (3-0).** Up is a *jump*: gated by a delay that
is a property of the **current** state, not the goal state, and once passed it
advances **without passing through intermediate states**. Down is a *slide*: a
capacitor that degrades gradually, "passing through all the intermediate states".

    alert_up    = a gated jump      alert_down = a timed slide through every rung

**And the legibility half, which we already half-ship.** Leonard: *"Such a range
of internal states would be meaningless if the player could not perceive it"* —
resolved through barks, because *"sound was the primary medium through which the
AIs communicated both their location and their internal state to the player."*
Our Warden already has directional audio; it has no state to communicate.

**A fifth independent confirmation of Law 3, and the most precise one.** The
0..1 analog value is what the *pipeline* carries; the awareness output stage is
*"entirely discrete"*, designed for *"a limited number of player-perceivable
inputs, and discrete valued results."* **The gem's few visible steps are a
deliberate quantisation of an analog interior — and that quantisation IS the
readability.** Continuous underneath, named on the surface, now confirmed by
Darkest Dungeon, DCSS, Prey, RoR2 and Thief.

**The cap is a content tool we should steal (3-0).** `AI_AlertCap` sets max
level, min level, and a floor after peaking. Capping **below 2 hard-disables
attack and flee** — Thief ships metaproperties that exist purely to let city AI
perceive the player without ever engaging.

> **One archetype, many creatures, by cap alone.** An evade-only game can cap
> most of its population below the combat gate and still have them react, bark
> and investigate. That is our rats, our moth, our Cutpurse and our Warden out of
> one implementation.

**Ours, not Thief's — flagged after three passes.** The per-rung *discharge
times* and the reading that **"Min Relax After Peak"** makes a guard permanently
more suspicious went 3-0 → 1-2 → **0-3**. The property is documented; the
*behaviour* is not. So the floor-after-peak rule stays in the plan as **our
design decision** — a floor that remembers what you did on it is right for this
game — and 6/14/22 s stay as starting values with no claim of provenance.

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

*Law 4. The single largest omission the research found, and separate from the
coefficient. After the second pass this is the best-sourced system in the plan.*

We have nothing that ever relaxes. Valve's shipped phases and defaults:

    BUILD_UP     ≥15 s floor; runs until intensity crosses the peak threshold
    SUSTAIN_PEAK 3–5 s        director_sustain_peak_min_time 3 / max 5
    PEAK_FADE    variable — population ALREADY drops to minimal here; this state
                 only gates the START of the relax clock
    RELAX        30–45 s      director_relax_min_interval 30 / max 45
                 ended early by forward progress (RelaxMaxFlowTravel 3000)

≈60–90 s per cycle → **5–7 per 400 s floor.** With the discipline the report
imposed: the claim asserting a specific L4D cycle period was **voted down 0-3**,
so treat any cycle count as a tuning start, never an evidenced optimum.

> **The coefficient sets the amplitude. The cycle sets the frequency.**

That split is now **Valve's own sentence**, not my inference — slide 92:
*"Algorithm adjusts pacing, not difficulty — Amplitude (difficulty) is not
changed, frequency (pacing) is."* (The stronger framing, that this is an explicit
rejection of rubber-banding, failed the vote; the deck never names it.)

**Relax is not emptiness.** Minimal Threat = no wanderers until the player is
calm, no mobs, **no *new* threats — those already in flight still act.** That is
what stops the valley reading as a scripted intermission.

**Boss floors sit outside the loop.** Valve exempts boss encounters from
adaptive pacing entirely: *the Director paces the connective tissue, the designer
paces the crescendos.* Our Keeper belongs outside the Cycle.

**The intensity accumulator, and permission to make it crude.** Per-actor 0..1
from damage taken, incapacitation, forced displacement, and proximity-weighted
threat deaths; decays toward zero **except while something is actively engaging**.
Booth's own caveat is liberating: *"Survivor Intensity estimation is crude, yet
the resulting pacing works."* It need not be good — it needs to be monotone in
the right direction. Two mappings we must make: a solo game collapses L4D's
max-of-four into one noisier accumulator, so widen the decay time and threat
radius; and **our progress axis must be defined** (rooms cleared, or distance to
the stair) or relax becomes a fixed intermission players learn to wait out.

**Crescendos are the same machine with five numbers swapped** — Valve's finale
scripts run relax 2–5 s against sustain 25–30 s, inverted from base pacing.
A crescendo preset, never the normal curve.

**And decompression must be scheduled, not earned.** Confirmed independently by
Creative Assembly's menace gauge (3-0): a meter that pulls the pursuer offstage
on a threshold, with a cooldown, a time-to-peak, and a cap on menace events per
appearance — **the Warden should retreat on a meter even when the player has done
nothing right.** Its inputs measure *pressure on the player*, not player noise,
which is why the Din and the Cycle are two systems and not one.

### 5. THE LANTERN BARGAIN

*Law 6 — and the second pass corrected my proposal on its central point.*

**(a) Oil burns per ROOM, not per second.** I originally proposed a 60-second
wick on a wall clock. Darkest Dungeon's light does not decay with time at all
(3-0): **1 point per already-explored segment, 6 per newly explored one.**
Pushing into the unknown costs light; backtracking is nearly free. The transplant
note is aimed straight at us:

> *"a time-based drain punishes deliberation, careful looking and hiding — which
> are exactly the behaviours an evade-only lantern game wants to reward."*

Our whole game is deliberation and hiding. A wall clock taxes the core verb.
(Accurate phrasing to carry: decays with **movement** rather than elapsed time,
plus discrete event-driven swings.)

**(b) The toggle is asymmetric.** DD lowers light at almost any moment, in steps
or straight to zero, but raises it **only on your own turn** and only by spending
a purchased Torch — which competes for inventory slots with treasure. *Carrying
light means carrying less treasure home.* Ours toggles symmetrically and should
not. The rule:

> **Darkness is an affordance the player spends, not a state the game imposes —
> cheap and instant to enter, expensive and slow to leave, its cost shown as a
> live number, its payoff in a currency the lit state cannot buy at all.**

**(c) Both ends pay, in non-substitutable currencies.** My first table had
darkness paying and light paying nothing. DD pays at both ends: high light buys
**information and initiative** (scouting, surprise, dodge); low light buys
**resources and crit**. Five named bands, not four — *Shadowy* is real and the
common four-name shorthand is the imprecise version.

| band | glim | seen at | what it buys |
|---|---|---|---|
| Raised | 76–100 | 15 m | you scout the next room from the doorway; you surprise what is in it |
| Guttered | 51–75 | 9 m | — |
| Shrouded | 26–50 | 5 m | one chest in four holds a second thing |
| Dark | 1–25 | 3 m | **gemveins show in the walls** |
| Blind | 0 | 1 m | **cracked walls show without a bomb** |

**Gemveins remain the key idea** — the same room means two things depending on
how you enter it, and it cannot be banked because you can only take it while in
the danger.

And the deletion recipe, from DCSS (3-0): when the Ghoul lost chunk-eating they
did not invent a replacement resource — the heal became automatic on kill and the
rot timer was deleted outright. **Collapse a deleted resource's beneficiaries
into triggers on actions the player already takes.**

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

### 8. THE OFFER — and the conflict two researches independently found

*This was the weakest section in the first draft and I had it marked "four table
rows". Two unrelated researches attacked it from opposite directions.*

**The design test, in one sentence (3-0):**

> **State the reward as a sentence about what the player may now DO. If the only
> honest sentence is a number, it is a trifecta affix.**

Blizzard's exemplar legendary reads *"You may have 2 additional Sentries"*, and
their diagnosis of the failure was *"Legendaries were piles of stats, not
legendary… Treated all affixes equally."* Their fix: *"DROP FEWER / DROP BETTER /
MAKE LEGENDARIES… LEGENDARY."* Corrected reading of "Less is More": **thin the
burden tier, thicken the moment tier** — Loot 2.0 cut white/blue/rare volume
while *increasing* legendary rates.

**And a warning that lands on us:** the trifecta *re-formed* after Loot 2.0, with
mainstat and set bonuses becoming the new treadmill. **Rules-change relics
coexisting with stat relics will lose to the stat relics unless the stat axis is
deliberately compressed.**

**The conflict.** Blizzard closed both auction houses because *"it ultimately
undermines Diablo's core game play: kill monsters to get cool loot"*, and the
postmortem names the behaviour: *"Shop, not play."* Independently, the
knowledge research names **exclusivity** as the most forcefully stated condition
of knowledge-progression — *whatever pays best is what players optimise for* —
and flags a purchasable-relic system as the thing that most directly violates it.

Two unrelated lines, one conclusion. The resolutions the evidence supports:

- **A purchase carries no drop moment**, so the entire payload must be in the
  rules change, and the earning (the gem cost) must come from play the player
  feels. This does not make shops wrong; it makes a flat shop fatal.
- **Relics must not substitute for knowing.** A relic that reveals secret walls
  outright deletes the draft tell. A relic that opens a wall you already found by
  listening is an *enabler*. Enablers, never substitutes.

### The resolution: the meta layer buys OPTIONS AND ODDS, never power

*Corrected. My first version of this rested on the Mirror of Night's paired
mutually-exclusive talents — which came back **1-2** on the second pass having
been 3-0 on the first, along with every other specific Mirror claim. Contested,
so I am not building the resolution on it. The structural principle underneath is
verified 3-0, and it is sharper anyway.*

**Hades' split (3-0):** in-run power is *totally disposable* — boons end with the
run, on death and on victory alike — and the permanent layer buys **options and
odds, never the run's actual power.** The report states the consequence for us
without hedging:

> *"six PERMANENT relics bought at a shop inverts Hades' split — your meta layer
> holds the power rather than the odds. The specific risk is that once all six
> are bought the run's texture stops changing, which is exactly the
> trivialisation Hades avoids by keeping boons disposable."*

So the fix is not primarily *how* relics are acquired — it is **what they buy**:

- **Relics should bias the offer table, not raise flat numbers.** A relic that
  makes better things appear, or makes a kind of room more likely, or improves
  what a chest can hold, leaves every run's texture live. A relic that adds a
  number is spent the moment it is bought.
- **Something must stay disposable.** If the six relics are the only power in the
  game, there is nothing left to lose on death and nothing to rebuild. The gems
  should buy *run-scoped* things — bombs, oil, a key, passage — and the relics
  should change the odds those purchases face.

**Both earlier objections still resolve.** A relic that biases odds has no flat
purchase moment to fall flat (Diablo), and it enables rather than substitutes for
knowing (Outer Wilds) — it changes what the dungeon offers, not what you need to
understand.

**And make two relics a pair (3-0).** Duo boons require prerequisites from both
gods and **cannot be numerically inflated** — their value is categorical. The
transplant, in the report's words: *"make a small number of relic PAIRS unlock a
third, unbuyable effect — the payoff arrives only if the player's earlier picks
happened to line up, which retroactively makes floor-1 choices feel consequential
on floor 3."*

### Three offers is a hardcoded constant, and that is now evidenced

I flagged this as unevidenced last pass. The resumed run settles it from
**decompiled game data** (3-0): `GetTotalLootChoices()` returns **3**;
`CalcNumLootChoices()` is `3 − Pact ranks`, floored at 1; and the condition that
removes one costs **2 then 3 Heat** against **1 Heat per rank** for +20% enemy
damage, +20% enemy count or +15% enemy health.

**Removing a choice is, by the designers' own pricing, a bigger difficulty
increase than making enemies hit harder.** The transplant: present three, and
treat any reduction below three as **an explicit difficulty purchase, never a
silent economy tuning.**

Scope discipline: this evidences three as *Hades'* constant, not as proven
optimal for a twenty-minute run. The Vampire Survivors comparison still does not
exist.

**And the steering rule, which is the whole point:** *pick who bids, not what you
get.* Keepsakes guarantee only the **first** boon offered while equipped — not
that the next reward is a boon at all — and two gods ignore the bias entirely.
Free choice collapses to the same build every run; a biased-but-not-determined
offer forces adaptation while preserving the feeling of intent.

### The three-floor reward mix, as a tuned ratio (3-0, from RunManager.lua)

Every room reward is explicitly typed **"this run"** or **"next run"**, and the
mix is a self-correcting ratio pulled toward a per-biome target that **declines
with depth**: 0.45 → 0.40 → 0.33, with **zero meta rewards in the final biome.**

That is directly transplantable to three floors: floor one may pay toward the
next run; **floor three pays only into this one.**

(The companion claim that the correction factor makes the early sequence
deterministically alternating failed at 1-2 — the ratio is real and
self-correcting, the alternating model is not established.)

### And the escalation must be elected, not only imposed

Hades' Pact is a **menu of 15 named, priced conditions the player enables before
a run**, gated behind having won once (3-0). Our Coefficient is currently
*entirely* imposed: depth, dwell and greed push it and the player never elects
anything.

The fix is not to remove it but to let the player **add** to it deliberately, at
a named price, for a named payout — with the target rising as they clear it,
which is what makes elected difficulty an achievement rather than a setting.

**Still worth doing, with a caveat:** slots and upgrade-exchange, and rarity
rolled by risk (behind a cracked wall, in a vault, below 25 glim) so the darkness
bargain feeds the relic system. Hades prices removing one choice at 2 then 3
Heat — more per rank than damage, count or health (3-0). **But "three offers, not
a shelf" is not evidenced for a run of our shape**: the Vampire Survivors half of
that question — the part about the *shape* of a choice — was never sourced at
all, and the Hades resume was cut short by the spend limit before its synthesis
ran.

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

**And never price knowledge-checking with a consumable or a penalty** (3-0).
Lucas Pope rejected limiting or punishing guesses in Obra Dinn for exactly the
reason our potions rot in the satchel: *"I'd expect people to just not make
guesses until the very end."* His shipped answer was **batched, locking
validation** — confirm any three at once, so guessing costs more than deducing.
Two studios, two genres, the same hoarding failure.

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

## Part 4 — the demo, graded by evidence

The resumed Steam research (106/106) changed this section from "two claims, no
strategy" to a real answer — just not about *content*. Valve documents the
machinery precisely and documents nothing about what a demo should contain.

**(A) DOCUMENTED — follow exactly.**

- **A title may participate in only ONE Next Fest, ever.** Withdrawing before
  participating preserves the slot, so the rule constrains *participation*, not
  demo publication.
- Build review **4 weeks out** if you want the demo live for the T-10-day press
  preview; **2 weeks out** at the latest or risk missing the fest.
- The wishlist notification is **a single manual press inside a 14-day window**,
  with a 2-week cooldown — spend it at fest open, clear of other events.
- A standalone demo store page (**July 2024**, not 2023) buys discovery surface,
  but **also switches on public demo reviews**, and a low score "may get filtered
  out of some views". That is the *only* Valve-documented way a bad demo reduces
  visibility, and it is opt-in.

**(B) MEASURED — plan around it.** The fest amplifies momentum rather than
creating it: pre-fest wishlists r=0.825 and pre-fest velocity r=0.819, against
**r=0.457 for demo conversion rate**. Entering under 1,000 wishlists, the median
outcome is **322 fest wishlists** (n=71). Target ≥20% demo conversion (median
16.33%), and **screenshot Valve's post-fest Venn report immediately — it
expires.**

**The strategic consequence, stated plainly: do not spend the one-shot Next Fest
slot on a low pre-fest wishlist base.** Ship the demo, build wishlists, spend the
slot later.

**(C) UNSUPPORTED — our judgement, marked as such.** Three floors, twenty
minutes, the shape of the first ninety seconds, meta-progression carry-over.
**There is no primary measured data on any of it** — not on demo length, drop-off
curves, tutorial cost, slice vs full run, or capsule click-through. Every
circulating number traced to an uncited SEO blog, including *"Valve recommends
30–45 minutes"*, which Valve's own text contradicts: **"no requirements
regarding… length of demo."**

So our twenty-minute demo is not wrong — it is **unevidenced**, and this document
will not imply otherwise in either direction. The one defensible heuristic is
Zukowski's explicitly-labelled *theory* that low conversion means the game
"looked better than it played", which argues for reaching the real core loop fast
rather than through a tutorial. That is reasoning, not evidence.

**And the actionable one: instrument our own demo** — event pings at run start,
floor transition and quit. No external dataset can substitute.

## Part 5 — order of work

Sorted by what each composes with, divided by what it costs.

| # | system | why here | rough size | state |
|---|---|---|---|---|
| 1 | **The Din** | everything after is cheaper; it is `body.ts` widened | medium | **built** |
| 2 | **The Ladder** | six constants, reads the Din | small | **built** |
| 3 | **Semi-legibility** | mostly deletions | small | **built** |
| 4 | **The Coefficient** | replaces `FLOOR_PATIENCE_S`; one pure function | small | **built** |
| 5 | **The Cycle** | the largest omission; needs 1–4 to have anything to spend | medium | **built** |
| 6 | **The Lantern Bargain** | non-bankable wick + five bands + gemveins | medium | **built** |
| 7 | **Verbs, not keys** | near-free once the Din exists; per-gate audit | small | **built** |
| 8 | **The Satchel that resolves** | dual edges are Din writes | small | **built** |
| 9 | **The Offer** | four table changes | small | **built** |
| 10 | **Rooms as templates with slots** | rides the existing pipeline and editor | medium | **built** |
| 11 | **The Ledger** | needs the tells to already pay | medium | **built** |
| 12 | **The World** | fragments, four-prop rooms, the names wall | small, ongoing | table written |

**"Table written"** means the data and the pure functions exist in `src/`,
with layout checks holding them to the rules above, and nothing in the game
reads them yet. That is deliberate: every one of these is a set of
statements that can be got wrong in a text editor, and getting them wrong
in a text editor is far cheaper than getting them wrong in a frame loop.
One of the checks written this way immediately caught a fragment
containing the word "then", which the corpus forbids.

**Two of the three mandatory deletions are done, and the third is under way.**
`FLOOR_PATIENCE_S` and `REAPER_WARNING_S` are gone, and both were *replaced*
rather than merely removed. The oil tank went with system 6: `LANTERN_FULL_S`
is gone and oil is spent at doorways rather than on a wall clock, because a
time-based drain taxes deliberation, careful looking and hiding, which are the
three things this game is made of. Hoardable unidentified items go with system
8, which is the last of the three.

**Three deletions, and they are not optional** — Law 7 says a flat mechanic must
go, and these three fail the studio's own test: the oil tank, the floor patience
timer, and hoardable unidentified items. Each is *replaced* in the list above
rather than merely removed.

---

## Part 6 — the register: what moved, in both directions

Nine researches were truncated by a session limit and later resumed. **The
resumed runs overturned several of their own refutations.** A 0-3 from a
limit-starved run means the verifiers never ran — it is not evidence of falsity,
and reading it as such was the biggest methodological error available here.

### Reversed on the second pass — I had these WRONG in the first draft

- **Alien Isolation's two-AI Director.** Recorded as refuted 0-3. Verifies
  **3-0** with the full agent set, sourced to Creative Assembly's own AI
  programmer via nucl.ai plus datamined behaviour-tree data. *"the alien is never
  allowed to cheat: while the director always knows where you are, the alien has
  to figure it out for itself."*
- **The menace gauge** as a real parameterised dosage meter — **3-0**, with three
  tunables and ≥12 authored presets swapped per area.
- **Spelunky's shopkeeper built from the ordinary monster schema** (0-3 → 2-1),
  **aggression on eight world-state predicates** (1-2 → confirmed), and **the
  ghost's escalation schedule** (0-3 → confirmed).

### Downgraded on the second pass — I had these too CONFIDENT

- **Thief's per-rung discharge times and "Min Relax After Peak"**: 3-0, then
  1-2, then **0-3** across three passes. The *property* is documented in the
  engine; the *behaviour* — that an alerted guard settles permanently more
  suspicious — is not. I called it "the sleeper"; it stays in the plan as our
  design decision with no claim of provenance. Everything else in the Ladder
  strengthened: the reaction delays, the ordered cones, the capacitor decay and
  the jump/slide asymmetry are all 3-0 across passes.
- **Hades' Mirror of Night as paired mutually-exclusive talents**: 3-0, then
  **1-2**, with every other specific Mirror claim refuted 0-3. My first
  resolution of the relic conflict rested on it; the replacement rests on the
  structural split instead, which is 3-0 — **the meta layer buys options and
  odds, never the run's power.**
- **"Three offers, not a shelf"**: the Hades half is verified, but the Vampire
  Survivors half — the part about the *shape* of a choice — was never sourced,
  and the Hades resume was cut short before its synthesis ran.

### Corrections to my own draft, from evidence

- **Four scalar channels** (my original Din) — refuted 0-3 as a description of
  Noita. The real shape is tags, a sparse rule table, and receiver-declared
  susceptibility.
- **"No then, no after, no next"** as the fragment rule — necessary but not
  sufficient. The verified rule is the law of three; the alternative I nearly
  built (shatter one backstory, scatter it) was **refuted 0-3**.
- **The Toll Bell** — argued partly from Deep Rock Galactic, which produced
  **zero surviving claims**. Replaced by the Coefficient on better evidence.
- **A 60-second lantern wick on a wall clock** — contradicted by Darkest
  Dungeon's movement-based decay, with a transplant note aimed directly at
  evade-only games.
- **The amplitude/frequency split**, which I flagged as my inference — it is
  Valve's own sentence on slide 92.

### Still unanswered, and I will not pretend otherwise

- **Whether players resent dynamic difficulty.** All four claims from the CHI
  2020 paper were voted down — both the "must be invisible" claim and its
  counter.
- **Dwarf Fortress entirely.** No surviving claims, so no "simulate causes, not
  effects" law however much I wanted one.
- **Every FromSoftware craft question** — item-description word counts, the
  Undead Parish elevator, bosses as tragedy, the silence rule. The world section
  rests on Jenkins, Worch & Smith, Carson and Cook instead, which is a better
  foundation anyway.
- **Vampire Survivors, Path of Exile, drop-pacing numbers, pity timers**, and
  Spelunky's level-generation algorithm.
- **Dishonored** — chaos thresholds, vision timing, the rat plague: nothing in
  either pass. There is no Dishonored material in this plan and there should not
  be.

### Myths to stop repeating

- **"Valve recommends a 30–45 minute demo."** Traced to seven SEO blogs, none
  citing a Valve source, and contradicted by Valve's own text: *"no requirements
  regarding… length of demo."*
- **The whole loot-psychology vocabulary.** Near-miss *persistence* is
  inconsistently demonstrated and real casino data found nothing; the "~30%
  density" figure is one statistically unsound study; the leading loot-box
  **regulation** paper contains zero reinforcement-schedule content. And
  Blizzard — the folklore's favourite example — files *"randomness is king"* and
  *"near misses are fun"* under **"Where did we go wrong?"** Keep the asymmetry
  honest: near-miss effects on *motivation* do replicate; it is *persistence*
  that fails.
- **Valve's "4% saw a decrease"** distribution and the **"500% increase in
  converting wishlists"** figure — both refuted, both circulating as Valve data.
- **Outer Wilds' "three-part anatomy of a clue"** — 0-3.

### The conflict — and its resolution, from a third source

Two unrelated researches attacked the **six shop-bought relics** from opposite
directions: Diablo says a purchase carries no drop moment and closed its own shop
channel for that reason; Outer Wilds says whatever pays best is what players
optimise for, and a purchasable meta-system competes with knowing.

**Hades resolves both** — but not by the route I first wrote here, and this entry
has been corrected. The resolution rested on the Mirror of Night's paired
mutually-exclusive talents, which came back **1-2** on the resumed pass having
been 3-0 on the first. The structural claim underneath is 3-0 and sharper: in-run
power is *totally disposable*, and the permanent layer buys **options and odds,
never the run's power.**

So the fix is not primarily *how* relics are acquired but **what they buy** —
relics bias the offer table rather than adding numbers, and something must stay
disposable. Both objections still resolve: a relic that biases odds has no flat
purchase moment to fall flat, and it enables rather than substitutes for knowing.
See §8 for the full resolution; this entry is kept, corrected, rather than
deleted, because the register's job is to record what moved.

### The methodological finding

The most useful thing this programme produced is not about game design. Nine
researches were truncated, and reading their limit-starved refutations as
evidence produced **four wrong entries in the first draft of this document** —
including a claim I stated as settled fact about Alien Isolation. The
resumed passes reversed them. **Where verification is cheap and the cost of a
wrong "no" is high, an unverified refutation must be recorded as unknown, not as
false.**

## The one line

Emergence is not bought with more interaction code. It is bought by moving the
rules out of the things and into a shared vocabulary the things advertise,
defaulting to silence, and letting the receiver say what it answers to.

Everything else in this document is that idea applied to light, to time, to
rewards, and to a dead company town that is still trying to balance its books.
