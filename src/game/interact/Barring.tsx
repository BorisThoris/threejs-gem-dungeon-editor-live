import { useFrame } from "@react-three/fiber";

import { doorPosition } from "../dungeon/layout";
import { DIRS, type Dir, type Room } from "../dungeon/types";
import { keyboard } from "../input/keyboard";
import { readGamepad } from "../input/gamepad";
import { canControl, useRun } from "../state/run";
import { INTERACT_RADIUS } from "../world";

/**
 * Barring the doorway you are standing at.
 *
 * One component per room rather than one per doorway, because the answer
 * to "which door" is a comparison between them: the nearest one in reach
 * wins, which is the same arbitration the interact key already does and
 * for the same reason - two doorways in a corner of a small room are both
 * within reach, and a rule that picks whichever component ran last is a
 * coin toss the player cannot see.
 *
 * Its own key rather than a second thing on E. E is the one verb and it is
 * already spoken for at a doorway: it goes through. Barring is the
 * opposite of going through, and putting both on one key means every door
 * needs a mode.
 */
/** B, beside the satchel keys and the lantern's F. */
const BAR_KEY = "KeyB";

export function Barring({ room }: { room: Room }) {
  useFrame((state) => {
    const run = useRun.getState();
    // Not while a menu or a puzzle is up, and not through the black frame
    // between two rooms: the same predicate everything else asks.
    if (!canControl(run)) return;

    // Peeked rather than consumed until there is actually a doorway in
    // reach, so a press near no door is not silently eaten - the keyboard
    // module's presses are one-shot and whoever asks first wins.
    const pad = readGamepad().barPressed;
    if (!pad && !keyboard.peekPress(BAR_KEY)) return;

    const cam = state.camera.position;
    let best: { dir: Dir; to: string; d: number } | null = null;
    for (const dir of DIRS) {
      const to = room.links[dir];
      if (!to) continue;
      const [x, , z] = doorPosition(room, dir);
      const d = Math.hypot(cam.x - x, cam.z - z);
      if (d > INTERACT_RADIUS) continue;
      if (!best || d < best.d) best = { dir, to, d };
    }
    if (!best) return;
    if (!pad) keyboard.consumePress(BAR_KEY);
    useRun.getState().barDoor(best.to);
  });

  return null;
}
