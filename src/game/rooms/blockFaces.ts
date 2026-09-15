import type { CorridorBlock } from "./corridorPattern";

type Vec = [number, number, number];
export interface BlockFace { position: Vec; u: Vec; v: Vec; normal: Vec }
const turn = ([x, y, z]: Vec, angle: number): Vec => [x * Math.cos(angle) + z * Math.sin(angle), y, z * Math.cos(angle) - x * Math.sin(angle)];

/** The original cube's six UV-oriented faces, with wholly buried faces omitted.
 * Testing all four corners just outside a face against one convex box is
 * conservative: partial coverage and coplanar outer faces are retained. */
export function blockFaces(blocks: readonly CorridorBlock[], occluders: readonly CorridorBlock[] = blocks): BlockFace[] {
  const faces: BlockFace[] = [];
  for (const block of blocks) {
    const [x, y, z] = block.size, yaw = block.rotationY ?? 0;
    const local: [Vec, Vec, Vec][] = [
      [[1, 0, 0], [0, 0, -z], [0, y, 0]], [[-1, 0, 0], [0, 0, z], [0, y, 0]],
      [[0, 1, 0], [x, 0, 0], [0, 0, -z]], [[0, -1, 0], [x, 0, 0], [0, 0, z]],
      [[0, 0, 1], [x, 0, 0], [0, y, 0]], [[0, 0, -1], [-x, 0, 0], [0, y, 0]],
    ];
    for (const [axis, along, up] of local) {
      const offset = turn([axis[0] * x / 2, axis[1] * y / 2, axis[2] * z / 2], yaw);
      const position = block.position.map((value, i) => value + offset[i]) as Vec;
      const normal = turn(axis, yaw), u = turn(along, yaw), v = turn(up, yaw);
      const hidden = occluders.some(other => other !== block && [-0.5, 0.5].every(a => [-0.5, 0.5].every(b => {
        const point = position.map((value, i) => value + a * u[i] + b * v[i] + normal[i] * 1e-5 - other.position[i]) as Vec;
        const localPoint = turn(point, -(other.rotationY ?? 0));
        return localPoint.every((value, i) => Math.abs(value) <= other.size[i] / 2 + 1e-8);
      })));
      if (!hidden) faces.push({ position, u, v, normal });
    }
  }
  return faces;
}
