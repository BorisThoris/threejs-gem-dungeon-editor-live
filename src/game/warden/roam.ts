import { bfsDepth, shortestPath } from "../dungeon/generate";
import { roomById, type Dungeon } from "../dungeon/types";

/**
 * Which room the Warden is in, and which it walks to next.
 *
 * Only one room of the dungeon is ever mounted, so the Warden's position
 * between rooms is a room id and nothing else. It hunts by walking the
 * shortest path towards the player and wanders by taking any doorway but
 * the one it came through, so a calm floor still feels lived in rather
 * than watched.
 */

/** The room farthest from the player: where it wakes up. */
export function wakingRoom(dungeon: Dungeon, playerRoomId: string): string | null {
  const depth = bfsDepth(dungeon.rooms, playerRoomId);
  let best: string | null = null;
  let bestDepth = -1;
  for (const room of dungeon.rooms) {
    if (room.id === playerRoomId || room.id === dungeon.endId) continue;
    const d = depth.get(room.id) ?? -1;
    if (d > bestDepth) {
      bestDepth = d;
      best = room.id;
    }
  }
  return best;
}

/** Where it is thrown to after it lands a hit: `away` doorways off, if it can get that far. */
export function banishTo(dungeon: Dungeon, playerRoomId: string, away: number): string | null {
  const depth = bfsDepth(dungeon.rooms, playerRoomId);
  const reachable = dungeon.rooms.filter((r) => (depth.get(r.id) ?? 0) >= away && r.id !== playerRoomId);
  if (reachable.length) return reachable[0].id;
  return wakingRoom(dungeon, playerRoomId);
}

/**
 * The next room on its walk. Hunting takes the shortest path to the player;
 * wandering takes any neighbour, preferring not to double back.
 */
export function nextRoom(
  dungeon: Dungeon,
  fromId: string,
  playerRoomId: string,
  hunts: boolean,
  cameFrom: string | null,
  random: number
): string | null {
  const room = roomById(dungeon, fromId);
  if (!room) return null;
  const exits = Object.values(room.links).filter((id): id is string => Boolean(id));
  if (exits.length === 0) return null;

  if (hunts) {
    const path = shortestPath(dungeon.rooms, fromId, playerRoomId);
    if (path && path.length > 1) return path[1];
  }
  const onward = exits.filter((id) => id !== cameFrom);
  const choices = onward.length ? onward : exits;
  return choices[Math.floor(random * choices.length) % choices.length];
}
