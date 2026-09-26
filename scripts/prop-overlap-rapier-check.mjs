/** Compare the editor's horizontal overlap predicate with shipped Rapier shapes. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import RAPIER from "@dimforge/rapier3d-compat";

const source = readFileSync(fileURLToPath(new URL("../src/game/props/specs.ts", import.meta.url)), "utf8");
const compiled = await transform(source, { loader: "ts", format: "esm" });
const { PROP_SPECS, propCollidersOverlap } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString("base64")}`);
await RAPIER.init({});

const solid = Object.keys(PROP_SPECS).filter(kind => PROP_SPECS[kind].collider);
let randomState = 0x579dab13;
const random = () => {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let value = Math.imul(randomState ^ randomState >>> 15, 1 | randomState);
  value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};
const shapeFor = placement => {
  const spec = PROP_SPECS[placement.kind].collider;
  const scale = placement.scale;
  return spec.shape === "cylinder"
    ? new RAPIER.Cylinder(spec.args[0] * scale, spec.args[1] * scale)
    : new RAPIER.Cuboid(...spec.args.map(value => value * scale));
};
const poseFor = placement => {
  const spec = PROP_SPECS[placement.kind].collider;
  const half = placement.rotation / 2;
  return {
    position: { x: placement.x, y: spec.y * placement.scale, z: placement.z },
    rotation: { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) },
  };
};
const rapierOverlap = (a, b) => {
  const first = poseFor(a), second = poseFor(b);
  return shapeFor(a).intersectsShape(first.position, first.rotation,
    shapeFor(b), second.position, second.rotation);
};

let comparisons = 0;
let overlaps = 0;
const differences = [];
for (const firstKind of solid) for (const secondKind of solid) {
  for (let sample = 0; sample < 96; sample++) {
    const a = { kind: firstKind, x: 0, z: 0,
      scale: [0.5, 1, 1.5][sample % 3], rotation: [0, Math.PI / 8, Math.PI / 4, Math.PI / 2][sample % 4] };
    const angle = random() * Math.PI * 2;
    const distance = sample % 2 === 0 ? random() * 3.2 : 0.2 + random() * 2;
    const b = { kind: secondKind, x: Math.cos(angle) * distance, z: Math.sin(angle) * distance,
      scale: [0.5, 1, 1.5][(sample + 1) % 3], rotation: (random() - 0.5) * Math.PI * 2 };
    const predicted = propCollidersOverlap(a, b);
    const physical = rapierOverlap(a, b);
    comparisons++;
    if (physical) overlaps++;
    if (predicted !== physical && differences.length < 8)
      differences.push({ a, b, predicted, physical });
  }
}
assert.deepEqual(differences, [], `${comparisons} overlap comparisons against Rapier`);
assert.ok(overlaps > 1000 && overlaps < comparisons - 1000, "the matrix includes both collisions and clearances");
console.log(`PASS ${comparisons} prop overlap comparisons across ${solid.length} solid kinds, rotations and scales (${overlaps} blocked)`);
