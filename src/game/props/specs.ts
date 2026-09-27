import type { PropKind, PropPlacement } from "../dungeon/types";

/**
 * What every prop is, as data: how big its footprint is, whether it blocks
 * the player, and where it blocks.
 *
 * Apart from the components that draw them, and deliberately so. Four
 * things need these numbers and none of them wants a React tree: the room's
 * single static collider body, the placement filters that keep props out of
 * doorways, the editor's footprint outlines, and the layout check - which
 * runs in node and cannot import anything that reaches for three or the
 * canvas. The components are joined back onto these in catalog.tsx.
 */

/**
 * A discriminated union rather than one shape with a loose tuple: the
 * collider builder reads `args[2]` on a cuboid, and only the discriminant
 * lets the compiler know it is there. `y` is the centre height above the
 * floor.
 */
export type ColliderSpec =
  | { shape: "cuboid"; args: [number, number, number]; y: number }
  | { shape: "cylinder"; args: [number, number]; y: number };

/** Furthest horizontal point of a collider, independent of prop rotation. */
export const colliderFootprintRadius = (collider: ColliderSpec): number =>
  collider.shape === "cuboid" ? Math.hypot(collider.args[0], collider.args[2]) : collider.args[1];

/** A horizontal segment against the physical collider at a given floor-relative height. */
export function propBlocksSegment(placement: PropPlacement, from: { x: number; z: number },
  to: { x: number; z: number }, height: number): boolean {
  const spec = PROP_SPECS[placement.kind];
  const collider = spec.collider;
  if (!spec.solid || !collider) return false;
  const scale = Math.abs(placement.scale ?? 1);
  const halfY = collider.args[collider.shape === "cylinder" ? 0 : 1] * scale;
  const centreY = collider.y * scale;
  if (height < centreY - halfY || height > centreY + halfY) return false;
  const turn = placement.rotation ?? 0, cosine = Math.cos(turn), sine = Math.sin(turn);
  const x = (from.x - placement.x) * cosine - (from.z - placement.z) * sine;
  const z = (from.x - placement.x) * sine + (from.z - placement.z) * cosine;
  const dx = (to.x - from.x) * cosine - (to.z - from.z) * sine;
  const dz = (to.x - from.x) * sine + (to.z - from.z) * cosine;
  if (collider.shape === "cylinder") {
    const length2 = dx * dx + dz * dz;
    const t = length2 > 0 ? Math.max(0, Math.min(1, -(x * dx + z * dz) / length2)) : 0;
    const radius = collider.args[1] * scale;
    return (x + dx * t) ** 2 + (z + dz * t) ** 2 <= radius * radius;
  }
  // Clip the segment to both local slabs of a rotated box. A placement
  // radius is useful for furnishing clearance, but is not solid cover.
  let enter = 0, leave = 1;
  const clip = (origin: number, delta: number, half: number) => {
    if (Math.abs(delta) < 1e-12) return Math.abs(origin) <= half;
    const a = (-half - origin) / delta, b = (half - origin) / delta;
    enter = Math.max(enter, Math.min(a, b));
    leave = Math.min(leave, Math.max(a, b));
    return enter <= leave;
  };
  return clip(x, dx, collider.args[0] * scale) && clip(z, dz, collider.args[2] * scale);
}

/** Exact world-axis reach of a rotated collider used for lane and wall checks. */
export function propColliderAxisExtents(placement: PropPlacement): { x: number; z: number } | null {
  const collider = PROP_SPECS[placement.kind].collider;
  if (!collider) return null;
  const scale = Math.abs(placement.scale ?? 1);
  if (collider.shape === "cylinder") {
    const radius = collider.args[1] * scale;
    return { x: radius, z: radius };
  }
  const turn = placement.rotation ?? 0;
  const cosine = Math.abs(Math.cos(turn));
  const sine = Math.abs(Math.sin(turn));
  return {
    x: scale * (collider.args[0] * cosine + collider.args[2] * sine),
    z: scale * (collider.args[0] * sine + collider.args[2] * cosine),
  };
}

export interface PropSpec {
  title: string;
  /** Placement radius in room units; broad clearance around a prop. */
  radius: number;
  /** Whether it blocks the player. */
  solid: boolean;
  /** Fixed-size gameplay effects do not read placement scale or rotation. */
  transformable?: false;
  /**
   * Architecture rather than furniture: a piece an author builds a room out
   * of, which no seeded arrangement ever stands on an anchor.
   *
   * The distinction earns its place because the room's anchor rings are
   * sized from the widest thing that can stand on them, and a wall segment
   * is three units across - wide enough that no room the generator makes
   * could fit two rings of them. It is still held to every placement rule
   * where an author does use it.
   */
  authored?: true;
  /**
   * Where it blocks, if it blocks. Built into the room's one static body -
   * a room's fifteen props were fifteen rigid bodies, and rapier walks every
   * body in the world on every physics step. None of them ever move.
   */
  collider?: ColliderSpec;
}

/**
 * How wide the widest thing an arrangement can stand on an anchor is.
 *
 * The room's anchor rings are spaced from this, so that two props in one
 * quadrant cannot stand inside each other and one against the lane cannot
 * overhang it. Both were happening in every fourteen-unit room the
 * generator made: a table on `near` reached 0.1 into the door lane, and a
 * table on `far` overlapped a bookshelf on `near` by 0.46.
 */
