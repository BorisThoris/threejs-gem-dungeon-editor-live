import { createRng } from "../rng";
import {
  DOOR_WIDTH,
  GROUND_Y,
  INTERACT_RADIUS,
  PLAYER_SPAWN_Y,
  entranceDepth,
} from "../world";
import {
  DIRS,
  DIR_STEP,
  DIR_YAW,
  OPPOSITE,
  halfSize,
  type Dir,
  type Room,
} from "./types";

export type Vec3 = [number, number, number];

/**
 * Where things are in a room.
 *
 * Doors, spawn points, the gem, the spike ring and the dressing anchors all
 * used to be computed in different files from different notions of the
 * room's size, and the recurring bug of this project was two of them
 * disagreeing. Every position now comes from here, from `room.size` alone,
 * in room-local coordinates with the room centred at the origin.
 */

/** Centre of the doorway in a wall. */
export function doorPosition(room: Room, dir: Dir): Vec3 {
  const half = halfSize(room);
  const step = DIR_STEP[dir];
  return [step.x * half, GROUND_Y, step.z * half];
}

/** Yaw of a door mesh so it faces into the room. */
export const doorYaw = (dir: Dir): number => DIR_YAW[OPPOSITE[dir]];

export interface Spawn {
  position: Vec3;
  /** Camera yaw, radians. */
  yaw: number;
}

/**
 * Where the player lands after walking `heading` out of the previous room:
 * just inside the wall they came through, facing onward.
 */
export function spawnAfterTravel(room: Room, heading: Dir): Spawn {
  const half = halfSize(room);
  const depth = entranceDepth(half);
  const from = DIR_STEP[OPPOSITE[heading]];
  return {
    position: [from.x * (half - depth), PLAYER_SPAWN_Y, from.z * (half - depth)],
    yaw: DIR_YAW[heading],
  };
}

/** Where a run begins: the middle of the start room, facing north. */
export const spawnAtStart = (): Spawn => ({
  position: [0, PLAYER_SPAWN_Y, 0],
  yaw: 0,
});

/**
 * Half-width of the lane kept clear along each axis. A doorway is DOOR_WIDTH
 * wide and the path between two doorways runs straight through the centre,
 * so nothing solid may stand within this of either axis.
 */
export const LANE_HALF_WIDTH = DOOR_WIDTH / 2 + 1.25;

/** True when a room-local point would stand in a doorway's path. */
export const inDoorLane = (x: number, z: number): boolean =>
  Math.abs(x) < LANE_HALF_WIDTH || Math.abs(z) < LANE_HALF_WIDTH;

/**
 * Anchor points in the four diagonal quadrants at a fraction of the
 * half-extent, floored so a prop's edge never creeps into a lane in a small
 * room. Diagonals are the only part of a four-doored room that is never on a
 * path between doorways.
 */
export function quadrantSpots(room: Room, spread: number): Vec3[] {
  const r = halfSize(room) * spread;
  const d = Math.max(r / Math.SQRT2, LANE_HALF_WIDTH + 0.9);
  return [
    [d, GROUND_Y, d],
    [-d, GROUND_Y, d],
    [d, GROUND_Y, -d],
    [-d, GROUND_Y, -d],
  ];
}

/** The four corners, pulled in far enough that a torch is not inside the wall. */
export function cornerSpots(room: Room): Vec3[] {
  const c = Math.max(1.5, halfSize(room) - 1.6);
  return [
    [c, GROUND_Y, c],
    [-c, GROUND_Y, c],
    [c, GROUND_Y, -c],
    [-c, GROUND_Y, -c],
  ];
}

/**
 * The gem sits in a diagonal quadrant, never in a lane and never on top of a
 * door, at a spot chosen by the room's seed so it is the same every visit.
 */
export function gemPosition(room: Room, seed: number): Vec3 {
  const rng = createRng(`${seed}:${room.id}:gem`);
  const spots = quadrantSpots(room, 0.55);
  const [x, , z] = spots[Math.floor(rng() * spots.length)];
  return [x, GROUND_Y + 0.9, z];
}

/**
 * Spikes for a trap room: a ring around the centre, between every doorway
 * and the gem, so the risk sits on the path to the reward. Ring points that
 * fall inside a door lane are skipped, so the room is always crossable.
 */
export function hazardRing(room: Room, count = 6): Vec3[] {
  const radius = Math.max(2.4, halfSize(room) * 0.42);
  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / count;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    if (!inDoorLane(x, z)) out.push([x, GROUND_Y, z]);
  }
  return out;
}

/** Which of a room's walls have doorways. */
export const doorDirs = (room: Room): Dir[] =>
  DIRS.filter((dir) => Boolean(room.links[dir]));

/** A point is within reach of a door if it is inside the interact radius. */
export const nearDoor = (room: Room, x: number, z: number): boolean =>
  doorDirs(room).some((dir) => {
    const [dx, , dz] = doorPosition(room, dir);
    return (x - dx) ** 2 + (z - dz) ** 2 <= INTERACT_RADIUS ** 2;
  });
