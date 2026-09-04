import { SENTRY_HALF_ANGLE, SENTRY_PATIENCE, SENTRY_RANGE, SENTRY_SPIN } from "../world";

/**
 * How long the Sentry's beam holds you, and whether you can get out of it.
 *
 * The Warden's promise is checked in systems/pace.ts and the arena's in
 * arena/sweep.ts. This is the third of the three things in the game that
 * can catch a player, and the only one whose numbers had never been put
 * next to a walking speed at all - four constants in world.ts and a
 * paragraph saying the room is "about judging it".
 *
 * The Sentry is the gentlest of the three: it takes no life. Being held in
 * the light rouses the floor by one and tells the Warden where you are,
 * which is a cost you pay later rather than at once. So what is worth
 * holding it to is not survivability but that it asks a question and the
 * question has an answer:
 *
 *   Standing still in the light is always seen. Walking out of it never is.
 *
 * The second half stops being true if you have drunk mire, and that is the
 * point of mire - written down here so that it is a decision rather than
 * something nobody had noticed.
 */

/**
 * How long the beam covers one fixed direction: how long a player who does
 * not move is held in it.
 */
export const sweepTime = (): number => (2 * SENTRY_HALF_ANGLE) / SENTRY_SPIN;

/**
 * The longest it can take to walk out of the beam at this distance, moving
 * against the sweep.
 *
 * The pessimistic route, and deliberately so. A player caught at the
 * leading edge has to cross the whole wedge to leave by the trailing one,
 * and the beam is turning towards them the whole way, so the two rates add:
 * the angle to cover is the full width and the rate is the beam's own plus
 * the player's. Stepping back out of the leading edge is often quicker -
 * it needs only to outrun the edge, which a walk does inside about nine
 * units - but it is not available everywhere, and this bound is.
 */
export const timeToLeaveBeam = (radius: number, speed: number): number =>
  (2 * SENTRY_HALF_ANGLE) / (SENTRY_SPIN + speed / radius);

/**
 * The worst place to be caught: the far edge of the beam's reach, where a
 * player's own speed buys the least angle. Walking out is hardest here and
 * easiest under the post.
 */
export const slowestEscape = (speed: number): number => timeToLeaveBeam(SENTRY_RANGE, speed);

/** True if a player at this speed is called out before they can leave. */
export const isCaught = (radius: number, speed: number): boolean =>
  timeToLeaveBeam(radius, speed) > SENTRY_PATIENCE;
