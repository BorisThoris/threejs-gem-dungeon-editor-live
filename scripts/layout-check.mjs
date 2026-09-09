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
   export * from "${root}src/game/deeds/catalog";
   export * from "${root}src/game/input/bindings";
   export * from "${root}src/game/rooms/layouts";
   export * from "${root}src/game/props/specs";
   export * from "${root}src/game/rooms/anchors";
   export * from "${root}src/game/rooms/templates";
   export * from "${root}src/game/rooms/kinds";
   export * from "${root}src/game/rooms/biomes";
   export * from "${root}src/game/mobs/body";
   export * from "${root}src/game/heat/coefficient";
   export * from "${root}src/game/cycle/director";
   export * from "${root}src/game/cycle/menace";
   export * from "${root}src/game/lantern/glim";
   export * from "${root}src/game/verbs/gates";
   export * from "${root}src/game/items/afflictions";
   export * from "${root}src/game/relics/offer";
   export * from "${root}src/game/rooms/slots";
   export * from "${root}src/game/deepworks/fragments";
   export * from "${root}src/game/deepworks/placement";
   export * from "${root}src/game/ledger/lessons";
   export * from "${root}src/game/din/tags";
   export * from "${root}src/game/din/carry";
   export * from "${root}src/game/din/emissions";
   export * from "${root}src/game/din/susceptibility";
   export * from "${root}src/game/ladder/rungs";
   export * from "${root}src/game/ladder/awareness";
   export * from "${root}src/game/ladder/caps";
   export * from "${root}src/game/mobs/ambient";
   export * from "${root}src/game/traps/placement";
   export * from "${root}src/game/dungeon/secret";
   export * from "${root}src/game/props/breakable";
   export * from "${root}src/game/mobs/lamplighter";
   export * from "${root}src/game/mobs/harrierRoost";
   export * from "${root}src/game/keeper/posts";
   export * from "${root}src/game/teaching/teacher";
   export * from "${root}src/game/puzzles/anchors";
   export * from "${root}src/game/textures/registry";
   export * from "${root}src/game/rooms/validate";
   export * from "${root}src/game/systems/bearing";
   export * from "${root}src/game/systems/pace";
   export * from "${root}src/game/arena/sweep";
   export * from "${root}src/game/sentry/beam";
   export * from "${root}src/game/sentry/placement";
   export * from "${root}src/game/rooms/Dressing";
   export * from "${root}src/game/rooms/placements";
   export * from "${root}src/ui/hudLines";
   export * from "${root}src/ui/momentBeats";
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
/**
 * The three floors of one run, generated the way a run generates them.
 *
 * `generateDungeon` takes an options object, and two blocks here were
 * calling it as `generateDungeon(seed, floor)` - which lands in the
 * `options.seed ?? Math.random()` branch, so 360 floors that named a seed
 * were 360 random floors, and the block claiming to hold locked rooms
 * across 120 seeds was holding them across whatever it happened to draw.
 * One owner for how a run walks its floors, so no block has to remember
 * the descent's seed derivation again.
 */
const runFloors = (seed, floors = 3) => {
  const out = [];
  let next = seed;
  for (let floor = 1; floor <= floors; floor++) {
    const rules = L.floorRules(floor);
    // `lastFloor` included, because a run's own descent passes it and a
    // helper that walks the floors WITHOUT it is walking floors the game
    // does not build - which is how the staged set piece read as never
    // placed at all.
    const d = L.generateDungeon({
      seed: next,
      minRooms: rules.minRooms,
      maxRooms: rules.maxRooms,
      lastFloor: floor === floors,
    });
    out.push(d);
    next = (d.seed * 7919 + (floor + 1)) >>> 0;
  }
  return out;
};
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

/**
 * How much of a run somebody actually made, and how full those rooms are.
 *
 * The measurement that started this: 373 authored rooms out of 4,572, eight
 * percent, because only two of the twelve kinds a run hands out had a
 * template at all - and a run is mostly the other ten. A room builder, a
 * validator, a slot system and a foreshadowing rule had all shipped, and a
 * player walking a floor met one hand-made room in twelve.
 *
 * The second half is worse and was not measured before: a templated room
 * uses ITS OWN props and nothing else - no seeded arrangement, no biome
 * litter - so a template with four props in it drew a room barer than the
 * generator would have furnished. The authoring pipeline was making rooms
 * emptier.
 */
{
  const KINDS_WITH_ROOMS = new Set();
  let rooms = 0;
  let authored = 0;
  const perKind = new Map();
  for (let seed = 1; seed <= 40; seed++) {
    let next = seed;
    for (let floor = 1; floor <= 3; floor++) {
      const rules = L.floorRules(floor);
      const d = L.generateDungeon({
        seed: next,
        minRooms: rules.minRooms,
        maxRooms: rules.maxRooms,
        lastFloor: floor === 3,
      });
      next = (d.seed * 7919 + (floor + 1)) >>> 0;
      for (const r of d.rooms) {
        rooms++;
        KINDS_WITH_ROOMS.add(r.kind);
        if (r.template) authored++;
        const at = perKind.get(r.kind) ?? { n: 0, made: 0 };
        at.n++;
        if (r.template) at.made++;
        perKind.set(r.kind, at);
      }
    }
  }

  const without = [...KINDS_WITH_ROOMS].filter((k) => L.templatesForKind(k).length === 0);
  check("every kind of room a run hands out has one somebody made", without.length === 0, without.join(", ") || "all twelve");

  const share = authored / rooms;
  check("and a run is about a third hand-made rather than a twelfth",
    share > 0.2 && share < 0.45, `${(share * 100).toFixed(0)}% of ${rooms} rooms`);
  // Per kind, because a share that is right on average and zero for eight
  // kinds is the bug this replaced, and the average would not have caught
  // it.
  const starved = [...perKind].filter(([, v]) => v.made / v.n < 0.15).map(([k, v]) => `${k} ${((v.made / v.n) * 100).toFixed(0)}%`);
  check("and no kind is left out of it", starved.length === 0, starved.join(", ") || "none under 15%");

  /**
   * And the room the player stands in is never barer for having been made.
   *
   * `placementsFor` returns the template's own props where a room has one,
   * so this compares the same room with and without its template. The
   * braziers are in both counts and the point is what stands between them.
   */
  const bare = [];
  for (const t of L.allTemplates()) {
    for (let seed = 1; seed <= 20; seed++) {
      const room = { ...L.roomForTemplate(t, { x: seed % 5, z: seed % 3 }), id: `r${seed}`, seed };
      const made = L.placementsFor(room, seed).length;
      const { template: _drop, ...plain } = room;
      const dressed = L.placementsFor(plain, seed).length;
      if (made < dressed) bare.push(`${t.id} @${seed}: ${made} against ${dressed}`);
    }
  }
  check("a room somebody made is never emptier than the one the generator would have dressed",
    bare.length === 0, [...new Set(bare.map((b) => b.split(" ")[0]))].join(", ") || "none of 20 seeds each");
}

// --- Slots: how many rooms one authored room is ----------------------------
//
// A run is 34 rooms and 23 of them look different, and an authored set piece
// makes that worse rather than better: it is the one room a returning player
// recognises on sight. The shipped mitigation is substitution at placement
// time - the composition is authored, what stands in it is drawn - so the
// hall you have seen before is a hall you have not.
//
// Everything here holds the shipped content to that, because a slot system
// nothing uses is a table written rather than a system built.
{
  const slotted = L.allTemplates().filter((t) => (t.slots ?? []).length > 0);
  check("shipped templates use slots at all", slotted.length > 0, `${slotted.length} of ${L.allTemplates().length}`);

  // The number the whole file exists to make large. One is an authored room
  // with extra ceremony.
  const counts = [];
  let product = 1;
  for (const t of slotted) {
    const per = {};
    for (const p of t.props) if (p.slot) per[p.slot] = (per[p.slot] ?? 0) + 1;
    const n = L.variantsOf(t.slots ?? [], per);
    counts.push(`${t.id} x${n}`);
    product *= n;
  }
  check("every slotted template is more than one room", slotted.every((t) => {
    const per = {};
    for (const p of t.props) if (p.slot) per[p.slot] = (per[p.slot] ?? 0) + 1;
    return L.variantsOf(t.slots ?? [], per) > 1;
  }), counts.join(", "));
  // Against the SLOTTED ones, because a tableau is deliberately one
  // arrangement: it tells a story in four particular props, and a slot
  // that swapped one of them would be substituting a word out of the
  // sentence. What multiplies has to multiply; what is authored to be
  // read the same way every time is allowed to be.
  check("and the rooms authored to vary together are many more rooms than there are of them",
    product >= 8 * slotted.length, `${product} rooms from ${slotted.length} that vary`);

  // All three operations ship. An op the content never uses is a branch
  // nothing has ever run, and this codebase has had enough of those.
  const ops = new Set(L.allTemplates().flatMap((t) => (t.slots ?? []).map((r) => r.op)));
  check("all three substitution operations are used by shipped content", ops.size === 3,
    [...ops].sort().join(", "));

  // Every rule names props that exist, and every placeholder is named by a
  // rule - an unruled placeholder is a prop that silently never varies.
  const dangling = [];
  for (const t of L.allTemplates()) {
    const named = new Set((t.slots ?? []).map((r) => r.slot));
    const used = new Set(t.props.filter((p) => p.slot).map((p) => p.slot));
    for (const slot of named) if (!used.has(slot)) dangling.push(`${t.id}: rule for absent slot ${slot}`);
    for (const slot of used) if (!named.has(slot)) dangling.push(`${t.id}: slot ${slot} has no rule`);
  }
  check("every rule and every placeholder have each other", dangling.length === 0, dangling.join("; ") || "none");

  // The rule the vault check found the hard way: substitution decides what a
  // room LOOKS like and never what it PAYS. The first slotted hall put its
  // chest in a subst beside a statue, and a third of the time a key opened
  // onto a chamber with nothing in it.
  const worth = [];
  for (const t of L.allTemplates()) {
    for (const rule of t.slots ?? []) {
      if (!L.keepsItsWorth(t.props, rule)) worth.push(`${t.id}: ${rule.slot} can change what the room pays`);
    }
  }
  check("no slot decides what a room is worth", worth.length === 0, worth.join("; ") || "none");

  // A tableau tells its story in four particular props. Substituting one
  // is substituting a word out of the sentence, so the two systems are
  // deliberately exclusive.
  const tableaux = L.allTemplates().filter((t) => t.tableau);
  check("a tableau is authored to be read the same way every time",
    tableaux.length > 0 && tableaux.every((t) => !(t.slots ?? []).length),
    `${tableaux.length} tableaux, none of them slotted`);
  /**
   * The one tableau that points FORWARDS, staged on the way to what it
   * describes rather than wherever the generator was digging.
   *
   * It shipped with an `ahead` flag that nothing read for as long as the
   * corpus existed - the same shape of gap as a lesson nothing records or
   * a template nothing registers, and the reason this block exists at all.
   */
  {
    const ahead = L.TABLEAUX.filter((t) => t.ahead);
    check("exactly one tableau in the corpus points forwards", ahead.length === 1,
      ahead.map((t) => t.id).join(", ") || "none");
    const template = L.foreshadowingTemplate();
    check("and a shipped room stages it", !!template, template ? template.id : "nothing composed for it");

    let floors = 0;
    let staged = 0;
    const wrong = [];
    for (let seed = 1; seed <= 120; seed++) {
      const last = runFloors(seed)[2];
      floors++;
      const at = last.rooms.find((r) => r.template === template.id);
      if (!at) continue;
      staged++;
      const path = L.shortestPath(last.rooms, "start", last.endId) ?? [];
      const back = path.length - 1 - path.indexOf(at.id);
      // Where it points: exactly the declared distance before the exit, and
      // the room wears the template's own size and shape rather than
      // whatever it was dug at.
      if (back < L.AHEAD_OF_KEEPER || back > L.AHEAD_OF_KEEPER + L.AHEAD_WINDOW) {
        wrong.push(`seed ${seed}: ${back} doorways back`);
      }
      if (at.size !== template.size || at.shape !== template.shape) wrong.push(`seed ${seed}: ${at.size}/${at.shape}`);
    }
    /**
     * Not every floor, and that is the rule rather than a shortfall: it is
     * staged only where an ordinary chamber sits on the approach, because
     * four props laid over a shop or a trial fight that room's own content.
     * About half the Keeper's floors carry it, which for a set piece is
     * the right frequency anyway - one a player meets every other run is
     * a thing they remember, and one they meet every run is furniture.
     */
    check("it is staged on a good share of the Keeper's floors", staged > floors / 3, `${staged} of ${floors}`);
    check("and always on the approach to the exit, at its own size",
      wrong.length === 0, wrong.slice(0, 3).join("; ") || "none");

    // And never on a floor with no Keeper on it: the same four props two
    // rooms before an ordinary staircase foreshadow nothing.
    let early = 0;
    for (let seed = 1; seed <= 120; seed++) {
      for (const d of runFloors(seed).slice(0, 2)) {
        if (d.rooms.some((r) => r.template === template.id)) early++;
      }
    }
    check("and never staged on a floor the Keeper does not stand on", early === 0, `${early} early`);
  }

  check("and every one of them names a tableau the corpus has",
    tableaux.every((t) => L.TABLEAUX.some((x) => x.id === t.tableau)),
    tableaux.map((t) => t.tableau).join(", "));

  // Placeholders never leave the resolver, positions never move, and the
  // count never changes: everything downstream reads an ordinary prop list
  // and has no idea any of this happened.
  const t0 = slotted[0];
  const one = L.resolveSlots(t0.props, t0.slots, "a");
  check("a resolved room is the authored room with the same props in the same places",
    one.length === t0.props.length &&
    one.every((p, i) => p.x === t0.props[i].x && p.z === t0.props[i].z && p.slot === undefined),
    `${one.length} props`);

  // The same room is the same room every time it is entered. A set piece
  // that reshuffled while the player walked back through it would be worse
  // than no set piece at all.
  const same = L.resolveSlots(t0.props, t0.slots, "a").map((p) => p.kind).join(",");
  check("the same room resolves the same way twice", one.map((p) => p.kind).join(",") === same, same);

  // And a shuffle preserves the composition exactly - it moves things, it
  // does not replace them.
  for (const t of L.allTemplates()) {
    for (const rule of (t.slots ?? []).filter((r) => r.op === "shuffle")) {
      const before = t.props.filter((p) => p.slot === rule.slot).map((p) => p.kind).sort().join(",");
      const drawn = new Set();
      let kept = 0;
      for (let seed = 0; seed < 40; seed++) {
        const after = L.resolveSlots(t.props, [rule], `s${seed}`)
          .filter((p, i) => t.props[i].slot === rule.slot)
          .map((p) => p.kind);
        drawn.add(after.join(","));
        if ([...after].sort().join(",") === before) kept++;
      }
      check(`the ${rule.slot} shuffle in ${t.id} keeps the composition it was given`, kept === 40, before);
      check(`and moves it around rather than leaving it`, drawn.size > 1, `${drawn.size} arrangements`);
    }
  }

  // What the player actually gets. Rooms are furnished from their own
  // identity, so the same template placed twice on a floor is two rooms -
  // and the run's three start rooms, which share an id and a grid square,
  // are three rooms rather than one drawn three times.
  const drawn = new Map();
  let authored = 0;
  for (let seed = 1; seed <= 120; seed++) {
    for (const dungeon of runFloors(seed)) {
      for (const room of dungeon.rooms) {
        if (!room.template) continue;
        authored++;
        const props = L.authoredProps(room);
        const key = props.map((p) => `${p.kind}@${p.x.toFixed(2)},${p.z.toFixed(2)}`).join("|");
        drawn.set(room.template, (drawn.get(room.template) ?? new Set()).add(key));
      }
    }
  }
  check("the generator places authored rooms often enough to measure", authored > 100, `${authored} placed`);

  /**
   * And no more often than it did with two templates.
   *
   * The rule `AUTHORED_CHANCE` states, held to the number rather than to
   * good intentions: the draw used to be `pick(rng, [undefined, ...authored])`,
   * which makes the chance `1 - 1/(n+1)` and climbs with the library. Two
   * templates gave a third; six would have given five rooms in six. A
   * library that grows has to mean MORE DIFFERENT set pieces and never
   * more set pieces, or authoring rooms makes the "23 of 34 look
   * different" measurement worse the more of them there are.
   */
  {
    let couldBe = 0;
    let were = 0;
    for (let seed = 1; seed <= 120; seed++) {
      for (const d of runFloors(seed)) {
        for (const room of d.rooms) {
          // Only rooms of a kind that HAS a template to draw: the others
          // were never in the running and would drag the share down.
          if (!L.templatesForKind(room.kind).length) continue;
          couldBe++;
          if (room.template) were++;
        }
      }
    }
    const share = were / Math.max(1, couldBe);
    check("and no oftener than the rule says, however many templates ship",
      Math.abs(share - L.AUTHORED_CHANCE) < 0.06,
      `${(share * 100).toFixed(0)}% of ${couldBe} eligible rooms against a declared ${(L.AUTHORED_CHANCE * 100).toFixed(0)}%`);
  }
  const ruled = new Set(slotted.map((t) => t.id));
  for (const [id, set] of drawn) {
    // Eight orientations is what an unslotted room gets. Every slotted one
    // has to beat that by its own rules, which is the multiplication seen
    // in the rooms rather than in the maths - and a template without rules
    // is held to nothing here, because it promised nothing.
    if (!ruled.has(id)) continue;
    check(`the ${id} the player walks into is many different rooms`, set.size >= 16,
      `${set.size} distinct arrangements`);
  }
  const revisit = (id) => {
    const room = runFloors(id).flatMap((d) => d.rooms).find((r) => r.template);
    return JSON.stringify(L.authoredProps(room));
  };
  check("and walking back into one finds it exactly as it was",
    revisit(7) === revisit(7) && revisit(11) === revisit(11), "two runs re-entered");
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
  // The hidden room is extra to the floor, not of it: it is not on the
  // map, not linked, and not a room until a blast opens the wall - so it
  // is outside the room count and outside what a walk from the start can
  // reach. The run 8 checks below hold it to being exactly that.
  const sealed = d.secretId ? 1 : 0;
  const floorRooms = d.rooms.length - sealed;
  if (floorRooms < rules.minRooms || floorRooms > rules.maxRooms) bad++;
  const depth = L.bfsDepth(d.rooms, d.startId);
  if (!depth.has(d.endId) || depth.size !== floorRooms) bad++;
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
    if (open.size !== floorRooms - 1) bad++;
  }
  const kinds = d.rooms.map((r) => r.kind);
  if (kinds.filter((k) => k === "end").length !== 1 || kinds.filter((k) => k === "start").length !== 1) bad++;
  /**
   * The exit may be a room somebody made, but only one made FOR an exit.
   *
   * This used to read "the exit never has a template", which was true only
   * because no template for the end kind existed - the rule it looked like
   * it was stating was never the rule. What actually matters is that a
   * template decides its room's size and shape, so a composition drawn for
   * a fourteen-metre hole in the wall must never end up being the stair
   * hall. The generator has both paths: a fresh end room draws from the end
   * kind's own templates, and a room CONVERTED to the exit drops whatever
   * it was carrying.
   */
  const endRoom = d.rooms.find((r) => r.id === d.endId);
  if (endRoom.template && !L.templatesForKind("end").some((t) => t.id === endRoom.template)) bad++;
  if (d.rooms.some((r) => r.template)) authored++;
}
check("500 dungeons across every floor size: connected, legal, and a vault that never blocks the exit", bad === 0, `${bad} bad`);

/**
 * The trader's five offers, and the one that could never be reached.
 *
 * The prompt takes the nearest thing that CAN be used, so two offers at one
 * point are one offer - and the oil and the blessing were written at the
 * same offset from the counter for as long as both have existed. Nothing
 * caught it because the geometry lived inside the shop's component, where
 * only the component could see it. It lives in `rooms/anchors.ts` now, and
 * this is what holds it.
 */
{
  const IDS = ["life", "naming", "blessing", "bomb", "oil"];
  const sizes = [14, 16, 18];
  const problems = [];
  for (const size of sizes) {
    for (const shape of ["square", "circle"]) {
      for (let g = 0; g < 8; g++) {
        const room = {
          id: "shop", kind: "shop", seed: 1, grid: { x: g % 3, z: Math.floor(g / 3) },
          size, shape, links: { north: "a", south: "b", east: "c", west: "d" },
        };
        const offers = L.shopOffers(room);
        const where = `${size}m ${shape} @${room.grid.x},${room.grid.z}`;
        if (offers.length !== IDS.length) problems.push(`${where}: ${offers.length} offers`);
        for (let i = 0; i < offers.length; i++) {
          for (let j = 0; j < i; j++) {
            const apart = Math.hypot(offers[i].x - offers[j].x, offers[i].z - offers[j].z);
            if (apart < 1.2) problems.push(`${where}: ${offers[i].id} and ${offers[j].id} are ${apart.toFixed(2)}m apart`);
          }
        }
        /**
         * And none of them stands where walking to the counter would pick
         * it up instead. The player comes in from the room, so "at the
         * counter" is two metres out along the line to the middle.
         */
        const counter = offers.find((o) => o.id === "life");
        const len = Math.hypot(counter.x, counter.z) || 1;
        const stand = { x: counter.x - (counter.x / len) * 2, z: counter.z - (counter.z / len) * 2 };
        const nearest = offers
          .map((o) => ({ id: o.id, d: Math.hypot(o.x - stand.x, o.z - stand.z), reach: o.reach ?? L.INTERACT_RADIUS }))
          .filter((o) => o.d <= o.reach)
          .sort((a, b) => a.d - b.d)[0];
        if (!nearest || nearest.id !== "life") {
          problems.push(`${where}: standing at the counter offers ${nearest ? nearest.id : "nothing"}`);
        }
      }
    }
  }
  check("every one of the trader's offers has a place of its own", problems.length === 0, problems.slice(0, 3).join("; ") || `${IDS.length} offers over ${sizes.length * 2 * 8} shops`);
  check("and the goods are picked up closer than the counter is walked to", L.NEAR_REACH < L.INTERACT_RADIUS, `${L.NEAR_REACH}m against ${L.INTERACT_RADIUS}m`);
}
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

