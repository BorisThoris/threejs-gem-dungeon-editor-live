import { useEffect, useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CircleGeometry, PlaneGeometry } from "three";

import { HAZARD_RADIUS, trapHazards } from "../dungeon/layout";
import { DIRS, halfSize, SHAPE_SIDES, type Room as RoomData } from "../dungeon/types";
import { Barring } from "../interact/Barring";
import { DoorTrigger } from "../interact/DoorTrigger";
import { Gem } from "../props/Gem";
import { IronKey } from "../props/IronKey";
import { Hazard } from "../props/Hazard";
import { PlacedDevices } from "../props/Placed";
import { useRun } from "../state/run";
import { useSurface } from "../textures/registry";
import { sentryFor } from "../sentry/placement";
import { Sentry } from "../sentry/Sentry";
import { Cutpurse } from "../thief/Cutpurse";
import { Hoard } from "../thief/Hoard";
import { Warden } from "../warden/Warden";
import type { Patch } from "../warden/steer";
import { FLOOR_THICKNESS, GROUND_Y, WALL_HEIGHT, floorRules } from "../world";
import { BODIES, bitesFor, obstaclesFor } from "../mobs/body";
import { biomeFor } from "./biomes";
import { gemFor, keyFor, KIND_CONTENT } from "./kinds";
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
function RoomWarden({ room, hazards, seed }: { room: RoomData; hazards: Patch[]; seed: number }) {
  const here = useRun((s) => s.wardenRoomId === room.id);
  // Snares the player has set in this room wound it as the floor's own
  // spikes do, and are deliberately not in the list it steers round: a
  // routed Warden has learned about the spikes it can see, and a wire on
  // the floor is why setting one is still worth a satchel slot afterwards.
  const placed = useRun((s) => s.placed);
  // Both lists from the one owner of what a body meets on a floor. The
  // spikes it steers round once wary are still `hazards`; what bites it
  // and what it always walks round are the body's own answers.
  const wounding = useMemo<Patch[]>(() => bitesFor(BODIES.warden, room, seed, placed), [room, seed, placed]);
  const furniture = useMemo<Patch[]>(() => obstaclesFor(BODIES.warden, room, seed, placed), [room, seed, placed]);
  return here ? <Warden room={room} hazards={wounding} avoid={hazards} obstacles={furniture} /> : null;
}

/**
 * The Cutpurse, while it is in the room. Its own component for the same
 * reason RoomWarden is: it comes and goes every twenty seconds and the
 * room around it should not re-render when it does.
 */
function RoomThief({ room, seed }: { room: RoomData; seed: number }) {
  const visiting = useRun((s) => s.thiefPhase !== "away");
  const here = useRun((s) => s.currentRoomId === room.id);
  const placed = useRun((s) => s.placed);
  const wounding = useMemo<Patch[]>(() => bitesFor(BODIES.cutpurse, room, seed, placed), [room, seed, placed]);
  const furniture = useMemo<Patch[]>(() => obstaclesFor(BODIES.cutpurse, room, seed, placed), [room, seed, placed]);
  return visiting && here ? <Cutpurse room={room} hazards={wounding} obstacles={furniture} /> : null;
}

/** The heap, in the one room on the floor that has one. */
function RoomNest({ roomId, half }: { roomId: string; half: number }) {
  const isNest = useRun((s) => s.nestRoomId === roomId && s.nestGems > 0);
  return isNest ? <Hoard roomId={roomId} half={half} /> : null;
}

export function Room({ room, seed }: RoomProps) {
  const half = halfSize(room);
  // What the room is made of, as distinct from what it is for. Rolled from
  // the room's own seed, so it is the same place every time you walk back
  // into it.
  const tint = biomeFor(room.kind, room.id, seed);
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
        color={tint.glow}
        intensity={light.fillIntensity * tint.light}
        distance={room.size * 1.6}
        decay={1.5}
      />

      {DIRS.map((dir) =>
        room.links[dir] ? <DoorTrigger key={dir} room={room} dir={dir} /> : null
      )}
      <Barring room={room} />

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
      <RoomWarden room={room} hazards={wardenHazards} seed={seed} />
      <RoomThief room={room} seed={seed} />
      <PlacedDevices roomId={room.id} />
      <RoomNest roomId={room.id} half={half} />
      {hazards.map((p, i) => (
        <Hazard key={i} position={p} />
      ))}

      {Content && <Content room={room} />}
    </group>
  );
}
