/**
 * Awareness with rungs, and the asymmetry that makes it read.
 *
 * The brief, in the words of the designer who shipped the best version of
 * this: the point is "broadening out the gray zone of safety and danger
 * that in most first-person games is razor thin." Our floor currently has
 * two states - it has not noticed you, or it is coming - and the whole of
 * the game between them is a boolean flipping.
 *
 * Four properties are transplanted, and each was verified against a
 * primary source across three separate passes:
 *
 *   The interior is analog and the surface is discrete. Visibility is a
 *   continuous 0..1 built from three separable inputs, and it feeds an
 *   output stage that is entirely discrete, designed for "a limited number
 *   of player-perceivable inputs, and discrete valued results." The
 *   quantisation IS the readability - not a simplification of it.
 *
 *   Up is a gated JUMP. It is held behind a reaction delay that is a
 *   property of the CURRENT state rather than the goal state, and once the
 *   delay passes it advances without visiting the states in between.
 *   Break the stimulus inside that window and there is no alert at all -
 *   which is what makes ducking back behind a pillar a real move rather
 *   than a delay of the inevitable.
 *
 *   Down is a timed SLIDE. A capacitor that degrades gradually, passing
 *   through every intermediate state on the way. So being noticed is
 *   sudden and being forgotten is slow, and a player learns both shapes.
 *
 *   The cap is a content tool. Max level, min level, and a floor after
 *   peaking - and capping below the engage rung hard-disables attacking
 *   and fleeing, which is how one implementation covers a whole
 *   population. An evade-only game can cap most of its creatures below
 *   that gate and still have every one of them react, bark and
 *   investigate. That is our rats, our moth, our Cutpurse and our Warden
 *   out of one file.
 *
 * What is OURS, flagged because three passes disagreed about it: the
 * per-rung discharge times, and the rule that a creature that has peaked
 * settles back more suspicious than it started. The engine property that
 * seemed to say so is documented; the behaviour is not. It stays because
 * a floor that remembers what you did on it is right for this game, and
 * 6/14/22 are starting values with no claim of provenance.
 */

/**
 * The rungs, in the words the player will hear rather than the numbers the
 * pipeline carries.
 *
 * Four, not eight: the discrete stage exists to be perceived, and a ladder
 * a player cannot name the rungs of is a continuous value wearing a
 * costume.
 */
export const RUNGS = ["still", "stirring", "searching", "hunting"] as const;
export type Rung = 0 | 1 | 2 | 3;

/** What the creature is doing at each rung, and what the player hears. */
export const RUNG_NAME: Record<Rung, string> = {
  0: "Still",
  1: "Stirring",
  2: "Searching",
  3: "Hunting",
};

/**
 * The rung at which a thing commits - comes at you, or runs from you.
 *
 * Capping a creature below this is the whole content trick: it perceives,
 * it reacts, it barks, and it never engages. A rat that reaches 2 and
 * cannot reach 3 is a complete creature written in one table row.
 */
export const ENGAGE: Rung = 3;

/**
 * How long a stimulus must hold before the jump is allowed, in seconds.
 *
 * A property of the rung it is leaving, not the rung it is going to. Two
 * values because a strong stimulus is dealt with faster than a moderate
 * one; both are the shipped numbers.
 */
export const REACT_MODERATE_S = 0.75;
export const REACT_STRONG_S = 0.5;

/**
 * After reacting, this long of instant reaction: no delay, no second
 * chance to break the stimulus. Being seen once makes being seen again
 * cheap, which is why a botched approach is worth abandoning entirely.
 */
export const RETRIGGER_MODERATE_S = 12;
export const RETRIGGER_STRONG_S = 22;

/**
 * Inside this, the delay does not apply at all.
 *
 * Nine feet in the source, and the reason it exists is that a delay at
 * arm's length reads as the creature being broken rather than as the
 * player being quick. Ours in world units, where a room is 14 to 30
 * across and a doorway is a couple of units wide.
 */
export const IGNORE_DELAY_RANGE = 2.75;

/**
 * How long each rung takes to slide down out of, in seconds. OURS - see
 * the header. Long, and longer the higher it got: a creature that has hunted
 * you does not go back to still in the time it takes to walk a room.
 */
export const DISCHARGE_S: Record<Rung, number> = { 0: 0, 1: 6, 2: 14, 3: 22 };

