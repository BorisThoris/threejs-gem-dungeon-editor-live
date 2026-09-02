import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";

import { spawnAtStart } from "../dungeon/layout";
import { bus } from "../events";
import { canControl, useRun, type RunState } from "../state/run";
import { CAMERA_FOV, GAMEPAD_LOOK_SPEED, MOUSE_SENSITIVITY } from "../world";
import { readGamepad } from "./gamepad";
import { look } from "./look";

const PITCH_LIMIT = Math.PI / 2 - 0.05;

/**
 * When a lost pointer lock last opened the pause menu. Some browsers hand the
 * page the Esc that ended the lock as well; the pause toggle consults this
 * so that one keypress does not pause and immediately resume.
 */
export const lockLossPause = { at: -Infinity };

/** The run is at a point where the pointer belongs to the menus, not the game. */
const wantsCursor = (s: RunState): boolean =>
  s.phase !== "playing" || s.paused || s.inputLocks > 0;

/**
 * First-person look, the way every first-person game does it.
 *
 * Click the game and the pointer is captured; from then on the mouse is the
 * view. Esc gives the pointer back - the browser does that itself and eats
 * the key, so a lock lost during play is taken as the player asking for the
 * menu and opens it. Menus and puzzles release the pointer so their buttons
 * can be clicked, and closing them asks for it back; that request is only
 * honoured on a user gesture, and closing a menu is one.
 *
 * Yaw and pitch live in refs and are written straight onto the camera:
 * nothing here ever re-renders anything. The right stick looks too.
 */
export function useMouseLook() {
  const { camera, gl } = useThree();
  const yaw = useRef(spawnAtStart().yaw);
  const pitch = useRef(0);

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = CAMERA_FOV;
      camera.updateProjectionMatrix();
    }
    camera.rotation.order = "YXZ";
    const canvas = gl.domElement;
    // Set while we let go of the pointer ourselves, so the lock-change
    // handler can tell our release from the player's Esc.
    let releasing = false;

    const apply = () => {
      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
      look.yaw = yaw.current;
      look.pitch = pitch.current;
    };
    apply();

    const requestLock = () => {
      if (document.pointerLockElement === canvas) return;
      try {
        const request = canvas.requestPointerLock() as Promise<void> | undefined;
        request?.catch(() => {
          // Refused (no user gesture, or an embedder that forbids it): the
          // next click will ask again.
        });
      } catch {
        // Same, thrown synchronously by older engines.
      }
    };
    const releaseLock = () => {
      if (document.pointerLockElement !== canvas) return;
      releasing = true;
      document.exitPointerLock();
    };

    const offLook = bus.on("lookSet", ({ yaw: y, pitch: p }) => {
      yaw.current = y;
      pitch.current = p;
      apply();
    });

    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current -= (event.movementX || 0) * MOUSE_SENSITIVITY;
      pitch.current -= (event.movementY || 0) * MOUSE_SENSITIVITY;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
      apply();
    };
    const onMouseDown = () => {
      if (canControl(useRun.getState())) requestLock();
    };
    const onLockChange = () => {
      if (document.pointerLockElement === canvas) return;
      if (releasing) {
        releasing = false;
        return;
      }
      const run = useRun.getState();
      if (run.phase === "playing" && !run.paused && run.inputLocks === 0) {
        lockLossPause.at = performance.now();
        run.pause();
      }
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    // Menus and puzzles take the pointer; closing them hands it back.
    const unsubscribe = useRun.subscribe(wantsCursor, (cursor) => {
      if (cursor) releaseLock();
      else requestLock();
    });

    document.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      offLook();
      unsubscribe();
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("contextmenu", onContextMenu);
      releaseLock();
    };
  }, [camera, gl]);

  // Stick look, applied per frame so it is frame-rate independent.
  useFrame((_, delta) => {
    if (!canControl(useRun.getState())) return;
    const pad = readGamepad();
    if (!pad.connected || (pad.lookX === 0 && pad.lookY === 0)) return;
    yaw.current -= pad.lookX * GAMEPAD_LOOK_SPEED * delta;
    pitch.current -= pad.lookY * GAMEPAD_LOOK_SPEED * delta;
    pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    look.yaw = yaw.current;
    look.pitch = pitch.current;
  });
}
