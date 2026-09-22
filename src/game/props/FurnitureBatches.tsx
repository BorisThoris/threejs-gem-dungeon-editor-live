import { useLayoutEffect, useRef } from "react";
import { Matrix4, Vector3, type InstancedMesh } from "three";

import type { PropPlacement } from "../dungeon/types";
import { DARK_WOOD_LIT, IRON, WOOD_LIT } from "./furnitureStyle";
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

/** Fixed furniture keeps its own two materials, but every copy of the same
 * material and shape in a room can share one submission. The geometry cache
 * still belongs to the whole game; the instance matrices belong to the room. */
const PARTS: readonly Part[] = [
  { key: "barrel-staves", kind: "barrel", geometry: () => geo("cylinder", 0.42, 0.38, 1.1, 10),
    material: () => mat({ color: WOOD_LIT, roughness: 0.85, surface: "wood" }), at: [0, 0.55, 0] },
  { key: "barrel-hoops", kind: "barrel", geometry: () => geo("barrel-hoops"),
    material: () => mat({ color: IRON, metalness: 0.7, roughness: 0.55 }) },
  { key: "chair-wood", kind: "chair", geometry: () => geo("chair-wood"),
    material: () => mat({ color: WOOD_LIT, surface: "wood" }) },
  { key: "chair-legs", kind: "chair", geometry: () => geo("chair-legs"),
    material: () => mat({ color: DARK_WOOD_LIT, surface: "wood" }) },
  { key: "crate-body", kind: "crate", geometry: () => geo("box", 1, 1, 1),
    material: () => mat({ color: WOOD_LIT, roughness: 0.85, surface: "wood" }),
    at: [0, 0.4, 0], size: [0.84, 0.8, 0.84] },
  { key: "crate-slats", kind: "crate", geometry: () => geo("crate-slats"),
    material: () => mat({ color: DARK_WOOD_LIT, roughness: 0.9, surface: "wood" }) },
  { key: "table-top", kind: "table", geometry: () => geo("box", 1, 1, 1),
    material: () => mat({ color: WOOD_LIT, roughness: 0.8, surface: "wood" }),
    at: [0, 0.78, 0], size: [1.8, 0.08, 1] },
  { key: "table-legs", kind: "table", geometry: () => geo("table-legs"),
    material: () => mat({ color: DARK_WOOD_LIT, surface: "wood" }) },
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
