/**
 * Gamepad input, polled once per animation frame.
 *
 * A plain module rather than a hook: the API has to be polled every frame,
 * and routing that through React state would re-render the player on every
 * stick twitch.
 *
 * The module owns the poll. It used to be the other way round - whoever
 * called `readGamepad` first did the polling, and a 4ms wall-clock window
 * decided whether the next caller got that answer or went and polled
 * again - and that quietly lost button presses. A rising edge is computed
 * against the previous poll, so a second poll in the same frame sees the
 * button already down and reports nothing; the four systems that read the
 * pad are spread across a frame, and the moment two of them fell more than
 * four milliseconds apart - which is most of a frame's budget on a Steam
 * Deck - the press reached the first and vanished before the second. The A
 * button worked in a quiet room and did nothing in a busy one, and Scene
 * carried a comment warning the next person not to add a reader.
 *
 * So: one `requestAnimationFrame` loop is the only thing that polls, edges
 * are true for exactly one frame, and `readGamepad` is a read. Any number
 * of systems can call it, in any order, and they all see the same frame.
 */
import { SATCHEL_SLOTS } from "../items/catalog";


export interface GamepadState {
  connected: boolean;
  /** -1 (left) .. 1 (right) */
  moveX: number;
  /** -1 (forward) .. 1 (back) */
  moveY: number;
  lookX: number;
  lookY: number;
  dash: boolean;
  /** Rising edge only, true for one frame. */
  interactPressed: boolean;
  pausePressed: boolean;
  /**
   * A rising edge per satchel slot, one button each: X, Y, then the two
   * shoulders. There were two of these, for a satchel of four, so the back
   * half of what a player was carrying could not be reached with the only
   * input a Steam Deck has.
   */
  slotPressed: boolean[];
  /** B / Circle: back out of a menu. Rising edge. */
  backPressed: boolean;
  /**
   * One step of the d-pad or the left stick, for menus. Rising edge, and
   * repeating while held so a list can be scrolled without letting go.
   */
  menuX: -1 | 0 | 1;
  menuY: -1 | 0 | 1;
}

const DEADZONE = 0.18;
/** Past this the left stick counts as a d-pad press, for menus. */
const MENU_THRESHOLD = 0.6;
// Standard mapping: 0 = A / Cross, 1 = B / Circle, 9 = Start, 10 = L3.
const BUTTON_INTERACT = 0;
const BUTTON_BACK = 1;
const BUTTON_PAUSE = 9;
const BUTTON_DASH = 10;
// 2 = X / Square, 3 = Y / Triangle, 4 = LB / L1, 5 = RB / R1. One per
// satchel slot, in that order, so the list is as long as the satchel is.
const BUTTON_SLOTS = [2, 3, 4, 5].slice(0, SATCHEL_SLOTS);
// 12..15 = d-pad up, down, left, right.
const DPAD = { up: 12, down: 13, left: 14, right: 15 };

/** How long a menu direction waits before repeating, and how fast, in ms. */
const REPEAT_DELAY = 420;
const REPEAT_EVERY = 130;

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
  slotPressed: BUTTON_SLOTS.map(() => false),
  backPressed: false,
  menuX: 0,
  menuY: 0,
};

function clear(): void {
  state.connected = false;
  state.moveX = state.moveY = state.lookX = state.lookY = 0;
  state.dash = state.interactPressed = state.pausePressed = state.backPressed = false;
  state.slotPressed.fill(false);
  state.menuX = state.menuY = 0;
  held.x = held.y = 0;
}

/** Which way a menu direction is held, and when it last stepped. */
const held = { x: 0, y: 0, since: 0, last: 0 };

/**
 * One step of a menu direction: on the press, then again after a pause,
 * then steadily - the way a key repeats, so a long list is scrollable
 * without letting go and a single tap moves exactly one place.
 */
function menuStep(x: number, y: number, now: number): { x: -1 | 0 | 1; y: -1 | 0 | 1 } {
  const none = { x: 0, y: 0 } as const;
  if (x === 0 && y === 0) {
    held.x = held.y = 0;
    return none;
  }
  if (x !== held.x || y !== held.y) {
    held.x = x;
    held.y = y;
    held.since = now;
    held.last = now;
    return { x: x as -1 | 0 | 1, y: y as -1 | 0 | 1 };
  }
  const due = now - held.since >= REPEAT_DELAY && now - held.last >= REPEAT_EVERY;
  if (!due) return none;
  held.last = now;
  return { x: x as -1 | 0 | 1, y: y as -1 | 0 | 1 };
}

function poll(now: number): void {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return clear();

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
  state.backPressed = risingEdge(pad, BUTTON_BACK);
  state.pausePressed = risingEdge(pad, BUTTON_PAUSE);
  for (let i = 0; i < BUTTON_SLOTS.length; i++) state.slotPressed[i] = risingEdge(pad, BUTTON_SLOTS[i]);

  // The d-pad and the left stick drive a menu the same way, so a player who
  // reaches for either gets what they expected.
  const down = (i: number) => pad.buttons[i]?.pressed ?? false;
  const stickX = pad.axes[0] ?? 0;
  const stickY = pad.axes[1] ?? 0;
  const x =
    (down(DPAD.right) || stickX > MENU_THRESHOLD ? 1 : 0) -
    (down(DPAD.left) || stickX < -MENU_THRESHOLD ? 1 : 0);
  const y =
    (down(DPAD.down) || stickY > MENU_THRESHOLD ? 1 : 0) -
    (down(DPAD.up) || stickY < -MENU_THRESHOLD ? 1 : 0);
  const step = menuStep(x, y, now);
  state.menuX = step.x;
  state.menuY = step.y;
}

if (typeof window !== "undefined" && typeof requestAnimationFrame === "function") {
  const tick = (now: number) => {
    poll(now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * The pad as it stands this frame. A read, not a poll: call it from as many
 * systems as you like, in any order, and they all see the same answer.
 */
export function readGamepad(): GamepadState {
  return state;
}
