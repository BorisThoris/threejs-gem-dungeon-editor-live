# The Deepworks — a fiction made of the mechanics we already ship

## The premise, derived not invented

Every line below is read off a system that is already in the build. Nothing
here asks for a new mechanic; it asks the mechanics to mean something.

| the mechanic we ship | what it says about the place |
|---|---|
| the toll rises 3, 5, 7 per floor | a **debt** is being collected, and it compounds |
| the Warden carries a lantern | it is **looking for something**; it was left holding the lamp |
| floor patience runs out | the place is not hostile, it is **finishing a shift** |
| gems are set in the walls | not treasure — the **currency the place was paid in** |
| the Keeper bars the last stair | somebody **decided** nothing else leaves |
| the Cutpurse steals and nests | somebody down here is still **saving up** |
| run records persist | you are **the latest of many** |
| the Reaper does not care about the sanctuary | it does not work here; it **collects** |

So: the Deepworks was a company town, cut into a seam. The workers were paid in
what they dug. When the seam ran out the company took the wages back — floor by
floor, at a rising rate — and the ones who could not pay stayed. The Warden was
the shift foreman. The Keeper was the man on the last stair who was told to let
nobody up until the books balanced. Nobody has told either of them the company
is gone.

You are not a hero. You are a creditor.

---

## The rule for a fragment — CORRECTED after the world-building research

My first version of this rule was half right, and the half I was most confident
about was wrong. Recording both, because the difference matters.

**What I had:** every fragment must be a statement about the place or a person,
never about a sequence — no "then", "after", or "next".

That is a *necessary* condition and I mistook it for a sufficient one. Forty
perfectly order-independent fragments still fail if each fact is carried once
and a twenty-minute run misses it.

**What the research actually verifies** (Jenkins, *Game Design as Narrative
Architecture*, MIT Press 2004, 3-0 verbatim):

  "essential narrative information must be redundantly presented across a range
   of spaces and artifacts, since one can not assume the player will necessarily
   locate or recognize the significance of any given element"

  "...the law of three suggests that any essential plot point needs to be
   communicated in at least three ways"

And the seductive alternative — author one linear backstory, shatter it, scatter
the pieces — was **voted down 0-3**. Those two rules produce different
fragments: redundancy survives reshuffling, scrambled linearity only survives if
the player finds every piece.

**So the rule is two rules.** Order-independence (below) governs how a fragment
is *written*. The law of three governs how facts are *distributed*: every
load-bearing fact gets three carriers of three different kinds — a text, an
object, and a rule of the game. Deliberate gaps stay single-sourced. Drawing
that boundary is the design decision, and Jenkins does not draw it for us.

### The four load-bearing facts, tripled

| fact | text | object | rule |
|---|---|---|---|
| the gems were extracted as wages, not found | #10 "Whatever you find in the dark is still ours" | sockets cut square in the wall, tool marks around them | the toll takes gems *back* |
| the Warden was the foreman, left holding the lamp | #2 "Leave the lamp with him" | its lantern is the same model as the wall brackets | it is blind to `[bright]` — it carries its own |
| a debt is being collected, and it compounds | #24 "Owing: 3. Owing: 5. Owing: 7. Owing:" | a tally board, last column unfinished | TOLL_BASE 3, TOLL_STEP 2 |
| you are the latest of many | #40 "You are not the first. Read the wall." | the names wall in every start room | run records persist |

The planted contradiction (#35 the bell is a receipt / #9 the bell ends the
shift) stays single-sourced deliberately. It is a gap, not a fact.

### Order-independence, unchanged

No fragment may contain "then", "after", or "next" — the generator will hand
them to the player in an order nobody chose.

Four shapes only:

1. **an instruction to someone else** — implies a rule, and a person who needed telling
2. **a complaint** — implies a norm being broken, and someone with standing to complain
3. **an inventory** — implies a system of account, and a discrepancy
4. **a correction** — implies a widespread belief, and someone who knows better

Any three, in any order, imply a fourth thing the player assembles themselves.
That is the whole trick.

---

## The corpus — 40 fragments

Placement: scratched on walls, on the backs of the bell, on chest lids, on the
Keeper's slab, inside cracked-wall alcoves, on the shop counter. One per room at
most; three per floor is plenty. They are read, never spoken.

### Instructions (10)

    1   Do not ring it twice.
    2   Leave the lamp with him. He will not take it from you.
    3   Count what you take at the face, not at the stair.
    4   If the moth finds you, put it down and walk.
    5   Any man on the last stair is to be considered on duty.
    6   Wages are paid at the wall. Nowhere else is the wall.
    7   Do not settle with the small one. He does not keep books.
    8   Bar the door behind you. He learns the doors.
    9   The shift ends when the bell says. Not when you say.
    10  Whatever you find in the dark is still ours.

### Complaints (10)

    11  The third shift will not go below.
    12  Rate went up again. Nobody signed for it.
    13  Two lamps out this week and neither of them mine.
    14  They have stopped sending anyone to take the count.
    15  He asks me the same question every time I pass.
    16  I have paid this floor twice and it is still not paid.
    17  Nobody told the foreman. Somebody should tell the foreman.
    18  The seam is finished. They know the seam is finished.
    19  My brother is on the list and my brother went up in spring.
    20  There is no shift. There has not been a shift for a long time.

### Inventories (10)

    21  Nine bells. Eight accounted for.
    22  Lamps out: 14. Lamps returned: 3.
    23  Floor one, paid. Floor two, paid. Floor three —
    24  Owing: 3. Owing: 5. Owing: 7. Owing:
    25  Names on this wall: 61. Names off it: 0.
    26  Six keys cut. Six locks. One key.
    27  Oil for the month: two measures. Two measures.
    28  Taken from the face this quarter: nothing. Nothing. Nothing.
    29  On the books: every man below. Off the books: the man on the stair.
    30  Weight of the count, in gems: more than was ever dug.

### Corrections (10)

    31  It is not a debt. It was never a debt.
    32  He is not guarding it. He is waiting to be relieved.
    33  The lamp does not keep him off. The lamp is how he finds the wall.
    34  Nobody sealed the lower floors. The lower floors are where they went.
    35  The bell is not an alarm. The bell is a receipt.
    36  We were not robbed. We were paid, and then we were unpaid.
    37  She is not stealing. She is the only one still saving.
    38  It does not hunt you. It has come for the count and you are holding it.
    39  The dark is not empty down here. The dark is where the wages are.
    40  You are not the first. Read the wall.

---

## The wall in every start room — the one that costs nothing

We already persist run records: seed, floor reached, gems banked, how it ended.
Every start room carries a wall with the **last three delvers** cut into it:

    KESTREL      floor 2      took 11      the warden
    ADDER        floor 1      took  4      the dark
    you

Three lines of existing data. It is Dark Souls' bloodstain and Spelunky's
gravestone at once, and on the twentieth run the wall is full of the player.

Fragment 40 — *"You are not the first. Read the wall."* — is placed only in the
floor-one start room, and is the only fragment that points at another fragment.
It is how the player learns the wall is real.

## What the fragments are NOT allowed to do

- name the company, the seam, the war, the year, or any proper noun the player
  cannot see
- resolve. The corpus deliberately contains a contradiction (35 vs 9): the bell
  is a receipt, and the bell ends the shift. Both are true from different desks,
  and neither is explained.
- be voiced. Wayne June works for Darkest Dungeon because it had one narrator
  and a budget. Ours are cut into stone by people who are gone, and a voice
  would put someone alive in the room.
