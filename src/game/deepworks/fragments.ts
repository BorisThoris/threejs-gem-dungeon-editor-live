/**
 * The Deepworks: a fiction made entirely of the mechanics we already ship.
 *
 * Nothing here asks for a new system. It asks the systems to mean
 * something, and every line is read OFF one of them rather than painted on:
 *
 *   the toll rises 3, 5, 7      a debt is being collected, and it compounds
 *   the Warden carries a lamp   it was the one left holding it
 *   the floor's patience runs   the place is not hostile, it is finishing
 *                               a shift
 *   gems are set in the walls   not treasure - the currency the place was
 *                               paid in
 *   the Keeper bars the stair   somebody decided nothing else leaves
 *   run records persist         you are the latest of many
 *
 * The Deepworks was a company town cut into a seam. The workers were paid
 * in what they dug. When the seam ran out the company took the wages back,
 * floor by floor, at a rising rate, and the ones who could not pay stayed.
 * The Warden was the shift foreman. The Keeper was the man on the last
 * stair told to let nobody up until the books balanced. Nobody has told
 * either of them the company is gone.
 *
 * YOU ARE NOT A HERO. YOU ARE A CREDITOR - and that is load-bearing rather
 * than flavour, because embedded narrative mostly takes the form of
 * detective or conspiracy stories, "since these genres help to motivate the
 * player's active examination of clues". A creditor auditing books that do
 * not add up is a detective motive arrived at from the toll.
 */

/**
 * The four shapes a fragment may be written in.
 *
 * Not genres - constraints. Each is a form of writing that cannot contain a
 * sequence, which is what makes any three of them survive being found in
 * any order. A fragment never contains "then", "after" or "next".
 */
export const SHAPES = ["instruction", "complaint", "inventory", "correction"] as const;
export type Shape = (typeof SHAPES)[number];

export interface Fragment {
  id: number;
  shape: Shape;
  text: string;
  /**
   * Where it is allowed to be cut. A fragment on the Keeper's slab has to
   * be one a man on the last stair would have written or been given.
   */
  on: readonly ("wall" | "slab" | "chest" | "alcove" | "counter" | "bell")[];
  /** Only in the first start room, and only for the one that names the wall. */
  startOnly?: boolean;
}

/**
 * Forty fragments. The corpus is deliberately unresolvable: it contains a
 * planted contradiction (35 against 9 - the bell is a receipt, and the bell
 * ends the shift) which is a GAP rather than a fact, and gaps stay
 * single-sourced on purpose. Any three of these imply a fourth thing the
 * player assembles, and nothing here explains itself.
 *
 * None of them names the company, the seam, the war, the year, or any
 * proper noun the player cannot see. And none of them is ever voiced: they
 * are cut into stone by people who are gone, and a voice would put someone
 * alive in the room.
 */
