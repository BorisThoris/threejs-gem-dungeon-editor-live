import { useRef, type ComponentType } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";

import type { PropPlacement } from "../dungeon/types";
import type { PointLight } from "three";

import type { PropKind } from "../dungeon/types";
import { Hazard } from "./Hazard";
import { Braziers } from "./Braziers";
import { geo, mat } from "./shared";
import { PROP_SPECS, type PropSpec } from "./specs";

// The numbers live in specs.ts, which has no React in it: the collider
// body, the lane filters, the editor and the node-side layout check all
// need them and none of them wants a component tree. Re-exported so the
// old import site keeps working.
export type { ColliderSpec, PropSpec } from "./specs";

export interface PropProps {
  position: [number, number, number];
  /** Radians about y. */
  rotation?: number;
  scale?: number;
}

/**
 * The twenty props the rooms are dressed with.
 *
 * Each is plain geometry with an explicit collider where it is solid, so a
 * room can never be held up by an asset and a prop's collision box is never
 * a guess derived from its mesh. Everything the editor needs to know about
 * a prop - its name, its footprint, whether it blocks - is in CATALOG below.
 */

const frame = (p: PropProps) => ({
  position: p.position,
  rotation: [0, p.rotation ?? 0, 0] as [number, number, number],
  scale: p.scale ?? 1,
});

const WOOD = "#6b4a2b";
const DARK_WOOD = "#4a3320";
const IRON = "#8d939c";
const BONE = "#d9d2c0";

function Barrel(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.55, 0]} castShadow geometry={geo("cylinder", 0.42, 0.38, 1.1, 14)} material={mat({ color: WOOD, roughness: 0.85 })} />
      {[0.25, 0.85].map((y) => (
        <mesh key={y} position={[0, y, 0]} geometry={geo("torus", 0.43, 0.03, 6, 20)} material={mat({ color: IRON, metalness: 0.7, roughness: 0.4 })} />
      ))}
    </group>
  );
}

/**
 * A bookshelf, with its books on the outside of it.
 *
 * They were at z = 0.05 in a carcass 0.45 deep, which put every one of them
 * inside the box: three shelves of colour that nothing could see from any
 * angle, in a game whose library stands three of these in a row. It read as
 * a plain brown slab for as long as it has existed. They sit proud of the
 * front face now, which is local +z - the side `facing` in the layouts
 * turns towards the room.
 */
function Bookshelf(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 1.1, 0]} castShadow geometry={geo("box", 1.6, 2.2, 0.45)} material={mat({ color: DARK_WOOD, roughness: 0.9 })} />
      {[0.45, 1.05, 1.65].map((y) => (
        <group key={y}>
          {[-0.5, -0.2, 0.1, 0.4].map((x, i) => (
            <mesh key={i} position={[x, y + 0.18, 0.16]} castShadow geometry={geo("box", 0.22, 0.34, 0.28)} material={mat({ color: ["#8a3b3b", "#3b5f8a", "#6f8a3b", "#8a6f3b"][i] })} />
          ))}
        </group>
      ))}
    </group>
  );
}

function Candle(p: PropProps) {
  const light = useRef<PointLight>(null);
  useFrame((state) => {
    if (light.current) light.current.intensity = 2.5 + Math.sin(state.clock.elapsedTime * 9 + p.position[0]) * 0.4;
  });
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.16, 0]} geometry={geo("cylinder", 0.06, 0.07, 0.32, 10)} material={mat({ color: "#efe6c8" })} />
      <mesh position={[0, 0.38, 0]} geometry={geo("cone", 0.035, 0.11, 8)} material={mat({ color: "#ffb24d", emissive: "#ff9a2e", emissiveIntensity: 2 })} />
      <pointLight ref={light} position={[0, 0.5, 0]} color="#ffb86c" intensity={2.5} distance={4} />
    </group>
  );
}

function Chair(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.45, 0]} castShadow geometry={geo("box", 0.5, 0.06, 0.5)} material={mat({ color: WOOD })} />
      <mesh position={[0, 0.8, -0.22]} castShadow geometry={geo("box", 0.5, 0.7, 0.06)} material={mat({ color: WOOD })} />
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} geometry={geo("box", 0.05, 0.44, 0.05)} material={mat({ color: DARK_WOOD })} />
      ))}
    </group>
  );
}

function Chest(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.3, 0]} castShadow geometry={geo("box", 0.9, 0.6, 0.55)} material={mat({ color: WOOD, roughness: 0.8 })} />
      <mesh position={[0, 0.66, 0]} castShadow geometry={geo("box", 0.92, 0.14, 0.57)} material={mat({ color: DARK_WOOD })} />
      <mesh position={[0, 0.45, 0.29]} geometry={geo("box", 0.12, 0.16, 0.04)} material={mat({ color: "#c8a34a", metalness: 0.8, roughness: 0.3 })} />
    </group>
  );
}

function Crystal(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.5, 0]} castShadow geometry={geo("octahedron", 0.32, 0)} material={mat({ color: "#b9f6ff", emissive: "#4fd3e8", emissiveIntensity: 0.9, roughness: 0.2 })} />
      <pointLight position={[0, 0.6, 0]} color="#7fe3ff" intensity={4} distance={5} />
    </group>
  );
}

