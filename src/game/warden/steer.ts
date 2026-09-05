/**
 * Walking round something.
 *
 * The Warden goes straight at the player and always has: it has no
 * collider, so a straight line is the only line it ever needed. Then the
 * floor's spikes started biting it, and a thing that walks through spikes
 * twice and then walks through them a third time is not a threat, it is a
 * prop. After it has been routed it steers instead - the same walk, with
 * whatever hurt it taken out of the direction it is allowed to take.
 *
 * Deliberately not pathfinding. It probes a short way ahead along the
 * straight line and, if that lands in something, fans out either side
 * until it finds a heading that does not. A player can still corner it
 * against a patch and it will pick the least bad way past; what it will
 * not do is march into the same spikes for the third time.
 */

export interface Patch {
  x: number;
  z: number;
  r: number;
}

/** How far ahead it looks when deciding whether the straight line is clear. */
const LOOKAHEAD = 1.4;
/** The fan it tries, in radians either side, nearest heading first. */
const FAN = [0.44, 0.87, 1.31, 1.75, 2.18];

/** Whether a point lies inside any patch, with `margin` of extra berth. */
export function inPatch(patches: readonly Patch[], x: number, z: number, margin = 0): boolean {
  for (const p of patches) {
    const dx = x - p.x;
    const dz = z - p.z;
    const reach = p.r + margin;
    if (dx * dx + dz * dz <= reach * reach) return true;
  }
  return false;
}

/**
 * A unit heading from (x,z) towards (tx,tz) that keeps `berth` clear of
 * every patch, or the straight heading when nothing it can try is clear.
 *
 * Falling back to straight rather than stopping is the point: a Warden
 * that freezes when every way round is blocked is a Warden a player can
 * park in a corner and ignore, which is worse than one that takes the hit
 * and comes on anyway.
 */
export function steerAround(
  x: number,
  z: number,
  tx: number,
  tz: number,
  patches: readonly Patch[],
  berth: number
): { dx: number; dz: number } {
  const toX = tx - x;
  const toZ = tz - z;
  const length = Math.hypot(toX, toZ) || 1;
  const straight = { dx: toX / length, dz: toZ / length };
  if (!patches.length) return straight;

  // How far to probe: never past the player, so it does not swerve round a
  // patch it was going to stop short of anyway.
  const probe = Math.min(LOOKAHEAD, length);
  const clear = (dx: number, dz: number) =>
    !inPatch(patches, x + dx * probe, z + dz * probe, berth);
  if (clear(straight.dx, straight.dz)) return straight;

  const base = Math.atan2(straight.dz, straight.dx);
  for (const spread of FAN) {
    for (const sign of [1, -1]) {
      const a = base + spread * sign;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      if (clear(dx, dz)) return { dx, dz };
    }
  }
  return straight;
}