export const FRAGMENTS: readonly Fragment[] = [
  // Instructions - written to someone else, by someone with the authority
  // to write them, about a place that still had a shift.
  { id: 1, shape: "instruction", text: "Do not ring it twice.", on: ["bell", "wall"] },
  { id: 2, shape: "instruction", text: "Leave the lamp with him. He will not take it from you.", on: ["wall", "alcove"] },
  { id: 3, shape: "instruction", text: "Count what you take at the face, not at the stair.", on: ["wall", "counter"] },
  { id: 4, shape: "instruction", text: "If the moth finds you, put it down and walk.", on: ["wall", "alcove"] },
  { id: 5, shape: "instruction", text: "Any man on the last stair is to be considered on duty.", on: ["slab", "wall"] },
  { id: 6, shape: "instruction", text: "Wages are paid at the wall. Nowhere else is the wall.", on: ["wall"] },
  { id: 7, shape: "instruction", text: "Do not settle with the small one. He does not keep books.", on: ["counter", "wall"] },
  { id: 8, shape: "instruction", text: "Bar the door behind you. He learns the doors.", on: ["wall", "alcove"] },
  { id: 9, shape: "instruction", text: "The shift ends when the bell says. Not when you say.", on: ["bell", "wall"] },
  { id: 10, shape: "instruction", text: "Whatever you find in the dark is still ours.", on: ["wall", "chest"] },

  // Complaints - written by someone with no authority at all, which is how
  // the player learns the instructions were not obeyed.
  { id: 11, shape: "complaint", text: "The third shift will not go below.", on: ["wall"] },
  { id: 12, shape: "complaint", text: "Rate went up again. Nobody signed for it.", on: ["wall", "counter"] },
  { id: 13, shape: "complaint", text: "Two lamps out this week and neither of them mine.", on: ["wall"] },
  { id: 14, shape: "complaint", text: "They have stopped sending anyone to take the count.", on: ["wall", "counter"] },
  { id: 15, shape: "complaint", text: "He asks me the same question every time I pass.", on: ["wall", "slab"] },
  { id: 16, shape: "complaint", text: "I have paid this floor twice and it is still not paid.", on: ["wall"] },
  { id: 17, shape: "complaint", text: "Nobody told the foreman. Somebody should tell the foreman.", on: ["wall", "alcove"] },
  { id: 18, shape: "complaint", text: "The seam is finished. They know the seam is finished.", on: ["wall"] },
  { id: 19, shape: "complaint", text: "My brother is on the list and my brother went up in spring.", on: ["wall"] },
  { id: 20, shape: "complaint", text: "There is no shift. There has not been a shift for a long time.", on: ["wall", "slab"] },

  // Inventories - the driest shape and the one that does the most work,
  // because a column of numbers that stops mid-row is a whole event.
  { id: 21, shape: "inventory", text: "Nine bells. Eight accounted for.", on: ["counter", "wall"] },
  { id: 22, shape: "inventory", text: "Lamps out: 14. Lamps returned: 3.", on: ["counter", "wall"] },
  { id: 23, shape: "inventory", text: "Floor one, paid. Floor two, paid. Floor three —", on: ["wall", "counter"] },
  { id: 24, shape: "inventory", text: "Owing: 3. Owing: 5. Owing: 7. Owing:", on: ["wall", "slab"] },
  { id: 25, shape: "inventory", text: "Names on this wall: 61. Names off it: 0.", on: ["wall"] },
  { id: 26, shape: "inventory", text: "Six keys cut. Six locks. One key.", on: ["counter", "chest"] },
  { id: 27, shape: "inventory", text: "Oil for the month: two measures. Two measures.", on: ["counter", "alcove"] },
  { id: 28, shape: "inventory", text: "Taken from the face this quarter: nothing. Nothing. Nothing.", on: ["wall", "counter"] },
  { id: 29, shape: "inventory", text: "On the books: every man below. Off the books: the man on the stair.", on: ["slab", "counter"] },
  { id: 30, shape: "inventory", text: "Weight of the count, in gems: more than was ever dug.", on: ["counter", "wall"] },

  // Corrections - somebody arguing with a fragment the player may not have
  // found, which is the shape that most makes the place feel argued over.
  { id: 31, shape: "correction", text: "It is not a debt. It was never a debt.", on: ["wall"] },
  { id: 32, shape: "correction", text: "He is not guarding it. He is waiting to be relieved.", on: ["slab", "wall"] },
  { id: 33, shape: "correction", text: "The lamp does not keep him off. The lamp is how he finds the wall.", on: ["wall", "alcove"] },
  { id: 34, shape: "correction", text: "Nobody sealed the lower floors. The lower floors are where they went.", on: ["wall"] },
  { id: 35, shape: "correction", text: "The bell is not an alarm. The bell is a receipt.", on: ["bell", "wall"] },
  { id: 36, shape: "correction", text: "We were not robbed. We were paid, and then we were unpaid.", on: ["wall"] },
  { id: 37, shape: "correction", text: "She is not stealing. She is the only one still saving.", on: ["wall", "alcove"] },
  { id: 38, shape: "correction", text: "It does not hunt you. It has come for the count and you are holding it.", on: ["wall", "slab"] },
  { id: 39, shape: "correction", text: "The dark is not empty down here. The dark is where the wages are.", on: ["wall", "alcove"] },
  /**
   * The only fragment that points at another fragment, and the only one
   * pinned to a place. It is how the player learns the names wall is real
   * rather than scenery.
   */
  { id: 40, shape: "correction", text: "You are not the first. Read the wall.", on: ["wall"], startOnly: true },
] as const;

/**
 * How the seam ended: ONE variable with three values, and then we stop.
 *
 * Simulating a history forward until it collapses and rendering the ruin
 * from the final state is exactly what this place wants, and we have a
 * seeded generator that could do it. The reason we take the idea
 * deliberately half is that its author names the condition: it works
 * because players only play once. Resampling teaches the generator's
 * variation limits - a small lake stops reading as drought and starts
 * reading as one draw from a range - and a twenty-minute repeated run
 * erodes precisely that effect.
 *
 * One variable with three values cannot be reverse-engineered into noise in
 * twenty minutes. Four could.
 *
 * And the author's own stated failure becomes our rule: when rendering has
 * no basis in the simulation, "players end up drawing conclusions that the
 * simulation cannot back up". So a value here chooses dressing and
 * fragments and NOTHING ELSE, and no prop may imply a fact the game does
 * not hold. Dressing is evidence or it is decoration, and it may not be
 * both.
 */
