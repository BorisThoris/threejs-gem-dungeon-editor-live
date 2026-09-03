import { useEffect } from "react";

import { bus } from "../events";
import { useSettings } from "../state/settings";
import { useRun } from "../state/run";
import { behaviourFor } from "../warden/tuning";
import { ambience, sfx } from "./audio";

/** Sound cues, driven entirely by bus events. Renders nothing. */
export function Audio() {
  const playing = useRun((s) => s.phase === "playing");
  // The bed runs while a run is on and fades out when it ends or is quit.
  const rouse = useRun((s) => behaviourFor(s.alarm).rouse);
  const sound = useSettings((s) => s.sound);
  useEffect(() => sfx.setMuted(!sound), [sound]);
  useEffect(() => {
    if (!playing) return;
    ambience.start();
    return () => ambience.stop();
  }, [playing]);
  useEffect(() => {
    if (playing) ambience.setTension(rouse);
  }, [playing, rouse]);

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
      bus.on("itemTaken", () => sfx.take()),
      bus.on("itemNamed", () => sfx.named()),
      bus.on("keyTaken", () => sfx.key()),
      bus.on("vaultOpened", () => sfx.unlock2()),
      bus.on("arenaRun", ({ running }) => (running ? sfx.grind() : sfx.release())),
      bus.on("itemUsed", ({ cruel }) => (cruel ? sfx.bitter() : sfx.drink())),
      bus.on("charmSpent", () => sfx.charm()),
      bus.on("wardenNearby", () => sfx.wardenNear()),
      bus.on("wardenWoke", () => sfx.wardenNear()),
      bus.on("wardenEntered", () => sfx.wardenHere()),
    ];
    return () => offs.forEach((off) => off());
  }, []);
  return null;
}
