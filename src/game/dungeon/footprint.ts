import { crossArmWidth, DIRS, halfSize, SHAPE_SIDES, type Dir, type Room } from "./types";

export interface FloorRect { x: number; z: number; width: number; depth: number }
export interface WallEdge { x: number; z: number; length: number; along: "x" | "z"; dir: Dir }
/** Wide enough to dodge and pass a pursuer; furniture stays in the chamber. */
export const CORRIDOR_WIDTH = 7;
export const corridorWidth = (room: Room, dir: Dir): number =>
  Math.min(room.size, Math.max(CORRIDOR_WIDTH, room.wingWidths?.[dir] ?? CORRIDOR_WIDTH));
export const corridorOffset = (room: Room, dir: Dir): number => room.links[dir] ? 0
  : Math.max(-halfSize(room) + corridorWidth(room, dir) / 2,
    Math.min(halfSize(room) - corridorWidth(room, dir) / 2, room.wingOffsets?.[dir] ?? 0));

export const doorReach = (room: Room, dir: Dir): number => halfSize(room) + (room.wings?.[dir] ?? 0);

export interface WingCourse { start: number; end: number; width: number }
export const hasShapedWings = (room: Room): boolean => DIRS.some(dir => room.wingProfiles?.[dir] === "apse" && !room.links[dir]);

/** One-metre masonry courses form a half-round end, preserving the full mouth.
 * Courses are shared by floor, ramp, roof and navigation rather than clipped only visually. */
export function wingCourses(room: Room, dir: Dir): WingCourse[] {
  const start = halfSize(room), end = doorReach(room, dir), width = corridorWidth(room, dir);
  if (end <= start) return [];
  if (room.wingProfiles?.[dir] !== "apse" || room.links[dir]) return [{ start, end, width }];
  const radius = Math.min(width / 2, end - start - 2), shoulder = end - radius;
  const courses: WingCourse[] = [];
  for (let low = start; low < end; low += 1) {
    const into = Math.max(0, low - shoulder);
    const halfWidth = Math.min(width / 2, Math.ceil(Math.sqrt(Math.max(0, radius * radius - into * into)) * 2) / 2);
    courses.push({ start: low, end: Math.min(end, low + 1), width: low <= shoulder ? width : halfWidth * 2 });
  }
  return courses;
}

export function wingWidthAt(room: Room, dir: Dir, along: number): number {
  return Math.max(0, ...wingCourses(room, dir).filter(c => along >= c.start && along <= c.end).map(c => c.width));
}

/** Block-cut polygon courses. The outside rounding preserves authored anchors.
 * Door collars reach the grid's cardinal portals even on pointed rooms. */
function chamberRects(room: Room): FloorRect[] {
  if (room.shape === "square") return [{ x: 0, z: 0, width: room.size, depth: room.size }];
  if (room.shape === "cross") {
    const arm = crossArmWidth(room.size);
    return [{ x: 0, z: 0, width: arm, depth: room.size }, { x: 0, z: 0, width: room.size, depth: arm }];
  }
  const half = halfSize(room), sides = SHAPE_SIDES[room.shape];
  const vertices = Array.from({ length: sides }, (_, i) => ({
    x: half * Math.cos(i * Math.PI * 2 / sides), z: half * Math.sin(i * Math.PI * 2 / sides),
  }));
  const rects: FloorRect[] = [];
  for (let low = -half; low < half; low += 1) {
    const high = Math.min(half, low + 1), xs: number[] = [];
    for (let i = 0; i < sides; i++) {
      const a = vertices[i], b = vertices[(i + 1) % sides];
      if (a.z >= low - 1e-8 && a.z <= high + 1e-8) xs.push(a.x);
      for (const z of [low, high]) if (Math.abs(b.z - a.z) > 1e-8 && z >= Math.min(a.z, b.z) && z <= Math.max(a.z, b.z))
        xs.push(a.x + (b.x - a.x) * (z - a.z) / (b.z - a.z));
    }
    if (!xs.length) continue;
    const left = Math.max(-half, Math.floor(Math.min(...xs) + 1e-8));
    const right = Math.min(half, Math.ceil(Math.max(...xs) - 1e-8));
    if (right > left) rects.push({ x: (left + right) / 2, z: (low + high) / 2, width: right - left, depth: high - low });
  }
  // Closed galleries and secret walls have the same traversable approach as doors.
  for (const dir of DIRS) if (room.links[dir] || room.secret?.dir === dir || room.wings?.[dir]) {
    const vertical = dir === "north" || dir === "south", sign = dir === "north" || dir === "west" ? -1 : 1;
    rects.push({ x: vertical ? corridorOffset(room, dir) : sign * half / 2,
      z: vertical ? sign * half / 2 : corridorOffset(room, dir),
      width: vertical ? corridorWidth(room, dir) : half, depth: vertical ? half : corridorWidth(room, dir) });
  }
  return rects;
}

