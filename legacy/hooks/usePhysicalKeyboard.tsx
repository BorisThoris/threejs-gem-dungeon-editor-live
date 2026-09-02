import { useEffect, useRef } from "react";

export type KeyState = Record<string, boolean>;

/**
 * Which keys are currently held.
 *
 * This used to keep the key map in React state and build a new object on every
 * keydown. Browsers repeat keydown while a key is held - roughly thirty times a
 * second - and a fresh object identity every time meant React could never bail
 * out, so simply walking forward re-rendered the player and its entire subtree
 * at the auto-repeat rate. That showed up as stuttering that only happened
 * while moving.
 *
 * Nothing renders from this: the only reader is the movement code inside
 * useFrame, which is polled every frame anyway. So the state lives in a ref and
 * pressing keys now causes no re-renders at all.
 */
export const usePhysicalKeyboard = () => {
  const keys = useRef<KeyState>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Auto-repeat tells us nothing new - the key is already down.
      if (event.repeat) return;
      keys.current[event.code] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };

    // Losing focus mid-stride otherwise leaves the key stuck down and the
    // player walking into a wall forever.
    const handleBlur = () => {
      keys.current = {};
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return keys;
};
