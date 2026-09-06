/**
 * Which key does what, and the fact that a player may change it.
 *
 * Every key the game reads was a literal at its call site - `"KeyW"` in
 * the player, `"KeyE"` in the trigger, `"KeyB"` in the barring, four
 * digits in App. That is fine while nobody may change them and impossible
 * the moment somebody may, so this is the one owner of the mapping and
 * everything that reads a key asks here.
 *
 * An action can have more than one key: W and the up arrow are both
 * forward, and both shifts are the sprint, because that is what people
 * expect and neither is worth making them choose between. Rebinding
 * replaces the whole list for that action with the one key they pressed.
 *
 * Codes, not characters. `event.code` is the physical key, so a binding
 * made on a QWERTY keyboard still works on AZERTY and a game bound to
 * "the key left of S" stays bound to it. `keyLabel` below is the only
 * place that turns one back into something a person reads.
 */

export const ACTIONS = [
  "forward",
  "back",
  "left",
  "right",
  "sprint",
  "interact",
  "lantern",
  "bar",
  "mark",
  "slot1",
  "slot2",
  "slot3",
  "slot4",
] as const;
export type Action = (typeof ACTIONS)[number];

export type Bindings = Record<Action, string[]>;

export const DEFAULT_BINDINGS: Bindings = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  sprint: ["ShiftLeft", "ShiftRight"],
  interact: ["KeyE"],
  lantern: ["KeyF"],
  bar: ["KeyB"],
  mark: ["KeyM"],
  slot1: ["Digit1"],
  slot2: ["Digit2"],
  slot3: ["Digit3"],
  slot4: ["Digit4"],
};

/** What each action is called where a player reads it. */
export const ACTION_LABEL: Record<Action, string> = {
  forward: "Forward",
  // "Backward", not "Back": every menu in the game has a Back button, and
  // a key row labelled the same thing is ambiguous to a player scanning
  // the screen and to anything driving it by its text. A harness looking
  // for the page's Back button found this row instead, clicked it, and
  // then bound the next key pressed to walking backwards.
  back: "Backward",
  left: "Left",
  right: "Right",
  sprint: "Run",
  interact: "Use",
  lantern: "Lantern",
  bar: "Bar a door",
  mark: "Mark the map",
  slot1: "Satchel 1",
  slot2: "Satchel 2",
  slot3: "Satchel 3",
  slot4: "Satchel 4",
};

/**
 * Keys that may not be bound to anything.
 *
 * Escape pauses and is how a player gets the pointer back, and a game that
 * lets you bind it away is a game you can get stuck in. The rest are the
 * browser's own and would be taken before the page saw them.
 */
const FORBIDDEN = new Set(["Escape", "Tab", "F5", "F11", "F12", "MetaLeft", "MetaRight"]);

export const bindable = (code: string): boolean =>
  !FORBIDDEN.has(code) && /^(Key|Digit|Numpad|Arrow|Shift|Control|Alt|Space|Comma|Period|Slash|Semicolon|Quote|Bracket|Backslash|Minus|Equal|Backquote)/.test(code);

/** "KeyW" -> "W", "ArrowUp" -> "Up", "ShiftLeft" -> "Left Shift". */
export function keyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  if (code.startsWith("Arrow")) return code.slice(5);
  if (code === "ShiftLeft") return "Left Shift";
  if (code === "ShiftRight") return "Right Shift";
  if (code === "ControlLeft") return "Left Ctrl";
  if (code === "ControlRight") return "Right Ctrl";
  if (code === "AltLeft") return "Left Alt";
  if (code === "AltRight") return "Right Alt";
  if (code === "Space") return "Space";
  return code;
}

/** What a row of keys reads as: "W or Up". */
export const keysLabel = (codes: readonly string[]): string =>
  codes.map(keyLabel).join(" or ") || "unbound";

/**
 * Whatever else was bound to this key, unbound.
 *
 * Two actions on one key is a game where pressing it does two things, and
 * the player who bound it second is the one who finds out. Taking it off
 * the other action is the behaviour every game with a rebinding screen
 * has, and it is the only one that cannot leave the player stuck: a
 * refusal would mean an action they cannot bind without first finding
 * which other row is holding the key.
 */
export function bindTo(bindings: Bindings, action: Action, code: string): Bindings {
  const next = {} as Bindings;
  for (const other of ACTIONS) {
    next[other] = other === action ? [code] : bindings[other].filter((k) => k !== code);
  }
  return next;
}

/** Actions left with no key at all, which the screen has to say. */
export const unbound = (bindings: Bindings): Action[] =>
  ACTIONS.filter((a) => bindings[a].length === 0);
