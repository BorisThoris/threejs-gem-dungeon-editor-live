import { useEffect } from "react";

import { bus } from "../events";
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
const HOLD_MS = 6500;

export function useWardenWarning() {
  useEffect(() => {
    let told = { woke: false, here: false, seen: false };
    let timer: number | null = null;
    const say = (text: string) => {
      bus.emit("hint", text);
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => bus.emit("hint", null), HOLD_MS);
    };
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
      bus.on("floorDescended", ({ floor }) => say(floorRules(floor).blurb)),
      bus.on("runStarted", () => {
        told = { woke: false, here: false, seen: false };
        say(floorRules(1).blurb);
      }),
    ];
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      offs.forEach((off) => off());
    };
  }, []);
}
