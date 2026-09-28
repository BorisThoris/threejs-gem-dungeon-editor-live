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
export const playerAt = {
  x: 0,
  z: 0,
  /**
   * How fast the player is crossing the floor, in units per second.
   *
   * Here rather than derived by each reader, because the ladder asks it
   * from three places at frame rate and the honest answer needs the
   * previous frame's position - a fact only this module has. Movement is
   * one of the three separable inputs a creature's awareness is built
   * from, and it is separable precisely so a player can do something about
   * it: standing still is a move, and a peripheral cone is three times as
   * sensitive to motion as it is to light.
   */
  speed: 0,
  /** Actual strides, published by Player alongside footsteps and sprint noise. */
  gait: "still" as "still" | "walking" | "running",
};

let lastX = 0;
let lastZ = 0;

/** The player body supplies elapsed physics time, which may span several
 * steps or none on a fast render frame. Omit it for a teleport. */
export function setPlayerAt(x: number, z: number, physicsDelta?: number): void {
  // A room change teleports the body, and a teleport is not a sprint: a
  // frame where the position jumps across the floor would otherwise read
  // as the loudest movement in the game to everything watching.
  const moved = Math.hypot(x - lastX, z - lastZ);
  if (physicsDelta === undefined) {
    playerAt.speed = 0;
    playerAt.gait = "still";
  } else if (physicsDelta > 0) {
    playerAt.speed = moved < 8 ? moved / physicsDelta : 0;
  }
  lastX = x;
  lastZ = z;
  playerAt.x = x;
  playerAt.z = z;
}
