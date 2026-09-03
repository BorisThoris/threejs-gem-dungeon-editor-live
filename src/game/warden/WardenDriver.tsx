import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import { canControl, lureNow, useRun, wardenHears } from "../state/run";
import { nextRoom } from "./roam";
import { behaviourFor } from "./tuning";

/**
 * The Warden's walk through the rooms nobody is standing in.
 *
 * Mounted once for the whole run, not per room: the Warden exists on the
 * whole floor, and only the frame loop is guaranteed to be running whatever
 * room is mounted. It steps on a timer set by the floor's alarm, walks
 * towards the player when the alarm or a sprint has given them away, and the
 * player hears it whenever it steps into a room next door.
 */
export function WardenDriver() {
  const since = useRef(0);

  useFrame((_, delta) => {
    const run = useRun.getState();
    if (!run.wardenRoomId || !run.dungeon || !run.currentRoomId) return;
    if (!canControl(run)) return;

    // A thrown sound is what it is walking to, if there is one: it is
    // following a noise it already heard rather than listening for the
    // player, which is why a Scroll of Echoes is also permission to run.
    const lure = lureNow(run);
    const behaviour = behaviourFor(run.alarm, !lure && wardenHears(run));
    since.current += delta;
    if (since.current < behaviour.stepSeconds) return;
    since.current = 0;

    // It does not step while it is already in the room with the player: it
    // is busy, and a Warden that wandered off mid-approach would read as a
    // bug rather than as mercy. A sound it is chasing outranks that: it
    // leaves, which is the whole point of throwing one.
    if (!lure && run.wardenRoomId === run.currentRoomId) return;

    const to = nextRoom(
      run.dungeon,
      run.wardenRoomId,
      lure ?? run.currentRoomId,
      lure ? true : behaviour.hunts,
      run.wardenCameFrom,
      Math.random()
    );
    if (!to) return;
    run.moveWarden(to);

    // Heard through the wall: it has stepped into a room you could walk to.
    const here = run.dungeon.rooms.find((r) => r.id === run.currentRoomId);
    if (here && to !== run.currentRoomId && Object.values(here.links).includes(to)) {
      bus.emit("wardenNearby", { roomId: to });
    }
  });

  return null;
}
