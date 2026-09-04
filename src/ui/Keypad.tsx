import { useRef, type CSSProperties } from "react";

import { colors, text, FONT } from "./overlay";
import { usePadMenu } from "./padMenu";

/**
 * Numbers you can enter without a keyboard.
 *
 * The tome of numbers - the whole point of the library, and one of the ten
 * kinds of room the game builds - listened for digits on the window and
 * drew nothing to press. There was no way to answer it with a controller,
 * which is the only input a Steam Deck has, so a player on the platform
 * this demo is aimed at could open the book, read the sequence, and then
 * sit there. Every check we had passed because they all type: the same
 * hole, in the same shape, as the title screen a controller could not
 * start.
 *
 * The keys never take focus from a mouse click - `onMouseDown` is
 * prevented - so a player using the keyboard or the mouse is exactly where
 * they were: the window listener still owns the digits, Space still
 * commits, and pressing Enter can never re-fire a button somebody clicked
 * earlier. The pad path is `usePadMenu`, which focuses and clicks in code,
 * and is untouched by that.
 */

export interface KeypadAction {
  label: string;
  onPress: () => void;
  /** Drawn dim, because pressing it now would do nothing. Still reachable. */
  disabled?: boolean;
}

export interface KeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  /** The key that finishes a number or an entry, if there is one. */
  action?: KeypadAction;
  /** What B does. */
  onBack?: () => void;
  /**
   * False when the keypad sits inside a menu that already reads the pad -
   * the Records page is a text box, a button, these keys and two more
   * buttons, and it is one menu. Only the most recently mounted menu owns
   * the pad, so a keypad that registered its own would take it and never
   * give it back, and the buttons around it would go dead.
   */
  ownsPad?: boolean;
}

const COLUMNS = 3;
/** Laid out as a telephone keypad, ending with backspace, zero and commit. */
const DIGITS = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

const key: CSSProperties = {
  fontFamily: FONT,
  fontSize: text.small,
  color: colors.ink,
  background: "rgba(255,255,255,0.06)",
  border: `1px solid ${colors.line}`,
  borderRadius: 6,
  padding: "10px 0",
  cursor: "pointer",
};

export function Keypad({ onDigit, onBackspace, action, onBack, ownsPad = true }: KeypadProps) {
  const grid = useRef<HTMLDivElement>(null);
  usePadMenu({ container: grid, onBack, active: ownsPad });

  // Prevented so a click never leaves the focus on a key: with one focused,
  // Space and Enter would press it again as well as doing what they mean.
  const noFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      ref={grid}
      data-testid="keypad"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
        gap: 6,
        maxWidth: 220,
        margin: "0 auto",
      }}
    >
      {DIGITS.map((d) => (
        <button key={d} type="button" style={key} onMouseDown={noFocus} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button type="button" style={key} onMouseDown={noFocus} onClick={onBackspace} aria-label="backspace">
        ←
      </button>
      <button key="0" type="button" style={key} onMouseDown={noFocus} onClick={() => onDigit("0")}>
        0
      </button>
      {action && (
        // Dimmed when it would do nothing, never disabled: a disabled
        // button drops out of the focusable set, so the grid would be
        // eleven keys wide one moment and twelve the next and the d-pad
        // would land somewhere different depending on what had been typed.
        // The caller's handler is what decides an empty press does nothing.
        <button
          type="button"
          style={{ ...key, color: action.disabled ? colors.dim : colors.gold }}
          onMouseDown={noFocus}
          onClick={action.onPress}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
