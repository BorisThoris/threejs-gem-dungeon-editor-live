import { floorRects, insideRoom } from "../dungeon/footprint";
import type { Room } from "../dungeon/types";
import { createRng } from "../rng";

/** Encoding range for the room's virtual light centroid, including raised lamps. */
export const LIGHT_FIELD_HEIGHT = 16;

/** Sheltered rooms stay readable; ordinary unserviced chambers need a lantern. */
export function isUnlitRoom(room: Room, seed: number): boolean {
  return (room.kind === "normal" || room.kind === "treasure") &&
    createRng(`${seed}:${room.id}:unlit`)() < 0.4;
}

export interface FieldSource {
  x: number; y?: number; z: number; range: number; intensity: number;
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
  // A luminance-weighted incident direction, separate from irradiance so the
  // gameplay sample does not depend on which way a decorative face is turned.
  const incident = new Float32Array(count * 3), direction = new Uint8Array(count * 4);
  const centroid = new Float32Array(count * 3);
  const queue = new Int32Array(count), steps = new Int16Array(count);
  for (let z = 0; z < height; z++) for (let x = 0; x < width; x++)
    open[z * width + x] = +insideRoom(room, minX + (x + 0.5) * cell, minZ + (z + 0.5) * cell);
  return { minX, minZ, cell, width, height, open, data, energy, incident, centroid, direction, queue, steps };
}
export type LightField = ReturnType<typeof createLightField>;

/** Flood only through walkable blocks: ring cores and closed walls stop light.
 * Reuses scratch arrays. Source count affects this 10 Hz CPU pass, never the fragment shader. */
export function updateLightField(f: LightField, sources: readonly FieldSource[]) {
  const { width, height, open, energy, data, incident, centroid, direction, queue, steps, cell } = f;
  energy.fill(0); incident.fill(0); centroid.fill(0);
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
      const value = Math.min(1.6, s.intensity / 14) * Math.pow(falloff, 1.4);
      energy[i * 3] += value * s.r; energy[i * 3 + 1] += value * s.g; energy[i * 3 + 2] += value * s.b;
      const dx = s.x - (f.minX + (i % width + 0.5) * cell);
      const dy = (s.y ?? 2) - 1;
      const dz = s.z - (f.minZ + (Math.floor(i / width) + 0.5) * cell);
      const length = Math.hypot(dx, dy, dz);
      const weight = value * (s.r * 0.2126 + s.g * 0.7152 + s.b * 0.0722);
      centroid[i * 3] += s.x * weight;
      centroid[i * 3 + 1] += (s.y ?? 2) * weight;
      centroid[i * 3 + 2] += s.z * weight;
      if (length > 0.001) {
        incident[i * 3] += dx / length * weight;
        incident[i * 3 + 1] += dy / length * weight;
        incident[i * 3 + 2] += dz / length * weight;
      }
      if (distance + cell >= s.range) continue;
      const nextStep = steps[i] + 1;
      if (i % width > 0) visit(i - 1, nextStep);
      if (i % width < width - 1) visit(i + 1, nextStep);
      if (i >= width) visit(i - width, nextStep);
      if (i < width * (height - 1)) visit(i + width, nextStep);
    }
  }
  const luminance = (at: number) => energy[at * 3] * 0.2126 + energy[at * 3 + 1] * 0.7152 + energy[at * 3 + 2] * 0.0722;
  const encode = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255);
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
    // Wall faces inherit the brightest adjacent floor cell's incident light.
    // This is a bounded first angular moment, not another transport solver.
    let origin = i;
    if (!open[i]) {
      if (i % width > 0 && luminance(i - 1) > luminance(origin)) origin = i - 1;
      if (i % width < width - 1 && luminance(i + 1) > luminance(origin)) origin = i + 1;
      if (i >= width && luminance(i - width) > luminance(origin)) origin = i - width;
      if (i < width * (height - 1) && luminance(i + width) > luminance(origin)) origin = i + width;
    }
    const total = luminance(origin);
    // RGB locates the weighted virtual source; alpha says how directional the
    // light is. Opposing sources cancel the angular moment, producing fill.
    // A position rather than one fixed normal also lights ceiling undersides.
    direction[i * 4] = total > 0 ? encode((centroid[origin * 3] / total - f.minX) / (width * cell)) : 0;
    direction[i * 4 + 1] = total > 0 ? encode(centroid[origin * 3 + 1] / total / LIGHT_FIELD_HEIGHT) : 0;
    direction[i * 4 + 2] = total > 0 ? encode((centroid[origin * 3 + 2] / total - f.minZ) / (height * cell)) : 0;
    direction[i * 4 + 3] = total > 0 ? encode(Math.hypot(incident[origin * 3], incident[origin * 3 + 1], incident[origin * 3 + 2]) / total) : 0;
  }
}

/** Same nearest-cell sample as the material shader. Outside the room is dark. */
export function sampleLightField(f: LightField, x: number, z: number): number {
  const col = Math.floor((x - f.minX) / f.cell), row = Math.floor((z - f.minZ) / f.cell);
  if (col < 0 || row < 0 || col >= f.width || row >= f.height) return 0;
  const i = (row * f.width + col) * 4;
  return Math.min(1, (f.data[i] * 0.2126 + f.data[i + 1] * 0.7152 + f.data[i + 2] * 0.0722) / 255 * 1.6);
}
