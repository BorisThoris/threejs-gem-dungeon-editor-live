// Layout invariants, checked over every room size and hundreds of seeds.
//
//   node scripts/layout-check.mjs
//
// The bugs this guards against were real: a spike ring and a pedestal ring
// whose every point fell in a door lane, so trap rooms had no spikes and
// the memory trial no crystals, in every room the generator ever made. The
// smoke test drives the game but not its geometry; this does.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
   export * from "${root}src/game/props/specs";
   export * from "${root}src/game/rooms/anchors";
   export * from "${root}src/game/rooms/templates";
   export * from "${root}src/game/rooms/kinds";
   export * from "${root}src/game/rooms/validate";
   export * from "${root}src/game/systems/bearing";
   export * from "${root}src/game/systems/pace";
   export * from "${root}src/game/arena/sweep";
   export * from "${root}src/game/sentry/beam";
   export * from "${root}src/game/relics/catalog";
   export * from "${root}src/game/warden/tuning";
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
const room = (size, kind = "normal", shape = "square") => ({ id: "r", kind, seed: 0, grid: { x: 0, z: 0 }, size, shape, links: { north: "a" } });
/**
 * Every set of doors a room can have: all fifteen non-empty combinations.
 *
 * What a room offers to stand things on now depends on which doors it has,
 * so anything checked in one room has to be checked in all of them. The
 * generator makes rooms with one, two, three and four doors, and only the
 * one- and two-door ones on a single axis have a middle.
 */
const DOOR_SETS = [];
for (let mask = 1; mask < 16; mask++) {
  const links = {};
  L.DIRS.forEach((dir, i) => {
    if (mask & (1 << i)) links[dir] = "n";
  });
  DOOR_SETS.push(links);
}

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

// The middle of a room, which for most of this project's life was empty in
// every room the generator made: the lane rule reserved all four doorways
// whether or not the room had them, and everything a room holds has to
// stand clear of the lanes. Nearly half of them have doors on one axis
// only, and those have a band across the middle nobody ever walks down.
{
  let wrongCount = 0;
  let inLane = 0;
  let onTopOfAnchor = 0;
  let offFloor = 0;
  let tooCloseToLane = 0;
  const withMiddle = [];
  for (const size of L.ROOM_SIZES) {
    for (const shape of L.SHAPES) {
      if (!L.shapeFits(shape, size)) continue;
      for (const links of DOOR_SETS) {
        const r = { ...room(size, "normal", shape), links };
        const axes = L.laneAxes(r);
        const oneAxis = axes.x !== axes.z;
        const centre = L.centreSpots(r);
        // Two spots or none, and never in a room whose doors cross the middle.
        if (!oneAxis && centre.length !== 0) wrongCount++;
        if (oneAxis && centre.length !== 2) wrongCount++;
        if (centre.length) withMiddle.push(`${shape}${size}`);
        const anchors = [...L.quadrantSpots(r, "near"), ...L.quadrantSpots(r, "far"), ...L.cornerSpots(r)];
        for (const c of centre) {
          if (L.inDoorLane(c[0], c[2], r)) inLane++;
          // Clear of every other anchor, or two things stand in one place.
          if (anchors.some((a) => dist(a, c) < 1.2)) onTopOfAnchor++;
          if (Math.hypot(c[0], c[2]) > L.inscribedRadius(r) + 0.6) offFloor++;
          // The widest solid prop in the game is the wall segment; a middle
          // prop has to clear the lane it stands beside by its own radius,
          // or the room drops it and the middle is empty again.
          const widest = Math.max(...Object.values(L.PROP_SPECS).filter((x) => x.solid).map((x) => x.radius));
          const fromLane = Math.max(Math.abs(c[0]), Math.abs(c[2]));
          if (fromLane - widest < L.LANE_HALF_WIDTH) tooCloseToLane++;
        }
      }
    }
  }
  check("a room has two middle spots or none, never one", wrongCount === 0, `${wrongCount} wrong`);
  check("a middle spot is never in a lane its own room has", inLane === 0, `${inLane} in one`);
  check("a middle spot never lands on another anchor", onTopOfAnchor === 0, `${onTopOfAnchor} collided`);
  check("a middle spot stays on the drawn floor", offFloor === 0, `${offFloor} off it`);
  check("the widest solid prop still clears the lane from a middle spot", tooCloseToLane === 0, `${tooCloseToLane} too close`);
  check("rooms of every shape and size can have a middle", new Set(withMiddle).size >= L.ROOM_SIZES.length, `${new Set(withMiddle).size} shape-size pairs`);
}

