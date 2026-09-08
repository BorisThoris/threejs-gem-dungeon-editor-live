import { barKey } from "../warden/bars";
import type { Room } from "../dungeon/types";

/**
 * How far a thing is heard, and how loud it still is when it gets there.
 *
 * This is the one piece of the Din that had to be transplanted rather than
 * invented, because the studio that shipped it said in as many words that
 * without it the sound design would probably have failed. The shape:
 *
 *   a coarse room graph connected by portals, separate from render geometry
 *   an attenuation cost on each portal edge
 *   flood the graph from the source with a decaying loudness budget
 *   a listener reads the loudness that arrives in its own room
 *
 * We already have the graph - `Room.links` is exactly a coarse room graph
 * connected by portals, and it costs nothing because the generator writes
 * it. The game this is taken from hand-authored one per mission, which the
 * "what went right" write-up does not mention and which would have been
 * the expensive half.
 *
 * Three edge costs and a half-life. The wall cost is 0 and that is not a
 * rounding-down of a small number: two rooms with no doorway between them
 * do not hear each other at all, however loud the thing was, because the
 * whole point of the graph is that the floor's shape is what decides who
 * knows. A player who has learned that a burst two rooms away arrives
 * quieter than one next door has learned something they can plan against.
 *
 * The numbers below are OURS. The architecture verified against a primary
 * source; no source survived verification for per-material loudness or for
 * a movement-speed-to-loudness mapping, so every figure here is a starting
 * value to be tuned by playing, and is marked as such rather than being
 * dressed up as received wisdom.
 */

/** Multiplied into a signal for each doorway it passes through. */
export const DOORWAY = 0.35;

/**
 * Below this, a signal is not there. Without a floor the flood walks the
 * whole dungeon every time to deliver numbers no receiver could act on,
 * and a threshold of 0.30 would never be met by a fourth-hand echo anyway.
 */
export const AUDIBLE = 0.02;

/** Seconds for a signal to fall to half. A burst is over in about eight. */
export const HALF_LIFE_S = 2.5;

/**
 * How loud a thing still is, `age` seconds after it happened.
 *
 * Exponential rather than linear because a sound that ends by arithmetic
 * has a moment where it is 0.01 and then a moment where it is gone, and
 * the receiver that was chasing it stops on a frame boundary. This one
 * only ever gets quieter.
 */
export const aged = (magnitude: number, age: number): number =>
  age <= 0 ? magnitude : magnitude * Math.pow(0.5, age / HALF_LIFE_S);

/**
 * Flood the room graph from `fromId`, returning what arrives in each room.
 *
 * Dijkstra rather than breadth-first, on the loudest arriving path: a
 * dungeon is a graph and not a tree, so a room two doorways away down one
 * route may be one doorway away down another, and a queue that takes the
 * first arrival delivers the quieter of the two. That was worth getting
 * right once here rather than being discovered later as "the Warden
 * sometimes ignores a bomb it should have heard".
 *
 * A barred doorway is a wall. The player paid a gem and eight seconds of
 * noise for that bar, and it stopping sound as well as stopping the Warden
 * is the kind of second use a verb earns by being a physical thing rather
 * than a genre function.
 */
export function carriesTo(
  rooms: readonly Room[],
  fromId: string,
  magnitude: number,
  bars: ReadonlySet<string> = new Set()
): Map<string, number> {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const reach = new Map<string, number>();
  if (magnitude < AUDIBLE || !byId.has(fromId)) return reach;
  reach.set(fromId, magnitude);

  // Small floors: a sorted scan beats a heap and has no allocation per pop.
  const pending = [fromId];
  while (pending.length) {
    let best = 0;
    for (let i = 1; i < pending.length; i++) {
      if ((reach.get(pending[i]) ?? 0) > (reach.get(pending[best]) ?? 0)) best = i;
    }
    const id = pending.splice(best, 1)[0];
    const here = reach.get(id) ?? 0;
    const through = here * DOORWAY;
    if (through < AUDIBLE) continue;
    for (const next of Object.values(byId.get(id)?.links ?? {})) {
      if (!next || bars.has(barKey(id, next))) continue;
      if ((reach.get(next) ?? 0) >= through) continue;
      reach.set(next, through);
      pending.push(next);
    }
  }
  return reach;
}

/**
 * What arrives in one room from one source, without flooding the rest.
 *
 * The frame loops ask this question about themselves several times a
 * second and the answer for every other room is thrown away, so the flood
 * is the wrong shape for the common case.
 */
export function carriesFrom(
  rooms: readonly Room[],
  fromId: string,
  toId: string,
  magnitude: number,
  bars: ReadonlySet<string> = new Set()
): number {
  if (fromId === toId) return magnitude;
  return carriesTo(rooms, fromId, magnitude, bars).get(toId) ?? 0;
}
