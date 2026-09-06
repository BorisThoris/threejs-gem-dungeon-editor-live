import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshStandardMaterial } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";

import { DIRS, halfSize, type Dir, type Room } from "../dungeon/types";
import { useSurface } from "../textures/registry";
import {
  DOOR_HEIGHT,
  DOOR_WIDTH,
  GROUND_Y,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from "../world";

interface WallsProps {
  room: Room;
  color: string;
}

interface Slab {
  position: [number, number, number];
  size: [number, number, number];
}

/**
 * Four walls, with a doorway cut wherever the room has a link.
 *
 * A doorway is a gap DOOR_WIDTH wide with a lintel above it, so the opening
 * reads as a door and not a missing wall. Colliders are declared explicitly
 * and match the meshes exactly. The gap itself is closed by an invisible
 * collider: rooms are left by pressing E at the door, and without it the
 * player could walk out through the opening onto the ground plane.
 */
export function Walls({ room, color }: WallsProps) {
  const half = halfSize(room);
  const surface = useSurface("stone", room.size / 4, WALL_HEIGHT / 4);
  const slabs: Slab[] = [];
  const gaps: Slab[] = [];
  const cracks: Slab[] = [];

  for (const dir of DIRS) {
    const along: "x" | "z" = dir === "north" || dir === "south" ? "x" : "z";
    const offset = dir === "north" || dir === "west" ? -half : half;
    const midY = GROUND_Y + WALL_HEIGHT / 2;

    const place = (centreAlong: number, length: number, y: number, height: number) => {
      slabs.push({
        position: along === "x" ? [centreAlong, y, offset] : [offset, y, centreAlong],
        size:
          along === "x"
            ? [length, height, WALL_THICKNESS]
            : [WALL_THICKNESS, height, length],
      });
    };

    if (room.links[dir as Dir]) {
      const side = half - DOOR_WIDTH / 2;
      place(-(DOOR_WIDTH / 2 + side / 2), side, midY, WALL_HEIGHT);
      place(DOOR_WIDTH / 2 + side / 2, side, midY, WALL_HEIGHT);
      const lintel = WALL_HEIGHT - DOOR_HEIGHT;
      place(0, DOOR_WIDTH, GROUND_Y + DOOR_HEIGHT + lintel / 2, lintel);
      gaps.push({
        position: along === "x" ? [0, GROUND_Y + DOOR_HEIGHT / 2, offset] : [offset, GROUND_Y + DOOR_HEIGHT / 2, 0],
        size: along === "x" ? [DOOR_WIDTH, DOOR_HEIGHT, WALL_THICKNESS] : [WALL_THICKNESS, DOOR_HEIGHT, DOOR_WIDTH],
      });
    } else {
      place(0, room.size + WALL_THICKNESS, midY, WALL_HEIGHT);
      // The crack: a darker seam down the middle of the wall that hides a
      // room, on the inside face. It is a hint and not a door, so it has no
      // collider of its own - the wall behind it does the stopping.
      if (room.secret && room.secret.dir === dir) {
        const inward = dir === "north" || dir === "west" ? WALL_THICKNESS / 2 + 0.01 : -(WALL_THICKNESS / 2 + 0.01);
        cracks.push({
          position: along === "x" ? [0, GROUND_Y + WALL_HEIGHT * 0.42, offset + inward] : [offset + inward, GROUND_Y + WALL_HEIGHT * 0.42, 0],
          size: along === "x" ? [0.16, WALL_HEIGHT * 0.84, 0.02] : [0.02, WALL_HEIGHT * 0.84, 0.16],
        });
      }
    }
  }

  return (
    <RigidBody type="fixed" colliders={false}>
      {slabs.map((slab, i) => (
        <group key={i}>
          <mesh position={slab.position} castShadow receiveShadow>
            <boxGeometry args={slab.size} />
            <meshStandardMaterial color={color} map={surface} roughness={0.9} />
          </mesh>
          <CuboidCollider
            args={[slab.size[0] / 2, slab.size[1] / 2, slab.size[2] / 2]}
            position={slab.position}
          />
        </group>
      ))}
      {cracks.map((crack, i) => (
        <Crack key={`crack-${i}`} position={crack.position} size={crack.size} />
      ))}
      {gaps.map((gap, i) => (
        <CuboidCollider
          key={`gap-${i}`}
          args={[gap.size[0] / 2, gap.size[1] / 2, gap.size[2] / 2]}
          position={gap.position}
        />
      ))}
    </RigidBody>
  );
}

/**
 * The seam that hides a room, breathing: a slow pulse in the dark of it,
 * visible from close and not from the doorway. The plan asked for a
 * brazier that gutters; the thing that flickers is the wall itself.
 */
function Crack({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  const material = useRef<MeshStandardMaterial>(null);
  useFrame((state) => {
    const m = material.current;
    if (m) m.emissiveIntensity = 0.35 + Math.sin(state.clock.elapsedTime * 2.6) * 0.2;
  });
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial ref={material} color="#0b0a0c" emissive="#3a2f4a" emissiveIntensity={0.35} roughness={1} />
    </mesh>
  );
}
