import { useLayoutEffect, useRef } from "react";
import { Color, Object3D, type InstancedMesh } from "three";
import type { Room } from "../dungeon/types";
import { geo, mat } from "../props/shared";
import { floorHeightAt } from "../worldbuilding/elevation";
import type { RatHome } from "./ambient";

/** Small dark recesses and chipped lintels mark existing rat homes. Flush
 * painted faces add no obstacles, and every shelter shares one draw call. */
export function RatShelters({ room, homes }: { room: Room; homes: RatHome[] }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const pose = new Object3D(), color = new Color();
    let index = 0;
    for (const { shelter: s } of homes) {
      const floor = floorHeightAt(room, s.x, s.z);
      const face = (across: number, up: number, width: number, height: number, tint: string) => {
        pose.position.set(s.x + Math.cos(s.yaw) * across, floor + up, s.z - Math.sin(s.yaw) * across);
        pose.rotation.set(0, s.yaw, 0); pose.scale.set(width, height, 1); pose.updateMatrix();
        mesh.current!.setMatrixAt(index, pose.matrix); mesh.current!.setColorAt(index++, color.set(tint));
      };
      face(0, 0.13, 0.44, 0.24, "#101410");
      const rim = room.district === "gardens" ? "#68725a" : room.district === "works" ? "#766752" : "#827969";
      face(-0.245, 0.13, 0.05, 0.26, rim); face(0.245, 0.13, 0.05, 0.26, rim);
      face(0, 0.285, 0.54, 0.05, rim);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [room, homes]);
  return <instancedMesh name="rat-shelters" ref={mesh} args={[geo("plane", 1, 1), mat({ color: "#ffffff", basic: true }), homes.length * 4]} />;
}