const floorsCache = new WeakMap<Room, FloorRect[]>();
/** One connected floor union, used by the renderer, map and navigation. */
export function floorRects(room: Room): FloorRect[] {
  const cached = floorsCache.get(room);
  if (cached) return cached;
  const rects: FloorRect[] = chamberRects(room);
  for (const dir of DIRS) {
    const length = room.wings?.[dir] ?? 0;
    if (length <= 0) continue;
    const vertical = dir === "north" || dir === "south";
    const sign = dir === "north" || dir === "west" ? -1 : 1;
    for (const course of wingCourses(room, dir)) {
      const offset = sign * (course.start + course.end) / 2, depth = course.end - course.start;
      rects.push({ x: vertical ? corridorOffset(room, dir) : offset, z: vertical ? offset : corridorOffset(room, dir),
        width: vertical ? course.width : depth, depth: vertical ? depth : course.width });
    }
  }
  floorsCache.set(room, rects);
  return rects;
}

/** The real concave outline, shared by meshes, collisions and geometry checks. */
function squareWallEdges(room: Room): WallEdge[] {
  const half = halfSize(room);
  const edges: WallEdge[] = [];
  for (const dir of DIRS) {
    const width = corridorWidth(room, dir), c = width / 2;
    const shift = corridorOffset(room, dir);
    const along = dir === "north" || dir === "south" ? "x" : "z";
    const sign = dir === "north" || dir === "west" ? -1 : 1;
    const length = room.wings?.[dir] ?? 0;
    const edge = (a: number, offset: number, len: number, axis: "x" | "z", facing: Dir) => {
      edges.push({ x: axis === "x" ? a : offset, z: axis === "x" ? offset : a, length: len, along: axis, dir: facing });
    };
    if (!length) { edge(0, sign * half, room.size, along, dir); continue; }
    for (const side of [-1, 1]) {
      const mouthEdge = shift + side * c;
      edge((side * half + mouthEdge) / 2, sign * half, half - side * mouthEdge, along, dir);
      const facing = along === "x" ? (side < 0 ? "west" : "east") : (side < 0 ? "north" : "south");
      edge(sign * (half + length / 2), mouthEdge, length, along === "x" ? "z" : "x", facing);
    }
    edge(shift, sign * (half + length), width, along, dir);
  }
  return edges;
}

const edgesCache = new WeakMap<Room, WallEdge[]>();
export function wallEdges(room: Room): WallEdge[] {
  const cached = edgesCache.get(room);
  if (cached) return cached;
  if (room.shape === "square" && !hasShapedWings(room)) {
    const result = squareWallEdges(room); edgesCache.set(room, result); return result;
  }
  const rects = floorRects(room);
  const xs = [...new Set(rects.flatMap(r => [r.x - r.width / 2, r.x + r.width / 2]))].sort((a, b) => a - b);
  const zs = [...new Set(rects.flatMap(r => [r.z - r.depth / 2, r.z + r.depth / 2]))].sort((a, b) => a - b);
  const occupied = xs.slice(1).map((right, i) => zs.slice(1).map((bottom, j) => {
    const x = (xs[i] + right) / 2, z = (zs[j] + bottom) / 2;
    return rects.some(r => Math.abs(x - r.x) < r.width / 2 && Math.abs(z - r.z) < r.depth / 2);
  }));
  const lines = new Map<string, { along: "x" | "z"; dir: Dir; offset: number; spans: [number, number][] }>();
  const add = (along: "x" | "z", dir: Dir, offset: number, low: number, high: number) => {
    const key = `${dir}:${offset}`;
    if (!lines.has(key)) lines.set(key, { along, dir, offset, spans: [] });
    lines.get(key)!.spans.push([low, high]);
  };
  occupied.forEach((column, i) => column.forEach((yes, j) => {
    if (!yes) return;
    if (!occupied[i - 1]?.[j]) add("z", "west", xs[i], zs[j], zs[j + 1]);
    if (!occupied[i + 1]?.[j]) add("z", "east", xs[i + 1], zs[j], zs[j + 1]);
    if (!column[j - 1]) add("x", "north", zs[j], xs[i], xs[i + 1]);
    if (!column[j + 1]) add("x", "south", zs[j + 1], xs[i], xs[i + 1]);
  }));
  const edges: WallEdge[] = [];
  for (const { along, dir, offset, spans } of lines.values()) {
    spans.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const span of spans) {
      const prev = merged.at(-1);
      if (prev && span[0] <= prev[1] + 1e-8) prev[1] = Math.max(prev[1], span[1]);
      else merged.push([...span]);
    }
    for (const [low, high] of merged) edges.push({ along, dir, length: high - low,
      x: along === "x" ? (low + high) / 2 : offset, z: along === "x" ? offset : (low + high) / 2 });
  }
  edgesCache.set(room, edges);
  return edges;
}

