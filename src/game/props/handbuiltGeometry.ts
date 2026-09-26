import { BoxGeometry, Color, ConeGeometry, Float32BufferAttribute, TorusGeometry, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DARK_WOOD_LIT, WOOD_LIT } from "./furnitureStyle";

interface BoxPart {
  at: [number, number, number];
  size: [number, number, number];
  hideTop?: boolean;
  hideBottom?: boolean;
}

/** Join the pieces that share a material. A leg's top is inside the seat or
 * worktop, and its bottom is against the floor; those faces never contribute
 * to the silhouette. Keep the remaining flat faces and the original grain. */
function boxes(parts: readonly BoxPart[]): BufferGeometry {
  const pieces = parts.map(part => {
    const box = new BoxGeometry(1, 1, 1);
    if (part.hideTop || part.hideBottom) {
      const normal = box.attributes.normal, index = box.index!, kept: number[] = [];
      for (let i = 0; i < index.count; i += 3) {
        const y = normal.getY(index.getX(i));
        if (part.hideTop && y > 0.5 || part.hideBottom && y < -0.5) continue;
        kept.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
      }
      box.setIndex(kept);
    }
    box.scale(...part.size).translate(...part.at);
    return box;
  });
  const joined = mergeGeometries(pieces);
  pieces.forEach(piece => piece.dispose());
  if (!joined) throw new Error("handbuilt box parts could not be joined");
  return joined;
}

export function chairWoodGeometry(): BufferGeometry {
  return boxes([
    { at: [0, 0.45, 0], size: [0.5, 0.06, 0.5] },
    { at: [0, 0.8, -0.22], size: [0.5, 0.7, 0.06], hideBottom: true },
  ]);
}

export function chairLegGeometry(): BufferGeometry {
  return boxes(([-0.2, 0.2] as const).flatMap(x => ([-0.2, 0.2] as const).map(z => ({
    at: [x, 0.22, z] as [number, number, number], size: [0.05, 0.44, 0.05] as [number, number, number],
    hideTop: true, hideBottom: true,
  }))));
}

export function tableLegGeometry(): BufferGeometry {
  return boxes(([-0.8, 0.8] as const).flatMap(x => ([-0.4, 0.4] as const).map(z => ({
    at: [x, 0.37, z] as [number, number, number], size: [0.08, 0.74, 0.08] as [number, number, number],
    hideTop: true, hideBottom: true,
  }))));
}

export function crateSlatGeometry(): BufferGeometry {
  return boxes([0.12, 0.68].map(y => ({
    at: [0, y, 0] as [number, number, number], size: [0.88, 0.1, 0.88] as [number, number, number],
  })));
}

/** Bake each furniture piece's tint into one wood-grained mesh. This keeps the
 * light top and dark supports while allowing one room-local instance draw per
 * chair, crate or table. Separate props still cull with their own room. */
export function finishedWoodGeometry(kind: "chair" | "crate" | "table"): BufferGeometry {
  const light = kind === "chair" ? chairWoodGeometry()
    : kind === "crate" ? new BoxGeometry(.84, .8, .84).translate(0, .4, 0)
      : new BoxGeometry(1.8, .08, 1).translate(0, .78, 0);
  const dark = kind === "chair" ? chairLegGeometry()
    : kind === "crate" ? crateSlatGeometry() : tableLegGeometry();
  for (const [piece, tint] of [[light, WOOD_LIT], [dark, DARK_WOOD_LIT]] as const) {
    const color = new Color(tint), colors = new Float32Array(piece.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b;
    }
    piece.setAttribute("color", new Float32BufferAttribute(colors, 3));
  }
  const joined = mergeGeometries([light, dark]);
  light.dispose(); dark.dispose();
  if (!joined) throw new Error(`finished ${kind} wood could not be joined`);
  return joined;
}

/** Five fixed iron points form one silhouette and one submission per hazard.
 * The warning disc stays separate because it is translucent and unlit. */
export function spikePatchGeometry(): BufferGeometry {
  const spots = [[0, 0], [.35, .2], [-.3, .28], [.15, -.32], [-.25, -.22]];
  const pieces = spots.map(([x, z]) => new ConeGeometry(.09, .45, 6).translate(x, .22, z));
  const joined = mergeGeometries(pieces);
  pieces.forEach(piece => piece.dispose());
  if (!joined) throw new Error("spike patch could not be joined");
  return joined;
}

/** Two eight-sided iron hoops, one shared draw. The flat facets suit the
 * barrel's stave silhouette and use fewer triangles than the old 14-sided
 * rings. */
export function barrelHoopGeometry(): BufferGeometry {
  const pieces = [0.25, 0.85].map(y => {
    const radius = 0.38 + 0.04 * y / 1.1 + 0.007;
    return new TorusGeometry(1, 0.05, 4, 8)
      .scale(radius, radius, 0.8).rotateX(Math.PI / 2).rotateY(Math.PI / 2).translate(0, y, 0);
  });
  const joined = mergeGeometries(pieces);
  pieces.forEach(piece => piece.dispose());
  if (!joined) throw new Error("barrel hoops could not be joined");
  return joined;
}
