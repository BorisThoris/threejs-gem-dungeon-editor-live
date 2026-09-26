import { insideRoom, roomSegmentClear, wallEdges } from "../dungeon/footprint";
import type { PropPlacement, Room } from "../dungeon/types";
import { PROP_SPECS, colliderFootprintRadius } from "../props/specs";

/** Whether a prop's real horizontal collider fits the shared floor outline. */
export function propColliderFitsRoom(room: Room, placement: PropPlacement): boolean {
  const collider = PROP_SPECS[placement.kind].collider;
  if (!collider) return true;
  const scale = Math.abs(placement.scale ?? 1);
  const radius = colliderFootprintRadius(collider) * scale;
  if (insideRoom(room, placement.x, placement.z, radius)) return true;
  if (collider.shape === "cylinder" || !insideRoom(room, placement.x, placement.z)) return false;

  const halfX = collider.args[0] * scale;
  const halfZ = collider.args[2] * scale;
  const turn = placement.rotation ?? 0;
  const cosine = Math.cos(turn);
  const sine = Math.sin(turn);
  const local = (x: number, z: number) => ({
    x: (x - placement.x) * cosine - (z - placement.z) * sine,
    z: (x - placement.x) * sine + (z - placement.z) * cosine,
  });
  const corners = ([[-halfX, -halfZ], [halfX, -halfZ], [halfX, halfZ], [-halfX, halfZ]] as const)
    .map(([x, z]) => ({ x: placement.x + x * cosine + z * sine,
      z: placement.z - x * sine + z * cosine }));
  if (corners.some((point) => !insideRoom(room, point.x, point.z))) return false;
  if (corners.some((point, i) => {
    const next = corners[(i + 1) % corners.length];
    return !roomSegmentClear(room, point.x, point.z, next.x, next.z);
  })) return false;
  // An inner wall wholly covered by the box may not cross its perimeter.
  return wallEdges(room).every((edge) => {
    for (const sign of [-1, 1]) {
      const x = edge.x + (edge.along === "x" ? sign * edge.length / 2 : 0);
      const z = edge.z + (edge.along === "z" ? sign * edge.length / 2 : 0);
      const point = local(x, z);
      if (Math.abs(point.x) < halfX - 1e-6 && Math.abs(point.z) < halfZ - 1e-6) return false;
    }
    return true;
  });
}
