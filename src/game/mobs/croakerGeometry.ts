import { BoxGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Feet at zero: a broad head, folded haunches and planted front toes.
 * Shared block-cut pieces keep the silhouette readable in the floor's light. */
export function croakerGeometry(eyes = false) {
  const pieces = eyes
    ? [-1, 1].map(s => new BoxGeometry(.065, .06, .055).translate(s * .14, .325, .19))
    : [
      new BoxGeometry(.34, .20, .32).translate(0, .17, -.02),
      new BoxGeometry(.42, .16, .24).translate(0, .25, .12),
      ...[-1, 1].flatMap(s => [
        new BoxGeometry(.17, .17, .26).translate(s * .205, .105, -.10),
        new BoxGeometry(.10, .16, .09).translate(s * .16, .10, .21),
        new BoxGeometry(.14, .04, .18).translate(s * .18, .02, .25),
      ]),
    ];
  const result = mergeGeometries(pieces)!;
  pieces.forEach(p => p.dispose());
  return result;
}
