/**
 * The Coefficient: one number that replaces the floor timer.
 *
 * `FLOOR_PATIENCE_S = 300` was a countdown, and a countdown is a ramp. The
 * research is unambiguous that a monotonic ramp is the version that fails -
 * one studio shipped it, players hated it, and their own patch notes now
 * target a value that "should stay in-between 3 and 7 during most of the
 * run", which is a cycle and not a slope. Ours also made dwell, greed and
 * depth three unrelated pressures with three hand-tuned tables.
 *
 * One function instead:
 *
 *     heat = (dwellMinutes x 1.0 + alarm x 0.5) x 1.15 ^ floorsDescended
 *
 * Three things worth saying about the shape.
 *
 * It COMPOUNDS with depth rather than adding. A slow floor one now costs
 * you on floor three, which is what "floors get worse as you go down" was
 * always trying to be.
 *
 * It is a PURE FUNCTION recomputed each tick, never a value mutated on a
 * transition. That distinction is not pedantry: a mutated accumulator has a
 * history, so the same player in the same situation gets different pressure
 * depending on the route they took to it, and no amount of tuning fixes a
 * number that cannot be reasoned about.
 *
 * And it NEVER KILLS. Heat buys things, in lumps, at named thresholds - a
 * Cutpurse, a roost, a rung of the Warden's ceiling, a Harrier, and finally
 * the thing on the last band. The accumulator crossing an integer is what
 * makes pressure arrive as an EVENT rather than as a slider moving, which
 * is the difference between "the world sent something" and "the numbers got
 * worse". Nothing here is ever a stat nudge the player cannot see.
 */

/** Minutes on the floor are worth this much heat each. */
export const DWELL_WEIGHT = 1.0;
/**
 * And each point of alarm this much. Half, deliberately: greed should be
 * felt as pressure without being the whole of it, or the correct play is to
 * take nothing, and a game about taking things whose optimal line is taking
 * nothing has a hole in the middle.
 */
export const ALARM_WEIGHT = 0.5;
/**
 * Multiplied in per floor descended. The same base as the game this is
 * transplanted from, verified against a wiki and two independent
 * reimplementations, and it is the whole reason depth is not a fourth
 * table.
 */
export const DEPTH_BASE = 1.15;

export function heatFrom(dwellSeconds: number, alarm: number, floorsDescended: number): number {
  const dwell = Math.max(0, dwellSeconds) / 60;
  const raw = dwell * DWELL_WEIGHT + Math.max(0, alarm) * ALARM_WEIGHT;
  return raw * Math.pow(DEPTH_BASE, Math.max(0, floorsDescended));
}

/**
 * What heat buys, and at what.
 *
 * Read as a ladder of thresholds on the credit count, not as a budget that
 * is depleted: crossing 3 raises the Warden's ceiling and does not make the
 * Harrier at 6 any further away. Each is bought once per floor, because a
 * roost that goes up twice is a roost that goes up whenever the number
 * wobbles, and the point of an integer threshold is that it is an event.
 */
export const PURCHASES = [
  { at: 1, id: "cutpurse", says: "Something small is on the floor with you." },
  { at: 2, id: "bats", says: "The roosts are awake." },
  { at: 3, id: "ceiling", says: "It is listening harder now." },
  { at: 6, id: "harrier", says: "Something is up in the dark above you." },
] as const;

export type PurchaseId = (typeof PURCHASES)[number]["id"];

/**
 * The least time between two lumps, in seconds.
 *
 * A floor can arrive owing several at once - floor three at a raised alarm
 * is over three credits before the player has taken a step - and
 * delivering them on consecutive frames is three lines of text in a
 * twentieth of a second, which reads as a glitch rather than as a floor
 * reacting. Spacing them is what keeps a threshold an event.
 */
export const HEAT_SPACING_S = 5;

/**
 * The five names the floor's heat is called by, and never a number.
 *
 * Straight out of Law 3: the rule is transparent, the magnitude is not.
 * The player is entitled to know that lingering and taking things is what
 * heats a floor - that is a rule they can plan against - and is not
 * entitled to a countdown, because a player who can count does not hurry.
 * The names carry no mechanical weight whatsoever and do all of the
 * emotional work a number cannot.
 */
export const BANDS = [
  { at: 0, name: "the floor is quiet" },
  { at: 2, name: "the floor has noticed" },
  { at: 4, name: "the floor is looking" },
  { at: 6, name: "the floor is awake" },
  { at: 8, name: "IT KNOWS WHERE YOU ARE" },
] as const;

/**
 * The band the last one names is the one the floor stops putting up with
 * you: the thing that does not wander, has no alarm and cannot be lured
 * arrives, and it arrives at a number the player has been watching climb
 * in words for several minutes.
 */
export const REAPER_AT = BANDS[BANDS.length - 1].at;

/**
 * How long a floor takes to reach a given heat at a given alarm, in
 * seconds - the inverse of the coefficient.
 *
 * Here rather than in a check because it is the number the game's own
 * promise is made of: a floor has to be finishable at a walk before it
 * stops putting up with you, and that promise used to be one constant
 * anybody could read. Now it is a function of depth and greed, so the
 * place that answers it has to be the place that defines it.
 *
 * Returns Infinity where the alarm alone already exceeds the target,
 * which is the honest answer: a floor that is already there does not take
 * any time to get there.
 */
export function secondsTo(heat: number, alarm: number, floorsDescended: number): number {
  const scale = Math.pow(DEPTH_BASE, Math.max(0, floorsDescended));
  const minutes = heat / scale - alarm * ALARM_WEIGHT;
  return minutes <= 0 ? 0 : (minutes / DWELL_WEIGHT) * 60;
}

export const bandFor = (heat: number): number => {
  let band = 0;
  for (let i = 0; i < BANDS.length; i++) if (heat >= BANDS[i].at) band = i;
  return band;
};

export const bandName = (heat: number): string => BANDS[bandFor(heat)].name;

/**
 * Everything this heat has bought, cheapest first. The caller compares it
 * against what it has already spent rather than this keeping state, so the
 * function stays pure and the store stays the one owner of what happened.
 */
export const affordable = (heat: number): PurchaseId[] =>
  PURCHASES.filter((p) => Math.floor(heat) >= p.at).map((p) => p.id);
