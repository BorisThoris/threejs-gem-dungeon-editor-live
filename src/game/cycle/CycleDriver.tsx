import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import * as ladder from "../ladder/state";
import { canControl, harrierAway, runClock, useRun } from "../state/run";
import { BASE, INTENSITY, openCycle, stepCycle, stokeCycle } from "./director";
import { cycleNow, setCycle } from "./state";

/**
 * The floor's pacing, stepped once a frame.
 *
 * The Coefficient decides HOW BAD a floor is allowed to get. This decides
 * WHEN - and the split is the source's own sentence rather than my
 * inference: "Algorithm adjusts pacing, not difficulty - Amplitude
 * (difficulty) is not changed, frequency (pacing) is."
 *
 * What it does is one thing: it refuses to let the floor send anything NEW
 * while the player is in a valley. Everything already in flight keeps
 * acting, which is what stops the valley reading as a scripted
 * intermission - the Warden in your room does not politely stop walking
 * because a director decided you have had enough.
 */
export function CycleDriver() {
  const floorAt = useRef(-1);

  useFrame((_, delta) => {
    const s = useRun.getState();
    if (!canControl(s)) return;

    if (floorAt.current !== s.floorEnteredAt) {
      floorAt.current = s.floorEnteredAt;
      setCycle(openCycle(runClock(s)));
      return;
    }

    /**
     * Something that COMMITS is on the player: not merely present, but on
     * the rung where it will actually close. Intensity does not decay
     * while this is true, because a chase that read as calm halfway
     * through would put the director into a valley at the worst possible
     * moment.
     *
     * A solo game collapses a four-player maximum into one much noisier
     * accumulator, so the threat radius is widened to the whole room
     * rather than a distance - being in the room with the thing IS the
     * pressure here, and the ladder already knows whether it means it.
     */
    const inRoom = s.wardenRoomId !== null && s.wardenRoomId === s.currentRoomId;
    const engaged =
      s.reaperAwake ||
      (s.harrierAwake && !harrierAway(s)) ||
      (inRoom && ladder.commits("warden"));

    let d = cycleNow();
    if (engaged) d = stokeCycle(d, INTENSITY.hunted * delta);
    else if (inRoom) d = stokeCycle(d, INTENSITY.nearby * delta);

    setCycle(
      stepCycle(
        d,
        BASE,
        runClock(s),
        delta,
        engaged,
        // OURS, and stated: rooms newly walked on this floor. Without a
        // defined progress axis the relax is a fixed intermission players
        // learn to wait out.
        s.floorRooms,
        Math.random()
      )
    );
  });

  useEffect(() => {
    const hit = (amount: number) => setCycle(stokeCycle(cycleNow(), amount));
    const off = [
      /** A life. The largest single input there is. */
      bus.on("damaged", () => hit(INTENSITY.damaged)),
      /** Forced displacement: held, snared, knocked off your line. */
      bus.on("snareSprung", () => hit(INTENSITY.displaced)),
      bus.on("trapSprung", () => hit(INTENSITY.displaced)),
      bus.on("thiefTook", () => hit(INTENSITY.displaced)),
      /** The floor itself being loud at you. */
      bus.on("bombBurst", () => hit(INTENSITY.startled)),
      bus.on("batsRoused", () => hit(INTENSITY.startled)),
      /**
       * And a rung going up on something that can commit. The ladder is
       * the honest measure of "is this getting worse", and reading it here
       * rather than counting creatures is why the accumulator did not need
       * a fifth special case.
       */
      bus.on("rungChanged", ({ rose, rung }) => {
        if (rose && rung >= 2) hit(INTENSITY.nearby);
      }),
      bus.on("runStarted", () => setCycle(openCycle())),
      bus.on("runLost", () => setCycle(openCycle())),
    ];
    return () => off.forEach((fn) => fn());
  }, []);

  return null;
}
