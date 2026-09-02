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
import { modifiers } from "../relics/catalog";
import { canControl, useRun } from "../state/run";
import {
  EYE_OFFSET,
  GRAVITY_SCALE,
  MAX_FALL_SPEED,
  MAX_RISE_SPEED,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_RADIUS,
} from "../world";

const UP = new Vector3(0, 1, 0);
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
  const scratch = useMemo(
    () => ({
      dir: new Vector3(),
      euler: new Euler(0, 0, 0, "YXZ"),
      yawQ: new Quaternion(),
    }),
    []
  );

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

  useFrame(() => {
    const rb = body.current;
    if (!rb) return;

    const p = rb.translation();
    camera.position.set(p.x, p.y + EYE_OFFSET, p.z);

    if (import.meta.env.DEV) {
      const v = rb.linvel();
      const w = window as unknown as { __playerDebug?: Record<string, number> };
      const d = (w.__playerDebug ??= { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
      d.x = p.x; d.y = p.y; d.z = p.z; d.vx = v.x; d.vy = v.y; d.vz = v.z;
    }

    const vel = rb.linvel();
    const vy = clampVertical(vel.y);

    const run = useRun.getState();
    if (!canControl(run)) {
      rb.setLinvel({ x: 0, y: vy, z: 0 }, true);
      return;
    }
    // Speeds come from the relics, not from the constants: Soft Boots are
    // the one thing that may change how fast the player moves.
    const { walkSpeed, dashSpeed } = modifiers(run.relics);

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
    dir.multiplyScalar(dash ? dashSpeed : walkSpeed).applyQuaternion(yawQ);

    rb.setLinvel({ x: dir.x, y: vy, z: dir.z }, true);
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
