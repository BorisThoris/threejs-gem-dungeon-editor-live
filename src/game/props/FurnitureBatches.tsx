import { useLayoutEffect, useRef } from "react";
import { Matrix4, Vector3, type InstancedMesh } from "three";

import type { PropPlacement } from "../dungeon/types";
import { IRON, WOOD_LIT } from "./furnitureStyle";
import { geo, mat } from "./shared";

type FurnitureKind = "barrel" | "chair" | "crate" | "table";
type Part = {
  key: string;
  kind: FurnitureKind;
  geometry: () => ReturnType<typeof geo>;
  material: () => ReturnType<typeof mat>;
  at?: [number, number, number];
  size?: [number, number, number];
};

/** Fixed wood furniture bakes its two tints into vertex colors and uses one
 * instance draw per kind. Iron barrel hoops keep their separate material. */
const PARTS: readonly Part[] = [
  { key: "barrel-staves", kind: "barrel", geometry: () => geo("cylinder", 0.42, 0.38, 1.1, 10),
    material: () => mat({ color: WOOD_LIT, roughness: 0.85, surface: "wood" }), at: [0, 0.55, 0] },
  { key: "barrel-hoops", kind: "barrel", geometry: () => geo("barrel-hoops"),
    material: () => mat({ color: IRON, metalness: 0.7, roughness: 0.55 }) },
  { key: "finished-chair", kind: "chair", geometry: () => geo("finished-chair"),
    material: () => mat({ color: "#ffffff", roughness: 0.85, surface: "wood", vertexColors: true }) },
  { key: "finished-crate", kind: "crate", geometry: () => geo("finished-crate"),
    material: () => mat({ color: "#ffffff", roughness: 0.85, surface: "wood", vertexColors: true }) },
  { key: "finished-table", kind: "table", geometry: () => geo("finished-table"),
    material: () => mat({ color: "#ffffff", roughness: 0.85, surface: "wood", vertexColors: true }) },
];

function FurniturePart({ part, places }: { part: Part; places: PropPlacement[] }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const base = new Matrix4(), local = new Matrix4(), combined = new Matrix4();
    local.makeScale(...(part.size ?? [1, 1, 1]));
    local.setPosition(...(part.at ?? [0, 0, 0]));
    const scale = new Vector3();
    places.forEach((place, i) => {
      const s = place.scale ?? 1;
      base.makeRotationY(place.rotation ?? 0).scale(scale.set(s, s, s));
      base.setPosition(place.x, 0, place.z);
      target.setMatrixAt(i, combined.multiplyMatrices(base, local));
    });
    target.instanceMatrix.needsUpdate = true;
    target.computeBoundingSphere();
  }, [part, places]);
  return <instancedMesh ref={mesh} name={`furniture-${part.key}`} castShadow
    args={[part.geometry(), part.material(), places.length]} />;
}

/** Room-local batching preserves room culling, breakable removal and the
 * existing independent contact shadows and colliders. */
export function FurnitureBatches({ placements }: { placements: PropPlacement[] }) {
  return <group name="furniture-batches">{PARTS.map(part => {
    const places = placements.filter(place => place.kind === part.kind);
    return places.length ? <FurniturePart key={`${part.key}:${places.length}`} part={part} places={places} /> : null;
  })}</group>;
}
