/* eslint-disable react-refresh/only-export-components -- the catalogue table
   and the components it lists belong together; the editor iterates the table. */
import { useRef, type ComponentType } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import type { PointLight } from "three";

import type { PropKind } from "../dungeon/types";
import { Hazard } from "./Hazard";

export interface PropProps {
  position: [number, number, number];
  /** Radians about y. */
  rotation?: number;
  scale?: number;
}

/**
 * The fifteen props the rooms are dressed with.
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

/**
 * Point light intensity is in candela since three r155: a torch at 1 lit
 * nothing and every room read as black. Rooms are lit from their corners,
 * so this is most of the light a player sees by.
 */
const TORCH_INTENSITY = 14;

function Barrel(p: PropProps) {
  return (
    <RigidBody type="fixed" colliders={false} {...frame(p)}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.38, 1.1, 14]} />
        <meshStandardMaterial color={WOOD} roughness={0.85} />
      </mesh>
      {[0.25, 0.85].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.43, 0.03, 6, 20]} />
          <meshStandardMaterial color={IRON} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <CylinderCollider args={[0.55, 0.42]} position={[0, 0.55, 0]} />
    </RigidBody>
  );
}

function Bookshelf(p: PropProps) {
  return (
    <RigidBody type="fixed" colliders={false} {...frame(p)}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.6, 2.2, 0.45]} />
        <meshStandardMaterial color={DARK_WOOD} roughness={0.9} />
      </mesh>
      {[0.45, 1.05, 1.65].map((y) => (
        <group key={y}>
          {[-0.5, -0.2, 0.1, 0.4].map((x, i) => (
            <mesh key={i} position={[x, y + 0.18, 0.05]}>
              <boxGeometry args={[0.22, 0.34, 0.3]} />
              <meshStandardMaterial color={["#8a3b3b", "#3b5f8a", "#6f8a3b", "#8a6f3b"][i]} />
            </mesh>
          ))}
        </group>
      ))}
      <CuboidCollider args={[0.8, 1.1, 0.225]} position={[0, 1.1, 0]} />
    </RigidBody>
  );
}

function Candle(p: PropProps) {
  const light = useRef<PointLight>(null);
  useFrame((state) => {
    if (light.current) light.current.intensity = 2.5 + Math.sin(state.clock.elapsedTime * 9 + p.position[0]) * 0.4;
  });
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.32, 10]} />
        <meshStandardMaterial color="#efe6c8" />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <coneGeometry args={[0.035, 0.11, 8]} />
        <meshStandardMaterial color="#ffb24d" emissive="#ff9a2e" emissiveIntensity={2} />
      </mesh>
      <pointLight ref={light} position={[0, 0.5, 0]} color="#ffb86c" intensity={2.5} distance={4} />
    </group>
  );
}

function Chair(p: PropProps) {
  return (
    <RigidBody type="fixed" colliders={false} {...frame(p)}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      <mesh position={[0, 0.8, -0.22]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.06]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]}>
          <boxGeometry args={[0.05, 0.44, 0.05]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}
      <CuboidCollider args={[0.25, 0.55, 0.25]} position={[0, 0.55, 0]} />
    </RigidBody>
  );
}

function Chest(p: PropProps) {
  return (
    <RigidBody type="fixed" colliders={false} {...frame(p)}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.55]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.66, 0]} castShadow>
        <boxGeometry args={[0.92, 0.14, 0.57]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>
      <mesh position={[0, 0.45, 0.29]}>
        <boxGeometry args={[0.12, 0.16, 0.04]} />
        <meshStandardMaterial color="#c8a34a" metalness={0.8} roughness={0.3} />
      </mesh>
      <CuboidCollider args={[0.46, 0.37, 0.29]} position={[0, 0.37, 0]} />
    </RigidBody>
  );
}

function Crystal(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#b9f6ff" emissive="#4fd3e8" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} color="#7fe3ff" intensity={4} distance={5} />
    </group>
  );
}

function Pillar(p: PropProps) {
  return (
    <RigidBody type="fixed" colliders={false} {...frame(p)}>
      <mesh position={[0, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.4, 4.2, 12]} />
        <meshStandardMaterial color="#7d7c84" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.24, 12]} />
        <meshStandardMaterial color="#66656d" />
      </mesh>
      <CylinderCollider args={[2.1, 0.4]} position={[0, 2.1, 0]} />
    </RigidBody>
  );
}

function Potion(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.14, 12, 10]} />
        <meshStandardMaterial color="#63d2ff" emissive="#2c8fb8" emissiveIntensity={0.6} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.14, 8]} />
        <meshStandardMaterial color="#c8b58a" />
      </mesh>
    </group>
  );
}

function Skull(p: PropProps) {
  return (
    <group {...frame(p)}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color={BONE} roughness={0.9} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.22, 0.17]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshStandardMaterial color="#1a1417" />
        </mesh>
      ))}
    </group>
  );
}