// --- The first room of a floor ---------------------------------------------
//
// A floor begins with a breath: you arrive, you read the room, you pick a
// doorway. Nothing that hunts or bites belongs in that room while it is
// still the first thing you are looking at. Some of this was already true
// by accident - a watcher only stands in three kinds of room and none of
// them is a start, a trap needs a kind that a start is not, a roost skips
// it - and being true by accident is how it stops being true. Held to it
// here, over every floor of a hundred seeds, so the day someone adds
// "start" to a list of kinds this says so.
{
  let watched = 0;
  let trapped = 0;
  let roosted = 0;
  let perched = 0;
  let floors = 0;
  for (let seed = 1; seed <= 100; seed++) {
    for (const floor of [1, 2, 3]) {
      const rules = L.floorRules(floor);
      const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      const start = d.rooms.find((r) => r.id === d.startId);
      if (!start) continue;
      floors++;
      if (L.sentryFor(start, d.seed, floor)) watched++;
      if (L.trapsFor(start, d.seed, d.endId).length) trapped++;
      if (L.harrierRoostFor(d, floor) === start.id) roosted++;
      if (L.mothRoom(d) === start.id) perched++;
    }
  }
  check("every floor has a first room to check", floors >= 100, `${floors} floors over 100 seeds`);
  check("no watcher stands in the room a floor starts you in", watched === 0, `${watched} of ${floors}`);
  check("no trap is laid in the room a floor starts you in", trapped === 0, `${trapped} of ${floors}`);
  check("nothing roosts in the room a floor starts you in", roosted === 0, `${roosted} of ${floors}`);
  check("nothing perches in the room a floor starts you in", perched === 0, `${perched} of ${floors}`);
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
  /**
   * The teacher listens from a table rather than a literal, so a grep for
   * `bus.on("name")` cannot see it. Its rows are listeners: read them off
   * the module instead of pretending the events they carry are unheard -
   * and read them, rather than exempting the whole question, so a lesson
   * pointed at an event nobody emits is still caught below.
   */
  const tabled = new Set(L.LESSONS.map((l) => l.event));
  const used = (verb, name) => tree.includes(`bus.${verb}("${name}"`) || (verb === "on" && tabled.has(name));

  check("the bus declares the events this check knows about", declared.length > 20, `${declared.length} declared`);
  const unheard = declared.filter((e) => used("emit", e) && !used("on", e));
  check("every event something emits is listened to somewhere", unheard.length === 0, unheard.join(", ") || "none unheard");
  const unspoken = declared.filter((e) => used("on", e) && !used("emit", e));
  check("every event something listens for is emitted somewhere", unspoken.length === 0, unspoken.join(", ") || "none unspoken");
  const orphans = declared.filter((e) => !used("emit", e) && !used("on", e));
  check("the bus declares no event that neither end uses", orphans.length === 0, orphans.join(", ") || "none orphaned");
}

// The lowest the alarm can go is one fact, and it has been written out by
// hand three times now.
//
// `floorRules(floor).startingAlarm` is only half of it: a delver's
// `alarmBonus` is part of the floor too, so a Tomb Robber whose floor
// starts at two must never be calmed to one. Cycle work found the first
// two copies and made `alarmFloorFor`; the shrine walked in and wrote a
// third, which would quietly have handed that delver an easier run every
// time it was knelt at. Grep for the arithmetic rather than for a symbol:
// the fault is the expression, wherever it is spelled out.
{
  const src = execFileSync(
    "grep",
    ["-rn", "-E", "startingAlarm", join(root, "src")],
    { encoding: "utf8" }
  )
    .trim()
    .split("\n");
  // The definition in world.ts and the one owner in run.ts are the only
  // places the number itself is allowed to appear. Comments are prose.
  const offenders = src.filter((line) => {
    const [file, , ...rest] = line.split(":");
    const text = rest.join(":").trim();
    if (text.startsWith("*") || text.startsWith("//")) return false;
    if (file.endsWith("src/game/world.ts")) return false;
    if (text.includes("alarmFloorOn") || text.includes("alarmFloorFor")) return false;
    // The one owner, spelled out once.
    return !/floorRules\(floor\)\.startingAlarm \+ DELVERS\[delver\]\.alarmBonus/.test(text);
  });
  check(
    "the lowest the alarm can go is asked in one place",
    offenders.length === 0,
    offenders.map((l) => l.replace(root + "/", "")).join(" | ") || "one owner"
  );
}

// The ground a room is made of, and what running on it costs.
//
// Eight biomes were a paint job until this: a flooded cistern and a bed of
// moss furnished differently, lit differently, and played identically.
// Each one now scales how long a sprint keeps the Warden coming, which is
// the only cost running has - so the numbers have to be a real spread, and
// the room has to say which it is before the player commits to the dash.
{
  const carries = L.BIOMES.map((id) => L.BIOME[id].carry);
  check(
    "every biome says how far a run through it carries",
    carries.every((c) => typeof c === "number" && c > 0),
    L.BIOMES.map((id) => `${id}:${L.BIOME[id].carry}`).join(" ")
  );
  check(
    "and every biome names the floor the player is standing on",
    L.BIOMES.every((id) => typeof L.BIOME[id].ground === "string" && L.BIOME[id].ground.length > 3),
    L.BIOMES.map((id) => L.BIOME[id].ground).join(", ")
  );
  // Not "they differ": two biomes a tenth apart differ and play the same.
  // The quietest has to be worth crossing at a run and the loudest has to
  // be worth walking, which is a factor of two or it is decoration.
  const low = Math.min(...carries);
  const high = Math.max(...carries);
  check(
    "the quietest ground is worth a run and the loudest is worth a walk",
    high / low >= 2,
    `${low} to ${high}, a factor of ${(high / low).toFixed(2)}`
  );
  check(
    "bare stone is the figure the others are read against",
    L.BIOME.hewn.carry === 1,
    String(L.BIOME.hewn.carry)
  );
  // A kind whose biomes all carry the same amount asks the player nothing.
  // Only the set pieces are allowed to be uniform - their rooms are about
  // the thing in them - and the ordinary rooms a run is mostly made of
  // must offer a choice.
  const flat = ["normal", "trap", "treasure"].filter((kind) => {
    const cs = L.BIOMES_FOR[kind].map((id) => L.BIOME[id].carry);
    return Math.max(...cs) / Math.min(...cs) < 1.4;
  });
  check(
    "the rooms a run is mostly made of are not all the same underfoot",
    flat.length === 0,
    flat.join(", ") || "normal, trap and treasure all vary"
  );
}

// How much of a run is furnished the same way as the rest of it.
//
// The plan's own last outstanding content note: "it is still the same
// props in the same quadrants, and that is what runs out next." Size,
// shape, stone, litter and now sound all vary per room - but what a room
// is *furnished with* comes from its kind's arrangements, and the kinds a
// player walks through most had between two and four each.
//
// The signature is what a player would describe: which props are in the
// room, and how many of each. Not where they are to the centimetre, which
// varies with the room's size and would report every room as unique while
// the player walks through the same three rooms over and over.
{
  // Normalised by the room's own half-width, so the same arrangement built
  // at fourteen metres and at twenty-eight reads as what it is - the same
  // room again, bigger - rather than as two different ones. Rounded to a
  // fifth of the room, which is about "which part of it".
  // Which props stand in which part of the room, in ninths - near, mid and
  // far by the doorway the player comes in through, left, centre and
  // right across it. That is the complaint as it was written: the same
  // props in the same quadrants. A signature finer than this reports two
  // rooms as different because a chair is rotated differently, which is
  // not something anybody walking through them would say.
  const look = (room, seed) => {
    const third = room.size / 6;
    const band = (v) => (v < -third ? "-" : v > third ? "+" : "0");
    return (
      `${room.kind}|` +
      L.placementsFor(room, seed, {})
        .map((p) => `${p.kind}@${band(p.x)}${band(p.z)}`)
        .sort()
        .join(" ")
    );
  };
  let rooms = 0;
  let distinct = 0;
  const perKind = {};
  for (let run = 1; run <= 40; run++) {
    const seen = new Set();
    let seed = run;
    for (let floor = 1; floor <= 3; floor++) {
      const rules = L.floorRules(floor);
      const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      for (const room of d.rooms) {
        const sig = look(room, d.seed);
        rooms++;
        if (!seen.has(sig)) { seen.add(sig); distinct++; }
        (perKind[room.kind] ??= new Set()).add(sig);
      }
      seed = (d.seed * 7919 + floor + 1) >>> 0;
    }
  }
  const share = distinct / rooms;
  check(
    "most of the rooms a run walks through are furnished unlike the rest of it",
    share >= 0.75,
    `${distinct} of ${rooms} rooms over 40 runs are the first of their look - ${(share * 100).toFixed(1)}%`
  );
  const thin = Object.entries(perKind)
    .filter(([, set]) => set.size < 4)
    .map(([kind, set]) => `${kind}:${set.size}`);
  check(
    "and every kind of room has at least four ways of being furnished",
    thin.length === 0,
    thin.join(" ") ||
      Object.entries(perKind).map(([k, v]) => `${k}:${v.size}`).join(" ")
  );
}

// The memory trial can be watched from where it is started.
//
// "The pattern matching one is difficult, there's pillars that block your
// vision." The trial's first arrangement stands three pillars on the near
// quadrant - between the lectern, which is the fourth near spot, and the
// four crystals on the far ones - and the biome's litter can land on the
// same spots. A player who begins the trial and then cannot see two of
// the four crystals it lights is not being tested on memory. Nothing had
// asked whether the line from the lectern to each pedestal was clear,
// because reachability was the question the furniture had always been
// held to, and a pillar you can walk round is still a pillar you cannot
// see through.
{
  const EYE_CLEAR = 0.9;
  const hidden = [];
  let lines = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
    for (const room of d.rooms) {
      if (room.kind !== "memory") continue;
      const anchors = L.memoryAnchors(room);
      const lectern = anchors[4];
      const props = L.placementsFor(room, d.seed).filter((q) => L.PROP_SPECS[q.kind].solid && L.PROP_SPECS[q.kind].radius > 0.2);
      for (const p of anchors.slice(0, 4)) {
        lines++;
        const dx = p[0] - lectern[0];
        const dz = p[2] - lectern[2];
        const len = Math.hypot(dx, dz) || 1;
        const blocker = props.find((q) => {
          // Distance from the prop to the lectern->pedestal segment.
          const t = Math.max(0, Math.min(1, ((q.x - lectern[0]) * dx + (q.z - lectern[2]) * dz) / (len * len)));
          const cx = lectern[0] + dx * t;
          const cz = lectern[2] + dz * t;
          return Math.hypot(q.x - cx, q.z - cz) < L.PROP_SPECS[q.kind].radius + EYE_CLEAR;
        });
        if (blocker && hidden.length < 4) hidden.push(`${room.id}@${d.seed} ${blocker.kind}`);
        if (blocker) hidden.blocked = (hidden.blocked ?? 0) + 1;
      }
    }
  }
  check(
    "every crystal of the memory trial can be seen from the lectern",
    (hidden.blocked ?? 0) === 0,
    `${hidden.blocked ?? 0} of ${lines} sightlines blocked  ${hidden.join(" | ")}`
  );
}

// Secrets, and the thing that opens them.
//
// Every floor hides one room the map does not show, behind a wall with a
// crack in it, and the only way through the crack is a blast. The secret
// is an edge on the room that hides it - `room.secret = { dir, to }` - and
// deliberately not a link: links are what the walls cut doorways for, what
// the minimap draws and what the Warden walks, and a secret is none of
// those until it is opened. These hold the generator to that, and hold
// the bomb to reaching the wall it is set against and no further than the
// room it is set in.
{
  let floors = 0;
  let hidden = 0;
  let sealed = 0;
  let cracked = 0;
  let hostHasNoDoorThere = 0;
  const bad = [];
  for (let seed = 1; seed <= 200; seed++) {
    const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
    floors++;
    if (!d.secretId) continue;
    const secret = d.rooms.find((r) => r.id === d.secretId);
    if (!secret) { bad.push(`${seed}: secretId names no room`); continue; }
    hidden++;
    if (Object.values(secret.links).every((v) => !v)) sealed++;
    const hosts = d.rooms.filter((r) => r.secret && r.secret.to === d.secretId);
    if (hosts.length === 1) {
      cracked++;
      if (!hosts[0].links[hosts[0].secret.dir]) hostHasNoDoorThere++;
    } else if (bad.length < 3) bad.push(`${seed}: ${hosts.length} rooms crack onto the secret`);
  }
  check("every floor hides a secret room", hidden === floors, `${hidden} of ${floors} floors  ${bad.join(" | ")}`);
  // `hidden > 0` on each, or a generator that makes no secrets at all
  // passes three of the four by having nothing to get wrong.
  check("the secret room has no doorway - it is reached through its crack or not at all", hidden > 0 && sealed === hidden, `${sealed} of ${hidden}`);
  check("exactly one room cracks onto it", hidden > 0 && cracked === hidden, `${cracked} of ${hidden}  ${bad.join(" | ")}`);
  check("and the crack is in a wall with no doorway in it", cracked > 0 && hostHasNoDoorThere === cracked, `${hostHasNoDoorThere} of ${cracked}`);

  // The bomb itself.
  const bomb = L.ITEMS.bomb;
  check("a bomb is an item, of its own family", !!bomb && bomb.family === "bomb", bomb ? bomb.family : "no bomb");
  let rolled = 0;
  for (let i = 0; i < 400; i++) if (L.rollItem(7, `probe:${i}`, 1 + (i % 3)) === "bomb") rolled++;
  check("and the floor hands them out, but not often", rolled > 8 && rolled < 120, `${rolled} of 400 rolls`);
  // Set down at arm's length from a wall, the blast has to reach the wall;
  // set down in the middle of the smallest room, it must not reach the
  // room's own doorways, or every bomb is a skeleton key.
  check(
    "the blast reaches the wall it is set against and no further than the room",
    L.BOMB_RADIUS >= L.CLOSE_REACH && L.BOMB_RADIUS < L.ROOM_SIZE_SMALL / 2,
    `radius ${L.BOMB_RADIUS}, reach ${L.CLOSE_REACH}, smallest room half ${L.ROOM_SIZE_SMALL / 2}`
  );
  check("a fuse is long enough to walk away from and short enough to matter", L.BOMB_FUSE_S >= 2 && L.BOMB_FUSE_S <= 4, `${L.BOMB_FUSE_S}s`);
}

// Bodies: the floor treats what lives on it as it treats the player.
//
// The Warden and the Cutpurse each built their own list of what to walk
// round and what bites them, and neither list had a table in it: both
// walked through the furniture the player has to walk round. Every mob
// now declares a body - ground, flying or ghost - and one owner,
// `mobs/body.ts`, answers two questions from it: what this body steers
// round, and what bites it. Spikes and snares bite a ground body and
// nothing else; solid props are in the way of anything that is not a
// ghost; a ghost passes through all of it. These hold the table and the
// two functions to that, and hold a ground body to still being able to
// get from a doorway to the gem past the furniture it now respects.
{
  const bodies = L.BODIES;
  const MOBS = ["warden", "cutpurse"];
  check("every mob declares a body", !!bodies && MOBS.every((m) => ["ground", "flying", "ghost"].includes(bodies[m])), bodies ? JSON.stringify(bodies) : "no BODIES");
  check("the Warden and the Cutpurse walk on the ground", !!bodies && bodies.warden === "ground" && bodies.cutpurse === "ground", bodies ? `${bodies.warden}, ${bodies.cutpurse}` : "-");

  const d = L.generateDungeon({ seed: 4242, minRooms: 8, maxRooms: 16 });
  const room = d.rooms.find((r) => r.kind === "trap") ?? d.rooms[2];
  const gem = L.gemFor(room, d.seed);
  const spikes = room.kind === "trap" && gem ? L.trapHazards(room, gem) : [];
  const solid = L.placementsFor(room, d.seed).filter((q) => L.PROP_SPECS[q.kind].solid);
  const walls = (body) => (L.obstaclesFor ? L.obstaclesFor(body, room, d.seed, []) : null);
  const bites = (body) => (L.bitesFor ? L.bitesFor(body, room, d.seed, []) : null);
  const g = walls("ground"), f = walls("flying"), gh = walls("ghost");
  check(
    "a ground body walks round every solid prop, and a ghost round nothing",
    !!g && !!gh && g.length >= solid.length && gh.length === 0,
    g ? `ground ${g.length} of ${solid.length} solid props, ghost ${gh.length}` : "no obstaclesFor"
  );
  // Since run 17 a flier clears the low furniture and steers round only
  // what reaches its height, so its list is the walker's list filtered,
  // never something the walker does not have.
  const tallOnly = !!f && !!g && f.every((o) => g.some((w) => w.x === o.x && w.z === o.z)) && f.length === solid.filter((q) => !L.clearedInFlight(L.PROP_SPECS[q.kind])).length;
  check("a flying body walks round the tall furniture and over the low, and nothing a walker does not", tallOnly, f ? `${f.length} of ${solid.length} solid props reach flight height` : "-");
  const bg = bites("ground"), bf = bites("flying"), bgh = bites("ghost");
  check(
    "spikes bite a ground body and nothing that flies or passes through",
    !!bg && !!bf && !!bgh && bg.length >= spikes.length && bf.length === 0 && bgh.length === 0,
    bg ? `ground ${bg.length} of ${spikes.length} patches, flying ${bf.length}, ghost ${bgh.length}` : "no bitesFor"
  );

  // Respecting the furniture must not strand it: from every doorway of
  // every room, a ground body its own size across can still reach the gem.
  if (L.obstaclesFor) {
    let stranded = 0, walked = 0;
    const examples = [];
    for (let seed = 1; seed <= 60; seed++) {
      const dd = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
      for (const r of dd.rooms) {
        const target = L.gemFor(r, dd.seed);
        if (!target) continue;
        const half = r.size / 2;
        const obs = L.obstaclesFor("ground", r, dd.seed, []);
        // The obstacle list already carries the body's width - `obstaclesFor`
        // is the one owner of it, and each patch names its own berth - so
        // the fill adds nothing, and clamps 0.6 inside the walls as the
        // Warden does. A fill at any other width tests a creature that does
        // not exist.
        const WALL = 0.6;
        const blocked = (x, z) => Math.abs(x) > half - WALL || Math.abs(z) > half - WALL || obs.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + (o.berth ?? 0));
        for (const dir of Object.keys(r.links)) {
          walked++;
          // Where travel puts a body that came in this way - a position,
          // not a triple.
          const start = L.spawnAfterTravel ? L.spawnAfterTravel(r, dir)?.position : null;
          if (!start) { walked--; continue; }
          // Coarse flood fill on a half-metre grid.
          const step = 0.5, seen = new Set(), queue = [[start[0], start[2]]];
          const k = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
          seen.add(k(start[0], start[2]));
          let found = false;
          while (queue.length && !found) {
            const [x, z] = queue.shift();
            if (Math.hypot(x - target[0], z - target[2]) < 1.2) { found = true; break; }
            for (const [dx, dz] of [[step,0],[-step,0],[0,step],[0,-step]]) {
              const nx = x + dx, nz = z + dz, kk = k(nx, nz);
              if (seen.has(kk) || blocked(nx, nz)) continue;
              seen.add(kk); queue.push([nx, nz]);
            }
          }
          if (!found) { stranded++; if (examples.length < 3) examples.push(`${r.kind} ${r.id}@${dd.seed} from ${dir}`); }
        }
      }
    }
    check("and respecting the furniture never strands a ground body short of the gem", stranded === 0, `${stranded} of ${walked} doorways  ${examples.join(" | ")}`);
  }
}

// One owner of what bites a creature. The Cutpurse once kept its own
// list of the snares with its own copy of their radius - `r: 1.0` while
// the catalogue said SNARE_RADIUS - and the two would have drifted the
// first time either moved. Neither creature may build a bite list now.
{
  const creatures = ["src/game/warden/Warden.tsx", "src/game/thief/Cutpurse.tsx", "src/game/mobs/Rats.tsx", "src/game/mobs/Moth.tsx", "src/game/mobs/Bats.tsx"];
  const offenders = creatures.filter((f) => {
    const s = readFileSync(join(root, f), "utf8");
    return /snaresIn|SNARE_RADIUS|trapHazards|r:\s*1\.0\b/.test(s);
  });
  check("no creature builds its own list of what bites it", offenders.length === 0, offenders.join(", ") || "Warden and Cutpurse read mobs/body.ts");
}

