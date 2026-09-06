import { useFrame } from "@react-three/fiber";

import { isBomb } from "../items/catalog";
import { runClock, useRun } from "../state/run";

/**
 * Fuses burn on the run's clock and go off from the frame loop.
 *
 * Not a timer: a fuse lit and then paused is a fuse that has not burned,
 * and the only clock that knows that is the run's. Whichever room the
 * player is standing in, a bomb left in another one still goes off there
 * - that is why this outlives a room, beside the Warden and the thief.
 */
export function BombDriver() {
  useFrame(() => {
    const s = useRun.getState();
    if (s.phase !== "playing" || s.paused) return;
    const now = runClock(s);
    for (const d of s.placed) {
      if (d.live && isBomb(d.id) && d.fuseAt !== undefined && d.fuseAt <= now) s.detonate(d.key);
    }
  });
  return null;
}
