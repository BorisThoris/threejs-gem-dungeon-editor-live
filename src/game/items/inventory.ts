/** Backpack storage and the four immediately usable belt positions are separate. */
export const BACKPACK_SLOTS = 16;
export const COURIER_BACKPACK_SLOTS = 12;
export const QUICK_SLOTS = 4;

/** Exchange two occupied slots without consuming, identifying or duplicating loot. */
export function swapInventorySlots<T>(items: readonly T[], from: number, to: number): T[] | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to ||
    from < 0 || to < 0 || from >= items.length || to >= items.length) return null;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
