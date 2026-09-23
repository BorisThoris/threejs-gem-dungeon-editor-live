import { BoxGeometry, CapsuleGeometry, Color, CylinderGeometry, Float32BufferAttribute, SphereGeometry, type BufferGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Baked facet shading gives the viewmodel volume without extra scene lights. */
function facet(geometry: BufferGeometry, tint: string): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.computeVertexNormals();
  const normal = flat.getAttribute("normal"), colour = new Color(tint), values = [];
  for (let i = 0; i < normal.count; i++) {
    const shade = 0.62 + 0.38 * Math.max(0, normal.getX(i) * -0.35 + normal.getY(i) * 0.5 + normal.getZ(i) * 0.78);
    values.push(colour.r * shade, colour.g * shade, colour.b * shade);
  }
  flat.setAttribute("color", new Float32BufferAttribute(values, 3));
  return flat;
}
function combine(parts: BufferGeometry[]): BufferGeometry {
  const result = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  return result;
}
const box = (size: [number, number, number], at: [number, number, number], tint: string) =>
  facet(new BoxGeometry(...size).translate(...at), tint);

export function createHandGeometry() {
  const sleeve = combine([
    facet(new CylinderGeometry(0.058, 0.089, 0.43, 8).rotateY(0.2), "#414e4e"),
    box([0.012, 0.37, 0.01], [0.044, -0.012, 0.054], "#69716a"),
  ]);
  const cuff = combine([
    facet(new CylinderGeometry(0.064, 0.068, 0.075, 8), "#795e43"),
    ...[-0.025, 0.005, 0.027].map(y => facet(new CylinderGeometry(0.068, 0.068, 0.012, 8).translate(0, y, 0), "#b6a17d")),
    box([0.035, 0.027, 0.014], [0.018, -0.004, 0.068], "#4d4840"),
    box([0.021, 0.014, 0.017], [0.018, -0.004, 0.07], "#b5a37c"),
  ]);
  const palm = combine([
    facet(new SphereGeometry(1, 8, 5).scale(0.072, 0.087, 0.032), "#bd936e"),
    facet(new SphereGeometry(1, 7, 4).scale(0.034, 0.047, 0.035).translate(-0.036, -0.024, 0.006), "#c39a76"),
    ...[-0.043, -0.014, 0.016, 0.045].map(x => box([0.008, 0.045, 0.004], [x, 0.009, 0.029], "#c99f7c")),
  ]);
  const proximal = combine([
    facet(new CapsuleGeometry(0.0145, 0.032, 2, 6).translate(0, 0.029, 0), "#c09670"),
    box([0.020, 0.006, 0.004], [0, 0.048, 0.012], "#9b7355"),
  ]);
  const distal = combine([
    facet(new CapsuleGeometry(0.013, 0.020, 2, 6).translate(0, 0.021, 0), "#cba17a"),
    box([0.016, 0.017, 0.004], [0, 0.028, 0.012], "#d9bc97"),
  ]);
  return { sleeve, cuff, palm, proximal, distal };
}
