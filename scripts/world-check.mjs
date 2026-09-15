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
  "worldbuilding/passageLighting",
  "worldbuilding/districtThresholds",
  "worldbuilding/wallCoursePattern",
  "rooms/floorSurfacePattern",
  "rooms/underfoot",
  "rooms/blockFaces",
  "rooms/mergeTerrainBeds",
  "mobs/groundHeading",
  "din/emissions",
  "dungeon/generate", "dungeon/types", "dungeon/footprint", "rooms/districts", "rooms/biomes", "rooms/terrainPattern", "rooms/placements", "props/specs", "world", "worldbuilding/watercourse", "worldbuilding/structuralPattern", "worldbuilding/identity", "mobs/ambient", "mobs/croakerHabitat", "worldbuilding/elevation", "worldbuilding/bellcaps", "mobs/beetleHabitat",
].map(f => `export * from "${root}src/game/${f}";`).join("\n"));
await build({ entryPoints: [entry], outfile: out, bundle: true, platform: "node", format: "esm",
  jsx: "automatic", logLevel: "error", define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" } });
const L = await import(pathToFileURL(out).href);
const cube = { position: [0, 0, 0], size: [2, 2, 2] };
assert.equal(L.blockFaces([cube]).length, 6, "isolated blocks retain all six surfaces");
assert.equal(L.blockFaces([cube, { position: [2, 0, 0], size: [2, 2, 2] }]).length, 10, "touching blocks omit only their two buried joining faces");
assert.equal(L.blockFaces([cube, { position: [0, 0, 0], size: [1, 1, 1], rotationY: 0.7 }]).length, 6, "a fully enclosed rotated block has no exposed faces");
assert.equal(L.blockFaces([cube], [cube, { position: [0, 2, 0], size: [2, 2, 2] }]).length, 5, "opaque blocks in another material batch can cover a face");
const pen = { ...L.generateDungeon({ seed: 72, floor: 1 }).rooms[0], shape: "square", size: 20, wings: [], links: {} };
const softRoom = { ...pen, biome: "mossy" };
assert.ok(L.loudnessIn("sprint", softRoom, "soft") < L.loudnessIn("sprint", softRoom, "stone"), "paving carries more sprint noise than its moss bed");
assert.ok(L.loudnessIn("sprint", softRoom, "water") > L.loudnessIn("sprint", softRoom, "stone"), "crossing water carries more sprint noise than dry paving");
assert.equal(L.loudnessIn("bombBurst", softRoom, "soft"), L.loudnessIn("bombBurst", softRoom, "water"), "non-footstep emissions ignore footing");
for (const surface of ["stone", "water", "soft", "wood", "metal"]) assert.ok(L.loudnessIn("walk", softRoom, surface) < 0.1, "walking stays below creature hearing thresholds");
assert.deepEqual(L.groundHeading(pen, 0, 0, 0, 0, []), { dx: 0, dz: 0 }, "stationary targets do not create a heading");
const cage = Array.from({ length: 16 }, (_, i) => ({ x: Math.cos(i * Math.PI / 8), z: Math.sin(i * Math.PI / 8), r: 0.35 }));
assert.deepEqual(L.groundHeading(pen, 0, 0, 3, 0, cage), { dx: 0, dz: 0 }, "a cornered ambient animal does not take the enemy fallback through furniture");
assert.ok(L.groundHeading(pen, 0.1, 0, 3, 0, [{ x: 0, z: 0, r: 0.5 }]).dx > 0,
  "an obstacle newly placed over an animal permits outward escape");
let terrainBedCells = 0, terrainBedFaces = 0;
let wallTurns = 0;
assert.equal(L.croakerMigration(null, 100), 0, "unopened channels keep toads at their feeding positions");
assert.equal(L.croakerMigration(10, 14), 0, "migration waits for the channel to fall");
assert.ok(Math.abs(L.croakerMigration(10, 17.3) - 0.5) < 1e-8, "mid-retreat position derives from saved drain time");
assert.equal(L.croakerMigration(10, 30), 1, "completed retreat remains at the refuge");
for (const dir of L.DIRS) for (const incoming of [false, true]) {
  const room = { waterway: incoming ? { upstream: dir } : { downstream: dir } };
  const step = L.DIR_STEP[dir], sign = incoming ? -1 : 1;
  assert.equal(L.waterFlowUV(room, 0, step.x * 5, step.z * 5)[0], sign * 5, "ripples run inward on arrivals and outward on departures");
  assert.equal(Math.abs(L.waterFlowUV(room, 0, 0, 0)[0]), 0, "flow joins at the central junction");
}
assert.equal(L.waterTravel(null, 12), 12);
assert.equal(L.waterTravel(10, 10), 10, "opening the valve preserves flow phase");
assert.equal(L.waterTravel(10, 13), 12.25, "current slows continuously with the water level");
assert.equal(L.waterTravel(10, 16), 13);
assert.equal(L.waterTravel(10, 100), 13, "dry channels have no residual current or revisit phase drift");
let rooms = 0, tiles = 0, matching = 0, links = 0, circuits = 0, channelRooms = 0;
const biomes = new Set();
const identities = new Set();
let migratingToads = 0;
const terraceDirs = new Set();
let terraceCount = 0;
let serviceTrails = 0;
let colonies = 0;
let beetles = 0;
const apseDirs = new Set();
let apses = 0;
let passageLights = 0, formerPassageLights = 0;
const loopFloors = [0, 0, 0];
for (let seed = 1; seed <= 120; seed++) for (const floor of [1, 2, 3]) {
  const d = L.generateDungeon({ seed, floor });
  const openRooms = d.rooms.filter(r => r.kind !== "secret");
  const cycles = openRooms.reduce((sum, r) => sum + Object.keys(r.links).length, 0) / 2 - openRooms.length + 1;
  if (cycles > 0) loopFloors[floor - 1]++;
  if (floor > 1 && cycles < floor - 1) {
    const canClose = openRooms.some(a => a.kind !== "end" && openRooms.some(b => b.kind !== "end" && a.id !== b.id &&
      Math.abs(a.grid.x - b.grid.x) + Math.abs(a.grid.z - b.grid.z) === 1 && !Object.values(a.links).includes(b.id)));
    assert.equal(canClose, false, "deeper floors use available shared walls to close exploration loops");
  }
  assert.deepEqual(d, L.generateDungeon({ seed, floor }), "geography reproduces from seed and depth");
  const byId = new Map(d.rooms.map(r => [r.id, r]));
  if (d.serviceTrail) {
    serviceTrails++;
    const { route, hostId } = d.serviceTrail;
    assert.ok(route.length >= 2 && new Set(route).size === route.length, "maintenance routes lead through multiple rooms without loops");
    assert.equal(byId.get(route[0]).waterway.role, "outfall");
    assert.equal(route.at(-1), hostId);
    const host = byId.get(hostId);
    assert.ok(host.secret && !host.links[host.secret.dir], "the rubbing leads to a real unopened secret");
    for (let i = 0; i < route.length; i++) {
      const room = byId.get(route[i]);
      assert.ok(room.kind !== "end" && room.id !== d.vaultId, "maintenance routes never require descent or a vault key");
      if (i) assert.ok(Object.values(byId.get(route[i - 1]).links).includes(room.id), "each clue follows an actual doorway");
    }
    const step = L.DIR_STEP[host.secret.dir], distance = L.doorReach(host, host.secret.dir) - 1.3;
    const x = step.x * distance, z = step.z * distance;
    for (const prop of L.placementsFor(host, host.seed).filter(p => L.PROP_SPECS[p.kind].solid))
      assert.ok(Math.hypot(prop.x - x, prop.z - z) > L.PROP_SPECS[prop.kind].radius * (prop.scale ?? 1) + 0.5, "the service catch is not buried in furniture");
  }
  const source = d.rooms.find(r => r.waterway?.role === "sluice");
  const destination = d.rooms.find(r => r.waterway?.role === "outfall");
  if (source) {
    circuits++;
    assert.ok(destination, "every sluice has a downstream reward");
    const free = L.reachableWithout(d.rooms, d.startId, d.vaultId ?? "missing");
    assert.ok(free.has(source.id) && free.has(destination.id), "watercourse endpoints are outside the vault lock");
    const seen = new Set();
    let next = source;
    while (next) {
      assert.ok(!seen.has(next.id), "water flows without cycles");
      seen.add(next.id); channelRooms++;
      assert.notEqual(next.kind, "end", "following the water must not force a floor descent");
      assert.equal(L.waterUnderfoot(next, 0, 0, null, 50), true, "live channel has wet footsteps");
      assert.equal(L.waterUnderfoot(next, 2, 2, null, 50), false, "the paving beside a channel remains dry");
      assert.equal(L.waterUnderfoot(next, 0, 0, 10, 50), false, "drained channel has dry footsteps");
      for (const b of L.watercourseBlocks(next)) {
        // Inset the doorway endpoint: the channel intentionally meets the threshold.
        for (const dx of [-b.size[0] / 2 + 0.01, b.size[0] / 2 - 0.01]) for (const dz of [-b.size[2] / 2 + 0.01, b.size[2] / 2 - 0.01])
          assert.ok(L.insideRoom(next, b.position[0] + dx, b.position[2] + dz), "channel stays inside actual footprint");
      }
      if (!next.waterway.downstream) { assert.equal(next.id, destination.id); break; }
      const successor = byId.get(next.links[next.waterway.downstream]);
      assert.equal(successor.links[successor.waterway.upstream], next.id, "flow agrees on both sides of each doorway");
      next = successor;
    }
    assert.equal(seen.size, d.rooms.filter(r => r.waterway).length, "one complete connected circuit");
    for (const end of [source, destination]) {
      const station = L.waterStation(end);
      assert.deepEqual(L.waterStation(JSON.parse(JSON.stringify(end))), station, "saved/copied rooms retain the generated mechanism anchor");
      assert.ok(station && L.insideRoom(end, station.approach.x, station.approach.z, 0.6), "station has a safe standing area");
      assert.ok(L.roomSegmentClear(end, 0, 0, station.approach.x, station.approach.z, 0.5), "station can be approached from the central path");
      for (const dir of L.DIRS) if (end.links[dir] || end.secret?.dir === dir) {
        const step = L.DIR_STEP[dir], along = step.x ? station.z : station.x;
        const reach = station.x * step.x + station.z * step.z;
        assert.ok(reach < L.doorReach(end, dir) - 1 || Math.abs(along) >= L.DOOR_WIDTH / 2 + 0.8,
          "mechanisms never occupy doorway openings or secret cracks");
      }
    }
  }
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
    for (const home of L.ratsFor(r, d.seed)) {
      assert.ok(L.insideRoom(r, home.x, home.z, 0.6), "rat home has body clearance in the actual footprint");
      assert.ok(L.roomSegmentClear(r, home.x, home.z, home.shelter.x, home.shelter.z, 0), "rat shelter has a continuous floor approach");
      assert.ok(Math.abs(L.floorHeightAt(r, home.x, home.z) - L.floorHeightAt(r, home.shelter.x, home.shelter.z)) <= 0.03, "rat shelter sits on the same landing as its home");
      const nx = Math.sin(home.shelter.yaw), nz = Math.cos(home.shelter.yaw);
      const wallX = home.shelter.x - nx * (L.WALL_THICKNESS / 2 + 0.04), wallZ = home.shelter.z - nz * (L.WALL_THICKNESS / 2 + 0.04);
      assert.ok(L.wallEdges(r).some(edge => edge.along === "x" ? Math.abs(wallZ-edge.z)<1e-6 && Math.abs(wallX-edge.x)<=edge.length/2-0.27 : Math.abs(wallX-edge.x)<1e-6 && Math.abs(wallZ-edge.z)<=edge.length/2-0.27), "visible rat shelters anchor to real wall courses");
    }
    // Aim outward near the chamber boundary, where furniture-only steering
    // used to press a rat into the wall. Verify the entire chosen segment.
    for (let angle = 0.2; angle < Math.PI * 2; angle += Math.PI / 4) {
      const reach = L.floorReach(r, angle) - 0.8;
      const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach;
      if (!L.insideRoom(r, x, z, 0.5)) continue;
      const targetX = x + Math.cos(angle) * 3, targetZ = z + Math.sin(angle) * 3;
      if (L.roomSegmentClear(r, x, z, targetX, targetZ, 0.5)) continue;
      const heading = L.groundHeading(r, x, z, targetX, targetZ, []);
      assert.ok(L.roomSegmentClear(r, x, z, x + heading.dx * 1.4, z + heading.dz * 1.4, 0.5),
        "wandering and fleeing choose a legal full segment in the actual footprint");
      if (Math.hypot(heading.dx, heading.dz) > 0.9) wallTurns++;
    }
    const physicalFloor = L.floorRects(r), surface = L.floorSurfaceRects(r);
    const overlapArea = (a, b) => Math.max(0, Math.min(a.x + a.width / 2, b.x + b.width / 2) - Math.max(a.x - a.width / 2, b.x - b.width / 2)) *
      Math.max(0, Math.min(a.z + a.depth / 2, b.z + b.depth / 2) - Math.max(a.z - a.depth / 2, b.z - b.depth / 2));
    for (let i = 0; i < surface.length; i++) {
      for (let j = i + 1; j < surface.length; j++) assert.ok(overlapArea(surface[i], surface[j]) < 1e-8, "floor surface never draws an overlapping collar twice");
      const s = surface[i];
      for (const dx of [-0.49999, 0, 0.49999]) for (const dz of [-0.49999, 0, 0.49999])
        assert.ok(physicalFloor.some(p => Math.abs(s.x + dx * s.width - p.x) <= p.width / 2 + 1e-8 && Math.abs(s.z + dz * s.depth - p.z) <= p.depth / 2 + 1e-8), "visible floor stays within physical floor");
    }
    for (const p of physicalFloor) assert.ok(Math.abs(surface.reduce((sum, s) => sum + overlapArea(p, s), 0) - p.width * p.depth) < 1e-6,
      "every physical floor rectangle is completely covered by the visible surface");
    rooms++;
    const courses = L.wallCoursesFor(r);
    for (const b of [...courses.rails, ...courses.caps]) {
      for (const dir of L.DIRS) {
        if (!r.links[dir] && r.secret?.dir !== dir) continue;
        const axis = L.DIR_STEP[dir], across = axis.x ? b.position[2] : b.position[0];
        const width = axis.x ? b.size[2] : b.size[0];
        const along = b.position[0] * axis.x + b.position[2] * axis.z;
        assert.ok(along < L.doorReach(r, dir) - 0.5 || Math.abs(across) - width / 2 > L.DOOR_WIDTH / 2,
          "wall courses leave real doorways and secret cracks clear");
      }
      const footprint = L.wallEdges(r);
      assert.ok(footprint.some(edge => Math.abs((edge.along === "x" ? b.position[2] - edge.z : b.position[0] - edge.x)) <= L.WALL_THICKNESS / 2 &&
        Math.abs((edge.along === "x" ? b.position[0] - edge.x : b.position[2] - edge.z)) <= edge.length / 2), "construction courses stay attached to actual walls");
    }
    const thresholds = L.districtThresholds(r, d.rooms);
    for (const t of thresholds) {
      const next = byId.get(t.destination);
      assert.equal(r.links[t.dir], next.id, "district names describe actual door destinations");
      assert.notEqual(t.district, r.district, "district signs are reserved for boundaries");
      assert.equal(t.district, next.district);
      assert.ok(t.position[1] - 0.23 > L.DOOR_HEIGHT, "lintels never lower doorway clearance");
      assert.ok(L.insideRoom(r, t.position[0], t.position[2]), "carvings face the actual shaped doorway");
      assert.ok(L.districtThresholds(next, d.rooms).some(reverse => reverse.destination === r.id && reverse.district === r.district), "both faces of a district boundary give correct directions");
    }
    const lamps = L.passageLampsFor(r);
    passageLights += lamps.length;
    formerPassageLights += L.floorRects(r).filter(rect => Math.abs(rect.x) > r.size / 2 || Math.abs(rect.z) > r.size / 2).length;
    assert.deepEqual(lamps, L.passageLampsFor({ ...r, wingProfiles: {} }), "floor tessellation cannot multiply passage lights");
    for (const lamp of lamps) {
      const [x, y, z] = lamp.position;
      assert.ok(L.insideRoom(r, x, z, 0.24), "the complete lamp stays inside the shaped passage");
      assert.ok(y - 0.27 - L.floorHeightAt(r, x, z) > 2.5, "fixtures clear players on raised landings");
      assert.ok(y + 0.78 <= L.GROUND_Y + L.WALL_HEIGHT, "suspension stays below the ceiling");
    }
    for (const home of L.beetlesFor(r)) {
      beetles++;
      assert.ok(L.BIOME[r.biome].life.includes("beetle") && L.bellcapsFor(r).some(c => c.x === home.x && c.z === home.z));
      for (const cover of [0, 0.25, 0.5, 0.75, 1]) for (let time = 0; time < 10; time += 0.5) {
        const pose = L.beetlePose(home, time, cover);
        assert.ok(L.insideRoom(r, pose.x, pose.z, 0.18), "the whole beetle remains inside the floor while foraging and retreating");
        assert.ok(L.roomSegmentClear(r, pose.x, pose.z, home.x, home.z, 0.18), "retreat stays in its connected habitat");
        for (const prop of L.placementsFor(r, r.seed).filter(p => L.PROP_SPECS[p.kind].solid))
          assert.ok(Math.hypot(pose.x - prop.x, pose.z - prop.z) > L.PROP_SPECS[prop.kind].radius * (prop.scale ?? 1) + 0.18);
      }
    }
    for (const dir of L.DIRS.filter(dir => r.wingProfiles?.[dir] === "apse")) {
      apses++; apseDirs.add(dir);
      assert.ok(!r.links[dir] && r.secret?.dir !== dir && r.district !== "works");
      const courses = L.wingCourses(r, dir), axis = L.DIR_STEP[dir], shift = L.corridorOffset(r, dir);
      assert.equal(courses[0].width, L.corridorWidth(r, dir), "apse mouth retains its full width");
      assert.ok(courses.at(-1).width < courses[0].width, "apse has an actual tapered end");
      for (const c of courses) {
        const along = (c.start + c.end) / 2;
        const x = axis.x * along + (axis.x ? 0 : shift), z = axis.z * along + (axis.x ? shift : 0);
        assert.ok(L.insideRoom(r, x, z, 0.5));
        assert.ok(!L.insideRoom(r, x + (axis.x ? 0 : c.width / 2 + 0.1), z + (axis.x ? c.width / 2 + 0.1 : 0)), "outside each curved course is solid wall, not phantom floor");
      }
    }
    for (const cap of L.bellcapsFor(r)) {
      colonies++;
      assert.equal(r.district, "gardens");
      assert.ok(r.waterway && L.insideRoom(r, cap.x, cap.z, 0.7));
      assert.deepEqual(L.bellcapsFor(r), L.bellcapsFor(JSON.parse(JSON.stringify(r))), "colonies reproduce from real channel banks");
      for (const prop of L.placementsFor(r, r.seed).filter(p => L.PROP_SPECS[p.kind].solid))
        assert.ok(Math.hypot(cap.x - prop.x, cap.z - prop.z) >= L.PROP_SPECS[prop.kind].radius * (prop.scale ?? 1) + 0.8);
      assert.ok(L.bellcapExposed(r, cap, cap.x, cap.z, 100, 1));
      assert.ok(!L.bellcapExposed(r, cap, cap.x, cap.z, 0, 1), "lowering the lamp cancels exposure");
      assert.ok(!L.bellcapExposed(r, cap, cap.x, cap.z, 100, 0), "drained colonies are dormant");
      assert.ok(!L.bellcapExposed(r, cap, cap.x + 4, cap.z, 100, 1), "backing away cancels exposure");
    }
    for (const t of L.terracesFor(r)) {
      terraceCount++;
      terraceDirs.add(t.dir);
      assert.ok(!r.links[t.dir] && r.secret?.dir !== t.dir, "raised galleries preserve travel and secret thresholds");
      for (let along = t.start; along <= t.end; along += 0.25) {
        const width = L.wingWidthAt(r, t.dir, along);
        for (const across of [-width / 2 + 0.3, 0, width / 2 - 0.3]) {
          const [x, , z] = L.terracePoint(t, along, across, 0);
          assert.ok(L.insideRoom(r, x, z), "the whole ramp stays inside the true gallery footprint");
          const rise = L.floorRiseAt(r, x, z);
          assert.ok(Math.abs(rise - t.height * Math.min(1, (along - t.start) / 4)) < 1e-6);
        }
      }
      const mesh = L.terraceMesh(t);
      for (let base = 0; base < mesh.indices.length; base += 36) {
        const vertices = Array.from(mesh.indices.slice(base, base + 3), i => Array.from(mesh.positions.slice(i * 3, i * 3 + 3)));
        const [a, b, c] = vertices;
        assert.ok((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) > 0,
          "rendered and physical ramp/landing top faces point upward in every direction");
        for (const [x, y, z] of vertices) {
          assert.ok(L.insideRoom(r, x, z), "every physical ramp vertex lies within the shaped floor");
          assert.ok(Math.abs(y - L.floorHeightAt(r, x, z)) < 1e-5);
        }
      }
    }
    identities.add(L.identityFor(r));
    const architecture = L.architectureFor(r);
    assert.ok(architecture.structure.length > 0, "every room shape supports its district architecture");
    for (const b of [...architecture.structure, ...architecture.detail, ...architecture.marks]) {
      assert.ok(b.position[1] - b.size[1] / 2 > L.GROUND_Y + L.DOOR_HEIGHT, "structural details preserve full doorway-height movement clearance");
      for (const dx of [-b.size[0] / 2, b.size[0] / 2]) for (const dz of [-b.size[2] / 2, b.size[2] / 2])
        assert.ok(L.insideRoom(r, b.position[0] + dx, b.position[2] + dz), "structural spans follow the true floor below them");
    }
    for (const habitat of L.croakerHabitats(r, L.croakersFor(r, r.seed))) {
      if (habitat.refugeBed) assert.ok(L.terrainFor(r).deposits.some(tile =>
        Math.abs(tile.position[0] - habitat.refuge.x) < 1e-6 && Math.abs(tile.position[2] - habitat.refuge.z) < 1e-6), "toad bed refuges occupy visible terrain deposits");
      if (habitat.followsChannel) migratingToads++;
      assert.ok(L.insideRoom(r, habitat.wet.x, habitat.wet.z, 0.25) && L.insideRoom(r, habitat.refuge.x, habitat.refuge.z, 0.25));
      assert.ok(L.roomSegmentClear(r, habitat.wet.x, habitat.wet.z, habitat.refuge.x, habitat.refuge.z, 0.25), "toad migration never crosses a room wall");
      if (habitat.followsChannel) for (const prop of L.placementsFor(r, r.seed).filter(p => L.PROP_SPECS[p.kind].solid)) {
        const dx = habitat.refuge.x - habitat.wet.x, dz = habitat.refuge.z - habitat.wet.z;
        const len2 = dx * dx + dz * dz;
        const along = len2 ? Math.max(0, Math.min(1, ((prop.x - habitat.wet.x) * dx + (prop.z - habitat.wet.z) * dz) / len2)) : 0;
        assert.ok(Math.hypot(prop.x - habitat.wet.x - along * dx, prop.z - habitat.wet.z - along * dz)
          >= L.PROP_SPECS[prop.kind].radius * (prop.scale ?? 1) + 0.29, "the entire migration route clears solid furnishings");
      }
    }
    assert.ok(L.BIOMES_FOR[r.kind].includes(r.biome), "room purpose constrains its materials");
    assert.equal(L.biomeIdFor(r.kind, r.id, r.seed, r), r.biome, "runtime reads generated geography");
    biomes.add(r.biome);
    if (r.secret) assert.equal(byId.get(r.secret.to).district, r.district, "secrets inherit host history");
    for (const id of Object.values(r.links)) { links++; if (byId.get(id).district === r.district) matching++; }
    const terrain = L.terrainFor(r);
    const beds = L.mergeTerrainBeds(terrain.deposits);
    terrainBedCells += terrain.deposits.length; terrainBedFaces += beds.length;
    const area = tiles => tiles.reduce((sum, t) => sum + t.size[0] * t.size[2], 0);
    assert.ok(Math.abs(area(beds) - area(terrain.deposits)) < 1e-6, "merged beds retain their full area");
    for (const tile of terrain.deposits) {
      const bed = beds.find(b => Math.abs(tile.position[0] - b.position[0]) + tile.size[0] / 2 <= b.size[0] / 2 + 1e-7 && Math.abs(tile.position[2] - b.position[2]) + tile.size[2] / 2 <= b.size[2] / 2 + 1e-7);
      assert.ok(bed, "every original habitat tile remains fully covered by a rendered bed");
      const y = bed.position[1] + (bed.slope?.[0] ?? 0) * (tile.position[0] - bed.position[0]) + (bed.slope?.[1] ?? 0) * (tile.position[2] - bed.position[2]);
      assert.ok(Math.abs(y - tile.position[1]) < 1e-7, "merged beds retain the floor plane");
    }
    if (["flooded", "mossy", "fungal"].includes(terrain.biome)) {
      const beds = new Map(terrain.deposits.map(tile => [`${tile.position[0]}:${tile.position[2]}`, tile]));
      for (const tile of terrain.deposits) for (const [dx, dz] of [[1.5, 0], [0, 1.5]]) {
        const next = beds.get(`${tile.position[0] + dx}:${tile.position[2] + dz}`);
        if (!next || tile.size[0] !== 1.5 || tile.size[2] !== 1.5 || next.size[0] !== 1.5 || next.size[2] !== 1.5) continue;
        assert.equal(L.footingAt(r, tile.position[0] + dx / 2, tile.position[2] + dz / 2, 0, 100),
          terrain.biome === "flooded" ? "water" : "soft", "adjoining beds have no dry footstep seam after the channel drains");
      }
    }
    for (const b of terrain.paving.slice(0, 1)) assert.equal(L.footingAt(r, b.position[0], b.position[2], 0, 100), "stone", "dry paving sounds like stone in every biome");
    for (const b of terrain.deposits.slice(0, 1)) assert.equal(L.footingAt(r, b.position[0], b.position[2], 0, 100),
      r.biome === "flooded" ? "water" : ["mossy", "fungal"].includes(r.biome) ? "soft" : "stone", "independent terrain beds retain their material after channel drainage");
    if (r.waterway) assert.equal(L.footingAt(r, 0, 0, null, 100), "water", "live channel water covers the paving sound");
    for (const b of [...terrain.paving, ...terrain.deposits]) {
      tiles++;
      const lift = b.position[1] + b.size[1] / 2 - L.floorHeightAt(r, b.position[0], b.position[2]);
      assert.ok(lift > 0 && lift < 0.04, "terrain remains paint-depth above the real floor");
      for (const dx of [-b.size[0] / 2, b.size[0] / 2]) for (const dz of [-b.size[2] / 2, b.size[2] / 2]) {
        const x = b.position[0] + dx, z = b.position[2] + dz;
        assert.ok(L.floorRects(r).some(rect => Math.abs(x - rect.x) <= rect.width / 2 + 0.001 && Math.abs(z - rect.z) <= rect.depth / 2 + 0.001), "whole tiles stay on shaped floors and galleries");
        const y = b.position[1] + b.size[1] / 2 + dx * (b.slope?.[0] ?? 0) + dz * (b.slope?.[1] ?? 0);
        assert.ok(Math.abs(y - L.floorHeightAt(r, x, z) - lift) < 1e-6, "tile corners follow the ramp without floating or clipping");
      }
    }
  }
  const host = d.rooms.find(r => r.secret);
  const shut = host ? L.reachableWithout(d.rooms, d.startId, d.vaultId ?? "missing") : null;
  if (shut) assert.ok(shut.has(d.endId), "district assignment preserves the unlocked exit route");
}
assert.equal(biomes.size, L.BIOMES.length, "every declared biome remains reachable");
assert.ok(beetles > 300, `glow beetles occupy living channel banks: ${beetles}`);
assert.ok(passageLights < formerPassageLights, "shaped galleries no longer add a light per floor course");
console.log(`Exploration: ${loopFloors.join(", ")} of 120 floors have alternate routes at depths 1, 2, 3.`);
console.log(`Passage lighting: ${passageLights} practical lamps replace ${formerPassageLights} floor-course lights.`);
console.log(`Glow beetles: ${beetles} feeders with clear foraging and shelter paths.`);
assert.ok(apses > 100 && apseDirs.size === 4, "rounded galleries occur in all four directions");
console.log(`Apse geometry: ${apses} rounded galleries with real tapered walls and ramps.`);
assert.ok(colonies > 100, `bellcap colonies occupy the channel ecosystem: ${colonies}`);
assert.equal(L.bellcapCharge(1, false, 0.1), 0);
assert.equal(L.bellcapCharge(1, true, 0), 1);
assert.ok(L.bellcapCharge(0, true, 20) < L.BELLCAP_WARNING, "one slow frame cannot skip the warning");
console.log(`Bellcaps: ${colonies} clear channel-bank colonies with light, distance and drainage counterplay.`);
assert.equal(terraceDirs.size, 4, "raised terrain is checked in every cardinal direction");
assert.ok(serviceTrails > 150, `linked maintenance discoveries occur throughout the world: ${serviceTrails}`);
console.log(`Discovery: ${serviceTrails} reliquary-to-secret expeditions through real doors.`);
console.log(`Elevation: ${terraceCount} shaped galleries with continuous ramps and matching collision surfaces.`);
assert.equal(identities.size, Object.keys(L.PLACE_IDENTITIES).length, "all building identities occur in the generated world");
assert.ok(migratingToads > 50, `channel habitats occur in the world: ${migratingToads}`);
  console.log(`Architecture/ecology: ${identities.size} place identities, ${migratingToads} toads with clear channel-to-refuge routes.`);
  assert.ok(wallTurns > 1000, "animals actively turn along walls across generated room shapes");
  console.log(`Ambient movement: ${wallTurns} legal turns away from chamber boundaries.`);
assert.ok(matching / links > 0.65, "most doorways continue the same district");
assert.ok(circuits > 250, `watercourse expeditions appear throughout the generated world: ${circuits}/360`);
assert.equal(L.waterLevel(null, 100), 1);
assert.equal(L.waterLevel(10, 13), 0.5);
assert.equal(L.waterLevel(10, 16), 0);
console.log(`Watercourse checks: ${circuits} circuits across ${channelRooms} connected rooms.`);
console.log(`World checks passed: ${rooms} rooms, ${tiles} terrain tiles, ${biomes.size} biomes; ${(matching / links * 100).toFixed(1)}% of doorways stay within a district.`);

console.log(`Terrain beds: ${terrainBedCells} habitat cells rendered as ${terrainBedFaces} coplanar faces.`);
