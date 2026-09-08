import { useEffect } from "react";

import { bus } from "../events";
import { sentryFor } from "../sentry/placement";
import { useLedger } from "../state/ledger";
import { roomById } from "../dungeon/types";
import { lanternLit, runClock, useRun, veinsShowing } from "../state/run";

/**
 * What writes a line in the Ledger.
 *
 * One place, for the same reason `deeds/watch.ts` is one place: the
 * alternative is a line of bookkeeping in every system that can teach
 * something, and that is how a game ends up unable to say what its own
 * knowledge means. Nothing in the game knows the Ledger exists except this
 * file and the handful of readers that spend what it holds.
 *
 * And one rule, which is the Ledger's whole design and is enforced here
 * rather than hoped for:
 *
 *   AN ENTRY IS WRITTEN WHEN ITS OBSERVATION HAPPENED, AND NEVER WHEN
 *   SOMETHING MERELY IMPLIES IT.
 *
 * The temptation this exists to refuse is writing `wardenBlind` the first
 * time a player raises the lantern near a Warden. They did not observe the
 * Warden failing to react; they observed a Warden. The entry has to wait
 * until they stood in its room, lit, and were not seen - because that is
 * the only sequence that actually demonstrates the fact. Every listener
 * below is written to that standard, and where it needed something the
 * game did not say out loud, the thing to do was wait for a sequence the
 * game does say, never to guess on the player's behalf.
 */

/** How long the delver must stand lit beside a Warden before it means anything. */
const STOOD_LIT_S = 3;
/** How long a watcher has to react to a noise before it has failed to. */
const DEAF_S = 2;
/** How long a bark stays worth checking against the creature it came from. */
const BARK_HOLDS_S = 10;
/** How long after taking a gem the Warden has to have heard it. */
const THEFT_S = 2;

