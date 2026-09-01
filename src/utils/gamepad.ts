/**
 * Gamepad input, read straight from the Gamepad API.
 *
 * The game was keyboard-and-mouse only. Steam Deck's compatibility review
 * checks full controller support, and a first-person game that cannot be
 * played on a pad is not going to review well there.
 *
 * Deliberately a plain module rather than a hook: the Gamepad API has to be
 * polled every frame, and routing that through React state would re-render the
 * player on every stick twitch.
 */

export interface GamepadState {
  connected: boolean;
  /** -1 (left) .. 1 (right) */
  moveX: number;
  /** -1 (forward) .. 1 (back) */
  moveY: number;
  /** Right stick, for looking. */
  lookX: number;
  lookY: number;
  dash: boolean;
  /** Rising edge only - true for the single frame the button goes down. */
  interactPressed: boolean;
  pausePressed: boolean;
}

const DEADZONE = 0.18;

// Standard mapping: 0=A/Cross, 9=Start, 6/7=triggers, 10=L3.
const BUTTON_INTERACT = 0;
const BUTTON_PAUSE = 9;
const BUTTON_DASH = 10;

const previousButtons = new Map<number, boolean>();

/** Radial-ish deadzone: below the threshold is exactly zero, above it rescales
 *  from zero so there is no jump at the edge of the dead area. */
function applyDeadzone(value: number): number {
  if (Math.abs(value) < DEADZONE) return 0;
  const sign = Math.sign(value);
  return sign * ((Math.abs(value) - DEADZONE) / (1 - DEADZONE));
}

function risingEdge(pad: Gamepad, index: number): boolean {
  const pressed = pad.buttons[index]?.pressed ?? false;
  const key = pad.index * 100 + index;
  const was = previousButtons.get(key) ?? false;
  previousButtons.set(key, pressed);
  return pressed && !was;
}

const IDLE: GamepadState = {
  connected: false,
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  dash: false,
  interactPressed: false,
  pausePressed: false,
};

export function readGamepad(): GamepadState {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return IDLE;

  // getGamepads() returns a live-ish snapshot with nulls for empty slots.
  const pads = navigator.getGamepads();
  let pad: Gamepad | null = null;
  for (const candidate of pads) {
    if (candidate && candidate.connected) {
      pad = candidate;
      break;
    }
  }
  if (!pad) return IDLE;

  return {
    connected: true,
    moveX: applyDeadzone(pad.axes[0] ?? 0),
    moveY: applyDeadzone(pad.axes[1] ?? 0),
    lookX: applyDeadzone(pad.axes[2] ?? 0),
    lookY: applyDeadzone(pad.axes[3] ?? 0),
    dash: (pad.buttons[BUTTON_DASH]?.pressed ?? false) ||
      (pad.buttons[BUTTON_INTERACT]?.value ?? 0) > 0.9,
    interactPressed: risingEdge(pad, BUTTON_INTERACT),
    pausePressed: risingEdge(pad, BUTTON_PAUSE),
  };
}

export function isGamepadConnected(): boolean {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return false;
  return Array.from(navigator.getGamepads()).some((p) => p && p.connected);
}
