import { useEffect } from "react";

import { bus } from "../events";
import { ITEMS, type ItemId } from "../items/catalog";
import { sideOfNeighbour } from "./bearing";
import { useRun } from "../state/run";
import { behaviourFor } from "../warden/tuning";
import { ambience, music, sfx } from "./audio";

/** The side a neighbouring room lies on, from the run's own map. */
function towards(roomId: string): number {
  const s = useRun.getState();
  return sideOfNeighbour(
    s.dungeon?.rooms.find((r) => r.id === s.currentRoomId),
    roomId
  );
}

/** Sound cues, driven entirely by bus events. Renders nothing. */
export function Audio() {
  const playing = useRun((s) => s.phase === "playing");
  // The bed runs while a run is on and fades out when it ends or is quit.
  const rouse = useRun((s) => behaviourFor(s.alarm).rouse);
  useEffect(() => {
    if (!playing) return;
    ambience.start();
    return () => ambience.stop();
  }, [playing]);
  useEffect(() => {
    if (playing) ambience.setTension(rouse);
  }, [playing, rouse]);

  /**
   * The score, which follows the run rather than the room.
   *
   * Two moods and one motif: the title screen gets it stately, a run gets
   * it sparse and closing up as the floor wakes. The summary screens keep
   * the title mood, because a run that has just ended is a menu with a
   * score on it and silence there reads as the sound having broken.
   */
  const phase = useRun((s) => s.phase);
  const paused = useRun((s) => s.paused);
  useEffect(() => {
    music.start(phase === "playing" ? "delve" : "title");
  }, [phase]);
  useEffect(() => {
    if (phase === "playing") music.setTension(rouse);
  }, [phase, rouse]);
  // A paused game is a quiet one. The phrase holds where it is rather than
  // running on behind the menu and firing a burst of notes on the way back.
  useEffect(() => {
    music.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    const offs = [
      bus.on("gemCollected", () => sfx.gem()),
      bus.on("doorOpened", () => sfx.door()),
      bus.on("damaged", () => sfx.hurt()),
      bus.on("lifeBought", () => sfx.heal()),
      bus.on("runWon", () => sfx.win()),
      bus.on("floorDescended", () => sfx.unlock()),
      bus.on("runLost", () => sfx.lose()),
      bus.on("puzzleResult", ({ completed }) => (completed ? sfx.solved() : sfx.wrong())),
      bus.on("relicTaken", () => sfx.relic()),
      bus.on("shrineKept", () => sfx.shrineKept()),
      bus.on("bombBurst", () => sfx.boom()),
      bus.on("secretRevealed", () => sfx.unlock2()),
      bus.on("itemTaken", () => sfx.take()),
      bus.on("itemNamed", () => sfx.named()),
      bus.on("keyTaken", () => sfx.key()),
      // Tolerant of a bare emit: a missing pan is a cue in the middle,
      // and a sound effect is never worth throwing out of the frame loop for.
      bus.on("sentrySaw", (e) => sfx.spotted(e?.pan ?? 0)),
      bus.on("vaultOpened", () => sfx.unlock2()),
      bus.on("arenaRun", ({ running }) => (running ? sfx.grind() : sfx.release())),
      // A device is set down rather than drunk, and it fires `itemUsed` too
      // so the identify-by-use bookkeeping stays in one place - so this
      // takes the cue and the swallow below is told to skip devices.
      bus.on("devicePlaced", ({ cruel }) => (cruel ? sfx.clatter() : sfx.setDown())),
      bus.on("itemUsed", ({ id, cruel }) => {
        if (ITEMS[id as ItemId]?.family === "device") return;
        if (cruel) sfx.bitter();
        else sfx.drink();
      }),
      bus.on("charmSpent", () => sfx.charm()),
      // Which wall the footfall came through. Without it the cue says only
      // "it is close", which in a game about which door to take is half a
      // sentence.
      bus.on("wardenNearby", ({ roomId }) => sfx.wardenNear(towards(roomId))),
      bus.on("wardenWoke", () => sfx.wardenNear()),
      bus.on("wardenEntered", () => sfx.wardenHere()),
      // Over the `hurt` that the damage itself fires, not instead of it.
      bus.on("wardenStruck", () => sfx.wardenStrike()),
      bus.on("wardenWounded", () => sfx.wardenWound()),
      bus.on("wardenRouted", () => sfx.wardenRout()),
      bus.on("thiefTook", () => sfx.snatch()),
      bus.on("thiefFled", () => sfx.thiefFled()),
      bus.on("thiefCaught", () => sfx.thiefDropped()),
      bus.on("nestEmptied", () => sfx.gem()),
      bus.on("lanternToggled", ({ raised }) => sfx.lantern(raised)),
      bus.on("lanternOut", () => sfx.lanternOut()),
      bus.on("lanternFilled", () => sfx.lanternFilled()),
      bus.on("itemBlessed", () => sfx.relic()),
      bus.on("deedEarned", () => sfx.deed()),
      bus.on("doorBarred", () => sfx.barDoor()),
      // Two very different events with one piece of state behind them.
      bus.on("barBroken", ({ byWarden }) => (byWarden ? sfx.barBreak() : sfx.barLift())),
      bus.on("wardenLured", () => sfx.clatter()),
    ];
    return () => offs.forEach((off) => off());
  }, []);
  return null;
}