function Pillar(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 2.1, 0]} castShadow geometry={geo("cylinder", 0.34, 0.4, 4.2, 12)} material={mat({ color: "#7d7c84", roughness: 0.9 })} />
      <mesh position={[0, 0.12, 0]} geometry={geo("cylinder", 0.55, 0.6, 0.24, 12)} material={mat({ color: "#66656d" })} />
    </group>
  );
}

function Potion(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.16, 0]} geometry={geo("sphere", 0.14, 12, 10)} material={mat({ color: "#63d2ff", emissive: "#2c8fb8", emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })} />
      <mesh position={[0, 0.34, 0]} geometry={geo("cylinder", 0.04, 0.05, 0.14, 8)} material={mat({ color: "#c8b58a" })} />
    </group>
  );
}

function Skull(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.2, 0]} castShadow geometry={geo("sphere", 0.2, 12, 10)} material={mat({ color: BONE, roughness: 0.9 })} />
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.22, 0.17]} geometry={geo("sphere", 0.045, 8, 6)} material={mat({ color: "#1a1417" })} />
      ))}
    </group>
  );
}

function Table(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.78, 0]} castShadow geometry={geo("box", 1.8, 0.08, 1)} material={mat({ color: WOOD, roughness: 0.8 })} />
      {[[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]} geometry={geo("box", 0.08, 0.74, 0.08)} material={mat({ color: DARK_WOOD })} />
      ))}
    </group>
  );
}

function Tile(p: PropProps) {
  return (
    <mesh {...frame(p)} rotation={[-Math.PI / 2, 0, p.rotation ?? 0]} position={[p.position[0], p.position[1] + 0.015, p.position[2]]} geometry={geo("plane", 2, 2)} material={mat({ color: "#7d9179", roughness: 0.6 })} />
  );
}

/**
 * One brazier on its own, for the editor's catalogue of props.
 *
 * What a brazier is made of lives in Braziers.tsx, because a room draws all
 * four of its own as one instanced set - four identical seven-mesh props in
 * every room in the game was the largest group of draw calls there was.
 * This is that same set with one brazier in it, so there is still only one
 * description of what a brazier looks like.
 */
function Torch(p: PropProps) {
  return <Braziers places={[{ kind: "torch", x: p.position[0], z: p.position[2] }]} />;
}

/** An interior wall segment, 3 units long, for authored layouts. */
function Wall(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow geometry={geo("box", 3, 3, 0.4)} material={mat({ color: "#55545c", roughness: 0.95 })} />
    </group>
  );
}

function Web(p: PropProps) {
  return (
    <mesh {...frame(p)} position={[p.position[0], p.position[1] + 1.6, p.position[2]]} geometry={geo("plane", 1.4, 1.4)} material={mat({ basic: true, color: "#dfe3ea", transparent: true, opacity: 0.22, side: 2, depthWrite: false })} />
  );
}

/**
 * A crate: square where the barrel is round.
 *
 * The cheapest new silhouette in the game. A store room dressed in barrels
 * and a store room dressed in crates read as different rooms from the
 * doorway, and neither is more than three boxes.
 */
function Crate(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.4, 0]} castShadow geometry={geo("box", 0.84, 0.8, 0.84)} material={mat({ color: WOOD, roughness: 0.85 })} />
      {/* Slats, so it is not a plain cube at close range. */}
      {[0.12, 0.68].map((y) => (
        <mesh key={y} position={[0, y, 0]} geometry={geo("box", 0.88, 0.1, 0.88)} material={mat({ color: DARK_WOOD, roughness: 0.9 })} />
      ))}
    </group>
  );
}

/**
 * A statue: the one thing in the room taller than the player.
 *
 * Every other furnishing is waist to chest height, so a room reads as a
 * floor with things on it. A figure at head height and above gives the eye
 * something at its own level, which is what a pillar does for the corners
 * and nothing did for the middle of a room.
 */
function Statue(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.16, 0]} castShadow geometry={geo("box", 0.9, 0.32, 0.9)} material={mat({ color: "#5d5c64", roughness: 0.95 })} />
      <mesh position={[0, 1.05, 0]} castShadow geometry={geo("cylinder", 0.22, 0.34, 1.5, 10)} material={mat({ color: "#8c8a92", roughness: 0.9 })} />
      <mesh position={[0, 1.95, 0]} castShadow geometry={geo("sphere", 0.21, 12, 10)} material={mat({ color: "#8c8a92", roughness: 0.9 })} />
      {/* Arms folded across it, which is what makes it read as a figure. */}
      <mesh position={[0, 1.42, 0.16]} rotation={[0.2, 0, 0]} geometry={geo("box", 0.52, 0.14, 0.16)} material={mat({ color: "#7e7c85", roughness: 0.9 })} />
    </group>
  );
}

