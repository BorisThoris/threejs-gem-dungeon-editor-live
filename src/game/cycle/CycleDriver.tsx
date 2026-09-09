import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import * as ladder from "../ladder/state";
import { roomById } from "../dungeon/types";
import { canControl, harrierAway, runClock, useRun } from "../state/run";
import type { RunState } from "../state/run";
import { INTENSITY, openCycle, stepCycle, stokeCycle } from "./director";
import { openMenace, pressureOn, spendMenace, stepMenace, withdrawsNow } from "./menace";
import { cycleNow, menaceNow, setCycle, setMenace, tempoFor } from "./state";

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
      // The cap is per floor, so the floor is where it resets. A player who
      // spent both breaths upstairs arrives downstairs with two more.
      setMenace(openMenace());
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

    stepMenaceGauge(s, delta, inRoom);

    setCycle(
      stepCycle(
        d,
        // The connective tissue's pacing, or the finale's. One call, so the
        // driver never has an opinion about which - the floor does.
        tempoFor(),
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
      bus.on("runStarted", () => {
        setCycle(openCycle());
        setMenace(openMenace());
      }),
      bus.on("runLost", () => {
        setCycle(openCycle());
        setMenace(openMenace());
      }),
    ];
    return () => off.forEach((fn) => fn());
  }, []);

  return null;
}

/**
 * The menace gauge, stepped alongside the director and firing when it fills.
 *
 * Out of line rather than in the frame callback because it is a different
 * question on a different clock, and reading them interleaved made it look
 * like one accumulator with two thresholds - which is exactly the thing the
 * research says these must not be.
 */
function stepMenaceGauge(s: RunState, delta: number, inRoom: boolean) {
  const commits = ladder.commits("warden");
  // One doorway away, which the room's own links already say. Not a
  // distance: only one room is mounted, so "near" can only ever mean the
  // doorways between here and there.
  const here = s.dungeon && s.currentRoomId ? roomById(s.dungeon, s.currentRoomId) : undefined;
  const adjacent = Boolean(
    here && s.wardenRoomId && Object.values(here.links).some((id) => id === s.wardenRoomId)
  );
  // The other two things that commit and cannot be walked away from. They
  // never withdraw - the Reaper is the floor's patience running out and the
  // Harrier is a body in the air - but they are pressure, and a player
  // under one of them while the Warden closes is under both.
  const hunted = s.reaperAwake || (s.harrierAwake && !harrierAway(s));
  const stepped = stepMenace(menaceNow(), delta, pressureOn(inRoom, commits, adjacent, hunted));
  const now = runClock(s);

  /**
   * And it only fires where it can be SEEN.
   *
   * A gauge filled by a Reaper on an out-of-patience floor while the Warden
   * is three rooms away would spend one of the floor's two breaths moving
   * something the player cannot see, and they would get nothing at all for
   * it. The breath is the distance opening in front of them.
   */
  if ((inRoom || adjacent) && withdrawsNow(stepped, now)) {
    setMenace(spendMenace(stepped, now));
    useRun.getState().withdrawWarden();
    return;
  }
  setMenace(stepped);
}
