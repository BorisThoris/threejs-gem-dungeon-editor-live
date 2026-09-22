import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Room } from "../dungeon/types";
import { bus } from "../events";
import { playerAt } from "../player/where";
import { canControl, useRun } from "../state/run";
import { THRESHOLD_ECHO_REACH, thresholdEchoSitesFor } from "./thresholdEcho";

/** Once per approached doorway per visit; entry spawns are armed silently.
 * It owns no mesh, light, held sound, interval or store write. */
export function ThresholdEchoes({ room }: { room: Room }) {
  const rooms = useRun(state => state.dungeon?.rooms);
  const sites = useMemo(() => thresholdEchoSitesFor(room, rooms ?? []), [room, rooms]);
  const heard = useRef(new Set<string>()), near = useRef(new Set<string>()), priming = useRef(0);
  useEffect(() => {
    heard.current.clear(); near.current.clear(); priming.current = 0;
    if (!import.meta.env.DEV) return;
    const win = window as unknown as { __thresholdEchoes?: unknown };
    win.__thresholdEchoes = { roomId: room.id, roomSeed: room.seed, sites };
    return () => { delete win.__thresholdEchoes; };
  }, [room.id, room.seed, sites]);
  useFrame(() => {
    const run = useRun.getState();
    if (!canControl(run) || run.currentRoomId !== room.id) return;
    const arming = priming.current < 3;
    for (const site of sites) {
      const inReach = Math.hypot(site.x - playerAt.x, site.z - playerAt.z) <= THRESHOLD_ECHO_REACH;
      if (arming) {
        if (inReach) near.current.add(site.destination);
        else near.current.delete(site.destination);
      } else if (!inReach) near.current.delete(site.destination);
      else if (!near.current.has(site.destination)) {
        near.current.add(site.destination);
        if (!heard.current.has(site.destination)) {
          heard.current.add(site.destination);
          bus.emit("thresholdHeard", { ...site, roomId: room.id });
        }
      }
    }
    if (arming) priming.current++;
  });
  return null;
}
