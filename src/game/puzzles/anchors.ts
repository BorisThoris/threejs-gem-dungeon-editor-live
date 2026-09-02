import { quadrantSpots, type Vec3 } from "../dungeon/layout";
import type { Room } from "../dungeon/types";

/**
 * Where the puzzle rooms put their content, declared apart from the
 * components so the room shell, the dressing and the gem can keep clear of
 * it without importing React trees.
 */

/** The plate stands on near[0]; the two candles on near[1] and near[2]. */
export const challengeAnchors = (room: Room): Vec3[] => quadrantSpots(room, "near").slice(0, 3);

/** Four pedestals on the far anchors; the lectern on near[3]. */
export const memoryAnchors = (room: Room): Vec3[] => [
  ...quadrantSpots(room, "far"),
  quadrantSpots(room, "near")[3],
];
