/**
 * The on-screen stick and the look drag, as plain module data.
 *
 * Written by the touch layer's pointer handlers and read from the frame
 * loop, the same shape as the pad and the keyboard and for the same
 * reason: a thumb on a stick moves every frame, and routing that through
 * React state would re-render the player at that rate.
 *
 * The buttons are not here. An on-screen button is a key whose code is
 * the action's name (`keyboard.pressAction`), so the trigger, the barring
 * and the sprint toggle read it through the same call they already make
 * for a key, and this module only carries what a key cannot: a stick that
 * is partly over, and a drag that is so many pixels.
 *
 * Look is accumulated, not held. A stick reports a position and the game
 * decides what a second of it is worth; a drag reports a distance, like a
 * mouse, and a long frame simply carries more of it - which is what the
 * thumb did. `takeTouchLook` hands the total over and zeroes it, so no
 * frame is counted twice and none is lost.
 */

const DEADZONE = 0.1;

interface TouchState {
  /** -1 (left) .. 1 (right) */
  moveX: number;
  /** -1 (forward) .. 1 (back): screen up is forward, like a stick. */
  moveY: number;
  /** The run: pushed on by the button or the stick's rim, off when the stick is let go. */
  sprint: boolean;
  /** The first time each was done, for the line that teaches them. */
  everMoved: boolean;
  everLooked: boolean;
}

const state: TouchState = {
  moveX: 0,
  moveY: 0,
  sprint: false,
  everMoved: false,
  everLooked: false,
};

const look = { x: 0, y: 0 };
/** Handed back by `takeTouchLook`, reused so a frame allocates nothing. */
const taken = { x: 0, y: 0 };

/** Something that renders wants to know when the sprint flips. */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

function shape(v: number): number {
  if (Math.abs(v) < DEADZONE) return 0;
  return Math.sign(v) * ((Math.abs(v) - DEADZONE) / (1 - DEADZONE));
}

/** The stick as it stands this frame. A read: any number of systems may ask. */
export const readTouch = (): Readonly<TouchState> => state;

/**
 * Where the stick is, as a fraction of its throw on each axis. Clamped to
 * the unit circle by the caller drawing the knob; a value past it is the
 * thumb over the rim, which is not more speed.
 */
export function setTouchStick(x: number, y: number): void {
  const mag = Math.hypot(x, y);
  const scale = mag > 1 ? 1 / mag : 1;
  state.moveX = shape(x * scale);
  state.moveY = shape(y * scale);
  if (!state.everMoved && (state.moveX !== 0 || state.moveY !== 0)) state.everMoved = true;
}

/** The thumb came off: nothing is pushed, and the run ends with the push. */
export function releaseTouchStick(): void {
  state.moveX = 0;
  state.moveY = 0;
  setTouchSprint(false);
}

export function setTouchSprint(on: boolean): void {
  if (state.sprint === on) return;
  state.sprint = on;
  notify();
}

/** So many pixels of drag since the last frame took them. */
export function addTouchLook(dx: number, dy: number): void {
  look.x += dx;
  look.y += dy;
  if (!state.everLooked && (dx !== 0 || dy !== 0)) state.everLooked = true;
}

/**
 * The drag accumulated since the last call, and zero from here. Returns
 * one reused object: read it before calling again.
 */
export function takeTouchLook(): Readonly<{ x: number; y: number }> {
  taken.x = look.x;
  taken.y = look.y;
  look.x = look.y = 0;
  return taken;
}

/** Everything let go: a menu opened, the tab was hidden, the layer unmounted. */
export function resetTouch(): void {
  releaseTouchStick();
  look.x = look.y = 0;
}

export function subscribeTouchSprint(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
