import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";

import { doorPosition } from "../dungeon/layout";
import { DIRS, halfSize, type Room } from "../dungeon/types";
import { bus } from "../events";
import { canControl, useRun } from "../state/run";
import { GROUND_Y, WARDEN_TOUCH_RADIUS } from "../world";
import { behaviourFor } from "./tuning";

interface WardenProps {
  room: Room;
}

/** Proximity bands the DOM draws a vignette from: none, near, close, upon you. */
const BANDS = [7, 4, 2];
const bandFor = (distance: number): number => {
  for (let i = 0; i < BANDS.length; i++) if (distance > BANDS[i]) return i;
  return BANDS.length;
};

/**
 * The Warden, in the room the player is standing in.
 *
 * It has no rigid body and no collider: it walks through barrels and
 * pillars, and the only thing in the dungeon that stops it is a wall it
 * never crosses because it moves room to room, not through geometry. That
 * is deliberate. A threat you can pin behind a crate is a puzzle; one that
 * simply keeps coming is a reason to leave, which is the decision this
 * whole floor is built around.
 *
 * It cannot be fought. Its speed is under the player's walk at every alarm
 * level, so it never wins a straight race - it wins by being between you
 * and the door, and by arriving while you are deciding whether to be greedy.
 */
export function Warden({ room }: WardenProps) {
  const group = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const alarm = useRun((s) => s.alarm);
  const cameFrom = useRun((s) => s.wardenCameFrom);
  const band = useRef(-1);
  const scratch = useMemo(() => ({ to: new Vector3() }), []);

  // It comes in through the doorway it walked in from, so its arrival has
  // a direction the player can learn to read.
  const entry = useMemo<[number, number, number]>(() => {
    const half = halfSize(room);
    const dir = DIRS.find((d) => room.links[d] && room.links[d] === cameFrom);
    if (dir) {
      const [x, , z] = doorPosition(room, dir);
      return [x * 0.86, GROUND_Y, z * 0.86];
    }
    return [half * 0.7, GROUND_Y, -half * 0.7];
    // `cameFrom` is read once, at the moment it enters: it must not move the
    // Warden again while it is in the room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  useEffect(() => {
    bus.emit("wardenProximity", { level: 0 });
    return () => bus.emit("wardenProximity", { level: 0 });
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const behaviour = behaviourFor(alarm);

    // It drifts rather than walks: a slow bob, and eyes that always face you.
    g.position.y = GROUND_Y + 0.06 + Math.sin(t * 1.6) * 0.05;

    const cam = state.camera.position;
    const dx = cam.x - g.position.x;
    const dz = cam.z - g.position.z;
    const distance = Math.hypot(dx, dz);
    g.rotation.y = Math.atan2(dx, dz);

    const level = bandFor(distance);
    if (level !== band.current) {
      band.current = level;
      bus.emit("wardenProximity", { level });
    }

    if (!canControl(useRun.getState())) return;

    if (distance <= WARDEN_TOUCH_RADIUS) {
      useRun.getState().wardenStrike();
      return;
    }

    // Straight at the player, clamped inside the room so it never drifts
    // out through a wall it did not walk through.
    const step = Math.min(behaviour.speed * delta, Math.max(0, distance - WARDEN_TOUCH_RADIUS * 0.5));
    scratch.to.set(dx / distance, 0, dz / distance).multiplyScalar(step);
    const limit = halfSize(room) - 0.6;
    g.position.x = Math.max(-limit, Math.min(limit, g.position.x + scratch.to.x));
    g.position.z = Math.max(-limit, Math.min(limit, g.position.z + scratch.to.z));
  });

  const rouse = behaviourFor(alarm).rouse;
  const eyeColour = rouse > 0.6 ? "#ff5c3a" : rouse > 0.3 ? "#ffb03a" : "#9fd8ff";

  return (
    <group ref={group} position={entry}>
      {/* A hooded column that never quite touches the floor. The outer shell
          is a shade off black so the silhouette has an edge against a dark
          wall; without it the whole figure vanishes into the room. */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.66, 2.3, 14, 1, true]} />
        <meshStandardMaterial color="#1b1b24" roughness={1} metalness={0} side={2} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.26, 0.6, 2.28, 14, 1, true]} />
        <meshStandardMaterial color="#08080c" roughness={1} side={2} />
      </mesh>
      {/* The hood: a shallow cowl over the face, open at the front. */}
      <mesh position={[0, 2.26, 0]}>
        <sphereGeometry args={[0.3, 14, 10]} />
        <meshStandardMaterial color="#101017" roughness={1} />
      </mesh>
      {/* Two eyes, clear of the hood so they are never swallowed by it. */}
      <group ref={eyes} position={[0, 2.24, 0.3]}>
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshBasicMaterial color={eyeColour} />
          </mesh>
        ))}
      </group>
      {/* Set ahead of the hood so it lights the room it is walking into
          rather than the front of its own robe. */}
      <pointLight
        position={[0, 2.05, 0.75]}
        color={eyeColour}
        intensity={5 + rouse * 8}
        distance={9}
        decay={1.7}
      />
      {/* The smoke it stands in, so the gap under the hem reads as float. */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 18]} />
        <meshBasicMaterial color="#100c18" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