// And how much of a real dungeon this is worth: a rule that fires on two
// rooms in a hundred is not worth the code it takes to read.
{
  let rooms = 0;
  let withMiddle = 0;
  for (let seed = 1; seed <= 60; seed++) {
    for (const floor of [1, 2, 3]) {
      const rules = L.floorRules(floor);
      for (const r of L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms }).rooms) {
        rooms++;
        if (L.centreSpots(r).length) withMiddle++;
      }
    }
  }
  const share = withMiddle / rooms;
  check("a good share of the rooms a run walks through have a middle to fill", share > 0.25,
    `${(share * 100).toFixed(0)}% of ${rooms}`);
}

// Shaped rooms draw a polygon inside their box, so anchors have to sit on
// the floor that polygon actually covers - or as close as the door lanes
// allow, which in the smallest odd shapes is not all the way.
for (const shape of ["circle", "hexagon", "octagon", "diamond", "triangle"]) {
  let off = 0;
  let inLane = 0;
  let brazierInWall = 0;
  let brazierInFurniture = 0;
  for (const size of L.ROOM_SIZES) {
    // A shape the generator would never use at this size proves nothing.
    if (!L.shapeFits(shape, size)) continue;
    const r = room(size, "normal", shape);
    // The floor's reach along the diagonals, which is where every one of
    // these stands - not its reach in the worst direction, which is what
    // this used to measure and what cost the game its hexagonal rooms.
    const inside = L.diagonalReach(r);
    const furniture = [...L.quadrantSpots(r, "near"), ...L.quadrantSpots(r, "far")];
    for (const spot of furniture) {
      const radius = Math.hypot(spot[0], spot[2]);
      // Allowed to sit proud only when pulling it in would put it in a lane.
      // Half a unit of overhang is invisible; three, as it was, is not.
      if (radius > inside + 0.6) off++;
      if (L.inDoorLane(spot[0], spot[2])) inLane++;
    }
    /**
     * The braziers are held to a different rule, and deliberately.
     *
     * A shaped room's floor is cut off at the diagonals, which is where
     * they stand, so holding them to the drawn polygon pulled them inside
     * the furniture: a table went through a brazier in every sixteen-unit
     * circle. They may stand on the slab between the drawn floor and the
     * wall - which reads as the corner of the room, because the walls are
     * the room's box - but never in the wall, and never in the furniture.
     */
    const half = size / 2;
    for (const c of L.cornerSpots(r)) {
      if (Math.abs(c[0]) >= half || Math.abs(c[2]) >= half) brazierInWall++;
      for (const f of furniture) {
        if (dist(c, f) < L.PROP_SPECS.torch.radius + L.widestFurnishing()) brazierInFurniture++;
      }
    }
  }
  check(`${shape}: the furniture stays on the drawn floor where the shape fits`, off === 0, `${off} off it`);
  check(`${shape}: the furniture stays clear of the lanes`, inLane === 0, `${inLane} in a lane`);
  check(`${shape}: the braziers stay inside the walls`, brazierInWall === 0, `${brazierInWall} in a wall`);
  check(`${shape}: nothing can be furnished into a brazier`, brazierInFurniture === 0, `${brazierInFurniture} collided`);
  // The exact reach has to agree with what it replaced: never less than the
  // worst direction, never more than the box the room is drawn in.
  {
    let wrong = 0;
    for (const size of L.ROOM_SIZES) {
      const r = room(size, "normal", shape);
      for (let a = 0; a < 64; a++) {
        const angle = (a / 64) * Math.PI * 2;
        const reach = L.floorReach(r, angle);
        if (reach < L.inscribedRadius(r) - 1e-9 || reach > size / 2 + 1e-9) wrong++;
      }
    }
    check(`${shape}: the floor's reach is between its narrowest and its box`, wrong === 0, `${wrong} of 192`);
  }
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
  const here = { id: "here", kind: "normal", seed: 0, grid: { x: 0, z: 0 }, size: 16, shape: "square",
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

// The shipped templates. An authored room's props go through the same
// filters the seeded dressing does - out of the door lanes, clear of the
// gem, clear of whatever the kind's own content has claimed - and anything
// that fails is dropped without a word. A template that breaks a rule
// therefore renders as a sparse room rather than as an error, which is
// exactly how trap rooms went without spikes for weeks.
{
  const templates = L.allTemplates();
  check("the game ships room templates at all", templates.length > 0, `${templates.length} templates`);
  // The rules themselves live in the game, in one place, so that the Room
  // Builder can warn an author with exactly what this holds shipped content
  // to. Sixty seeds because the gem and the key take a seeded anchor, and
  // the missing chest this first found was only missing on some of them.
  const problems = templates.flatMap((t) =>
    L.templateProblems(t, 60).map((p) => `${t.id} prop ${p.index}: ${p.reason}`)
  );
  check("every shipped template is one the game will draw whole", problems.length === 0, problems.join("; ") || "none");

  /**
   * And in every way round a room can be furnished.
   *
   * The anchors are read in a seeded order now - four turns and a mirror -
   * and an authored room turns with them, so a template is placed in one of
   * eight orientations and has to survive all of them. Validating the one
   * it happens to get in a room at the origin would leave seven untested.
   */
  const orientations = new Set();
  const turned = [];
  for (let g = 0; g < 40; g++) {
    const grid = { x: g % 7, z: Math.floor(g / 7) };
    for (const t of L.allTemplates()) {
      const o = L.orientationOf(L.roomForTemplate(t, grid));
      orientations.add(`${o.turns}${o.mirror}`);
      turned.push(...L.templateProblems(t, 20, grid).map((p) => `${t.id} @${grid.x},${grid.z} prop ${p.index}: ${p.reason}`));
    }
  }
  check("all eight ways round a room were tried", orientations.size === 8, `${orientations.size} of 8`);
  check("a shipped template is one the game will draw whole in every one of them", turned.length === 0,
    turned.slice(0, 2).join("; ") || "none");
}

// The dressing: every arrangement of every kind, at every size, must stand
// each prop on an anchor of its own. Two props on one anchor is one prop
// inside another, and nothing downstream would notice - the door-lane and
// gem filters only ever compare a prop to the room, never to another prop.
{
  const kinds = Object.keys(L.LAYOUTS);
  let stacked = 0;
  let offAnchor = 0;
  let inRealLane = 0;
  let intersecting = 0;
  let overhangsLane = 0;
  let throughWall = 0;
  let arrangements = 0;
  let withMiddle = 0;
  for (const kind of kinds) {
    for (let variant = 0; variant < L.LAYOUTS[kind].length; variant++) {
      for (const size of L.ROOM_SIZES) {
        // Every door combination, because the anchors a room offers now
        // depend on which doors it has and an arrangement is written once
        // for all of them.
        for (const links of DOOR_SETS) {
          const r = { ...room(size, kind), links };
          const spots = {
            near: L.quadrantSpots(r, "near"),
            far: L.quadrantSpots(r, "far"),
            corners: L.cornerSpots(r),
            centre: L.centreSpots(r),
            // Both branches of anything the arrangement decides get walked.
            rng: () => 0.99,
          };
          for (const roll of [0.01, 0.99]) {
            const placed = L.LAYOUTS[kind][variant]({ ...spots, rng: () => roll });
            // The braziers stand in every room, so the footprint pass below
            // - unlike the anchor pass - has to see them. A cobweb shares a
            // brazier's corner on purpose, hanging at head height above it,
            // so the anchor pass would call that a collision.
            const withBraziers = [
              ...spots.corners.map((c) => ({ kind: "torch", x: c[0], z: c[2] })),
              ...placed,
            ];
            arrangements++;
            if (spots.centre.length) withMiddle++;
            const anchors = [...spots.near, ...spots.far, ...spots.corners, ...spots.centre];
            const seenAt = new Set();
            for (const p of placed) {
              const key = `${p.x.toFixed(4)},${p.z.toFixed(4)}`;
              if (seenAt.has(key)) stacked++;
              seenAt.add(key);
              if (!anchors.some((a) => Math.hypot(a[0] - p.x, a[2] - p.z) < 1e-6)) offAnchor++;
              // The filter in Dressing would drop it, so the room would
              // silently lose the prop rather than show it in a doorway.
              if (L.PROP_SPECS[p.kind].solid && L.inDoorLane(p.x, p.z, r)) inRealLane++;
            }
            /**
             * And the same three rules again, this time about the prop
             * rather than the point it stands on.
             *
             * Every placement rule in this game tested a centre point, and
             * every prop has a footprint that PROP_SPECS has carried all
             * along and nothing read. A table is a metre across its
             * half-width: on a `near` anchor it reached into the door lane,
             * on a `far` anchor in a fourteen-unit room it stood inside a
             * bookshelf on `near`, and in a sixteen-unit circle it stood
             * inside a brazier. All three passed every check there was.
             */
            const solid = withBraziers.filter((p) => L.PROP_SPECS[p.kind].solid);
            const half = size / 2;
            for (let i = 0; i < solid.length; i++) {
              const a = solid[i];
              const ra = L.PROP_SPECS[a.kind].radius;
              if (Math.abs(a.x) + ra > half || Math.abs(a.z) + ra > half) throughWall++;
              const lanes = L.laneAxes(r);
              if ((lanes.x && Math.abs(a.x) - ra < L.LANE_HALF_WIDTH) ||
                  (lanes.z && Math.abs(a.z) - ra < L.LANE_HALF_WIDTH)) overhangsLane++;
              for (let j = i + 1; j < solid.length; j++) {
                const b = solid[j];
                if (Math.hypot(a.x - b.x, a.z - b.z) < ra + L.PROP_SPECS[b.kind].radius) intersecting++;
              }
              // A brazier is not solid - you can walk through one - but a
              // table standing in one is still a table standing in one.
              for (const c of spots.corners) {
                if (Math.hypot(a.x - c[0], a.z - c[2]) < ra + L.PROP_SPECS.torch.radius) intersecting++;
              }
            }
          }
        }
      }
    }
  }
  check("no arrangement stands two props in the same place", stacked === 0, `${stacked} stacked in ${arrangements}`);
  check("every prop stands on an anchor, so it is clear of the lanes by construction", offAnchor === 0, `${offAnchor} loose`);
  check("no prop stands in a lane the room it is in actually has", inRealLane === 0, `${inRealLane} would be dropped`);
  check("no two solid props stand inside each other", intersecting === 0, `${intersecting} of ${arrangements} arrangements`);
  check("no solid prop's footprint overhangs a lane the room has", overhangsLane === 0, `${overhangsLane} overhang`);
  check("no solid prop's footprint reaches through a wall", throughWall === 0, `${throughWall} through`);
  check("the arrangements were walked in rooms that have a middle", withMiddle > 0, `${withMiddle} of ${arrangements}`);
  check("the kinds a player walks through most have more than one arrangement",
    ["normal", "treasure", "trap", "start", "end"].every((k) => L.LAYOUTS[k].length > 1),
    kinds.map((k) => `${k}:${L.LAYOUTS[k].length}`).join(" "));
}

// The economy: a floor you cannot pay to leave is a floor nobody can
// finish, and until this was written nothing checked it. What counts is
// what a player is guaranteed - a gem they can walk up to and take. Not the
// ones behind the locked vault, whose key they may never find; not the
// arena's, which is on a plinth in a room that starts a gauntlet when you
// take it; and not a puzzle's reward, which they may get wrong.
{
  const GATED = new Set(["arena"]);
  let unpayable = 0;
  let thin = 0;
  const worst = {};
  for (const floor of [1, 2, 3]) {
    const rules = L.floorRules(floor);
    const toll = L.tollForFloor(floor);
    let least = Infinity;
    for (let seed = 1; seed <= 400; seed++) {
      const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      let free = 0;
      for (const room of d.rooms) {
        if (room.kind === "start" || room.kind === "end") continue;
        if (GATED.has(room.kind)) continue;
        if (d.vaultId && room.id === d.vaultId) continue;
        free++;
      }
      least = Math.min(least, free);
      if (free < toll) unpayable++;
      // At least one to spare. The toll is meant to eat most of a floor's
      // free gems - what a run scores comes from the vault, the arena and
      // the puzzles - but a floor that costs every single gem to leave is
      // one where the choice the whole game is built on, take it or leave
      // it, is not offered at all.
      if (free < toll + 1) thin++;
    }
    worst[`floor ${floor}`] = `${least} free against a toll of ${toll}`;
  }
  check("every floor can be paid for without the vault, the arena or a puzzle",
    unpayable === 0, `${unpayable} of 1200 could not be`);
  check("and with something left over, so taking every gem is a choice",
    thin === 0, `${thin} of 1200 were within one`);
  console.log(`  worst seed per floor: ${Object.entries(worst).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
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

// --- Can you get away from it -----------------------------------------------
//
// The Warden is evaded or it is nothing: the game gives the player no verb
// against it. So the one thing that must be true of every speed in the game
// is that there is always a way out, and the one thing that makes it
// frightening is that walking is not it.
//
// This was false and shipped. Mire at 0.55 left a player sprinting at 4.40
// against a fully roused Warden at 4.40 - a dead heat, and sprinting is
// what tells it where you are. The potion is unidentified when you drink
// it. Every number in the chain is tuned by hand in three different files -
// the relics, the potions, the Warden's curve - so this walks all of them
// together rather than trusting that whoever changes one remembers the
// other two.
{
  // Every set of relics a player can end a run holding: all 64 of them.
  const RELIC_SETS = [];
  for (let mask = 0; mask < 1 << L.RELIC_IDS.length; mask++) {
    RELIC_SETS.push(L.RELIC_IDS.filter((_, i) => mask & (1 << i)));
  }
  // Alarm in half steps, because the censer halves what a gem adds.
  const ALARMS = [];
  for (let a = 0; a <= L.ALARM_MAX; a += 0.5) ALARMS.push(a);

  const top = L.wardenSpeedAt(L.ALARM_MAX);
  const rows = [];
  for (const relics of RELIC_SETS)
    for (const effect of L.PACE_EFFECTS)
      for (const alarm of ALARMS)
        rows.push({ relics, effect, alarm, warden: L.wardenSpeedAt(alarm), ...L.paceFor(relics, effect) });

  const say = (r) =>
    `${r.relics.length ? r.relics.join("+") : "no relics"}, ${r.effect}, alarm ${r.alarm}: ` +
    `walk ${r.walk.toFixed(2)} dash ${r.dash.toFixed(2)} v warden ${r.warden.toFixed(2)}`;

  // The Warden is fastest at full alarm, so clearing its top speed clears
  // every level below it.
  const slowest = rows.reduce((a, b) => (b.dash < a.dash ? b : a));
  check(
    `every sprint in the game outruns the Warden by ${Math.round((L.ESCAPE_MARGIN - 1) * 100)}%`,
    slowest.dash >= top * L.ESCAPE_MARGIN,
    `slowest sprint is ${say(slowest)}, needs ${(top * L.ESCAPE_MARGIN).toFixed(2)}`
  );
  check(
    "no combination of relics and potions is ever caught at a sprint",
    rows.every((r) => r.dash > r.warden),
    `${rows.filter((r) => r.dash <= r.warden).length} of ${rows.length} combinations`
  );

  // The other half. A potion that costs you nothing is not a cruel potion,
  // and the Warden that can never catch a walking player is furniture.
  const mired = rows.filter((r) => r.effect === "mire" && r.alarm === L.ALARM_MAX);
  const fastest = mired.reduce((a, b) => (b.walk > a.walk ? b : a));
  check(
    "a mired player cannot outwalk a fully roused Warden, whatever they are carrying",
    fastest.walk < top,
    `fastest mired walk is ${say(fastest)}`
  );
  // And it has to bite from the moment the Warden starts hunting, not only
  // at the very top - otherwise the potion is free for most of a run.
  const hunting = rows.filter((r) => r.effect === "mire" && r.alarm >= L.ALARM_HUNTS_AT && r.relics.length === 0);
  check(
    "mire is a real cost from the moment the floor starts hunting",
    hunting.every((r) => r.walk < r.warden),
    `${hunting.filter((r) => r.walk >= r.warden).length} of ${hunting.length} levels survivable on foot`
  );

  // The promise the Warden's own comment used to make, which is still true
  // of a player who has not drunk anything: keep moving and it never simply
  // walks you down.
  const sober = rows.filter((r) => r.effect !== "mire");
  check(
    "a player who has drunk nothing bad always outwalks the Warden",
    sober.every((r) => r.walk > r.warden),
    `${sober.filter((r) => r.walk <= r.warden).length} of ${sober.length} combinations`
  );
  console.log(
    `      ${rows.length} combinations of ${RELIC_SETS.length} relic sets, ` +
      `${L.PACE_EFFECTS.length} potions and ${ALARMS.length} alarm levels.`
  );
}

// --- The arena's two lines --------------------------------------------------
//
// Three arms of spikes sweep the whole floor for fourteen seconds and the
// doors are barred, so the room is exactly two claims: there is always a
// circle you can walk, and there is no spot you can stand. The second was
// false for as long as the room has existed. The innermost ring sat at 2.4
// and a patch reaches 1.2, so nothing ever came within 1.2 of the middle,
// and a player against the plinth stands 0.8 out - which is the spot they
// are standing on when they take the gem that starts the arms. Measured in
// the running game: three lives in, three lives out, having done nothing.
//
// An arm sweeps every angle once a turn, so whether a point is reached
// depends only on its radius, which is what makes this checkable at all.
{
  // Every size, though the generator only ever builds the arena at its
  // largest: the room builder and a future kind can both reach this.
  for (const size of L.ROOM_SIZES) {
    const half = size / 2;
    const rings = L.arenaRings(half);
    const shelter = L.arenaShelter(half);
    check(
      `arena ${size}: no ground in it is out of the arms' reach`,
      shelter === null,
      shelter === null
        ? `standable ${L.ARENA_MIN_STAND.toFixed(2)} to ${L.arenaMaxStand(half).toFixed(2)}, ` +
          `${rings.length} rings from ${rings[0]}`
        : `a player can stand ${shelter.toFixed(2)} from the middle untouched`
    );
    // Rings are only laid as far as a player can go. One past the corner is
    // three wasted patches in the largest room in the game.
    check(
      `arena ${size}: the arms stop once they have covered the furthest corner`,
      rings[rings.length - 1] - L.HAZARD_RADIUS < L.arenaMaxStand(half) &&
        rings[rings.length - 1] + L.HAZARD_RADIUS >= L.arenaMaxStand(half),
      `last ring ${rings[rings.length - 1].toFixed(1)}, furthest corner ${L.arenaMaxStand(half).toFixed(2)}`
    );
  }
  const half = L.ROOM_SIZE_LARGE / 2;
  // The plinth gets its own line, because it is the one place in the room a
  // player is guaranteed to be standing: it is where the gem was.
  check(
    "the spot the gem is taken from is swept",
    L.arenaRings(half).some((r) => Math.abs(r - L.ARENA_MIN_STAND) <= L.HAZARD_RADIUS),
    `up against the plinth is ${L.ARENA_MIN_STAND.toFixed(2)} out, innermost ring ${L.arenaRings(half)[0]}`
  );

  // And the other line. The room is only fair if the innermost circle a
  // player can hold is one they can hold on foot - and the walk it has to
  // be held on is the slowest in the game, not WALK_SPEED, because a potion
  // can halve that. This is the arena asking pace.ts the same question the
  // Warden does.
  const slowestWalk = Math.min(...L.PACE_EFFECTS.map((e) => L.paceFor([], e).walk));
  const fastestDash = Math.max(...L.PACE_EFFECTS.map((e) => L.paceFor(L.RELIC_IDS, e).dash));
  const inner = L.orbitSpeed(L.ARENA_INNER_ORBIT);
  check(
    "the innermost circle can be held at the slowest walk in the game",
    inner < slowestWalk,
    `holding ${L.ARENA_INNER_ORBIT.toFixed(2)} needs ${inner.toFixed(2)}, a mired walk is ${slowestWalk.toFixed(2)}`
  );
  // The room's shape as a difficulty curve: a stroll on the inside line,
  // more than a plain sprint out at the wall. That gap is what makes
  // choosing a line the thing the player is doing, and what makes a Potion
  // of Swiftness worth drinking here - with the boots as well it is the one
  // way to hold the outside, which is a reward rather than a hole.
  const wall = L.orbitSpeed(half - 0.3);
  check(
    "the outer wall cannot be held at a plain sprint",
    wall > L.DASH_SPEED,
    `holding the wall needs ${wall.toFixed(2)}, a sprint is ${L.DASH_SPEED}` +
      ` (with boots and swiftness, ${fastestDash.toFixed(2)})`
  );
}

// --- Nobody on the other end ------------------------------------------------
//
// Everything in this game that is not state goes over one typed bus, and
// nothing had ever asked whether the two ends of it match up. Three of the
// thirty-one events did not.
//
// The worst was `wardenStruck`. It has been emitted since the Warden could
// land a hit and nothing anywhere listened to it, so being caught by the
// thing the entire floor is built around was presented to the player
// exactly like walking into spikes: the same sound, the same flash, the
// same shake. The other two were `alarmRaised`, emitted twice into nothing,
// and `hazard`, declared and never emitted at all. TypeScript is happy with
// all three - a bus is typed on what an event carries, not on whether
// anyone is at the far end - which is the same reason nothing noticed that
// a quarter of the sound cues were never played until a check went looking.
//
// Read off the source rather than off a running game: a listener that only
// mounts in one room is still a listener, and waiting to see an event fire
// would make this a test of the walker's luck.
{
  const events = readFileSync(join(root, "src/game/events.ts"), "utf8");
  const body = events.slice(events.indexOf("interface BusEvents"));
  const declared = [...body.slice(0, body.indexOf("\n}")).matchAll(/^  (\w+):/gm)].map((m) => m[1]);
  const tree = execFileSync("grep", ["-rhoE", "bus\\.(on|emit)\\(\"\\w+\"", join(root, "src")], { encoding: "utf8" });
  const used = (verb, name) => tree.includes(`bus.${verb}("${name}"`);

  check("the bus declares the events this check knows about", declared.length > 20, `${declared.length} declared`);
  const unheard = declared.filter((e) => used("emit", e) && !used("on", e));
  check("every event something emits is listened to somewhere", unheard.length === 0, unheard.join(", ") || "none unheard");
  const unspoken = declared.filter((e) => used("on", e) && !used("emit", e));
  check("every event something listens for is emitted somewhere", unspoken.length === 0, unspoken.join(", ") || "none unspoken");
  const orphans = declared.filter((e) => !used("emit", e) && !used("on", e));
  check("the bus declares no event that neither end uses", orphans.length === 0, orphans.join(", ") || "none orphaned");
}

// --- The Sentry's question --------------------------------------------------
//
// The third and last of the things in this game that can catch a player,
// and the only one whose numbers had never been put next to a walking
// speed. It is the gentlest of the three - it takes no life, it rouses the
// floor by one and tells the Warden where you are - so what is worth
// holding it to is not survivability but that it asks a question with an
// answer:
//
//   Standing still in the light is always seen. Walking out of it never is.
//
// Both halves matter. A beam that sweeps past faster than it can call is a
// light show; a beam nobody can leave is a toll rather than a decision.
{
  const slowestWalk = Math.min(...L.PACE_EFFECTS.map((e) => L.paceFor([], e).walk));
  const plainWalk = L.paceFor([], "none").walk;
  const miredWalk = L.paceFor([], "mire").walk;

  check(
    "standing in the beam is held long enough to be called out",
    L.sweepTime() > L.SENTRY_PATIENCE,
    `the beam covers one direction for ${L.sweepTime().toFixed(2)}s, and it calls after ${L.SENTRY_PATIENCE}s`
  );
  // Hardest at the far edge of its reach, where a player's own speed buys
  // the least angle, and easiest under the post.
  check(
    "a walking player is never called out, at any distance inside its reach",
    !L.isCaught(L.SENTRY_RANGE, plainWalk),
    `at ${L.SENTRY_RANGE} units a walk takes ${L.slowestEscape(plainWalk).toFixed(2)}s to leave, of ${L.SENTRY_PATIENCE}s`
  );
  // The one exception, and it is meant to be one. Mire is a cruel potion:
  // it should cost something in every room that asks you to move, and this
  // is the room that asks you to move a little.
  check(
    "mire is what makes a Sentry able to catch you",
    L.isCaught(L.SENTRY_RANGE, miredWalk) && slowestWalk === miredWalk,
    `mired, leaving takes ${L.slowestEscape(miredWalk).toFixed(2)}s of ${L.SENTRY_PATIENCE}s`
  );
  // Where that starts to bite, so the number is written down rather than
  // discovered by a player wondering what happened.
  let bites = 0;
  for (let r = 0.5; r <= L.SENTRY_RANGE; r += 0.1) if (!L.isCaught(r, miredWalk)) bites = r;
  check(
    "and only in the outer half of its reach, not the whole room",
    bites > L.SENTRY_RANGE / 2,
    `a mired walk escapes out to ${bites.toFixed(1)} of ${L.SENTRY_RANGE} units`
  );
}

console.log(failures === 0 ? "\nAll layout checks passed." : `\n${failures} layout check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
