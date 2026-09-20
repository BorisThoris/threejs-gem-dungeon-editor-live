import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const BASE_Y = 0.0775;

/** A block-cut cranium and a separate lower jaw, inside the original prop's
 * 0.2 m radius and 0.4 m height. Flat normals keep the tool-cut facets visible. */
export function skullGeometry(): BufferGeometry {
  const outline = [[-.13, .16], [.13, .16], [.17, .21], [.17, .34], [.12, .4], [-.12, .4], [-.17, .34], [-.17, .21]];
  const positions: number[] = [], indices: number[] = [];
  for (const z of [.105, -.09]) for (const [x, y] of outline) positions.push(x, y, z);
  for (let i = 1; i < 7; i++) indices.push(0, i, i + 1, 8, 8 + i + 1, 8 + i);
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    indices.push(i, 8 + i, 8 + j, i, 8 + j, j);
  }
  const indexed = new BufferGeometry();
  indexed.setAttribute("position", new Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const head = indexed.toNonIndexed();
  indexed.dispose();
  head.computeVertexNormals();
  // Match the box attributes before merging. The material has no texture.
  head.setAttribute("uv", new Float32BufferAttribute(new Float32Array(head.attributes.position.count * 2), 2));
  const jaw = new BoxGeometry(.26, .055, .16).translate(0, .105, .015).toNonIndexed();
  const teeth = [-.081, -.027, .027, .081].map(x => new BoxGeometry(.042, .04, .025).translate(x, .145, .1).toNonIndexed());
  const parts = [head, jaw, ...teeth];
  const merged = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  return merged.translate(0, -BASE_Y, 0);
}

/** Flat dark sockets sit just ahead of the face; their sharp outlines remain
 * readable at a distance without adding round eyeballs to a bone prop. */
export function skullSocketsGeometry(): BufferGeometry {
  const positions: number[] = [];
  const triangle = (a: number[], b: number[], c: number[]) => positions.push(...a, ...b, ...c);
  for (const x of [-.083, .083]) {
    const a = [x - .042, .235, .106], b = [x + .042, .235, .106];
    const c = [x + .042, .302, .106], d = [x - .042, .302, .106];
    triangle(a, b, c);
    triangle(a, c, d);
  }
  triangle([-.024, .226, .106], [0, .18, .106], [.024, .226, .106]);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g.translate(0, -BASE_Y, 0);
}

