import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import { patienceLeft, useRun } from "../state/run";
import { REAPER_WARNING_S } from "../world";

/**
 * The floor's patience, counted from the frame loop.
 *
 * Not a timer: the patience is on the run's clock, which the pause menu
 * stops, and the only thing guaranteed to be running whatever room is
 * mounted is the frame loop. It warns once a floor, when the countdown
 * begins, and wakes the Reaper once, when it ends. Both are keyed on the
 * second the floor began rather than on the floor number, so a new run's
 * first floor is warned about again.
 */
export function ReaperDriver() {
  const warnedFor = useRef(-1);

  useFrame(() => {
    const s = useRun.getState();
    if (s.phase !== "playing" || s.paused || s.reaperAwake) return;
    const left = patienceLeft(s);
    if (left <= REAPER_WARNING_S && warnedFor.current !== s.floorEnteredAt) {
      warnedFor.current = s.floorEnteredAt;
      bus.emit("floorTiring", { left });
      bus.emit("notice", "The floor tires of you.");
    }
    if (left <= 0) s.wakeReaper();
  });

  return null;
}
