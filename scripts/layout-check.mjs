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
   export * from "${root}src/game/items/charge";
   export * from "${root}src/game/thief/nest";
   export * from "${root}src/game/delvers/catalog";
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
   export * from "${root}src/game/sentry/placement";
   export * from "${root}src/game/rooms/Dressing";
   export * from "${root}src/game/relics/catalog";
   export * from "${root}src/game/warden/tuning";
   export * from "${root}src/game/warden/steer";
   export * from "${root}src/game/warden/bars";
   export * from "${root}src/game/warden/roam";
   export * from "${root}src/game/items/catalog";
   export * from "${root}src/game/world";`
);
const out = join(dir, "bundle.mjs");
// The dressing lives in a .tsx - `placementsFor` is the pure half of a
// component, and the editor previews with it directly - so the bundle needs
// to know what to do with JSX and with the env the browser build defines.
await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: out,
  logLevel: "error",
  absWorkingDir: root,
  loader: { ".tsx": "tsx" },
  jsx: "automatic",
  define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" },
});
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
  let loose = 0;
  const worst = {};
  for (const floor of [1, 2, 3]) {
    const rules = L.floorRules(floor);
    const toll = L.tollForFloor(floor);
    let least = Infinity;
    let most = -Infinity;
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
      most = Math.max(most, free);
      if (free < toll) unpayable++;
      /**
       * At least one to spare, and not more than a floor's worth over.
       *
       * A floor that costs every single gem to leave is one where the
       * choice the whole game is built on, take it or leave it, is not
       * offered at all. That was the only side guarded, and the comment
       * beside it claimed the toll "eats most of a floor's free gems".
       * Measured over these same four hundred seeds, it eats between
       * forty-three and seventy-five per cent of them:
       *
       *   floor 1  toll 3  free 4 to 7    spare 1 to 4
       *   floor 2  toll 5  free 6 to 10   spare 1 to 5
       *   floor 3  toll 7  free 9 to 13   spare 2 to 6
       *
       * So on the loosest seeds more than half survives the exit, which is
       * a softer decision than the sentence describes. Whether that is the
       * right softness is a design question and PLAYTEST asks it of a
       * human; what is guarded here is that it does not drift further. The
       * seeds are fixed, so this passes or fails the same way every time.
       */
      if (free < toll + 1) thin++;
      if (free > toll * 3) loose++;
    }
    worst[`floor ${floor}`] = `${least} to ${most} free against a toll of ${toll}`;
  }
  /**
   * And the same rule for every delver, because one of them raises the toll.
   *
   * A delver may change what a run opens with; it may not change what the
   * dungeon is. This is the check that stopped the Pilgrim paying for its
   * fourth life with a gem on every exit: the thinnest first floor holds
   * four gems it can guarantee against a toll of three, so one more on the
   * door left a run that had to take every gem on the floor to leave,
   * which is the game's whole decision switched off. It pays on the alarm
   * now. A delver's own relics are priced in too, because the Toll Ledger
   * takes a gem off and must not be what makes the sums work.
   */
  let delverUnpayable = 0;
  let delverThin = 0;
  let delverCases = 0;
  const delverWorst = {};
  for (const id of L.DELVER_IDS) {
    const delver = L.DELVERS[id];
    // The relics a delver starts with, priced in: the Ledger takes a gem
    // off, which would hide a toll bonus that the floor cannot cover.
    const discount = L.modifiers(delver.relics).tollDiscount;
    let tightest = Infinity;
    for (const floor of [1, 2, 3]) {
      const rules = L.floorRules(floor);
      const toll = Math.max(1, L.tollForFloor(floor) - discount);
      for (let seed = 1; seed <= 200; seed++) {
        const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
        let free = 0;
        for (const room of d.rooms) {
          if (room.kind === "start" || room.kind === "end") continue;
          if (GATED.has(room.kind)) continue;
          if (d.vaultId && room.id === d.vaultId) continue;
          free++;
        }
        delverCases++;
        if (free < toll) delverUnpayable++;
        if (free < toll + 1) delverThin++;
        tightest = Math.min(tightest, free - toll);
      }
    }
    delverWorst[delver.name] = tightest;
  }
  check(
    "no delver can be given a floor it cannot pay to leave",
    delverUnpayable === 0,
    `${delverUnpayable} of ${delverCases}`
  );
  check(
    "and every delver is still offered the choice: a gem spare on the worst seed",
    delverThin === 0,
    Object.entries(delverWorst).map(([k, v]) => `${k} +${v}`).join(", ")
  );
  // A delver may not quietly be the easy one either. Lives, slots, gems in
  // hand and the alarm are different currencies on purpose, so what is
  // asserted is only that every one of them pays for what it brings.
  const freeLunch = L.DELVER_IDS.filter((id) => {
    const d = L.DELVERS[id];
    if (id === "vagrant") return false;
    const gains =
      (d.lives > L.STARTING_LIVES ? 1 : 0) +
      (d.gems > 0 ? 1 : 0) +
      d.relics.length +
      d.satchel.length +
      (d.slots > 4 ? 1 : 0);
    const costs =
      (d.lives < L.STARTING_LIVES ? 1 : 0) +
      (d.slots < 4 ? 1 : 0) +
      (d.alarmBonus > 0 ? 1 : 0) +
      (d.alarmFactor > 1 ? 1 : 0);
    return gains > 0 && costs === 0;
  });
  check(
    "and every delver but the Vagrant pays for what it brings",
    freeLunch.length === 0,
    freeLunch.length ? freeLunch.join(", ") : `${L.DELVER_IDS.length} delvers`
  );

  check("every floor can be paid for without the vault, the arena or a puzzle",
    unpayable === 0, `${unpayable} of 1200 could not be`);
  check("and with something left over, so taking every gem is a choice",
    thin === 0, `${thin} of 1200 were within one`);
  check("and the exit still costs a real share of what a floor holds",
    loose === 0, `${loose} of 1200 held more than three times their toll`);
  console.log(`  free gems per floor: ${Object.entries(worst).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
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
  /**
   * And the same promise against the clock rather than against the player.
   *
   * The whole matrix above compares two speeds, and a speed is a distance
   * over a frame. The Warden's frame was the wall clock: it added
   * `speed * delta` with nothing bounding the delta, so a hitch of a
   * second moved it four metres in one step - measured, in a room
   * twenty-four across, with a strike radius of one. Every sprint in the
   * table outruns it and none of them outruns a frame that never happened.
   *
   * Two lines hold the cap now. It must be shorter than the reach it
   * strikes from, so there is always a frame between seeing it close and
   * being touched. And it must be longer than a step at a playable frame
   * rate, or it would be a stealth nerf to the chase rather than a floor
   * under a hitch.
   */
  check(
    "one frame never carries the Warden across the reach it strikes from",
    L.WARDEN_MAX_STEP < L.WARDEN_TOUCH_RADIUS,
    `cap ${L.WARDEN_MAX_STEP.toFixed(3)}m against a reach of ${L.WARDEN_TOUCH_RADIUS}m`
  );
  check(
    `and the cap does not bind at ${Math.round(1 / L.MAX_FRAME_S)} frames a second or better`,
    top * L.MAX_FRAME_S < L.WARDEN_MAX_STEP,
    `a frame of ${L.MAX_FRAME_S}s carries it ${(top * L.MAX_FRAME_S).toFixed(3)}m, the cap is ${L.WARDEN_MAX_STEP.toFixed(3)}m`
  );

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

  /**
   * And the mirror of the innermost line, which is the one that binds.
   *
   * The check above asks whether the tightest circle can be held by the
   * slowest walk. A player on a keyboard has the opposite problem: they
   * cannot walk slower than they walk. W is on or off, so the circle they
   * hold is the one their speed fits - `speed / ARENA_SPIN` - and that
   * circle has to be inside the room. The inner line is a stroll only for
   * somebody with a stick they can half-deflect.
   *
   * Walked in the running game, this is what it looks like: a body moving
   * at 4.6 m/s held a circle of 3 for the whole gauntlet untouched, and the
   * same body aimed at a circle of 1.2 - the innermost the geometry allows
   * - lapped the arms and took seven hits.
   */
  const fastestWalk = Math.max(...L.PACE_EFFECTS.map((e) => L.paceFor(L.RELIC_IDS, e).walk));
  const needs = fastestWalk / L.ARENA_SPIN;
  check(
    "the circle the fastest walk in the game has to hold still fits in the room",
    needs <= L.arenaMaxStand(half),
    `walking ${fastestWalk.toFixed(2)} holds a circle of ${needs.toFixed(1)}, ` +
      `and a player can get ${L.arenaMaxStand(half).toFixed(1)} from the middle`
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
  /**
   * And the promise has to survive the frame it is measured in.
   *
   * "A walking player is never called out" is the check above, and it is
   * true by sixty-four milliseconds: 0.836s to cross out of the beam at
   * its furthest reach against 0.9s of patience. The post decides that by
   * looking once a frame, so the finest it can tell the difference is one
   * frame, and a frame at fifteen a second is longer than the whole
   * margin. MAX_FRAME_S is the longest frame this game counts in full, and
   * the margin has to be wider than it or the promise is finer than the
   * instrument measuring it.
   *
   * How long it has held you is a span rather than a sum - the clock read
   * when the light arrives, and the answer is how long ago that was - so
   * the number itself does not drift with the frame rate. What is left is
   * this: a walk that clears the beam between two consecutive looks is
   * never seen at all, and one that does not has the margin to spare.
   */
  const margin = L.SENTRY_PATIENCE - L.slowestEscape(plainWalk);
  check(
    "and the margin it is never called out by is wider than a whole frame",
    margin > L.MAX_FRAME_S,
    `margin ${(margin * 1000).toFixed(0)}ms against a frame of ${(L.MAX_FRAME_S * 1000).toFixed(0)}ms`
  );

  /**
   * And a raised lantern is the other way to be caught by one.
   *
   * The beam takes 0.9 seconds to be sure of someone, a walk takes 0.836
   * to leave it at the furthest reach, and halving the patience for a
   * player carrying the only bright thing on the floor turns that from
   * "never called out" into "always called out". That is the whole reason
   * to put the light down in a watched room, and it has to be true at
   * every distance that matters rather than only at the edge - a rule
   * that applies in the outer half of a room is a rule a player learns as
   * bad luck. Close under the post is the exception and is geometry
   * rather than mercy: a step there is worth a lot of angle, and a player
   * standing on top of a watcher has other problems.
   */
  const litPatience = L.SENTRY_PATIENCE * L.LANTERN_SEEN_FACTOR;
  let litSafe = 0;
  for (let r = 1.0; r <= L.SENTRY_RANGE; r += 0.1) {
    if (L.timeToLeaveBeam(r, plainWalk) <= litPatience) litSafe = r;
  }
  check(
    "a walking player holding a raised lantern is called out at any real distance",
    L.timeToLeaveBeam(L.SENTRY_RANGE, plainWalk) > litPatience &&
      litSafe < L.SENTRY_RANGE / 2,
    `lit patience ${litPatience}s; a walk only escapes it within ${litSafe.toFixed(1)} of the post, of ${L.SENTRY_RANGE} units of reach`
  );
  check(
    "and putting it down is a real answer, not a smaller helping of the same thing",
    !L.isCaught(L.SENTRY_RANGE, plainWalk),
    `unlit, leaving takes ${L.slowestEscape(plainWalk).toFixed(2)}s of ${L.SENTRY_PATIENCE}s`
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

// --- Is the lock worth the key ---------------------------------------------
//
// A floor puts one door behind a key. What was behind it was whatever room
// the floor could be walked without - a treasure room only 29% of the time,
// and a set piece or a plain chamber the rest - and it was furnished as
// whatever kind it happened to be. Measured over 899 locked rooms: a vault
// held 0.97 chests, an ordinary chamber 0.90, and the treasure rooms
// standing open elsewhere on the same floors held 2.35. The lock cost a key
// and paid what any room on the floor pays, which is to say nothing, while
// the code that fills the chests carried a comment about "the vault, with
// three of them, finally worth its name".
//
// Being the vault decides the furniture now. This checks it room by room
// rather than on an average, which is the sharper question: is this
// particular locked room better for being locked?
{
  const chests = (room, seed, asVault) =>
    L.placementsFor(room, seed, { asVault }).filter((p) => p.kind === "chest").length;
  let vaults = 0;
  let better = 0;
  let worse = 0;
  let locked = 0;
  let plain = 0;
  let plainRooms = 0;
  const SET_PIECES = new Set(["shop", "library", "memory", "challenge", "arena"]);
  const bare = [];
  let bareSet = 0;
  for (let seed = 1; seed <= 120; seed++) {
    for (let floor = 1; floor <= 3; floor++) {
      const d = L.generateDungeon(seed, floor);
      if (!d.vaultId) continue;
      const vault = d.rooms.find((r) => r.id === d.vaultId);
      const asVault = chests(vault, d.seed, true);
      const asItself = chests(vault, d.seed, false);
      vaults++;
      locked += asVault;
      if (asVault > asItself) better++;
      if (asVault < asItself) worse++;
      if (asVault === 0) {
        if (SET_PIECES.has(vault.kind)) bareSet++;
        else bare.push(`${vault.kind} on floor ${floor} of seed ${seed}`);
      }
      for (const r of d.rooms) {
        if (r.kind !== "normal" || r.id === d.vaultId) continue;
        plain += chests(r, d.seed, false);
        plainRooms++;
      }
    }
  }
  check("every floor checked has a locked room to look behind", vaults > 300, `${vaults} vaults`);
  check(
    "locking a room never leaves it with less in it than before",
    worse === 0,
    `${worse} of ${vaults} came out worse`
  );
  check(
    "many locked rooms hold more for being locked",
    better > vaults / 4,
    `${better} of ${vaults} gained chests`
  );
  // The ones with no chest are all set pieces, whose own content is the
  // reward: a locked challenge room, memory trial or shop. What must never
  // happen is a key opening onto a plain chamber with nothing extra in it.
  check(
    "a locked room is never a plain chamber with nothing extra in it",
    bare.length === 0,
    bare.join(", ") || `${bareSet} chestless vaults, every one a set piece`
  );
  // The headline: a key has to buy more than walking into the next room.
  const perVault = locked / vaults;
  const perPlain = plain / plainRooms;
  check(
    "a vault is worth more than an ordinary chamber",
    perVault > perPlain * 1.5,
    `${perVault.toFixed(2)} chests against ${perPlain.toFixed(2)}`
  );
}

// --- Can anything in the shop be bought ------------------------------------
//
// The shop sells six relics and nothing had ever checked their prices
// against what the game gives a player to spend. A purchase may not leave
// anyone short of the exit, so what the shop asks for is the price plus
// that floor's toll - and with a gem added per floor down, that came to 5,
// 8 and 11 gems in hand, against floors holding 5.1, 7.5 and 10.5
// guaranteed gems in total. On the two lower floors the cheapest relic cost
// more than the whole floor contained.
//
// What a floor guarantees is counted the same way the economy check counts
// it: rooms a player can walk into and take a gem from, not the vault's,
// not the arena's, not a puzzle's reward.
{
  const GATED = new Set(["arena"]);
  const cheapest = Math.min(...Object.values(L.RELICS).map((r) => r.price));
  const rows = [];
  for (const floor of [1, 2, 3]) {
    const rules = L.floorRules(floor);
    const toll = L.tollForFloor(floor);
    const asking = L.priceOn({ price: cheapest }, floor) + toll;
    let least = Infinity;
    let enough = 0;
    let seeds = 0;
    let total = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      let free = 0;
      for (const room of d.rooms) {
        if (room.kind === "start" || room.kind === "end") continue;
        if (GATED.has(room.kind)) continue;
        if (d.vaultId && room.id === d.vaultId) continue;
        free++;
      }
      seeds++;
      total += free;
      least = Math.min(least, free);
      if (free >= asking) enough++;
    }
    rows.push({ floor, toll, asking, least, typical: total / seeds, share: enough / seeds });
  }
  // What the shop asks must be inside what a floor typically holds -
  // otherwise the relic is a thing on a shelf rather than a thing for sale.
  const overpriced = rows.filter((r) => r.asking > r.typical);
  check(
    "the cheapest relic never asks more than a floor typically holds",
    overpriced.length === 0,
    overpriced.map((r) => `floor ${r.floor} asks ${r.asking} of ${r.typical.toFixed(1)}`).join(", ") ||
      rows.map((r) => `floor ${r.floor}: asks ${r.asking}, holds ${r.typical.toFixed(1)}`).join("; ")
  );
  // The deepest floor is where a player who has banked a couple on the way
  // down actually shops, and it is the floor with the most gems in it, so
  // there it should never be a question of the seed.
  const deepest = rows[rows.length - 1];
  check(
    "and on the deepest floor every seed holds enough",
    deepest.share === 1,
    `${(deepest.share * 100).toFixed(0)}% of seeds, asking ${deepest.asking} of ${deepest.least}+`
  );
}

// --- What is in the chests --------------------------------------------------
//
// Two of the nine items are cruel, and they are the only downside in the
// loot: they are what makes drinking an unidentified bottle a decision
// rather than a free refill. How often one turns up is written in
// `rollItem` as a quarter on the first floor, easing to an eighth on the
// deepest - and it was not what came out. The filter asked
// `ITEMS[id].cruel === (rng() < cruelChance)`, which draws a number for
// every item in the list rather than one for the choice, so each item was
// kept or dropped on its own flip and the pool came out weighted by how
// many of each kind exist. Measured over 8,510 chests: 10% of what a
// player found was a bad idea, against the quarter the code says.
//
// A share is a statistical claim, so this counts enough chests for the
// answer to be steady rather than trusting one floor of one seed.
{
  const rows = [];
  for (const floor of [1, 2, 3]) {
    const rules = L.floorRules(floor);
    const meant = Math.max(0.12, 0.3 - floor * 0.05);
    let cruel = 0;
    let total = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      for (const room of d.rooms) {
        const ps = L.placementsFor(room, d.seed, { asVault: room.id === d.vaultId });
        ps.forEach((p, i) => {
          if (p.kind !== "chest") return;
          total++;
          if (L.ITEMS[L.rollItem(d.seed, `${room.id}:${i}`, floor)].cruel) cruel++;
        });
      }
    }
    rows.push({ floor, meant, got: cruel / total, total });
  }
  check(
    "chests are as unkind as the floor says they are",
    rows.every((r) => Math.abs(r.got - r.meant) < 0.03),
    rows.map((r) => `floor ${r.floor}: ${(r.got * 100).toFixed(0)}% of ${r.total}, meant ${(r.meant * 100).toFixed(0)}%`).join("; ")
  );
  // The other half of the same fact: a floor a player is meant to be able
  // to risk something on must actually hold something to risk.
  check(
    "and every floor holds cruel ones and kind ones both",
    rows.every((r) => r.got > 0 && r.got < 1),
    rows.map((r) => `${(r.got * 100).toFixed(0)}%`).join("/")
  );
}

// --- Where the watcher stands ----------------------------------------------
//
// The Sentry's post is a two-metre column with a collider a fifth of a
// metre across, and it was dropped on a far quadrant anchor picked at
// random. The furniture goes on the same ring, and so does the gem, and
// nothing on any side knew about the others: the dressing keeps clear of
// the room's own content, the gem and the spikes, and the post was in none
// of those lists.
//
// Measured over 1,346 watched rooms: 27% of posts stood inside a prop, 22%
// inside a solid one so that two colliders shared the same space, and 27%
// stood on the gem. Not near it - on it, the same anchor to two decimal
// places. This is the rule cycle 23 wrote for the props, applied to the one
// thing in a room that was placed in its own file and left out of it.
{
  const POST = 0.22;
  /** Roughly what a key lying on the floor occupies. */
  const KEY = 0.35;
  let watched = 0;
  let keysLaid = 0;
  const keyInProp = [];
  const inProp = [];
  const onGem = [];
  const inLane = [];
  for (const floor of [1, 2, 3]) {
    const rules = L.floorRules(floor);
    for (let seed = 1; seed <= 120; seed++) {
      const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      for (const room of d.rooms) {
        const where = `${room.kind} on floor ${floor} of seed ${seed}`;
        // The room in the order it is assembled: gem, key, watcher,
        // furniture. Each is worked out from the room and the seed alone,
        // which is what lets the shell and the dressing agree without
        // talking to each other - and is exactly what was missing.
        const key = room.id === d.keyRoomId ? L.keyFor(room, d.seed) : null;
        const sentry = L.sentryFor(room, d.seed, floor, key ? [key] : []);
        const ps = L.placementsFor(room, d.seed, {
          asVault: room.id === d.vaultId,
          sentry: sentry?.at ?? null,
          key,
        });
        if (key) {
          keysLaid++;
          for (const p of ps) {
            if (Math.hypot(p.x - key[0], p.z - key[2]) < KEY + L.PROP_SPECS[p.kind].radius) {
              keyInProp.push(`${p.kind} on the key in a ${where}`);
            }
          }
          if (sentry && Math.hypot(sentry.at[0] - key[0], sentry.at[2] - key[2]) < KEY + POST) {
            keyInProp.push(`the post on the key in a ${where}`);
          }
        }
        if (!sentry) continue;
        watched++;
        for (const p of ps) {
          const gap = Math.hypot(p.x - sentry.at[0], p.z - sentry.at[2]);
          if (gap < POST + L.PROP_SPECS[p.kind].radius) inProp.push(`${p.kind} in a ${where}`);
        }
        const gem = L.gemFor(room, d.seed);
        if (gem && Math.hypot(gem[0] - sentry.at[0], gem[2] - sentry.at[2]) < POST + 0.6) onGem.push(where);
        if (L.inDoorLane(sentry.at[0], sentry.at[2], room)) inLane.push(where);
      }
    }
  }
  check("the floors checked are watched at all", watched > 300, `${watched} watched rooms`);
  check("no Sentry stands inside a prop", inProp.length === 0, inProp.slice(0, 3).join("; ") || `${watched} clear`);
  check("no Sentry stands on the gem", onGem.length === 0, onGem.slice(0, 3).join("; ") || `${watched} clear`);
  check("no Sentry stands in a doorway's path", inLane.length === 0, inLane.slice(0, 3).join("; ") || `${watched} clear`);
  // The key is the same rule and the worse offender: it was put at the
  // anchor furthest from the room's content and the gem, and the furniture
  // then went down knowing nothing about it. 65% of keys lay inside a prop
  // and 59% inside a solid one - the thing a player is hunting for, under
  // a pillar.
  check("the floors checked lay a key at all", keysLaid > 200, `${keysLaid} keys`);
  check(
    "no key lies inside anything",
    keyInProp.length === 0,
    keyInProp.slice(0, 3).join("; ") || `${keysLaid} clear`
  );
}


// --- Is there a way to the gem, or only a place to stand beside it -------
//
// The trap room's check asked whether some point within reach of the gem
// was outside every spike patch, and called that "the gem can be taken
// without touching spikes". A place to stand is not a way to get there. A
// player arrives through a doorway and has to walk, and in a room sixteen
// across with the gem in a corner at 6.41, two of the three patches sat on
// the gem's own coordinate and reached 1.2 past it - to 7.61, against a
// wall a player can press to 7.7. Nine centimetres of corridor, in a room
// whose own comment says "the way round, along the walls, is safe".
// Flooding the floor found the gem walled off in seventy of a hundred and
// thirteen trap rooms; the old check passed on every one of them, because
// there was indeed a clear spot, hard in the corner, with no route to it.
//
// So this floods the floor from every doorway the room has, past the
// spikes and past the furniture, and asks whether the walk arrives. It is
// the first check in the project that asks whether a room can be walked
// rather than whether things are spaced - the props turn out to be
// innocent, and it is worth knowing that rather than assuming it.
{
  /** A quarter of a metre: a third of the narrowest corridor a body fits. */
  const CELL = 0.25;
  const BODY = L.PLAYER_CAPSULE_RADIUS;
  /** The gem's own trigger reaches this far; anything less is not the game. */
  const GEM_REACH = 2.4;

  const routeToGem = (room, seed) => {
    const half = room.size / 2;
    const gem = L.gemFor(room, seed);
    if (!gem) return null;
    const spikes = room.kind === "trap" ? L.trapHazards(room, gem) : [];
    const props = L.placementsFor(room, seed).filter((p) => L.PROP_SPECS[p.kind].solid);
    // The hazard tests the camera's own point, so a patch blocks a disc of
    // exactly its radius - the body's width is what the walls take.
    const blocked = (x, z) =>
      Math.abs(x) > half - BODY ||
      Math.abs(z) > half - BODY ||
      spikes.some(([sx, , sz]) => Math.hypot(x - sx, z - sz) < L.HAZARD_RADIUS) ||
      props.some((p) => Math.hypot(x - p.x, z - p.z) < L.PROP_SPECS[p.kind].radius + BODY);

    const n = Math.ceil((half * 2) / CELL);
    const at = (i) => -half + i * CELL;
    const key = (i, j) => i * 1000 + j;
    const seen = new Set();
    const queue = [];
    for (const dir of ["north", "south", "east", "west"]) {
      if (!room.links[dir]) continue;
      const [dx, , dz] = L.doorPosition(room, dir);
      // A stride inside the doorway, which is where travel puts the player.
      const i = Math.round((dx * 0.82 + half) / CELL);
      const j = Math.round((dz * 0.82 + half) / CELL);
      if (!blocked(at(i), at(j)) && !seen.has(key(i, j))) {
        seen.add(key(i, j));
        queue.push([i, j]);
      }
    }
    if (queue.length === 0) return { entered: false };
    while (queue.length) {
      const [i, j] = queue.pop();
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a > n || b > n || seen.has(key(a, b)) || blocked(at(a), at(b))) continue;
        seen.add(key(a, b));
        queue.push([a, b]);
      }
    }
    for (const c of seen) {
      if (Math.hypot(at(Math.floor(c / 1000)) - gem[0], at(c % 1000) - gem[2]) <= GEM_REACH) {
        return { entered: true, reached: true };
      }
    }
    return { entered: true, reached: false };
  };

  const walled = { trap: 0, other: 0 };
  const counted = { trap: 0, other: 0 };
  let noWayIn = 0;
  // One list per bucket: shared, a trap room's example was printed beside
  // the count of the other rooms and read as though it were one of them.
  const examples = { trap: [], other: [] };
  for (let seed = 1; seed <= 120; seed++) {
    const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
    for (const room of d.rooms) {
      const r = routeToGem(room, d.seed);
      if (!r) continue;
      const bucket = room.kind === "trap" ? "trap" : "other";
      counted[bucket]++;
      if (!r.entered) noWayIn++;
      else if (!r.reached) {
        walled[bucket]++;
        if (examples[bucket].length < 3) examples[bucket].push(`${room.id}@${d.seed} ${room.size} ${room.shape}`);
      }
    }
  }
  /**
   * And the map's own assumption: a room joins the rooms it links to.
   *
   * The generator checks connectivity on the room graph and takes it for
   * granted that a room can be crossed. Nothing had asked. A room whose two
   * doors are on opposite walls with its own furniture between them would
   * strand a player in a dungeon the generator had certified connected -
   * and the fill above starts from every doorway at once, so it would not
   * notice a room split in two as long as the gem were in either half.
   */
  const crossable = (room, seed) => {
    const dirs = ["north", "south", "east", "west"].filter((x) => room.links[x]);
    if (dirs.length < 2) return null;
    const half = room.size / 2;
    const gem = L.gemFor(room, seed);
    const spikes = room.kind === "trap" && gem ? L.trapHazards(room, gem) : [];
    const props = L.placementsFor(room, seed).filter((q) => L.PROP_SPECS[q.kind].solid);
    const blocked = (x, z) =>
      Math.abs(x) > half - BODY ||
      Math.abs(z) > half - BODY ||
      spikes.some(([sx, , sz]) => Math.hypot(x - sx, z - sz) < L.HAZARD_RADIUS) ||
      props.some((q) => Math.hypot(x - q.x, z - q.z) < L.PROP_SPECS[q.kind].radius + BODY);
    const n = Math.ceil((half * 2) / CELL);
    const at = (i) => -half + i * CELL;
    const key = (i, j) => i * 1000 + j;
    const doorCell = (dir) => {
      const [dx, , dz] = L.doorPosition(room, dir);
      return [Math.round((dx * 0.82 + half) / CELL), Math.round((dz * 0.82 + half) / CELL)];
    };
    const [i0, j0] = doorCell(dirs[0]);
    if (blocked(at(i0), at(j0))) return null;
    const seen = new Set([key(i0, j0)]);
    const queue = [[i0, j0]];
    while (queue.length) {
      const [i, j] = queue.pop();
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a > n || b > n || seen.has(key(a, b)) || blocked(at(a), at(b))) continue;
        seen.add(key(a, b));
        queue.push([a, b]);
      }
    }
    return dirs.slice(1).every((dir) => {
      const [i, j] = doorCell(dir);
      return seen.has(key(i, j));
    });
  };

  /**
   * And the things a room is made of: can they be walked up to?
   *
   * The fill above asks it of the gem. Nothing had asked it of the plate,
   * the lectern, the four pedestals or the shop counter - the anchors a
   * kind's own content stands on, which are the reason those rooms exist.
   * The dressing keeps its props off them, which is not the same as leaving
   * a way to them: a table and a bookshelf either side of a pedestal are
   * both clear of it and both in the way. This is the trap room's lesson
   * applied to the furniture rather than to the spikes.
   *
   * `CLOSE_REACH` is the tightest reach any of them offers - a crystal on a
   * pedestal - so it is the honest bound for all of them; a lectern and a
   * counter reach further and are only easier.
   */
  const reachable = (room, seed, target) => {
    const half = room.size / 2;
    const gem = L.gemFor(room, seed);
    const spikes = room.kind === "trap" && gem ? L.trapHazards(room, gem) : [];
    const props = L.placementsFor(room, seed).filter((q) => L.PROP_SPECS[q.kind].solid);
    const blocked = (x, z) =>
      Math.abs(x) > half - BODY ||
      Math.abs(z) > half - BODY ||
      spikes.some(([sx, , sz]) => Math.hypot(x - sx, z - sz) < L.HAZARD_RADIUS) ||
      props.some((q) => Math.hypot(x - q.x, z - q.z) < L.PROP_SPECS[q.kind].radius + BODY);
    const n = Math.ceil((half * 2) / CELL);
    const at = (i) => -half + i * CELL;
    const key = (i, j) => i * 1000 + j;
    const seen = new Set();
    const queue = [];
    for (const dir of ["north", "south", "east", "west"]) {
      if (!room.links[dir]) continue;
      const [dx, , dz] = L.doorPosition(room, dir);
      const i = Math.round((dx * 0.82 + half) / CELL);
      const j = Math.round((dz * 0.82 + half) / CELL);
      if (!blocked(at(i), at(j)) && !seen.has(key(i, j))) { seen.add(key(i, j)); queue.push([i, j]); }
    }
    if (queue.length === 0) return false;
    while (queue.length) {
      const [i, j] = queue.pop();
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a > n || b > n || seen.has(key(a, b)) || blocked(at(a), at(b))) continue;
        seen.add(key(a, b));
        queue.push([a, b]);
      }
    }
    for (const c of seen) {
      if (Math.hypot(at(Math.floor(c / 1000)) - target[0], at(c % 1000) - target[2]) <= L.CLOSE_REACH) return true;
    }
    return false;
  };

  let anchorsWalked = 0;
  const outOfReach = [];
  for (let seed = 1; seed <= 120; seed++) {
    const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
    for (const room of d.rooms) {
      for (const a of L.reservedAnchorsFor(room.kind, room)) {
        anchorsWalked++;
        if (!reachable(room, d.seed, a)) {
          if (outOfReach.length < 3) {
            outOfReach.push(`${room.kind} ${room.id}@${d.seed} ${room.size} ${room.shape}`);
          }
        }
      }
    }
  }

  let split = 0;
  let withDoors = 0;
  const stranded = [];
  for (let seed = 1; seed <= 120; seed++) {
    const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
    for (const room of d.rooms) {
      const ok2 = crossable(room, d.seed);
      if (ok2 === null) continue;
      withDoors++;
      if (!ok2) {
        split++;
        if (stranded.length < 3) stranded.push(`${room.kind} ${room.id}@${d.seed} ${room.size} ${room.shape}`);
      }
    }
  }

  check(
    "every doorway leads somewhere: the walk always starts",
    noWayIn === 0,
    `${noWayIn} rooms with no clear ground inside a doorway`
  );
  check(
    "a trap room's gem can be walked to, not merely stood beside",
    walled.trap === 0,
    `${walled.trap} of ${counted.trap} trap rooms walled the gem off  ${examples.trap.join(" | ")}`
  );
  check(
    "and so can every other room's, past its own furniture",
    walled.other === 0,
    `${walled.other} of ${counted.other} rooms walled the gem off  ${examples.other.join(" | ")}`
  );
  check(
    "every plate, lectern, pedestal and counter can be walked up to",
    outOfReach.length === 0,
    `${outOfReach.length} of ${anchorsWalked} anchors out of reach  ${outOfReach.join(" | ")}`
  );
  check(
    "a room with two doors can be walked between them",
    split === 0,
    `${split} of ${withDoors} rooms could not be crossed  ${stranded.join(" | ")}`
  );

  /**
   * And the key is never behind the door it opens.
   *
   * The vault is the one room a floor can be walked without, which is what
   * makes it lockable; the key is laid in another room. If the generator
   * ever put it in the vault, or in a room only reachable through it, the
   * lock would be unopenable and the floor's richest room lost - and the
   * check that a floor is payable would not notice, because it is payable
   * without the vault by construction.
   */
  let keyInside = 0;
  let keyBehind = 0;
  let lockedFloors = 0;
  for (let seed = 1; seed <= 300; seed++) {
    for (let floor = 1; floor <= L.FLOORS; floor++) {
      const rules = L.floorRules(floor);
      const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      if (!d.vaultId || !d.keyRoomId) continue;
      lockedFloors++;
      if (d.keyRoomId === d.vaultId) {
        keyInside++;
        continue;
      }
      const open = L.reachableWithout(d.rooms, d.startId, d.vaultId);
      const reached = open.has ? open.has(d.keyRoomId) : open.includes(d.keyRoomId);
      if (!reached) keyBehind++;
    }
  }
  check(
    "the floor's key is never inside the vault it opens",
    keyInside === 0,
    `${keyInside} of ${lockedFloors} floors`
  );
  check(
    "nor in a room only reachable through it",
    keyBehind === 0,
    `${keyBehind} of ${lockedFloors} floors`
  );
}

