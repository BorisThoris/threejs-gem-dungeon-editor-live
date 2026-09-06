import { useEffect } from "react";

import { allDelversEscaped } from "./catalog";
import { bus } from "../events";
import { useDeeds } from "../state/deeds";
import { useRecords } from "../state/records";
import { keeperStalled, runClock, useRun } from "../state/run";
import { LAST_BREATH_S } from "../world";

/**
 * What earns a deed.
 *
 * One place, listening to the bus and to the run, because the alternative
 * is a line of achievement bookkeeping in every system that can trigger
 * one - and that is how a game ends up unable to say what its
 * achievements actually mean. Nothing in the game knows deeds exist except
 * this file.
 *
 * Everything here is a fact the game already publishes. Where a deed
 * needed something the game did not say out loud, the thing to do was
 * make the game say it (`floorDescended` carries the floor; the run knows
 * whether a life has been spent), never to reach into another system and
 * count on its behalf.
 */
export function useDeedWatch() {
  useEffect(() => {
    const earn = useDeeds.getState().earn;

    /**
     * Whether the lantern has been up at all on this floor.
     *
     * Kept here rather than in the run store: it is a fact about a deed
     * and nothing else in the game cares, and a store field that only an
     * achievement reads is a store field that will be wrong the first
     * time somebody refactors around it. Reset on arriving anywhere new.
     */
    let litThisFloor = false;
    let floorAt = 1;
    /** Run-clock second of the last blast, so a rout can be told to be its. */
    let bombAt = -Infinity;

    const offs = [
      // A rout is the spikes' unless a blast just went off: the bomb's
      // deed is the bomb's, and the spikes' stays the spikes'.
      bus.on("bombBurst", () => {
        bombAt = runClock(useRun.getState());
      }),
      bus.on("wardenRouted", () => {
        if (runClock(useRun.getState()) - bombAt <= 0.5) earn("bombed");
        else earn("routed");
      }),
      bus.on("secretRevealed", () => earn("throughwall")),
      bus.on("harrierSlain", () => earn("spiked")),
      // A snare wounds through the same door the spikes do, so the event
      // alone cannot tell them apart - but the store knows whether a snare
      // was the thing that was sprung, because springing one is what
      // spends it.
      bus.on("wardenWounded", () => {
        const s = useRun.getState();
        if (s.placed.some((d) => d.id === "snare" && !d.live)) earn("wirework");
      }),
      bus.on("thiefCaught", ({ gems }) => {
        if (gems > 0) earn("nottoday");
      }),
      bus.on("nestEmptied", () => earn("reclaimed")),
      bus.on("barBroken", ({ byWarden }) => {
        if (byWarden) earn("shutout");
      }),
      bus.on("lanternToggled", ({ raised }) => {
        if (raised) litThisFloor = true;
      }),
      bus.on("runStarted", () => {
        litThisFloor = false;
        floorAt = 1;
        bombAt = -Infinity;
      }),
      bus.on("floorDescended", ({ floor, left }) => {
        // The floor just left was taken in the dark, if nothing on it was
        // ever lit. Read on arriving at the next one, which is the only
        // moment the answer is final.
        if (!litThisFloor && floor > floorAt) earn("darkrunner");
        // And left with seconds of its patience to spare: the floor says
        // how much was left, rather than this reaching in to count.
        if (left <= LAST_BREATH_S) earn("lastbreath");
        litThisFloor = false;
        floorAt = floor;
      }),
      bus.on("runWon", () => {
        const s = useRun.getState();
        earn("escape");
        if (keeperStalled(s)) earn("slipped");
        if (s.gems >= 15) earn("haul");
        if (s.lives >= s.maxLives) earn("unspent");
        // The last floor counts too, and it is only won on leaving it.
        if (!litThisFloor) earn("darkrunner");
        // `record` has already folded this run in by the time the run is
        // won, so the list it reads includes the delver that just got out.
        if (allDelversEscaped(useRecords.getState().escapedAs)) earn("everydelver");
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);
}
