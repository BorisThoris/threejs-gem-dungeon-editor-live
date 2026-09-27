import { useMemo } from "react";
import type { Room } from "../dungeon/types";
import { useRun } from "../state/run";
import { roomDressingOptions } from "./dressingContext";

export function useRoomDressing(room: Room, seed: number) {
  const dungeon = useRun(s => s.dungeon);
  const floor = useRun(s => s.floor);
  const fullCountFloor = useRun(s => s.fullCountFloor);
  return useMemo(() => roomDressingOptions({ dungeon, floor, fullCountFloor }, room, seed),
    [dungeon, floor, fullCountFloor, room, seed]);
}
