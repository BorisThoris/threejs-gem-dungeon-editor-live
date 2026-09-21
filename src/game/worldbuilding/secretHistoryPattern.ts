import type { Room } from "../dungeon/types";
import { insideRoom } from "../dungeon/footprint";
import { shrineAnchor } from "../rooms/anchors";
import { secretStoryFor } from "../dungeon/secret";

export interface SecretHistoryMark {
  position: [number, number, number];
  size: [number, number, number];
  colour: string;
  surface?: "stone" | "wood";
  emissive?: boolean;
}

/** Low, non-blocking remnants arranged around the reward's reserved anchor. */
export function secretHistoryMarks(room: Room, seed: number): SecretHistoryMark[] {
  const story = secretStoryFor(room, seed), [ax, , az] = shrineAnchor(room);
  const marks: SecretHistoryMark[] = [];
  const add = (x: number, y: number, z: number, w: number, h: number, d: number,
    colour: string, surface?: "stone" | "wood", emissive?: boolean) => {
    if (insideRoom(room, x, z, Math.hypot(w, d) / 2 + .12))
      marks.push({ position: [x, y, z], size: [w, h, d], colour, surface, emissive });
  };
  if (story.material === "root") {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      add(ax + sx * 1.15, .055, az + sz * .85, 1.55, .11, .42, "#756747", "wood");
      add(ax + sx * 1.15, .115, az + sz * .85, 1.28, .05, .28, "#4c5740");
    }
  } else if (story.material === "iron") {
    for (const z of [-1.15, 0, 1.15]) add(ax, .035, az + z, 3.5, .07, .09, "#876a4c");
    for (const x of [-1.5, 1.5]) add(ax + x, .045, az, .09, .09, 2.5, "#5f5956");
  } else {
    for (const [x, z] of [[-1.2, 0], [1.2, 0], [0, -1.2], [0, 1.2]] as const) {
      add(ax + x, .035, az + z, .72, .07, .72, "#9b927e", "stone");
      add(ax + x * .72, .11, az + z * .72, .11, .22, .11, story.accent, undefined, true);
    }
  }
  return marks;
}