function Table(p: PropProps) {
  return (
    <RigidBody type="fixed" colliders={false} {...frame(p)}>
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[1.8, 0.08, 1]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      {[[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]}>
          <boxGeometry args={[0.08, 0.74, 0.08]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}
      <CuboidCollider args={[0.9, 0.41, 0.5]} position={[0, 0.41, 0]} />
    </RigidBody>
  );
}

function Tile(p: PropProps) {
  return (
    <mesh {...frame(p)} rotation={[-Math.PI / 2, 0, p.rotation ?? 0]} position={[p.position[0], p.position[1] + 0.015, p.position[2]]}>
      <planeGeometry args={[2, 2]} />
      <meshStandardMaterial color="#7d9179" roughness={0.6} />
    </mesh>
  );
}

function Torch(p: PropProps) {
  const light = useRef<PointLight>(null);
  useFrame((state) => {
    if (light.current) {
      const t = state.clock.elapsedTime * 11 + p.position[0] * 3 + p.position[2];
      light.current.intensity = TORCH_INTENSITY * (1 + Math.sin(t) * 0.13 + Math.sin(t * 2.7) * 0.07);
    }
  });
  return (
    <group {...frame(p)}>
      {/* Three iron legs meeting under the bowl. */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.22, 0.55, Math.sin(a) * 0.22]}
            rotation={[Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32]}
          >
            <cylinderGeometry args={[0.025, 0.035, 1.15, 6]} />
            <meshStandardMaterial color="#3a3d44" metalness={0.8} roughness={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, 1.18, 0]}>
        <cylinderGeometry args={[0.34, 0.18, 0.3, 12, 1, true]} />
        <meshStandardMaterial color="#3a3d44" metalness={0.8} roughness={0.5} side={2} />
      </mesh>
      {/* Coals: a glowing disc just inside the bowl's lip. */}
      <mesh position={[0, 1.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 12]} />
        <meshStandardMaterial color="#ff6a1a" emissive="#ff4d00" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <coneGeometry args={[0.2, 0.6, 8]} />
        <meshStandardMaterial color="#ffb24d" emissive="#ff7a1a" emissiveIntensity={2.4} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <coneGeometry args={[0.09, 0.42, 6]} />
        <meshStandardMaterial color="#fff1b0" emissive="#ffd060" emissiveIntensity={3} />
      </mesh>
      <pointLight ref={light} position={[0, 1.8, 0]} color="#ffb86c" intensity={TORCH_INTENSITY} distance={11} decay={1.6} />
    </group>
  );
}

/** An interior wall segment, 3 units long, for authored layouts. */
function Wall(p: PropProps) {
  return (
    <RigidBody type="fixed" colliders={false} {...frame(p)}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 3, 0.4]} />
        <meshStandardMaterial color="#55545c" roughness={0.95} />
      </mesh>
      <CuboidCollider args={[1.5, 1.5, 0.2]} position={[0, 1.5, 0]} />
    </RigidBody>
  );
}

function Web(p: PropProps) {
  return (
    <mesh {...frame(p)} position={[p.position[0], p.position[1] + 1.6, p.position[2]]}>
      <planeGeometry args={[1.4, 1.4]} />
      <meshBasicMaterial color="#dfe3ea" transparent opacity={0.22} side={2} depthWrite={false} />
    </mesh>
  );
}

function Spikes(p: PropProps) {
  return <Hazard position={p.position} />;
}

export interface PropInfo {
  component: ComponentType<PropProps>;
  title: string;
  /** Footprint radius in room units, for the editor and for lane checks. */
  radius: number;
  /** Whether it blocks the player. */
  solid: boolean;
}

export const CATALOG: Record<PropKind, PropInfo> = {
  barrel: { component: Barrel, title: "Barrel", radius: 0.45, solid: true },
  bookshelf: { component: Bookshelf, title: "Bookshelf", radius: 0.8, solid: true },
  candle: { component: Candle, title: "Candle", radius: 0.1, solid: false },
  chair: { component: Chair, title: "Chair", radius: 0.3, solid: true },
  chest: { component: Chest, title: "Chest", radius: 0.5, solid: true },
  crystal: { component: Crystal, title: "Crystal", radius: 0.35, solid: false },
  pillar: { component: Pillar, title: "Pillar", radius: 0.6, solid: true },
  potion: { component: Potion, title: "Potion", radius: 0.15, solid: false },
  skull: { component: Skull, title: "Skull", radius: 0.2, solid: false },
  table: { component: Table, title: "Table", radius: 1, solid: true },
  tile: { component: Tile, title: "Floor inlay", radius: 1, solid: false },
  torch: { component: Torch, title: "Brazier", radius: 0.4, solid: false },
  wall: { component: Wall, title: "Wall segment", radius: 1.5, solid: true },
  web: { component: Web, title: "Cobweb", radius: 0.7, solid: false },
  spikes: { component: Spikes, title: "Spikes", radius: 1.2, solid: false },
};

export function Prop({ kind, ...rest }: PropProps & { kind: PropKind }) {
  const Component = CATALOG[kind].component;
  return <Component {...rest} />;
}
