import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, type Texture } from "three";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import type { Room } from "../dungeon/types";
import { terracesFor, terraceMesh, type Terrace } from "./elevation";

function RaisedLanding({ terrace, color, map }: { terrace: Terrace; color: string; map: Texture }) {
  const data = useMemo(() => terraceMesh(terrace), [terrace]);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(data.positions, 3));
    g.setIndex(new BufferAttribute(data.indices, 1));
    const uv = new Float32Array(data.positions.length / 3 * 2);
    for (let i = 0; i < data.positions.length / 3; i++) {
      uv[i * 2] = data.positions[i * 3] / 4; uv[i * 2 + 1] = -data.positions[i * 3 + 2] / 4;
    }
    g.setAttribute("uv", new BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }, [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh name={`raised-floor-${terrace.dir}`} geometry={geometry} receiveShadow><meshStandardMaterial color={color} map={map} roughness={0.95} flatShading /></mesh>
    <RigidBody type="fixed" colliders={false}><TrimeshCollider args={[data.positions, data.indices]} /></RigidBody>
  </>;
}

export function Terraces({ room, color, map }: { room: Room; color: string; map: Texture }) {
  const terraces = useMemo(() => terracesFor(room), [room]);
  return <group>{terraces.map(t => <RaisedLanding key={t.dir} terrace={t} color={color} map={map} />)}</group>;
}
