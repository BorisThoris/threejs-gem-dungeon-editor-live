import { useLayoutEffect, useRef } from "react";
import { Matrix4, Vector3, type InstancedMesh } from "three";
import type { Room } from "../dungeon/types";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { geo } from "../props/shared";
import { useSurface } from "../textures/registry";
import { channelSediment } from "./channelSediment";

/** The old watercourse leaves a readable bed when drained. Paint-depth silt
 * needs only its top face; the bronze surround already describes its edge. */
export function ChannelBed({ room, blocks }: { room: Room; blocks: readonly CorridorBlock[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const sediment = channelSediment(room);
  const map = useSurface(sediment.surface, 0.5);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4(), size = new Vector3();
    blocks.forEach((b, i) => {
      matrix.makeRotationX(-Math.PI / 2).scale(size.set(b.size[0], b.size[2], 1))
        .setPosition(b.position[0], b.position[1] + b.size[1] / 2, b.position[2]);
      mesh.current!.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [blocks]);
  if (!blocks.length) return null;
  return <instancedMesh name="channel-sediment" ref={mesh} args={[geo("plane", 1, 1), undefined, blocks.length]}>
    <meshStandardMaterial color={sediment.color}
      map={map} roughness={1} customProgramCacheKey={() => "channel-sediment-v1"}
      onBeforeCompile={shader => {
        shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>",
          "#include <project_vertex>\n#ifdef USE_MAP\nvec2 bedXZ = (instanceMatrix * vec4(position, 1.0)).xz;\nvMapUv = (mapTransform * vec3(bedXZ.x * 0.5, -bedXZ.y * 0.5, 1.0)).xy;\n#endif");
      }} />
  </instancedMesh>;
}
