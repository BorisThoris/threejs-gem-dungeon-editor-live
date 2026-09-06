/**
 * Keyboard state as plain module data.
 *
 * Read from useFrame, never through React state: routing keydown through
 * setState re-rendered the player subtree on every OS auto-repeat, ~30 times
 * a second while W was held. Held keys are a set; presses are edge-triggered
 * and consumed once, so one tap of E opens exactly one door.
 *
 * A press carries its timestamp and is discarded unread after a short
 * window. That makes consumption independent of the order frame callbacks
 * happen to run in - nothing has to "end the frame" for everyone else.
 *
 * The window is a full second. It was 250 ms, which is shorter than one
 * frame on a slow machine, so a tap of E expired before any trigger had a
 * chance to read it. A second is long enough that a press slightly before
 * reaching a door still opens it, and short enough that one does not fire
 * a room later.
 *
 * An on-screen button is a key whose code is the action's name. The touch
 * layer calls `pressAction("interact")` and that lands in the same map a
 * keydown of E lands in, under the code "interact", so the trigger that
 * asks `consumeAction("interact")` finds it without knowing it was a
 * thumb. No key code can collide with one: every code the browser sends
 * starts with Key, Digit, Arrow and the like (`bindable` in bindings.ts is
 * the list), and no action is called that.
 */

import type { Action } from "./bindings";
import { keysFor } from "../state/settings";

const PRESS_TTL_MS = 1000;

const held = new Set<string>();
const pressed = new Map<string, number>();
let installed = 0;

function onKeyDown(event: KeyboardEvent) {
  if (event.repeat) return;
  held.add(event.code);
  pressed.set(event.code, performance.now());
}

function onKeyUp(event: KeyboardEvent) {
  held.delete(event.code);
}

function onBlur() {
  // A key released while the window was not focused never sends keyup.
  held.clear();
  pressed.clear();
}

/** Attach the listeners. Safe to call from several components; refcounted. */
export function installKeyboard(): () => void {
  if (installed++ === 0) {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
  }
  return () => {
    if (--installed === 0) {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      onBlur();
    }
  };
}

const fresh = (code: string): boolean => {
  const at = pressed.get(code);
  if (at === undefined) return false;
  if (performance.now() - at > PRESS_TTL_MS) {
    pressed.delete(code);
    return false;
  }
  return true;
};

export const keyboard = {
  isDown: (code: string): boolean => held.has(code),
  /** True once per keydown, for the first caller that asks. */
  consumePress: (code: string): boolean => fresh(code) && pressed.delete(code),
  /** True while a recent keydown is still unconsumed. */
  peekPress: (code: string): boolean => fresh(code),

  /**
   * The same three questions, asked of an action rather than a key.
   *
   * Everything in the game that reads the keyboard asks these now, and the
   * mapping is the player's (`state/settings.ts`, over
   * `input/bindings.ts`). Before this, every key was a literal at its call
   * site, which is fine while nobody may change them and impossible the
   * moment somebody may.
   *
   * An action may have several keys - W and Up are both forward - so
   * `held` is any of them, and a press is consumed from the first that has
   * one. Consuming exactly one matters: two keys bound to one action must
   * not fire it twice if a player is somehow holding both.
   */
  actionDown: (action: Action): boolean => keysFor(action).some((code) => held.has(code)),
  consumeAction: (action: Action): boolean => {
    if (fresh(action) && pressed.delete(action)) return true;
    for (const code of keysFor(action)) {
      if (fresh(code) && pressed.delete(code)) return true;
    }
    return false;
  },
  peekAction: (action: Action): boolean =>
    fresh(action) || keysFor(action).some((code) => fresh(code)),

  /**
   * An action pressed by something that is not a key - the on-screen
   * controls. Edge-triggered and consumed once, exactly as a keydown is.
   * There is no held equivalent: the one thing a thumb holds is the
   * stick, and that is `touch.ts`.
   */
  pressAction: (action: Action): void => {
    pressed.set(action, performance.now());
  },
};