export const ENDINGS = ["workedOut", "flooded", "sealed"] as const;
export type Ending = (typeof ENDINGS)[number];

export const ENDING_OF: Record<Ending, { name: string; says: string; favours: readonly number[] }> = {
  /** The seam ran out and the company came for the wages. */
  workedOut: {
    name: "worked out",
    says: "Taken from the face this quarter: nothing.",
    favours: [18, 28, 12, 16, 31, 36, 23],
  },
  /** Water took the lower floors, and the count was never finished. */
  flooded: {
    name: "flooded",
    says: "The lower floors are where they went.",
    favours: [34, 11, 14, 20, 13, 27, 22],
  },
  /** Somebody closed it with people still inside. */
  sealed: {
    name: "sealed",
    says: "Any man on the last stair is to be considered on duty.",
    favours: [5, 29, 32, 19, 25, 8, 38],
  },
};

/** Which ending this run's seed drew. One draw per run, not per floor. */
export const endingFor = (seed: number): Ending =>
  ENDINGS[Math.abs(Math.floor(seed)) % ENDINGS.length];

/**
 * The law of three, as data.
 *
 * Every load-bearing fact gets three carriers of three different KINDS - a
 * text, an object, and a rule of the game - because essential narrative
 * information has to be redundantly presented across a range of spaces and
 * artifacts, since you cannot assume the player will locate or recognise
 * any given element. Redundancy survives reshuffling; a shattered linear
 * backstory only survives if the player finds every piece, and that
 * alternative was refuted outright.
 *
 * This table exists to be CHECKED, not read at runtime: the check holds
 * every row to having all three, so a fact cannot quietly decay into being
 * carried by one fragment nobody finds.
 */
export interface Tripled {
  fact: string;
  /** A fragment id from the corpus above. */
  text: number;
  /** Something the player can look at. */
  object: string;
  /** Something the game does whether or not the player reads anything. */
  rule: string;
}

export const TRIPLED: readonly Tripled[] = [
  {
    fact: "gems were wages, not treasure",
    text: 10,
    object: "sockets cut square, with tool marks",
    rule: "the toll takes gems back at the stair",
  },
  {
    fact: "the Warden was the foreman",
    text: 2,
    object: "its lantern matches the brackets on the walls",
    rule: "it is blind to [bright] - it is the one holding the lamp",
  },
  {
    fact: "the debt compounds",
    text: 24,
    object: "a tally board with the last column unfinished",
    rule: "TOLL_BASE 3, TOLL_STEP 2",
  },
  {
    fact: "you are the latest of many",
    text: 40,
    object: "the names wall in every start room",
    rule: "run records persist between runs",
  },
] as const;

/**
 * Rooms tell stories in four props, never in an event.
 *
 * The canonical example of this is a slaver's den built from four ordinary
 * objects - "we never saw the act... the concept behind this is the Law of
 * Closure." Ours ride the dressing system we already have, and each one is
 * a set of things that were already in the prop catalogue.
 *
 * One of them points FORWARDS rather than backwards, which the staged-damage
 * vocabulary explicitly allows: a staged area can lead to a conclusion about
 * a past event "or to suggest a potential danger just ahead". The door frame
 * scored with the marks the Keeper's bar leaves is placed two rooms before
 * the Keeper.
 */
export const TABLEAUX = [
  {
    id: "barred-from-inside",
    tells: "someone shut themselves in and the lamp went out first",
    props: ["a door barred from the inside", "a stool", "a lamp burned out", "scratches"],
  },
  {
    id: "sealed-pay-tin",
    tells: "he was paid and it did him no good at all",
    props: ["a full pay-tin, sealed", "a skeleton beside it", "nothing in its hands", "a lamp bracket, empty"],
  },
  {
    id: "cut-bell-rope",
    tells: "somebody ended the shift deliberately, and tidily",
    props: ["a bell rope cut", "the cut end coiled", "a bell", "a stool"],
  },
  {
    id: "the-wrong-side-of-the-desk",
    tells: "the man taking the count was being questioned, not questioning",
    props: ["a ledger", "a chair", "the chair on the far side of the desk", "a lamp"],
  },
  {
    id: "the-bar-marks",
    tells: "what is two rooms ahead, before it is met",
    props: ["a door frame scored deep", "the marks a bar leaves", "rubble", "a dropped lamp"],
    ahead: true,
  },
] as const;
