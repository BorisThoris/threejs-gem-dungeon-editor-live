import { useLayoutEffect, useRef } from "react";
import { Matrix4, Vector3, type InstancedMesh } from "three";

import type { PropPlacement } from "../dungeon/types";
import { IRON, WOOD_LIT, type BatchedFurnitureKind } from "./furnitureStyle";
import { geo, mat } from "./shared";

type Part = {
  key: string;
  kind: BatchedFurnitureKind;
  geometry: () => ReturnType<typeof geo>;
  material: () => ReturnType<typeof mat>;
  at?: [number, number, number];
  size?: [number, number, number];
  castShadow?: boolean;
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
  { key: "urn-body", kind: "urn", geometry: () => geo("sphere", 1, 10, 6),
    material: () => mat({ color: "#8a5a44", roughness: 0.7 }), at: [0, 0.6, 0], size: [0.36, 0.36, 0.36] },
  { key: "urn-neck", kind: "urn", geometry: () => geo("cylinder", 0.16, 0.12, 0.26, 8),
    material: () => mat({ color: "#7a4e3a", roughness: 0.7 }), at: [0, 1.02, 0], castShadow: false },
  { key: "urn-foot", kind: "urn", geometry: () => geo("cylinder", 0.2, 0.24, 0.24, 8),
    material: () => mat({ color: "#7a4e3a", roughness: 0.75 }), at: [0, 0.12, 0], castShadow: false },
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
  return <instancedMesh ref={mesh} name={`furniture-${part.key}`} castShadow={part.castShadow !== false}
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
