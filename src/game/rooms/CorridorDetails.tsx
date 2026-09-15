import { useLayoutEffect, useMemo, useRef } from "react";
import { Matrix4, Vector3, type InstancedMesh, type Texture } from "three";
import type { Room } from "../dungeon/types";
import { corridorDetails, type CorridorBlock } from "./corridorPattern";
import { geo } from "../props/shared";

interface BlocksProps {
  blocks: CorridorBlock[];
  color: string;
  glow?: boolean;
  map?: Texture | null;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
}

export function Blocks({ blocks, color, glow = false, map, emissive, emissiveIntensity = 0.35, roughness = 0.9 }: BlocksProps) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const g = mesh.current;
    if (!g) return;
    const matrix = new Matrix4();
    const scale = new Vector3();
    blocks.forEach((block, i) => {
      matrix.makeRotationY(block.rotationY ?? 0).scale(scale.set(...block.size)).setPosition(...block.position);
      g.setMatrixAt(i, matrix);
    });
    g.instanceMatrix.needsUpdate = true;
    g.computeBoundingSphere();
  }, [blocks]);
  if (!blocks.length) return null;
  return <instancedMesh name="building-blocks" ref={mesh} args={[geo("box", 1, 1, 1), undefined, blocks.length]}>
    <meshStandardMaterial color={color} map={map} roughness={roughness} emissive={emissive ?? (glow ? color : "#000000")} emissiveIntensity={emissiveIntensity} />
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