/** Distance to the first room wall along a unit ray, including concave corners. */
export function roomRayReach(x: number, z: number, dx: number, dz: number, range: number,
  edges: readonly WallEdge[]): number {
  let reach = range;
  for (const edge of edges) {
    const divisor = edge.along === "x" ? dz : dx;
    if (Math.abs(divisor) < 1e-10) continue;
    const distance = (edge.along === "x" ? edge.z - z : edge.x - x) / divisor;
    if (distance < 0 || distance > reach) continue;
    const across = edge.along === "x" ? x + dx * distance - edge.x : z + dz * distance - edge.z;
    if (Math.abs(across) <= edge.length / 2 + 1e-9) reach = distance;
  }
  return reach;
}

export function insideRoom(room: Room, x: number, z: number, margin = 0): boolean {
  if (room.shape !== "square" || hasShapedWings(room)) {
    if (!floorRects(room).some(r => Math.abs(x - r.x) <= r.width / 2 && Math.abs(z - r.z) <= r.depth / 2)) return false;
    return wallEdges(room).every(e => distanceToEdge(x, z, e) >= margin - 1e-8);
  }
  const half = halfSize(room);
  if (Math.abs(x) <= half - margin && Math.abs(z) <= half - margin) return true;
  // Extend each corridor into the chamber so an inset never creates a seam.
  return DIRS.some((dir) => {
    if (!room.wings?.[dir]) return false;
    const vertical = dir === "north" || dir === "south";
    const along = (vertical ? z : x) * (dir === "north" || dir === "west" ? -1 : 1);
    return along >= 0 && along <= doorReach(room, dir) - margin && Math.abs((vertical ? x : z) - corridorOffset(room, dir)) <= corridorWidth(room, dir) / 2 - margin;
  });
}

/** Clip a movement segment against the union of inset floor rectangles. */
export function roomSegmentClear(room: Room, x: number, z: number, tx: number, tz: number, margin = 0): boolean {
  if (![x, z, tx, tz].every(Number.isFinite)) return false;
  if (room.shape !== "square" || hasShapedWings(room)) {
    if (!insideRoom(room, x, z, margin) || !insideRoom(room, tx, tz, margin)) return false;
    const length = Math.hypot(tx - x, tz - z);
    if (length < 1e-9) return true;
    const edges = wallEdges(room);
    if (roomRayReach(x, z, (tx - x) / length, (tz - z) / length, length, edges) < length - 1e-8) return false;
    // Swept disc clearance at every concave corner, not just the endpoints.
    return edges.every(e => {
      for (const sign of [-1, 1]) {
        const ex = e.x + (e.along === "x" ? sign * e.length / 2 : 0);
        const ez = e.z + (e.along === "z" ? sign * e.length / 2 : 0);
        const t = Math.max(0, Math.min(1, ((ex - x) * (tx - x) + (ez - z) * (tz - z)) / (length * length)));
        if (Math.hypot(ex - x - t * (tx - x), ez - z - t * (tz - z)) < margin - 1e-8) return false;
      }
      return true;
    });
  }
  const half = halfSize(room) - margin;
  const bounds = [[-half, half, -half, half]];
  for (const dir of DIRS) {
    if (!room.wings?.[dir]) continue;
    const reach = doorReach(room, dir) - margin, c = corridorWidth(room, dir) / 2 - margin;
    const shift = corridorOffset(room, dir);
    bounds.push(dir === "north" ? [shift - c, shift + c, -reach, 0] : dir === "south" ? [shift - c, shift + c, 0, reach]
      : dir === "west" ? [-reach, 0, shift - c, shift + c] : [0, reach, shift - c, shift + c]);
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
    if (Math.abs(px) > half) return { x: Math.sign(px) * (half - 0.05), z: corridorOffset(room, px < 0 ? "west" : "east") };
    if (Math.abs(pz) > half) return { x: corridorOffset(room, pz < 0 ? "north" : "south"), z: Math.sign(pz) * (half - 0.05) };
    return null;
  };
  return mouth(x, z) ?? mouth(tx, tz) ?? (room.shape === "square" ? { x: tx, z: tz } : { x: 0, z: 0 });
}

function distanceToEdge(x: number, z: number, e: WallEdge): number {
  const across = e.along === "x" ? x - e.x : z - e.z;
  const normal = e.along === "x" ? z - e.z : x - e.x;
  return Math.hypot(Math.max(0, Math.abs(across) - e.length / 2), normal);
}

/** Slide along a wall without cutting through a concave corner. */
export function roomStep(room: Room, x: number, z: number, dx: number, dz: number, margin = 0.6): [number, number] {
  if (roomSegmentClear(room, x, z, x + dx, z + dz, margin)) return [x + dx, z + dz];
  if (roomSegmentClear(room, x, z, x + dx, z, margin)) return [x + dx, z];
  if (roomSegmentClear(room, x, z, x, z + dz, margin)) return [x, z + dz];
  return [x, z];
}
