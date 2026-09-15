import { DIRS, DIR_STEP, type Dir, type Room } from "../dungeon/types";
import { GROUND_Y } from "../world";
import { corridorOffset, corridorWidth } from "../dungeon/footprint";

export interface Terrace {
  dir: Dir;
  start: number;
  rampEnd: number;
  end: number;
  width: number;
  offset: number;
  height: number;
}
const cache = new WeakMap<Room, Terrace[]>();

/** Closed side galleries climb to a raised landing. Travel portals and the
 * watercourse retain their shared datum. The entire width is ramped: there is
 * no hidden step or internal cliff for a pursuer to walk through. */
export function terracesFor(room: Room): Terrace[] {
  if (cache.has(room)) return cache.get(room)!;
  const terraces: Terrace[] = [];
  for (const dir of DIRS) {
    const length = room.wings?.[dir] ?? 0;
    if (room.links[dir] || room.secret?.dir === dir || length < 6) continue;
    const width = corridorWidth(room, dir), offset = corridorOffset(room, dir);
    terraces.push({ dir, start: room.size / 2, rampEnd: room.size / 2 + 4,
      end: room.size / 2 + length, width, offset, height: length >= 9 ? 1.2 : 0.8 });
  }
  cache.set(room, terraces);
  return terraces;
}

export function terracePoint(terrace: Terrace, along: number, across: number, y: number): [number, number, number] {
  const axis = DIR_STEP[terrace.dir];
  return [axis.x ? axis.x * along : terrace.offset + across, GROUND_Y + y,
    axis.z ? axis.z * along : terrace.offset + across];
}

/** Single source for the surface under players, props, effects and creatures. */
export function floorHeightAt(room: Room, x: number, z: number): number {
  for (const terrace of terracesFor(room)) {
    const axis = DIR_STEP[terrace.dir];
    const along = x * axis.x + z * axis.z;
    const across = (axis.x ? z : x) - terrace.offset;
    if (along < terrace.start || along > terrace.end || Math.abs(across) > terrace.width / 2) continue;
    return GROUND_Y + terrace.height * Math.min(1, (along - terrace.start) / (terrace.rampEnd - terrace.start));
  }
  return GROUND_Y;
}

export const floorRiseAt = (room: Room, x: number, z: number): number => floorHeightAt(room, x, z) - GROUND_Y;

/** Solid wedge/landing mesh. Rendering and Rapier receive the same vertices. */
export function terraceMesh(terrace: Terrace) {
  const positions: number[] = [], indices: number[] = [];
  for (const [start, end, low, high] of [[terrace.start, terrace.rampEnd, 0, terrace.height],
    [terrace.rampEnd, terrace.end, terrace.height, terrace.height]]) {
    const base = positions.length / 3;
    for (const [along, y] of [[start, low], [end, high], [start, -0.04], [end, -0.04]])
      for (const across of [-terrace.width / 2, terrace.width / 2]) positions.push(...terracePoint(terrace, along, across, y));
    // Each face is wound from its actual coordinates, including west/south.
    const faces = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
    const a = terracePoint(terrace, start, -1, low), b = terracePoint(terrace, start, 1, low), c = terracePoint(terrace, end, 1, high);
    const up = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    for (const face of faces) {
      const [i, j, k, l] = up >= 0 ? face : [...face].reverse();
      indices.push(base + i, base + j, base + k, base + i, base + k, base + l);
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}
