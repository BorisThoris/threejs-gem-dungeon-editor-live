import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replaceAll("\\", "/");
const temp = mkdtempSync(join(tmpdir(), "world-check-"));
const entry = join(temp, "entry.ts"), out = join(temp, "bundle.mjs");
writeFileSync(entry, `import "${root}src/game/rooms/shipped";\n` + [
  "dungeon/generate", "dungeon/types", "rooms/districts", "rooms/biomes", "rooms/terrainPattern", "world",
].map(f => `export * from "${root}src/game/${f}";`).join("\n"));
await build({ entryPoints: [entry], outfile: out, bundle: true, platform: "node", format: "esm",
  jsx: "automatic", logLevel: "error", define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" } });
const L = await import(pathToFileURL(out).href);
let rooms = 0, tiles = 0, matching = 0, links = 0;
const biomes = new Set();
for (let seed = 1; seed <= 120; seed++) for (const floor of [1, 2, 3]) {
  const d = L.generateDungeon({ seed, floor });
  assert.deepEqual(d, L.generateDungeon({ seed, floor }), "geography reproduces from seed and depth");
  const byId = new Map(d.rooms.map(r => [r.id, r]));
  for (const district of Object.keys(L.DISTRICTS)) {
    const members = d.rooms.filter(r => r.district === district && r.kind !== "secret");
    assert.ok(members.length, "all three districts exist");
    const seen = new Set([members[0].id]), queue = [members[0]];
    for (const r of queue) for (const id of Object.values(r.links)) {
      const next = byId.get(id);
      if (next?.district === district && !seen.has(id)) { seen.add(id); queue.push(next); }
    }
    assert.equal(seen.size, members.length, "each district is connected through real doors");
  }
  for (const r of d.rooms) {
    rooms++;
    assert.ok(L.BIOMES_FOR[r.kind].includes(r.biome), "room purpose constrains its materials");
    assert.equal(L.biomeIdFor(r.kind, r.id, r.seed, r), r.biome, "runtime reads generated geography");
    biomes.add(r.biome);
    if (r.secret) assert.equal(byId.get(r.secret.to).district, r.district, "secrets inherit host history");
    for (const id of Object.values(r.links)) { links++; if (byId.get(id).district === r.district) matching++; }
    const terrain = L.terrainFor(r);
    for (const b of [...terrain.paving, ...terrain.deposits]) {
      tiles++;
      assert.ok(b.position[1] + b.size[1] / 2 < L.GROUND_Y + 0.04, "terrain cannot become a movement obstacle");
      for (const dx of [-b.size[0] / 2, b.size[0] / 2]) for (const dz of [-b.size[2] / 2, b.size[2] / 2]) {
        const x = b.position[0] + dx, z = b.position[2] + dz;
        assert.ok(Math.hypot(x, z) <= L.floorReach(r, Math.atan2(z, x)) + 0.001, "whole tiles stay on shaped floors");
      }
    }
  }
  const host = d.rooms.find(r => r.secret);
  const shut = host ? L.reachableWithout(d.rooms, d.startId, d.vaultId ?? "missing") : null;
  if (shut) assert.ok(shut.has(d.endId), "district assignment preserves the unlocked exit route");
}
assert.equal(biomes.size, L.BIOMES.length, "every declared biome remains reachable");
assert.ok(matching / links > 0.65, "most doorways continue the same district");
console.log(`World checks passed: ${rooms} rooms, ${tiles} terrain tiles, ${biomes.size} biomes; ${(matching / links * 100).toFixed(1)}% of doorways stay within a district.`);
