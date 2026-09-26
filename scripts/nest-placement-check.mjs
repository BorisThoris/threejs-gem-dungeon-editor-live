import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replaceAll("\\", "/"), temp = mkdtempSync(join(tmpdir(), "nest-placement-"));
const entry = join(temp, "entry.ts"), out = join(temp, "bundle.mjs");
writeFileSync(entry, `import '${root}/src/game/rooms/shipped';\n` +
  ["dungeon/generate", "dungeon/footprint", "dungeon/layout", "dungeon/types", "thief/nest", "rooms/kinds", "rooms/placements",
    "sentry/placement", "props/specs", "worldbuilding/elevation", "world"]
    .map(p => `export * from '${root}/src/game/${p}';`).join("\n"));
await build({ entryPoints: [entry], outfile: out, bundle: true, platform: "node", format: "esm", logLevel: "error",
  define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" } });
const L = await import(pathToFileURL(out).href);
// An independent flood from real entry landings, without the placement
// owner's waypoint planner. A clear-looking pocket is not necessarily reachable.
function approachable(room, target, obstacles) {
  const cells = L.floorRects(room), step = 0.5, body = L.PLAYER_CAPSULE_RADIUS;
  const left = Math.min(...cells.map(r => r.x - r.width / 2));
  const top = Math.min(...cells.map(r => r.z - r.depth / 2));
  const width = Math.ceil((Math.max(...cells.map(r => r.x + r.width / 2)) - left) / step) + 1;
  const height = Math.ceil((Math.max(...cells.map(r => r.z + r.depth / 2)) - top) / step) + 1;
  const visited = new Uint8Array(width * height), valid = new Uint8Array(width * height), queue = [];
  const point = n => [left + n % width * step, top + Math.floor(n / width) * step];
  const clear = (x, z) => L.insideRoom(room, x, z, body)
    && obstacles.every(o => Math.hypot(x - o.x, z - o.z) > o.r + body);
  const segment = (a, b) => {
    if (!L.roomSegmentClear(room, ...a, ...b, body)) return false;
    const dx = b[0] - a[0], dz = b[1] - a[1], length = dx * dx + dz * dz;
    return obstacles.every(o => {
      const t = Math.max(0, Math.min(1, ((o.x - a[0]) * dx + (o.z - a[1]) * dz) / (length || 1)));
      return Math.hypot(a[0] + t * dx - o.x, a[1] + t * dz - o.z) > o.r + body;
    });
  };
  for (const dir of L.DIRS.filter(dir => room.links[dir])) {
    const [x, , z] = L.spawnAfterTravel(room, L.OPPOSITE[dir]).position;
    const i = Math.round((x - left) / step), j = Math.round((z - top) / step), n = j * width + i;
    if (i >= 0 && i < width && j >= 0 && j < height && clear(...point(n)) && segment([x, z], point(n))) {
      queue.push(n); visited[n] = 1;
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const n = queue[q], at = point(n), i = n % width, j = Math.floor(n / width);
    if (Math.hypot(at[0] - target[0], at[1] - target[2]) <= L.CLOSE_REACH && segment(at, [target[0], target[2]])) return true;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj, next = nj * width + ni;
      if (ni < 0 || nj < 0 || ni >= width || nj >= height || visited[next]) continue;
      if (!valid[next]) valid[next] = clear(...point(next)) ? 2 : 1;
      if (valid[next] === 1 || !segment(at, point(next))) continue;
      visited[next] = 1; queue.push(next);
    }
  }
  return false;
}
const failures = [];
const counts = {};
const shapes = new Set();
let nests = 0;
for (let seed = 1; seed <= 150; seed++) for (const floor of [2, 3]) {
  const d = L.generateDungeon({ seed, floor });
  const room = d.rooms.find(r => r.id === L.nestRoom(d));
  assert.ok(room, "a thief's floor has a nest");
  const key = d.keyRoomId === room.id ? L.keyFor(room, d.seed) : null;
  const sentry = L.sentryFor(room, d.seed, floor, key ? [key] : [])?.at ?? null;
  const props = L.placementsFor(room, d.seed, { key, sentry });
  const at = L.nestPosition(room, d.seed, { key, sentry });
  assert.deepEqual(L.nestPosition(room, d.seed, { key, sentry }), at, "revisiting keeps the heap in the same place");
  shapes.add(room.shape);
  const problems = [];
  if (!L.insideRoom(room, at[0], at[2], L.NEST_RADIUS)) problems.push("off floor");
  if (Math.abs(at[1] - L.GROUND_Y - L.floorRiseAt(room, at[0], at[2])) > 0.01) problems.push("wrong height");
  if (props.some(p => L.PROP_SPECS[p.kind].solid &&
    Math.hypot(p.x - at[0], p.z - at[2]) < L.PROP_SPECS[p.kind].radius * (p.scale ?? 1) + L.NEST_RADIUS)) problems.push("solid furniture");
  const obstacles = props.filter(p => L.PROP_SPECS[p.kind].solid)
    .map(p => ({ x: p.x, z: p.z, r: L.PROP_SPECS[p.kind].radius * (p.scale ?? 1) }));
  if (sentry) obstacles.push({ x: sentry[0], z: sentry[2], r: L.SENTRY_POST_RADIUS });
  const gem = L.gemFor(room, d.seed);
  if (room.kind === "trap" && gem) for (const [x, , z] of L.trapHazards(room, gem)) obstacles.push({ x, z, r: L.HAZARD_RADIUS });
  if (!approachable(room, at, obstacles)) problems.push("no safe pickup route");
  if (L.overhangsLane(at[0], at[2], L.NEST_RADIUS, room)) problems.push("door lane");
  for (const problem of problems) counts[problem] = (counts[problem] ?? 0) + 1;
  if (problems.length) failures.push({ seed, floor, room: room.id, shape: room.shape, at, problems });
  nests++;
}
console.log(JSON.stringify({ nests, shapes: [...shapes], counts, examples: failures.slice(0, 8) }, null, 2));
assert.equal(failures.length, 0, "every nest is on its real floor and clear of solid furniture");
