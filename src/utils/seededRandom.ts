/**
 * Deterministic randomness for dungeon generation.
 *
 * The generator reached for `Math.random()` in seventeen places, so no two
 * boots produced the same dungeon and nothing about a run could be reproduced -
 * not a bug report, not a playtest note, and not an end-to-end test, which had
 * to teleport around a dungeon it could not predict. A seeded stream fixes all
 * three: the same seed lays out the same rooms in the same order.
 */

/** FNV-1a. Any string becomes a stable 32-bit state to start the stream from. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * mulberry32: small, fast, and good enough for level layout. Returns the same
 * sequence of numbers in [0, 1) for the same starting state.
 */
export function mulberry32(state: number): () => number {
  let a = state >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A random source for a run. An empty or absent seed means "surprise me" and
 * hands back `Math.random`, so ordinary play is unchanged.
 */
export function randomSource(seed?: string | null): () => number {
  if (!seed) return Math.random;
  return mulberry32(hashSeed(seed));
}
