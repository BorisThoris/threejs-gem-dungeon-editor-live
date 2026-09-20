import type { Room } from "../dungeon/types";
import { wallEdges } from "../dungeon/footprint";
import type { Spot } from "./ambient";
import { architectureFor } from "../worldbuilding/structuralPattern";
import { WALL_HEIGHT } from "../world";

/** A full orbit plus the open wings must fit inside the real wall outline. */
export function batFlightRadius(room: Room, at: Spot): number {
  let clearance = Infinity;
  for (const edge of wallEdges(room)) {
    const along = edge.along === "x" ? at.x - edge.x : at.z - edge.z;
    const across = edge.along === "x" ? at.z - edge.z : at.x - edge.x;
    clearance = Math.min(clearance, Math.hypot(across, Math.max(0, Math.abs(along) - edge.length / 2)));
  }
  // Low corbels occupy airspace even though they leave the floor walkable.
  // Trellises and high beams sit above this lower flight band.
  const architecture = architectureFor(room);
  for (const block of [...architecture.structure, ...architecture.detail, ...architecture.marks]) {
    if (block.position[1] - block.size[1] / 2 > WALL_HEIGHT - 1.25) continue;
    const dx = Math.max(0, Math.abs(at.x - block.position[0]) - block.size[0] / 2);
    const dz = Math.max(0, Math.abs(at.z - block.position[2]) - block.size[2] / 2);
    clearance = Math.min(clearance, Math.hypot(dx, dz));
  }
  return Math.max(0, Math.min(2.7, clearance - .65));
}

export function batPose(index: number, now: number, flying: boolean, stirring: boolean, radius: number) {
  const angle = now * 2.7 + index * 1.1;
  const orbit = radius * (.55 + index * .065);
  return flying ? {
    x: Math.cos(angle) * orbit, y: -1.45 + Math.sin(now * 4 + index) * .20,
    z: Math.sin(angle) * orbit, yaw: -angle, roll: 0,
    flap: Math.sin(now * 22 + index) * .7,
  } : {
    x: (index - 3) * .27, y: 0,
    z: 0, yaw: index * .3, roll: Math.PI,
    flap: 1.25 + (stirring ? Math.sin(now * 22 + index) * .15 : 0),
  };
}
