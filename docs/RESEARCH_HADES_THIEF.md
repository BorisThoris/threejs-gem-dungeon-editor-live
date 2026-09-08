# SUPERSEDED — both researches later completed in full

This hand-merge was written while Hades and Thief were still blocked. Both
subsequently completed (103/103 and 105/105, zero errors) with their own
syntheses, and **two of the claims relied on below were downgraded by those
runs** — the Mirror of Night's paired talents (1-2) and Thief's Min Relax
After Peak (0-3). Kept for the record; the plan follows the completed runs.

---

# Hades and Thief — synthesis done by hand

Both reports produced strong verified claims in every pass; what failed twice was
the *synthesis* agent that merges claims into findings. That merge is a
judgement job over evidence I already hold, so it is done here rather than left
as a gap. Every claim below carries the vote it actually received, and where the
two passes disagree, the disagreement is shown rather than resolved by picking a
favourite.

---

# HADES / DEAD CELLS — merged

## F1. Escalation is a MENU, not a curve, and it is gated behind mastery (3-0)

The Pact of Punishment is **15 named Conditions** (16 in Hell Mode), most with
multiple ranks, each priced in Heat, **selected by the player before a run**;
63 Heat total. It appears **only after the player has already won once**.

**The transplantable rule:** an escalation system feels *chosen* rather than
*imposed* when it is (a) a menu of named, priced conditions, (b) unlocked by
demonstrated mastery, and (c) attached to a reward ladder rather than a
difficulty setting.

Our Coefficient is currently entirely imposed — depth, dwell and greed push it
without the player ever electing anything. **The fix is not to remove the
coefficient but to let the player add to it deliberately**, at a named price,
for a named payout.

## F2. Choice count is the most expensive dial in the game (3-0)

"Approval Process" removes one option per rank from every offer — 3 → 1 across
two ranks — and costs **2 then 3 Heat**, against **1 Heat per rank** for enemy
damage, enemy count and enemy health.

**Blizzard's independent corroboration** is the same shape from the other end:
their fix for flat rewards was *fewer, better* offers, not more numbers.

**But the caveat stands and I will not lose it:** this prices *removing* choice.
It does not establish that **three** is the right number for a twenty-minute run.
The Vampire Survivors half of that question was never sourced in any pass.

## F3. The self-paced reward ladder (3-0)

Each boss killed at or above a per-weapon **Target Heat** drops hard currency;
beating the final boss at that target **raises the target by one**. Tracked
independently per weapon, only the lowest uncompleted Heat claimable, ending at
20 Heat / 21 runs. Intermediate thresholds (5/10/15) unlock optional high-risk
gates; 8/16/32 give cosmetics only.

**The rule:** difficulty you elect must pay in a currency you cannot get
otherwise, and the ladder must move itself up as you clear it — otherwise
"harder" is a setting rather than an achievement.

## F4. In-run power is run-scoped; permanent progression is a separate system (3-0)

Boons are wiped on death. The Mirror of Night is **paired mutually-exclusive
talents** — red and green per slot, invested separately, only one active, freely
switchable. **Meta-progression is a loadout choice, not accumulation.**

This is the cleanest answer available to our relic problem that does not require
deleting relics: **make the six relics a loadout the player configures before a
run, not a ladder they climb.** Six relics as three either/or pairs is a build
decision every run; six relics as purchases is a treadmill that ends.

## F5. Steering without choosing (3-0)

Keepsakes guarantee the **first** boon offer comes from a chosen god — but not
that the next reward is a boon at all, and two gods ignore the bias entirely.
A soft, single-use lever.

## F6. Slot scarcity resolved as an upgrade, never a refusal (3-0)

Attack/Special/Cast/Dash/Call hold exactly one boon each; a competing god offers
an **exchange that raises the slot's rarity one tier while keeping its level**.
A forced overwrite is presented as a net gain.

## F7. Rarity is biased by room risk (3-0)

Four tiers scaling the same numbers; **optional gates, mini-boss chambers and
higher-priced late purchases roll higher rarities.** Risk buys quality, not just
quantity — which is exactly the hook our darkness bargain and secret walls need.

