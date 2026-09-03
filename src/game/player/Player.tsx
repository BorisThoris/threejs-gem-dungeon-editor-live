import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Euler, Quaternion, Vector3 } from "three";

import { spawnAtStart } from "../dungeon/layout";
import { bus } from "../events";
import { keyboard } from "../input/keyboard";
import { readGamepad } from "../input/gamepad";
import { useMouseLook } from "../input/mouseLook";
import { canControl, speedNow, useRun } from "../state/run";
import { useSettings } from "../state/settings";
import { sfx } from "../systems/audio";
import {
  EYE_OFFSET,
  GRAVITY_SCALE,
  MAX_FALL_SPEED,
  MAX_RISE_SPEED,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_RADIUS,
} from "../world";

const UP = new Vector3(0, 1, 0);

/**
 * How far the player walks between footfalls, and how far the head dips on
 * each one. Paced by distance rather than by time, so walking and running
 * sound and feel like the same legs going faster instead of a metronome
 * that has been turned up.
 */
const STRIDE = 1.85;
const BOB_HEIGHT = 0.045;
const BOB_SWAY = 0.028;
/** How hard and how long the view is knocked about by a hit. */
const SHAKE_AMOUNT = 0.11;
const SHAKE_S = 0.32;
const clampUnit = (v: number) => Math.max(-1, Math.min(1, v));
const clampVertical = (y: number) =>
  Math.min(MAX_RISE_SPEED, Math.max(y, -MAX_FALL_SPEED));

/**
 * The player: a capsule the camera rides on.
 *
 * Movement follows the camera's yaw only - folding pitch in made looking at
 * the floor slow you down. Vertical velocity is clamped both ways: down so a
 * fall can never outrun collision detection, up because the world is flat
 * and the player cannot jump, so any upward motion is the solver pushing them
 * out of something and must never look like a launch.
 *
 * Everything here happens in useFrame on refs. Input never re-renders it.
 */
export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  useMouseLook();

  // Reused every frame: allocating vectors per frame is steady garbage, and
  // GC pauses are exactly what "random stutters" feels like.
  const bob = useRef({ distance: 0, strength: 0, nextStep: STRIDE, strong: true });
  const shake = useRef(0);
  const cameraBob = useSettings((s) => s.cameraBob);

  const scratch = useMemo(
    () => ({
      dir: new Vector3(),
      euler: new Euler(0, 0, 0, "YXZ"),
      yawQ: new Quaternion(),
      // Rapier takes a plain vector object; handing it a fresh literal every
      // frame is steady garbage for no reason.
      vel: { x: 0, y: 0, z: 0 },
    }),
    []
  );

  // A hit knocks the view about for a third of a second. It is the only
  // feedback the player gets that is not in a corner of the screen.
  useEffect(() => bus.on("damaged", () => (shake.current = SHAKE_S)), []);

  useEffect(() => {
    return bus.on("teleport", ({ position }) => {
      const rb = body.current;
      if (!rb) return;
      rb.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      camera.position.set(position[0], position[1] + EYE_OFFSET, position[2]);
    });
  }, [camera]);

  useFrame((_, delta) => {
    const rb = body.current;
    if (!rb) return;

    const p = rb.translation();
    const b = bob.current;
    // The head dips on each footfall and sways on the stride, at a size
    // meant to be felt rather than seen. Anyone it bothers can switch it off.
    const phase = (b.distance / STRIDE) * Math.PI;
    const dip = cameraBob ? -Math.abs(Math.sin(phase)) * BOB_HEIGHT * b.strength : 0;
    const sway = cameraBob ? Math.sin(phase * 0.5) * BOB_SWAY * b.strength : 0;
    let knock = 0;
    let knockX = 0;
    if (shake.current > 0) {
      shake.current = Math.max(0, shake.current - delta);
      const falling = (shake.current / SHAKE_S) ** 2;
      knock = (Math.random() - 0.5) * SHAKE_AMOUNT * falling;
      knockX = (Math.random() - 0.5) * SHAKE_AMOUNT * falling;
    }
    camera.position.set(p.x + sway + knockX, p.y + EYE_OFFSET + dip + knock, p.z);

    if (import.meta.env.DEV) {
      const v = rb.linvel();
      const w = window as unknown as { __playerDebug?: Record<string, number> };
      const d = (w.__playerDebug ??= { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, camY: 0 });
      d.x = p.x; d.y = p.y; d.z = p.z; d.vx = v.x; d.vy = v.y; d.vz = v.z;
      d.camY = camera.position.y;
    }

    const vel = rb.linvel();
    const vy = clampVertical(vel.y);

    const run = useRun.getState();
    if (!canControl(run)) {
      scratch.vel.x = 0;
      scratch.vel.y = vy;
      scratch.vel.z = 0;
      rb.setLinvel(scratch.vel, true);
      return;
    }
    // Relics, then whatever was last drunk. run.ts owns the sum of those.
    const { walk, dash: dashSpeed } = speedNow(run);

    const pad = readGamepad();
    const forward = keyboard.isDown("KeyW") || keyboard.isDown("ArrowUp");
    const back = keyboard.isDown("KeyS") || keyboard.isDown("ArrowDown");
    const left = keyboard.isDown("KeyA") || keyboard.isDown("ArrowLeft");
    const right = keyboard.isDown("KeyD") || keyboard.isDown("ArrowRight");
    const dash = keyboard.isDown("ShiftLeft") || keyboard.isDown("ShiftRight") || pad.dash;

    // Clamp rather than normalise, so a half-deflected stick walks slower.
    const inputZ = clampUnit(+back - +forward + pad.moveY);
    const inputX = clampUnit(+right - +left + pad.moveX);

    const { dir, euler, yawQ } = scratch;
    dir.set(inputX, 0, inputZ);
    const mag = dir.length();
    if (mag > 1) dir.divideScalar(mag);

    euler.setFromQuaternion(camera.quaternion, "YXZ");
    yawQ.setFromAxisAngle(UP, euler.y);
    dir.multiplyScalar(dash ? dashSpeed : walk).applyQuaternion(yawQ);

    scratch.vel.x = dir.x;
    scratch.vel.y = vy;
    scratch.vel.z = dir.z;
    rb.setLinvel(scratch.vel, true);

    // Footsteps and bob are driven by ground covered, not by the clock, so
    // they stay in step with the legs at any speed and stop dead when the
    // player does.
    const moved = Math.hypot(dir.x, dir.z) * delta;
    const gait = bob.current;
    gait.distance += moved;
    gait.strength += ((moved > 0.001 ? 1 : 0) - gait.strength) * Math.min(1, delta * 9);
    if (gait.distance >= gait.nextStep) {
      gait.nextStep = gait.distance + STRIDE;
      gait.strong = !gait.strong;
      sfx.step(gait.strong);
    }
  });

  return (
    <RigidBody
      ref={body}
      type="dynamic"
      colliders={false}
      position={spawnAtStart().position}
      mass={50}
      gravityScale={GRAVITY_SCALE}
      ccd
      lockRotations
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_CAPSULE_RADIUS]} />
    </RigidBody>
  );
}