/** An urn: taller and narrower than a barrel, and fired rather than staved. */
function Urn(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.6, 0]} castShadow geometry={geo("sphere", 0.36, 12, 10)} material={mat({ color: "#8a5a44", roughness: 0.7 })} />
      <mesh position={[0, 1.02, 0]} geometry={geo("cylinder", 0.16, 0.12, 0.26, 10)} material={mat({ color: "#7a4e3a", roughness: 0.7 })} />
      <mesh position={[0, 0.12, 0]} geometry={geo("cylinder", 0.2, 0.24, 0.24, 10)} material={mat({ color: "#7a4e3a", roughness: 0.75 })} />
    </group>
  );
}

/**
 * Rubble: a low pile of broken stone, and nothing to walk into.
 *
 * Not solid on purpose. A room that has been left alone for a long time
 * wants floor clutter, and floor clutter you can trip over is floor clutter
 * that will eventually wedge a player against a wall.
 */
function Rubble(p: PropProps) {
  // Three, not five. Every mesh is a draw call and the worst room in the
  // game is already at 56 of a budget of 72; a pile of rubble is not worth
  // a tenth of that.
  const stones: [number, number, number, number][] = [
    [0, 0.11, 0, 0.22],
    [0.28, 0.08, 0.16, 0.16],
    [-0.24, 0.09, -0.2, 0.18],
  ];
  return (
    <group {...frame(p)}>
      {stones.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[i * 0.7, i * 1.1, i * 0.4]} castShadow geometry={geo("dodecahedron", r, 0)} material={mat({ color: i % 2 ? "#6f6e76" : "#5c5b63", roughness: 0.95 })} />
      ))}
    </group>
  );
}

/**
 * A banner, hanging where nothing else in the game is.
 *
 * Every room is furnished on the floor and lit from its corners, so the
 * wall between waist height and the ceiling is bare in all of them. This
 * hangs there, like the cobweb, and is the only colour in a room that is
 * not fire.
 */
function Banner(p: PropProps) {
  return (
    <group {...frame(p)} position={[p.position[0], p.position[1] + 2.05, p.position[2]]}>
      <mesh castShadow geometry={geo("box", 0.9, 1.7, 0.04)} material={mat({ color: "#7a2f3c", roughness: 0.85 })} />
      {/* The rail it hangs from: the rotation belongs on the mesh, not on
          the geometry, which silently does nothing there. */}
      <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo("cylinder", 0.04, 0.04, 1.05, 6)} material={mat({ color: IRON, metalness: 0.6, roughness: 0.5 })} />
      {/* A device on it, so it is not a rectangle of flat colour. */}
      <mesh position={[0, 0.15, 0.03]} geometry={geo("circle", 0.22, 12)} material={mat({ color: "#d8b45c", roughness: 0.6 })} />
    </group>
  );
}

function Spikes(p: PropProps) {
  return <Hazard position={p.position} />;
}

export type PropInfo = PropSpec & { component: ComponentType<PropProps> };

const COMPONENTS: Record<PropKind, ComponentType<PropProps>> = {
  banner: Banner,
  barrel: Barrel,
  bookshelf: Bookshelf,
  candle: Candle,
  chair: Chair,
  chest: Chest,
  crate: Crate,
  crystal: Crystal,
  pillar: Pillar,
  potion: Potion,
  rubble: Rubble,
  skull: Skull,
  statue: Statue,
  table: Table,
  tile: Tile,
  torch: Torch,
  urn: Urn,
  wall: Wall,
  web: Web,
  spikes: Spikes,
};

/**
 * What each prop is and what draws it, joined. One entry per kind, and the
 * numbers come from exactly one place.
 */
export const CATALOG = Object.fromEntries(
  (Object.keys(PROP_SPECS) as PropKind[]).map((kind) => [
    kind,
    { ...PROP_SPECS[kind], component: COMPONENTS[kind] },
  ])
) as Record<PropKind, PropInfo>;

export function Prop({ kind, ...rest }: PropProps & { kind: PropKind }) {
  const Component = CATALOG[kind].component;
  return <Component {...rest} />;
}

/**
 * Every solid prop in a room, as one static rigid body.
 *
 * Rapier walks its whole body list on every step and react-three-rapier
 * syncs a transform for each one every frame, so fifteen barrels used to
 * cost fifteen of both, every frame, for scenery that never moves. One body
 * with fifteen colliders costs one.
 */
export function PropColliders({ placements }: { placements: PropPlacement[] }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      {placements.map((p, i) => {
        const spec = CATALOG[p.kind].collider;
        if (!spec) return null;
        const scale = p.scale ?? 1;
        const at: [number, number, number] = [p.x, spec.y * scale, p.z];
        const spin: [number, number, number] = [0, p.rotation ?? 0, 0];
        return spec.shape === "cylinder" ? (
          <CylinderCollider
            key={i}
            args={[spec.args[0] * scale, spec.args[1] * scale]}
            position={at}
          />
        ) : (
          <CuboidCollider
            key={i}
            args={[spec.args[0] * scale, spec.args[1] * scale, spec.args[2] * scale]}
            position={at}
            rotation={spin}
          />
        );
      })}
    </RigidBody>
  );
}
