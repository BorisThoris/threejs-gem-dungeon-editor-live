import type { Room } from "../dungeon/types";

/** Each generated grid address belongs to one room on one floor. Opening a
 * secret replaces the room and its links, but preserves that address object.
 * New floors (including replaying the same seed) create new addresses, so
 * transient creature memory survives topology edits without leaking to a run.
 * The weak keys also let discarded floors be collected. */
export function createRoomMemory<T extends object>() {
  const states = new WeakMap<Room["grid"], T>();
  return (room: Room, create: () => T): T => {
    let state = states.get(room.grid);
    if (!state) {
      state = create();
      states.set(room.grid, state);
    }
    return state;
  };
}
