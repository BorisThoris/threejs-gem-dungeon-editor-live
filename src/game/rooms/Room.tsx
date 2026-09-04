import { useEffect, useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CircleGeometry, PlaneGeometry } from "three";

import { trapHazards } from "../dungeon/layout";
import { DIRS, halfSize, SHAPE_SIDES, type Room as RoomData } from "../dungeon/types";
import { DoorTrigger } from "../interact/DoorTrigger";
import { Gem } from "../props/Gem";
import { IronKey } from "../props/IronKey";
import { Hazard } from "../props/Hazard";
import { useRun } from "../state/run";
import { useSurface } from "../textures/registry";
import { sentryFor } from "../sentry/placement";
import { Sentry } from "../sentry/Sentry";
import { Warden } from "../warden/Warden";
import { FLOOR_THICKNESS, GROUND_Y, WALL_HEIGHT, floorRules } from "../world";
import { gemFor, keyFor, KIND_CONTENT, KIND_TINT } from "./kinds";
import { Walls } from "./Walls";

interface RoomProps {
  room: RoomData;
  seed: number;
}

/**
 * The shell every room is built on: a solid floor slab at the ground plane,
 * four walls with doorways where the links are, a ceiling, a light, the
 * doorway prompts, the gem, and whatever the room's kind adds inside.
 *
 * The room is always rendered at the world origin: one room exists at a
 * time, and the dungeon's grid is only used to decide which walls have
 * doors. Everything in here is plain geometry, so mounting can never be
 * held up by an asset.
 */
/**
 * The Warden, if this is the room it is in.
 *
 * Its own component on purpose. Subscribing to the Warden's room from
 * `Room` re-rendered every prop, trigger and light in the room each time it
 * stepped through a doorway - every four to nine seconds, for a subtree of
 * a hundred elements. Here the subscription costs one component.
 */
function RoomWarden({ room }: { room: RoomData }) {
  const here = useRun((s) => s.wardenRoomId === room.id);
  return here ? <Warden room={room} /> : null;
}

export function Room({ room, seed }: RoomProps) {
  const half = halfSize(room);
  const tint = KIND_TINT[room.kind];
  const Content = KIND_CONTENT[room.kind];
  // One tile every four units, whatever the room's size.
  const floorSurface = useSurface(tint.surface, room.size / 4);

  // The floor's outline: a flat polygon with as many sides as the shape has,
  // built once per room and released with it.
  const outline = useMemo(
    () =>
      room.shape === "square"
        ? new PlaneGeometry(room.size, room.size)
        : new CircleGeometry(half, SHAPE_SIDES[room.shape]),
    [room.shape, room.size, half]
  );
  useEffect(() => () => outline.dispose(), [outline]);

  // Tell the run the colliders exist: control is handed back only now.
  useEffect(() => {
    useRun.getState().roomReady(room.id);
  }, [room.id]);

  const gem = gemFor(room, seed);
  const holdsKey = useRun((s) => s.dungeon?.keyRoomId === room.id);
  const floor = useRun((s) => s.floor);
  const light = floorRules(floor).light;
  const sentry = sentryFor(room, seed, floor);
  const hazards = room.kind === "trap" && gem ? trapHazards(room, gem) : [];

  return (
    <group>
      {/* Solid floor slab, top face exactly at GROUND_Y. */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0, GROUND_Y - FLOOR_THICKNESS / 2, 0]} receiveShadow>
          <boxGeometry args={[room.size, FLOOR_THICKNESS, room.size]} />
          <meshStandardMaterial color="#2c2b30" roughness={1} />
        </mesh>
        <CuboidCollider
          args={[half, FLOOR_THICKNESS / 2, half]}
          position={[0, GROUND_Y - FLOOR_THICKNESS / 2, 0]}
        />
      </RigidBody>

      {/* The shaped, tinted floor the player actually sees. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.01, 0]} receiveShadow>
        <primitive object={outline} attach="geometry" />
        <meshStandardMaterial color={tint.floor} map={floorSurface} roughness={0.95} />
      </mesh>

      <Walls room={room} color={tint.wall} />

      {/* Ceiling, so there is never sky in a dungeon. */}
      <mesh position={[0, GROUND_Y + WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.size + 1, room.size + 1]} />
        <meshStandardMaterial color="#1a191d" roughness={1} />
      </mesh>

      {/* A dim overhead fill so no corner is ever fully black; the torches do
          the rest, and do more of it the deeper the floor is. */}
      <pointLight
        position={[0, GROUND_Y + WALL_HEIGHT - 0.6, 0]}
        color={light.fill}
        intensity={light.fillIntensity}
        distance={room.size * 1.6}
        decay={1.5}
      />

      {DIRS.map((dir) =>
        room.links[dir] ? <DoorTrigger key={dir} room={room} dir={dir} /> : null
      )}

      {gem && <Gem roomId={room.id} position={gem} />}
      {sentry && <Sentry position={sentry.at} phase={sentry.phase} />}
      {holdsKey && (
        <IronKey
          roomId={room.id}
          // Everything already in the room, the gem included: the key was
          // only avoiding the gem, so on an authored floor it could land on
          // a chest and take the chest with it.
          position={keyFor(room, seed)}
        />
      )}
      <RoomWarden room={room} />
      {hazards.map((p, i) => (
        <Hazard key={i} position={p} />
      ))}

      {Content && <Content room={room} />}
    </group>
  );
}
