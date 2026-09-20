import type { Room } from "../dungeon/types";
import { DIR_STEP } from "../dungeon/types";
import { roomRayReach, wallEdges } from "../dungeon/footprint";
import { terracesFor, floorHeightAt } from "../worldbuilding/elevation";
import { SENTRY_HALF_ANGLE, SENTRY_RANGE } from "../world";

type Point = [number, number];
export const BEAM_LIFT = 0.06;

/** Split at every change of floor plane, so no triangle bridges a ramp knee. */
export function beamProjector(room: Room) {
  const terraces = terracesFor(room);
  const edges = wallEdges(room), cuts: [number, number][] = [];
  const add = (axis: number, value: number) => {
    if (!cuts.some(c => c[0] === axis && c[1] === value)) cuts.push([axis, value]);
  };
  for (const t of terraces) {
    const step = DIR_STEP[t.dir], axis = step.x ? 0 : 1, sign = step.x || step.z;
    // The visibility polygon already follows the gallery's side walls and
    // stepped end. Masonry courses do not change its floor plane: only the
    // ramp entrance and knee do. Extending every course edge across the room
    // subdivided even the flat chamber into hundreds of redundant triangles.
    add(axis, t.start * sign);
    add(axis, t.rampEnd * sign);
  }
  const clip = (polygon: Point[], axis: number, cut: number, sign: number): Point[] => {
    const result: Point[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const da = (a[axis] - cut) * sign, db = (b[axis] - cut) * sign;
      if (da >= 0) result.push(a);
      if (da * db < 0) {
        const t = da / (da - db);
        result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return result;
  };
  return (origin: readonly number[], facing: number, output: number[]) => {
    output.length = 0;
    const boundary: Point[] = [];
    const angles = Array.from({ length: 29 }, (_, i) => -SENTRY_HALF_ANGLE + i / 28 * SENTRY_HALF_ANGLE * 2);
    // Both sides of a corner are needed: visibility can change abruptly there.
    for (const edge of edges) for (const side of [-1, 1]) {
      const x = edge.x + (edge.along === "x" ? side * edge.length / 2 : 0);
      const z = edge.z + (edge.along === "z" ? side * edge.length / 2 : 0);
      const relative = Math.atan2(Math.sin(Math.atan2(x - origin[0], z - origin[2]) - facing),
        Math.cos(Math.atan2(x - origin[0], z - origin[2]) - facing));
      for (const offset of [-1e-7, 0, 1e-7]) if (Math.abs(relative + offset) < SENTRY_HALF_ANGLE) angles.push(relative + offset);
    }
    angles.sort((a, b) => a - b);
    for (const relative of [...new Set(angles)]) {
      const angle = facing + relative;
      const dx = Math.sin(angle), dz = Math.cos(angle);
      const reach = roomRayReach(origin[0], origin[2], dx, dz, SENTRY_RANGE, edges);
      const point: Point = [origin[0] + dx * reach, origin[2] + dz * reach];
      // Collinear hits describe one wall edge; extra fan spokes add no shape.
      boundary.push(point);
      while (boundary.length >= 3) {
        const a = boundary[boundary.length - 3], b = boundary[boundary.length - 2], c = boundary[boundary.length - 1];
        const dx = c[0] - a[0], dz = c[1] - a[1], length = Math.hypot(dx, dz);
        if (length < 1e-10 || Math.abs(dx * (b[1] - a[1]) - dz * (b[0] - a[0])) > length * 1e-9) break;
        const along = (b[0] - a[0]) * dx + (b[1] - a[1]) * dz;
        if (along < 0 || along > length * length) break;
        boundary.splice(boundary.length - 2, 1);
      }
    }
    for (let i = 1; i < boundary.length; i++) {
      const previous = boundary[i - 1], point = boundary[i];
      let polygons: Point[][] = [[[origin[0], origin[2]], previous, point]];
      for (const [axis, cut] of cuts) polygons = polygons.flatMap(p => {
        if (!p.some(v => v[axis] < cut - 1e-8) || !p.some(v => v[axis] > cut + 1e-8)) return [p];
        return [clip(p, axis, cut, 1), clip(p, axis, cut, -1)].filter(v => v.length >= 3);
      });
      for (const p of polygons) {
        const cx = p.reduce((sum, v) => sum + v[0], 0) / p.length;
        const cz = p.reduce((sum, v) => sum + v[1], 0) / p.length;
        const y = floorHeightAt(room, cx, cz);
        let sx = 0, sz = 0;
        for (const t of terraces) {
          const axis = DIR_STEP[t.dir], along = cx * axis.x + cz * axis.z;
          const across = (axis.x ? cz : cx) - t.offset;
          if (along >= t.rampEnd || !t.courses.some(c => along >= c.start && along <= c.end && Math.abs(across) <= c.width / 2)) continue;
          sx = axis.x * t.height / (t.rampEnd - t.start);
          sz = axis.z * t.height / (t.rampEnd - t.start);
          break;
        }
        for (let j = 1; j < p.length - 1; j++) for (const v of [p[0], p[j], p[j + 1]])
          output.push(v[0] - origin[0], y + sx * (v[0] - cx) + sz * (v[1] - cz) + BEAM_LIFT - origin[1], v[1] - origin[2]);
      }
    }
  };
}
