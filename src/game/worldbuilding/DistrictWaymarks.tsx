import { useLayoutEffect, useMemo, useRef } from "react";
import { Matrix4, Vector3, type InstancedMesh } from "three";
import type { Room } from "../dungeon/types";
import { geo, mat } from "../props/shared";
import { DISTRICT_WAY_COLORS, districtWaysFor, type DistrictWayMark } from "./districtWays";

function WayBatch({ marks, color }: { marks: DistrictWayMark[]; color: string }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4(), u = new Vector3(), v = new Vector3(), normal = new Vector3(0, 1, 0);
    marks.forEach((mark, i) => {
      u.set(mark.size[0], 0, 0); v.set(0, 0, -mark.size[1]);
      matrix.makeBasis(u, v, normal).setPosition(...mark.position);
      mesh.current!.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [marks]);
  if (!marks.length) return null;
  return <instancedMesh name="district-waymarks" ref={mesh}
    args={[geo("plane", 1, 1), mat({ color, roughness: 1 }), marks.length]} />;
}

/** Two draw calls turn the room graph into visible, district-owned paths. */
export function DistrictWays({ room }: { room: Room }) {
  const marks = useMemo(() => districtWaysFor(room), [room]);
  if (!room.district) return null;
  const colors = DISTRICT_WAY_COLORS[room.district];
  return <group name={`district-ways-${room.district}`}>
    <WayBatch marks={marks.filter(mark => mark.tone === "base")} color={colors.base} />
    <WayBatch marks={marks.filter(mark => mark.tone === "accent")} color={colors.accent} />
  </group>;
}