export function useLedgerWatch() {
  useEffect(() => {
    const learn = useLedger.getState().learn;
    const now = () => runClock(useRun.getState());

    /** Rooms a sound has come through the wall of, this run. */
    const heardThrough = new Set<string>();
    /** Whether a moth is on the lantern right now. */
    let mothOn = false;
    /** Run-clock second the delver last became known to something. */
    let lastRose = -Infinity;
    /** How long they have stood lit in a Warden's room without that changing. */
    let stoodLit = 0;
    /** A noise made in a watcher's room, and when. */
    let noiseAt: { roomId: string; at: number } | null = null;
    /** A gem taken within a Warden's hearing, and when. */
    let tookAt = -Infinity;
    /** A bark heard from a room the delver could not see into. */
    let bark: { roomId: string; rung: number; at: number } | null = null;
    /** What has been tried on the Reaper since it woke, and whether any held it. */
    let triedOnReaper = new Set<string>();
    let reaperAwake = false;

    /** Whether the room the delver is in is watched by a Sentry. */
    const watchedHere = (): boolean => {
      const s = useRun.getState();
      if (!s.dungeon || !s.currentRoomId) return false;
      const room = roomById(s.dungeon, s.currentRoomId);
      if (!room) return false;
      return !!sentryFor(room, s.dungeon.seed, s.floor);
    };

    const offs = [
      /**
       * A draft, and then the wall it came from opened. Both halves are
       * required: feeling a draft teaches nothing on its own, and opening
       * a wall the delver never stood at teaches nothing either. The run
       * already writes down which drafts were FELT rather than deduced,
       * which is exactly the record this needs.
       */
      bus.on("secretRevealed", ({ roomId }) => {
        if (useRun.getState().draftsFelt.includes(roomId)) learn("draft");
        if (heardThrough.has(roomId)) learn("wallSound");
      }),
      bus.on("wallSound", ({ roomId }) => heardThrough.add(roomId)),

      /**
       * The moth came, and then something knew where they were while it
       * was still there. A moth that lands and leaves with nothing
       * following it demonstrates nothing.
       */
      bus.on("mothLanded", () => {
        mothOn = true;
      }),
      bus.on("mothLeft", () => {
        mothOn = false;
      }),

      /**
       * Anything rising a rung is the delver becoming known, and it is
       * the negative half of three separate entries: standing lit beside
       * a Warden, making a noise beside a watcher, and taking a gem out
       * of a wall beside one. All three are "and it did not react", so
       * all three reset here.
       */
      bus.on("rungChanged", ({ who, rung, rose }) => {
        if (!rose) return;
        lastRose = now();
        stoodLit = 0;
        if (mothOn) learn("moth");
        // A bark is only a bark if it came from somewhere they could not
        // see. From the room they are standing in, they watched it happen.
        const s = useRun.getState();
        if (who === "warden" && s.wardenRoomId && s.wardenRoomId !== s.currentRoomId) {
          bark = { roomId: s.wardenRoomId, rung, at: now() };
        }
      }),

      /**
       * And then walked in on it and found the rung was what the bark
       * said. Heard it, then saw it - which is the only sequence that
       * demonstrates a bark carries the rung.
       */
      bus.on("roomEntered", ({ roomId }) => {
        if (!bark || bark.roomId !== roomId) return;
        if (now() - bark.at > BARK_HOLDS_S) {
          bark = null;
          return;
        }
        // Unchanged since the bark: what they heard is what is here.
        if (now() - lastRose > 0.2 || bark.at === lastRose) learn("bark");
        bark = null;
      }),

      /**
       * A gem taken. Two entries hang off it, and which one depends on
       * where the veins were: one is about theft being quiet, the other
       * about the veins being there the whole time.
       */
      bus.on("gemCollected", () => {
        const s = useRun.getState();
        if (veinsShowing(s) && !lanternLit(s)) learn("gemvein");
        if (s.wardenRoomId === s.currentRoomId) tookAt = now();
      }),

      /**
       * A noise beside a watcher. The Sentry is a post with an eye and no
       * ear, and this is the sequence that proves it: something loud, in
       * its room, and it never turned.
       */
      bus.on("propBroken", ({ roomId }) => {
        if (watchedHere()) noiseAt = { roomId, at: now() };
      }),
      bus.on("keyDropped", ({ roomId }) => {
        if (watchedHere()) noiseAt = { roomId, at: now() };
      }),
      bus.on("sentrySaw", () => {
        noiseAt = null;
      }),

      /**
       * The Reaper, and the one entry that is about a thing NOT working.
       *
       * It answers to a blast, briefly, and to nothing else - so the
       * observation is the three verbs that do nothing, tried on it, and
       * the blast is deliberately not among them. An entry that said the
       * blast did nothing either would be a lie the code could catch.
       */
      bus.on("reaperWoke", () => {
        reaperAwake = true;
        triedOnReaper = new Set();
      }),
      bus.on("doorBarred", () => {
        if (reaperAwake) triedOnReaper.add("bar");
      }),
      bus.on("snareSprung", () => {
        if (reaperAwake) triedOnReaper.add("snare");
      }),
      bus.on("wardenLured", () => {
        if (reaperAwake) triedOnReaper.add("lure");
      }),
      bus.on("reaperStruck", () => {
        if (reaperAwake && triedOnReaper.size >= 3) learn("reaper");
      }),

      // A new floor is a new set of walls, and none of the above carries.
      bus.on("floorDescended", () => {
        heardThrough.clear();
        bark = null;
        noiseAt = null;
        reaperAwake = false;
      }),
    ];

    /**
     * The three entries that are about time passing without anything
     * happening. They cannot hang off an event, because the fact being
     * observed is that NO event came - so they are counted, at a rate
     * that costs nothing and is nowhere near the frame loop.
     */
    const tick = window.setInterval(() => {
      const s = useRun.getState();
      if (s.phase !== "playing" || s.paused) return;
      const t = now();

      // Stood lit in its room and it did not turn. Counted rather than
      // timed from arrival, so backing out and coming back does not bank
      // the seconds they were not there for.
      if (s.wardenRoomId && s.wardenRoomId === s.currentRoomId && lanternLit(s)) {
        stoodLit += 0.25;
        if (stoodLit >= STOOD_LIT_S) learn("wardenBlind");
      } else {
        stoodLit = 0;
      }

      if (noiseAt && t - noiseAt.at >= DEAF_S) {
        // It has had its chance and did not take it.
        if (s.currentRoomId === noiseAt.roomId) learn("sentryDeaf");
        noiseAt = null;
      }

      if (tookAt > -Infinity && t - tookAt >= THEFT_S) {
        if (lastRose < tookAt) learn("theftSilent");
        tookAt = -Infinity;
      }
    }, 250);

    return () => {
      offs.forEach((off) => off());
      window.clearInterval(tick);
    };
  }, []);
}
