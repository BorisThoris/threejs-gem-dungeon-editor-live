import { L } from "./space.mjs";
const KINDS = ["start","end","normal","treasure","trap","shop","library","memory","challenge","arena","shrine","secret"];
// Mirror generate.ts's own tables by probing shapeFits and the exported sizes.
const SIZES = L.ROOM_SIZES;
const RANGE = {
  start: [16, 18], end: [22, 28], arena: [24, 30], trap: [16, 20], shop: [14, 18],
  library: [14, 18], treasure: [16, 24], memory: [16, 22], challenge: [16, 22],
  normal: [14, 22], shrine: [14, 18], secret: [14, 16],
};
const SHAPES = {
  arena: ["circle", "octagon", "triangle"], memory: ["hexagon", "octagon"],
  end: ["circle", "octagon", "square", "triangle"], treasure: ["square", "diamond", "hexagon"],
  shrine: ["hexagon", "octagon", "circle"], secret: ["square", "square", "octagon"],
};
for (const k of KINDS) {
  const [lo, hi] = RANGE[k];
  const sizes = SIZES.filter((s) => s >= lo && s <= hi);
  const out = [];
  for (const s of sizes) {
    const shapes = [...new Set(SHAPES[k] ?? ["square", "circle"])].filter((sh) => L.shapeFits(sh, s));
    out.push(`${s}:[${shapes.join("|")}]`);
  }
  console.log(k.padEnd(10), out.join("  "));
}
