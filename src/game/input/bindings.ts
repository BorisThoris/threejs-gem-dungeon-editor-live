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

export const SLOT_ACTIONS = ["slot1", "slot2", "slot3", "slot4"] as const;

export const ACTIONS = [
  "forward",
  "back",
  "left",
  "right",
  "sprint",
  "interact",
  "shove",
  "lantern",
  "bar",
  "mark",
  "dropKey",
  ...SLOT_ACTIONS,
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
  shove: ["Space"],
  lantern: ["KeyF"],
  bar: ["KeyB"],
  mark: ["KeyM"],
  dropKey: ["KeyG"],
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
  shove: "Shove",
  lantern: "Lantern",
  bar: "Bar a door",
  mark: "Mark the map",
  dropKey: "Set the key down",
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

// Match complete physical codes: a saved "Key" or "Spacebar" is not a
// usable binding. Keypad extensions intentionally have an open suffix:
// https://www.w3.org/TR/uievents-code/#key-numpad-section
const KEY_CODES = /^(?:Key[A-Z]|Digit[0-9]|Arrow(?:Up|Down|Left|Right)|(?:Shift|Control|Alt|Bracket)(?:Left|Right)|Space|Comma|Period|Slash|Semicolon|Quote|Backslash|Minus|Equal|Backquote)$/;
const NUMPAD_CODE = /^Numpad[A-Za-z0-9]+$/;

export const bindable = (code: string): boolean =>
  code === code.trim() && !FORBIDDEN.has(code) && (KEY_CODES.test(code) || NUMPAD_CODE.test(code));

/** Standalone Ctrl/Alt may be bound; shortcut chords belong to the browser. */
export const isGameplayKey = (event: KeyboardEvent): boolean =>
  !event.repeat && !event.defaultPrevented && !event.metaKey
  && (!event.ctrlKey || /^Control(Left|Right)$/.test(event.code))
  && (!event.altKey || /^Alt(Left|Right)$/.test(event.code));

/**
 * Restore the same unique assignments the rebinding menu can create.
 * Saved rows claim their keys before missing/invalid rows receive defaults,
 * so adding an action cannot steal a player's existing key after an update.
 * An explicit empty row remains unbound. Conflicting saved rows resolve in
 * ACTIONS order; the existing unbound warning makes any lost key visible.
 */
export function restoreBindings(value: unknown): Bindings {
  const stored = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const restored = {} as Bindings;
  const claimed = new Set<string>();
  const take = (keys: string[]) => keys.filter((code) => {
    if (claimed.has(code)) return false;
    claimed.add(code);
    return true;
  });
  for (const action of ACTIONS) {
    const keys = Object.hasOwn(stored, action) ? stored[action] : undefined;
    if (Array.isArray(keys) && keys.every((code) => typeof code === "string" && bindable(code))) {
      restored[action] = take(keys);
    }
  }
  for (const action of ACTIONS) {
    if (!Object.hasOwn(restored, action)) restored[action] = take(DEFAULT_BINDINGS[action]);
  }
  return restored;
}

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
  if (!bindable(code)) return bindings;
  const next = {} as Bindings;
  for (const other of ACTIONS) {
    next[other] = other === action ? [code] : bindings[other].filter((k) => k !== code);
  }
  return next;
}

/** Actions left with no key at all, which the screen has to say. */
export const unbound = (bindings: Bindings): Action[] =>
  ACTIONS.filter((a) => bindings[a].length === 0);
