import * as din from "../din/din";
import { SUSCEPTIBILITY, type ReceiverId } from "../din/susceptibility";
import type { Patch } from "../warden/steer";
import type { Visibility } from "./rungs";

/**
 * Building the analog value, with the receiver still declaring what it
 * answers to.
 *
 * The three inputs are separable because a player who cannot tell whether
 * they were given away by their light, their speed or their position
 * cannot do anything about it - and all three of ours are things the
 * player is choosing continuously, which is the whole point.
 *
 * The light channel reads the Din rather than the lantern, so a brazier, a
 * lamplighter and a raised lamp are the same fact arriving from the same
 * place with the same units. And it is zeroed for a receiver that declared
 * itself deaf to [bright] - the susceptibility table stays the one owner
 * of that, rather than the Warden's cone profile quietly holding a second
 * opinion in a different file.
 */

/**
 * The speed the movement channel is measured against: roughly a sprint. A
 * walk lands near half, standing still lands at nothing, and standing
 * still is therefore a real move rather than a slower one.
 */
export const MOVEMENT_REFERENCE = 6;

export function visibilityFor(
  who: ReceiverId,
  roomId: string,
  speed: number,
  exposure: number
): Visibility {
  const blind = (SUSCEPTIBILITY[who].deaf ?? []).includes("bright");
  return {
    light: blind ? 0 : Math.min(1, din.arriving("bright", roomId)),
    movement: Math.min(1, Math.max(0, speed) / MOVEMENT_REFERENCE),
    exposure,
  };
}

/** How exposed a spot is, with nothing to stand behind. */
export const IN_THE_OPEN = 1;
/** And pressed up against something solid. Never zero: cover is not a cloak. */
export const BEHIND_SOMETHING = 0.35;

/**
 * How much of a body at (x, z) is in the open.
 *
 * Deliberately crude - proximity to solid furniture, not a raycast. The
 * game this is transplanted from used several raycasts per target and
 * could afford to; we cannot, and the accompanying finding is that a crude
 * estimator is fine as long as it is monotone in the right direction. What
 * matters to the player is that standing behind the bookshelf is better
 * than standing in the middle of the floor, and that the difference is big
 * enough to feel.
 */
export function exposureAt(x: number, z: number, cover: readonly Patch[]): number {
  let best = IN_THE_OPEN;
  for (const p of cover) {
    const d = Math.hypot(x - p.x, z - p.z);
    // Just outside the collider is the useful spot: inside is impossible
    // and far away is the open floor.
    const shade = Math.max(0, 1 - Math.max(0, d - p.r) / 1.2);
    const here = IN_THE_OPEN - shade * (IN_THE_OPEN - BEHIND_SOMETHING);
    if (here < best) best = here;
  }
  return best;
}
