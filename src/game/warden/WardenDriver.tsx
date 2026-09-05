import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import { canControl, lureNow, useRun, wardNow, wardenSenses, wardenStaggered } from "../state/run";
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
    // Reeling from the floor's spikes: it is not going anywhere, and the
    // timer does not run while it is down - otherwise a stagger that
    // straddled a step boundary was spent the instant it ended, and the
    // window the player bought was three seconds of nothing followed by it
    // walking straight back in.
    if (wardenStaggered(run)) return;

    // A thrown sound is what it is walking to, if there is one: it is
    // following a noise it already heard rather than listening for the
    // player, which is why a Scroll of Echoes is also permission to run.
    const lure = lureNow(run);
    // Heard, or seen: a raised lantern on a dark floor gives a player away
    // exactly as a sprint does, and `wardenSenses` is the one place that
    // decides that so the driver, the HUD and the tuning cannot disagree.
    const behaviour = behaviourFor(run.alarm, !lure && wardenSenses(run));
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
    /**
     * A ward stone is a room it will not walk into, so it waits outside.
     *
     * Refusing the step rather than routing around it, because the stone
     * says "not this room" and not "the long way round": a Warden that
     * detoured would still be coming, and the thirty seconds the stone
     * buys is the one place in the game where the answer to it is to stand
     * still. It goes back to walking when the stone runs out.
     */
    if (to === wardNow(run)) return;
    run.moveWarden(to);

    // Heard through the wall: it has stepped into a room you could walk to.
    const here = run.dungeon.rooms.find((r) => r.id === run.currentRoomId);
    if (here && to !== run.currentRoomId && Object.values(here.links).includes(to)) {
      bus.emit("wardenNearby", { roomId: to });
    }
  });

  return null;
}
