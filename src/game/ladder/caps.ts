import type { ReceiverId } from "../din/susceptibility";
import type { AlertCap } from "./awareness";
import type { Cone, Rung } from "./rungs";

/**
 * One archetype, many creatures, by cap alone.
 *
 * This is the table the whole Ladder exists to make possible. Every
 * creature on the floor runs the same state machine, and what makes a rat
 * a rat and a Reaper a Reaper is three numbers rather than three files.
 *
 * The cap below the engage rung is the trick worth stealing: a creature
 * that can reach 2 and not 3 perceives you, reacts to you, and calls out
 * about you, and never once commits. An evade-only game can build most of
 * its population that way and still have a floor that feels inhabited -
 * which is precisely what our rats, our moth and our roosts already
 * pretend to do with hand-written special cases.
 *
 * Two rows are the design stated as data:
 *
 *   The Reaper is pinned at the top. Min and max are both the engage rung,
 *   so it never rises because it was never not risen and it can never be
 *   slid back down. It answers to nothing in the Din and it is always
 *   hunting here, and between those two rows there is nothing left to
 *   write about it anywhere else.
 *
 *   The moth's max is 1. It notices, it drifts, and there is no state in
 *   which it is a threat - but it is on the same ladder as everything
 *   else, so the thing that gives you away is legible in the same
 *   vocabulary as the thing that kills you.
 */
export const CAPS: Record<ReceiverId, AlertCap> = {
  /** The foreman. It commits, and it remembers the floor. */
  warden: { max: 3, min: 0, floorAfterPeak: true },
  /**
   * A post. Never quite still, because it is a machine that is always on,
   * and it forgets completely because a machine has nothing to remember
   * with.
   */
  sentry: { max: 3, min: 1, floorAfterPeak: false },
  /** It commits - to your satchel - and it is shy afterwards. */
  cutpurse: { max: 3, min: 0, floorAfterPeak: false },
  /** Pinned. See above. */
  reaper: { max: 3, min: 3, floorAfterPeak: false },
  /** Scatters and settles. It never comes for you. */
  rat: { max: 2, min: 0, floorAfterPeak: false },
  /** It notices a light. That is the whole creature. */
  moth: { max: 1, min: 0, floorAfterPeak: false },
  /** A roost goes up and comes back down; it is weather, not a threat. */
  bat: { max: 2, min: 0, floorAfterPeak: false },
  /** It follows a lantern and it is not aware of you at all. */
  wisp: { max: 1, min: 0, floorAfterPeak: false },
  /** It dives. It does not forget quickly, but it does forget. */
  harrier: { max: 3, min: 0, floorAfterPeak: true },
  /**
   * It never stops watching the stair, so it never drops below searching -
   * and it was told nothing leaves, so having seen you once it stays that
   * way.
   */
  keeper: { max: 3, min: 2, floorAfterPeak: true },
};

/**
 * The ordered cone sets.
 *
 * ORDERED matters: the sets are walked in declaration order and the first
 * cone the player falls inside is the only one that counts, so a narrow
 * sharp cone declared before a wide dull one is how "it sees you better
 * dead ahead" is expressed - without any falloff inside either. The
 * boundary between two cones is a thing a player can learn and stand just
 * outside of, which a smooth gradient would not be.
 *
 * Only the creatures with a facing worth modelling have cones. The rats,
 * the moth and the roosts are moved by the Din alone, which is the correct
 * amount of machinery for a creature whose entire awareness is "there was
 * a bang" or "there is a light".
 */
export const CONES: Partial<Record<ReceiverId, readonly Cone[]>> = {
  /**
   * A tall figure holding a lamp at arm's length. It reads well ahead of
   * itself, poorly to the sides, and it notices anything standing next to
   * it however quiet - which is why the answer to a Warden in your room is
   * to leave rather than to hold still.
   */
  warden: [
    { angle: 0.35, zAngle: 0.5, range: 12, acuity: 1.0, profile: "normal" },
    { angle: 0.9, zAngle: 0.6, range: 9, acuity: 0.7, profile: "normal" },
    { angle: 1.9, zAngle: 0.7, range: 6, acuity: 0.55, profile: "peripheral" },
    { angle: Math.PI, zAngle: 1.2, range: 2.5, acuity: 0.6, profile: "omni" },
  ],
  /**
   * One cone, and it is the beam. Night vision: six times as sensitive to
   * light as anything else on the floor, which is the whole reason a
   * raised lantern in a Sentry's line is not a risk but a decision already
   * made.
   */
  sentry: [{ angle: 0.25, zAngle: 0.45, range: 11, acuity: 1.0, profile: "nightVision" }],
  /**
   * Low and to the side. It is watching your hands, not your face, and it
   * is far better at seeing you move than at seeing you lit.
   */
  cutpurse: [
    { angle: 1.5, zAngle: 0.8, range: 10, acuity: 0.8, profile: "peripheral" },
  ],
  /** From above, where almost everything is in the open. */
  harrier: [{ angle: 1.2, zAngle: 1.4, range: 14, acuity: 0.9, profile: "omni" }],
  /**
   * It does not look anywhere. It is on the stair and everything that
   * comes near the stair is its business.
   */
  keeper: [{ angle: Math.PI, zAngle: 1.4, range: 6, acuity: 1.0, profile: "omni" }],
};

/** The rung a creature is pinned to when it has no ladder to climb. */
export const pinnedAt = (id: ReceiverId): Rung | null => {
  const cap = CAPS[id];
  return cap.min === cap.max ? cap.min : null;
};
