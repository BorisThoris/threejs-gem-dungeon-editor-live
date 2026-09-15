import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function batBodyGeometry() {
  const pieces = [new BoxGeometry(.14, .15, .28),
    ...[-1, 1].map(s => new BoxGeometry(.045, .10, .065).translate(s * .05, .10, .10))];
  const result = mergeGeometries(pieces)!;
  pieces.forEach(p => p.dispose());
  return result;
}

/** One angular, scalloped wing; mirrored for the other side. */
export function batWingGeometry() {
  const outline = [[.055, .12], [.29, .22], [.52, -.03], [.31, -.02], [.25, -.18], [.12, -.10], [.055, -.14]];
  const vertices: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    vertices.push(.16, 0, .015, a[0], 0, a[1], b[0], 0, b[1]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}
