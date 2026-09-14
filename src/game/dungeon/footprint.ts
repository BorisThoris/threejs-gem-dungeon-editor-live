import { DIRS, halfSize, type Dir, type Room } from "./types";

export interface FloorRect { x: number; z: number; width: number; depth: number }
export interface WallEdge { x: number; z: number; length: number; along: "x" | "z"; dir: Dir }
/** Wide enough to dodge and pass a pursuer; furniture stays in the chamber. */
export const CORRIDOR_WIDTH = 7;

export const doorReach = (room: Room, dir: Dir): number => halfSize(room) + (room.wings?.[dir] ?? 0);

/** A connected union: every wing overlaps the chamber along its full width. */
export function floorRects(room: Room): FloorRect[] {
  const half = halfSize(room);
  const rects: FloorRect[] = [{ x: 0, z: 0, width: room.size, depth: room.size }];
  for (const dir of DIRS) {
    const length = room.wings?.[dir] ?? 0;
    if (length <= 0) continue;
    const vertical = dir === "north" || dir === "south";
    const sign = dir === "north" || dir === "west" ? -1 : 1;
    const offset = sign * (half + length / 2);
    rects.push({ x: vertical ? 0 : offset, z: vertical ? offset : 0,
      width: vertical ? CORRIDOR_WIDTH : length, depth: vertical ? length : CORRIDOR_WIDTH });
  }
  return rects;
}

/** The real concave outline, shared by meshes, collisions and geometry checks. */
export function wallEdges(room: Room): WallEdge[] {
  const half = halfSize(room);
  const c = CORRIDOR_WIDTH / 2;
  const edges: WallEdge[] = [];
  for (const dir of DIRS) {
    const along = dir === "north" || dir === "south" ? "x" : "z";
    const sign = dir === "north" || dir === "west" ? -1 : 1;
    const length = room.wings?.[dir] ?? 0;
    const edge = (a: number, offset: number, len: number, axis: "x" | "z", facing: Dir) => {
      edges.push({ x: axis === "x" ? a : offset, z: axis === "x" ? offset : a, length: len, along: axis, dir: facing });
    };
    if (!length) { edge(0, sign * half, room.size, along, dir); continue; }
    for (const side of [-1, 1]) {
      edge(side * (half + c) / 2, sign * half, half - c, along, dir);
      const facing = along === "x" ? (side < 0 ? "west" : "east") : (side < 0 ? "north" : "south");
      edge(sign * (half + length / 2), side * c, length, along === "x" ? "z" : "x", facing);
    }
    edge(0, sign * (half + length), CORRIDOR_WIDTH, along, dir);
  }
  return edges;
}

export function insideRoom(room: Room, x: number, z: number, margin = 0): boolean {
  const half = halfSize(room);
  if (Math.abs(x) <= half - margin && Math.abs(z) <= half - margin) return true;
  // Extend each corridor into the chamber so an inset never creates a seam.
  return DIRS.some((dir) => {
    if (!room.wings?.[dir]) return false;
    const vertical = dir === "north" || dir === "south";
    const along = (vertical ? z : x) * (dir === "north" || dir === "west" ? -1 : 1);
    return along >= 0 && along <= doorReach(room, dir) - margin && Math.abs(vertical ? x : z) <= CORRIDOR_WIDTH / 2 - margin;
  });
}

/** Clip a movement segment against the union of inset floor rectangles. */
export function roomSegmentClear(room: Room, x: number, z: number, tx: number, tz: number, margin = 0): boolean {
  if (![x, z, tx, tz].every(Number.isFinite)) return false;
  const half = halfSize(room) - margin;
  const bounds = [[-half, half, -half, half]];
  for (const dir of DIRS) {
    if (!room.wings?.[dir]) continue;
    const reach = doorReach(room, dir) - margin, c = CORRIDOR_WIDTH / 2 - margin;
    bounds.push(dir === "north" ? [-c, c, -reach, 0] : dir === "south" ? [-c, c, 0, reach]
      : dir === "west" ? [-reach, 0, -c, c] : [0, reach, -c, c]);
  }
  const intervals: [number, number][] = [];
  for (const [left, right, top, bottom] of bounds) {
    let start = 0, end = 1;
    for (const [from, delta, low, high] of [[x, tx - x, left, right], [z, tz - z, top, bottom]]) {
      if (delta === 0) { if (from < low || from > high) end = -1; }
      else {
        const a = (low - from) / delta, b = (high - from) / delta;
        start = Math.max(start, Math.min(a, b));
        end = Math.min(end, Math.max(a, b));
      }
    }
    if (start <= end) intervals.push([start, end]);
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let covered = 0;
  for (const [start, end] of intervals) {
    if (start > covered + 1e-9) return false;
    covered = Math.max(covered, end);
    if (covered >= 1) return true;
  }
  return false;
}

/** Route through a corridor mouth before turning into an off-axis destination. */
export function roomWaypoint(room: Room, x: number, z: number, tx: number, tz: number, margin = 0.6): { x: number; z: number } {
  if (roomSegmentClear(room, x, z, tx, tz, margin)) return { x: tx, z: tz };
  const half = halfSize(room) - margin;
  const mouth = (px: number, pz: number) => {
    if (Math.abs(px) > half) return { x: Math.sign(px) * (half - 0.05), z: 0 };
    if (Math.abs(pz) > half) return { x: 0, z: Math.sign(pz) * (half - 0.05) };
    return null;
  };
  return mouth(x, z) ?? mouth(tx, tz) ?? { x: tx, z: tz };
}

/** Slide along a wall without cutting through a concave corner. */
export function roomStep(room: Room, x: number, z: number, dx: number, dz: number, margin = 0.6): [number, number] {
  if (roomSegmentClear(room, x, z, x + dx, z + dz, margin)) return [x + dx, z + dz];
  if (roomSegmentClear(room, x, z, x + dx, z, margin)) return [x + dx, z];
  if (roomSegmentClear(room, x, z, x, z + dz, margin)) return [x, z + dz];
  return [x, z];
}
