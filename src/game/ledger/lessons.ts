/**
 * The Ledger: knowledge as the progression, and the only kind of
 * progression a twenty-minute run can honestly offer.
 *
 * The rule this is built on is one sentence, and it is a constraint on US
 * rather than on the player:
 *
 *   "Keeping track of what they've learned should not be the challenging
 *    part of the game."
 *
 * So the Ledger records only what the delver is 100% CERTAIN to have
 * observed, and makes no inferences on their behalf. It never writes "the
 * Warden is blind to light" because the player walked past one with a lamp
 * up; it writes "I walked past it with the lamp raised and it did not
 * turn", and the player draws the conclusion. The difference is the whole
 * design: an inference made for the player is a spoiler with extra steps,
 * and a game that hands you conclusions has replaced its own subject.
 *
 * What it pays in is the currency this game actually has:
 *
 *   KNOWING LETS YOU SKIP A STEP.
 *
 * A recorded draft marks the wall without spending a bomb. A learned bark
 * tells you the rung without seeing the creature. Our tells - a draft means
 * a thin wall, a moth means your lantern is showing - currently pay almost
 * nothing, which is why nobody learns them.
 *
 * And the line the Offer's research draws, which applies here too: these
 * are ENABLERS, never substitutes. A Ledger entry that revealed secret
 * walls outright would delete the draft tell it was supposed to reward. One
 * that marks a wall you already found by listening is an enabler, because
 * the listening still happened.
 *
 * NOT built: the "three-part anatomy of a clue" - that every text carries a
 * story, a Previously and a Next. It was refuted 0-3, it is not this game's
 * rule, and it is exactly the kind of seductive structure that would have
 * turned forty order-independent fragments into a chain.
 */

export interface LedgerLesson {
  id: string;
  /**
   * What the delver must ACTUALLY have done or seen for this to be
   * written. Every one of these is a first-person observation, and if it
   * cannot be phrased that way it does not belong in the Ledger.
   */
  observed: string;
  /** The entry, in the delver's own hand. A record, never a conclusion. */
  entry: string;
  /**
   * The step it lets them skip afterwards. Empty means the entry is worth
   * having and pays nothing mechanical, which is allowed - but only for
   * things the player would want written down anyway.
   */
  pays: string;
}

export const LEDGER_LESSONS: readonly LedgerLesson[] = [
  {
    id: "draft",
    observed: "felt a draft in a room, and later opened the wall it came from",
    entry: "A draft crossed the doorway here, and the wall behind it was thin.",
    pays: "A draft you have felt before is marked on the wall, without spending a bomb to prove it.",
  },
  {
    id: "moth",
    observed: "had a moth settle on the raised lantern and then been found",
    entry: "The moth came to the lamp, and it did not leave, and after that it knew where I was.",
    pays: "The moth's arrival names what it costs, every time, rather than the once the teacher says it.",
  },
  {
    id: "wardenBlind",
    observed: "stood lit and still inside a Warden's cone and not been seen",
    entry: "I stood in its light with the lamp up. It did not turn. It is carrying its own.",
    pays: "The readout says it outright, so a raised lantern beside a Warden stops being a question.",
  },
  {
    id: "sentryDeaf",
    observed: "made a noise in a Sentry's room and had it not turn",
    entry: "I dropped something at its foot. It never turned. It is a post, not an ear.",
    pays: "The readout says it outright, so noise near a watcher stops being a question.",
  },
  {
    id: "wallSound",
    observed: "heard something through a wall, and opened it",
    entry: "There was a sound through the stone here, and a room behind it.",
    pays: "A sound through a wall names what is behind it instead of describing the noise.",
  },
  {
    id: "gemvein",
    observed: "taken a gem from a vein that only showed below the Dark band",
    entry: "The veins are in the walls the whole time. You only see them with the lamp down.",
    pays: "The lantern's readout names the band the veins show at, instead of leaving it to be found.",
  },
  {
    id: "bark",
    observed: "heard a creature's bark and then seen the rung it was on",
    entry: "It makes a different sound when it has only heard you than when it has you.",
    pays: "A rung changing in a room you cannot see is said out loud, and names the rung.",
  },
  {
    id: "theftSilent",
    observed: "taken a gem inside a Warden's hearing and not been heard",
    entry: "I took one out of the wall an arm's length from it. It heard nothing. Taking is quiet.",
    pays: "Nothing. It is worth knowing and it changes no readout - which is the point of it.",
  },
  {
    id: "reaper",
    observed: "used a bar, a snare and a lure on the last thing, and had none of them work",
    entry: "A barred door, a snare, a lure. It answered to none of it. Only the blast, and only for a moment.",
    pays: "The readout names what does hold it, so the bar and the snare stop being offered against it.",
  },
] as const;

export type LessonId = (typeof LEDGER_LESSONS)[number]["id"];

/** Every id, for reading a save written by some other build. */
export const LESSON_IDS: readonly string[] = LEDGER_LESSONS.map((l) => l.id);

export const ledgerLessonBy = (id: string): LedgerLesson | undefined =>
  LEDGER_LESSONS.find((l) => l.id === id);

/**
 * The one rule the recording side has to obey, written where it can be
 * checked: an entry is written when its observation happened, and never
 * when something merely implies it.
 *
 * The temptation this exists to refuse: writing `wardenBlind` the first
 * time a player raises the lantern near a Warden. They did not observe the
 * Warden failing to react - they observed a Warden, and nothing else. The
 * entry has to wait until they stood in its cone, lit, and were not seen,
 * because that is the only sequence that actually demonstrates the fact.
 */
export const RECORDED_ON_OBSERVATION_ONLY = true;
