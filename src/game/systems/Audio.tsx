import { useEffect } from "react";

import { bus } from "../events";
import { sfx } from "./audio";

/** Sound cues, driven entirely by bus events. Renders nothing. */
export function Audio() {
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
