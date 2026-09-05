/**
 * Where the player is standing, right now.
 *
 * Not in the run store, and deliberately. The store is what the run *is* -
 * lives, gems, which room - and every write to it re-runs every selector
 * subscribed to it; a position written sixty times a second would make
 * that the most expensive fact in the game and the least interesting.
 *
 * But something outside the frame loop does occasionally need it. Putting
 * a device down happens on a keypress, in the store, and the one thing the
 * store cannot answer about placing something on the floor is where the
 * floor is being stood on. This is that answer, with one writer (the
 * player body, once a frame) and readers that only ever look at it in
 * response to something the player just did.
 *
 * Room-local, like everything else in a room: only one room is mounted and
 * it is always drawn at the origin.
 */
export const playerAt = { x: 0, z: 0 };

/** Called once a frame by the player body, and by nothing else. */
export function setPlayerAt(x: number, z: number): void {
  playerAt.x = x;
  playerAt.z = z;
}
