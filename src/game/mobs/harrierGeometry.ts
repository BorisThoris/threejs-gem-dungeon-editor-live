import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function harrierBodyGeometry() {
  const pieces = [
    new BoxGeometry(.26, .24, .46),
    new BoxGeometry(.24, .21, .22).translate(0, .10, .25),
    new BoxGeometry(.09, .09, .19).translate(0, .02, .41),
    new BoxGeometry(.29, .045, .26).translate(0, -.025, -.32),
  ];
  const result = mergeGeometries(pieces)!;
  pieces.forEach(p => p.dispose());
  return result;
}

/** Cut-feather outline, swept behind a broad leading edge. */
export function harrierWingGeometry(left = false) {
  const outline = [[.10, .16], [.48, .20], [.90, -.08], [.67, -.10],
    [.81, -.24], [.55, -.20], [.63, -.36], [.37, -.26], [.10, -.20]];
  const vertices: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length], sign = left ? -1 : 1;
    vertices.push(sign * .30, 0, 0, sign * a[0], 0, a[1], sign * b[0], 0, b[1]);
  }
  const result = new BufferGeometry();
  result.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  result.computeVertexNormals();
  return result;
}
