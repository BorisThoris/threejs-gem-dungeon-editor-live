import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import type { Group, Mesh, MeshBasicMaterial } from "three";

import { type Vec3 } from "../dungeon/layout";
import { bus } from "../events";
import { canControl, useRun } from "../state/run";
import {
  GROUND_Y,
  SENTRY_ALARM,
  SENTRY_COOLDOWN_S,
  SENTRY_HALF_ANGLE,
  SENTRY_PATIENCE,
  SENTRY_RANGE,
  SENTRY_SPIN,
} from "../world";

const TWO_PI = Math.PI * 2;

/** Shortest signed angle from `a` to `b`. */
function angleBetween(a: number, b: number): number {
  let d = (b - a) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

/**
 * The Sentry: a post with a turning beam, in a room that would otherwise be
 * a corridor with a gem in it.
 *
 * Being held in the light for most of a second rouses the floor and sets
 * the Warden walking towards you. It never takes a life, so it stays
 * clearly a different thing from the spikes, and its cost is one you pay
 * later - which is the same bargain the rest of the floor makes.
 *
 * The beam is drawn as a wedge on the floor rather than a volume of light,
 * because a cone you can see the edge of is one you can judge, and this
 * room is entirely about judging it.
 */
export function Sentry({ position, phase }: { position: Vec3; phase: number }) {
  const head = useRef<Group>(null);
  const wedge = useRef<Mesh>(null);
  const lit = useRef(0);
  const lastCall = useRef(-Infinity);
  const [seen, setSeen] = useState(false);

  useFrame((state, delta) => {
    const g = head.current;
    if (!g) return;
    const facing = phase + state.clock.elapsedTime * SENTRY_SPIN;
    g.rotation.y = facing;

    const run = useRun.getState();
    if (!canControl(run)) return;

    const cam = state.camera.position;
    const dx = cam.x - position[0];
    const dz = cam.z - position[2];
    const distance = Math.hypot(dx, dz);
    // The beam points along the head's local +z, which at yaw `facing` is
    // world (sin, cos) - the same convention the Warden faces by.
    const toPlayer = Math.atan2(dx, dz);
    const inside =
      distance < SENTRY_RANGE && Math.abs(angleBetween(facing, toPlayer)) < SENTRY_HALF_ANGLE;

    lit.current = inside ? lit.current + delta : 0;
    if (seen !== inside) setSeen(inside);

    const now = state.clock.elapsedTime;
    if (lit.current >= SENTRY_PATIENCE && now - lastCall.current > SENTRY_COOLDOWN_S) {
      lastCall.current = now;
      lit.current = 0;
      // Through the store's action, not setState: the alarm has one owner
      // and anything that ever damps or caps it must apply here too. And
      // giveAway rather than raiseAlarm, because being called out is the
      // Warden being told where the player is - it outranks a noise it was
      // off chasing, which is the whole difference between the two.
      run.giveAway(SENTRY_ALARM);
      bus.emit("sentrySaw");
    }

    // The wedge brightens as it acquires, so being about to be caught looks
    // different from merely standing in the light.
    const mat = wedge.current?.material as MeshBasicMaterial | undefined;
    if (mat) mat.opacity = 0.28 + (inside ? Math.min(1, lit.current / SENTRY_PATIENCE) * 0.45 : 0);
  });

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.22, 2.2, 8]} />
          <meshStandardMaterial color="#3c4048" metalness={0.5} roughness={0.6} />
        </mesh>
        <CylinderCollider args={[1.1, 0.22]} position={[0, 1.1, 0]} />
      </RigidBody>
      <group ref={head} position={[0, 2.3, 0]}>
        <mesh>
          <sphereGeometry args={[0.24, 12, 10]} />
          <meshStandardMaterial color="#2a2d34" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.19]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshBasicMaterial color={seen ? "#ff6a4a" : "#8ad4ff"} />
        </mesh>
        {/* A pool at the head, not a floodlight down the room: at full
            range it washed out the wedge on the floor, which is the thing
            the player actually has to read. */}
        <pointLight
          position={[0, 0, 0.6]}
          color={seen ? "#ff6a4a" : "#8ad4ff"}
          intensity={3}
          distance={5.5}
          decay={1.6}
        />
        {/*
          The lit ground: a wedge on the floor, drawn from the post.

          Laying a circle flat with a -90 degree turn about X sends its
          angle t to the world direction (cos t, -sin t), so the beam's
          own +z is at -90 degrees, not +90. Starting it at +90 drew the
          wedge out of the back of the Sentry while it watched the front,
          which is the worst kind of bug in a room whose whole job is
          letting you judge where the light is.
        */}
        <mesh ref={wedge} position={[0, -2.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry
            args={[SENTRY_RANGE, 28, -Math.PI / 2 - SENTRY_HALF_ANGLE, SENTRY_HALF_ANGLE * 2]}
          />
          <meshBasicMaterial color={seen ? "#ffb08a" : "#bfe8ff"} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