// --- Barring a doorway ------------------------------------------------------
//
// The one thing a player can do to the dungeon itself, and the one that
// could break it. A bar the Warden cannot get round is a hiding place, and
// the whole of what the Warden is for is that there is nowhere to wait -
// so what is checked is not that bars work, it is that they always run
// out of ways to work.
{
  let cutOff = 0;
  let neverRound = 0;
  let bars = 0;
  let roundTrips = 0;
  let longer = 0;
  for (let seed = 1; seed <= 200; seed++) {
    for (const depth of [1, 2, 3]) {
      const rules = L.floorRules(depth);
      const d = L.generateDungeon({ seed: seed * 17 + depth, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      for (const room of d.rooms) {
        for (const to of Object.values(room.links)) {
          if (!to) continue;
          const key = L.barKey(room.id, to);
          const set = new Set([key]);
          bars++;
          /**
           * With this one doorway shut, can the Warden still get to the
           * player from the far side of the floor?
           *
           * Either by walking round - which is the good case and is what
           * makes a bar worth putting up - or, when there is no way round,
           * by having a doorway to break. The one thing that must never
           * happen is neither: a room it can look at and never enter.
           */
          const round = L.pathAround(d.rooms, to, room.id, set);
          if (round) {
            roundTrips++;
            const direct = L.shortestPath(d.rooms, to, room.id);
            // Going round is only worth doing if it is further.
            if (direct && round.length > direct.length) longer++;
            continue;
          }
          neverRound++;
          const breakable = L.barToBreak(d, to, room.id, set);
          if (!breakable) cutOff++;
        }
      }
    }
  }
  check(
    "a barred doorway never cuts the Warden off from anywhere",
    cutOff === 0,
    `${cutOff} of ${bars} doorways left it with no way round and nothing to break`
  );
  check(
    "when there is a way round it takes it, and the way round is longer",
    roundTrips > 0 && longer === roundTrips,
    `${longer} of ${roundTrips} detours were longer than the door`
  );
  check(
    "and the doorways with no way round are a real share of them, so bars can be broken",
    neverRound > 0,
    `${neverRound} of ${bars} doorways have no way round`
  );
  // The edge key is symmetric, or a doorway could be barred from one side
  // and open from the other.
  check(
    "a doorway barred from either side is the same doorway",
    L.barKey("room_2", "room_9") === L.barKey("room_9", "room_2"),
    L.barKey("room_9", "room_2")
  );
  // And the Warden's walk actually honours it.
  {
    const d = L.generateDungeon({ seed: 7, minRooms: 10, maxRooms: 13 });
    const from = d.rooms.find((r) => Object.values(r.links).filter(Boolean).length > 1);
    const shut = Object.values(from.links).find(Boolean);
    const set = new Set([L.barKey(from.id, shut)]);
    let wentThrough = 0;
    for (let i = 0; i < 200; i++) {
      const to = L.nextRoom(d, from.id, shut, true, null, i / 200, set);
      if (to === shut) wentThrough++;
    }
    check(
      "the Warden's own next step never crosses a bar",
      wentThrough === 0,
      `${wentThrough} of 200 steps went through it`
    );
  }
  check(
    "a bar outlasts several of its steps but not a floor",
    L.BAR_S > L.WARDEN_STEP_CALM_S * 3 && L.BAR_S < 90,
    `${L.BAR_S}s against steps of ${L.WARDEN_STEP_ROUSED_S}-${L.WARDEN_STEP_CALM_S}s`
  );
  check(
    "and putting one up is the loudest thing in the game",
    L.BAR_NOISE_S > L.NOISE_HOLD_S && L.BAR_NOISE_S > L.LANTERN_SEEN_HOLD_S,
    `${L.BAR_NOISE_S}s against a sprint's ${L.NOISE_HOLD_S}s and a light's ${L.LANTERN_SEEN_HOLD_S}s`
  );
}

// --- The lantern ------------------------------------------------------------
//
// The second bargain in the game - seeing, or unseen - and three of its
// four numbers only mean anything against the rooms they are used in.
{
  const smallest = Math.min(...L.ROOM_SIZES);
  const largest = Math.max(...L.ROOM_SIZES);
  check(
    "raised, the lantern lights most of an ordinary room but not the largest one",
    L.LANTERN_RANGE_UP > L.ROOM_SIZE_DEFAULT * 0.75 && L.LANTERN_RANGE_UP < largest,
    `${L.LANTERN_RANGE_UP} against rooms ${smallest} to ${largest} across`
  );
  check(
    "lowered, it does not reach the far wall of even the smallest room",
    L.LANTERN_RANGE_DOWN < smallest / 2,
    `${L.LANTERN_RANGE_DOWN} against a half-room of ${smallest / 2}`
  );
  check(
    "and lowering it is a real change rather than a dimmer setting",
    L.LANTERN_INTENSITY_UP > L.LANTERN_INTENSITY_DOWN * 4 &&
      L.LANTERN_RANGE_UP > L.LANTERN_RANGE_DOWN * 2,
    `${L.LANTERN_INTENSITY_DOWN}->${L.LANTERN_INTENSITY_UP} candela, ${L.LANTERN_RANGE_DOWN}->${L.LANTERN_RANGE_UP} units`
  );
  /**
   * A full lantern must not cover a whole run held up.
   *
   * Otherwise the decision is not one: a player raises it on the first
   * floor and never touches it again. A floor is 19 to 22 seconds of
   * walking on its shortest path and three to five minutes actually
   * played, so a run is roughly ten to fifteen minutes - and a hundred and
   * fifty seconds of oil is a fraction of that, refilled at braziers by
   * anyone who wants the light back.
   *
   * The other end matters too: it has to be enough to actually use, or the
   * answer is always "down" and the choice is again not one. Long enough
   * to cross several rooms lit is the bar.
   */
  const crossing = L.ROOM_SIZE_LARGE / L.WALK_SPEED;
  check(
    "a full lantern is worth several rooms of light, and nowhere near a run of it",
    L.LANTERN_FULL_S > crossing * 8 && L.LANTERN_FULL_S < 60 * 8,
    `${L.LANTERN_FULL_S}s, against ${crossing.toFixed(1)}s to cross the largest room`
  );
  check(
    "putting it down does not un-see you at once, and un-sees you sooner than stopping running does",
    L.LANTERN_SEEN_HOLD_S > 0 && L.LANTERN_SEEN_HOLD_S < L.NOISE_HOLD_S,
    `${L.LANTERN_SEEN_HOLD_S}s lit against ${L.NOISE_HOLD_S}s loud`
  );
  /**
   * And a brazier never beats a thing the room put there on purpose.
   *
   * The one interaction verb offers the nearest usable thing, so a fill
   * prompt with a generous reach steals the key from whatever it is
   * standing near. At 2.4 a corner brazier out-reached the memory trial's
   * crystals and the trial could not be played at all - the smoke test
   * read back "Choose this crystal, Fill your lantern, Watch" and the
   * room never cleared. Under `CLOSE_REACH`, which is what a room's own
   * small content is offered within, and far enough that a player does
   * not have to stand in the coals.
   */
  check(
    "a brazier can be filled from without standing in its coals",
    L.LANTERN_FILL_REACH > 1,
    `${L.LANTERN_FILL_REACH} units`
  );
  check(
    "and never out-reaches a thing the room put there on purpose",
    L.LANTERN_FILL_REACH < L.CLOSE_REACH,
    `${L.LANTERN_FILL_REACH} against a room's own reach of ${L.CLOSE_REACH}`
  );
}

// --- The Cutpurse -----------------------------------------------------------
//
// It runs from you holding a gem, which is the Warden's promise in reverse,
// and the two places the promise is knowingly false are an item doing its
// job rather than a bug. All four are asserted here so a change to a
// multiplier says which of them it broke.
{
  const RELIC_SETS = [[], ["boots"], ["lantern", "chart"], ["boots", "charm", "ledger"]];
  const speed = L.CUTPURSE_SPEED;
  let sprintCatches = 0;
  let walkFails = 0;
  let cases = 0;
  for (const relics of RELIC_SETS) {
    const has = (id) => relics.includes(id);
    const pace = L.paceFor(relics, "none");
    cases++;
    if (L.catchesCutpurse(pace, speed)) sprintCatches++;
    // Boots are the documented exception, and are asked about separately.
    if (!L.outwalksCutpurse(pace, speed) || has("boots")) walkFails++;
  }
  check(
    "unhindered, a sprint always catches the Cutpurse",
    sprintCatches === cases,
    `${sprintCatches} of ${cases} relic sets`
  );
  check(
    "and a walk never does, unless you bought the boots for exactly that",
    walkFails === cases,
    `${walkFails} of ${cases} relic sets`
  );
  check(
    "Soft Boots are the exception, and they really are one",
    L.outwalksCutpurse(L.paceFor(["boots"], "none"), speed) &&
      !L.outwalksCutpurse(L.paceFor([], "none"), speed),
    `booted walk ${L.paceFor(["boots"], "none").walk} against ${speed}`
  );
  check(
    "and a Potion of Mire is the other: nothing you have catches it",
    !L.catchesCutpurse(L.paceFor([], "mire"), speed),
    `mired sprint ${L.paceFor([], "mire").dash.toFixed(2)} against ${speed}`
  );
  // The nest is where a theft stops being a punishment, so a floor must
  // always have one, it must never be behind a door that wants a key, and
  // it must never be the room the exit is in.
  let noNest = 0;
  let nestLocked = 0;
  let nestBehindLock = 0;
  let nestIsSetPiece = 0;
  let floors = 0;
  for (let seed = 1; seed <= 300; seed++) {
    for (const depth of [2, 3]) {
      const rules = L.floorRules(depth);
      const d = L.generateDungeon({ seed: seed * 31 + depth, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      floors++;
      const nest = L.nestRoom(d);
      if (!nest) {
        noNest++;
        continue;
      }
      if (nest === d.vaultId) nestLocked++;
      if (d.vaultId) {
        const open = L.reachableWithout(d.rooms, d.startId, d.vaultId);
        const reached = open.has ? open.has(nest) : open.includes(nest);
        if (!reached) nestBehindLock++;
      }
      const room = d.rooms.find((r) => r.id === nest);
      if (["start", "end", "shop", "arena", "memory", "challenge"].includes(room.kind)) nestIsSetPiece++;
    }
  }
  check("every floor deep enough to have a thief has a nest", noNest === 0, `${noNest} of ${floors} floors`);
  check("the nest is never inside the locked vault", nestLocked === 0, `${nestLocked} of ${floors}`);
  check(
    "nor in a room only reachable through it: your own gems are never behind a key",
    nestBehindLock === 0,
    `${nestBehindLock} of ${floors}`
  );
  check(
    "and never in a room that already asks a question of its own",
    nestIsSetPiece === 0,
    `${nestIsSetPiece} of ${floors}`
  );
}

// --- Devices ---------------------------------------------------------------
//
// The satchel's third family is set down on the floor rather than used on
// yourself, so the things that can go wrong with it are arithmetic: an
// appearance shuffle that is no longer a bijection (an item with no look,
// or a look that means nothing), and a snare narrow enough for the thing
// it is meant to catch to step over between two frames.
{
  const families = ["potion", "scroll", "device"];
  const counts = Object.fromEntries(
    families.map((f) => [f, L.ITEM_IDS.filter((id) => L.ITEMS[id].family === f).length])
  );
  const looks = L.appearancesFor(7);
  const unknowns = L.ITEM_IDS.map((id) => looks[id] && looks[id].unknown);
  check(
    "every item has a look, and no two items share one",
    unknowns.every(Boolean) && new Set(unknowns).size === L.ITEM_IDS.length,
    `${new Set(unknowns).size} looks for ${L.ITEM_IDS.length} items`
  );
  // The same seed is the same run down to which bottle is the good one.
  const again = L.appearancesFor(7);
  check(
    "and the shuffle is the seed's, so a replayed seed is the same run",
    L.ITEM_IDS.every((id) => again[id].unknown === looks[id].unknown)
  );
  check(
    "each family has as many items as it has looks to go round",
    counts.device === 3 && counts.potion === 4 && counts.scroll === 5,
    JSON.stringify(counts)
  );
  /**
   * Blessed, plain and cursed: how much of a dungeon is marked.
   *
   * A fifth each is what keeps the marked ones worth reading - a dungeon
   * where half of everything glowed would be one where the glow means
   * nothing - and it is a fifth of *kinds* rather than of objects, so the
   * roll is over twelve and lands where it lands. What is checked is that
   * over many seeds it averages what it says, that no seed comes out with
   * everything charged, and that the run's charges are the seed's, like
   * everything else about a run.
   */
  let blessed = 0;
  let cursed = 0;
  let total = 0;
  let allCharged = 0;
  let nonePlain = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const charges = L.chargesFor(seed);
    const plain = L.ITEM_IDS.filter((id) => charges[id] === "plain").length;
    blessed += L.ITEM_IDS.filter((id) => charges[id] === "blessed").length;
    cursed += L.ITEM_IDS.filter((id) => charges[id] === "cursed").length;
    total += L.ITEM_IDS.length;
    if (plain === 0) nonePlain++;
    if (plain < L.ITEM_IDS.length / 3) allCharged++;
  }
  check(
    "about a fifth of a dungeon's kinds are blessed and a fifth cursed",
    Math.abs(blessed / total - 0.2) < 0.04 && Math.abs(cursed / total - 0.2) < 0.04,
    `${((blessed / total) * 100).toFixed(1)}% blessed, ${((cursed / total) * 100).toFixed(1)}% cursed over ${total} rolls`
  );
  check(
    "and no dungeon comes out with nothing ordinary in it",
    nonePlain === 0,
    `${nonePlain} of 400 seeds had no plain kind at all`
  );
  check(
    "the charges are the seed's, so a replayed seed is the same dungeon",
    L.ITEM_IDS.every((id) => L.chargesFor(11)[id] === L.chargesFor(11)[id]) &&
      JSON.stringify(L.chargesFor(11)) !== JSON.stringify(L.chargesFor(12)),
    ""
  );
  // The two helpers pull in opposite directions on purpose, and the whole
  // point of having two is that neither silently inverts.
  check(
    "a blessing is more of a good thing and less of a bad one",
    L.scaled(10, "blessed") > 10 &&
      L.scaled(10, "cursed") < 10 &&
      L.inverted(10, "blessed") < 10 &&
      L.inverted(10, "cursed") > 10,
    `good ${L.scaled(10, "cursed")}/${L.scaled(10, "blessed")}, bad ${L.inverted(10, "cursed")}/${L.inverted(10, "blessed")}`
  );
  check(
    "and a cursed thing lifted is plain, not blessed in one step",
    L.lifted("cursed") === "plain" && L.lifted("plain") === "blessed" && L.lifted("blessed") === "blessed",
    `${L.lifted("cursed")} / ${L.lifted("plain")}`
  );
  // Nothing a curse does may be nothing: a cursed mire that lasted the
  // same time as a plain one would be a mark on a bottle that means
  // nothing, which is worse than no mark.
  const differs = ["swiftness", "mire", "gloom"].every(
    (id) => L.scaled(10, "cursed") !== 10 && L.inverted(10, "cursed") !== 10
  );
  check("every charge changes the number it touches", differs, "");

  // A snare is set by hand on one spot, and the thing it is meant to catch
  // crosses at most WARDEN_MAX_STEP in a frame. If it were narrow enough to
  // be stepped over, it would fail rarely and look like bad luck.
  check(
    "a snare cannot be stepped over between two frames",
    L.SNARE_RADIUS * 2 > L.WARDEN_MAX_STEP * 4,
    `${L.SNARE_RADIUS * 2} across against a step of at most ${L.WARDEN_MAX_STEP.toFixed(3)}`
  );
  check(
    "a snare holds longer than the floor's own spikes, which cost nothing to walk behind",
    L.SNARE_HOLD_S > L.WARDEN_STAGGER_S,
    `${L.SNARE_HOLD_S}s against ${L.WARDEN_STAGGER_S}s`
  );
  // A ward has to outlast several of its steps or it is a stone that buys
  // one move: the slowest it ever steps is nine seconds, the fastest four.
  check(
    "a ward outlasts several of the Warden's steps",
    L.WARD_S >= L.WARDEN_STEP_CALM_S * 3,
    `${L.WARD_S}s against steps of ${L.WARDEN_STEP_ROUSED_S}-${L.WARDEN_STEP_CALM_S}s`
  );
}

// --- The Warden and the floor's own spikes ---------------------------------
//
// Traps bite it as well as the player, which is a real answer to it and so
// has to be a real answer on every trap room the generator makes rather
// than on the one it was designed against. Two halves: the room has to
// offer the trick at all - somewhere to stand with a patch between you and
// the way in - and, once it has learned, the walk round has to actually
// work rather than mire it in the doorway or march it through anyway.
{
  const patchesOf = (r, gem) =>
    L.trapHazards(r, gem).map(([x, , z]) => ({ x, z, r: L.HAZARD_RADIUS }));
  /** Does the straight line a to b pass within a patch? */
  const lineHitsPatch = (patches, ax, az, bx, bz) => {
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (L.inPatch(patches, ax + (bx - ax) * t, az + (bz - az) * t)) return true;
    }
    return false;
  };

  let noTrick = 0;
  let trapRooms = 0;
  let bitten = 0;
  let walked = 0;
  let stalled = 0;
  for (const size of L.ROOM_SIZES) {
    for (const dir of ["north", "south", "east", "west"]) {
      const r = { id: "r", kind: "trap", seed: 0, grid: { x: 0, z: 0 }, size, shape: "square", links: { [dir]: "a" } };
      const half = size / 2;
      const limit = half - 0.6;
      const [dx, , dz] = L.doorPosition(r, dir);
      // Where the Warden stands the frame it walks in, from Warden.tsx.
      const wx0 = dx * 0.86;
      const wz0 = dz * 0.86;
      for (let seed = 1; seed <= 40; seed++) {
        trapRooms++;
        const gem = L.gemPosition(r, seed);
        const patches = patchesOf(r, gem);
        // A place to stand - anywhere in the room, not only by the gem -
        // that puts a patch between the player and the doorway the Warden
        // comes in by, without standing in one. Swept on a grid rather
        // than on rings around the gem: the first version of this asked
        // only about spots within four units of the reward and called
        // eighty rooms of four hundred and eighty broken, when what was
        // broken was the question. The player may stand where they like.
        let trick = null;
        const span = limit * 2;
        for (let ix = 0; ix <= 24 && !trick; ix++) {
          for (let iz = 0; iz <= 24 && !trick; iz++) {
            const px = -limit + (span * ix) / 24;
            const pz = -limit + (span * iz) / 24;
            if (L.inPatch(patches, px, pz, 0.4)) continue;
            // Standing on the doorstep is not the trick: it has to be a
            // spot with room to have walked to it.
            if (Math.hypot(px - wx0, pz - wz0) < 3) continue;
            if (lineHitsPatch(patches, wx0, wz0, px, pz)) trick = [px, pz];
          }
        }
        if (!trick) {
          noTrick++;
          continue;
        }
        // Having learned, it walks the same approach without being bitten.
        walked++;
        let wx = wx0;
        let wz = wz0;
        const dt = 1 / 60;
        let arrived = false;
        let hit = false;
        for (let step = 0; step < 1200 && !arrived; step++) {
          const gap = Math.hypot(trick[0] - wx, trick[1] - wz);
          if (gap <= L.WARDEN_TOUCH_RADIUS) {
            arrived = true;
            break;
          }
          const h = L.steerAround(wx, wz, trick[0], trick[1], patches, L.WARDEN_HAZARD_BERTH);
          const len = Math.min(
            L.WARDEN_SPEED_ROUSED * dt,
            L.WARDEN_MAX_STEP,
            Math.max(0, gap - L.WARDEN_TOUCH_RADIUS * 0.5)
          );
          wx = Math.max(-limit, Math.min(limit, wx + h.dx * len));
          wz = Math.max(-limit, Math.min(limit, wz + h.dz * len));
          if (L.inPatch(patches, wx, wz)) hit = true;
        }
        if (hit) bitten++;
        if (!arrived) stalled++;
      }
    }
  }
  check(
    "every trap room offers somewhere to stand with spikes between you and the door",
    noTrick === 0,
    `${noTrick} of ${trapRooms} trap rooms had nowhere`
  );
  check(
    "a Warden that has learned walks round the spikes rather than through them",
    bitten === 0,
    `${bitten} of ${walked} approaches took a wound`
  );
  check(
    "and still arrives: going round is not a way of never coming",
    stalled === 0,
    `${stalled} of ${walked} approaches never closed`
  );
  // The other half of the bargain: before it has learned, the same walk
  // does take the wound. A trick nobody can pull off the first time is not
  // a trick, and this is the check that would have caught a berth so wide
  // the straight walk missed the patches by itself.
  let naiveBitten = 0;
  let naiveWalks = 0;
  for (const size of L.ROOM_SIZES) {
    const r = { id: "r", kind: "trap", seed: 0, grid: { x: 0, z: 0 }, size, shape: "square", links: { north: "a" } };
    const half = size / 2;
    const limit = half - 0.6;
    const [dx, , dz] = L.doorPosition(r, "north");
    for (let seed = 1; seed <= 40; seed++) {
      const gem = L.gemPosition(r, seed);
      const patches = patchesOf(r, gem);
      let target = null;
      for (let a = 0; a < 72 && !target; a++) {
        for (const reach of [1.6, 2.4, 3.2]) {
          const px = gem[0] + Math.cos((a / 72) * Math.PI * 2) * reach;
          const pz = gem[2] + Math.sin((a / 72) * Math.PI * 2) * reach;
          if (Math.abs(px) > limit || Math.abs(pz) > limit) continue;
          if (L.inPatch(patches, px, pz, 0.4)) continue;
          if (lineHitsPatch(patches, dx * 0.86, dz * 0.86, px, pz)) {
            target = [px, pz];
            break;
          }
        }
      }
      if (!target) continue;
      naiveWalks++;
      let wx = dx * 0.86;
      let wz = dz * 0.86;
      let hit = false;
      for (let step = 0; step < 1200; step++) {
        const gap = Math.hypot(target[0] - wx, target[1] - wz);
        if (gap <= L.WARDEN_TOUCH_RADIUS) break;
        const len = Math.min(L.WARDEN_SPEED_ROUSED / 60, L.WARDEN_MAX_STEP, Math.max(0, gap - L.WARDEN_TOUCH_RADIUS * 0.5));
        wx += ((target[0] - wx) / gap) * len;
        wz += ((target[1] - wz) / gap) * len;
        if (L.inPatch(patches, wx, wz)) hit = true;
      }
      if (hit) naiveBitten++;
    }
  }
  check(
    "and before it has learned, that same walk takes the wound",
    naiveWalks > 0 && naiveBitten === naiveWalks,
    `${naiveBitten} of ${naiveWalks} straight walks were bitten`
  );
  // Two wounds rout it, and a rout is the last one the floor gets: the
  // trick has to be finite or it is the answer to the Warden rather than an
  // answer on one floor.
  check(
    "two wounds rout it, and the stagger outlasts nothing else that stops it",
    L.WARDEN_WOUNDS_TO_ROUT === 2 && L.WARDEN_STAGGER_S > L.WARDEN_ARRIVAL_GRACE_S,
    `${L.WARDEN_WOUNDS_TO_ROUT} wounds, ${L.WARDEN_STAGGER_S}s reeling`
  );
}

console.log(failures === 0 ? "\nAll layout checks passed." : `\n${failures} layout check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
