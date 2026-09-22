import { type Dir, type Room } from "../dungeon/types";
import { insideRoom } from "../dungeon/footprint";
import { floorHeightAt } from "./elevation";
import { shrineAnchor } from "../rooms/anchors";
import { secretStoryFor } from "../dungeon/secret";

export interface SecretHistoryMark {
  position: [number, number, number];
  size: [number, number, number];
  colour: string;
  surface?: "stone" | "wood";
  emissive?: boolean;
  role: "reward" | "entrance";
}

/** Low, non-blocking remnants arranged around the reward's reserved anchor. */
export function secretHistoryMarks(room: Room, seed: number, entrance: Dir | null = null): SecretHistoryMark[] {
  const story = secretStoryFor(room, seed), [ax, , az] = shrineAnchor(room);
  const marks: SecretHistoryMark[] = [];
  const add = (x: number, y: number, z: number, w: number, h: number, d: number,
    colour: string, surface?: "stone" | "wood", emissive?: boolean,
    role: SecretHistoryMark["role"] = "reward") => {
    if (insideRoom(room, x, z, Math.hypot(w, d) / 2 + .12))
      marks.push({ position: [x, floorHeightAt(room, x, z) + y, z], size: [w, h, d], colour, surface, emissive, role });
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
  if (entrance) {
    const dx = entrance === "east" ? 1 : entrance === "west" ? -1 : 0;
    const dz = entrance === "south" ? 1 : entrance === "north" ? -1 : 0;
    const reach = room.size / 2;
    // Paired worn cuts flank the walking line from the actual broken wall.
    // They stop outside the reward's clear approach and clip to shaped floors.
    for (let inward = 1.8; inward <= Math.min(reach - 2.4, 7.2); inward += 1.35) {
      for (const side of [-1, 1]) {
        const x = dx * (reach - inward) + dz * side * .72;
        const z = dz * (reach - inward) - dx * side * .72;
        if (story.material === "root")
          add(x, .034, z, dx ? .52 : .13, .055, dz ? .52 : .13, "#756747", "wood", false, "entrance");
        else if (story.material === "iron")
          add(x, .03, z, dx ? .12 : .38, .06, dz ? .12 : .38, "#876a4c", undefined, false, "entrance");
        else
          add(x, .03, z, .35, .06, .35, "#9b927e", "stone", false, "entrance");
      }
    }
  }
  return marks;
}
