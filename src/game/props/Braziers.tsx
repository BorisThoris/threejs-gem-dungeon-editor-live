import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Matrix4, type InstancedMesh, type PointLight } from "three";

import type { PropPlacement } from "../dungeon/types";
import { geo, mat } from "./shared";

/**
 * Every brazier in the room, as five draw calls instead of twenty-eight.
 *
 * A brazier is seven meshes - three legs, a bowl, its coals and two cones
 * of flame - and every room in the game has four of them, in its corners,
 * because that is where the light comes from. Twenty-eight meshes, and
 * twenty-eight draw calls, before the room has any furniture in it at all:
 * the largest single group in the worst room this project measures, which
 * was at 60 draw calls of a budget of 72 and had become the thing limiting
 * how much a room could hold.
 *
 * They are identical and they never move, which is exactly what an
 * InstancedMesh is for. This is the same argument the colliders already
 * won: a room's props were fifteen rigid bodies that never moved and are
 * now one static body.
 *
 * The lights are not instanced and cannot be - a light is not drawn, it is
 * a uniform - so there is still one per brazier, and they still flicker
 * out of step with each other, which is the whole reason a room lit by
 * fire does not look lit by a lamp.
 */

/** Where the three legs sit under the bowl, and how far each leans. */
const LEGS = [0, 1, 2].map((i) => {
  const a = (i / 3) * Math.PI * 2;
  return {
    x: Math.cos(a) * 0.22,
    z: Math.sin(a) * 0.22,
    tiltX: Math.sin(a) * 0.32,
    tiltZ: -Math.cos(a) * 0.32,
  };
});

const IRON = { color: "#3a3d44", metalness: 0.8, roughness: 0.5 };

/**
 * The parts of a brazier, each one instance per brazier - except the legs,
 * which are three. Ordered bottom to top, which is only for reading.
 */
const PARTS = [
  {
    key: "bowl",
    geometry: () => geo("cylinder", 0.34, 0.18, 0.3, 12, 1, true),
    material: () => mat({ ...IRON, side: 2 }),
    at: [{ x: 0, y: 1.18, z: 0, tiltX: 0, tiltZ: 0 }],
  },
  {
    key: "coals",
    geometry: () => geo("circle", 0.3, 12),
    material: () => mat({ color: "#ff6a1a", emissive: "#ff4d00", emissiveIntensity: 3 }),
    // Lying flat, just inside the bowl's lip.
    at: [{ x: 0, y: 1.26, z: 0, tiltX: -Math.PI / 2, tiltZ: 0 }],
  },
  {
    key: "flame",
    geometry: () => geo("cone", 0.2, 0.6, 8),
    material: () =>
      mat({ color: "#ffb24d", emissive: "#ff7a1a", emissiveIntensity: 2.4, transparent: true, opacity: 0.9 }),
    at: [{ x: 0, y: 1.55, z: 0, tiltX: 0, tiltZ: 0 }],
  },
  {
    key: "core",
    geometry: () => geo("cone", 0.09, 0.42, 6),
    material: () => mat({ color: "#fff1b0", emissive: "#ffd060", emissiveIntensity: 3 }),
    at: [{ x: 0, y: 1.7, z: 0, tiltX: 0, tiltZ: 0 }],
  },
  {
    key: "legs",
    geometry: () => geo("cylinder", 0.025, 0.035, 1.15, 6),
    material: () => mat(IRON),
    at: LEGS.map((l) => ({ x: l.x, y: 0.55, z: l.z, tiltX: l.tiltX, tiltZ: l.tiltZ })),
  },
] as const;

/**
 * Point light intensity is in candela since three r155: a torch at 1 lit
 * nothing and every room read as black. Rooms are lit from their corners,
 * so this is most of the light a player sees by.
 */
const TORCH_INTENSITY = 14;

function Part({
  part,
  places,
}: {
  part: (typeof PARTS)[number];
  places: PropPlacement[];
}) {
  const ref = useRef<InstancedMesh>(null);
  const count = places.length * part.at.length;
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const turn = new Matrix4();
    let i = 0;
    for (const place of places) {
      for (const off of part.at) {
        m.makeRotationX(off.tiltX);
        if (off.tiltZ) m.multiply(turn.makeRotationZ(off.tiltZ));
        m.setPosition(place.x + off.x, off.y, place.z + off.z);
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [part, places]);
  // Keyed on the count so a room with a different number of braziers gets a
  // fresh mesh rather than one sized for the last room.
  return <instancedMesh key={count} ref={ref} args={[part.geometry(), part.material(), count]} />;
}

/** One flickering light per brazier, out of step with the others. */
function Flame({ at }: { at: PropPlacement }) {
  const light = useRef<PointLight>(null);
  useFrame((state) => {
    if (!light.current) return;
    const t = state.clock.elapsedTime * 11 + at.x * 3 + at.z;
    light.current.intensity = TORCH_INTENSITY * (1 + Math.sin(t) * 0.13 + Math.sin(t * 2.7) * 0.07);
  });
  return (
    <pointLight
      ref={light}
      position={[at.x, 1.8, at.z]}
      color="#ffb86c"
      intensity={TORCH_INTENSITY}
      distance={11}
      decay={1.6}
    />
  );
}

export function Braziers({ places }: { places: PropPlacement[] }) {
  // A stable identity for the list, so the matrices are not rewritten on
  // every render of the room around them.
  const at = useMemo(() => places, [places]);
  if (at.length === 0) return null;
  return (
    <group>
      {PARTS.map((part) => (
        <Part key={part.key} part={part} places={at} />
      ))}
      {at.map((place, i) => (
        <Flame key={i} at={place} />
      ))}
    </group>
  );
}
