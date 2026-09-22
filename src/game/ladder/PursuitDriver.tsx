import { useFrame } from "@react-three/fiber";
import { advanceTrail } from "../ladder/pursuit";
import { canControl, reaperStalled, runClock, useRun } from "../state/run";

/** Offscreen travel for creatures whose local bodies unmount between rooms. */
export function PursuitDriver() {
  useFrame((_, delta) => {
    const run = useRun.getState();
    if (!canControl(run) || !run.currentRoomId) return;
    if (run.reaperAwake && !reaperStalled(run)) {
      const arrival = advanceTrail("reaper", run.reaperRoomId, run.currentRoomId, delta, true);
      if (arrival.to) useRun.setState({ reaperRoomId: arrival.to, reaperCameFrom: run.reaperRoomId });
    }
    const now = runClock(run);
    if (run.harrierAwake && !run.harrierSlain && now >= run.harrierDownedUntil) {
      const arrival = advanceTrail("harrier", run.harrierRoomId, run.currentRoomId, delta,
        now >= run.harrierRetreatUntil);
      if (arrival.to) useRun.setState({ harrierRoomId: arrival.to, harrierCameFrom: run.harrierRoomId });
    }
    if (run.thiefPhase === "stalking") {
      const arrival = advanceTrail("cutpurse", run.thiefRoomId, run.currentRoomId, delta, true);
      if (arrival.to) useRun.setState({ thiefRoomId: arrival.to, thiefCameFrom: run.thiefRoomId });
      else if (!arrival.waiting && run.thiefRoomId !== run.currentRoomId) run.thiefEscapes();
    }
  });
  return null;
}
