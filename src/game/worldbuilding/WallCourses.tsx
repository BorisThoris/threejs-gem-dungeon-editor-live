import { useLayoutEffect, useMemo, useRef } from "react";
import { Object3D, type InstancedMesh, type Texture } from "three";
import type { Room } from "../dungeon/types";
import { DIR_STEP, DIR_YAW } from "../dungeon/types";
import { useSurface } from "../textures/registry";
import { geo } from "../props/shared";
import { wallCoursesFor, type WallCourse } from "./wallCoursePattern";

/** These shallow trims sit within the wall; only their exposed front face is
 * needed. A full cube spent ten extra triangles on each masonry course. */
function CourseFaces({ courses, color, map }: { courses: WallCourse[]; color: string; map: Texture | null }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const pose = new Object3D();
    courses.forEach((b, i) => {
      const axis = DIR_STEP[b.dir], depth = axis.x ? b.size[0] : b.size[2];
      pose.position.set(b.position[0] - axis.x * depth / 2, b.position[1], b.position[2] - axis.z * depth / 2);
      pose.rotation.set(0, DIR_YAW[b.dir], 0);
      pose.scale.set(axis.x ? b.size[2] : b.size[0], b.size[1], 1);
      pose.updateMatrix(); mesh.current!.setMatrixAt(i, pose.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [courses]);
  if (!courses.length) return null;
  return <instancedMesh name="wall-course-faces" ref={mesh} args={[geo("plane", 1, 1), undefined, courses.length]}>
    <meshStandardMaterial color={color} map={map} roughness={0.9} />
  </instancedMesh>;
}

export function WallCourses({ room }: { room: Room }) {
  const data = useMemo(() => wallCoursesFor(room), [room]);
  const surface = useSurface(room.district === "gardens" ? "wood" : room.district === "works" ? "iron" : "stone", 0.5);
  return <group name="wall-courses">
    <CourseFaces courses={data.rails} color={room.district === "gardens" ? "#736449" : room.district === "works" ? "#48433d" : "#827966"} map={surface} />
    <CourseFaces courses={data.caps} color={room.district === "gardens" ? "#98835d" : room.district === "works" ? "#aa7d4a" : "#a3997d"} map={surface} />
  </group>;
}