// --- The floor's patience -----------------------------------------------------
//
// Run 10: every floor puts up with the player for so long, and then
// something wakes that has no room, no alarm and no lure - a ghost body,
// through walls and spikes and wards, faster than a walk and slower than a
// dash, and it does not leave. These hold the numbers to the shape of the
// promise: a floor is finishable at a walk inside its patience, the warning
// comes before the end, a walk cannot get away and a dash can, a bomb holds
// it for a real length of time, and the floor's rules read it as a ghost.
{
  const V = L.REAPER_SPEED;

  /**
   * THE COEFFICIENT - one number, three inputs, replacing the floor timer.
   *
   * `FLOOR_PATIENCE_S = 300` is gone, and with it the shape it had: a
   * single number falling at a single rate with one event at the bottom of
   * it. These hold the replacement to being the thing the plan asked for
   * rather than a countdown with extra arithmetic.
   */
  check("heat is a pure function of dwell, greed and depth", L.heatFrom(60, 0, 0) === 1 && L.heatFrom(0, 2, 0) === 1);
  check("and nothing about it is negative", L.heatFrom(-100, -5, -2) === 0);
  check(
    "depth compounds rather than adding: the same minute costs more the deeper you are",
    L.heatFrom(60, 0, 2) > L.heatFrom(60, 0, 1) && L.heatFrom(60, 0, 1) > L.heatFrom(60, 0, 0),
    `${L.heatFrom(60, 0, 0)} / ${L.heatFrom(60, 0, 1).toFixed(3)} / ${L.heatFrom(60, 0, 2).toFixed(3)}`
  );
  check("and it compounds at the rate the source it came from uses", Math.abs(L.DEPTH_BASE - 1.15) < 1e-9, `${L.DEPTH_BASE}`);
  check(
    "greed is felt but is never the whole of it: taking nothing is not the correct line",
    L.ALARM_WEIGHT > 0 && L.ALARM_WEIGHT < L.DWELL_WEIGHT,
    `${L.ALARM_WEIGHT} against ${L.DWELL_WEIGHT}`
  );

  /**
   * Five bands, named and never counted, and the purchases underneath
   * them. The whole point of an integer threshold is that pressure arrives
   * as an EVENT - so the ladder has to actually have rungs on it.
   */
  check("the floor's heat has five names and no numbers on screen", L.BANDS.length === 5 && L.BANDS.every((b) => typeof b.name === "string" && b.name.length > 0));
  check("and they only ever get worse", L.BANDS.every((b, i) => i === 0 || b.at > L.BANDS[i - 1].at), L.BANDS.map((b) => b.at).join(" < "));
  check("the last band is what wakes the thing that does not leave", L.REAPER_AT === L.BANDS[L.BANDS.length - 1].at);
  check("heat buys four things before that, at four prices", L.PURCHASES.length === 4 && L.PURCHASES.every((p) => p.at > 0 && p.at < L.REAPER_AT));
  check("and every one of them is cheaper than the last is dear", L.PURCHASES.every((p, i) => i === 0 || p.at > L.PURCHASES[i - 1].at), L.PURCHASES.map((p) => `${p.id}:${p.at}`).join(" "));
  check("and every one says a line rather than nudging a stat", L.PURCHASES.every((p) => typeof p.says === "string" && p.says.length > 8));
  check(
    "nothing is bought on a floor the player has just walked onto",
    L.affordable(L.heatFrom(0, 0, 0)).length === 0,
    L.affordable(L.heatFrom(0, 0, 0)).join(", ") || "nothing"
  );
  check("and the floor's own arithmetic delivers them in order", JSON.stringify(L.affordable(6)) === JSON.stringify(["cutpurse", "bats", "ceiling", "harrier"]), JSON.stringify(L.affordable(6)));
  check("a band is named for every heat a floor can reach", [0, 1, 3, 5, 7, 9, 40].every((h) => typeof L.bandName(h) === "string" && L.bandName(h).length > 0));

  /**
   * The promise the old constant carried, restated against the function:
   * a floor is finishable at a walk before it stops putting up with you.
   *
   * Measured at the WORST case the game can produce - the deepest floor,
   * at the highest alarm - because that is the one the promise has to
   * survive, and because compounding means the shallow case is no longer
   * evidence about the deep one.
   */
  const deepest = L.secondsTo(L.REAPER_AT, L.ALARM_MAX, L.FLOORS - 1);
  const easiest = L.secondsTo(L.REAPER_AT, 0, 0);
  check("a quiet first floor is minutes, not moments", easiest >= 180 && easiest <= 900, `${easiest.toFixed(0)}s`);
  check("and the deepest floor at full alarm is still a real span", deepest >= 100, `${deepest.toFixed(0)}s`);
  check("but a great deal shorter than the shallowest, which is the compounding doing its job", deepest < easiest / 2, `${deepest.toFixed(0)}s against ${easiest.toFixed(0)}s`);

  check("the one that wakes is faster than a walk and slower than a dash", V > L.WALK_SPEED && V < L.DASH_SPEED, `${V} against walk ${L.WALK_SPEED}, dash ${L.DASH_SPEED}`);
  check("and faster than the Warden at its most roused - it is the bigger threat", V > L.WARDEN_SPEED_ROUSED, `${V} against ${L.WARDEN_SPEED_ROUSED}`);
  check("a blast holds it for longer than its own fuse, so setting one under it is worth the walk", L.REAPER_STALL_S > L.BOMB_FUSE_S, `${L.REAPER_STALL_S}s against a ${L.BOMB_FUSE_S}s fuse`);
  check("it is a ghost to the floor", L.BODIES?.reaper === "ghost", String(L.BODIES?.reaper));
  if (L.obstaclesFor && L.bitesFor) {
    const d = L.generateDungeon({ seed: 77, minRooms: 8, maxRooms: 16 });
    const trap = d.rooms.find((r) => r.kind === "trap") ?? d.rooms[1];
    check("so nothing on the floor is in its way and nothing bites it", L.obstaclesFor("ghost", trap, d.seed, []).length === 0 && L.bitesFor("ghost", trap, d.seed, []).length === 0);
  }

  // A floor at a walk: the longest shortest path from the start to the exit
  // over 200 seeds, in rooms, times a generous crossing per room, must fit
  // inside the worst case above with room to open a chest or two. This is
  // the promise "you can always finish if you do not linger" as a number.
  let longest = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const rules = L.floorRules((seed % L.FLOORS) + 1);
    const d = L.generateDungeon({ seed, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
    const path = L.shortestPath(d.rooms, d.startId, d.endId) ?? [];
    longest = Math.max(longest, path.length);
  }
  const CROSS_S = (L.ROOM_SIZE_LARGE ?? 24) / L.WALK_SPEED + 3;
  check(
    "the longest floor can be walked start to exit inside the worst heat the game can make",
    longest * CROSS_S < deepest,
    `${longest} rooms at ${CROSS_S.toFixed(1)}s each = ${(longest * CROSS_S).toFixed(0)}s of ${deepest.toFixed(0)}s`
  );

  /**
   * One owner of the numbers. The coefficient names them and everything
   * else reads - the same rule the deleted constants had, moved to where
   * the arithmetic went.
   */
  const owners = ["src/game/state/run.ts", "src/ui/Hud.tsx", "src/ui/hudLines.ts", "src/game/systems/Audio.tsx", "src/game/heat/HeatDriver.tsx", "src/game/reaper/Reaper.tsx"]
    .filter((f) => { try { return /(DWELL_WEIGHT|ALARM_WEIGHT|DEPTH_BASE|REAPER_AT)\s*=\s*[\d.]/.test(readFileSync(join(root, f), "utf8")); } catch { return false; } });
  check("and only the coefficient spells the floor's own pressure out", owners.length === 0, owners.join(", ") || "one owner");
}

// --- Floors that are alive ----------------------------------------------------
//
// Run 11: three ambient creatures, none a threat by itself, each with a
// body in the table and each touching a system the player already
// reasons about. Rats scatter from footsteps and spring snares; a moth
// comes to a raised lantern and holds the light in the Warden's eye; bats
// burst from a roost when you dash beneath them and the noise carries
// twice as far. These hold where they are placed, how many, and that the
// numbers make each one a tell rather than a nuisance.
{
  const B = L.BODIES ?? {};
  check("rats walk, moths and bats fly", B.rat === "ground" && B.moth === "flying" && B.bat === "flying", JSON.stringify({ rat: B.rat, moth: B.moth, bat: B.bat }));
  check("a startled roost carries a dash further than the ground alone", (L.BATS_NOISE_FACTOR ?? 0) > 1 && (L.BATS_ROUSED_S ?? 0) > 0, `factor ${L.BATS_NOISE_FACTOR}, roused ${L.BATS_ROUSED_S}s`);
  check("a moth on the lantern holds the light longer than the lantern itself does", (L.MOTH_HOLD_S ?? 0) > (L.LANTERN_SEEN_HOLD_S ?? Infinity), `${L.MOTH_HOLD_S}s against ${L.LANTERN_SEEN_HOLD_S}s`);
  check("a rat is slower than a walk - a thing you can chase - and flees before you are on it", (L.RAT_SPEED ?? 99) < L.WALK_SPEED && (L.RAT_FLEE_RADIUS ?? 0) > L.CLOSE_REACH, `speed ${L.RAT_SPEED}, flees at ${L.RAT_FLEE_RADIUS}`);

  if (L.ratsFor && L.roostFor && L.mothRoom) {
    const NEVER = new Set(["start", "end", "shop", "library", "memory", "challenge", "secret"]);
    let rooms = 0, withRats = 0, tooMany = 0, wrongKind = 0, inProp = 0, floors = 0, withRoost = 0, withMoth = 0, badMoth = 0, badRoost = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
      floors++;
      const moth = L.mothRoom(d);
      if (moth) { withMoth++; if (moth === d.startId || moth === d.endId) badMoth++; }
      let roosts = 0;
      for (const r of d.rooms) {
        rooms++;
        const rats = L.ratsFor(r, d.seed);
        if (rats.length) withRats++;
        if (rats.length > 3) tooMany++;
        if (rats.length && NEVER.has(r.kind)) wrongKind++;
        const solid = L.placementsFor(r, d.seed).filter((p) => L.PROP_SPECS[p.kind].solid);
        for (const rat of rats) if (solid.some((p) => Math.hypot(rat.x - p.x, rat.z - p.z) < L.PROP_SPECS[p.kind].radius)) inProp++;
        const roost = L.roostFor(r, d.seed);
        if (roost) { roosts++; if (r.id === d.startId || r.id === d.endId) badRoost++; }
      }
      if (roosts) withRoost++;
    }
    check("rats live where the floor says and nowhere a puzzle is being played", wrongKind === 0 && tooMany === 0, `${wrongKind} in the wrong kind, ${tooMany} rooms over three, ${withRats} of ${rooms} rooms with rats`);
    check("and a rat's hole is never inside the furniture", inProp === 0, `${inProp} of ${rooms} rooms`);
    check("most floors have somewhere the rats live", withRats / rooms > 0.15, `${((withRats / rooms) * 100).toFixed(0)}% of rooms`);
    check("most floors have a moth, and never in the start or the exit", withMoth / floors >= 0.6 && badMoth === 0, `${withMoth} of ${floors} floors, ${badMoth} misplaced`);
    check("and most have a roost, likewise", withRoost / floors >= 0.6 && badRoost === 0, `${withRoost} of ${floors} floors, ${badRoost} misplaced`);
  } else {
    check("the floor knows where its rats, moth and bats are", false, "no ratsFor/roostFor/mothRoom");
  }
}

// --- The floor's own traps ------------------------------------------------------
//
// Run 12: a dart plate a stride inside a doorway, a pit that gives way
// once, a grate that drops behind you. Each declares which bodies spring
// it and which it hurts in the body table's terms, and each is placed by
// one owner. These hold the placement rules, the numbers, and that a room
// with a pit in it is still a room you can cross.
{
  const T = L.TRAPS;
  check("every trap says who springs it and who it hurts, in the body table's words", !!T && ["darts", "pit", "grate"].every((k) => T[k] && T[k].springs.every((b) => ["ground", "flying", "ghost"].includes(b))), T ? JSON.stringify(T) : "no TRAPS");
  check("a ghost springs nothing and is hurt by nothing", !!T && Object.values(T).every((t) => !t.springs.includes("ghost") && !t.hurts.includes("ghost")));
  check("darts fly over a rat and through a ghost: they hurt what has feet or wings", !!T && T.darts.hurts.includes("ground") && T.darts.hurts.includes("flying"));
  check("a dart plate re-arms after its volley, not during it", L.DART_REARM_S > L.DART_FLIGHT_S, `${L.DART_REARM_S}s against ${L.DART_FLIGHT_S}s`);
  check("a grate the player did not make holds for less than a bar they did", L.GRATE_HOLD_S > 0 && L.GRATE_HOLD_S < L.BAR_S, `${L.GRATE_HOLD_S}s against ${L.BAR_S}s`);
  if (L.trapsFor) {
    const NEVER = new Set(["start", "end", "shop", "library", "memory", "challenge", "secret"]);
    let rooms = 0, withTraps = 0, wrongKind = 0, tooMany = 0, badDarts = 0, badGrate = 0, pitInLane = 0, pitOnGem = 0, pitInProp = 0, pits = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
      for (const r of d.rooms) {
        rooms++;
        const traps = L.trapsFor(r, d.seed, d.endId);
        if (traps.length) withTraps++;
        if (traps.length > 2) tooMany++;
        if (traps.length && NEVER.has(r.kind)) wrongKind++;
        const solid = L.placementsFor(r, d.seed).filter((p) => L.PROP_SPECS[p.kind].solid);
        const gem = L.gemFor(r, d.seed);
        for (const t of traps) {
          if (t.kind === "darts" && (!t.dir || !r.links[t.dir])) badDarts++;
          if (t.kind === "grate" && (!t.dir || !r.links[t.dir] || r.links[t.dir] === d.endId)) badGrate++;
          if (t.kind === "pit") {
            pits++;
            const half = r.size / 2;
            for (const dir of Object.keys(r.links)) {
              const [dx, , dz] = L.doorPosition(r, dir);
              const alongX = Math.abs(dx) > Math.abs(dz);
              const inLane = alongX ? Math.abs(t.z) < L.LANE_HALF_WIDTH && Math.sign(t.x) === Math.sign(dx) : Math.abs(t.x) < L.LANE_HALF_WIDTH && Math.sign(t.z) === Math.sign(dz);
              if (inLane) { pitInLane++; break; }
            }
            if (gem && Math.hypot(t.x - gem[0], t.z - gem[2]) < L.HAZARD_RADIUS + L.PIT_RADIUS) pitOnGem++;
            if (solid.some((p) => Math.hypot(t.x - p.x, t.z - p.z) < L.PROP_SPECS[p.kind].radius + L.PIT_RADIUS)) pitInProp++;
            if (Math.abs(t.x) > half - 1 || Math.abs(t.z) > half - 1) pitInProp++;
          }
        }
      }
    }
    check("traps are where the floor says and never where a puzzle is played", wrongKind === 0 && tooMany === 0, `${wrongKind} in the wrong kind, ${tooMany} rooms over two, ${withTraps} of ${rooms} rooms trapped`);
    check("a dart plate guards a doorway that exists, and a grate one that is not the exit's", badDarts === 0 && badGrate === 0, `${badDarts} plates, ${badGrate} grates misplaced`);
    check("a pit is never in a lane, on the gem, or under the furniture", pitInLane === 0 && pitOnGem === 0 && pitInProp === 0, `${pitInLane} in a lane, ${pitOnGem} on a gem, ${pitInProp} in a prop, of ${pits} pits`);
    check("about half the rooms that can be trapped are", withTraps / rooms > 0.2, `${((withTraps / rooms) * 100).toFixed(0)}% of rooms`);
  } else {
    check("the floor knows where its traps are", false, "no trapsFor");
  }
}

// --- Secrets, deeper ----------------------------------------------------------------
//
// Run 13: the room behind the cracked wall is worth the bomb every time -
// a hoard, a reliquary or a shrine, by the seed, from one owner - the
// shop sells one bomb a floor, and a thin wall breathes. These hold the
// flavours to a fair spread and each to what it promises, and the two
// numbers to their meaning.
{
  check("a bomb costs more than a life's worth of nothing and less than the exit", L.BOMB_PRICE >= 1 && L.BOMB_PRICE < L.tollForFloor(1), `${L.BOMB_PRICE} gems against a toll of ${L.tollForFloor(1)}`);
  check("a draft reaches past arm's length and not to the middle of a small room", L.DRAFT_REACH > L.CLOSE_REACH && L.DRAFT_REACH < L.ROOM_SIZE_SMALL / 2, `${L.DRAFT_REACH} against reach ${L.CLOSE_REACH}, half a small room ${L.ROOM_SIZE_SMALL / 2}`);
  if (L.secretFlavour) {
    const counts = { hoard: 0, reliquary: 0, shrine: 0 };
    let floors = 0, thinHoards = 0, hoards = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
      const f = L.secretFlavour(d);
      if (!f) continue;
      floors++;
      counts[f]++;
      if (f === "hoard") {
        hoards++;
        const room = d.rooms.find((r) => r.id === d.secretId);
        const chests = L.placementsFor(room, d.seed, { asVault: true }).filter((p) => p.kind === "chest").length;
        if (chests < 1) thinHoards++;
      }
    }
    check("the wall hides each of the three about as often", floors > 0 && Object.values(counts).every((n) => n / floors >= 0.2), `${JSON.stringify(counts)} of ${floors}`);
    check("and a hoard has a chest in it nearly every time", hoards > 0 && thinHoards / hoards < 0.1, `${thinHoards} of ${hoards} hoards with no chest`);
  } else {
    check("the wall knows what it hides", false, "no secretFlavour");
  }
}

// --- Breakables --------------------------------------------------------------------
//
// Run 14: barrels, crates and urns burst in a blast, now and then with a
// gem in the wreck, and one between the bomb and the player takes the
// blast for them. These hold the rules to what they say: everything that
// breaks was solid, the spill is a real chance and not a certainty, the
// shield is a line and not a radius, and a burst prop is out of every
// body's way.
{
  const B = L.BREAKABLE;
  check("everything that breaks was solid, so breaking it changes what a body walks round", !!B && [...B].every((k) => L.PROP_SPECS[k]?.solid), B ? [...B].join(", ") : "no BREAKABLE");
  check("a wreck has a gem in it sometimes, and not usually", L.SPILL_CHANCE > 0.1 && L.SPILL_CHANCE < 0.5, `${L.SPILL_CHANCE}`);
  if (L.spillFor) {
    let spills = 0;
    for (let i = 0; i < 2000; i++) if (L.spillFor(7, `room_${i % 9}:barrel@${(i * 0.7).toFixed(1)},${(i * 0.3).toFixed(1)}`)) spills++;
    check("and the seed decides which, at about the chance it says", Math.abs(spills / 2000 - L.SPILL_CHANCE) < 0.05, `${spills} of 2000`);
  }
  if (L.shielded) {
    const between = L.shielded({ x: 0, z: 0 }, { x: 4, z: 0 }, [{ kind: "barrel", x: 2, z: 0.2 }]);
    const beside = L.shielded({ x: 0, z: 0 }, { x: 4, z: 0 }, [{ kind: "barrel", x: 2, z: 1.5 }]);
    const behind = L.shielded({ x: 0, z: 0 }, { x: 4, z: 0 }, [{ kind: "barrel", x: 5, z: 0 }]);
    const notBreakable = L.shielded({ x: 0, z: 0 }, { x: 4, z: 0 }, [{ kind: "pillar", x: 2, z: 0 }]);
    check("a barrel on the line between the bomb and the player shields them; one beside it, behind them, or a pillar does not", !!between && !beside && !behind && !notBreakable, JSON.stringify({ between: !!between, beside: !!beside, behind: !!behind, pillar: !!notBreakable }));
  }
  if (L.obstaclesFor && L.breakKey) {
    const d = L.generateDungeon({ seed: 21, minRooms: 8, maxRooms: 16 });
    const room = d.rooms.find((r) => L.placementsFor(r, d.seed).some((p) => L.BREAKABLE.has(p.kind)));
    if (room) {
      const target = L.placementsFor(room, d.seed).find((p) => L.BREAKABLE.has(p.kind));
      const before = L.obstaclesFor("ground", room, d.seed, []).length;
      const after = L.obstaclesFor("ground", room, d.seed, [], [L.breakKey(room, target)]).length;
      check("a burst barrel is out of a ground body's way", after === before - 1, `${before} then ${after}`);
    } else {
      check("a burst barrel is out of a ground body's way", false, "no room with a breakable on seed 21");
    }
  }
}

// --- The map that lies ---------------------------------------------------------------
//
// Run 15: nothing marks the map; the player marks it. A key and a pad
// button mark the room they are in, the wall with a room behind it
// breathes, and a thin wall lets through what is behind it. These hold
// the key to being a real, bound, labelled action the README names, and
// the through-wall cadence to a rate a player can hear as a thing behind
// the wall rather than a loop.
{
  const has = L.ACTIONS?.includes("mark");
  check("marking the map is an action, with a default key and a label", !!has && L.DEFAULT_BINDINGS?.mark?.length > 0 && !!L.ACTION_LABEL?.mark, has ? `${L.DEFAULT_BINDINGS.mark} - ${L.ACTION_LABEL.mark}` : "no mark action");
  const readme = readFileSync(join(root, "README.md"), "utf8");
  check("and the README's controls name it", /mark the room/i.test(readme) && /d-pad up/i.test(readme));
  check("a thin wall speaks slower than a breath and often enough to be learned", L.WALL_SOUND_EVERY_S > 1 && L.WALL_SOUND_EVERY_S < 45, `${L.WALL_SOUND_EVERY_S}s`);
  const captions = readFileSync(join(root, "src/ui/Captions.tsx"), "utf8");
  const audio = readFileSync(join(root, "src/game/systems/audio.ts"), "utf8");
  check("every flavour behind a wall has a caption and a sound", ["hoard", "reliquary", "shrine"].every((f) => new RegExp(`"${f}"`).test(captions) || /flavour ===/.test(captions)) && /throughWall/.test(audio) && /hoard|reliquary/.test(audio));
}

