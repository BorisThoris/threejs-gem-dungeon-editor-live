import { useFrame } from "@react-three/fiber";

import { useRun, wardenSeesLight } from "../state/run";
import { wispAt } from "./lamplighter";

/**
 * Whether the wisp is out, decided once a frame from the one fact it
 * follows: the Warden can see the player's light. Written to the store
 * only when it changes, so the room mounts and unmounts the wisp and the
 * HUD and the captions hear about it, and nothing re-renders in between.
 */
export function WispDriver() {
  useFrame(() => {
    const run = useRun.getState();
    const out = run.phase === "playing" && !!run.dungeon && wardenSeesLight(run);
    if (out !== run.wispOut) run.setWisp(out);
    if (!out) {
      wispAt.out = false;
      wispAt.roomId = null;
    }
  });
  return null;
}
