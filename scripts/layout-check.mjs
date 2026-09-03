// Layout invariants, checked over every room size and hundreds of seeds.
//
//   node scripts/layout-check.mjs
//
// The bugs this guards against were real: a spike ring and a pedestal ring
// whose every point fell in a door lane, so trap rooms had no spikes and
// the memory trial no crystals, in every room the generator ever made. The
// smoke test drives the game but not its geometry; this does.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "layout-check-"));
const entry = join(dir, "entry.ts");
writeFileSync(
  entry,
  `export * from "${root}src/game/dungeon/layout";
   export * from "${root}src/game/dungeon/generate";
   export * from "${root}src/game/dungeon/types";
   export * from "${root}src/game/world";`
);
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error" });
const L = await import(pathToFileURL(out).href);

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`);
  if (!ok) failures++;
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const room = (size, kind = "normal", shape = "square") => ({ id: "r", kind, grid: { x: 0, z: 0 }, size, shape, links: { north: "a" } });

for (const size of L.ROOM_SIZES) {
  const r = room(size);
  const near = L.quadrantSpots(r, "near");
  const far = L.quadrantSpots(r, "far");
  const corners = L.cornerSpots(r);
  const half = size / 2;
  check(`size ${size}: anchors clear of the lanes`, [...near, ...far].every(([x, , z]) => !L.inDoorLane(x, z)));
  check(`size ${size}: near and far are apart`, near.every((n, i) => dist(n, far[i]) >= 0.9), `${dist(near[0], far[0]).toFixed(2)}`);
  check(`size ${size}: far and corner are apart`, far.every((f, i) => dist(f, corners[i]) >= 1.2), `${dist(far[0], corners[0]).toFixed(2)}`);
  check(`size ${size}: corners inside the walls`, corners.every(([x, , z]) => Math.abs(x) < half && Math.abs(z) < half));
  let hazardsMissing = 0;
  let hazardsInLane = 0;
  let gemOnReserved = 0;
  let gemUnreachable = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const reserved = near.slice(0, 3);
    const gem = L.gemPosition(r, seed, reserved);
    if (reserved.some((a) => dist(a, gem) < 1.0)) gemOnReserved++;
    const hz = L.trapHazards(r, L.gemPosition(r, seed));
    if (hz.length === 0) hazardsMissing++;
    if (hz.some(([x, , z]) => Math.abs(x) < L.LANE_HALF_WIDTH + L.HAZARD_RADIUS || Math.abs(z) < L.LANE_HALF_WIDTH + L.HAZARD_RADIUS)) hazardsInLane++;
    // Some standing point inside the room is within pickup reach of the gem and outside every patch.
    const g = L.gemPosition(r, seed);
    let reachable = false;
    for (let a = 0; a < 24 && !reachable; a++) {
      const px = g[0] + Math.cos((a / 24) * Math.PI * 2) * 1.0;
      const pz = g[2] + Math.sin((a / 24) * Math.PI * 2) * 1.0;
      const inRoom = Math.abs(px) < half - 0.4 && Math.abs(pz) < half - 0.4;
      if (inRoom && hz.every(([x, , z]) => Math.hypot(px - x, pz - z) > L.HAZARD_RADIUS + 0.3)) reachable = true;
    }
    if (!reachable) gemUnreachable++;
  }
  check(`size ${size}: every trap room has spikes`, hazardsMissing === 0, `${hazardsMissing} of 200 without`);
  check(`size ${size}: spikes never touch a lane`, hazardsInLane === 0, `${hazardsInLane} of 200 did`);
  check(`size ${size}: the gem avoids reserved anchors`, gemOnReserved === 0, `${gemOnReserved} of 200 collided`);
  check(`size ${size}: the gem can be taken without touching spikes`, gemUnreachable === 0, `${gemUnreachable} of 200 unreachable`);
}

// Shaped rooms draw a polygon inside their box, so anchors have to sit on
// the floor that polygon actually covers - or as close as the door lanes
// allow, which in the smallest odd shapes is not all the way.
for (const shape of ["circle", "hexagon", "octagon", "diamond", "triangle"]) {
  let off = 0;
  let inLane = 0;
  for (const size of L.ROOM_SIZES) {
    // A shape the generator would never use at this size proves nothing.
    if (!L.shapeFits(shape, size)) continue;
    const r = room(size, "normal", shape);
    const inside = L.inscribedRadius(r);
    for (const spot of [...L.quadrantSpots(r, "near"), ...L.quadrantSpots(r, "far"), ...L.cornerSpots(r)]) {
      const radius = Math.hypot(spot[0], spot[2]);
      // Allowed to sit proud only when pulling it in would put it in a lane.
      // Half a unit of overhang is invisible; three, as it was, is not.
      if (radius > inside + 0.6) off++;
      if (L.inDoorLane(spot[0], spot[2])) inLane++;
    }
  }
  check(`${shape}: anchors stay on the drawn floor where the shape fits`, off === 0, `${off} off it`);
  check(`${shape}: anchors stay clear of the lanes`, inLane === 0, `${inLane} in a lane`);
}

// The generator: connected, the exit reachable, every kind once, sizes legal.
let bad = 0;
for (let seed = 1; seed <= 500; seed++) {
  const d = L.generateDungeon({ seed });
  const depth = L.bfsDepth(d.rooms, d.startId);
  if (!depth.has(d.endId) || depth.size !== d.rooms.length) bad++;
  if (d.rooms.some((r) => !L.ROOM_SIZES.includes(r.size))) bad++;
  if (d.rooms.some((r) => !L.shapeFits(r.shape, r.size))) bad++;
  const kinds = d.rooms.map((r) => r.kind);
  if (kinds.filter((k) => k === "end").length !== 1 || kinds.filter((k) => k === "start").length !== 1) bad++;
  if (d.rooms.find((r) => r.id === d.endId).template) bad++;
}
check("500 dungeons: connected, one start, one end, legal sizes and shapes, no template on the end", bad === 0, `${bad} bad`);

console.log(failures === 0 ? "\nAll layout checks passed." : `\n${failures} layout check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
