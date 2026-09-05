import { useEffect } from "react";

import { bus } from "../events";
import { useRun } from "../state/run";
import { floorRules } from "../world";

/**
 * The few lines of teaching the run gets.
 *
 * It is never explained in a menu nobody reads: the first time the Warden
 * wakes, the player is told what woke it and that running works, and the
 * first time it walks into their room they are told to leave. After that the
 * game says nothing and lets the sound do the work. Arriving on a floor is
 * the exception that repeats, because each one down is a different place and
 * a player who is not told that only finds out by being caught by it.
 */
const WOKE = "Something woke below. It walks the floor now, and every gem you take makes it worse.";
const HERE = "It is in this room. You cannot fight it. Hold Shift and go.";
const SEEN = "The watcher called out. Stay out of the light - it tells the Warden where you are.";
const LOUD = "It heard that. Running carries down here; walking does not.";
const THROWN = "Something clatters a long way off. It has gone to look, and it is not listening for you.";
const BIT = "The spikes do not care which of you stands on them. Put another patch between you.";
const ROUTED = "It will not cross those again. Whatever else this floor gives you, that trick is spent.";

export function useWardenWarning() {
  useEffect(() => {
    let told = { woke: false, here: false, seen: false, loud: false, bit: false };
    /**
     * These go in the notice slot, which they own and nothing else writes.
     *
     * They used to be hints with a `setTimeout` that emitted `hint: null`
     * when they were done - the wall clock, and worse, somebody else's
     * line. A memory chamber entered within six and a half seconds of the
     * floor's opening blurb had its own instruction wiped by that timer and
     * never got it back. How long a notice lasts is the Hint's business
     * now, on the run's clock.
     */
    const say = (text: string) => bus.emit("notice", text);
    const offs = [
      bus.on("wardenWoke", () => {
        if (told.woke) return;
        told.woke = true;
        say(WOKE);
      }),
      bus.on("wardenEntered", () => {
        if (told.here) return;
        told.here = true;
        say(HERE);
      }),
      bus.on("sentrySaw", () => {
        if (told.seen) return;
        told.seen = true;
        say(SEEN);
      }),
      bus.on("wardenHeard", () => {
        // Only worth saying once there is something to hear it: told before
        // the Warden wakes, the line is a warning about nothing.
        if (told.loud || !useRun.getState().wardenRoomId) return;
        told.loud = true;
        say(LOUD);
      }),
      // Not a one-off: this one is feedback for an action the player just
      // took, and it says what the scroll bought them.
      bus.on("wardenLured", () => say(THROWN)),
      // The first wound teaches what just happened; the rout says the
      // lesson has been learned by the other side, which is a rule change
      // and so worth saying every time it happens.
      bus.on("wardenWounded", () => {
        if (told.bit) return;
        told.bit = true;
        say(BIT);
      }),
      bus.on("wardenRouted", () => say(ROUTED)),
      bus.on("floorDescended", ({ floor }) => say(floorRules(floor).blurb)),
      bus.on("runStarted", () => {
        told = { woke: false, here: false, seen: false, loud: false, bit: false };
        say(floorRules(1).blurb);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);
}