// --- A helper that costs something ---------------------------------------------------
//
// Run 16: the lamplighter wisp. It is out exactly while the Warden can see
// the player's light - it *is* that light, and its price is not a second
// rule - drifts ahead toward the hidden room, else the exit, and flares
// the braziers it passes. These hold its body to a ghost, its pace to
// under a walk so it can be followed and never drags, and the one owner
// of where it leads to naming the right room, through a real doorway on
// the shortest path, on every floor.
{
  check("the wisp is a ghost: it passes everything and nothing bites it", L.BODIES?.wisp === "ghost", `${L.BODIES?.wisp}`);
  check("it drifts slower than a walk, so it can be followed and cannot drag", L.WISP_SPEED > 0 && L.WISP_SPEED < L.WALK_SPEED, `${L.WISP_SPEED} against ${L.WALK_SPEED}`);
  check("it waits within a room's width and lights what it passes, not the room", L.WISP_LEAD > L.WISP_FLARE_REACH && L.WISP_LEAD < L.ROOM_SIZE_SMALL && L.WISP_FLARE_REACH > 1, `lead ${L.WISP_LEAD}, flare ${L.WISP_FLARE_REACH}`);
  if (L.wispTargetFor) {
    let floors = 0, wrongGoal = 0, badDoor = 0, offPath = 0, wrongAfter = 0, hostSpot = 0, hosts = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
      floors++;
      const host = d.rooms.find((r) => r.secret && !r.links[r.secret.dir]);
      const t = L.wispTargetFor(d, d.startId);
      const goal = host?.id ?? d.endId;
      if (!t || t.roomId !== goal) { wrongGoal++; continue; }
      if (goal !== d.startId) {
        const start = d.rooms.find((r) => r.id === d.startId);
        if (!t.via || !start.links[t.via]) { badDoor++; continue; }
        const path = L.shortestPath(d.rooms, d.startId, goal) ?? [];
        if (path[1] !== start.links[t.via]) offPath++;
      }
      if (host) {
        hosts++;
        const inHost = L.wispTargetFor(d, host.id);
        const spot = L.crackSpot(host);
        if (!inHost || inHost.via !== null || !spot || Math.hypot(inHost.x - spot[0], inHost.z - spot[2]) > 0.01) hostSpot++;
        // Open the wall the way the store does - new links both ways - and it leads to the exit instead.
        const { dir, to } = host.secret;
        const opened = { ...d, rooms: d.rooms.map((r) => r.id === host.id ? { ...r, links: { ...r.links, [dir]: to } } : r.id === to ? { ...r, links: { ...r.links, [L.OPPOSITE[dir]]: host.id } } : r) };
        const after = L.wispTargetFor(opened, d.startId);
        if (!after || after.roomId !== d.endId) wrongAfter++;
      }
    }
    check("from the start it leads to the room behind the crack, else the exit, on every floor", floors > 0 && wrongGoal === 0, `${wrongGoal} of ${floors} floors named the wrong room`);
    check("through a doorway the room really has, the first step of the shortest path", badDoor === 0 && offPath === 0, `${badDoor} not a link, ${offPath} off the path, of ${floors}`);
    check("in the host room it heads for the crack itself", hosts > 0 && hostSpot === 0, `${hostSpot} of ${hosts} hosts`);
    check("and once the wall is open it leads to the exit instead", hosts > 0 && wrongAfter === 0, `${wrongAfter} of ${hosts}`);
  } else {
    check("the wisp knows where it is going", false, "no wispTargetFor");
  }
  const bra = readFileSync(join(root, "src/game/props/Braziers.tsx"), "utf8");
  check("the braziers read where the wisp is and flare for it, not the other way round", /wispAt/.test(bra) && /WISP_FLARE_REACH/.test(bra) && !/wispAt/.test(readFileSync(join(root, "src/game/state/run.ts"), "utf8")));
  /**
   * The readout's words live in `hudLines.ts` now, not in the component.
   * These checks are about what the game tells the player, so they read
   * both: the module that decides what each line says, and the component
   * that draws them.
   */
  const hud =
    readFileSync(join(root, "src/ui/Hud.tsx"), "utf8") +
    readFileSync(join(root, "src/ui/hudLines.ts"), "utf8");
  const cap = readFileSync(join(root, "src/ui/Captions.tsx"), "utf8");
  check("the HUD and the captions say so when it is out", /a wisp/.test(hud) && /wispCame/.test(cap) && /wispLeft/.test(cap));
}

// --- A second threat with a different body ------------------------------------------
//
// Run 17: the Harrier flies. These hold the body table to what "flying"
// now means on the floor - over the low furniture, round the tall, bitten
// by nothing - hold the Harrier's numbers to a thing that can be dashed
// from but not walked from and downed for long enough to matter, and ask
// the one owner of where it roosts and comes in on every floor.
{
  check("the Harrier is a flying body", L.BODIES?.harrier === "flying", `${L.BODIES?.harrier}`);
  check("faster than a walk, slower than a dash: a dash is the loud way out", L.HARRIER_SPEED > L.WALK_SPEED && L.HARRIER_SPEED < L.DASH_SPEED, `${L.HARRIER_SPEED} between ${L.WALK_SPEED} and ${L.DASH_SPEED}`);
  check("never further in one frame than its own reach", L.HARRIER_MAX_STEP <= L.HARRIER_TOUCH_RADIUS, `${L.HARRIER_MAX_STEP} against ${L.HARRIER_TOUCH_RADIUS}`);
  check("downed long enough to walk it to the spikes and back", L.HARRIER_DOWN_S * L.WALK_SPEED >= 2 * (L.CLOSE_REACH + L.BOMB_RADIUS), `${L.HARRIER_DOWN_S}s at ${L.WALK_SPEED} m/s`);
  check("it sleeps through the first floor and wakes before the Warden hunts", L.HARRIER_FROM_FLOOR >= 2 && L.HARRIER_ALARM_LEVEL >= 1 && L.HARRIER_ALARM_LEVEL <= L.ALARM_HUNTS_AT, `floor ${L.HARRIER_FROM_FLOOR}, alarm ${L.HARRIER_ALARM_LEVEL}`);
  const specs = Object.entries(L.PROP_SPECS).filter(([, s]) => s.solid && !s.authored);
  const tall = specs.filter(([, s]) => !L.clearedInFlight(s)).map(([k]) => k);
  const low = specs.filter(([, s]) => L.clearedInFlight(s)).map(([k]) => k);
  check("a flier clears some of the furniture and not all of it", tall.length > 0 && low.length > 0, `round ${tall.join(", ")}; over ${low.join(", ")}`);
  if (L.harrierRoostFor && L.harrierEntryFor) {
    let floors = 0, none = 0, badRoost = 0, badEntry = 0, notSubset = 0, bitten = 0, floorOne = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
      floors++;
      if (L.harrierRoostFor(d, 1) !== null) floorOne++;
      const roost = L.harrierRoostFor(d, 2);
      if (!roost) { none++; continue; }
      const r = d.rooms.find((x) => x.id === roost);
      if (!r || roost === d.startId || roost === d.endId || roost === d.secretId || r.kind === "shop") badRoost++;
      for (const room of d.rooms) {
        if (room.id === d.secretId) continue;
        const via = L.harrierEntryFor(d, roost, room.id);
        if (room.id === roost) { if (via !== null) badEntry++; continue; }
        const path = L.shortestPath(d.rooms, room.id, roost) ?? [];
        if (!via || room.links[via] !== path[1]) badEntry++;
        const ground = L.obstaclesFor("ground", room, d.seed, []);
        const flying = L.obstaclesFor("flying", room, d.seed, []);
        if (!flying.every((f) => ground.some((g) => g.x === f.x && g.z === f.z))) notSubset++;
        if (L.bitesFor("flying", room, d.seed, []).length > 0) bitten++;
      }
    }
    check("every floor from the second down has a roost, and the first has none", floors > 0 && none === 0 && floorOne === 0, `${none} without, ${floorOne} on floor one, of ${floors}`);
    check("the roost is never the start, the exit, the shop or the hidden room", badRoost === 0, `${badRoost} of ${floors}`);
    check("from every room it comes in by the first doorway of the shortest path to its roost", badEntry === 0, `${badEntry} wrong doorways`);
    check("what a flier steers round is some of what a walker does, and nothing bites it", notSubset === 0 && bitten === 0, `${notSubset} rooms with extra obstacles, ${bitten} rooms that bite a flier`);
  } else {
    check("the Harrier knows where it roosts", false, "no harrierRoostFor");
  }
  // The readout's words are in `hudLines.ts`; the component only draws them.
  const hud =
    readFileSync(join(root, "src/ui/Hud.tsx"), "utf8") +
    readFileSync(join(root, "src/ui/hudLines.ts"), "utf8");
  const cap = readFileSync(join(root, "src/ui/Captions.tsx"), "utf8");
  check("the HUD names where it roosts and what downs it, and the captions say the rest", /roosts here/.test(hud) && /a blast downs it/.test(hud) && /harrierWoke/.test(cap) && /harrierSlain/.test(cap));
}

// --- The Keeper --------------------------------------------------------------------
//
// Run 18: the last stairs are kept. These hold the Keeper to a body in the
// table, its reach to inside a blast's radius so a bomb can be set
// outside it and still be in its room, its kneel to long enough to walk
// to the door and pay, its posts to every doorway into the exit on its
// floor and none anywhere else - and a shop, which is where the bomb
// comes from, on every floor it could be needed.
{
  check("the Keeper is in the body table", L.BODIES?.keeper === "ground", `${L.BODIES?.keeper}`);
  check("its reach is inside a blast's radius", L.KEEPER_REACH < L.BOMB_RADIUS && L.KEEPER_REACH > L.CLOSE_REACH * 0.8, `${L.KEEPER_REACH} against ${L.BOMB_RADIUS}`);
  check("it kneels long enough to walk in from outside its reach, pay and go", L.KEEPER_STALL_S * L.WALK_SPEED >= 2 * (L.BOMB_RADIUS + L.CLOSE_REACH) + 4, `${L.KEEPER_STALL_S}s at ${L.WALK_SPEED} m/s`);
  check("it keeps the last floor", L.KEEPER_FLOOR === L.FLOORS, `${L.KEEPER_FLOOR} of ${L.FLOORS}`);
  if (L.keeperPostsFor) {
    let floors = 0, none = 0, bad = 0, above = 0, noShop = 0, multi = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const d = L.generateDungeon({ seed, minRooms: 8, maxRooms: 16 });
      floors++;
      const posts = L.keeperPostsFor(d, L.KEEPER_FLOOR);
      if (posts.length === 0) none++;
      if (posts.length > 1) multi++;
      for (const p of posts) {
        const r = d.rooms.find((x) => x.id === p.roomId);
        if (!r || r.links[p.dir] !== d.endId) bad++;
      }
      const doors = d.rooms.reduce((n, r) => n + Object.values(r.links).filter((v) => v === d.endId).length, 0);
      if (posts.length !== doors) bad++;
      if (L.keeperPostsFor(d, 1).length > 0 || L.keeperPostsFor(d, L.KEEPER_FLOOR - 1).length > 0) above++;
      if (!d.rooms.some((r) => r.kind === "shop")) noShop++;
    }
    check("on its floor it stands at every doorway into the exit, and at no other", floors > 0 && none === 0 && bad === 0, `${none} floors unkept, ${bad} bad posts, ${multi} floors with more than one door in`);
    check("and on no floor above it", above === 0, `${above} of ${floors}`);
    check("a shop, and so a bomb, on every floor", noShop === 0, `${noShop} floors without`);
  } else {
    check("the Keeper knows where it stands", false, "no keeperPostsFor");
  }
  const door = readFileSync(join(root, "src/game/interact/DoorTrigger.tsx"), "utf8");
  const run = readFileSync(join(root, "src/game/state/run.ts"), "utf8");
  check("the door and the walk both ask the store whether it holds", /keeperHolds/.test(door) && /keeperHolds\(s\)/.test(run) && /stallKeeper/.test(run.split("detonate:")[1] ?? ""));
  const hud =
    readFileSync(join(root, "src/ui/Hud.tsx"), "utf8") +
    readFileSync(join(root, "src/ui/hudLines.ts"), "utf8");
  check("the HUD says what makes it kneel", /a blast makes it kneel/.test(hud));
}

