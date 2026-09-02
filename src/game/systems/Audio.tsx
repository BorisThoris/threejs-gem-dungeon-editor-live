import { useEffect } from "react";

import { bus } from "../events";
import { useRun } from "../state/run";
import { ambience, sfx } from "./audio";

/** Sound cues, driven entirely by bus events. Renders nothing. */
export function Audio() {
  const playing = useRun((s) => s.phase === "playing");
  // The bed runs while a run is on and fades out when it ends or is quit.
  useEffect(() => {
    if (!playing) return;
    ambience.start();
    return () => ambience.stop();
  }, [playing]);

  useEffect(() => {
    const offs = [
      bus.on("gemCollected", () => sfx.gem()),
      bus.on("doorOpened", () => sfx.door()),
      bus.on("damaged", () => sfx.hurt()),
      bus.on("lifeBought", () => sfx.heal()),
      bus.on("runWon", () => sfx.win()),
      bus.on("runLost", () => sfx.lose()),
      bus.on("puzzleResult", ({ completed }) => (completed ? sfx.solved() : sfx.wrong())),
    ];
    return () => offs.forEach((off) => off());
  }, []);
  return null;
}
