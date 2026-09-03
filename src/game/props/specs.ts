import type { PropKind } from "../dungeon/types";

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

export interface PropSpec {
  title: string;
  /** Footprint radius in room units, for the editor and for lane checks. */
  radius: number;
  /** Whether it blocks the player. */
  solid: boolean;
  /**
   * Where it blocks, if it blocks. Built into the room's one static body -
   * a room's fifteen props were fifteen rigid bodies, and rapier walks every
   * body in the world on every physics step. None of them ever move.
   */
  collider?: ColliderSpec;
}

export const PROP_SPECS: Record<PropKind, PropSpec> = {
  barrel: { title: "Barrel", radius: 0.45, solid: true, collider: { shape: "cylinder", args: [0.55, 0.42], y: 0.55 } },
  bookshelf: { title: "Bookshelf", radius: 0.8, solid: true, collider: { shape: "cuboid", args: [0.8, 1.1, 0.225], y: 1.1 } },
  candle: { title: "Candle", radius: 0.1, solid: false },
  chair: { title: "Chair", radius: 0.3, solid: true, collider: { shape: "cuboid", args: [0.25, 0.55, 0.25], y: 0.55 } },
  chest: { title: "Chest", radius: 0.5, solid: true, collider: { shape: "cuboid", args: [0.46, 0.37, 0.29], y: 0.37 } },
  crystal: { title: "Crystal", radius: 0.35, solid: false },
  pillar: { title: "Pillar", radius: 0.6, solid: true, collider: { shape: "cylinder", args: [2.1, 0.4], y: 2.1 } },
  potion: { title: "Potion", radius: 0.15, solid: false },
  skull: { title: "Skull", radius: 0.2, solid: false },
  table: { title: "Table", radius: 1, solid: true, collider: { shape: "cuboid", args: [0.9, 0.41, 0.5], y: 0.41 } },
  tile: { title: "Floor inlay", radius: 1, solid: false },
  torch: { title: "Brazier", radius: 0.4, solid: false },
  wall: { title: "Wall segment", radius: 1.5, solid: true, collider: { shape: "cuboid", args: [1.5, 1.5, 0.2], y: 1.5 } },
  web: { title: "Cobweb", radius: 0.7, solid: false },
  spikes: { title: "Spikes", radius: 1.2, solid: false },
};
