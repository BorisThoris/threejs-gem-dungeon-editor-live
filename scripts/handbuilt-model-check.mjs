import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replaceAll("\\", "/");
const temp = mkdtempSync(join(tmpdir(), "handbuilt-model-check-"));
const entry = join(temp, "entry.ts"), output = join(temp, "models.mjs");
writeFileSync(entry, ["props/handbuiltGeometry", "props/contactShadowGeometry", "worldbuilding/elevation"]
  .map(file => `export * from "${root}src/game/${file}";`).join("\n"));
await build({ entryPoints: [entry], outfile: output, bundle: true, platform: "node", format: "esm", logLevel: "error" });
const models = await import(pathToFileURL(output).href);
const triangles = geometry => geometry.index.count / 3;
const specimens = {
  "chair wood": [models.chairWoodGeometry(), 22],
  "chair legs": [models.chairLegGeometry(), 32],
  "table legs": [models.tableLegGeometry(), 32],
  "crate slats": [models.crateSlatGeometry(), 24],
  "barrel hoops": [models.barrelHoopGeometry(), 128],
  "finished chair": [models.finishedWoodGeometry("chair"), 54],
  "finished crate": [models.finishedWoodGeometry("crate"), 36],
  "finished table": [models.finishedWoodGeometry("table"), 44],
  "spike patch": [models.spikePatchGeometry(), 60],
};
for (const [name, [geometry, expected]] of Object.entries(specimens)) {
  assert.equal(triangles(geometry), expected, `${name} removes its buried or excess faces`);
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox && geometry.boundingBox.min.y >= -0.01 && geometry.boundingBox.max.y <= 1.16,
    `${name} remains in the original prop footprint`);
  if (name.startsWith("finished")) {
    const colors = geometry.attributes.color;
    assert.equal(colors.count, geometry.attributes.position.count, `${name} bakes both wood tints`);
    assert.ok(colors.getX(0) > colors.getX(colors.count - 1), `${name} retains lighter top and darker supports`);
  }
  if (name === "spike patch") {
    assert.ok(geometry.boundingBox.min.x < -.3 && geometry.boundingBox.max.x > .35,
      "hazard keeps all five points inside its original footprint");
  }
  geometry.dispose();
}
const oldTriangles = 72 + 60 + 36 + 56 + 224;
const newTriangles = 54 + 44 + 36 + 40 + 128;
assert.ok(newTriangles < oldTriangles * 0.7);
console.log(`PASS handbuilt furniture: four prop types fall from 17 to 5 material draws and ${oldTriangles} to ${newTriangles} triangles per set`);
const room = { id: "shadow", kind: "normal", shape: "square", size: 20, links: {}, grid: { x: 0, z: 0 } };
const shelf = { kind: "bookshelf", x: 0, z: 0 };
const bounds = geometry => { geometry.computeBoundingBox(); return geometry.boundingBox; };
const normalShadow = models.contactShadowGeometry(room, [shelf]);
const rotatedShadow = models.contactShadowGeometry(room, [{ ...shelf, rotation: Math.PI / 2 }]);
const a = bounds(normalShadow), b = bounds(rotatedShadow);
assert.ok(a.max.x > a.max.z * 3, "thin shelving has a thin contact footprint, not a broad circle");
assert.ok(Math.abs(a.max.x - b.max.z) < 1e-6 && Math.abs(a.max.z - b.max.x) < 1e-6,
  "contact rotates with its physical prop");
const scaledShadow = models.contactShadowGeometry(room, [{ ...shelf, scale: 2 }]);
assert.ok(Math.abs(bounds(scaledShadow).max.x - a.max.x * 2) < 1e-6, "contact follows prop scale");
assert.equal(normalShadow.index.count, 6, "ordinary contact remains two triangles");
const banner = models.contactShadowGeometry(room, [{ kind: "banner", x: 0, z: 0 }]);
assert.equal(banner.index.count, 0, "hanging banners do not paint floor contact");
const gallery = { ...room, wings: { north: 6 } };
const rampShadow = models.contactShadowGeometry(gallery, [], [[0, 2, -14]]);
const vertices = rampShadow.attributes.position;
assert.ok(vertices.count > 4 && bounds(rampShadow).max.y > 0.8, "landing-edge contact follows the raised floor and ramp knee");
for (let i = 0; i < vertices.count; i++) {
  assert.ok(Math.abs(vertices.getY(i) - models.floorHeightAt(gallery, vertices.getX(i), vertices.getZ(i)) - models.CONTACT_SHADOW_LIFT) < 1e-6,
    "shadow vertices sit on the game-owned floor");
}
for (const geometry of [normalShadow, rotatedShadow, scaledShadow, banner, rampShadow]) {
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  for (let i = 0; i < normals.count; i++) assert.ok(normals.getY(i) > 0, "contact faces upward without double-sided rendering");
  geometry.dispose();
}
console.log("PASS contact silhouettes, rotation, scale, upward winding and raised landing geometry");
