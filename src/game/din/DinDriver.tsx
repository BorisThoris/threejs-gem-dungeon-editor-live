import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import { roomById, type Dungeon } from "../dungeon/types";
import { runClock, useRun } from "../state/run";
import * as din from "./din";

/**
 * The one place a game event becomes a thing the floor can hear.
 *
 * Everything the player does already goes over the bus. What was missing
 * was anybody on the other end: 120 of the 140 listener registrations in
 * this codebase are Audio and Captions, and across the six threat systems
 * exactly one file subscribed to the bus at all. So the events were fine
 * and the ears were the problem.
 *
 * This translates, and does nothing else. It decides no reactions and
 * knows no creatures - it turns "a barrel burst in the cistern" into "a
 * [loud] [broken] 0.60 happened in the cistern", and whether that matters
 * to anything is entirely the receiver's business. Keeping the whole
 * translation in one file is what makes the Din auditable: there is one
 * list of what this game can be heard doing.
 */
export function DinDriver() {
  /**
   * The Din's clock is the run's clock, so a paused game makes no sound
   * and a bomb heard just before a pause is still fading afterwards
   * rather than having aged eleven seconds behind a menu.
   */
  useFrame(() => {
    const s = useRun.getState();
    if (s.phase !== "playing") return;
    din.advance(runClock(s));
  });

  useEffect(() => {
    const at = (dungeon: Dungeon | null, roomId: string | null | undefined) =>
      dungeon && roomId ? roomById(dungeon, roomId) : undefined;

    /** The state the Din needs to place a signal: the graph, and what blocks it. */
    const floor = () => {
      const s = useRun.getState();
      // One bar at a time, and only while it stands.
      const bars = new Set<string>();
      if (s.barredDoor && runClock(s) < s.barUntil) bars.add(s.barredDoor);
      return { s, bars };
    };

    const strike = (
      id: Parameters<typeof din.strike>[0],
      roomId: string | null | undefined,
      x = 0,
      z = 0
    ) => {
      const { s, bars } = floor();
      const room = at(s.dungeon, roomId ?? s.currentRoomId);
      if (!s.dungeon || !room) return;
      din.strike(id, s.dungeon.rooms, room, x, z, bars);
    };

    const off = [
      /** A new floor has heard nothing yet. */
      bus.on("runStarted", () => din.reset()),
      bus.on("floorDescended", () => din.reset()),
      bus.on("runLost", () => din.reset()),

      /** The loudest thing in the game, and the only source of [blast]. */
      bus.on("bombBurst", ({ roomId, x, z }) => strike("bombBurst", roomId, x, z)),

      bus.on("trapSprung", ({ kind }) =>
        strike(kind === "grate" ? "grateDrop" : kind === "pit" ? "pitOpened" : "dartsFired", null)
      ),
      bus.on("propBroken", ({ roomId }) => strike("propBroken", roomId)),
      bus.on("snareSprung", () => strike("snareSprung", null)),
      bus.on("batsRoused", () => strike("batsRoused", null)),
      bus.on("barBroken", () => strike("barBroken", null)),
      bus.on("doorBarred", ({ roomId }) => strike("doorBarred", roomId)),
      bus.on("vaultOpened", ({ roomId }) => strike("vaultOpened", roomId)),
      bus.on("thiefCame", ({ roomId }) => strike("cutpurse", roomId)),

      /**
       * A sprint. The store already owns whether one was loud enough to
       * matter in this room's biome; the Din owns how far that carries.
       */
      bus.on("wardenHeard", () => strike("sprint", null)),

      /**
       * Theft is silent, and the call is here rather than absent because
       * a reader looking for "what does taking a gem sound like" should
       * find the answer written down instead of finding nothing and
       * wondering whether it was forgotten.
       */
      bus.on("gemCollected", ({ roomId, x, z }) => strike("gemTaken", roomId, x ?? 0, z ?? 0)),

      /**
       * The key is a heavy piece of cut metal. Picking it up makes you
       * something the Cutpurse can hear; putting it in a lock is the
       * loudest legitimate thing on the floor.
       */
      bus.on("keyTaken", () => {
        const { s, bars } = floor();
        if (!s.dungeon || !s.currentRoomId) return;
        din.hold("carried:key", "carriedKey", s.dungeon.rooms, s.currentRoomId, 1, 0, 0, bars);
      }),
      bus.on("vaultOpened", () => din.release("carried:key")),
      bus.on("thiefTook", () => din.release("carried:key")),

      /**
       * The lantern is a condition, not an event: it is true for as long
       * as it is held up, which is what a moth and a Sentry need to be
       * able to ask about on any frame and not only on the one it went
       * up. Its magnitude is the glim, so lowering the flame makes you
       * less visible by degrees rather than by a switch.
       */
      bus.on("lanternToggled", ({ raised }) => {
        if (!raised) {
          din.release("lantern");
          return;
        }
        const { s, bars } = floor();
        if (!s.dungeon || !s.currentRoomId) return;
        din.hold("lantern", "lantern", s.dungeon.rooms, s.currentRoomId, 1, 0, 0, bars);
      }),
      bus.on("lanternOut", () => din.release("lantern")),

      /** The lamplighter is brighter than you are and does not know it. */
      bus.on("wispCame", () => {
        const { s, bars } = floor();
        if (!s.dungeon || !s.currentRoomId) return;
        din.hold("wisp", "wisp", s.dungeon.rooms, s.currentRoomId, undefined, 0, 0, bars);
      }),
      bus.on("wispLeft", () => din.release("wisp")),
    ];
    return () => off.forEach((fn) => fn());
  }, []);

  /**
   * A held source moves with its holder. The lantern and the key are in
   * the player's hands, so they belong to whichever room the player is
   * standing in, and re-holding on the same key replaces rather than
   * trailing a line of lit rooms behind them.
   */
  useEffect(
    () =>
      bus.on("roomEntered", ({ roomId }) => {
        const s = useRun.getState();
        if (!s.dungeon) return;
        const bars = new Set<string>();
        if (s.barredDoor && runClock(s) < s.barUntil) bars.add(s.barredDoor);
        for (const [key, id] of [
          ["lantern", "lantern"],
          ["carried:key", "carriedKey"],
          ["wisp", "wisp"],
        ] as const) {
          if (din.holding(key)) din.hold(key, id, s.dungeon.rooms, roomId, undefined, 0, 0, bars);
        }
      }),
    []
  );

  return null;
}
