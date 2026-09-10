import type { CSSProperties } from "react";

import { device } from "../game/input/device";

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
/**
 * The player's own scale, as a CSS variable the sizes below multiply by.
 *
 * A custom property rather than a number threaded through every component:
 * every size in this file is already a `clamp`, and multiplying inside the
 * clamp keeps the floor and the ceiling meaning what they meant - the
 * smallest readable size and the largest sensible one, both scaled. Set
 * once on the document root by `useUiScale`, so a change costs one style
 * write rather than a re-render of every overlay in the game.
 *
 * It exists for the Deck first. 1280x800 is a seven-inch screen held at
 * arm's length, and text sized for a monitor at that distance is text
 * nobody reads.
 */
export const UI_SCALE_VAR = "--gd-ui-scale";
const scale = (min: number, vw: number, max: number): string =>
  `clamp(calc(${min}px * var(${UI_SCALE_VAR}, 1)), calc(${vw}vw * var(${UI_SCALE_VAR}, 1)), calc(${max}px * var(${UI_SCALE_VAR}, 1)))`;

export const text = {
  small: scale(11, 1.05, 15),
  body: scale(12, 1.15, 16),
  title: scale(18, 1.9, 26),
  chip: scale(12, 1.2, 16),
};

/**
 * How big the minimap's dial is, and how much smaller it is drawn on a
 * phone, for the things that have to sit beside it: the pause button and
 * the deed toast. Here rather than in Minimap.tsx so that file exports
 * only a component. Scaled rather than rebuilt - the cells and the rim
 * are worked out from the size and are right at any scale - because a
 * phone held sideways is under four hundred pixels tall and a dial of a
 * hundred and ninety is half of it.
 */
export const MINIMAP_SIZE = 190;
export const MINIMAP_SCALE = device === "phone" ? 0.68 : 1;

/**
 * The one palette every overlay in the game reads from - and it used to
 * belong to a different game than the one behind it.
 *
 * Ink was blue-white, dim was blue-grey, the accent was a cyan that
 * appeared nowhere in the dungeon, and the panels were a blue-black. So
 * every readout, prompt, menu and summary was lit by a colour no torch in
 * the world could make, sitting on top of rooms lit by fire. That is most
 * of what "the UI feels stuck on top of the game" actually is: not the
 * layout, the temperature.
 *
 * These come off the world instead. The accent is the same lamp gold that
 * burns over an exit you can afford, so the colour that means "this is the
 * way on" means it in both places; danger is the same dull red as the exit
 * you cannot; ink and dim are lamplit paper rather than screen white; and
 * the panel is the warm near-black of stone out of the torchlight, so a
 * menu reads as something laid over the dungeon rather than a window cut
 * out of it.
 */
export const colors = {
  ink: "#f4ead9",
  dim: "#b5a692",
  accent: "#f0ad46",
  danger: "#d05a58",
  gold: "#f2c86e",
  panel: "rgba(19, 15, 12, 0.88)",
  line: "rgba(238, 216, 184, 0.16)",
};

/** What sits ON the accent: the warm dark of the stone, not a blue-black. */
export const onAccent = "#1b1309";

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
  color: onAccent,
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
  color: onAccent,
};
