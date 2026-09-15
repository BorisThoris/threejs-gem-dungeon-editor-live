import { useLayoutEffect, useMemo, useRef } from "react";
import { Matrix4, Vector3, type InstancedMesh, type Texture } from "three";
import type { Room } from "../dungeon/types";
import { corridorDetails, type CorridorBlock } from "./corridorPattern";
import { geo } from "../props/shared";
import { blockFaces } from "./blockFaces";

interface BlocksProps {
  blocks: CorridorBlock[];
  occluders?: readonly CorridorBlock[];
  color: string;
  glow?: boolean;
  map?: Texture | null;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
}

export function Blocks({ blocks, occluders, color, glow = false, map, emissive, emissiveIntensity = 0.35, roughness = 0.9 }: BlocksProps) {
  const mesh = useRef<InstancedMesh>(null);
  const faces = useMemo(() => blockFaces(blocks, occluders), [blocks, occluders]);
  useLayoutEffect(() => {
    const g = mesh.current;
    if (!g) return;
    const matrix = new Matrix4();
    const u = new Vector3(), v = new Vector3(), normal = new Vector3();
    faces.forEach((face, i) => {
      matrix.makeBasis(u.set(...face.u), v.set(...face.v), normal.set(...face.normal)).setPosition(...face.position);
      g.setMatrixAt(i, matrix);
    });
    g.instanceMatrix.needsUpdate = true;
    g.computeBoundingSphere();
  }, [faces]);
  if (!faces.length) return null;
  return <instancedMesh name="building-blocks" ref={mesh} args={[geo("plane", 1, 1), undefined, faces.length]}>
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
