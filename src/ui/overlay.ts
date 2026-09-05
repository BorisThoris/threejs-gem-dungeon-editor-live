import type { CSSProperties } from "react";

/**
 * Shared look for every DOM overlay: one font, one palette, one set of
 * button styles. The old tree had a 200-colour theme system for a game
 * with one look.
 */
export const FONT = "'Press Start 2P', 'Courier New', monospace";

/** Seconds as m:ss, for run times. */
export const clock = (s: number): string =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Text sizes scale with the viewport width between a floor and a cap: a
 * fixed 11px was unreadable on a Steam Deck's 7-inch 1280x800 panel and
 * needlessly small on a 4K desktop. At 1280 wide these come out around
 * 14-15px; at 1920 they hit their caps.
 */
export const text = {
  small: "clamp(11px, 1.05vw, 15px)",
  body: "clamp(12px, 1.15vw, 16px)",
  title: "clamp(18px, 1.9vw, 26px)",
  chip: "clamp(12px, 1.2vw, 16px)",
};

export const colors = {
  ink: "#f2f4f8",
  dim: "#aab0bd",
  accent: "#7fe3ff",
  danger: "#f08196",
  gold: "#ffd479",
  panel: "rgba(10, 12, 18, 0.86)",
  line: "rgba(255,255,255,0.14)",
};

export const fullscreen: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: FONT,
  color: colors.ink,
  zIndex: 1000,
};

/**
 * Every full-screen panel in the game: the title, the pause menu, the run
 * summary, the records, the delvers.
 *
 * The height rule is not decoration. Panels were sized by their contents
 * with nowhere for the overflow to go, which is fine for four buttons and
 * wrong the first time one of them holds a list: the delver picker's five
 * cards ran off the bottom of a 1280x800 window, and 1280x800 is the Steam
 * Deck's screen exactly. What that looked like was not a scrollbar - it
 * was a button that could be seen and could not be pressed, because it was
 * outside the viewport. Capped at the window less its margins, and it
 * scrolls inside itself when it has to.
 *
 * `overscrollBehavior` so a flick at the end of the list does not scroll
 * the page behind it, and the gamepad menu's focus ring calls
 * `scrollIntoView`, so a pad walks the list as well as a mouse does.
 */
export const panel: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.line}`,
  borderRadius: 8,
  padding: "28px 32px",
  minWidth: 320,
  maxWidth: 520,
  maxHeight: "calc(100vh - 48px)",
  overflowY: "auto",
  overscrollBehavior: "contain",
  /**
   * With the padding inside the cap, not added to it.
   *
   * The first attempt at the height rule set `maxHeight` and left
   * `box-sizing` at its default, which measures the cap against the
   * content box: 752 of content plus 56 of padding is 808, in a window
   * 800 tall. The panel scrolled and was still eight pixels too big, and
   * the card at the bottom stayed unreachable - which looked exactly like
   * the fix not working. Measured in the browser rather than guessed at:
   * `clientHeight` 808 against a `maxHeight` of 752 is the whole bug in
   * two numbers.
   */
  boxSizing: "border-box",
  textAlign: "center",
};

export const title: CSSProperties = {
  fontSize: text.title,
  letterSpacing: "0.06em",
  margin: "0 0 18px",
};

export const body: CSSProperties = {
  fontSize: text.body,
  lineHeight: 1.8,
  color: colors.dim,
  margin: "0 0 22px",
};

export const button: CSSProperties = {
  display: "block",
  width: "100%",
  margin: "0 0 10px",
  padding: "12px 16px",
  fontFamily: FONT,
  fontSize: text.body,
  letterSpacing: "0.05em",
  color: "#0a0c12",
  background: colors.accent,
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

export const secondaryButton: CSSProperties = {
  ...button,
  color: colors.ink,
  background: "transparent",
  border: `1px solid ${colors.line}`,
};

export const chip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "2.2em",
  height: "2.2em",
  borderRadius: 4,
  fontSize: text.chip,
  color: "#0a0c12",
};
