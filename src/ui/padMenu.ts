import { useEffect, type RefObject } from "react";

import { readGamepad } from "../game/input/gamepad";
import { colors } from "./overlay";

/**
 * Menus a gamepad can use.
 *
 * The game claims Steam Deck support and has shipped a controller mapping
 * for the run itself since long before this tree existed - stick to walk,
 * A to interact, Start to pause. None of that reaches the DOM. Every menu
 * in the game is a column of `<button onClick>` with no focus handling, and
 * nothing under `src/ui` had ever read the pad. A player holding a
 * controller could not press Start on the title screen, could not resume
 * after pausing, could not quit, and could not restart after dying: the
 * game was unplayable with the only input a Deck has, from its first
 * screen, and every check we had passed because they all type.
 *
 * One owner for that, rather than a handler per menu: an overlay says which
 * element holds its buttons and what B means, and this drives it. The
 * d-pad or the left stick moves the focus, A presses what is focused, B
 * backs out. Which is what a console player will try without being told.
 *
 * The most recently mounted menu owns the pad, so a pause menu opened over
 * something else takes it and hands it back when it closes.
 */

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The focus ring, drawn by us: focus set from code is not `:focus-visible`. */
const RING = `2px solid ${colors.gold}`;
const RING_OFFSET = "3px";

/** Menus, innermost last. Only the last one reads the pad. */
const stack: symbol[] = [];

export interface PadMenuOptions {
  /** The element whose buttons this menu is made of. */
  container: RefObject<HTMLElement | null>;
  /** What B does, if anything. */
  onBack?: () => void;
  /** False while the menu is not on screen. */
  active?: boolean;
}

/**
 * Where a d-pad press takes the focus, from where the buttons actually are.
 *
 * The menus in this game were a column of buttons and the answer was "one
 * place along, either axis". Then the tome grew a keypad, and a keypad is a
 * grid: this took a `columns` count and moved by one or by a row. That was
 * enough for a menu that is only a grid, and no use at all for the Records
 * page, which is a text box, a button beside it, a keypad, and two more
 * buttons underneath - the last screen in the game a controller cannot use,
 * and the reason it stayed that way.
 *
 * So the rows are read off the page rather than declared. Anything whose
 * box overlaps another's vertically is on the same row as it; left and
 * right move within a row, up and down move to the nearest thing by
 * horizontal centre on the row above or below. Both wrap. A column of
 * buttons is then just a page where every row holds one thing, and behaves
 * exactly as it did - including left and right moving one place, because
 * with nothing else on the row that is the only sensible thing left to do.
 */
function move(list: HTMLElement[], here: number, dx: number, dy: number): number {
  // Nothing focused: the first press lands on an end rather than the second
  // item, which is the state a menu opens in.
  if (here < 0) return dx + dy > 0 ? 0 : list.length - 1;

  const boxes = list.map((el) => el.getBoundingClientRect());
  const mid = (i: number) => boxes[i].left + boxes[i].width / 2;
  const sameRow = (a: number, b: number) =>
    Math.min(boxes[a].bottom, boxes[b].bottom) - Math.max(boxes[a].top, boxes[b].top) > 0;

  if (dx) {
    const row = list.map((_, i) => i).filter((i) => sameRow(i, here));
    // Alone on its row - an ordinary menu button - so left and right do
    // what they have always done here and step through the whole list.
    if (row.length < 2) return (((here + dx) % list.length) + list.length) % list.length;
    row.sort((a, b) => mid(a) - mid(b));
    const at = row.indexOf(here);
    return row[(at + dx + row.length) % row.length];
  }

  // Rows in order down the page, then the one after this in the direction
  // asked for, wrapping round the ends.
  const rows: number[][] = [];
  for (const i of list.map((_, i) => i).sort((a, b) => boxes[a].top - boxes[b].top)) {
    const last = rows[rows.length - 1];
    if (last && sameRow(last[0], i)) last.push(i);
    else rows.push([i]);
  }
  const from = rows.findIndex((r) => r.includes(here));
  const to = rows[(from + dy + rows.length) % rows.length];
  // The nearest thing on that row to where the finger already was, so
  // moving down a keypad's column stays in that column.
  return to.reduce((best, i) => (Math.abs(mid(i) - mid(here)) < Math.abs(mid(best) - mid(here)) ? i : best));
}

export function usePadMenu({ container, onBack, active = true }: PadMenuOptions): void {
  useEffect(() => {
    if (!active) return;
    const id = Symbol("padMenu");
    stack.push(id);

    let ringed: HTMLElement | null = null;
    const ring = (el: HTMLElement | null) => {
      if (ringed && ringed !== el) {
        ringed.style.outline = "";
        ringed.style.outlineOffset = "";
      }
      ringed = el;
      if (el) {
        el.style.outline = RING;
        el.style.outlineOffset = RING_OFFSET;
        /**
         * And bring it into view.
         *
         * Panels scroll inside themselves now (see `panel` in overlay.ts),
         * because the delver picker's five cards are taller than a Steam
         * Deck's screen. A pad walking down that list would otherwise ring
         * a button nobody can see, which is worse than not ringing it at
         * all: the player presses A on something they cannot read.
         *
         * `nearest` rather than `center` so a list that already fits does
         * not jump on every press.
         */
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };

    const items = (): HTMLElement[] =>
      container.current ? [...container.current.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];

    /**
     * Where the focus is, as an index. -1 when the focus is somewhere else
     * entirely, which is the state a menu opens in: the first press of a
     * direction then lands on the first button rather than the second.
     */
    const at = (list: HTMLElement[]) => list.indexOf(document.activeElement as HTMLElement);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (stack[stack.length - 1] !== id) return;
      const pad = readGamepad();
      if (!pad.connected) {
        // A player who put the pad down and reached for the mouse should not
        // be looking at a focus ring they cannot move.
        ring(null);
        return;
      }
      // Backing out first, and whether or not there is anything to focus:
      // the tome shows its numbers for five to seven seconds before it
      // draws a single key, and "Esc or B leaves" is on screen the whole
      // time. A menu with nothing pressable still has a way out of it.
      if (pad.backPressed && onBack) onBack();

      const list = items();
      if (list.length === 0) return;

      if (pad.menuX || pad.menuY) {
        const next = move(list, at(list), pad.menuX, pad.menuY);
        list[next].focus();
        ring(list[next]);
      }
      if (pad.interactPressed) {
        const here = at(list);
        // Nothing focused yet: A is a reasonable way to take the default
        // action rather than a press that does nothing.
        const target = here < 0 ? list[0] : list[here];
        ring(target);
        target.click();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ring(null);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [container, onBack, active]);
}
