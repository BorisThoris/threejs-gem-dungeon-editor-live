import { DIR_STEP, type Dir, type Room } from "../dungeon/types";
import { look } from "../input/look";

/**
 * Which side of the player something is on, from -1 (hard left) to +1.
 *
 * One place, because two things need it and they must agree: the Warden
 * stepping into a room next door, and a Sentry calling out from its post.
 * Getting the sign wrong would be worse than not panning at all - it would
 * send the player towards the thing they were being warned about, and it is
 * exactly the mistake this project already made once with the minimap.
 *
 * At yaw t the camera faces world (-sin t, -cos t). The right-hand vector
 * is that crossed with up, which is (cos t, -sin t). The side of a
 * direction d is therefore d dotted with that, and for a unit d it is
 * already in range.
 */
export function sideOf(dx: number, dz: number, yaw = look.yaw): number {
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return 0;
  const x = dx / length;
  const z = dz / length;
  return x * Math.cos(yaw) - z * Math.sin(yaw);
}

/**
 * Which side the room next door is on, or dead centre when it is not next
 * door after all.
 *
 * The Warden can step somewhere the player has no wall to hear it through,
 * and a guessed direction would be worse than none: it would send them
 * towards it. Kept here rather than in the audio system so the lookup can
 * be checked without a browser.
 */
export function sideOfNeighbour(
  here: Room | undefined,
  thereId: string,
  yaw = look.yaw
): number {
  if (!here) return 0;
  const dir = (Object.keys(here.links) as Dir[]).find((d) => here.links[d] === thereId);
  if (!dir) return 0;
  const step = DIR_STEP[dir];
  return sideOf(step.x, step.z, yaw);
}
