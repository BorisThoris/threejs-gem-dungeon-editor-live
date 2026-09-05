import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { canControl, useRun } from "../state/run";
import { CUTPURSE_FROM_FLOOR } from "../world";

/**
 * When the Cutpurse tries.
 *
 * Mounted once for the run, like the Warden's driver, and for the same
 * reason: only the frame loop is guaranteed to be running whatever room is
 * mounted. Unlike the Warden's, it has almost nothing to decide - the
 * thief has no life between visits, so this is a timer and a set of
 * conditions, all of which the store owns and checks in `thiefArrives`.
 *
 * The one thing kept here is how long the player has been standing in this
 * room. It comes for someone who has stopped: a player walking through is
 * hard to rob and, more to the point, a thief that appears in the doorway
 * you are already leaving through is an encounter nobody gets to play. A
 * few seconds of standing still is also exactly when a player is deciding
 * whether to go back for more, which is the moment worth interrupting.
 */
const SETTLED_S = 3;

export function CutpurseDriver() {
  const settled = useRef(0);
  const room = useRef<string | null>(null);

  useFrame((_, delta) => {
    const run = useRun.getState();
    if (run.floor < CUTPURSE_FROM_FLOOR) return;
    if (!canControl(run)) return;
    if (run.currentRoomId !== room.current) {
      room.current = run.currentRoomId;
      settled.current = 0;
      return;
    }
    if (run.thiefPhase !== "away") return;
    settled.current += delta;
    if (settled.current < SETTLED_S) return;
    // Refused for any of half a dozen reasons - no gems, too soon, a ward
    // on the room - and none of them are this file's business. Reset the
    // clock either way, so a refusal is a few seconds of peace rather than
    // a call every frame.
    settled.current = 0;
    useRun.getState().thiefArrives();
  });

  return null;
}
