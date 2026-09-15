import { useLayoutEffect, useMemo, useRef } from "react";
import { Matrix4, type InstancedMesh, type Texture } from "three";
import type { Room } from "../dungeon/types";
import { corridorDetails, type CorridorBlock } from "./corridorPattern";

export function Blocks({ blocks, color, glow = false, map }: { blocks: CorridorBlock[]; color: string; glow?: boolean; map?: Texture | null }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const g = mesh.current;
    if (!g) return;
    const matrix = new Matrix4();
    blocks.forEach((block, i) => {
      matrix.makeScale(...block.size).setPosition(...block.position);
      g.setMatrixAt(i, matrix);
    });
    g.instanceMatrix.needsUpdate = true;
    g.computeBoundingSphere();
  }, [blocks]);
  if (!blocks.length) return null;
  return <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color={color} map={map} roughness={0.9} emissive={glow ? color : "#000000"} emissiveIntensity={0.35} />
  </instancedMesh>;
}

/** Corridor landmarks in two draw calls, regardless of the number of bays. */
export function CorridorDetails({ room, seed, wall, glow }: { room: Room; seed: number; wall: string; glow: string }) {
  const details = useMemo(() => corridorDetails(room, seed), [room, seed]);
  return <group>
    <Blocks blocks={details.ribs} color={wall} />
    <Blocks blocks={details.marks} color={glow} glow />
  </group>;
}
