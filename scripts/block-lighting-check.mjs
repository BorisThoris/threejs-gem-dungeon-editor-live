import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const root = process.cwd().replaceAll("\\", "/"), temp = mkdtempSync(join(tmpdir(), "block-light-"));
const entry = join(temp, "entry.ts"), out = join(temp, "bundle.mjs");
writeFileSync(entry, `import '${root}/src/game/rooms/shipped';\n` +
  ["lighting/field", "lighting/perception", "ladder/sight", "player/where", "dungeon/generate", "rooms/placements", "worldbuilding/passageLighting"].map(p => `export * from '${root}/src/game/${p}';`).join("\n"));
await build({ entryPoints: [entry], outfile: out, bundle: true, platform: "node", format: "esm", logLevel: "error",
  define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" } });
const L = await import(pathToFileURL(out).href);
const room = { id: "test", kind: "normal", shape: "square", size: 20, links: {}, grid: { x: 0, z: 0 } };
const source = { x: -5.5, z: 0.5, intensity: 14, range: 10, r: 1, g: 0.4, b: 0.1 };
const sample = (f, x, z) => f.data[(Math.floor((z - f.minZ) / f.cell) * f.width + Math.floor((x - f.minX) / f.cell)) * 4];
const f = L.createLightField(room);
L.updateLightField(f, [source]);
assert.equal(sample(f, -5.5, 0.5), 255);
assert.ok(sample(f, -3.5, 0.5) > sample(f, 0.5, 0.5), "light fades with walking distance");
assert.equal(sample(f, 5.5, 0.5), 0, "finite reach");
const baseline = f.data.slice();
L.publishLightField(room.id, f);
assert.ok(L.localLightAt(room.id, -5.5, 0.5) > L.localLightAt(room.id, 0.5, 0.5), "stealth reads the visible falloff");
assert.equal(L.localLightAt("other-room", -5.5, 0.5), null, "field never follows the player into another room");
L.setPlayerAt(-5.5, 0.5);
assert.ok(L.visibilityFor("sentry", room.id, 0, 1).light >= 0.5, "fixture exposes a player beside it");
L.setPlayerAt(8.5, 0.5);
assert.equal(L.visibilityFor("sentry", room.id, 0, 1).light, 0, "distant fixture does not expose a dark corner");
assert.equal(L.visibilityFor("warden", room.id, 0, 1).light, 0, "blind Warden keeps its own sensory rules");
assert.equal(L.sampleLightField(f, 999, 999), 0, "sampling outside bounds cannot wrap");
L.releaseLightField(f);
assert.equal(L.localLightAt(room.id, -5.5, 0.5), null, "unmount releases field");
L.updateLightField(f, [source]); assert.deepEqual(f.data, baseline, "updates do not accumulate light");
L.updateLightField(f, [{ ...source, intensity: 0 }]); assert.equal(sample(f, -5.5, 0.5), 0, "extinguished source is dark");
const ring = L.createLightField({ ...room, shape: "ring" });
L.updateLightField(ring, [{ ...source, x: -7.5, range: 18 }]);
assert.equal(sample(ring, 0.5, 0.5), 0, "sealed core does not receive light");
assert.equal(sample(ring, 7.5, 0.5), 0, "light cannot cross the core to the opposite walk");
const huge = L.createLightField({ ...room, size: 500 });
assert.ok(huge.width <= 128 && huge.height <= 128, "authored size cannot exceed grid budget");
let dark = 0, ordinary = 0;
for (let seed = 1; seed <= 50; seed++) {
  const dungeon = L.generateDungeon({ seed, floor: 1 });
  for (const r of dungeon.rooms) {
    const unlit = L.isUnlitRoom(r, dungeon.seed);
    assert.equal(unlit, L.isUnlitRoom(r, dungeon.seed), "room lighting is deterministic");
    if (r.kind === "normal" || r.kind === "treasure") ordinary++;
    if (unlit) {
      dark++;
      assert.ok(!L.placementsFor(r, dungeon.seed).some(p => p.kind === "torch"), "unlit rooms have no braziers");
      assert.ok(L.passageLampsFor(r).every(lamp => r.wings?.[lamp.dir] > 0), "dark chambers retain practical lamps only in passages");
    }
    if (r.kind !== "normal" && r.kind !== "treasure") assert.equal(unlit, false, "safe rooms and trials keep fixtures");
  }
}
assert.ok(dark > 0 && dark < ordinary, "generated floors contain both lighting profiles");
console.log(`PASS block falloff, extinction, wall occlusion, bounded grid, ${dark}/${ordinary} unlit ordinary rooms across 50 seeds`);
