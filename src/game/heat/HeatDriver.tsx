import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import * as ladder from "../ladder/state";
import { floorMaySend } from "../cycle/state";
import { heatNow, heatOwes, runClock, useRun } from "../state/run";
import { BANDS, HEAT_SPACING_S, PURCHASES, REAPER_AT, bandFor } from "./coefficient";

/**
 * The floor's heat, spent from the frame loop.
 *
 * This replaces the Reaper's countdown, and it is a different shape rather
 * than a re-tuned one. The countdown was a ramp: one number falling at one
 * rate, with a single event at the bottom of it, and the whole of the
 * floor's escalation was that event. What the player experienced was four
 * minutes of nothing and then the worst thing in the game.
 *
 * Heat buys, in lumps, at thresholds - a Cutpurse, then the roosts, then
 * the Warden's ceiling, then a Harrier, and the thing on the last band -
 * so the same span of time has five events in it instead of one, and every
 * one of them is something the world sent rather than a slider moving.
 *
 * Not a timer, for the same reason the countdown was not one: heat is on
 * the run's clock, which the pause menu stops, and the frame loop is the
 * only thing guaranteed to be running whatever room is mounted.
 */
export function HeatDriver() {
  /** The band last announced, so a band is announced once per floor. */
  const said = useRef(-1);
  const floorAt = useRef(-1);
  /**
   * When the last lump was delivered.
   *
   * A floor that arrives already hot - floor three at a raised alarm is
   * over three credits before the player has taken a step - can afford
   * three things at once, and delivering them on three consecutive frames
   * is three captions in a twentieth of a second and reads as a bug. The
   * whole point of an integer threshold is that pressure arrives as
   * EVENTS, and two events a frame apart are one event.
   */
  const spentAt = useRef(-Infinity);

  useFrame(() => {
    const s = useRun.getState();
    if (s.phase !== "playing" || s.paused) return;

    // A new floor starts its own ladder. Keyed on the second the floor
    // began rather than on its number, so a fresh run's floor one is
    // announced again.
    if (floorAt.current !== s.floorEnteredAt) {
      floorAt.current = s.floorEnteredAt;
      said.current = -1;
      spentAt.current = -Infinity;
    }

    const heat = heatNow(s);
    const band = bandFor(heat);

    /**
     * The band, in words. Only ever on the way up: a floor that cooled
     * because the player spent the alarm at a shrine should not announce
     * that it has calmed down, because the announcement would be the only
     * numeric readout in the game wearing a name.
     */
    if (band > said.current) {
      said.current = band;
      bus.emit("floorHeat", { band, name: BANDS[band].name });
      if (band > 0) bus.emit("notice", `${BANDS[band].name.replace(/^the/, "The")}.`);
    }

    /**
     * And what it has bought. One per frame at most, so two thresholds
     * crossed in the same tick arrive as two events rather than as a pile.
     */
    /**
     * And not during a valley.
     *
     * This one line is the whole join between the two systems, and it is
     * the reason they are two systems: the Coefficient decides how bad the
     * floor is allowed to get and the Cycle decides when, so heat that has
     * been earned is HELD rather than cancelled - it arrives the moment
     * the valley ends, which is what makes a relax feel like a breath
     * rather than like the difficulty being turned down.
     */
    const spent = runClock(s);
    const owed = floorMaySend() && spent - spentAt.current >= HEAT_SPACING_S ? heatOwes(s) : [];
    if (owed.length) {
      spentAt.current = spent;
      const id = owed[0];
      const row = PURCHASES.find((p) => p.id === id);
      s.heatDelivered(id);
      if (row) bus.emit("heatSpent", { id, says: row.says });
      deliver(id);
    }

    /**
     * The last band. Everything above is something the floor sends; this
     * is the floor deciding it has finished with you, and it is the only
     * one that is not a purchase - it is what the whole ladder has been
     * climbing towards, and the player has watched it climb in words.
     */
    if (!s.reaperAwake && heat >= REAPER_AT) s.wakeReaper();
  });

  return null;
}

/** What each lump actually does. */
function deliver(id: string): void {
  const s = useRun.getState();
  switch (id) {
    case "cutpurse":
      // It has its own reasons not to come - a ward stone, the sanctuary,
      // an empty purse - and heat does not override any of them. Heat only
      // decides that it is time to try.
      s.thiefArrives();
      return;
    case "bats":
      s.rouseBats();
      return;
    case "ceiling":
      /**
       * The Warden may now commit.
       *
       * Its ceiling starts at `searching`: on a cold floor it investigates
       * noises, walks to them, calls out, and never beelines for the
       * player. That is the content trick from the ladder used on the main
       * threat rather than only on the rats - capping below the engage
       * rung makes a whole different creature out of the same code - and
       * heat is what lifts the cap.
       */
      ladder.setCeiling("warden", 3);
      return;
    case "harrier":
      s.wakeHarrier();
      return;
  }
}
