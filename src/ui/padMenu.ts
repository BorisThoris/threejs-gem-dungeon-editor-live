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
  /**
   * How wide the menu is, if it is a grid rather than a list. Left and
   * right then move one place and up and down move a row, which is what
   * anyone pointing a d-pad at a keypad expects. Left at 1 - a column of
   * buttons - both axes move one place, which is what every menu in the
   * game was before there was a keypad in it.
   */
  columns?: number;
}

export function usePadMenu({ container, onBack, active = true, columns = 1 }: PadMenuOptions): void {
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
      const list = items();
      if (list.length === 0) return;

      // A row is worth `columns` places, a column one. Both wrap through
      // the whole list, so a grid whose last row is short is still every
      // button in it and nothing can be focused that is not there.
      const step = pad.menuX + pad.menuY * columns;
      if (step !== 0) {
        const here = at(list);
        const next =
          here < 0
            ? step > 0
              ? 0
              : list.length - 1
            : (((here + step) % list.length) + list.length) % list.length;
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
      if (pad.backPressed && onBack) onBack();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ring(null);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [container, onBack, active, columns]);
}
