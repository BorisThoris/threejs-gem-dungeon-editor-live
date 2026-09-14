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

/** Slide along a wall without cutting through a concave corner. */
export function roomStep(room: Room, x: number, z: number, dx: number, dz: number, margin = 0.6): [number, number] {
  if (insideRoom(room, x + dx, z + dz, margin)) return [x + dx, z + dz];
  if (insideRoom(room, x + dx, z, margin)) return [x + dx, z];
  if (insideRoom(room, x, z + dz, margin)) return [x, z + dz];
  return [x, z];
}