## F8. Duo and Legendary boons are conditional payoffs, excluded from levelling (3-0)

They require specific prerequisite boons from one or both gods, and **cannot be
inflated by Pom of Power.** Depth that cannot be bought with more of the same
currency.

## F9. Dead Cells' Malaise — the failure, and the fix Motion Twin shipped (3-0)

The reworked fill rate is **coupled to enemies remaining**, so pressure relaxes
as the player clears. And the stated target is an **oscillating band (3–7)** held
across most of a run — *"a cycling nature to the mechanic"*, explicitly **not a
monotonic ramp**.

Motion Twin, Valve and Creative Assembly all landed on oscillation
independently. **Three studios, three mechanisms, one shape** — and our
`FLOOR_PATIENCE_S = 300` is the shape all three rejected.

## F10. Narrative scale, and what it actually costs (3-0)

**22,000+ lines**, fully voiced, from a studio under 20 people. The transplantable
part is not the volume — we cannot afford it — but the *gating*: lines keyed to
run count and events so failure advances something.

**Our version at 1/500th the budget:** the names wall already proposed, plus one
line of fragment per floor keyed to run count. Ten lines, not ten thousand.

---

# THIEF / DISHONORED — merged, with the contested split shown

## What is solid, verified 3-0 in BOTH passes

    ordered 3D viewcones — an ordered SET, each with its own XY angle, Z angle,
      range and acuity; the target is evaluated against the first cone it enters
    visibility is a continuous 0..1 scalar from three separable inputs —
      lighting, movement, exposure — resolved with multiple raycasts
    awareness decays through a CAPACITOR: alerting may jump rungs, de-alerting
      cannot, and passes through every intermediate state
    per-cone sensitivity profiles, e.g.
      Peripheral   light 0.3 / movement 3.0 / exposure 1.0
      Omni         0.8 / 1.4 / 1.2
      Night vision 6.0 / 1.0 / 1.0
    detection is delayed and hysteretic:
      reaction delay   750 ms moderate / 500 ms strong
      break the stimulus inside the window → no alert at all
      retrigger        12 s / 22 s of instant reaction afterwards
      ignore-delay     anything within 9 ft skips the delay entirely

**The design principle, in Looking Glass's own words (3-0):** *"we tried to
design AIs with a broader range of awareness than the typical two states that AIs
exhibit: 'oblivious' and 'omniscient.'"*

**The single most valuable constant for us is the reaction delay.** It is what
makes being spotted survivable: you can be seen and *un-see* yourself. We have no
equivalent, and every threat we ship is effectively omniscient the instant its
condition is met.

## What is CONTESTED — and I am not going to pick a side

    a single 0-100 acuity score            2-1 first pass, 1-2 second
    per-rung discharge times +
      "Min Relax After Peak"               3-0 first pass, 1-2 second

Both were verified against the same DromEd property reference; different verifier
samples read it differently. **The honest position is that the mechanism is
plausible and the exact numbers are not established.**

So: the four-rung ladder stays, the capacitor stays, the reaction delays stay —
and **"once it has Hunted, it never returns below Uneasy"** stays as *our design
decision*, because it is a good rule for a floor that should remember what you
did on it, not because Looking Glass shipped it.

## What was refuted in both passes

**Floor-sampled lighting** (0-3 twice) — the appealing idea that Thief reads the
light on the *ground beneath* the player so you can predict your own safety by
looking down. It is not how the light gem works, and I would have built it.

## The gap that never closed

**Sound propagation** — the room-portal model, surface materials, movement-speed
mapping — reached "unverified" in both passes and never got votes. The Din's
propagation numbers (doorway ×0.35, half-life 2.5 s, the loudness table) are
therefore **entirely our invention**, informed by the *existence* of Thief's room
database rather than by its values. The document must say so.

**Dishonored produced nothing in either pass** — chaos thresholds, vision timing,
the rat plague, Blink. There is no Dishonored material in the plan and there
should not be.
