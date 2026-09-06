import { DIRS, type Dir, type Dungeon } from "../dungeon/types";
import { KEEPER_FLOOR } from "../world";

/** A doorway into the exit room, seen from the room the player stands in. */
export interface KeeperPost {
  roomId: string;
  dir: Dir;
}

/**
 * Where the Keeper stands: every doorway into the exit room, on the
 * player's side of it, on the Keeper's floor and nowhere else. One
 * Keeper however many doors the exit has - one state in the store, drawn
 * at each post - so there is no door it is not at. One owner of the
 * question, for the room that mounts it, the store that refuses the exit
 * and the checks.
 */
export function keeperPostsFor(d: Dungeon, floor: number): KeeperPost[] {
  if (floor !== KEEPER_FLOOR) return [];
  const posts: KeeperPost[] = [];
  for (const r of d.rooms) for (const dir of DIRS) if (r.links[dir] === d.endId) posts.push({ roomId: r.id, dir });
  return posts;
}
