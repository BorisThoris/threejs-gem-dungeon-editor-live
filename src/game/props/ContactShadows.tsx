import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  MeshBasicMaterial,
  type Texture,
} from "three";

import type { Vec3 } from "../dungeon/layout";
import type { PropPlacement } from "../dungeon/types";
import { GROUND_Y } from "../world";
import { CATALOG } from "./catalog";

/**
 * The dark under a thing standing on a floor.
 *
 * The Canvas asks for shadows and no light in the game casts one - a point
 * light's shadow is a cube map, six renders a frame per room, which is not
 * a thing to spend on a Steam Deck for scenery that never moves. Without
 * one, every barrel, chest and pillar met the floor at a hard edge with
 * nothing underneath, and a room read as objects pasted onto a plane rather
 * than objects standing in a place.
 *
 * This is the cheap half of what a shadow does: one soft blob per prop,
 * sized from the prop's own radius, all of them built into a single
 * geometry so the whole room's grounding costs one draw call and nothing
 * per frame. It is not a real shadow and does not pretend to be - it does
 * not follow the braziers - but the eye reads contact from the darkening
 * far more than from the direction.
 */

/** Props that do not stand on the floor, so nothing goes under them. */
const AIRBORNE = new Set(["web", "tile", "spikes"]);

/**
 * How much wider than the prop the blob spreads. Tight enough to read as
 * the prop's own footprint rather than a puddle it is standing in; wide
 * enough to be visible at the distance a player actually looks at a room
 * from, which is across it and not down at their feet.
 */
const SPREAD = 2.1;
/** Clear of the tinted floor at GROUND_Y + 0.01, and of the slab under it. */
const HEIGHT = GROUND_Y + 0.02;

let blob: Texture | null = null;

function shadowTexture(): Texture {
  if (blob) return blob;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // Soft-edged rather than linear: a linear falloff reads as a disc with a
  // blurred rim, which looks like a decal. This reads as darkness.
  g.addColorStop(0, "rgba(0,0,0,0.92)");
  g.addColorStop(0.35, "rgba(0,0,0,0.70)");
  g.addColorStop(0.7, "rgba(0,0,0,0.24)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  blob = new CanvasTexture(canvas);
  return blob;
}

let material: MeshBasicMaterial | null = null;

function shadowMaterial(): MeshBasicMaterial {
  if (material) return material;
  material = new MeshBasicMaterial({
    map: shadowTexture(),
    transparent: true,
    // Written into the depth buffer it would occlude the props it belongs
    // to; drawn double-sided it does not care which way the quad was wound.
    depthWrite: false,
    side: DoubleSide,
  });
  return material;
}

/** One quad per thing, in one geometry: the room's grounding as a single mesh. */
function shadowGeometry(spots: { x: number; z: number; r: number }[]): BufferGeometry {
  const position = new Float32Array(spots.length * 12);
  const uv = new Float32Array(spots.length * 8);
  const index = new Uint16Array(spots.length * 6);
  spots.forEach(({ x, z, r }, i) => {
    const p = i * 12;
    position.set(
      [x - r, HEIGHT, z - r, x + r, HEIGHT, z - r, x + r, HEIGHT, z + r, x - r, HEIGHT, z + r],
      p
    );
    uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
    const v = i * 4;
    index.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}

interface ContactShadowsProps {
  placements: PropPlacement[];
  /** The room's gem, if it has one: it stands on the floor like anything else. */
  extra?: Vec3[];
}

export function ContactShadows({ placements, extra }: ContactShadowsProps) {
  const geometry = useMemo(() => {
    const spots = placements
      .filter((p) => !AIRBORNE.has(p.kind))
      .map((p) => ({ x: p.x, z: p.z, r: CATALOG[p.kind].radius * (p.scale ?? 1) * SPREAD }));
    for (const at of extra ?? []) spots.push({ x: at[0], z: at[2], r: 0.55 });
    return shadowGeometry(spots);
  }, [placements, extra]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (geometry.index?.count === 0) return null;
  return (
    <mesh geometry={geometry} material={shadowMaterial()} renderOrder={1} />
  );
}
