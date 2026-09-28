import { BufferAttribute, BufferGeometry } from "three";
import type { Vec3 } from "../dungeon/layout";
import type { PropPlacement, Room } from "../dungeon/types";
import { floorHeightAt } from "../worldbuilding/elevation";
import { PROP_SPECS } from "./specs";

const AIRBORNE = new Set(["web", "tile", "spikes", "banner"]);
const SPREAD = 1.8;
/** Above the shared floor and its paint-depth terrain. */
export const CONTACT_SHADOW_LIFT = 0.035;

/** One room batch. Physical footprints own the size and turn; the floor owner
 * supplies height, including a gem standing on a raised gallery landing. */
export function contactShadowGeometry(room: Room, placements: readonly PropPlacement[], extra: readonly Vec3[] = []) {
  const spots = placements.filter(p => !AIRBORNE.has(p.kind)).map(p => {
    const spec = PROP_SPECS[p.kind], collider = spec.collider, scale = Math.abs(p.scale ?? 1) * SPREAD;
    const x = collider ? collider.shape === "cuboid" ? collider.args[0] : collider.args[1] : spec.radius;
    const z = collider ? collider.shape === "cuboid" ? collider.args[2] : collider.args[1] : spec.radius;
    return { x: p.x, z: p.z, halfX: x * scale, halfZ: z * scale, turn: p.rotation ?? 0 };
  });
  for (const at of extra) spots.push({ x: at[0], z: at[2], halfX: 0.55, halfZ: 0.55, turn: 0 });
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  for (const spot of spots) {
    const cosine = Math.cos(spot.turn), sine = Math.sin(spot.turn);
    const point = (u: number, v: number) => {
      const dx = (u * 2 - 1) * spot.halfX, dz = (v * 2 - 1) * spot.halfZ;
      return [spot.x + dx * cosine + dz * sine, spot.z - dx * sine + dz * cosine];
    };
    const centreHeight = floorHeightAt(room, spot.x, spot.z);
    const sloped = [[0, 0], [1, 0], [0, 1], [1, 1]].some(([u, v]) => {
      const [x, z] = point(u, v);
      return Math.abs(floorHeightAt(room, x, z) - centreHeight) > 0.001;
    });
    // A landing-edge pickup's contact crosses the ramp knee. Subdivide only
    // that footprint; ordinary furniture retains a single two-triangle quad.
    const segments = sloped ? 4 : 1, base = position.length / 3;
    for (let row = 0; row <= segments; row++) for (let col = 0; col <= segments; col++) {
      const u = col / segments, v = row / segments, [x, z] = point(u, v);
      position.push(x, floorHeightAt(room, x, z) + CONTACT_SHADOW_LIFT, z); uv.push(u, v);
    }
    for (let row = 0; row < segments; row++) for (let col = 0; col < segments; col++) {
      const a = base + row * (segments + 1) + col, b = a + 1, c = a + segments + 1, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(position), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  geometry.setIndex(index);
  return geometry;
}
