import type { Room } from "../dungeon/types";

/** Croakers publishes the same chorus count it sends to audio. The HUD polls
 * it without store writes; a generated grid address prevents cross-floor
 * room IDs from inheriting the previous colony's description. */
export const chorus = { room: null as Room["grid"] | null, singing: 0 };
