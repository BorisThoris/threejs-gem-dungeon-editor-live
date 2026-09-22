import { floorRects, insideRoom } from "../dungeon/footprint";
import type { Room } from "../dungeon/types";
import { createRng } from "../rng";

/** Sheltered rooms stay readable; ordinary unserviced chambers need a lantern. */
export function isUnlitRoom(room: Room, seed: number): boolean {
  return (room.kind === "normal" || room.kind === "treasure") &&
    createRng(`${seed}:${room.id}:unlit`)() < 0.4;
}

export interface FieldSource {
  x: number; z: number; range: number; intensity: number;
  r: number; g: number; b: number;
}

/** One metre blocks, bounded even for unusually large authored passages. */
export function createLightField(room: Room) {
  const rects = floorRects(room);
  const minX = Math.floor(Math.min(...rects.map(r => r.x - r.width / 2))) - 2;
  const minZ = Math.floor(Math.min(...rects.map(r => r.z - r.depth / 2))) - 2;
  const spanX = Math.ceil(Math.max(...rects.map(r => r.x + r.width / 2))) + 2 - minX;
  const spanZ = Math.ceil(Math.max(...rects.map(r => r.z + r.depth / 2))) + 2 - minZ;
  const cell = Math.max(1, Math.ceil(Math.max(spanX, spanZ) / 128));
  const width = Math.ceil(spanX / cell), height = Math.ceil(spanZ / cell), count = width * height;
  const open = new Uint8Array(count), data = new Uint8Array(count * 4);
  const energy = new Float32Array(count * 3);
  const queue = new Int32Array(count), steps = new Int16Array(count);
  for (let z = 0; z < height; z++) for (let x = 0; x < width; x++)
    open[z * width + x] = +insideRoom(room, minX + (x + 0.5) * cell, minZ + (z + 0.5) * cell);
  return { minX, minZ, cell, width, height, open, data, energy, queue, steps };
}
export type LightField = ReturnType<typeof createLightField>;

/** Flood only through walkable blocks: ring cores and closed walls stop light.
 * Reuses scratch arrays. Source count affects this 10 Hz CPU pass, never the fragment shader. */
export function updateLightField(f: LightField, sources: readonly FieldSource[]) {
  const { width, height, open, energy, data, queue, steps, cell } = f;
  energy.fill(0);
  for (const s of sources) {
    if (s.intensity <= 0 || s.range <= 0) continue;
    const x = Math.floor((s.x - f.minX) / cell), z = Math.floor((s.z - f.minZ) / cell);
    if (x < 0 || z < 0 || x >= width || z >= height) continue;
    let start = z * width + x;
    // Wall-mounted fixtures may sit in the boundary block: seed the nearest floor block.
    if (!open[start]) {
      let best = Infinity;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, nz = z + dz, i = nz * width + nx;
        if (nx >= 0 && nz >= 0 && nx < width && nz < height && open[i] && dx * dx + dz * dz < best) {
          best = dx * dx + dz * dz; start = i;
        }
      }
      if (!open[start]) continue;
    }
    steps.fill(-1); steps[start] = 0; queue[0] = start;
    let head = 0, tail = 1;
    const visit = (next: number, step: number) => {
      if (open[next] && steps[next] < 0) { steps[next] = step; queue[tail++] = next; }
    };
    while (head < tail) {
      const i = queue[head++], distance = steps[i] * cell;
      const falloff = Math.max(0, 1 - distance / s.range);
      const value = Math.min(1.6, s.intensity / 14) * falloff * falloff;
      energy[i * 3] += value * s.r; energy[i * 3 + 1] += value * s.g; energy[i * 3 + 2] += value * s.b;
      if (distance + cell >= s.range) continue;
      const nextStep = steps[i] + 1;
      if (i % width > 0) visit(i - 1, nextStep);
      if (i % width < width - 1) visit(i + 1, nextStep);
      if (i >= width) visit(i - width, nextStep);
      if (i < width * (height - 1)) visit(i + width, nextStep);
    }
  }
  for (let i = 0; i < open.length; i++) {
    // A single boundary apron lets vertical wall faces read the adjacent floor's light.
    for (let c = 0; c < 3; c++) {
      let value = energy[i * 3 + c];
      if (!open[i]) {
        if (i % width > 0) value = Math.max(value, energy[(i - 1) * 3 + c]);
        if (i % width < width - 1) value = Math.max(value, energy[(i + 1) * 3 + c]);
        if (i >= width) value = Math.max(value, energy[(i - width) * 3 + c]);
        if (i < width * (height - 1)) value = Math.max(value, energy[(i + width) * 3 + c]);
      }
      data[i * 4 + c] = Math.round(Math.min(1, value) * 255);
    }
    data[i * 4 + 3] = 255;
  }
}
