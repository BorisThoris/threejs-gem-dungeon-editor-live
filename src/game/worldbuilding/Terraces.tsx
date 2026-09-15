import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry } from "three";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import type { Room } from "../dungeon/types";
import { useSurface } from "../textures/registry";
import { terracesFor, terraceMesh, type Terrace } from "./elevation";
import { PLACE_IDENTITIES, identityFor } from "./identity";

function RaisedLanding({ terrace, color }: { terrace: Terrace; color: string }) {
  const data = useMemo(() => terraceMesh(terrace), [terrace]);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(data.positions, 3));
    g.setIndex(new BufferAttribute(data.indices, 1));
    const uv = new Float32Array(data.positions.length / 3 * 2);
    for (let i = 0; i < data.positions.length / 3; i++) {
      uv[i * 2] = data.positions[i * 3] / 3; uv[i * 2 + 1] = data.positions[i * 3 + 2] / 3;
    }
    g.setAttribute("uv", new BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }, [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const surface = useSurface("stone", 1);
  return <>
    <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={color} map={surface} roughness={0.95} flatShading /></mesh>
    <RigidBody type="fixed" colliders={false}><TrimeshCollider args={[data.positions, data.indices]} /></RigidBody>
  </>;
}

export function Terraces({ room }: { room: Room }) {
  const terraces = useMemo(() => terracesFor(room), [room]);
  const color = PLACE_IDENTITIES[identityFor(room)].structure;
  return <group>{terraces.map(t => <RaisedLanding key={t.dir} terrace={t} color={color} />)}</group>;
}
