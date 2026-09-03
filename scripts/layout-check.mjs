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
  // The shipped templates are registered for their side effect: the
  // generator asks for them by kind, and asking with an empty registry
  // draws different random numbers, so a check that skips this is
  // validating dungeons the game never builds.
  `import "${root}src/game/rooms/shipped";
   export * from "${root}src/game/dungeon/layout";
   export * from "${root}src/game/dungeon/generate";
   export * from "${root}src/game/dungeon/types";
   export * from "${root}src/game/items/catalog";
   export * from "${root}src/game/rooms/layouts";
   export * from "${root}src/game/systems/bearing";
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

// The arena's arms must cover everywhere the player can stand, which is the
// square box its walls make - not the polygon its floor is drawn as. Rings
// that stopped at the drawn floor left four safe corners in a room whose
// whole promise is that there are none.
for (const size of L.ROOM_SIZES) {
  const half = size / 2;
  const rings = [];
  for (let r = L.ARENA_INNER_RADIUS; r < half * Math.SQRT2; r += L.ARENA_RING_GAP) rings.push(r);
  const reach = rings[rings.length - 1] + L.HAZARD_RADIUS;
  // The farthest a player's centre can get from the middle, capsule included.
  const corner = Math.hypot(half - 0.3, half - 0.3);
  check(`arena ${size}: the arms reach the corners of the box`, reach >= corner, `arms ${reach.toFixed(1)}, corner ${corner.toFixed(1)}`);
  check(`arena ${size}: no gap wider than a player between rings`, L.ARENA_RING_GAP <= L.HAZARD_RADIUS * 2, `gap ${L.ARENA_RING_GAP}`);
}

// Which side a sound is on. The sign matters more than the magnitude: a
// cue panned the wrong way sends the player towards the thing it is
// warning them about, and this project has already got a sign like this
// backwards once, on the minimap, where it survived because it was only
// wrong when facing east or west.
{
  const N = { x: 0, z: -1 };
  const S = { x: 0, z: 1 };
  const E = { x: 1, z: 0 };
  const W = { x: -1, z: 0 };
  const side = (d, yaw) => L.sideOf(d.x, d.z, yaw);
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  // Facing north (yaw 0, the camera's own convention in DIR_YAW).
  check("facing north, east is on the right", side(E, L.DIR_YAW.north) > 0.99);
  check("facing north, west is on the left", side(W, L.DIR_YAW.north) < -0.99);
  check("facing north, north has no side to it", near(side(N, L.DIR_YAW.north), 0));
  check("facing north, south has no side to it", near(side(S, L.DIR_YAW.north), 0));
  // And it has to hold from every heading, not only the one it was written for.
  check("facing west, north is on the right", side(N, L.DIR_YAW.west) > 0.99);
  check("facing east, north is on the left", side(N, L.DIR_YAW.east) < -0.99);
  check("facing south, west is on the right", side(W, L.DIR_YAW.south) > 0.99);
  check("facing south, east is on the left", side(E, L.DIR_YAW.south) < -0.99);
  check("nothing at all has no side", near(L.sideOf(0, 0, 1.3), 0));
  // Every heading, every direction: always within the pan range, and the
  // direction the camera faces is always the one with least side to it.
  let bad = 0;
  for (let i = 0; i < 360; i++) {
    const yaw = (i * Math.PI) / 180;
    const ahead = Math.abs(L.sideOf(-Math.sin(yaw), -Math.cos(yaw), yaw));
    if (ahead > 1e-6) bad++;
    for (const d of [N, S, E, W]) if (Math.abs(side(d, yaw)) > 1 + 1e-9) bad++;
  }
  check("what the camera looks at is always dead centre, from every heading", bad === 0, `${bad} off`);

  // And the same for a room next door, which is how the Warden's footfall
  // through a wall gets its side.
  const here = { id: "here", kind: "normal", grid: { x: 0, z: 0 }, size: 16, shape: "square",
    links: { north: "up", east: "right", west: "left" } };
  check("a room to the east is heard on the right when facing north",
    L.sideOfNeighbour(here, "right", L.DIR_YAW.north) > 0.99);
  check("a room to the west is heard on the left when facing north",
    L.sideOfNeighbour(here, "left", L.DIR_YAW.north) < -0.99);
  check("the room ahead is heard dead centre",
    near(L.sideOfNeighbour(here, "up", L.DIR_YAW.north), 0));
  check("a room that is not next door is heard dead centre",
    L.sideOfNeighbour(here, "somewhere-else", L.DIR_YAW.east) === 0);
  check("no room at all is heard dead centre",
    L.sideOfNeighbour(undefined, "right", L.DIR_YAW.east) === 0);
}

// The dressing: every arrangement of every kind, at every size, must stand
// each prop on an anchor of its own. Two props on one anchor is one prop
// inside another, and nothing downstream would notice - the door-lane and
// gem filters only ever compare a prop to the room, never to another prop.
{
  const kinds = Object.keys(L.LAYOUTS);
  let stacked = 0;
  let offAnchor = 0;
  let arrangements = 0;
  for (const kind of kinds) {
    for (let variant = 0; variant < L.LAYOUTS[kind].length; variant++) {
      for (const size of L.ROOM_SIZES) {
        const r = room(size, kind);
        const spots = {
          near: L.quadrantSpots(r, "near"),
          far: L.quadrantSpots(r, "far"),
          corners: L.cornerSpots(r),
          // Both branches of anything the arrangement decides get walked.
          rng: () => 0.99,
        };
        for (const roll of [0.01, 0.99]) {
          const placed = L.LAYOUTS[kind][variant]({ ...spots, rng: () => roll });
          arrangements++;
          const anchors = [...spots.near, ...spots.far, ...spots.corners];
          const seenAt = new Set();
          for (const p of placed) {
            const key = `${p.x.toFixed(4)},${p.z.toFixed(4)}`;
            if (seenAt.has(key)) stacked++;
            seenAt.add(key);
            if (!anchors.some((a) => Math.hypot(a[0] - p.x, a[2] - p.z) < 1e-6)) offAnchor++;
          }
        }
      }
    }
  }
  check("no arrangement stands two props in the same place", stacked === 0, `${stacked} stacked in ${arrangements}`);
  check("every prop stands on an anchor, so it is clear of the lanes by construction", offAnchor === 0, `${offAnchor} loose`);
  check("the kinds a player walks through most have more than one arrangement",
    ["normal", "treasure", "trap", "start", "end"].every((k) => L.LAYOUTS[k].length > 1),
    kinds.map((k) => `${k}:${L.LAYOUTS[k].length}`).join(" "));
}

// The loot: every item has to be findable and has to have a look of its
// own. Adding an item and forgetting to add an appearance for it leaves a
// silent collision - two things that look identical, so identifying one
// teaches you a lie about the other.
{
  const byFamily = {};
  for (const id of L.ITEM_IDS) (byFamily[L.ITEMS[id].family] ??= []).push(id);
  let bijective = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const a = L.appearancesFor(seed);
    const looks = L.ITEM_IDS.map((id) => a[id].unknown);
    if (new Set(looks).size === L.ITEM_IDS.length && looks.every(Boolean)) bijective++;
  }
  check("every item looks like itself and nothing else, on every seed", bijective === 200, `${bijective} of 200`);
  check(
    "every family has a look for every item in it",
    Object.entries(byFamily).every(([family, ids]) => {
      const a = L.appearancesFor(7);
      return new Set(ids.map((id) => a[id].unknown)).size === ids.length && family.length > 0;
    })
  );
  // Every item must be reachable from a chest, or it is content nobody sees.
  const rolled = new Set();
  for (let seed = 1; seed <= 400; seed++) {
    for (let floor = 1; floor <= L.FLOORS; floor++) rolled.add(L.rollItem(seed, `chest${seed}`, floor));
  }
  check(
    "every item can actually come out of a chest",
    L.ITEM_IDS.every((id) => rolled.has(id)),
    L.ITEM_IDS.filter((id) => !rolled.has(id)).join(", ") || "all reachable"
  );
}

// The descent: each floor down has to be worse than the one above it in
// every way the table claims, or the arc is only in the prose.
{
  const rows = Array.from({ length: L.FLOORS }, (_, i) => L.floorRules(i + 1));
  const rises = (pick) => rows.every((r, i) => i === 0 || pick(r) >= pick(rows[i - 1]));
  const falls = (pick) => rows.every((r, i) => i === 0 || pick(r) <= pick(rows[i - 1]));
  check("the descent never gets smaller", rises((r) => r.minRooms) && rises((r) => r.maxRooms));
  check("the Warden's grace never grows on the way down", falls((r) => r.wardenGrace));
  check("a deeper floor is never calmer on arrival", rises((r) => r.startingAlarm));
  check("a deeper floor is never less watched", rises((r) => r.sentryChance));
  check("the first floor is unwatched", rows[0].sentryChance === 0 && rows[0].startingAlarm === 0);
  check("the last floor is bigger than the first", rows[rows.length - 1].minRooms > rows[0].maxRooms);
  check("every floor's rules are sane", rows.every((r) => r.minRooms <= r.maxRooms && r.wardenGrace >= 1 && r.blurb.length > 0));
  // The light is part of the same arc: a deeper floor is never brighter, and
  // you can never see further down it than the floor above.
  const hex = /^#[0-9a-f]{6}$/i;
  check("a deeper floor is never brighter", falls((r) => r.light.ambient) && falls((r) => r.light.fillIntensity));
  check("you never see further down a deeper floor", falls((r) => r.light.fogFar));
  check(
    "every floor is lit at all, in colours three.js can read",
    rows.every((r) => r.light.ambient > 0.2 && r.light.fillIntensity > 0 && hex.test(r.light.sky) && hex.test(r.light.fill))
  );
  // The largest room is 24 across, and its far corner has to stay visible on
  // the darkest floor or the arena stops being a room you can read.
  const corner = Math.hypot(L.ROOM_SIZE_LARGE, L.ROOM_SIZE_LARGE) / 2 + 2;
  check("the biggest room's far corner is inside the fog on every floor", rows.every((r) => r.light.fogFar >= corner), `corner ${corner.toFixed(1)}`);
  // Past the last described floor the table holds rather than falling off.
  check("floors past the last described one keep its rules", L.floorRules(L.FLOORS + 5) === rows[rows.length - 1]);
  check("floor zero and below read as the first floor", L.floorRules(0) === rows[0] && L.floorRules(-3) === rows[0]);
}

// The same seed is the same dungeon, room for room. Everything downstream -
// a replayed run, a bug report, the watchers on a floor - rests on this.
{
  const shape = (d) =>
    JSON.stringify([
      d.seed,
      d.startId,
      d.endId,
      d.vaultId,
      d.keyRoomId,
      d.rooms.map((r) => [r.id, r.kind, r.size, r.shape, r.template ?? null, r.grid.x, r.grid.z, Object.entries(r.links).sort()]),
    ]);
  let drift = 0;
  for (let seed = 1; seed <= 120; seed++) {
    for (let floor = 1; floor <= L.FLOORS; floor++) {
      const rules = L.floorRules(floor);
      const opts = { seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms };
      if (shape(L.generateDungeon(opts)) !== shape(L.generateDungeon(opts))) drift++;
    }
  }
  check("a seed generates the same dungeon every time, on every floor", drift === 0, `${drift} drifted`);
}

// The generator: connected, the exit reachable, every kind once, sizes legal.
// Checked at every floor's size, because the deep floors ask the grid walk
// for more rooms than the shallow ones and it is the deep ones that fail.
let bad = 0;
let authored = 0;
for (let seed = 1; seed <= 500; seed++) {
  const rules = L.floorRules((seed % L.FLOORS) + 1);
  const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
  if (d.rooms.length < rules.minRooms || d.rooms.length > rules.maxRooms) bad++;
  const depth = L.bfsDepth(d.rooms, d.startId);
  if (!depth.has(d.endId) || depth.size !== d.rooms.length) bad++;
  if (d.rooms.some((r) => !L.ROOM_SIZES.includes(r.size))) bad++;
  if (d.rooms.some((r) => !L.shapeFits(r.shape, r.size))) bad++;
  // The vault must never be the only way onward, and its key must never be
  // inside it, or the floor could not be finished.
  if (d.vaultId) {
    const path = L.shortestPath(d.rooms, d.startId, d.endId) ?? [];
    if (path.includes(d.vaultId)) bad++;
    if (d.keyRoomId === d.vaultId) bad++;
    if (!d.keyRoomId) bad++;
    // With the vault shut, every other room - the exit and the key room
    // among them - is still reachable.
    const open = L.reachableWithout(d.rooms, d.startId, d.vaultId);
    if (!open.has(d.endId)) bad++;
    if (d.keyRoomId && !open.has(d.keyRoomId)) bad++;
    if (open.size !== d.rooms.length - 1) bad++;
  }
  const kinds = d.rooms.map((r) => r.kind);
  if (kinds.filter((k) => k === "end").length !== 1 || kinds.filter((k) => k === "start").length !== 1) bad++;
  if (d.rooms.find((r) => r.id === d.endId).template) bad++;
  if (d.rooms.some((r) => r.template)) authored++;
}
check("500 dungeons across every floor size: connected, legal, and a vault that never blocks the exit", bad === 0, `${bad} bad`);
// If this ever reads zero the shipped templates are not registered, and
// every dungeon checked above is one the game would never build.
check("the shipped room templates reach the floors the game generates", authored > 0, `${authored} of 500`);

console.log(failures === 0 ? "\nAll layout checks passed." : `\n${failures} layout check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
