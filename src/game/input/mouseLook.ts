import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";

import { spawnAtStart } from "../dungeon/layout";
import { bus } from "../events";
import { canControl, useRun, type RunState } from "../state/run";
import { useSettings } from "../state/settings";
import {
  CAMERA_FOV,
  GAMEPAD_LOOK_SPEED,
  MAX_FRAME_S,
  MOUSE_SENSITIVITY,
  TOUCH_LOOK_SENSITIVITY,
} from "../world";
import { pointerLockWanted } from "./device";
import { readGamepad } from "./gamepad";
import { look } from "./look";
import { takeTouchLook } from "./touch";

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
 * nothing here ever re-renders anything. The right stick looks too, and
 * so does a thumb dragged across a touchscreen (`touch.ts`), which asks
 * for no lock at all: on a phone the API is missing or refused, and the
 * layer that reads the drag sits over the canvas in any case.
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
      if (!pointerLockWanted()) return;
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
      // The player's own figures, over the game's. Read off the store at
      // the moment the mouse moves rather than subscribed to: this handler
      // is not a React render and a change takes effect on the next
      // movement either way.
      const { sensitivity, invertY } = useSettings.getState();
      yaw.current -= (event.movementX || 0) * MOUSE_SENSITIVITY * sensitivity;
      pitch.current -= (event.movementY || 0) * MOUSE_SENSITIVITY * sensitivity * (invertY ? -1 : 1);
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
      apply();
    };
    /**
     * On the document rather than the canvas, because the touch layer
     * sits over the canvas whenever it is drawn and a mouse click on a
     * touchscreen laptop would otherwise land on it and do nothing. A
     * press on a button is that button's, and a menu's buttons are the
     * reason the run has released the pointer in the first place.
     */
    const onMouseDown = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.("button, input, a, select")) return;
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
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      offLook();
      unsubscribe();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("contextmenu", onContextMenu);
      releaseLock();
    };
  }, [camera, gl]);

  /**
   * Stick look, applied per frame so it is frame-rate independent - and no
   * frame counts for more than a frame.
   *
   * This was the one place left in the game that turned a raw delta into
   * movement. Cycle 44 went looking for those because the Warden crossed
   * four metres in a single slow frame, and found it in the one thing that
   * chases the player; what it did not find was the one thing the player
   * steers with. At 2.4 radians a second, a nine-hundred-millisecond hitch
   * with the stick held over swings the view a hundred and twenty-four
   * degrees in one frame - on a Steam Deck, which is the only input this
   * path serves, and at exactly the moment a player is least able to
   * afford losing track of the room.
   *
   * A mouse is unaffected: it moves the camera by the pixels it reported,
   * and a long frame simply carries more of them, which is what the player
   * did with their hand. A stick reports a position, not a movement, so
   * the time it stood there is the game's to decide, and the game should
   * not decide that a frame it never rendered counts in full.
   */
  useFrame((_, delta) => {
    // The drag is taken whether or not the player is in control, so a
    // thumb that moved while a menu was up does not swing the view the
    // moment the menu closes.
    const drag = takeTouchLook();
    if (!canControl(useRun.getState())) return;
    const { padLook, touchLook, invertY } = useSettings.getState();
    const upDown = invertY ? -1 : 1;
    let turned = false;
    if (drag.x !== 0 || drag.y !== 0) {
      // Pixels, like the mouse: a long frame carries more of them, which
      // is what the thumb did, so there is nothing here to cap.
      yaw.current -= drag.x * TOUCH_LOOK_SENSITIVITY * touchLook;
      pitch.current -= drag.y * TOUCH_LOOK_SENSITIVITY * touchLook * upDown;
      turned = true;
    }
    const pad = readGamepad();
    if (pad.connected && (pad.lookX !== 0 || pad.lookY !== 0)) {
      const step = Math.min(delta, MAX_FRAME_S);
      yaw.current -= pad.lookX * GAMEPAD_LOOK_SPEED * padLook * step;
      pitch.current -= pad.lookY * GAMEPAD_LOOK_SPEED * padLook * step * upDown;
      turned = true;
    }
    if (!turned) return;
    pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    look.yaw = yaw.current;
    look.pitch = pitch.current;
  });
}
