import { insideRoom } from "../dungeon/footprint";
import { halfSize, ringCoreWidth, type Room } from "../dungeon/types";
import type { DistrictId } from "../rooms/districts";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { GROUND_Y } from "../world";

export const LANDMARKS = {
  rootwell: { title: "Rootwater knot", district: "gardens", color: "#5f5544", accent: "#8aa273" },
  hoist: { title: "Chain hoist", district: "works", color: "#5b514b", accent: "#ad8057" },
  cantor: { title: "Cantor's resonator", district: "tombs", color: "#746d61", accent: "#b5a47f" },
} as const;
export type LandmarkId = keyof typeof LANDMARKS;

const FOR_DISTRICT: Record<DistrictId, LandmarkId> = {
  gardens: "rootwell",
  works: "hoist",
  tombs: "cantor",
};

/** Give every connected district one memorable room, preferring a broad,
 * ordinary junction over a puzzle or the stairs. Selection depends only on
 * generated geography, so revisiting and replaying a seed preserve it. */
export function assignDistrictLandmarks(rooms: Room[], avoid: readonly string[] = []): void {
  const avoided = new Set(avoid);
  const byId = new Map(rooms.map(room => [room.id, room]));
  for (const room of rooms) delete room.landmark;
  for (const district of Object.keys(FOR_DISTRICT) as DistrictId[]) {
    let candidates = rooms.filter(room => room.district === district && room.kind !== "secret");
    // The landmark that begins a hidden-history route must be reachable from
    // its cracked wall without crossing a locked vault, the exit, or another
    // district. Select from that safe component rather than shortening the
    // route later through geography that tells a different story.
    const host = candidates.find(room => room.secret);
    if (host) {
      const reachable = new Set([host.id]), queue = [host.id];
      for (const id of queue) {
        const room = byId.get(id);
        for (const next of Object.values(room?.links ?? {})) {
          const destination = next ? byId.get(next) : undefined;
          if (!next || reachable.has(next) || avoided.has(next) || destination?.district !== district) continue;
          reachable.add(next); queue.push(next);
        }
      }
      candidates = candidates.filter(room => reachable.has(room.id));
    }
    candidates.sort((a, b) => {
      const score = (room: Room) =>
        (room.kind === "normal" ? 40 : room.kind === "treasure" || room.kind === "library" ? 20 : 0)
        + (room.kind !== "start" && room.kind !== "end" ? 12 : 0)
        + Object.keys(room.links).length * 4 + room.size / 4
        // The landmark should begin a discovery, not sit on its answer.
        - (room.secret || avoided.has(room.id) ? 1000 : 0);
      return score(b) - score(a) || a.id.localeCompare(b.id);
    });
    if (candidates[0]) candidates[0].landmark = FOR_DISTRICT[district];
  }
}

export interface LandmarkPattern {
  id: LandmarkId;
  title: string;
  color: string;
  accent: string;
  structure: CorridorBlock[];
  marks: CorridorBlock[];
}

/** Block-cut monuments kept within the true footprint. Floor marks are paint
 * depth; hanging pieces stay above doorway clearance and need no collider. */
export function landmarkPattern(room: Room): LandmarkPattern | null {
  if (!room.landmark) return null;
  const identity = LANDMARKS[room.landmark];
  const structure: CorridorBlock[] = [], marks: CorridorBlock[] = [];
  // Ring chambers turn the sealed core into the landmark's plinth. Shift the
  // existing district signature onto the north service walk instead of
  // silently clipping every piece that crosses the machinery void.
  const originZ = room.shape === "ring" ? -(halfSize(room) + ringCoreWidth(room.size) / 2) / 2 : 0;
  const add = (into: CorridorBlock[], x: number, y: number, z: number, w: number, h: number, d: number) => {
    z += originZ;
    const inset = 0.04;
    const fits = [[-1, -1], [-1, 1], [1, -1], [1, 1]].every(([sx, sz]) =>
      insideRoom(room, x + sx * w / 2, z + sz * d / 2, inset));
    if (fits) into.push({ position: [x, GROUND_Y + y, z], size: [w, h, d] });
  };
  const floor = (x: number, z: number, w: number, d: number) => add(marks, x, 0.018, z, w, 0.036, d);

  if (room.landmark === "rootwell") {
    for (const sign of [-1, 1]) {
      floor(sign * 2.5, 0, 2.2, 0.28); floor(0, sign * 2.5, 0.28, 2.2);
      add(structure, sign * 2.35, 4.08, 0, 0.22, 1.2, 0.22);
      add(structure, 0, 4.05, sign * 2.35, 0.22, 1.25, 0.22);
    }
    add(structure, 0, 4.52, 0, 6.2, 0.25, 0.32);
    add(structure, 0, 4.38, 0, 0.32, 0.25, 6.2);
  } else if (room.landmark === "hoist") {
    for (const sign of [-1, 1]) {
      floor(sign * 2.25, 0, 0.18, 6.4);
      add(structure, sign * 2.25, 4.45, 0, 0.24, 0.28, 6.4);
      add(structure, sign * 1.05, 4.02, 0, 0.13, 1.1, 0.13);
    }
    add(structure, 0, 4.5, 0, 5.4, 0.32, 0.4);
    add(structure, 0, 3.54, 0, 2.7, 0.18, 0.32);
  } else {
    for (const z of [-3, -1.5, 0, 1.5, 3]) floor(0, z, 4.4 - Math.abs(z) * 0.35, 0.22);
    add(structure, 0, 4.5, 0, 5.8, 0.28, 0.36);
    for (const x of [-2, -1, 0, 1, 2])
      add(structure, x, 4.02 + Math.abs(x) * 0.04, 0, 0.2, 1.1 - Math.abs(x) * 0.08, 0.2);
  }
  return { id: room.landmark, title: identity.title, color: identity.color, accent: identity.accent, structure, marks };
}