/**
 * The three separable inputs the analog value is built from, and the
 * per-cone multipliers applied to them.
 *
 * Separable is the load-bearing word. A player who cannot tell whether
 * they were given away by their light, their speed or their position
 * cannot do anything about it, and all three of ours are things the player
 * chooses continuously.
 */
export interface Visibility {
  /** How lit the player is: the lantern, a brazier, the wisp. */
  light: number;
  /** How fast they are moving. Standing still is not zero, but it is close. */
  movement: number;
  /** How much of them is in the open, rather than behind furniture. */
  exposure: number;
}

export interface ConeProfile {
  light: number;
  movement: number;
  exposure: number;
}

/**
 * The shipped profiles. Peripheral vision is the interesting one and the
 * shape of it is a design statement: a tenth as sensitive to light, three
 * times as sensitive to movement. Out of the corner of its eye it cannot
 * see your lantern and it absolutely can see you run.
 */
export const PROFILES = {
  normal: { light: 1.0, movement: 1.0, exposure: 1.0 },
  peripheral: { light: 0.3, movement: 3.0, exposure: 1.0 },
  omni: { light: 0.8, movement: 1.4, exposure: 1.2 },
  /** The Sentry's, and the reason standing in its beam is not survivable. */
  nightVision: { light: 6.0, movement: 1.0, exposure: 1.0 },
} as const satisfies Record<string, ConeProfile>;

export type ProfileId = keyof typeof PROFILES;

/**
 * One cone of a creature's ordered set.
 *
 * Two properties are easy to get wrong and both are verified. The cones
 * are ORDERED and only the FIRST one the target falls inside counts -
 * they are tested in sequence and the first hit wins, so a narrow
 * high-acuity cone in front of a wide low-acuity one is how "it sees you
 * better dead ahead" is expressed. And each cone emits a CONSTANT output
 * regardless of where in it the target stands: there is no falloff inside
 * a cone, which is what makes the boundary a thing the player can learn.
 */
export interface Cone {
  /** Half-angle from the facing, in radians. */
  angle: number;
  /** Half-angle above and below, in radians. */
  zAngle: number;
  range: number;
  /** Constant output for anything inside. */
  acuity: number;
  profile: ProfileId;
}

/**
 * Whether a point is inside a cone, and nothing else - no falloff, no
 * distance weighting. The constant-output rule lives here so it cannot be
 * softened one caller at a time.
 */
export function insideCone(cone: Cone, forwardX: number, forwardZ: number, dx: number, dz: number, dy = 0): boolean {
  const flat = Math.hypot(dx, dz);
  const range = Math.hypot(flat, dy);
  if (range > cone.range || range <= 0) return false;
  if (Math.abs(Math.atan2(dy, flat || 1e-6)) > cone.zAngle) return false;
  const dot = (forwardX * dx + forwardZ * dz) / (flat || 1e-6);
  return Math.acos(Math.max(-1, Math.min(1, dot))) <= cone.angle;
}

/**
 * The first cone the target is in, or null. Ordered: the set is walked in
 * declaration order and the first hit wins.
 */
export function coneFor(
  cones: readonly Cone[],
  forwardX: number,
  forwardZ: number,
  dx: number,
  dz: number,
  dy = 0
): Cone | null {
  for (const cone of cones) if (insideCone(cone, forwardX, forwardZ, dx, dz, dy)) return cone;
  return null;
}

/**
 * The analog value, 0..1: the cone's acuity against the three inputs under
 * that cone's profile.
 *
 * Everything above this line is continuous and everything below it is
 * discrete, and the seam is deliberate rather than a rounding step.
 */
export function seenAt(cone: Cone, v: Visibility): number {
  const p = PROFILES[cone.profile];
  const raw = (v.light * p.light + v.movement * p.movement + v.exposure * p.exposure) / 3;
  return Math.max(0, Math.min(1, cone.acuity * raw));
}

/**
 * What the analog value is worth as a rung.
 *
 * The whole discrete stage, and it is three thresholds rather than a curve
 * because a player has to be able to say what they did wrong.
 */
export function rungFor(seen: number): Rung {
  if (seen >= 0.7) return 3;
  if (seen >= 0.4) return 2;
  if (seen >= 0.15) return 1;
  return 0;
}
