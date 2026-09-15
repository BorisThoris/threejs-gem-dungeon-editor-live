import { floorRects, insideRoom, roomSegmentClear } from "../dungeon/footprint";
import type { Room } from "../dungeon/types";
import type { Patch } from "./steer";

const STEP = 0.5;
interface Field { key: string; left: number; top: number; width: number; height: number; xStep: number; zStep: number; distance: Int32Array }
const fields = new WeakMap<Room, Field[]>();

/** A cached route around groups of obstacles. A local left/right fan alone can
 * oscillate forever between a spike bed and a wall. The field supplies progress;
 * the final movement still uses exact swept clearance. */
export function obstacleWaypoint(room: Room, x: number, z: number, tx: number, tz: number,
  patches: readonly Patch[], berth: number, margin: number): { x: number; z: number } | null {
  const clear = (ax: number, az: number, bx: number, bz: number) => {
    if (!roomSegmentClear(room, ax, az, bx, bz, margin)) return false;
    const dx = bx - ax, dz = bz - az, length = dx * dx + dz * dz;
    return patches.every(p => {
      const r = p.r + (p.berth ?? berth);
      const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / (length || 1)));
      return Math.hypot(ax + t * dx - p.x, az + t * dz - p.z) > r;
    });
  };
  if (clear(x, z, tx, tz)) return { x: tx, z: tz };
  const key = `${Math.round(tx / STEP)},${Math.round(tz / STEP)}:${margin}:${berth}:` +
    patches.map(p => `${p.x},${p.z},${p.r},${p.berth ?? berth}`).join(";");
  const cached = fields.get(room) ?? [];
  let field = cached.find(f => f.key === key);
  if (!field) {
    const rects = floorRects(room);
    const left = Math.min(...rects.map(r => r.x - r.width / 2)) + margin;
    const top = Math.min(...rects.map(r => r.z - r.depth / 2)) + margin;
    const spanX = Math.max(...rects.map(r => r.x + r.width / 2)) - margin - left;
    const width = Math.ceil(spanX / STEP) + 1;
    const spanZ = Math.max(...rects.map(r => r.z + r.depth / 2)) - margin - top;
    const height = Math.ceil(spanZ / STEP) + 1;
    const xStep = spanX / (width - 1), zStep = spanZ / (height - 1);
    const distance = new Int32Array(width * height).fill(-1);
    const walkable = new Uint8Array(width * height);
    const queue: number[] = [];
    for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
      const px = left + i * xStep, pz = top + j * zStep, at = j * width + i;
      if (!insideRoom(room, px, pz, margin) || patches.some(p =>
        Math.hypot(px - p.x, pz - p.z) <= p.r + (p.berth ?? berth))) continue;
      walkable[at] = 1;
      // Arriving within touching distance is enough; the player can stand closer
      // to spikes than a wary creature's chosen berth allows.
      if (Math.hypot(px - tx, pz - tz) <= 0.85) { distance[at] = 0; queue.push(at); }
    }
    for (let q = 0; q < queue.length; q++) {
      const at = queue[q], i = at % width, j = Math.floor(at / width);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj, next = nj * width + ni;
        if (ni < 0 || ni >= width || nj < 0 || nj >= height || !walkable[next] || distance[next] >= 0) continue;
        if (!clear(left + i * xStep, top + j * zStep, left + ni * xStep, top + nj * zStep)) continue;
        distance[next] = distance[at] + 1; queue.push(next);
      }
    }
    field = { key, left, top, width, height, xStep, zStep, distance };
    fields.set(room, [field, ...cached].slice(0, 4));
  }
  const ci = Math.round((x - field.left) / field.xStep), cj = Math.round((z - field.top) / field.zStep);
  let best: { x: number; z: number } | null = null, cost = Infinity, remaining = Infinity;
  for (let j = cj - 3; j <= cj + 3; j++) for (let i = ci - 3; i <= ci + 3; i++) {
    if (i < 0 || i >= field.width || j < 0 || j >= field.height) continue;
    const steps = field.distance[j * field.width + i];
    if (steps < 0) continue;
    const px = field.left + i * field.xStep, pz = field.top + j * field.zStep, gap = Math.hypot(px - x, pz - z);
    if (gap < 0.08 || !clear(x, z, px, pz)) continue;
    if (steps < remaining || steps === remaining && gap < cost) {
      cost = gap; remaining = steps; best = { x: px, z: pz };
    }
  }
  // Hazard berth is a preference, unlike a furniture patch's explicit body
  // clearance. In a tight wall passage, relax that preference before giving up;
  // the physical hazard radius and the room walls remain impassable.
  return best ?? (berth > 0.15 ? obstacleWaypoint(room, x, z, tx, tz, patches, 0.15, margin) : null);
}
