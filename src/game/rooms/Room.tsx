import { useEffect, useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CircleGeometry, PlaneGeometry } from "three";

import { HAZARD_RADIUS, trapHazards } from "../dungeon/layout";
import { DIRS, halfSize, SHAPE_SIDES, type Room as RoomData } from "../dungeon/types";
import { DoorTrigger } from "../interact/DoorTrigger";
import { Gem } from "../props/Gem";
import { IronKey } from "../props/IronKey";
import { Hazard } from "../props/Hazard";
import { PlacedDevices } from "../props/Placed";
import { snaresIn, useRun } from "../state/run";
import { useSurface } from "../textures/registry";
import { sentryFor } from "../sentry/placement";
import { Sentry } from "../sentry/Sentry";
import { Cutpurse } from "../thief/Cutpurse";
import { Hoard } from "../thief/Hoard";
import { Warden } from "../warden/Warden";
import type { Patch } from "../warden/steer";
import { SNARE_RADIUS } from "../items/catalog";
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
function RoomWarden({ room, hazards }: { room: RoomData; hazards: Patch[] }) {
  const here = useRun((s) => s.wardenRoomId === room.id);
  // Snares the player has set in this room wound it as the floor's own
  // spikes do, and are deliberately not in the list it steers round: a
  // routed Warden has learned about the spikes it can see, and a wire on
  // the floor is why setting one is still worth a satchel slot afterwards.
  const snares = useRun((s) => s.placed);
  const wounding = useMemo<Patch[]>(
    () => [
      ...hazards,
      ...snaresIn(snares, room.id).map((d) => ({
        x: d.x,
        z: d.z,
        r: SNARE_RADIUS,
        key: d.key,
      })),
    ],
    [hazards, snares, room.id]
  );
  return here ? <Warden room={room} hazards={wounding} avoid={hazards} /> : null;
}

/**
 * The Cutpurse, while it is in the room. Its own component for the same
 * reason RoomWarden is: it comes and goes every twenty seconds and the
 * room around it should not re-render when it does.
 */
function RoomThief({ room, hazards }: { room: RoomData; hazards: Patch[] }) {
  const visiting = useRun((s) => s.thiefPhase !== "away");
  const here = useRun((s) => s.currentRoomId === room.id);
  return visiting && here ? <Cutpurse room={room} hazards={hazards} /> : null;
}

/** The heap, in the one room on the floor that has one. */
function RoomNest({ roomId, half }: { roomId: string; half: number }) {
  const isNest = useRun((s) => s.nestRoomId === roomId && s.nestGems > 0);
  return isNest ? <Hoard roomId={roomId} half={half} /> : null;
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
  // The same patches the player is charged for, in the shape the Warden's
  // steering reads. One list: a second opinion about where the spikes are
  // is exactly the class of bug this tree was rebuilt to make impossible.
  const wardenHazards = useMemo<Patch[]>(
    () => hazards.map(([x, , z]) => ({ x, z, r: HAZARD_RADIUS })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room.id, hazards.length]
  );

  // Where this room's spikes are, for the checks. The Warden walking round
  // them is a behaviour no probe could see otherwise: the store knows there
  // was a wound and the bus says so, and between those two there was no way
  // to ask whether it went round or simply missed.
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;
    (window as unknown as Record<string, unknown>).__roomHazards = {
      roomId: room.id,
      patches: wardenHazards,
    };
  }, [room.id, wardenHazards]);

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
      <RoomWarden room={room} hazards={wardenHazards} />
      <RoomThief room={room} hazards={wardenHazards} />
      <PlacedDevices roomId={room.id} />
      <RoomNest roomId={room.id} half={half} />
      {hazards.map((p, i) => (
        <Hazard key={i} position={p} />
      ))}

      {Content && <Content room={room} />}
    </group>
  );
}
