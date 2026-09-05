import { MIRE_MULTIPLIER, SWIFTNESS_MULTIPLIER } from "../items/catalog";
import { modifiers, type RelicId } from "../relics/catalog";
import { behaviourFor } from "../warden/tuning";

/**
 * How fast the player moves against how fast the Warden moves.
 *
 * This is the one place that answers "can I get away from it", and it
 * exists because the answer was wrong and nothing noticed. The Warden's
 * comment in world.ts promised that its chase speed stays under a walk at
 * every alarm level, so a player who keeps moving is never simply caught.
 * That promise was written when the only two speeds in the game were the
 * player's walk and the Warden's, and it stopped being true the day a
 * potion could halve the first of them: mire at 0.55 left an unlucky
 * player walking at 2.75 and sprinting at 4.40 against a fully roused
 * Warden at 4.40 - slower on foot, exactly level at a sprint, and a sprint
 * is what tells it where you are. The only verb this game gives you
 * against the Warden is evasion, the potion is unidentified when you drink
 * it, and there was no way out of that room.
 *
 * So the multipliers, the relics and the Warden's speed curve are all
 * held to one invariant here, and layout-check walks the whole matrix of
 * them:
 *
 *   A sprint always gets away. A walk does not.
 *
 * The first half is what makes the Warden fair - there is always an
 * answer, and it costs you the noise of making it. The second half is what
 * makes it frightening, and what mire is for.
 */

/** Which timed potion is running, if either. */
export type PaceEffect = "none" | "swift" | "mire";

export const PACE_EFFECTS: readonly PaceEffect[] = ["none", "swift", "mire"];

export interface Pace {
  walk: number;
  dash: number;
}

/** What a potion does to both speeds. One factor, applied to both. */
export const effectFactor = (effect: PaceEffect): number =>
  effect === "swift" ? SWIFTNESS_MULTIPLIER : effect === "mire" ? MIRE_MULTIPLIER : 1;

/** How fast a player with these relics, under this potion, moves. */
export function paceFor(relics: readonly RelicId[], effect: PaceEffect): Pace {
  const { walkSpeed, dashSpeed } = modifiers(relics);
  const factor = effectFactor(effect);
  return { walk: walkSpeed * factor, dash: dashSpeed * factor };
}

/** How fast the Warden crosses a room at this alarm level. */
export const wardenSpeedAt = (alarm: number): number => behaviourFor(alarm).speed;

/**
 * How much faster than the Warden the slowest sprint in the game has to
 * be. Level is not away: the Warden takes the straight line while the
 * player takes the doorway, so a dead heat is a loss. Fifteen percent is
 * about a room's length of ground over the length of a chase.
 */
export const ESCAPE_MARGIN = 1.15;

/**
 * The other chase, and the other promise.
 *
 * The Warden's is "a sprint always gets away". The Cutpurse's is its
 * mirror - it runs *from* you, holding a gem, and the promise is:
 *
 *   A sprint catches it. A walk does not.
 *
 * Same shape, opposite direction, and it needs its own home for the same
 * reason the first one did: three constants in three files that only add
 * up to a playable chase by coincidence are three constants that will stop
 * adding up the first time one of them is tuned.
 *
 * Two places the sentence is knowingly false, and both are an item doing
 * exactly what it was bought or feared for:
 *
 *   Soft Boots      a walk is enough. Three gems for not having to sprint
 *                   at the one thing sprinting is for.
 *   Potion of Mire  a sprint is not enough. Nothing you have is. It gets
 *                   away with the gem, and the nest is where you get it
 *                   back.
 *
 * `yarn test:layout` walks the whole matrix and asserts all four of those
 * - the promise, and each exception in the one place it applies - so a
 * change to a multiplier says which of them it broke.
 */
export const catchesCutpurse = (pace: Pace, cutpurseSpeed: number): boolean =>
  pace.dash > cutpurseSpeed;

/** Whether a player at this pace can close on it without sprinting. */
export const outwalksCutpurse = (pace: Pace, cutpurseSpeed: number): boolean =>
  pace.walk > cutpurseSpeed;
