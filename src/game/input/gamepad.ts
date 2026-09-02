/**
 * Gamepad input, polled from the Gamepad API.
 *
 * A plain module rather than a hook: the API has to be polled every frame,
 * and routing that through React state would re-render the player on every
 * stick twitch. One mutable state object is reused, and the poll is memoised
 * per frame so movement and look read the same snapshot and a rising edge is
 * never consumed twice.
 */

export interface GamepadState {
  connected: boolean;
  /** -1 (left) .. 1 (right) */
  moveX: number;
  /** -1 (forward) .. 1 (back) */
  moveY: number;
  lookX: number;
  lookY: number;
  dash: boolean;
  /** Rising edge only. */
  interactPressed: boolean;
  pausePressed: boolean;
}

const DEADZONE = 0.18;
// Standard mapping: 0 = A / Cross, 9 = Start, 10 = L3.
const BUTTON_INTERACT = 0;
const BUTTON_PAUSE = 9;
const BUTTON_DASH = 10;

const previous = new Map<number, boolean>();

function deadzone(value: number): number {
  if (Math.abs(value) < DEADZONE) return 0;
  return Math.sign(value) * ((Math.abs(value) - DEADZONE) / (1 - DEADZONE));
}

function risingEdge(pad: Gamepad, index: number): boolean {
  const down = pad.buttons[index]?.pressed ?? false;
  const key = pad.index * 100 + index;
  const was = previous.get(key) ?? false;
  previous.set(key, down);
  return down && !was;
}

const state: GamepadState = {
  connected: false,
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  dash: false,
  interactPressed: false,
  pausePressed: false,
};

function clear(): GamepadState {
  state.connected = false;
  state.moveX = state.moveY = state.lookX = state.lookY = 0;
  state.dash = state.interactPressed = state.pausePressed = false;
  return state;
}

let lastPollAt = -1;

export function readGamepad(): GamepadState {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return clear();
  const now = performance.now();
  if (now - lastPollAt < 4) return state;
  lastPollAt = now;

  let pad: Gamepad | null = null;
  for (const candidate of navigator.getGamepads()) {
    if (candidate?.connected) {
      pad = candidate;
      break;
    }
  }
  if (!pad) return clear();

  state.connected = true;
  state.moveX = deadzone(pad.axes[0] ?? 0);
  state.moveY = deadzone(pad.axes[1] ?? 0);
  state.lookX = deadzone(pad.axes[2] ?? 0);
  state.lookY = deadzone(pad.axes[3] ?? 0);
  state.dash = pad.buttons[BUTTON_DASH]?.pressed ?? false;
  state.interactPressed = risingEdge(pad, BUTTON_INTERACT);
  state.pausePressed = risingEdge(pad, BUTTON_PAUSE);
  return state;
}
