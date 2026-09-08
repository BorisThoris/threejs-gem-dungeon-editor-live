/**
 * The lantern bargain: darkness is an affordance the player spends.
 *
 * Our lantern is a pure penalty. Lowering it gives nothing - it only makes
 * you harder to see, and there is no reason ever to raise it except that
 * you cannot see either. That fails Law 6 twice: darkness must PAY, and it
 * must pay in NAMED STEPS.
 *
 * The rule this replaces it with:
 *
 *   Darkness is an affordance the player spends, not a state the game
 *   imposes - cheap and instant to enter, expensive and slow to leave, its
 *   cost shown as a live number, its payoff in a currency the lit state
 *   cannot buy at all.
 *
 * Three corrections the research forced on my first draft, all of them
 * load-bearing:
 *
 * (a) OIL BURNS PER ROOM, NOT PER SECOND. I had a sixty-second wick on a
 *     wall clock. The game that shipped this best has light that does not
 *     decay with time at all - it costs 1 per already-explored segment and
 *     6 per newly explored one - and the transplant note is aimed straight
 *     at us: a time-based drain punishes deliberation, careful looking and
 *     hiding, which are exactly the behaviours an evade-only lantern game
 *     wants to reward. Our whole game is deliberation and hiding. A wall
 *     clock taxes the core verb.
 *
 * (b) THE TOGGLE IS ASYMMETRIC. Lowering is free and instant at any moment.
 *     Raising costs oil and takes time. Carrying light means carrying less
 *     treasure home.
 *
 * (c) BOTH ENDS PAY, IN NON-SUBSTITUTABLE CURRENCIES. My first table had
 *     darkness paying and light paying nothing. High light buys information
 *     and initiative - you scout the next room from the doorway and you
 *     surprise what is in it. Low light buys resources - gemveins show in
 *     the walls, and at zero a cracked wall shows without a bomb. Neither
 *     can be converted into the other, which is what makes it a decision
 *     rather than a difficulty setting.
 *
 * And the gemvein is the key idea: the same room means two different things
 * depending on how you enter it, and what it pays cannot be banked, because
 * you can only take it while you are standing in the danger.
 */

/** Glim: how much light the delver is showing, 0 to 100. */
export const GLIM_MAX = 100;

export interface GlimBand {
  id: string;
  name: string;
  /** The lowest glim in this band. */
  at: number;
  /** How far the delver can see, in world units. */
  sees: number;
  /** What this band buys that no other band can. Empty for the middle. */
  buys: string;
}

/**
 * Five bands, not four. `Shrouded` is real and the common four-name
 * shorthand is the imprecise version - and it matters here because
 * Shrouded is where the chest bonus lives, which is the rung that makes the
 * slide downwards worth starting.
 */
export const GLIM_BANDS: readonly GlimBand[] = [
  {
    id: "raised",
    name: "Raised",
    at: 76,
    sees: 15,
    buys: "You read the next room from its doorway, and surprise what is in it.",
  },
  { id: "guttered", name: "Guttered", at: 51, sees: 9, buys: "" },
  {
    id: "shrouded",
    name: "Shrouded",
    at: 26,
    sees: 5,
    buys: "One chest in four is holding a second thing.",
  },
  {
    id: "dark",
    name: "Dark",
    at: 1,
    sees: 3,
    buys: "Gemveins show in the walls.",
  },
  {
    id: "blind",
    name: "Blind",
    at: 0,
    sees: 1,
    buys: "Cracked walls show without a bomb.",
  },
] as const;

export const glimBand = (glim: number): GlimBand => {
  const g = Math.max(0, Math.min(GLIM_MAX, glim));
  // Walked high to low, so the first band whose floor it clears is its own.
  for (const band of GLIM_BANDS) if (g >= band.at) return band;
  return GLIM_BANDS[GLIM_BANDS.length - 1];
};

/** How far the delver can see at this glim. */
export const seesAt = (glim: number): number => glimBand(glim).sees;

/** Below this, the walls give up their veins. */
export const GEMVEIN_BELOW = 26;
/** And at nothing at all, a thin wall shows itself. */
export const CRACK_BELOW = 1;

export const gemveinsShow = (glim: number): boolean => glim < GEMVEIN_BELOW;
export const cracksShow = (glim: number): boolean => glim < CRACK_BELOW;
/** The lit half of the bargain: reading a room before walking into it. */
export const canScout = (glim: number): boolean => glim >= GLIM_BANDS[0].at;

/**
 * What a room costs to walk into, in oil.
 *
 * Pushing into the unknown is what costs; backtracking is nearly free. That
 * asymmetry is the whole of (a): a player who wants to stop and look at
 * something, or to stand still in a corner and wait for a Warden to pass,
 * pays nothing for the privilege.
 */
export const OIL_PER_NEW_ROOM = 6;
export const OIL_PER_KNOWN_ROOM = 1;

export const oilForRoom = (alreadyWalked: boolean): number =>
  alreadyWalked ? OIL_PER_KNOWN_ROOM : OIL_PER_NEW_ROOM;

/**
 * The asymmetric toggle.
 *
 * Down is instant and free, from any band to any band including straight to
 * nothing. Up costs oil AND takes a moment, so a player who dropped the
 * flame to slip past a Sentry cannot have it back the instant they are
 * clear - which is what makes dropping it a commitment rather than a
 * keystroke.
 */
export const RAISE_S = 1.4;
export const RAISE_OIL = 4;
export const LOWER_S = 0;
