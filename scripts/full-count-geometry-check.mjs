import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replaceAll("\\", "/"), temp = mkdtempSync(join(tmpdir(), "full-count-"));
const entry = join(temp, "entry.ts"), out = join(temp, "bundle.mjs");
writeFileSync(entry, `import '${root}/src/game/rooms/shipped';\n` +
  ["dungeon/runFloor", "dungeon/footprint", "dungeon/layout", "dungeon/types", "rooms/placements", "rooms/dressingContext", "props/specs", "world", "relics/offer"]
    .map(p => `export * from '${root}/src/game/${p}';`).join("\n"));
await build({ entryPoints: [entry], outfile: out, bundle: true, platform: "node", format: "esm", logLevel: "error",
  define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" } });
const L = await import(pathToFileURL(out).href);

// An independent player flood, not the furnishing algorithm or enemy planner.
function reachableGround(room, props) {
  const step = .35, radius = L.PLAYER_CAPSULE_RADIUS + .025;
  const half = Math.max(...L.DIRS.map(dir => L.doorReach(room, dir)));
  const width = Math.ceil(half * 2 / step) + 1, queue = [], seen = new Set(), valid = new Map();
  const point = n => ({ x: -half + n % width * step, z: -half + Math.floor(n / width) * step });
  const clear = p => L.insideRoom(room, p.x, p.z, radius) && props.every(o =>
    Math.hypot(p.x - o.x, p.z - o.z) > L.PROP_SPECS[o.kind].radius * (o.scale ?? 1) + radius);
  const segment = (a, b) => {
    if (!L.roomSegmentClear(room, a.x, a.z, b.x, b.z, radius)) return false;
    const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    return props.every(o => {
      const t = Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / (length || 1)));
      return Math.hypot(a.x + t * dx - o.x, a.z + t * dz - o.z) > L.PROP_SPECS[o.kind].radius * (o.scale ?? 1) + radius;
    });
  };
  for (const dir of L.DIRS.filter(dir => room.links[dir])) {
    const [x, , z] = L.spawnAfterTravel(room, L.OPPOSITE[dir]).position;
    const n = Math.round((z + half) / step) * width + Math.round((x + half) / step);
    if (clear(point(n)) && segment({ x, z }, point(n))) { queue.push(n); seen.add(n); }
  }
  for (let at = 0; at < queue.length; at++) {
    const n = queue[at], x = n % width, z = Math.floor(n / width);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const i = x + dx, j = z + dz, next = j * width + i;
      if (i < 0 || j < 0 || i >= width || j >= width || seen.has(next)) continue;
      if (!valid.has(next)) valid.set(next, clear(point(next)));
      if (!valid.get(next) || !segment(point(n), point(next))) continue;
      queue.push(next); seen.add(next);
    }
  }
  return queue.map(point);
}

let rooms = 0, chests = 0, fuller = 0;
const failures = [];
for (let seed = 1; seed <= 60; seed++) for (const floor of [1, 2, 3]) {
  const dungeon = L.generateRunFloor(seed, floor), room = dungeon.rooms.find(r => r.id === dungeon.vaultId);
  const options = L.roomDressingOptions({ dungeon, floor, fullCountFloor: floor }, room, dungeon.seed);
  const base = L.placementsFor(room, dungeon.seed, { ...options, brimming: false });
  const hoard = L.placementsFor(room, dungeon.seed, options), solids = hoard.filter(p => L.PROP_SPECS[p.kind].solid);
  const label = `${seed}/${floor}/${room.id}/${room.shape}`;
  rooms++;
  if (JSON.stringify(hoard.slice(0, base.length)) !== JSON.stringify(base)) failures.push(`${label}: existing chest identities moved`);
  if (hoard.length > base.length) fuller++;
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
    if (L.propCollidersOverlap(solids[i], solids[j])) failures.push(`${label}: ${solids[i].kind} intersects ${solids[j].kind}`);
  }
  const ground = reachableGround(room, solids);
  for (const chest of hoard.filter(p => p.kind === "chest")) {
    chests++;
    if (!ground.some(p => Math.hypot(p.x - chest.x, p.z - chest.z) < L.CLOSE_REACH - .05)) {
      failures.push(`${label}: chest at ${chest.x},${chest.z} is unreachable`);
    }
  }
}
for (let seed = 1; seed <= 60; seed++) for (const floor of [1, 2, 3]) {
  const target = L.hoardFloorFor(seed, 3, floor);
  assert.ok(target >= floor && target <= 3, "acquisition cannot assign the reward to a departed floor");
  assert.equal(target, L.hoardFloorFor(seed, 3, floor), "seed and acquisition floor replay the same reward");
}
console.log({ rooms, chests, fuller, failures: failures.length, examples: failures.slice(0, 12) });
assert.equal(fuller, rooms, "the hoard materially changes each sampled vault");
assert.equal(failures.length, 0, `hoards must retain loot, fit and remain reachable: ${JSON.stringify(failures.slice(0, 12))}`);
console.log("PASS generated Full Count hoards: stable loot, physical clearance and reachable chests");
