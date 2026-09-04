import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import type { Group, Mesh, MeshBasicMaterial } from "three";

import { type Vec3 } from "../dungeon/layout";
import { bus } from "../events";
import { canControl, runClock, useRun } from "../state/run";
import { sideOf } from "../systems/bearing";
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

/** How plainly the beam is drawn on the floor before it has acquired. */
const BEAM_OPACITY = 0.45;

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
  /** When the light first touched the player, or null while it has not. */
  const litSince = useRef<number | null>(null);
  const lastCall = useRef(-Infinity);
  const [seen, setSeen] = useState(false);

  useFrame((state) => {
    const g = head.current;
    if (!g) return;
    /**
     * The run's clock, not the renderer's.
     *
     * All three of the things this post times used to read
     * `state.clock.elapsedTime`, which keeps turning while the game is
     * paused, and the room breaks in both directions because of it.
     * Measured on floor three with the beam on the player: pause for half a
     * sweep and the beam has moved on, so standing still in the light and
     * pressing Escape was never seen at all where standing still was seen
     * every time. Pause for a whole sweep - eleven and a half seconds, and
     * the beam is back where it was - and the span it has held you for is
     * still running from before the menu, so the post calls out on the
     * first frame back, before the player has taken a step.
     *
     * On `runClock` the beam is where it was left, the span is what it was,
     * and the pause key neither pays nor charges.
     */
    const run = useRun.getState();
    const now = runClock(run);
    const facing = phase + now * SENTRY_SPIN;
    g.rotation.y = facing;

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

    /**
     * How long the light has held you: a span, not a sum.
     *
     * This added a frame delta a frame, and the margin it is measured
     * against is sixty-four milliseconds - a walking player needs 0.836s
     * to cross out of the beam at its furthest reach and the post waits
     * 0.9s. On the frame the beam first touched a player, a hitch of nine
     * hundred milliseconds took the count from nothing to past the
     * patience in one go: called out on the instant of contact, for a
     * light that had been on them for a fraction of a frame nobody
     * rendered, with no chance to move.
     *
     * Capping each frame's contribution fixed that and bought a worse
     * problem. The count is also how "standing still in the light is
     * always seen" is decided, and a machine whose frames run longer than
     * the cap accrues only the capped share of each - below about twelve
     * frames a second the post stopped calling anybody out at all. That
     * was found by walking a beam in the running game, on a rasteriser
     * that renders at ten: the player stood in the light for a second and
     * a half untroubled.
     *
     * A span has neither problem and needs no constant. The clock is read
     * when the light arrives and the answer is how long ago that was, so
     * the beam arriving during a dropped frame starts the span at nought
     * rather than finishing it, and a slow machine measures the same
     * second and a half a fast one does. The beam takes 11.4s to come
     * round and covers one direction for 1.53s of that, so it cannot leave
     * a player and return inside a hitch: lit at both ends of a dropped
     * frame means lit throughout it, and charging for that is right.
     */
    if (!inside) litSince.current = null;
    else if (litSince.current === null) litSince.current = now;
    const held = litSince.current === null ? 0 : now - litSince.current;

    if (import.meta.env.DEV) {
      // How long it thinks it has held you, for the checks. Nothing
      // outside this component could see the number the whole room turns
      // on. Written into one object, at frame rate.
      const w = window as unknown as { __sentry?: Record<string, number | boolean> };
      const probe = (w.__sentry ??= { lit: 0, inside: false, facing: 0, distance: 0 });
      probe.lit = held;
      probe.inside = inside;
      probe.facing = facing;
      probe.distance = distance;
    }
    if (seen !== inside) setSeen(inside);

    if (held >= SENTRY_PATIENCE && now - lastCall.current > SENTRY_COOLDOWN_S) {
      lastCall.current = now;
      litSince.current = now;
      // Through the store's action, not setState: the alarm has one owner
      // and anything that ever damps or caps it must apply here too. And
      // giveAway rather than raiseAlarm, because being called out is the
      // Warden being told where the player is - it outranks a noise it was
      // off chasing, which is the whole difference between the two.
      run.giveAway(SENTRY_ALARM);
      // It stands still at a known spot, so the call it makes has a side to
      // it: the player learns which post to keep out of, not merely that a
      // post exists.
      bus.emit("sentrySaw", { pan: sideOf(position[0] - cam.x, position[2] - cam.z) });
    }

    // The wedge brightens as it acquires, so being about to be caught looks
    // different from merely standing in the light.
    //
    // It sat at 0.28 and photographed as a slight lightening of the floor
    // rather than a cone with an edge you can judge - which is the whole of
    // what this room asks. A walking player has 0.84 seconds to cross out
    // of the beam against the 0.9 it waits before calling, and a margin
    // that thin is only a margin if you can see the light arriving.
    const mat = wedge.current?.material as MeshBasicMaterial | undefined;
    if (mat) mat.opacity = BEAM_OPACITY + (inside ? Math.min(1, held / SENTRY_PATIENCE) * 0.4 : 0);
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
          <meshBasicMaterial color={seen ? "#ffb08a" : "#bfe8ff"} transparent opacity={BEAM_OPACITY} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
