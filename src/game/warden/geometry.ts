import { BoxGeometry, Color, CylinderGeometry, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** A cut-cloth silhouette, facing +z. Arms pivot from their shoulders;
 * the open cowl leaves the eyes visible without drawing an inner robe. */
export function wardenGeometry(part: "body" | "hood" | "arm" | "eyes") {
  const pieces = part === "body" ? [
    new CylinderGeometry(.29, .62, 1.85, 8).translate(0, .925, 0),
    new BoxGeometry(.94, .24, .44).translate(0, 1.71, 0),
    new BoxGeometry(.28, .23, .28).translate(0, 1.91, 0),
  ] : part === "hood" ? [
    new BoxGeometry(.58, .12, .48).translate(0, .44, 0),
    new BoxGeometry(.10, .46, .44).translate(-.24, .18, 0),
    new BoxGeometry(.10, .46, .44).translate(.24, .18, 0),
    new BoxGeometry(.48, .46, .08).translate(0, .18, -.18),
  ] : part === "arm" ? [
    new BoxGeometry(.19, .62, .24).translate(0, -.29, 0),
    new BoxGeometry(.14, .25, .16).translate(0, -.70, .045),
  ] : [-1, 1].map(sign => new BoxGeometry(.075, .045, .035).translate(sign * .09, 0, 0));
  const flat = pieces.map((piece, index) => {
    const geometry = piece.toNonIndexed();
    geometry.computeVertexNormals();
    if (part === "hood") {
      // The recessed face stays dark in its own lamp, without another draw.
      const color = new Color(index === 3 ? "#030408" : "#3b373d");
      const values = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < values.length; i += 3) color.toArray(values, i);
      geometry.setAttribute("color", new Float32BufferAttribute(values, 3));
    }
    piece.dispose();
    return geometry;
  });
  const merged = mergeGeometries(flat)!;
  flat.forEach(piece => piece.dispose());
  return merged;
}
