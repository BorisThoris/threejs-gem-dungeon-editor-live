import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";

import { bus } from "../events";
import { canControl, useRun } from "../state/run";
import { CAMERA_FOV, GAMEPAD_LOOK_SPEED, MOUSE_SENSITIVITY } from "../world";
import { readGamepad } from "./gamepad";

const PITCH_LIMIT = Math.PI / 2 - 0.05;

/**
 * First-person look.
 *
 * Hold the right mouse button to look; the pointer is locked for the hold so
 * the cursor stays free the rest of the time for menus. The right stick looks
 * too. Yaw and pitch live in refs and are written straight onto the camera:
 * nothing here ever re-renders anything.
 *
 * Only the decision to START a look consults whether the player is in
 * control; a look already in progress keeps working across a room
 * transition, which briefly clears the flag.
 */
export function useMouseLook() {
  const { camera } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const holding = useRef(false);
  const locked = useRef(false);

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = CAMERA_FOV;
      camera.updateProjectionMatrix();
    }
    camera.rotation.order = "YXZ";

    const apply = () => {
      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    };
    apply();

    const offLook = bus.on("lookSet", ({ yaw: y, pitch: p }) => {
      yaw.current = y;
      pitch.current = p;
      apply();
    });

    const onMouseMove = (event: MouseEvent) => {
      if (!holding.current || !locked.current) return;
      yaw.current -= (event.movementX || 0) * MOUSE_SENSITIVITY;
      pitch.current -= (event.movementY || 0) * MOUSE_SENSITIVITY;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
      apply();
    };
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 2 || !canControl(useRun.getState())) return;
      holding.current = true;
      if (!locked.current) {
        const request = document.body.requestPointerLock() as Promise<void> | undefined;
        request?.catch(() => {
          // Some embedders refuse pointer lock; looking still works from raw deltas.
          locked.current = true;
        });
      }
    };
    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 2) return;
      holding.current = false;
      if (document.pointerLockElement) document.exitPointerLock();
    };
    const onLockChange = () => {
      locked.current = document.pointerLockElement !== null;
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      offLook();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("contextmenu", onContextMenu);
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, [camera]);

  // Stick look, applied per frame so it is frame-rate independent.
  useFrame((_, delta) => {
    if (!canControl(useRun.getState())) return;
    const pad = readGamepad();
    if (!pad.connected || (pad.lookX === 0 && pad.lookY === 0)) return;
    yaw.current -= pad.lookX * GAMEPAD_LOOK_SPEED * delta;
    pitch.current -= pad.lookY * GAMEPAD_LOOK_SPEED * delta;
    pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
  });
}
