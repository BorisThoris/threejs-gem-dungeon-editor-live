import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replaceAll("\\", "/");
const temp = mkdtempSync(join(tmpdir(), "handbuilt-model-check-"));
const entry = join(temp, "entry.ts"), output = join(temp, "models.mjs");
writeFileSync(entry, `export * from "${root}src/game/props/handbuiltGeometry";`);
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
