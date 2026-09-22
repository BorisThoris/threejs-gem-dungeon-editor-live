import { DIR_STEP, type Dir, type Room } from "../dungeon/types";
import { doorReach, insideRoom } from "../dungeon/footprint";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { DOOR_HEIGHT, GROUND_Y } from "../world";

const FRAMES = {
  gardens: { name: "Rootwash comb", description: "A trellis comb marks where the growing channel was tended." },
  works: { name: "Settling screen", description: "Iron tabs count each stretch of the old settling run." },
  tombs: { name: "Last-water tally", description: "Cut stone marks the water the choir carried below." },
} as const;

export interface ChannelFrameSite { dir: Dir; x: number; z: number; width: number; name: string; description: string }

/** One overhead crossing on the true directed channel, inside the room's
 * footprint and above full doorway clearance. Its blocks join Architecture's
 * three existing batches; no post obstructs the wet walking line. */
export function channelFrameFor(room: Room): { site: ChannelFrameSite; structure: CorridorBlock[]; detail: CorridorBlock[]; marks: CorridorBlock[] } | null {
  const dir = room.waterway?.downstream ?? room.waterway?.upstream;
  if (!dir || !room.links[dir] || !room.district) return null;
  const axis = DIR_STEP[dir], along = Math.min(2.8, doorReach(room, dir) - 1.3);
  const point = (across: number): [number, number] => axis.x ? [axis.x * along, across] : [across, axis.z * along];
  const width = [2.4, 1.8].find(span => [-span / 2, span / 2].every(across =>
    [-0.24, 0.24].every(depth => {
      const x = axis.x ? axis.x * (along + depth) : across;
      const z = axis.z ? axis.z * (along + depth) : across;
      return insideRoom(room, x, z, 0.12);
    })));
  if (!width) return null;
  const [x, z] = point(0), definition = FRAMES[room.district];
  const structure: CorridorBlock[] = [], detail: CorridorBlock[] = [], marks: CorridorBlock[] = [];
  const block = (into: CorridorBlock[], across: number, y: number, spanAcross: number, height: number, depth: number) => {
    const [bx, bz] = point(across);
    into.push({ position: [bx, GROUND_Y + y, bz],
      size: axis.x ? [depth, height, spanAcross] : [spanAcross, height, depth] });
  };
  block(structure, 0, DOOR_HEIGHT + 0.72, width, 0.24, 0.3);
  if (room.district === "gardens") {
    for (const side of [-1, 1]) {
      block(detail, side * width * 0.32, DOOR_HEIGHT + 0.5, 0.2, 0.32, 0.24);
      block(marks, side * width * 0.32, DOOR_HEIGHT + 0.46, 0.3, 0.08, 0.35);
    }
  } else if (room.district === "works") {
    for (const side of [-0.3, 0, 0.3])
      block(detail, side * width, DOOR_HEIGHT + 0.5, 0.16, 0.32, 0.25);
    block(marks, 0, DOOR_HEIGHT + 0.83, 0.42, 0.08, 0.32);
  } else {
    for (const side of [-1, 1]) {
      block(detail, side * width * 0.3, DOOR_HEIGHT + 0.53, 0.36, 0.28, 0.34);
      block(marks, side * width * 0.3, DOOR_HEIGHT + 0.82, 0.18, 0.08, 0.42);
    }
  }
  return { site: { dir, x, z, width, ...definition }, structure, detail, marks };
}
