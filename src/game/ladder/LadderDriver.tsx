import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import { runClock, useRun } from "../state/run";
import * as ladder from "./state";

/**
 * Steps every creature's awareness once a frame, and only here.
 *
 * The informants - a floor-level driver that knows what the Din is
 * delivering, a mounted component that knows where it is standing and
 * which way it is looking - each `report` what they can justify, and this
 * consumes the lot. Two callers stepping the same capacitor gives a guard
 * that flickers between their two views, so there is exactly one caller.
 *
 * It deliberately consumes the PREVIOUS frame's reports. React Three
 * Fiber runs frame callbacks in subscription order, and the components
 * that report are mounted and unmounted as the player walks between rooms,
 * so "run this one last" is not a thing that can be arranged without
 * taking over rendering. One frame of latency on an awareness value that
 * takes 500ms to act on is not a cost anybody can perceive; an ordering
 * dependency that breaks whenever a component's mount order changes is.
 */
export function LadderDriver() {
  useFrame(() => {
    const s = useRun.getState();
    if (s.phase !== "playing") return;
    ladder.advance(runClock(s));
  });

  useEffect(() => {
    const off = [
      bus.on("runStarted", () => ladder.reset()),
      bus.on("runLost", () => ladder.reset()),
      /** A new floor is a new set of creatures. None of them has met you. */
      bus.on("floorDescended", () => ladder.reset()),
      /**
       * The things that only exist once something has woken them are put
       * on the ladder when they arrive, rather than being stepped from
       * the first frame of the floor - a Warden that had been sliding
       * down an empty ladder for four minutes arrives with a history it
       * did not earn.
       */
      bus.on("wardenWoke", () => ladder.wake("warden")),
      bus.on("harrierWoke", () => ladder.wake("harrier")),
      bus.on("thiefCame", () => ladder.wake("cutpurse")),
      bus.on("keeperBars", () => ladder.wake("keeper")),
      /** It arrives already hunting: its cap pins it there. */
      bus.on("reaperWoke", () => ladder.wake("reaper")),
    ];
    return () => off.forEach((fn) => fn());
  }, []);

  return null;
}