export const widestFurnishing = (): number =>
  Math.max(...Object.values(PROP_SPECS).filter((s) => s.solid && !s.authored).map((s) => s.radius));

export const PROP_SPECS: Record<PropKind, PropSpec> = {
  banner: { title: "Banner", radius: 0.5, solid: false },
  barrel: { title: "Barrel", radius: 0.45, solid: true, collider: { shape: "cylinder", args: [0.55, 0.42], y: 0.55 } },
  bookshelf: { title: "Bookshelf", radius: 0.8, solid: true, collider: { shape: "cuboid", args: [0.8, 1.1, 0.225], y: 1.1 } },
  candle: { title: "Candle", radius: 0.1, solid: false },
  chair: { title: "Chair", radius: 0.3, solid: true, collider: { shape: "cuboid", args: [0.25, 0.55, 0.25], y: 0.55 } },
  chest: { title: "Chest", radius: 0.5, solid: true, collider: { shape: "cuboid", args: [0.46, 0.37, 0.29], y: 0.37 } },
  crate: { title: "Crate", radius: 0.45, solid: true, collider: { shape: "cuboid", args: [0.42, 0.4, 0.42], y: 0.4 } },
  crystal: { title: "Crystal", radius: 0.35, solid: false },
  pillar: { title: "Pillar", radius: 0.6, solid: true, collider: { shape: "cylinder", args: [2.1, 0.4], y: 2.1 } },
  potion: { title: "Potion", radius: 0.15, solid: false },
  rubble: { title: "Rubble", radius: 0.65, solid: false },
  skull: { title: "Skull", radius: 0.2, solid: false },
  statue: { title: "Statue", radius: 0.55, solid: true, collider: { shape: "cylinder", args: [1.15, 0.5], y: 1.15 } },
  table: { title: "Table", radius: 1, solid: true, collider: { shape: "cuboid", args: [0.9, 0.41, 0.5], y: 0.41 } },
  tile: { title: "Floor inlay", radius: 1, solid: false },
  torch: { title: "Brazier", radius: 0.4, solid: false, transformable: false },
  urn: { title: "Urn", radius: 0.4, solid: true, collider: { shape: "cylinder", args: [0.6, 0.36], y: 0.6 } },
  wall: { title: "Wall segment", radius: 1.5, solid: true, authored: true, collider: { shape: "cuboid", args: [1.5, 1.5, 0.2], y: 1.5 } },
  web: { title: "Cobweb", radius: 0.7, solid: false },
  spikes: { title: "Spikes", radius: 1.2, solid: false, transformable: false },
};

/** Horizontal intersection of the colliders Rapier builds for two placements. */
export function propCollidersOverlap(a: PropPlacement, b: PropPlacement): boolean {
  const ca = PROP_SPECS[a.kind].collider;
  const cb = PROP_SPECS[b.kind].collider;
  if (!ca || !cb) return false;
  const sa = Math.abs(a.scale ?? 1);
  const sb = Math.abs(b.scale ?? 1);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const ra = colliderFootprintRadius(ca) * sa;
  const rb = colliderFootprintRadius(cb) * sb;
  if (Math.hypot(dx, dz) >= ra + rb) return false;
  if (ca.shape === "cylinder" && cb.shape === "cylinder") return true;

  const circleBox = (circle: PropPlacement, radius: number, box: PropPlacement,
    halfX: number, halfZ: number): boolean => {
    const turn = box.rotation ?? 0;
    const x = circle.x - box.x;
    const z = circle.z - box.z;
    const localX = x * Math.cos(turn) - z * Math.sin(turn);
    const localZ = x * Math.sin(turn) + z * Math.cos(turn);
    const outsideX = Math.max(Math.abs(localX) - halfX, 0);
    const outsideZ = Math.max(Math.abs(localZ) - halfZ, 0);
    return outsideX * outsideX + outsideZ * outsideZ < radius * radius - 1e-9;
  };
  if (ca.shape === "cylinder" && cb.shape === "cuboid")
    return circleBox(a, ca.args[1] * sa, b, cb.args[0] * sb, cb.args[2] * sb);
  if (ca.shape === "cuboid" && cb.shape === "cylinder")
    return circleBox(b, cb.args[1] * sb, a, ca.args[0] * sa, ca.args[2] * sa);
  if (ca.shape !== "cuboid" || cb.shape !== "cuboid") return false;

  const axes = (turn: number): [number, number][] => [
    [Math.cos(turn), -Math.sin(turn)],
    [Math.sin(turn), Math.cos(turn)],
  ];
  const aa = axes(a.rotation ?? 0);
  const bb = axes(b.rotation ?? 0);
  return [...aa, ...bb].every(([x, z]) => {
    const extent = (basis: [number, number][], halfX: number, halfZ: number) =>
      halfX * Math.abs(x * basis[0][0] + z * basis[0][1])
      + halfZ * Math.abs(x * basis[1][0] + z * basis[1][1]);
    return Math.abs(dx * x + dz * z)
      < extent(aa, ca.args[0] * sa, ca.args[2] * sa)
      + extent(bb, cb.args[0] * sb, cb.args[2] * sb) - 1e-6;
  });
}
