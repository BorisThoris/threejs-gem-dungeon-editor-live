import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import { keeperStalled, useRun } from "../state/run";

/**
 * Says when the Keeper rises. Kneeling is a deadline on the run's clock,
 * and nothing is called when a deadline passes - so the frame loop
 * watches the edge, once, and the captions and the sound hang off it.
 */
export function KeeperDriver() {
  const was = useRef(false);

  useFrame(() => {
    const s = useRun.getState();
    const now = s.phase === "playing" && keeperStalled(s);
    if (was.current && !now && s.phase === "playing") bus.emit("keeperRose");
    was.current = now;
  });

  return null;
}
