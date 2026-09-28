import { useEffect, useMemo } from "react";
import {
  CanvasTexture,
  MeshBasicMaterial,
  type Texture,
} from "three";

import type { Vec3 } from "../dungeon/layout";
import type { PropPlacement, Room } from "../dungeon/types";
import { contactShadowGeometry } from "./contactShadowGeometry";

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
    // Written into the depth buffer it would occlude the props it belongs to.
    depthWrite: false,
  });
  return material;
}

interface ContactShadowsProps {
  room: Room;
  placements: PropPlacement[];
  /** The room's gem, if it has one: it stands on the floor like anything else. */
  extra?: Vec3[];
}

export function ContactShadows({ room, placements, extra }: ContactShadowsProps) {
  const geometry = useMemo(() => contactShadowGeometry(room, placements, extra), [room, placements, extra]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (geometry.index?.count === 0) return null;
  return (
    <mesh name="prop-contact-shadows" geometry={geometry} material={shadowMaterial()} renderOrder={1} />
  );
}
