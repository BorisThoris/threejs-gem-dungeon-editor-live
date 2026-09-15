import type { Room } from "../dungeon/types";
import { wallEdges } from "../dungeon/footprint";
import type { Spot } from "./ambient";

/** A full orbit plus the open wings must fit inside the real wall outline. */
export function batFlightRadius(room: Room, at: Spot): number {
  let clearance = Infinity;
  for (const edge of wallEdges(room)) {
    const along = edge.along === "x" ? at.x - edge.x : at.z - edge.z;
    const across = edge.along === "x" ? at.z - edge.z : at.x - edge.x;
    clearance = Math.min(clearance, Math.hypot(across, Math.max(0, Math.abs(along) - edge.length / 2)));
  }
  return Math.max(0, Math.min(2.7, clearance - .65));
}

export function batPose(index: number, now: number, flying: boolean, stirring: boolean, radius: number) {
  const angle = now * 2.7 + index * 1.1;
  const orbit = radius * (.55 + index * .065);
  return flying ? {
    x: Math.cos(angle) * orbit, y: -.65 + Math.sin(now * 4 + index) * .25,
    z: Math.sin(angle) * orbit, yaw: -angle, roll: 0,
    flap: Math.sin(now * 22 + index) * .7,
  } : {
    x: Math.cos(index * 2.4) * .65, y: -.12 * (index % 3),
    z: Math.sin(index * 2.4) * .65, yaw: index * 2.4, roll: Math.PI,
    flap: 1.25 + (stirring ? Math.sin(now * 22 + index) * .15 : 0),
  };
}