// --- Deeds for the arc ---------------------------------------------------------------
//
// Run 19: five deeds for the ten loops, and a floor that says how much
// of its patience was left when it was left. The count checks above
// re-count; these hold the new ones to being about the arc, and the
// Last Breath window to under the Reaper's warning, so it is only earned
// by a player who heard the floor tire and stayed.
{
  const arc = ["throughwall", "bombed", "lastbreath", "spiked", "slipped"];
  check("the arc's five deeds exist, named, with a line each", arc.every((id) => L.DEED_IDS.includes(id) && L.DEEDS[id]?.name && L.DEEDS[id]?.blurb), arc.filter((id) => !L.DEED_IDS.includes(id)).join(", ") || "all five");
  check("Last Breath is the floor's own last band, so it is only earned by staying through it", L.REAPER_AT === L.BANDS[L.BANDS.length - 1].at);
  const events = readFileSync(join(root, "src/game/events.ts"), "utf8");
  const watch = readFileSync(join(root, "src/game/deeds/watch.ts"), "utf8");
  check("the floor says how hot it had got, and the watcher reads it rather than counting", /floorDescended: \{ floor: number; heat: number \}/.test(events) && /heat >= REAPER_AT/.test(watch) && !/floorEnteredAt/.test(watch));
  const summary = readFileSync(join(root, "src/ui/RunSummary.tsx"), "utf8");
  check("the run summary names the deeds this run earned", /earnedThisRun/.test(summary) && /summary-deeds/.test(summary));
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
    const floors = runFloors(seed);
    for (let floor = 1; floor <= 3; floor++) {
      const d = floors[floor - 1];
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

  /**
   * The doorways a room has - or, for a hidden room, the one it will have
   * once its host's wall is opened. It has no link until then, and a route
   * that starts from its links starts nowhere.
   */
  const doorsOf = (d, room) => {
    const doors = ["north", "south", "east", "west"].filter((dir) => room.links[dir]);
    const host = d.rooms.find((r) => r.secret?.to === room.id);
    if (host) doors.push(L.OPPOSITE[host.secret.dir]);
    return doors;
  };
  const routeToGem = (room, seed, doors = Object.keys(room.links)) => {
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
    for (const dir of doors) {
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
      const r = routeToGem(room, d.seed, doorsOf(d, room));
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

// --- The store page ---------------------------------------------------------
//
// `steam/STORE.md` is the copy for a page nobody can edit from inside the
// game, and it makes claims with numbers in them. Those numbers are in
// world.ts, and a store page that says three floors while the game ships
// four is the kind of mistake that is embarrassing in public and invisible
// in a diff.
{
  const store = readFileSync(join(root, "steam/STORE.md"), "utf8");
  /**
   * The page is prose, so its numbers are words.
   *
   * Matching them means turning the game's numbers into the same words -
   * and this list has to cover every number the page could ever want, or
   * the check silently compares against `undefined` and passes on
   * anything. The first version of it ran off the end of its own array
   * and reported a page that says "Ten deeds" as not saying ten deeds.
   */
  const WORDS = [
    "zero", "one", "two", "three", "four", "five", "six",
    "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
  ];
  const word = (n) => WORDS[n] ?? String(n);
  /** Said in words or in digits; the page may phrase it either way. */
  const says = (n, noun) =>
    new RegExp(`\\b(${word(n)}|${n}) ${noun}`, "i").test(store);

  const tolls = Array.from({ length: L.FLOORS }, (_, i) => L.tollForFloor(i + 1));
  check("the store page says the right number of floors", says(L.FLOORS, "floors"), `${L.FLOORS} floors`);
  check(
    "and the right tolls, in order",
    new RegExp(tolls.map(word).join(", then "), "i").test(store) ||
      store.includes(tolls.join(", then ")),
    tolls.join(", then ")
  );
  check(
    "and the right number of item kinds and delvers",
    says(L.ITEM_IDS.length, "kinds") && says(L.DELVER_IDS.length, "delvers"),
    `${L.ITEM_IDS.length} items, ${L.DELVER_IDS.length} delvers`
  );
  check("and the right number of deeds", says(L.DEED_IDS.length, "deeds"), `${L.DEED_IDS.length} deeds`);
  // The two wounds that rout the Warden are the one mechanic the page
  // makes a specific promise about.
  check(
    "and the promise it makes about the Warden is the one the game keeps",
    says(L.WARDEN_WOUNDS_TO_ROUT, "wounds"),
    `${L.WARDEN_WOUNDS_TO_ROUT} wounds`
  );
}

// --- Keys -------------------------------------------------------------------
//
// Every key the game reads was a literal at its call site until a player
// could change them. What can go wrong now is arithmetic on a map: two
// actions on one key, an action with none, or a key nobody can bind their
// way out of.
{
  const defaults = L.DEFAULT_BINDINGS;
  check(
    "every action has a default key and a name",
    L.ACTIONS.every((a) => defaults[a].length > 0 && L.ACTION_LABEL[a]),
    `${L.ACTIONS.length} actions`
  );
  const all = L.ACTIONS.flatMap((a) => defaults[a]);
  check(
    "and no two actions share one out of the box",
    new Set(all).size === all.length,
    all.join(", ")
  );
  check(
    "every default key is one a player could bind themselves",
    all.every((k) => L.bindable(k)),
    all.filter((k) => !L.bindable(k)).join(", ") || "all bindable"
  );
  // Escape is how a player gets the pointer and the menu back. A game
  // that lets you bind it away is a game you can get stuck in.
  check(
    "and Escape is not one of them",
    !L.bindable("Escape") && !all.includes("Escape"),
    ""
  );
  // Binding a held key takes it off whatever held it, which is the only
  // behaviour that cannot leave a player unable to bind anything without
  // first hunting for which row has their key.
  const stolen = L.bindTo(defaults, "bar", "KeyE");
  check(
    "binding a key another action holds takes it off that one",
    stolen.bar.join() === "KeyE" && !stolen.interact.includes("KeyE"),
    `bar ${stolen.bar.join()}, use ${stolen.interact.join() || "none"}`
  );
  check(
    "and the screen can say which action that left with nothing",
    L.unbound(stolen).includes("interact") && L.unbound(defaults).length === 0,
    L.unbound(stolen).join(", ")
  );
  // Codes, not characters: a binding made on one keyboard layout has to
  // mean the same physical key on another.
  check(
    "keys are physical codes, read back as something a person can read",
    L.keyLabel("KeyW") === "W" && L.keyLabel("ArrowUp") === "Up" && L.keyLabel("ShiftLeft") === "Left Shift",
    `${L.keyLabel("KeyW")} / ${L.keyLabel("ArrowUp")} / ${L.keyLabel("ShiftLeft")}`
  );
  check(
    "and an action with two keys reads as both",
    L.keysLabel(defaults.forward) === "W or Up",
    L.keysLabel(defaults.forward)
  );
  // No action may be named the same as a menu button. Every menu in the
  // game has a Back button, and a key row called "Back" is ambiguous to a
  // player scanning the screen - it was ambiguous enough that a harness
  // clicked the row instead of the button and rebound walking backwards.
  check(
    "no action is labelled the same as a menu button",
    !Object.values(L.ACTION_LABEL).some((l) => /^(back|start|quit|resume)$/i.test(l)),
    Object.values(L.ACTION_LABEL).join(", ")
  );
}

// --- Deeds ------------------------------------------------------------------
//
// One teacher. Every system with a rule the player cannot see has a line
// in one table, said once the first time it matters; the loops' ten events
// each have one, every line is a sentence or two that ends, and no two say
// the same thing.
{
  const lessons = L.LESSONS;
  const events = new Set(lessons.map((l) => l.event));
  const missing = L.LOOP_EVENTS.filter((e) => !events.has(e));
  check("the teacher has a first-time line for every event the loops added", missing.length === 0, missing.join(", ") || `${lessons.length} lessons over ${events.size} events`);
  const texts = lessons.map((l) => ({ id: l.id, text: L.lessonText(l, l.sample, false) }));
  const bad = texts.filter((t) => !t.text || t.text.length > 190 || !/[.!]$/.test(t.text));
  check("every lesson is a sentence or two that ends, under 190 characters", bad.length === 0, bad.map((b) => `${b.id} (${b.text?.length ?? 0})`).join(", ") || `longest ${Math.max(...texts.map((t) => t.text.length))}`);
  const seen = new Map();
  const dup = texts.filter((t) => (seen.has(t.text) ? true : (seen.set(t.text, t.id), false)));
  check("no two lessons say the same thing", dup.length === 0, dup.map((d) => d.id).join(", ") || "all distinct");
  const ids = new Set(lessons.map((l) => l.id));
  check("every lesson has its own name", ids.size === lessons.length, `${ids.size} of ${lessons.length}`);
}

// Ten achievements, and the two things about them that can 
// a Steam API name that drifts from the one the store page was set up
// with, and a deed nothing in the game can earn. The first is checked
// against `steam/README.md`, which is the document somebody will actually
// type those names out of; the second is checked against the watcher.
{
  const ids = L.DEED_IDS;
  check("there are sixteen deeds and every one has a name and a line", 
    ids.length === 16 && ids.every((id) => L.DEEDS[id].name && L.DEEDS[id].blurb),
    `${ids.length} deeds`
  );
  const steamNames = ids.map((id) => L.DEEDS[id].steam);
  check(
    "and a Steam API name, all different",
    steamNames.every((n) => /^[A-Z0-9_]+$/.test(n)) && new Set(steamNames).size === ids.length,
    steamNames.join(", ")
  );
  const readme = readFileSync(join(root, "steam/README.md"), "utf8");
  const missing = steamNames.filter((n) => !readme.includes("`" + n + "`"));
  check(
    "every one of them is in the Steam instructions somebody will type them out of",
    missing.length === 0,
    missing.length ? missing.join(", ") : `${steamNames.length} names`
  );
  const watcher = readFileSync(join(root, "src/game/deeds/watch.ts"), "utf8");
  const unearnable = ids.filter((id) => !watcher.includes(`"${id}"`));
  check(
    "and every deed is one something in the game can actually earn",
    unearnable.length === 0,
    unearnable.length ? unearnable.join(", ") : `${ids.length} earnable`
  );
  // The seam to Steam is one call, in one file, and the README tells
  // somebody to change that file. If it moves, the instructions are wrong.
  const preload = readFileSync(join(root, "electron/preload.cjs"), "utf8");
  check(
    "the desktop shell still exposes the one call the deeds report through",
    /achievement:\s*reportAchievement/.test(preload) && readme.includes("electron/preload.cjs"),
    ""
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
   * A full flask must not cover a whole run held up.
   *
   * Otherwise the decision is not one: a player raises it on the first
   * floor and never touches it again. The unit is no longer seconds - oil
   * is spent walking into a room, and standing still costs nothing at all,
   * because a wall clock taxes deliberation and hiding and those are the
   * two things this game is made of.
   *
   * So the bar is in ROOMS. A run is three floors of eight to sixteen
   * rooms, call it thirty; a flask has to be worth several rooms of
   * pushing into the dark at a raised flame, and nowhere near thirty of
   * them.
   */
  const litRooms = L.LANTERN_OIL_FULL / L.OIL_PER_NEW_ROOM;
  check(
    "a full flask is worth several new rooms lit, and nowhere near a run of them",
    litRooms >= 6 && litRooms <= 15,
    `${litRooms} new rooms at a raised flame, against about 30 in a run`
  );
  check(
    "and a great deal further at a guttered one, so the bands are an economy as well as a sightline",
    L.LANTERN_OIL_FULL / (L.OIL_PER_NEW_ROOM * 0.26) > litRooms * 3,
    `${Math.round(L.LANTERN_OIL_FULL / (L.OIL_PER_NEW_ROOM * 0.26))} rooms at the Shrouded band`
  );
  check(
    "backtracking is nearly free, so a player may look at a room twice without paying for it",
    L.LANTERN_OIL_FULL / L.OIL_PER_KNOWN_ROOM > 30,
    `${L.LANTERN_OIL_FULL / L.OIL_PER_KNOWN_ROOM} known rooms`
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
  /**
   * Every set of offers a run can hold. Not one of them touches a speed
   * any more - that is the point of the swap, and this is where it shows:
   * the Cutpurse's promise used to have an exception written into it for
   * the one relic that bought a number.
   */
  const RELIC_SETS = [[], ["chit"], ["rod", "hood"], ["chit", "cant", "cut"]];
  const speed = L.CUTPURSE_SPEED;
  let sprintCatches = 0;
  let walkFails = 0;
  let cases = 0;
  for (const relics of RELIC_SETS) {
    const has = (id) => relics.includes(id);
    const pace = L.paceFor(relics, "none");
    cases++;
    if (L.catchesCutpurse(pace, speed)) sprintCatches++;
    // Nothing bought is an exception any more: the boots were the only
    // one, and they were a number wearing a name.
    void has;
    if (!L.outwalksCutpurse(pace, speed)) walkFails++;
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
    "and nothing bought is an exception to it any more",
    RELIC_SETS.every((r) => L.paceFor(r, "none").walk === L.paceFor([], "none").walk),
    RELIC_SETS.map((r) => `${r.join("+") || "none"}:${L.paceFor(r, "none").walk}`).join(" ")
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
  /**
   * And it reads as English on the line a player reads most often.
   *
   * An item's unknown name carries its own article - "an amber potion" -
   * and the first version of the chest prompt stuck the charge in front of
   * it: "Open the chest - cursed an amber potion". Every check that
   * touches that prompt asks whether it matches /open the chest/, so none
   * of them would ever have seen it; it was found by reading one.
   */
  check(
    "a charged thing reads as English, with the word inside the article",
    L.describe("cursed", "an amber potion") === "a cursed amber potion" &&
      L.describe("blessed", "a coil of black wire") === "a blessed coil of black wire" &&
      L.describe("plain", "an amber potion") === "an amber potion" &&
      L.describe("cursed", "Potion of Healing") === "cursed Potion of Healing",
    `${L.describe("cursed", "an amber potion")} / ${L.describe("blessed", "a coil of black wire")}`
  );

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

/**
 * The dungeon is not built out of one room.
 *
 * Size was a constant per kind, so every room of a kind was the same room:
 * measured over 13,996 generated rooms there were three distinct sizes in
 * the whole game and 65.7% of them were the same sixteen-metre box. Nothing
 * noticed, because every check swept the sizes it was handed and each kind
 * only ever handed it one.
 *
 * Held here as the shape of the output rather than as the table that
 * produced it: whatever `SIZE_RANGE` says, what a player walks through has
 * to actually vary.
 */
{
  const sizes = new Map();
  const shapes = new Map();
  let rooms = 0;
  for (let seed = 1; seed <= 200; seed++) {
    for (const floor of [1, 2, 3]) {
      const rules = L.floorRules(floor);
      const d = L.generateDungeon({
        seed: seed * 31 + floor,
        minRooms: rules.minRooms,
        maxRooms: rules.maxRooms,
      });
      for (const r of d.rooms) {
        rooms++;
        if (!sizes.has(r.kind)) sizes.set(r.kind, new Set());
        sizes.get(r.kind).add(r.size);
        shapes.set(r.shape, (shapes.get(r.shape) ?? 0) + 1);
      }
    }
  }
  const pinned = [...sizes.entries()].filter(([, set]) => set.size < 2).map(([k]) => k);
  check(
    "no kind of room is always built at the same size",
    pinned.length === 0,
    pinned.length ? `${pinned.join(", ")} never vary` : `${sizes.size} kinds, ${rooms} rooms`
  );

  // The commonest size used to be two thirds of every room in the game.
  const tally = new Map();
  for (const set of sizes.values()) for (const v of set) tally.set(v, 0);
  for (let seed = 1; seed <= 200; seed++) {
    for (const floor of [1, 2, 3]) {
      const rules = L.floorRules(floor);
      const d = L.generateDungeon({ seed: seed * 31 + floor, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      for (const r of d.rooms) tally.set(r.size, (tally.get(r.size) ?? 0) + 1);
    }
  }
  const total = [...tally.values()].reduce((a, b) => a + b, 0);
  const commonest = Math.max(...tally.values()) / total;
  check(
    "and no single size is most of the dungeon",
    commonest < 0.5,
    `commonest size is ${(commonest * 100).toFixed(1)}% of ${total} rooms, over ${tally.size} sizes`
  );

  /**
   * A shape the game declares and never builds is a shape that does not
   * exist. The diamond needs twenty metres of room and the triangle
   * twenty-eight; nothing was ever built that big, so two of the six were
   * dead letters in the type.
   */
  const unbuilt = L.SHAPES.filter((sh) => !shapes.has(sh));
  check(
    "every shape the game declares is one a player can walk into",
    unbuilt.length === 0,
    unbuilt.length
      ? `never built: ${unbuilt.join(", ")}`
      : L.SHAPES.map((sh) => `${sh} ${((100 * (shapes.get(sh) ?? 0)) / rooms).toFixed(1)}%`).join("  ")
  );
}

/**
 * A room's kind is what it is for; its biome is what it is made of.
 *
 * Both used to be the same fact: one floor colour, one wall colour and one
 * surface per kind, so every chamber in the game was the same grey box.
 * Held the same way the sizes are - on the output, not on the table.
 */
{
  const seen = new Map();
  const perKind = new Map();
  let rooms = 0;
  for (let seed = 1; seed <= 200; seed++) {
    for (const floor of [1, 2, 3]) {
      const rules = L.floorRules(floor);
      const d = L.generateDungeon({ seed: seed * 31 + floor, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      for (const r of d.rooms) {
        rooms++;
        const b = L.biomeIdFor(r.kind, r.id, d.seed);
        seen.set(b, (seen.get(b) ?? 0) + 1);
        if (!perKind.has(r.kind)) perKind.set(r.kind, new Set());
        perKind.get(r.kind).add(b);
      }
    }
  }
  const pinned = [...perKind.entries()].filter(([, set]) => set.size < 2).map(([k]) => k);
  check(
    "no kind of room is always made of the same thing",
    pinned.length === 0,
    pinned.length ? `${pinned.join(", ")} never vary` : `${perKind.size} kinds over ${rooms} rooms`
  );

  const never = L.BIOMES.filter((b) => !seen.has(b));
  check(
    "every biome the game declares is one a player can stand in",
    never.length === 0,
    never.length ? `never built: ${never.join(", ")}` : `${seen.size} biomes`
  );

  /**
   * A biome that names a surface the texture registry cannot paint is a
   * grey room with a confident name. `iron` was in the registry and in no
   * room in the game before this.
   */
  const missing = L.BIOMES.filter((b) => !L.BUILTIN_SURFACES.includes(L.BIOME[b].surface));
  check(
    "and every one of them is painted with a surface that exists",
    missing.length === 0,
    missing.length ? missing.join(", ") : L.BUILTIN_SURFACES.join(", ")
  );

  /**
   * And the biome is in the room, not only on it.
   *
   * A biome that tints the walls and leaves nothing behind is a colour
   * filter. Each one scatters two of its own props; this asks whether they
   * actually land, because every one of them is filtered by the same rules
   * the arrangement is and a biome whose litter never passes them would be
   * silently decorative.
   */
  {
    let withLitter = 0;
    let looked = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rules = L.floorRules(2);
      const d = L.generateDungeon({ seed: seed * 31 + 2, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
      for (const r of d.rooms) {
        if (r.template) continue;
        const want = L.BIOME[L.biomeIdFor(r.kind, r.id, d.seed)].litter;
        if (!want.length) continue;
        looked++;
        const placed = L.placementsFor(r, d.seed, {});
        if (placed.some((p) => want.includes(p.kind))) withLitter++;
      }
    }
    check(
      "a biome puts something of its own in the room, not just on its walls",
      looked > 0 && withLitter / looked > 0.8,
      `${withLitter} of ${looked} rooms carry their biome's own props`
    );
  }

  {
    const clashes = L.BIOMES.flatMap((b) =>
      L.BIOME[b].litter.filter((k) => L.NEVER_LITTER.includes(k)).map((k) => `${b}:${k}`)
    );
    check(
      "and no biome scatters a prop a room uses to mean something",
      clashes.length === 0,
      clashes.length ? clashes.join(", ") : `${L.NEVER_LITTER.join(", ")} kept out of the litter`
    );
  }

  /**
   * The shrine is a room the generator will actually build, and its font
   * has somewhere to stand.
   *
   * A kind can be declared, sized, shaped, tinted and given an arrangement
   * and still never appear, because the deck it is drawn from decides
   * that - which is exactly how the diamond and the triangle spent the
   * whole project unbuilt.
   */
  {
    let floors = 0;
    let withShrine = 0;
    let anchorInside = 0;
    for (let seed = 1; seed <= 120; seed++) {
      for (const floor of [1, 2, 3]) {
        const rules = L.floorRules(floor);
        const d = L.generateDungeon({ seed: seed * 31 + floor, minRooms: rules.minRooms, maxRooms: rules.maxRooms });
        floors++;
        const shrines = d.rooms.filter((r) => r.kind === "shrine");
        if (shrines.length) withShrine++;
        // Never two on a floor: it is a once-per-run room.
        if (shrines.length > 1) anchorInside = -1e9;
        for (const r of shrines) {
          const [x, , z] = L.shrineAnchor(r);
          if (Math.hypot(x, z) <= L.diagonalReach(r) && !L.inDoorLane(x, z, r)) anchorInside++;
        }
      }
    }
    check(
      "the shrine is a room the generator actually builds",
      withShrine / floors > 0.75,
      `${withShrine} of ${floors} floors have one`
    );
    check(
      "and its font stands on the floor, out of every doorway",
      anchorInside === withShrine,
      `${anchorInside} of ${withShrine} fonts placed legally`
    );
  }

  // A room looks the same every time you walk back into it.
  const a = L.biomeIdFor("normal", "room_3", 4242);
  const b = L.biomeIdFor("normal", "room_3", 4242);
  check("and a room is the same place when you walk back in", a === b, `${a} then ${b}`);
}

/**
 * A set piece is worth walking into.
 *
 * The tome, the memory trial and the challenge room's plate each paid one
 * gem - the same as the gem lying loose on the floor of the same room,
 * which can be picked up on the way past without answering anything. §22
 * measured what that meant: a player racing the exit can pay every toll
 * off the floor and see no set piece at all, so the most efficient way
 * through a demo was also the way that saw the least of it.
 *
 * The fairness promise is untouched and still checked elsewhere: every
 * floor's exit is payable without the vault, the arena or a puzzle. This
 * is about what answering one is worth, not about needing to.
 */
{
  check(
    "answering a set piece is worth more than bending down for a gem",
    L.SET_PIECE_GEMS > 1,
    `${L.SET_PIECE_GEMS} gems against 1`
  );
  /**
   * Enough to notice. A puzzle room holds a gem on its floor as well, so
   * the comparison a player actually makes is "rob this room" against
   * "answer it": one gem against one plus the set piece's.
   */
  check(
    "and answering a room is worth at least three times robbing it",
    1 + L.SET_PIECE_GEMS >= 3,
    `${1 + L.SET_PIECE_GEMS} gems answered against 1 robbed`
  );
  /**
   * And not so much that one set piece pays a whole floor's exit: the
   * toll is the thing the run is about, and a puzzle that clears it in
   * one press would replace the decision rather than add to it.
   */
  let coversToll = 0;
  for (let floor = 1; floor <= L.FLOORS; floor++) {
    if (L.SET_PIECE_GEMS >= L.tollForFloor(floor)) coversToll++;
  }
  check(
    "and never enough to pay a floor's exit on its own",
    coversToll === 0,
    `${L.SET_PIECE_GEMS} gems against tolls of ${[1, 2, 3].map((f) => L.tollForFloor(f)).join(", ")}`
  );
}

/**
 * The moments the arc is built around have their own beats.
 *
 * A floor is the unit the whole run is measured in, and going down one was
 * the same 220ms cut as walking through any door on it. The cracked wall
 * coming down was a burst like any other burst. The Keeper kneeling - the
 * one instant on the last floor when the exit is passable - was a HUD line
 * changing colour.
 */
{
  const ids = L.MOMENTS.map((m) => m.id);
  check("every moment the arc turns on has a beat", ids.length >= 3, ids.join(", "));
  check(
    "each is played by an event the game already sends",
    L.MOMENTS.every((m) => typeof m.event === "string" && m.event.length > 0),
    L.MOMENTS.map((m) => `${m.id}<-${m.event}`).join(", ")
  );
  check(
    "no two of them answer the same event",
    new Set(L.MOMENTS.map((m) => m.event)).size === L.MOMENTS.length,
    L.MOMENTS.map((m) => m.event).join(", ")
  );
  check(
    "and every one of them says something rather than only flashing",
    L.MOMENTS.every((m) => typeof m.title === "string" && m.title.length > 0),
    L.MOMENTS.map((m) => `${m.id}:${m.title}`).join(", ")
  );
  const descent = L.MOMENTS.find((m) => m.id === "descent");
  check(
    "going down a floor is held longer than the cut between two rooms",
    !!descent && descent.hold > L.DOOR_CUT_MS * 4,
    descent ? `${descent.hold}ms against a ${L.DOOR_CUT_MS}ms door` : "no descent"
  );
  check(
    "and it names the floor and says what is new on it, from the descent's own rules",
    !!descent && typeof descent.line === "function" && descent.line({ floor: 2 }) === L.floorRules(2).blurb,
    descent && descent.line ? descent.line({ floor: 2 }).slice(0, 60) : "no line"
  );
  check(
    "every floor of the descent has something to say when you arrive on it",
    [1, 2, 3].every((n) => descent && descent.line({ floor: n }).length > 20),
    [1, 2, 3].map((n) => (descent ? descent.line({ floor: n }).length : 0)).join(", ")
  );
  // Long enough to read, short enough not to be in the way.
  check(
    "and no beat outstays a breath",
    L.MOMENTS.every((m) => m.hold <= 3000),
    L.MOMENTS.map((m) => `${m.id}:${m.hold}ms`).join(", ")
  );
}

/**
 * One readout: what it says, in what order, in one voice.
 *
 * The HUD grew a line a run for twenty-five runs and each was appended
 * where the last one ended, so what a player read first was whatever had
 * been built first. Order and naming are one module's job now, and these
 * hold it to the three promises that make a readout one readout.
 */
{
  // A floor with everything on it at once, so every line exists and the
  // ordering has something to order.
  const loud = {
    lives: 1,
    maxLives: 3,
    freeHit: true,
    keys: 1,
    gems: 2,
    toll: 4,
    spare: 0,
    owed: 2,
    floor: 3,
    floors: 3,
    roomTitle: "Vault",
    ground: { name: "standing water", says: "carries", tone: "danger" },
    roost: true,
    drafty: true,
    // Nothing written in the Ledger, so the loud floor is the loudest a
    // delver who has learned nothing can be shown. What knowing adds is
    // checked below, against this.
    learned: [],
    watched: true,
    veinBand: "dark",
    // The lantern's two lines. Absent until now, which meant the DARK line
    // - the half of the bargain a player would otherwise never learn -
    // was never once built by any check on this readout.
    lanternLit: true,
    lanternBand: "shrouded",
    lanternBuys: "One chest in four is holding a second thing.",
    patience: 9,
    patienceShort: true,
    reaper: false,
    wardenAwake: true,
    wardenSays: "Hunting",
    wardenTone: "danger",
    wardenBars: 4,
    wary: true,
    warded: false,
    keeper: "holds",
    keeperUp: 0,
    harrier: "hunting",
    harrierUp: 0,
    lanternLit: true,
    wisp: true,
    oil: 12,
    barSeconds: 20,
    nestGems: 2,
    relics: ["Warden's Lantern"],
  };
  const lines = L.hudLines(loud);

  check("the readout has a line for every system that is saying something", lines.length >= 10, `${lines.length} lines`);
  check(
    "no two lines are called the same thing",
    new Set(lines.map((l) => l.label)).size === lines.length,
    lines.map((l) => l.label).join(", ")
  );
  check(
    "every line has a name and something to say",
    lines.every((l) => l.label.length > 0 && l.body.length > 0 && l.id.length > 0),
    lines.filter((l) => !l.label || !l.body).map((l) => l.id).join(", ") || "all of them"
  );
  check(
    "and they come out most urgent first",
    lines.every((l, i) => i === 0 || lines[i - 1].rank <= l.rank),
    lines.map((l) => `${l.label}:${l.rank}`).join(" ")
  );

  // The thing that is taking a life is above the thing underfoot.
  const at = (id) => lines.findIndex((l) => l.id === id);
  check(
    "what is about to take a life is read before what the floor is made of",
    at("keeper") < at("ground") && at("harrier") < at("ground") && at("warden") < at("ground"),
    lines.map((l) => l.label).join(" > ")
  );
  check(
    "and before what leaving will cost",
    at("keeper") < at("gems") && at("harrier") < at("gems"),
    lines.map((l) => l.label).join(" > ")
  );

  // The Reaper is the one thing that cannot be outwalked, so it is first.
  const doomed = L.hudLines({ ...loud, reaper: true });
  check(
    "and when the floor's own end is in the room, it is the first thing said",
    doomed[0].id === "reaper",
    doomed.map((l) => l.label).join(" > ")
  );
  check(
    "which replaces the countdown rather than being read beside it",
    !doomed.some((l) => l.id === "patience"),
    doomed.map((l) => l.id).join(", ")
  );

  /**
   * What the Ledger buys on the readout.
   *
   * The line only exists for something that is actually in the room with
   * the delver: "the watcher has no ear" on a floor with no watcher is
   * trivia, and a readout that carries trivia is a readout people learn to
   * skip. So it is checked both ways round.
   */
  {
    const knowing = L.hudLines({ ...loud, reaper: true, learned: ["wardenBlind", "sentryDeaf", "reaper", "gemvein"] });
    const known = knowing.find((l) => l.id === "known");
    check("what the delver has established is on the readout", !!known, known ? known.body : "no KNOWN line");
    check("and only about what is in the room with them",
      !L.hudLines({ ...loud, wardenAwake: false, watched: false, reaper: false, learned: ["wardenBlind", "sentryDeaf", "reaper"] })
        .some((l) => l.id === "known"),
      "nothing here to know about");
    check("nothing is established before it has been observed",
      !lines.some((l) => l.id === "known"), "an empty ledger says nothing");
    const dark = knowing.find((l) => l.id === "bargain");
    const unlearned = lines.find((l) => l.id === "bargain");
    check("and a delver who has taken a gem from a vein is told which band they show at",
      !!dark && !!unlearned && dark.body.includes("dark") && !unlearned.body.includes("veins"),
      dark ? dark.body : "no DARK line");
  }

  // A quiet floor says only what is true.
  const quiet = L.hudLines({
    ...loud,
    reaper: false,
    patienceShort: false,
    wardenAwake: false,
    keeper: null,
    harrier: null,
    barSeconds: 0,
    nestGems: 0,
    roost: false,
    drafty: false,
    freeHit: false,
    keys: 0,
    owed: 0,
    spare: 2,
    relics: [],
    // The middle band, which is the one that buys nothing - so a quiet
    // floor is quiet about the bargain too. The DARK line is true whenever
    // the flame is bought something, and a fixture that left it on would
    // be asking whether a line that IS true gets said.
    lanternBand: "guttered",
    lanternBuys: "",
  });
  check(
    "a quiet floor says only the five things that are always true",
    quiet.map((l) => l.id).sort().join(",") === "floor,gems,ground,lantern,lives",
    quiet.map((l) => l.id).join(", ")
  );
  check(
    "and the same line is called the same thing whether the floor is quiet or loud",
    quiet.every((q) => {
      const same = lines.find((l) => l.id === q.id);
      return !same || same.label === q.label;
    }),
    quiet.map((l) => `${l.id}=${l.label}`).join(" ")
  );

  // Every tone the lines ask for is one the palette has, and anything
  // drawn in danger also carries a mark.
  check(
    "every line names a tone the palette has",
    lines.every((l) => ["ink", "dim", "gold", "accent", "danger"].includes(l.tone)),
    lines.map((l) => l.tone).join(", ")
  );
  check(
    "and nothing urgent is told in colour alone",
    lines.filter((l) => l.tone === "danger").every((l) => typeof l.mark === "string" && l.mark.length > 0),
    lines.filter((l) => l.tone === "danger" && !l.mark).map((l) => l.id).join(", ") || "all marked"
  );

  // The same facts give the same readout twice.
  check(
    "and the same floor reads the same way twice",
    JSON.stringify(L.hudLines(loud)) === JSON.stringify(lines),
    "stable"
  );
}

/**
 * What a delver carries, and what taking something looks like.
 *
 * Relics changed numbers and nothing a player could see. The lantern is
 * the one thing of theirs that is on screen for a whole run, so it is
 * where a relic is worn - and the modifiers decide which one wins, in one
 * place, because two relics that both tint it must not depend on the
 * order they were bought in.
 */
{
  const plain = L.modifiers([]).lightTint;
  const hood = L.modifiers(["hood"]).lightTint;
  const seal = L.modifiers(["cut"]).lightTint;
  check(
    "a delver with no relics carries a plain flame",
    plain === L.LIGHT_TINT_PLAIN,
    `${plain}`
  );
  check(
    "and the two offers that are worn each change it, to different colours",
    hood !== plain && seal !== plain && hood !== seal,
    `plain ${plain}, hood ${hood}, seal ${seal}`
  );
  check(
    "and holding both is the same light whichever was bought first",
    L.modifiers(["hood", "cut"]).lightTint === L.modifiers(["cut", "hood"]).lightTint,
    `${L.modifiers(["hood", "cut"]).lightTint} then ${L.modifiers(["cut", "hood"]).lightTint}`
  );
  // Every relic set answers with a colour rather than undefined: the
  // light reads this every frame and has no fallback of its own.
  let tinted = 0;
  const ids = L.RELIC_IDS;
  for (let mask = 0; mask < 1 << ids.length; mask++) {
    const held = ids.filter((_, i) => mask & (1 << i));
    if (/^#[0-9a-f]{6}$/i.test(L.modifiers(held).lightTint)) tinted++;
  }
  check(
    "and every set of relics a run can hold names a colour",
    tinted === 1 << ids.length,
    `${tinted} of ${1 << ids.length} sets`
  );

  /**
   * A chest's key is the room and its index in the room's placements, and
   * both the trigger that loots one and the prop that has to look opened
   * ask the same function for it. Over many rooms: distinct within a
   * room, and stable when asked twice.
   */
  let rooms = 0;
  let distinct = 0;
  let stable = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const d = L.generateDungeon(seed, 1);
    for (const room of d.rooms) {
      const places = L.placementsFor(room, d.seed, { asVault: d.vaultId === room.id, sentry: null, key: null });
      const chests = places.map((p, i) => (p.kind === "chest" ? L.chestKey(room.id, i) : null)).filter(Boolean);
      if (chests.length === 0) continue;
      rooms++;
      if (new Set(chests).size === chests.length) distinct++;
      const again = places.map((p, i) => (p.kind === "chest" ? L.chestKey(room.id, i) : null)).filter(Boolean);
      if (again.join("|") === chests.join("|")) stable++;
    }
  }
  check(
    "every chest in a room has a key of its own",
    rooms > 0 && distinct === rooms,
    `${distinct} of ${rooms} rooms with chests`
  );
  check(
    "and the same chest keeps it",
    rooms > 0 && stable === rooms,
    `${stable} of ${rooms} rooms with chests`
  );

  /**
   * The pickup's flourish must never be mistaken for a blast's, which is
   * the one thing on screen that means a life is at stake. Smaller in
   * every dimension, and over sooner.
   */
  check(
    "taking something is a smaller, shorter thing to look at than a blast",
    L.TAKEN_MOTES < L.BURST_EMBERS &&
      L.TAKEN_LIGHT < L.BURST_LIGHT &&
      L.TAKEN_MOTE_S < L.BURST_EMBER_S &&
      L.TAKEN_LIGHT_S < L.BURST_LIGHT_S,
    `${L.TAKEN_MOTES} motes for ${L.TAKEN_MOTE_S}s at ${L.TAKEN_LIGHT}, against ${L.BURST_EMBERS} embers for ${L.BURST_EMBER_S}s at ${L.BURST_LIGHT}`
  );
  check(
    "and it is over inside a second, so it never stands between the player and the room",
    L.TAKEN_MOTE_S < 1,
    `${L.TAKEN_MOTE_S}s`
  );
}

/**
 * THE DIN - the shared vocabulary.
 *
 * The floor had ten good systems and no channel between them: 120 of 140
 * bus listeners were Audio and Captions, and across the six threat systems
 * exactly one file subscribed to the bus at all. These checks hold the
 * replacement to the two properties that make it worth having - silence is
 * the default, and the receiver declares what it answers to - because both
 * are easy to erode one convenient exception at a time.
 */
{
  const tags = new Set(L.TAGS);
  check("the vocabulary is about twenty tags, not a hundred", L.TAGS.length >= 18 && L.TAGS.length <= 24, `${L.TAGS.length}`);
  check("no tag is declared in two families", new Set(L.TAGS).size === L.TAGS.length);

  const sus = L.SUSCEPTIBILITY;
  const receivers = Object.keys(sus);
  check("every receiver declares a susceptibility block", receivers.length >= 9, `${receivers.length}`);

  /**
   * The rule that keeps the table sparse. A receiver reacting to a tag it
   * never declared is the bug this whole design exists to make impossible,
   * and it would arrive as one convenient special case.
   */
  check(
    "every tag any receiver answers to is in the vocabulary",
    receivers.every((id) => Object.keys(sus[id].answers).every((t) => tags.has(t))),
    receivers.flatMap((id) => Object.keys(sus[id].answers).filter((t) => !tags.has(t))).join(", ")
  );
  check(
    "and every threshold is a real magnitude",
    receivers.every((id) => Object.values(sus[id].answers).every((v) => v > 0 && v <= 1))
  );

  /**
   * `deaf` carries no mechanism - it is a written-down claim that a tag's
   * absence is a decision. This is what holds it to that.
   */
  check(
    "nothing is both deaf and susceptible to the same tag",
    receivers.every((id) => (sus[id].deaf ?? []).every((t) => sus[id].answers[t] === undefined)),
    receivers.filter((id) => (sus[id].deaf ?? []).some((t) => sus[id].answers[t] !== undefined)).join(", ")
  );
  check(
    "and every deafness names a real tag",
    receivers.every((id) => (sus[id].deaf ?? []).every((t) => tags.has(t)))
  );

  /**
   * The Reaper's empty block is the design, not an omission. Everything
   * else on the floor can be routed, lured, blinded or bombed; one thing
   * cannot, and it is worth one data row rather than five files' worth of
   * "except the Reaper".
   */
  check("the Reaper answers to nothing at all", Object.keys(sus.reaper.answers).length === 0, JSON.stringify(sus.reaper.answers));
  check("and says so, rather than leaving it to be discovered as a gap", (sus.reaper.deaf ?? []).length >= 5);

  /** The two jokes that would otherwise read as missing rows. */
  check("the Warden is blind to light: it is carrying the lamp", (sus.warden.deaf ?? []).includes("bright") && sus.warden.answers.bright === undefined);
  check("the Sentry is deaf: it is a post, not an ear", (sus.sentry.deaf ?? []).includes("loud") && sus.sentry.answers.loud === undefined);
  check("the Harrier cannot be sent away with a noise", (sus.harrier.deaf ?? []).includes("loud") && sus.harrier.answers.blast !== undefined);

  /**
   * The design statement at the bottom of the emissions table. Stealing
   * and smashing must not feel alike, and a player who learns the floor
   * does not hear a gem leave its socket has learned the game's actual
   * proposition.
   */
  check("theft is silent", L.EMISSIONS.gemTaken.magnitude === 0 && L.EMISSIONS.gemTaken.tags.length === 0);
  check(
    "a bomb declares what it is and never learns who is listening",
    ["blast", "loud", "bright", "hot"].every((t) => L.EMISSIONS.bombBurst.tags.includes(t))
  );
  check("and it is the only source of [blast]", Object.values(L.EMISSIONS).filter((e) => e.tags.includes("blast")).length === 1);
  check(
    "every emission is made of real tags",
    Object.values({ ...L.EMISSIONS, ...L.HELD }).every((e) => e.tags.every((t) => tags.has(t)))
  );

  /** Walking is below every threshold in the game. That is what walking is for. */
  const thresholds = receivers.flatMap((id) => Object.entries(sus[id].answers)).filter(([t]) => t === "loud").map(([, v]) => v);
  check("walking is quieter than anything on the floor listens for", thresholds.every((v) => L.EMISSIONS.walk.magnitude < v), `walk ${L.EMISSIONS.walk.magnitude} vs min ${Math.min(...thresholds)}`);

  /** Propagation: the transplanted half, and the numbers that are ours. */
  const line = (n) => Array.from({ length: n }, (_, i) => ({
    id: `r${i}`, kind: "normal", seed: 0, grid: { x: i, z: 0 }, size: 16, shape: "square",
    links: { ...(i > 0 ? { west: `r${i - 1}` } : {}), ...(i < n - 1 ? { east: `r${i + 1}` } : {}) },
  }));
  const four = line(4);
  const reach = L.carriesTo(four, "r0", 1);
  check("a sound is at full strength in the room it happened in", reach.get("r0") === 1);
  check("one doorway costs it 65%", Math.abs(reach.get("r1") - 0.35) < 1e-9, `${reach.get("r1")}`);
  check("two doorways, and it is a rumour", Math.abs(reach.get("r2") - 0.1225) < 1e-9, `${reach.get("r2")}`);
  /**
   * And the flood terminates where the file says it does, rather than
   * walking the whole dungeon to deliver numbers no receiver could act on.
   */
  const six = L.carriesTo(line(6), "r0", 1);
  check("three doorways away it is below everything on the floor that listens", six.get("r3") < 0.3, `${six.get("r3")?.toFixed(4)}`);
  check("and four doorways away it is not there at all", six.get("r4") === undefined, `${six.get("r4")}`);

  /** A wall is 0.00, and that is not a rounded-down small number. */
  const split = [
    { id: "a", kind: "normal", seed: 0, grid: { x: 0, z: 0 }, size: 16, shape: "square", links: {} },
    { id: "b", kind: "normal", seed: 0, grid: { x: 1, z: 0 }, size: 16, shape: "square", links: {} },
  ];
  check("a wall stops it dead, however loud it was", L.carriesTo(split, "a", 1).get("b") === undefined);

  /**
   * A dungeon is a graph and not a tree, so a room two doorways away down
   * one route may be one doorway away down another. A queue that takes the
   * first arrival delivers the quieter of the two, which would have shipped
   * as "the Warden sometimes ignores a bomb it should have heard".
   */
  const ring = [
    { id: "a", kind: "normal", seed: 0, grid: { x: 0, z: 0 }, size: 16, shape: "square", links: { east: "b", south: "c" } },
    { id: "b", kind: "normal", seed: 0, grid: { x: 1, z: 0 }, size: 16, shape: "square", links: { west: "a", south: "d" } },
    { id: "c", kind: "normal", seed: 0, grid: { x: 0, z: 1 }, size: 16, shape: "square", links: { north: "a", east: "d" } },
    { id: "d", kind: "normal", seed: 0, grid: { x: 1, z: 1 }, size: 16, shape: "square", links: { north: "b", west: "c" } },
  ];
  check("it arrives by the loudest way round, not the first one found", Math.abs(L.carriesTo(ring, "a", 1).get("d") - 0.1225) < 1e-9, `${L.carriesTo(ring, "a", 1).get("d")}`);

  /** A bar is a wall the player paid a gem and eight seconds of hammering for. */
  const barred = L.carriesTo(four, "r0", 1, new Set([L.barKey("r0", "r1")]));
  check("a barred doorway stops sound as well as stopping the Warden", barred.get("r1") === undefined && barred.get("r0") === 1);

  check("a sound halves every two and a half seconds", Math.abs(L.aged(1, L.HALF_LIFE_S) - 0.5) < 1e-9);
  check("and is gone, rather than ending on a frame boundary at 0.01", L.aged(1, 30) < L.AUDIBLE);

  /**
   * The two facts a player can actually plan against, and the reason the
   * numbers were chosen. A bomb pulls a Warden from the next room and not
   * from across the floor: near enough to be a tool, far enough to be a
   * decision.
   */
  const wardenHears = sus.warden.answers.loud;
  check("a bomb is heard one room away", 1 * 0.35 >= wardenHears, `${0.35} vs ${wardenHears}`);
  check("but not two: a lure is a local tool, not a floor-wide one", 1 * 0.1225 < wardenHears, `${0.1225} vs ${wardenHears}`);

  /** The Sentry sees the flash of the thing it cannot hear. Tags, not names. */
  check(
    "the Sentry never hears the loudest thing in the game - and sees its flash",
    sus.sentry.answers.loud === undefined && L.EMISSIONS.bombBurst.magnitude >= sus.sentry.answers.bright
  );
  check(
    "and only in its own room: a flash does not turn a corner well",
    1 * 0.35 < sus.sentry.answers.bright,
    `${0.35} vs ${sus.sentry.answers.bright}`
  );

  /**
   * The biome table already owns how far a sprint carries, and it is shown
   * to the player as "deep moss" or "standing water" before they commit to
   * the dash. The Din reads that number rather than keeping a second copy.
   */
  const roomIn = (kind, id) => ({ id, kind, seed: 7, grid: { x: 0, z: 0 }, size: 16, shape: "square", links: {} });
  const carries = L.ROOM_KINDS.flatMap((kind) => [0, 1, 2, 3].map((i) => L.loudnessIn("sprint", roomIn(kind, `r${i}`))));
  check("a sprint is not equally loud everywhere", new Set(carries.map((c) => c.toFixed(3))).size > 1, `${new Set(carries.map((c) => c.toFixed(3))).size} values`);
  check("and a bomb is, because a tool with situational reach cannot be planned with", new Set(L.ROOM_KINDS.map((k) => L.loudnessIn("bombBurst", roomIn(k, "r0")))).size === 1);
  check("every surface maps into the acoustic vocabulary", Object.values(L.SURFACE_OF).every((s) => tags.has(s)));
}

/**
 * THE LADDER - awareness with rungs.
 *
 * The brief, in the words of the designer who shipped the best version of
 * it: broadening out the gray zone of safety and danger that in most
 * first-person games is razor thin. Ours was two states and a boolean.
 *
 * Everything checked here is a property that is easy to erode by accident
 * and impossible to notice going: a jump that quietly becomes a ratchet, a
 * cone that quietly grows a falloff, a cap that quietly stops capping.
 */
{
  const caps = L.CAPS;
  const ids = Object.keys(caps);
  check("every creature on the floor has a cap", ids.length >= 9, `${ids.length}`);
  check("and none of them has a floor above its ceiling", ids.every((id) => caps[id].min <= caps[id].max));
  check("and every rung named is a rung that exists", ids.every((id) => caps[id].max <= 3 && caps[id].min >= 0));

  /**
   * The content tool. A creature capped below the engage rung perceives,
   * reacts and calls out, and never commits - which is how one
   * implementation covers a rat, a moth, a roost and a Warden.
   */
  const capped = ids.filter((id) => caps[id].max < L.ENGAGE);
  check("some of the population is capped below the engage rung", capped.length >= 3, capped.join(", "));
  check(
    "and a capped creature never commits, even at its own ceiling",
    capped.every((id) => !L.engaged({ ...L.fresh(caps[id].max) }, caps[id])),
    capped.join(", ")
  );
  check(
    "while the things that hunt you do",
    ids.filter((id) => caps[id].max >= L.ENGAGE).every((id) => L.engaged(L.fresh(3), caps[id]))
  );

  /** Pinned: it never rises because it never was not risen, and never falls. */
  check("the Reaper is pinned at the top rung", L.pinnedAt("reaper") === L.ENGAGE, `${L.pinnedAt("reaper")}`);
  check("and it is the only thing on the floor that is pinned there", ids.filter((id) => L.pinnedAt(id) === L.ENGAGE).length === 1);

  /**
   * UP IS A JUMP. Gated by a delay that belongs to the rung it is leaving,
   * and once past it the creature arrives without visiting anything on the
   * way. A ratchet would hand the player a warning the design does not
   * intend to give.
   */
  {
    let a = L.fresh(0);
    a = L.step(a, caps.warden, 3, 0, false, false, "r1");
    check("a gated jump does not move on the frame the stimulus starts", a.rung === 0, `${a.rung}`);
    a = L.step(a, caps.warden, 3, L.REACT_MODERATE_S - 0.01, false, false, "r1");
    check("nor a hair before the delay is up", a.rung === 0, `${a.rung}`);
    a = L.step(a, caps.warden, 3, L.REACT_MODERATE_S, false, false, "r1");
    check("and then it arrives at the top without visiting the rungs between", a.rung === 3, `${a.rung}`);
    check("and remembers where it had you", a.markRoomId === "r1", `${a.markRoomId}`);
  }

  /**
   * And the half that makes ducking behind a pillar a real move: break the
   * stimulus inside the window and there is no alert AT ALL. Nothing is
   * banked, so it is not a postponement of something already decided.
   */
  {
    let a = L.fresh(0);
    a = L.step(a, caps.warden, 3, 0, false, false, "r1");
    a = L.step(a, caps.warden, 0, 0.4, false, false, null);
    a = L.step(a, caps.warden, 3, 0.5, false, false, "r1");
    check("breaking the stimulus inside the window banks nothing", a.rung === 0, `${a.rung}`);
    a = L.step(a, caps.warden, 3, 0.5 + L.REACT_MODERATE_S - 0.01, false, false, "r1");
    check("and the next attempt starts its own delay from scratch", a.rung === 0, `${a.rung}`);
  }

  /** A strong stimulus is dealt with faster than a moderate one. */
  check("a strong stimulus is reacted to faster", L.REACT_STRONG_S < L.REACT_MODERATE_S, `${L.REACT_STRONG_S} vs ${L.REACT_MODERATE_S}`);
  {
    let a = L.fresh(0);
    a = L.step(a, caps.warden, 3, 0, false, true, null);
    a = L.step(a, caps.warden, 3, L.REACT_STRONG_S, false, true, null);
    check("and gets there on the shorter clock", a.rung === 3, `${a.rung}`);
  }

  /** At arm's length there is no window: a delay there reads as broken. */
  {
    let a = L.fresh(0);
    a = L.step(a, caps.warden, 3, 0, true, false, null);
    check("inside arm's length the delay does not apply at all", a.rung === 3, `${a.rung}`);
  }
  check("and arm's length is about a stride, not half a room", L.IGNORE_DELAY_RANGE > 1 && L.IGNORE_DELAY_RANGE < 5, `${L.IGNORE_DELAY_RANGE}`);

  /**
   * Seen once, seen cheaply: a botched approach is worth abandoning.
   *
   * Run on the rat, because the interesting case is a creature that has
   * had time to come back down while it is still primed - and the Warden's
   * top rung takes 22 seconds to leave against a 12-second window, so it
   * cannot show this without also testing the discharge times.
   */
  {
    let a = L.fresh(0);
    a = L.step(a, caps.rat, 1, 0, true, false, null);
    for (let t = 1; t <= L.DISCHARGE_S[1]; t++) a = L.step(a, caps.rat, 0, t, false, false, null);
    const before = a.rung;
    a = L.step(a, caps.rat, 1, L.DISCHARGE_S[1] + 0.5, false, false, null);
    check("inside the retrigger window, being noticed again costs nothing", before === 0 && a.rung === 1, `${before} then ${a.rung}`);

    let b = L.fresh(0);
    b = L.step(b, caps.rat, 1, 0, true, false, null);
    const past = L.RETRIGGER_MODERATE_S + 1;
    for (let t = 1; t <= past; t++) b = L.step(b, caps.rat, 0, t, false, false, null);
    const settled = b.rung;
    b = L.step(b, caps.rat, 1, past, false, false, null);
    check("and once it has lapsed, the window is back", settled === 0 && b.rung === 0, `${settled} then ${b.rung}`);
  }
  check("and being seen matters longer than being heard", L.RETRIGGER_STRONG_S > L.RETRIGGER_MODERATE_S);

  /**
   * DOWN IS A SLIDE. Through every intermediate state, and slower the
   * higher it got. Being noticed is sudden and being forgotten is slow,
   * and both shapes are things a player learns.
   */
  {
    let a = L.fresh(0);
    a = L.step(a, caps.rat, 2, 0, true, false, null);
    const walked = [a.rung];
    for (let t = 1; t < 60; t++) {
      const next = L.step(a, caps.rat, 0, t, false, false, null);
      if (next.rung !== a.rung) walked.push(next.rung);
      a = next;
    }
    check("coming down passes through every rung on the way", walked.join(">") === "2>1>0", walked.join(">"));
  }
  check("and the higher it got, the longer it takes to let go", L.DISCHARGE_S[3] > L.DISCHARGE_S[2] && L.DISCHARGE_S[2] > L.DISCHARGE_S[1]);

  /**
   * OURS, and marked as ours: a floor that remembers what you did on it.
   * The engine property this looked like is documented; the behaviour is
   * not, across three verification passes.
   */
  {
    let a = L.fresh(0);
    a = L.step(a, caps.warden, 3, 0, true, false, null);
    for (let t = 1; t < 300; t++) a = L.step(a, caps.warden, 0, t, false, false, null);
    check("a Warden that has hunted you never goes fully still again", a.rung >= 1, `${a.rung}`);
    let b = L.fresh(0);
    for (let t = 1; t < 300; t++) b = L.step(b, caps.warden, 0, t, false, false, null);
    check("but one that never noticed you is still still", b.rung === 0, `${b.rung}`);
    let c = L.fresh(0);
    c = L.step(c, caps.rat, 2, 0, true, false, null);
    for (let t = 1; t < 300; t++) c = L.step(c, caps.rat, 0, t, false, false, null);
    check("and a creature without the rule forgets completely", c.rung === 0, `${c.rung}`);
  }

  /**
   * The cones. Ordered, first hit wins, and CONSTANT output inside - which
   * is what makes the edge of a cone a line the player can learn and stand
   * just outside of. A gradient would not be.
   */
  const cones = L.CONES.warden;
  check("the Warden reads well ahead of itself and poorly to the sides", cones[0].angle < cones[2].angle && cones[0].acuity > cones[2].acuity);
  check("and it notices anything standing right next to it, from any side", cones[cones.length - 1].angle >= Math.PI - 1e-9);
  check(
    "the cones are declared narrowest-and-sharpest first, so the first hit is the right one",
    cones.every((c, i) => i === 0 || c.angle >= cones[i - 1].angle)
  );
  {
    const first = L.coneFor(cones, 0, 1, 0, 3);
    const wide = L.coneFor(cones, 0, 1, 3, 3);
    check("dead ahead falls in the sharp cone", first === cones[0]);
    check("and off to the side falls in a duller one", wide !== null && wide !== cones[0]);
    check("outside every cone is not seen at all", L.coneFor(cones, 0, 1, 0, -20) === null);
  }
  {
    const v = { light: 0.5, movement: 0.5, exposure: 1 };
    const near = L.seenAt(cones[0], v);
    check("output inside a cone does not fall off with distance", near === L.seenAt(cones[0], v), `${near}`);
    check("and a duller cone is genuinely duller", L.seenAt(cones[2], v) < near);
  }

  /**
   * Peripheral vision, which is the profile worth having: a tenth as
   * sensitive to light, three times as sensitive to movement. Out of the
   * corner of its eye it cannot see your lantern and it absolutely can see
   * you run.
   */
  check("peripheral vision is far more sensitive to movement than to light", L.PROFILES.peripheral.movement > L.PROFILES.peripheral.light * 5);
  check("and the Sentry's night vision is the opposite", L.PROFILES.nightVision.light > L.PROFILES.nightVision.movement * 3);
  check(
    "every profile weighs all three inputs",
    Object.values(L.PROFILES).every((p) => p.light >= 0 && p.movement >= 0 && p.exposure >= 0)
  );

  /** The discrete output stage: the quantisation IS the readability. */
  check("the analog value quantises upwards through every rung", L.rungFor(0) === 0 && L.rungFor(0.2) === 1 && L.rungFor(0.5) === 2 && L.rungFor(1) === 3);
  check("and every rung has a word the player can be told", [0, 1, 2, 3].every((r) => typeof L.RUNG_NAME[r] === "string" && L.RUNG_NAME[r].length > 0));
  check("four rungs, not eight: a ladder whose rungs cannot be named is a number in a costume", L.RUNGS.length === 4);
}

/**
 * THE CYCLE - pressure that oscillates instead of ramping.
 *
 * The largest omission the research found: we had nothing that ever
 * relaxed. The asymmetry between the phases IS the design - the peak is a
 * spike, not a plateau - and it is the property most likely to be tuned
 * away by somebody who thinks a longer peak is a better peak.
 */
{
  const T = L.BASE;
  check("the peak is a spike, not a plateau", T.sustainMaxS <= 5 && T.relaxMinS >= 30, `${T.sustainMinS}-${T.sustainMaxS}s at the top against ${T.relaxMinS}-${T.relaxMaxS}s at the bottom`);
  check("and the valley is many times the peak", T.relaxMinS > T.sustainMaxS * 5, `${T.relaxMinS} against ${T.sustainMaxS}`);
  check("a build-up has a floor under it, so a bad first second cannot be the peak", T.buildUpMinS >= 15, `${T.buildUpMinS}s`);
  check("every phase with a range has a real one, so the player cannot count it out", T.sustainMaxS > T.sustainMinS && T.relaxMaxS > T.relaxMinS);
  check("and forward progress can end a relax early, so the valley is not an intermission", T.relaxProgress > 0 && T.relaxProgress < 8, `${T.relaxProgress} rooms`);

  /**
   * A crescendo is the same machine with five numbers swapped, and it is
   * a PRESET rather than the normal curve turned up. Inverted from base
   * pacing: a long hold at the top against almost no valley.
   */
  check(
    "a crescendo inverts the base curve rather than steepening it",
    L.CRESCENDO.sustainMinS > L.BASE.sustainMaxS && L.CRESCENDO.relaxMaxS < L.BASE.relaxMinS,
    `sustain ${L.CRESCENDO.sustainMinS}-${L.CRESCENDO.sustainMaxS}s against ${L.BASE.sustainMinS}-${L.BASE.sustainMaxS}s, relax ${L.CRESCENDO.relaxMinS}-${L.CRESCENDO.relaxMaxS}s against ${L.BASE.relaxMinS}-${L.BASE.relaxMaxS}s`
  );
  check("and is never reachable by the director on its own", JSON.stringify(L.BASE) !== JSON.stringify(L.CRESCENDO));

  /** The four phases, walked. */
  {
    let d = L.openCycle(0);
    check("a floor opens in the build-up", d.phase === "buildUp");
    // Hot from the first second, and it still will not peak early.
    d = L.stokeCycle(d, 1);
    d = L.stepCycle(d, T, T.buildUpMinS - 1, 0.016, true, 0, 0.5);
    check("and will not peak before its floor, however bad it gets", d.phase === "buildUp", d.phase);
    d = L.stepCycle(d, T, T.buildUpMinS, 0.016, true, 0, 0.5);
    check("then it peaks", d.phase === "sustainPeak", d.phase);
    d = L.stepCycle(d, T, T.buildUpMinS + T.sustainMaxS + 0.1, 0.016, true, 0, 0.5);
    check("and comes off the peak on its own clock, whatever is happening", d.phase === "peakFade", d.phase);
    /**
     * The fade waits for a natural break. Without it the valley is spent
     * finishing the fight that caused the peak, and the player gets a
     * relax they never experienced.
     */
    let t = T.buildUpMinS + T.sustainMaxS + 1;
    d = L.stepCycle(d, T, t, 0.016, true, 0, 0.5);
    check("the relax does not start while the fight is still going", d.phase === "peakFade", d.phase);
    // Let go, and let it cool.
    for (let i = 0; i < 2000 && d.phase === "peakFade"; i++) { t += 0.05; d = L.stepCycle(d, T, t, 0.05, false, 0, 0.5); }
    check("and starts the moment it is over", d.phase === "relax", d.phase);
    const began = t;
    d = L.stepCycle(d, T, began + T.relaxMinS - 1, 0.016, false, 0, 0.5);
    check("a valley is not cut short by the clock alone", d.phase === "relax", d.phase);
    d = L.stepCycle(d, T, began + T.relaxMaxS + 1, 0.016, false, 0, 0.5);
    check("and then it builds again", d.phase === "buildUp", d.phase);
  }

  /**
   * Forward progress ends a valley early. This is the half that makes the
   * bargain of the whole game legible in the pacing rather than in a
   * penalty: push on toward the stair and the floor comes back at you
   * sooner, sweep it for gems and it does not.
   */
  {
    let d = L.openCycle(0);
    d = L.stokeCycle(d, 1);
    d = L.stepCycle(d, T, T.buildUpMinS, 0.016, true, 0, 0.5);
    d = L.stepCycle(d, T, T.buildUpMinS + T.sustainMaxS + 0.1, 0.016, true, 0, 0.5);
    let t = T.buildUpMinS + T.sustainMaxS + 1;
    for (let i = 0; i < 2000 && d.phase === "peakFade"; i++) { t += 0.05; d = L.stepCycle(d, T, t, 0.05, false, 0, 0.5); }
    const walked = L.stepCycle(d, T, t + 1, 0.016, false, d.progressAt + T.relaxProgress, 0.5);
    const stood = L.stepCycle(d, T, t + 1, 0.016, false, d.progressAt, 0.5);
    check("walking on ends the valley early", walked.phase === "buildUp", walked.phase);
    check("and standing still does not", stood.phase === "relax", stood.phase);
  }

  /**
   * Minimal Threat, read precisely: no NEW threats. Whatever is already in
   * flight keeps acting, which is what stops a valley reading as a
   * scripted intermission.
   */
  check("nothing new is sent during a valley", L.mayEscalate({ phase: "relax" }) === false);
  check("and everything else in the cycle may send", ["buildUp", "sustainPeak", "peakFade"].every((phase) => L.mayEscalate({ phase })));

  /**
   * The accumulator. Permission to make it crude is explicit - "Survivor
   * Intensity estimation is crude, yet the resulting pacing works" - so
   * these hold it to being monotone in the right direction and nothing
   * more.
   */
  check("a life taken is the largest single input", Object.entries(L.INTENSITY).filter(([k]) => k !== "hunted").every(([, v]) => v <= L.INTENSITY.damaged), JSON.stringify(L.INTENSITY));
  check("and being hunted outweighs being merely near", L.INTENSITY.hunted > L.INTENSITY.nearby);
  check("intensity is clamped, so very bad cannot become three times as long to forget", L.stokeCycle(L.stokeCycle(L.openCycle(0), 1), 1).intensity === 1);
  check("it bleeds off when nothing is happening", L.stepCycle(L.stokeCycle(L.openCycle(0), 1), T, 1, 1, false, 0, 0.5).intensity < 1);
  check("and does not while something is engaging", L.stepCycle(L.stokeCycle(L.openCycle(0), 1), T, 1, 1, true, 0, 0.5).intensity === 1);
  check("the decay is widened for one accumulator rather than a maximum of four", L.DECAY_PER_S > 0 && L.DECAY_PER_S <= 0.15, `${L.DECAY_PER_S}/s`);

  /**
   * And the join between the two systems, which is the reason they are
   * two: the amplitude is the Coefficient's and the frequency is this.
   */
  const period = T.buildUpMinS + T.sustainMaxS + T.relaxMaxS;
  check("a cycle is about a minute and a half at its longest, so a floor holds several", period >= 45 && period <= 120, `${period}s`);
}

/**
 * THE MENACE GAUGE - decompression that is scheduled, not earned.
 *
 * The half of the Cycle that shipped unbuilt. `mayEscalate` stops the floor
 * ADDING pressure during a valley; nothing ever removed the pressure
 * already standing in the room. A player hounded from the second room of a
 * floor got no valley at all unless they wounded it twice or spent a bomb.
 *
 * Creative Assembly's answer, 3-0: a meter that pulls the pursuer offstage
 * on a threshold, with a cooldown, a time-to-peak and a cap per appearance,
 * whose inputs measure PRESSURE ON THE PLAYER rather than player noise.
 */
{
  const fill = (m, seconds, pressure) => {
    let out = m;
    for (let i = 0; i < seconds * 20; i++) out = L.stepMenace(out, 0.05, pressure);
    return out;
  };

  check("a floor starts with an empty gauge and no breaths spent", L.openMenace().gauge === 0 && L.openMenace().spent === 0);
  check("and with no withdrawal behind it, so the cooldown cannot gate the first one", L.openMenace().lastAt < 0);

  /**
   * Time to peak. The gate is that it is long enough never to fire during
   * the ordinary business of being walked past, and short enough to arrive
   * inside one bad chase rather than at the end of the floor.
   */
  check("the gauge fills under unbroken worst-case pressure", fill(L.openMenace(), L.PEAK_S, 1).gauge >= 1);
  check("and does not fill a moment early", fill(L.openMenace(), L.PEAK_S * 0.9, 1).gauge < 1, fill(L.openMenace(), L.PEAK_S * 0.9, 1).gauge.toFixed(2));
  check("the time to peak is under a fifth of a floor's patience", L.PEAK_S <= 300 / 4, `${L.PEAK_S}s`);
  check("and is long enough that walking past cannot fill it", L.PEAK_S >= 30, `${L.PEAK_S}s`);

  /**
   * The inputs, and the one thing they must all be: pressure the player is
   * UNDER. Being loud is the Din's business, and being loud entitles
   * nobody to a rest.
   */
  check("being hunted in the room presses hardest", L.pressureOn(true, true, false, false) === L.PRESS.hunted);
  check("and merely sharing the room presses less", L.pressureOn(true, false, false, false) < L.pressureOn(true, true, false, false));
  check("and next door less again", L.pressureOn(false, false, true, false) < L.pressureOn(true, false, false, false));
  check("and an empty floor does not press at all", L.pressureOn(false, false, false, false) === 0);
  check("something else that commits presses as hard as the Warden does", L.pressureOn(false, false, false, true) === L.PRESS.hunted);
  check("and pressure never exceeds one, however many things are on you", L.pressureOn(true, true, true, true) <= 1);

  /**
   * The asymmetry between filling and easing. A chase broken by eight
   * seconds behind a door is one chase, not two - a gauge that emptied as
   * fast as it filled would only ever fire during a single unbroken
   * pursuit, which is the case the player can already answer by running.
   */
  check("the gauge eases off when nothing presses", fill(fill(L.openMenace(), L.PEAK_S / 2, 1), 5, 0).gauge < fill(L.openMenace(), L.PEAK_S / 2, 1).gauge);
  check("and eases more slowly than it fills, so a chase broken by a door is one chase", L.EASE < 1, `${L.EASE}x`);
  check("but a floor left alone does return to nothing", fill(fill(L.openMenace(), L.PEAK_S, 1), L.PEAK_S / L.EASE + 5, 0).gauge === 0);

  /** The threshold, and the two gates on it. */
  {
    const full = fill(L.openMenace(), L.PEAK_S, 1);
    check("a full gauge withdraws", L.withdrawsNow(full, 100));
    check("and a part-filled one does not", !L.withdrawsNow(fill(L.openMenace(), L.PEAK_S / 2, 1), 100));

    const spent = L.spendMenace(full, 100);
    check("spending it empties the gauge and counts the breath", spent.gauge === 0 && spent.spent === 1);
    const refilled = fill(spent, L.PEAK_S, 1);
    check("a second full gauge inside the cooldown does not fire", !L.withdrawsNow(refilled, 100 + L.COOLDOWN_S - 1));
    check("and does once the cooldown has lapsed", L.withdrawsNow(refilled, 100 + L.COOLDOWN_S));
    check("the cooldown is longer than the time to peak, so breaths are not a metronome", L.COOLDOWN_S > L.PEAK_S, `${L.COOLDOWN_S}s vs ${L.PEAK_S}s`);
  }

  /**
   * And the cap, which is what stops this becoming a strategy. The source
   * says "per appearance"; ours appears once per floor and stays until the
   * stair, so per floor is the mapping - stated here rather than left to
   * be a coincidence of where the driver happens to reset it.
   */
  {
    let m = L.openMenace();
    let t = 0;
    let breaths = 0;
    for (let i = 0; i < 40; i++) {
      m = fill(m, L.PEAK_S, 1);
      t += L.PEAK_S;
      if (L.withdrawsNow(m, t)) {
        m = L.spendMenace(m, t);
        breaths++;
      }
    }
    check("a floor of unbroken pressure hands out the cap and no more", breaths === L.PER_FLOOR, `${breaths} breaths`);
    check("and the cap is small enough that nobody plans around a third", L.PER_FLOOR >= 1 && L.PER_FLOOR <= 3, `${L.PER_FLOOR}/floor`);
  }
}

/**
 * THE LANTERN BARGAIN - darkness as an affordance the player spends.
 *
 * Our lantern was a pure penalty: lowering it gave nothing, so there was no
 * reason ever to raise it except that you could not see. That fails Law 6
 * twice - darkness must PAY, and it must pay in NAMED STEPS.
 */
{
  const B = L.GLIM_BANDS;
  check("five bands, not four: Shrouded is real", B.length === 5, B.map((b) => b.name).join(" / "));
  check("and they run downward without a gap", B.every((b, i) => i === 0 || b.at < B[i - 1].at));
  check("every band names itself", B.every((b) => b.name && b.id));
  check("and you see less the further down you go", B.every((b, i) => i === 0 || b.sees < B[i - 1].sees), B.map((b) => b.sees).join(" > "));

  /**
   * BOTH ENDS PAY, in currencies that cannot be converted into each other.
   * My first table had darkness paying and light paying nothing, which is a
   * difficulty setting rather than a decision.
   */
  const pays = B.filter((b) => b.buys.length > 0);
  check("the top band buys something no other band can", B[0].buys.length > 0, B[0].buys);
  check("and so do the two bottom ones", B[3].buys.length > 0 && B[4].buys.length > 0);
  check("at least three of the five pay, and the middle one does not", pays.length >= 3 && B[1].buys === "");

  check("veins show below the Dark band and not above it", L.gemveinsShow(L.GEMVEIN_BELOW - 1) && !L.gemveinsShow(L.GEMVEIN_BELOW));
  check("and cracks show only at nothing at all", L.cracksShow(0) && !L.cracksShow(1));
  check("scouting is the top band's alone", L.canScout(100) && !L.canScout(B[0].at - 1));

  /**
   * OIL BURNS PER ROOM, NOT PER SECOND. A time-based drain punishes
   * deliberation, careful looking and hiding - which are exactly the
   * behaviours an evade-only lantern game wants to reward, and are the
   * whole of what this game is.
   */
  check("pushing into the unknown is what costs", L.oilForRoom(false) > L.oilForRoom(true), `${L.oilForRoom(false)} new against ${L.oilForRoom(true)} known`);
  check("and backtracking is nearly free", L.oilForRoom(true) <= L.oilForRoom(false) / 4, `${L.oilForRoom(true)} of ${L.oilForRoom(false)}`);

  /** Cheap and instant to enter, expensive and slow to leave. */
  check("darkness is instant and free to enter", L.LOWER_S === 0);
  check("and costs both oil and time to leave", L.RAISE_OIL > 0 && L.RAISE_S > 0, `${L.RAISE_OIL} oil, ${L.RAISE_S}s`);
}

/**
 * VERBS, NOT KEYS - and the hedge that is the useful part. The rule is not
 * "no locks", it is no lock whose ONLY solution is its key, and the audit
 * is per GATE rather than per tool.
 */
{
  check("every gate the game puts up has more than one answer", L.GATES.every((g) => g.ways.length >= 2), L.GATES.filter((g) => g.ways.length < 2).map((g) => g.id).join(", ") || "all of them");
  check("and one of them has three", L.GATES.some((g) => g.ways.length >= 3));
  check("every verb is briefed as a physical behaviour", L.VERBS.every((v) => v.brief.length > 12));
  /**
   * The one that failed the test: "the thing that opens the vault" is a
   * function wearing an object's name, and it is why the key had exactly
   * one use for its entire life.
   */
  const key = L.VERBS.find((v) => v.id === "key");
  check("including the key, which used to be briefed as a function", !!key && !/opens the vault/.test(key.brief), key?.brief);
  check("and rebriefing it produces three properties it did not have", L.KEY_IS.length === 3 && L.KEY_IS.every((k) => k.property && k.pays));
  check("a heavy key can weight a plate, which is now a way through a gate", L.GATES.find((g) => g.id === "plate")?.ways.some((w) => /key/.test(w)));

  /** Every verb needs a LEGIBLE limit: a universal verb is unreadable. */
  check("every verb has exactly one limit", L.VERBS.every((v) => v.limit.length > 4));
  check("and every limit is signposted, because you cannot plan against an invisible edge", L.VERBS.every((v) => v.signpost.length > 12));

  /**
   * And the limits exist as FUNCTIONS as well as prose, keyed on the Din's
   * surfaces rather than on biome names, so a limit the player learns as a
   * sentence is the same limit the game enforces.
   */
  check("wet stone does not crack, and the game can be asked", L.bombCracks("stone") && !L.bombCracks("water"));
  check("a snare will not set on tile, and the game can be asked", L.snareSets("stone") && !L.snareSets("tile"));
  check("a draft kills a flame that is up", L.draftSnuffs(true, 100) === true);
  check("and takes nothing from one already down", L.draftSnuffs(true, 0) === false);
  check("standing out of the draft costs the flame nothing", L.draftSnuffs(false, 100) === false);
  check("a vault re-locks behind you", L.VAULT_RELOCKS === true);

  /**
   * Each limit bites exactly one surface. A limit that killed two of the
   * five would not be an edge, it would be a tax.
   */
  check("each limit costs one surface, not a category", L.BOMB_DEAD.length === 1 && L.SNARE_DEAD.length === 1);
  check("and they are different surfaces, so no room is dead to both", L.BOMB_DEAD.every((g) => !L.SNARE_DEAD.includes(g)));
  check("every dead surface is one the Din actually names", [...L.BOMB_DEAD, ...L.SNARE_DEAD].every((g) => L.SURFACES.includes(g)));
  /**
   * And one the dungeon actually BUILDS. A limit keyed on a surface no
   * biome produces is a rule that can never fire, which is worse than no
   * rule: it reads as an edge the player can plan against and is not one.
   * This caught `water` being in the vocabulary while the flooded biome -
   * whose ground the game calls "standing water" - reported as dirt.
   */
  const built = new Set(Object.values(L.BIOME).map((b) => L.SURFACE_OF[b.surface]));
  check("and one the dungeon actually builds, so the limit can fire", [...L.BOMB_DEAD, ...L.SNARE_DEAD].every((g) => built.has(g)), `built: ${[...built].join(", ")}`);
  check("every surface the Din names is one some biome produces", L.SURFACES.every((g) => built.has(g)), L.SURFACES.filter((g) => !built.has(g)).join(", ") || "all of them");
  check("and most surfaces are dead to neither", L.SURFACES.filter((g) => L.bombCracks(g) && L.snareSets(g)).length >= 3, `${L.SURFACES.filter((g) => L.bombCracks(g) && L.snareSets(g)).length} of ${L.SURFACES.length}`);

  /** Each limit's prose and its function have to name the same surface. */
  const bombLimit = L.VERBS.find((v) => v.id === "bomb");
  const snareLimit = L.VERBS.find((v) => v.id === "snare");
  check("the bomb's sentence names the surface its function kills", /wet|water/.test(`${bombLimit?.limit} ${bombLimit?.signpost}`), bombLimit?.limit);
  check("and the snare's does too", /tile/.test(`${snareLimit?.limit} ${snareLimit?.signpost}`), snareLimit?.limit);
}

/**
 * THE SATCHEL THAT RESOLVES. An unknown consumable earns its slot only if
 * the bad outcome is interestingly dual-sided: "if the worst case is pure
 * loss, never drinking is correct play" - which is exactly what our four
 * cruel items were.
 */
{
  const cruel = L.ITEM_IDS.filter((id) => L.ITEMS[id].cruel);
  check("every cruel item in the catalogue has an affliction written for it", cruel.every((id) => L.AFFLICTIONS.some((a) => a.id === id)), cruel.filter((id) => !L.AFFLICTIONS.some((a) => a.id === id)).join(", ") || "all of them");
  check("and every affliction is of an item that exists", L.AFFLICTIONS.every((a) => L.ITEM_IDS.includes(a.id)));
  check("every one has a second edge", L.AFFLICTIONS.every((a) => a.edge.length > 12), L.AFFLICTIONS.filter((a) => a.edge.length <= 12).map((a) => a.id).join(", ") || "all of them");
  /**
   * And the penalty is a NAMED TASK cleared by playing, never a
   * subtraction. A flat cost is computed once and forgotten; a task makes
   * the player price their own current fragility.
   */
  check("and a named cure cleared by playing", L.AFFLICTIONS.every((a) => a.cure.length > 8 && a.clears && a.clears.count >= 1));
  check("no two afflictions are cleared the same way", new Set(L.AFFLICTIONS.map((a) => a.clears.kind)).size === L.AFFLICTIONS.length);
  check("identification resolves rather than gating the run", L.IDENTIFICATION_RESOLVES === true);
  check("and knowledge-checking is batched rather than priced", L.BATCH >= 2 && L.BATCH <= 4, `${L.BATCH} at a time`);

  /**
   * And what the table now costs the game to keep, rather than to state.
   * Every one of these is a fact the wiring reads: a table nothing asks
   * is a design document with a `.ts` extension.
   */
  check("every draught is an item, and no device is a draught", L.DRAUGHT_IDS.every((id) => L.ITEM_IDS.includes(id)) && L.DRAUGHT_IDS.every((id) => L.ITEMS[id].family !== "device" && L.ITEMS[id].family !== "bomb"));
  check("and every drinkable and readable kind is one", L.ITEM_IDS.filter((id) => L.ITEMS[id].family === "potion" || L.ITEMS[id].family === "scroll").every((id) => L.DRAUGHT_IDS.includes(id)), `${L.DRAUGHT_IDS.length} draughts`);
  check("naming every draught is a deed, because naming resolves", L.DEED_IDS.includes("everydraught"));
  check("and the deed is only finished by naming all of them", L.allDraughtsKnown(L.DRAUGHT_IDS) === true && L.allDraughtsKnown(L.DRAUGHT_IDS.slice(1)) === false);
  /**
   * Heavy legs are quiet legs, and the factor lives beside the one owner
   * of how far feet carry rather than in a second opinion about it.
   */
  check("the mire's other edge makes footfalls quieter, not louder", L.MIRE_LOUDNESS < 1 && L.MIRE_LOUDNESS > 0, `x${L.MIRE_LOUDNESS}`);
  check("and it is a fifth, which is the figure the table states", Math.abs(L.MIRE_LOUDNESS - 0.2) < 1e-9);
  /** Each cure names a thing the player does, never a thing they spend. */
  check("no cure is priced in gems, oil, lives or slots", L.AFFLICTIONS.every((a) => !/\bgem|\boil\b|\blife\b|\blives\b|\bpay\b|\bbuy\b|\bcost\b/i.test(a.cure)), L.AFFLICTIONS.map((a) => a.cure).join(" | "));
  check("and every cure is a place to be or a thing to do", L.AFFLICTIONS.every((a) => ["brazier", "containers", "floor", "pickup"].includes(a.clears.kind)));
}

/**
 * THE OFFER - what the meta layer is allowed to buy. Two unrelated
 * researches attacked six permanent shop-bought relics from opposite
 * directions, and the resolution is structural: the permanent layer buys
 * OPTIONS AND ODDS, never the run's power.
 */
{
  const O = Object.values(L.OFFERS);
  check("there are six offers, each with a price", O.length === 6 && O.every((o) => o.price > 0));
  /**
   * The design test: state the reward as a sentence about what the player
   * may now DO. If the only honest sentence is a number, it is a trifecta
   * affix - and our shipped six failed it four times over.
   */
  const numeric = O.filter((o) => /\d|%|quarter|half|twice|double|less|more|faster/.test(o.does));
  check("and not one of them is a number wearing a name", numeric.length === 0, numeric.map((o) => `${o.id}: ${o.does}`).join(" | ") || "none");
  check("every one is a sentence about what the player may now do", O.every((o) => /^You may /.test(o.does)), O.filter((o) => !/^You may /.test(o.does)).map((o) => o.id).join(", ") || "all of them");
  check("and every one is odds, options or an enabler - never power", O.every((o) => ["odds", "options", "enabler"].includes(o.kind)));
  check("at least one is an enabler that does nothing until the player has learned something", O.some((o) => o.kind === "enabler"));

  /**
   * A pair unlocks a third thing nobody can buy. The property worth
   * stealing is not the bonus - it is that a duo effect CANNOT BE
   * NUMERICALLY INFLATED, because its value is categorical.
   */
  check("relics pair up", L.PAIRS.length >= 2 && L.PAIRS.every((p) => p.of.length === 2));
  check("and every pair names two offers that exist", L.PAIRS.every((p) => p.of.every((id) => L.OFFER_IDS.includes(id))));
  check("no offer is in two pairs, so a pair is a choice", new Set(L.PAIRS.flatMap((p) => p.of)).size === L.PAIRS.length * 2);
  check("a pair pays only when both are held", L.pairFor([L.PAIRS[0].of[0]]).length === 0 && L.pairFor(L.PAIRS[0].of).length === 1);
  check("and no pair's payoff is a number either", L.PAIRS.every((p) => !/\d|%/.test(p.does)));

  /**
   * The reward mix declines with depth, with ZERO meta on the last floor.
   * Floor one may pay toward the next run; floor three pays only into this
   * one - which is also the answer to "why would I not just dive".
   */
  check("the meta share declines with depth", L.META_SHARE.every((v, i) => i === 0 || v <= L.META_SHARE[i - 1]), L.META_SHARE.join(" > "));
  check("and the last floor pays only into this run", L.metaShareOn(3) === 0, `${L.metaShareOn(3)}`);
  check("while the first pays a real share toward the next", L.metaShareOn(1) > 0.3, `${L.metaShareOn(1)}`);

  /** Escalation must be ELECTED as well as imposed. */
  check("difficulty can be elected, at a named price for a named payout", L.PACTS.length >= 3 && L.PACTS.every((p) => p.costs && p.pays && p.heat > 0));
  check("and every pact pays in the currency the run already uses", L.PACTS.every((p) => !/\bscore\b/.test(p.pays)));
}

/**
 * ROOMS AS TEMPLATES WITH SLOTS. Authored set pieces inside procedural
 * content are endorsed by the same document that names their cost - deja
 * vu, and "a spoiled edge" for veterans - and the shipped mitigation is
 * placement-time rewriting under the rule "In order to provide fun and
 * reduce spoiler effects, randomise."
 */
{
  const props = [
    { kind: "urn", x: -2, z: -2, slot: "vessel" },
    { kind: "urn", x: 2, z: -2, slot: "vessel" },
    { kind: "urn", x: 0, z: 2, slot: "vessel" },
    { kind: "chest", x: 0, z: 0, slot: "prize" },
    { kind: "pillar", x: 4, z: 4 },
  ];
  const rules = [
    { slot: "vessel", op: "subst", into: ["urn", "crate", "barrel"] },
    { slot: "prize", op: "nsubst", into: ["chest", "rubble"], n: 1 },
  ];
  const counts = { vessel: 3, prize: 1 };
  check("a template with two slots is many rooms rather than one", L.variantsOf(rules, counts) >= 3, `${L.variantsOf(rules, counts)} variants`);

  /**
   * And the claim the plan actually makes, stated as arithmetic: a
   * treasure chamber whose gem, chest and cracked wall each land in one of
   * three authored positions is not one room with three details - it is
   * twenty-seven rooms, from one authored room, and that attacks "23 of 34
   * rooms look different" at the root rather than by adding props.
   */
  const three = [
    { slot: "gem", op: "nsubst", into: ["crystal", "rubble"], n: 1 },
    { slot: "chest", op: "nsubst", into: ["chest", "rubble"], n: 1 },
    { slot: "crack", op: "nsubst", into: ["wall", "rubble"], n: 1 },
  ];
  const spread = L.variantsOf(three, { gem: 3, chest: 3, crack: 3 });
  check("three things in three authored spots each is nine rooms and more", spread >= 9, `${spread} rooms from one authored room`);
  check("and a template with no slots is honestly one", L.variantsOf([], {}) === 1);

  const out = L.resolveSlots(props, rules, "room-a");
  check("no placeholder survives resolution", out.every((p) => p.slot === undefined));
  check("and nothing is lost or gained on the way", out.length === props.length);
  check("the untouched prop is untouched", out[4].kind === "pillar" && out[4].x === 4);
  /**
   * SUBST is one draw for the whole room, so a room of urns is urns rather
   * than a mixture that reads as scatter.
   */
  const vessels = out.slice(0, 3).map((p) => p.kind);
  check("a substitution agrees with itself across the room", new Set(vessels).size === 1, vessels.join(", "));
  check("and it drew from the list it was given", ["urn", "crate", "barrel"].includes(vessels[0]), vessels[0]);
  /** The same room is the same room every time it is entered. */
  check("the same room resolves the same way twice", JSON.stringify(L.resolveSlots(props, rules, "room-a")) === JSON.stringify(out));
  check("and two rooms do not have to agree", [1,2,3,4,5,6,7,8].some((i) => JSON.stringify(L.resolveSlots(props, rules, `room-${i}`)) !== JSON.stringify(out)));

  /** The power spiral: never both harder and richer than peers at a depth. */
  check("a room may be richer than its peers, within a band", L.withinBand(1.5, 1) && !L.withinBand(3, 1));
  check("and a hoard looks enormous while being worth three gems", L.HOARD_LOOKS >= L.HOARD_PAYS * 6, `${L.HOARD_LOOKS} shown for ${L.HOARD_PAYS}`);
}

/**
 * THE WORLD. The fiction is read off the mechanics rather than painted on,
 * and the distribution rule is the law of three - every load-bearing fact
 * gets three carriers of three different kinds.
 */
{
  const F = L.FRAGMENTS;
  check("forty fragments", F.length === 40, `${F.length}`);
  check("in four shapes, ten of each", L.FRAGMENT_SHAPES.every((sh) => F.filter((f) => f.shape === sh).length === 10), L.FRAGMENT_SHAPES.map((sh) => `${sh}:${F.filter((f) => f.shape === sh).length}`).join(" "));
  check("every id is its own", new Set(F.map((f) => f.id)).size === F.length);
  check("and every one can be cut somewhere", F.every((f) => f.on.length > 0));
  /**
   * The rule for how a fragment is WRITTEN: never a sequence. A statement
   * about the place or a person survives being found in any order; a
   * statement about what happened next does not.
   */
  const sequenced = F.filter((f) => /\b(then|after|next|later|before)\b/i.test(f.text));
  check("no fragment contains then, after or next", sequenced.length === 0, sequenced.map((f) => f.id).join(", ") || "none");
  /** And nothing names a proper noun the player cannot see. */
  check("and none of them names the company, the seam or the year", F.every((f) => !/\b(18|19|20)\d\d\b/.test(f.text)));
  check("only one fragment points at another, and it is pinned to the first room", F.filter((f) => f.startOnly).length === 1);

  /** The law of three, held to being three DIFFERENT kinds of carrier. */
  check("every load-bearing fact has three carriers", L.TRIPLED.every((t) => t.text && t.object && t.rule));
  check("and each names a fragment that exists", L.TRIPLED.every((t) => F.some((f) => f.id === t.text)));
  check("and a rule the game actually holds", L.TRIPLED.every((t) => t.rule.length > 10));
  check("four facts tripled, which is as many as a twenty-minute run can carry", L.TRIPLED.length === 4);

  /**
   * ONE simulated variable with three values, taken deliberately half:
   * resampling teaches a generator's variation limits, and a twenty-minute
   * repeated run erodes precisely the effect the idea is for.
   */
  check("the seam ended one of three ways, and that is the only thing simulated", L.ENDINGS.length === 3);
  check("every ending favours fragments that exist", L.ENDINGS.every((e) => L.ENDING_OF[e].favours.every((id) => F.some((f) => f.id === id))));
  check("and the same seed draws the same ending", L.endingFor(7) === L.endingFor(7));
  check("while different seeds draw different ones", new Set([1,2,3,4,5,6].map(L.endingFor)).size === 3);

  /** Rooms tell stories in four props, never in an event. */
  check("every tableau is built from four ordinary objects", L.TABLEAUX.every((t) => t.props.length === 4), L.TABLEAUX.filter((t) => t.props.length !== 4).map((t) => t.id).join(", ") || "all of them");
  check("and says what it is for", L.TABLEAUX.every((t) => t.tells.length > 10));
  check("one of them points forwards rather than backwards", L.TABLEAUX.some((t) => t.ahead === true));
}

/**
 * THE LEDGER - knowledge as the progression, and the only currency a
 * twenty-minute run can honestly offer.
 */
{
  const LE = L.LEDGER_LESSONS;
  check("the ledger has lessons to record", LE.length >= 8, `${LE.length}`);
  check("every id is its own", new Set(LE.map((l) => l.id)).size === LE.length);
  /**
   * It records only what the player is 100% certain to have OBSERVED, and
   * makes no inferences on their behalf: "keeping track of what they've
   * learned should not be the challenging part of the game."
   */
  check("every lesson names a thing the delver actually did", LE.every((l) => l.observed.length > 20));
  check("and every entry is written in the first person, as a record", LE.every((l) => l.entry.length > 20));
  check("most of them let the player skip a step afterwards", LE.filter((l) => l.pays.length > 10).length >= LE.length - 1);
  /**
   * ENABLERS, never substitutes. A ledger entry that revealed secret walls
   * outright would delete the draft tell it was supposed to reward.
   */
  const draft = LE.find((l) => l.id === "draft");
  check("the draft entry only works on a draft the player felt themselves", !!draft && /you have felt|already/.test(draft.pays), draft?.pays);
  check("and one lesson deliberately pays nothing, which is the point of it", LE.some((l) => /^Nothing\./.test(l.pays)));
  check("recording is on observation only, and it is written down as a rule", L.RECORDED_ON_OBSERVATION_ONLY === true);
}


// --- The Deepworks, cut into the walls -------------------------------------
//
// Forty fragments and a run of thirty-four rooms. The corpus was written to
// survive being found in any order; this holds the placement to the two
// rules that make that true - a fragment is only ever cut somewhere it
// could have been cut, and nothing here ever sequences them.
{
  const kinds = L.ROOM_KINDS;
  // Every line has somewhere it can appear. A fragment whose `on` names
  // only surfaces no room offers is a line nobody will ever read.
  const stranded = L.FRAGMENTS.filter(
    (f) => !kinds.some((k) => f.on.some((sfc) => L.surfacesOf(k).includes(sfc)))
  );
  check("every fragment in the corpus has somewhere it can be cut", stranded.length === 0,
    stranded.map((f) => f.id).join(", ") || "none");

  // Every surface the corpus uses is one some room actually offers - the
  // mirror of the above, and the one that catches a surface invented in the
  // table and never mapped.
  const offered = new Set(kinds.flatMap((k) => L.surfacesOf(k)));
  const unmapped = [...new Set(L.FRAGMENTS.flatMap((f) => f.on))].filter((sfc) => !offered.has(sfc));
  check("and every surface the corpus names is one a room has", unmapped.length === 0,
    unmapped.join(", ") || "none");

  // What a run actually shows. Walked the way a run walks it.
  let rooms = 0;
  let carrying = 0;
  let cut = 0;
  let wrongPlace = 0;
  let startOnlyElsewhere = 0;
  const seen = new Set();
  const byEnding = new Map();
  for (let seed = 1; seed <= 120; seed++) {
    const ending = L.endingFor(seed);
    for (const [i, d] of runFloors(seed).entries()) {
      for (const room of d.rooms) {
        rooms++;
        const here = L.cutIn(room, d, i + 1);
        if (here.length) carrying++;
        cut += here.length;
        for (const c of here) {
          seen.add(c.fragment.id);
          byEnding.set(ending, (byEnding.get(ending) ?? new Set()).add(c.fragment.id));
          // Cut where it could have been cut, and nowhere else.
          if (!c.fragment.on.includes(c.surface)) wrongPlace++;
          if (!L.surfacesOf(room.kind).includes(c.surface)) wrongPlace++;
          // The one that names the wall belongs in the first start room.
          if (c.fragment.startOnly && !(i === 0 && room.id === d.startId)) startOnlyElsewhere++;
        }
      }
    }
  }
  check("a fragment is never cut on a surface its own line forbids", wrongPlace === 0, `${wrongPlace} of ${cut}`);
  check("and never on a surface the room does not have", wrongPlace === 0, `${cut} cuts`);
  check("the line that names the wall is only ever in the first start room",
    startOnlyElsewhere === 0, `${startOnlyElsewhere} out of place`);

  // Most rooms say nothing. A place that talks in every room is a place
  // nobody reads; a place that never talks has no fiction in it at all.
  const share = carrying / rooms;
  check("most rooms are silent, and some are not", share > 0.12 && share < 0.45,
    `${(share * 100).toFixed(0)}% of ${rooms} rooms carry something`);
  check("no room is a museum", cut / Math.max(1, carrying) <= L.MOST_PER_ROOM,
    `${(cut / Math.max(1, carrying)).toFixed(2)} per room that carries`);

  // The corpus is reachable. A line nothing ever draws is a line that was
  // written for nobody.
  check("across a hundred and twenty runs the whole corpus turns up",
    seen.size === L.FRAGMENTS.length, `${seen.size} of ${L.FRAGMENTS.length}`);

  // The ending weights, and does not filter. Three disjoint corpora would
  // put the planted contradiction out of reach of the runs that want it.
  const leaks = [...byEnding].map(([ending, ids]) => {
    const favours = new Set(L.ENDING_OF[ending].favours);
    return [ending, [...ids].filter((id) => !favours.has(id)).length];
  });
  check("an ending weights the corpus rather than filtering it",
    leaks.every(([, n]) => n > 10), leaks.map(([e, n]) => `${e}:${n}`).join(", "));

  // The same wall says the same thing every time you walk back past it.
  const d = runFloors(9)[0];
  const twice = d.rooms.map((r) => JSON.stringify(L.cutIn(r, d, 1)));
  const again = d.rooms.map((r) => JSON.stringify(L.cutIn(r, d, 1)));
  check("a wall says the same thing every time it is walked past",
    twice.join("|") === again.join("|"), `${twice.length} rooms`);

  // The names wall: the one tripled fact whose third leg is a rule that
  // was already there.
  check("the names wall is empty on the first run and grows after it",
    L.namesOn(0) === 0 && L.namesOn(1) === 1 && L.namesOn(7) === 7, "0, 1, 7");
  check("and stops being a spreadsheet", L.namesOn(400) === L.NAMES_SHOWN, `${L.namesOn(400)}`);
}

console.log(failures === 0 ? "\nAll layout checks passed." : `\n${failures} layout check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
