import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import type { Dungeon } from "../dungeon/types";
import { useRun } from "../state/run";
import { HARRIER_ALARM_LEVEL } from "../world";
import { harrierRoostFor } from "./harrierRoost";

/**
 * The Harrier's sleep, watched from the frame loop: it wakes when the
 * alarm reaches HARRIER_ALARM_LEVEL or the player walks into its roost.
 * Read here rather than in `takeGem` and `travel` so the two things that
 * wake it are one rule in one place, and a floor with no Harrier costs
 * nothing but a lookup that is cached per dungeon.
 */
export function HarrierDriver() {
  const cache = useRef<{ d: Dungeon | null; floor: number; roost: string | null }>({ d: null, floor: 0, roost: null });

  useFrame(() => {
    const s = useRun.getState();
    if (s.phase !== "playing" || s.paused || !s.dungeon || s.harrierAwake || s.harrierSlain) return;
    const c = cache.current;
    if (c.d !== s.dungeon || c.floor !== s.floor) {
      c.d = s.dungeon;
      c.floor = s.floor;
      c.roost = harrierRoostFor(s.dungeon, s.floor);
    }
    if (!c.roost) return;
    if (s.alarm >= HARRIER_ALARM_LEVEL || s.currentRoomId === c.roost) s.wakeHarrier();
  });

  return null;
}
