import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from "three";

import { getSurface, type BuiltinSurface } from "../textures/registry";

/**
 * One of each shape, and one of each material, for the whole program.
 *
 * A prop written as JSX builds a fresh geometry and a fresh material for
 * every mesh in it, every time it mounts. Measured in a trap room: 85
 * visible meshes, 85 distinct geometry objects and 85 distinct material
 * objects, for 32 distinct shapes. Four braziers alone accounted for 27 of
 * them - three legs and a flame each, identical, in every room in the game.
 * All of it was built when the room mounted and thrown away when the player
 * walked out, and built again in the next room, which is the same cost this
 * project has already paid twice: once for procedural textures that were
 * regenerated per room, and once for the fifteen rigid bodies that are now
 * one static body.
 *
 * Nothing here is ever disposed, deliberately. These are a fixed, small set
 * that every room needs - the twenty props have 32 shapes between them -
 * and the alternative is reference counting a cache whose whole purpose is
 * that its contents outlive any one room. What must not happen is a caller
 * mutating one, because it is shared with every other prop of that kind:
 * the props that animate do it to a light, never to a material.
 */

const geometries = new Map<string, BufferGeometry>();
const materials = new Map<string, Material>();

export type GeometryKind =
  | "box"
  | "circle"
  | "cone"
  | "cylinder"
  | "dodecahedron"
  | "octahedron"
  | "plane"
  | "sphere"
  | "torus";

const BUILD: Record<GeometryKind, (args: number[]) => BufferGeometry> = {
  box: (a) => new BoxGeometry(...(a as [number, number, number])),
  circle: (a) => new CircleGeometry(...(a as [number, number])),
  cone: (a) => new ConeGeometry(...(a as [number, number, number])),
  cylinder: (a) => new CylinderGeometry(...(a as [number, number, number, number])),
  dodecahedron: (a) => new DodecahedronGeometry(...(a as [number, number])),
  octahedron: (a) => new OctahedronGeometry(...(a as [number, number])),
  plane: (a) => new PlaneGeometry(...(a as [number, number])),
  sphere: (a) => new SphereGeometry(...(a as [number, number, number])),
  torus: (a) => new TorusGeometry(...(a as [number, number, number, number])),
};

/** The one geometry of this shape and these dimensions. */
export function geo(kind: GeometryKind, ...args: (number | boolean)[]): BufferGeometry {
  const key = `${kind}:${args.join(",")}`;
  let g = geometries.get(key);
  if (!g) {
    // `true` appears as the open-ended flag on a cylinder, where three
    // takes it positionally among the numbers.
    g = BUILD[kind](args as number[]);
    geometries.set(key, g);
  }
  return g;
}

export interface MaterialSpec {
  color?: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: number;
  depthWrite?: boolean;
  basic?: true;
  /**
   * The grain on it, from the same registry the walls and floors use.
   *
   * Every prop in the game was a flat colour. The rooms had generated
   * stone, brick, wood and iron on their surfaces and the things standing
   * ON those surfaces had none - so a chest was an untextured brown box in
   * a room made of planks, and a pillar was a smooth grey plastic cylinder
   * against a wall made of blocks. It is the same complaint as the
   * doorways one layer in: the props do not belong to the world they are
   * standing in.
   *
   * `getSurface` and not `useSurface`, because this is not a hook and does
   * not need to be: it is the SHARED texture at its own scale, one per
   * surface for the whole program, so a room gains a handful at most
   * whatever it is furnished with. The material cache keys on this like
   * every other field, so a wooden chest and a wooden table are still one
   * material between them.
   */
  surface?: BuiltinSurface;
}

/** The one material with exactly these properties. */
export function mat(spec: MaterialSpec): Material {
  const key = JSON.stringify(spec);
  let m = materials.get(key);
  if (!m) {
    const { basic, surface, ...rest } = spec;
    const props = surface ? { ...rest, map: getSurface(surface) } : rest;
    m = basic
      ? new MeshBasicMaterial(props as MeshBasicMaterial["userData"])
      : new MeshStandardMaterial(props as MeshStandardMaterial["userData"]);
    materials.set(key, m);
  }
  return m;
}

/** What the cache holds, for the check that this is doing anything. */
export const sharedCounts = (): { geometries: number; materials: number } => ({
  geometries: geometries.size,
  materials: materials.size,
});
