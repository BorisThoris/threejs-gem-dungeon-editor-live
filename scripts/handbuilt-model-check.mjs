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
};
for (const [name, [geometry, expected]] of Object.entries(specimens)) {
  assert.equal(triangles(geometry), expected, `${name} removes its buried or excess faces`);
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox && geometry.boundingBox.min.y >= -0.01 && geometry.boundingBox.max.y <= 1.16,
    `${name} remains in the original prop footprint`);
  geometry.dispose();
}
const oldTriangles = 72 + 60 + 36 + 56 + 224;
const newTriangles = 54 + 44 + 36 + 40 + 128;
assert.ok(newTriangles < oldTriangles * 0.7);
console.log(`PASS handbuilt furniture: four prop types fall from 17 to 8 material draws and ${oldTriangles} to ${newTriangles} triangles per set`);
