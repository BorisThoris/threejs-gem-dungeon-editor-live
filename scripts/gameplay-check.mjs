import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const root = fileURLToPath(new URL("..", import.meta.url)).replaceAll("\\", "/");
const temp = mkdtempSync(join(tmpdir(), "gameplay-check-"));
const entry = join(temp, "entry.ts"), out = join(temp, "bundle.mjs");
writeFileSync(entry, `import "${root}src/game/rooms/shipped";\n` + [
  "dungeon/generate", "dungeon/layout", "dungeon/footprint", "dungeon/types", "world", "worldbuilding/elevation",
  "player/combat", "traps/placement", "rooms/kinds", "rooms/placements", "rooms/templates", "props/specs", "warden/steer", "dungeon/arrival", "mobs/body", "mobs/ambient", "rooms/corridorPattern", "sentry/placement", "keeper/posts",
].map((f) => `export * from "${root}src/game/${f}";`).join("\n"));
await build({ entryPoints: [entry], outfile: out, bundle: true, platform: "node", format: "esm",
  jsx: "automatic", logLevel: "error", define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" } });
const L = await import(pathToFileURL(out).href);
const summary = [];
let landings = 0, trapChecks = 0, corridorChecks = 0, cornerRoutes = 0, galleryOcclusions = 0, arrivals = 0;
for (const floor of [1, 2, 3]) {
  let area = 0, wings = 0, rooms = 0, irregular = 0, galleries = 0, shifted = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const d = L.generateDungeon({ seed, floor });
    assert.deepEqual(d, L.generateDungeon({ seed, floor }), "same seed/depth reproduces architecture");
    assert.ok(L.shortestPath(d.rooms, d.startId, d.endId));
    for (const room of d.rooms) {
      const details = L.corridorDetails(room, d.seed);
      assert.deepEqual(details, L.corridorDetails(room, d.seed), "corridor landmarks persist on revisiting");
      if (!Object.keys(room.wings ?? {}).length) assert.equal(details.ribs.length + details.marks.length, 0);
      for (const block of details.ribs) {
        if (block.position[1] - block.size[1] / 2 >= L.GROUND_Y + L.DOOR_HEIGHT) continue;
        const dir = Math.abs(block.position[0]) > Math.abs(block.position[2])
          ? block.position[0] < 0 ? "west" : "east" : block.position[2] < 0 ? "north" : "south";
        const lateral = dir === "north" || dir === "south" ? 0 : 2;
        const lateralEdge = Math.abs(block.position[lateral] - L.corridorOffset(room, dir)) - block.size[lateral] / 2;
        assert.ok(lateralEdge >= L.wingWidthAt(room, dir, Math.abs(block.position[lateral === 0 ? 2 : 0])) / 2 - L.WALL_THICKNESS / 2 - 0.02,
          "low corridor ribs stay flush with walls and clear of the walking lane");
      }
      rooms++;
      area += L.floorRects(room).reduce((sum, r) => sum + r.width * r.depth, 0);
      wings += Object.keys(room.wings ?? {}).length;
      if (Object.keys(room.wings ?? {}).length > 1) irregular++;
      for (const dir of L.DIRS.filter((dir) => room.wings?.[dir] && !room.links[dir])) {
        galleries++;
        assert.notEqual(room.secret?.dir, dir, "galleries leave secret wall approaches unchanged");
        const axis = L.DIR_STEP[dir];
        const width = L.corridorWidth(room, dir);
        const shift = L.corridorOffset(room, dir);
        if (shift) shifted++;
        assert.ok(width > L.CORRIDOR_WIDTH, "deeper closed galleries widen beyond travel corridors");
        const middle = room.size / 2 + room.wings[dir] / 2;
        const middleWidth = L.wingWidthAt(room, dir, middle);
        const centreX = axis.x * middle + (axis.x ? 0 : shift), centreZ = axis.z * middle + (axis.x ? shift : 0);
        const edgeX = centreX + axis.z * (middleWidth / 2 - 1);
        const edgeZ = centreZ + axis.x * (middleWidth / 2 - 1);
        assert.ok(L.insideRoom(room, edgeX, edgeZ, 0.6), "widened gallery edges have walkable floor");
        assert.ok(L.roomSegmentClear(room, centreX, centreZ, edgeX, edgeZ, 0.6),
          "movement reaches the widened gallery edges");
        assert.ok(Math.abs(L.roomRayReach(centreX, centreZ, axis.z, axis.x, 20,
          L.wallEdges(room)) - middleWidth / 2) < 1e-8, "gallery side walls match their actual floor course");
        if (!room.template && ["normal", "treasure"].includes(room.kind)) {
          const gem = L.gemFor(room, d.seed);
          assert.deepEqual(gem, L.gemFor(room, d.seed), "gallery reward stays put on revisiting");
          assert.ok(axis.x * gem[0] + axis.z * gem[2] > room.size / 2 + 2,
            "the room reward gives a reason to explore its closed gallery");
          assert.ok(L.insideRoom(room, gem[0], gem[2], 1.1), "gallery reward clears its walls");
          assert.ok(L.roomSegmentClear(room, centreX, centreZ, gem[0], gem[2], 0.6),
            "gallery reward is reachable from the mouth without crossing a wall");
        }
        const distance = L.doorReach(room, dir) - 1;
        const target = { x: axis.x * distance + (axis.x ? 0 : shift), z: axis.z * distance + (axis.x ? shift : 0) };
        let x = 0, z = 0;
        for (let i = 0; i < 600 && Math.hypot(x - target.x, z - target.z) > 0.11; i++) {
          const distance = Math.hypot(target.x - x, target.z - z);
          [x, z] = L.roomStep(room, x, z, (target.x - x) / distance * 0.1, (target.z - z) / distance * 0.1);
        }
        assert.ok(Math.hypot(x - target.x, z - target.z) <= 0.11, "closed gallery is reachable from the chamber");
        assert.ok(!L.roomSegmentClear(room, x, z, target.x + axis.x * 2, target.z + axis.z * 2, 0.6), "closed gallery ends in a solid wall");
        // Search the room's actual floor instead of inventing a box corner.
        // A cross chamber has no diagonal corner, so radial scaling could pull
        // the old sample back into direct view and test a point the shape does
        // not mean to have. An occluded legal point marks a real bend.
        let hidden = null;
        findHidden: for (const rect of L.floorRects(room))
          for (let hx = rect.x - rect.width / 2 + 1; hx <= rect.x + rect.width / 2 - 1; hx += 1)
            for (let hz = rect.z - rect.depth / 2 + 1; hz <= rect.z + rect.depth / 2 - 1; hz += 1) {
              if (L.insideRoom(room, hx, hz, 0.6) && !L.roomSegmentClear(room, x, z, hx, hz, 0.6)) {
                hidden = { x: hx, z: hz }; break findHidden;
              }
          }
        if (hidden) {
          galleryOcclusions++;
          let gx = edgeX, gz = edgeZ;
          for (let i = 0; i < 1500 && Math.hypot(gx - hidden.x, gz - hidden.z) > 0.11; i++) {
            const heading = L.steerInRoom(room, gx, gz, hidden.x, hidden.z, [], 0);
            const step = Math.min(0.1, Math.hypot(gx - hidden.x, gz - hidden.z));
            const next = L.roomStep(room, gx, gz, heading.dx * step, heading.dz * step);
            assert.ok(L.roomSegmentClear(room, gx, gz, ...next, 0.6), "shifted-gallery pursuit stays on real floor");
            [gx, gz] = next;
          }
          assert.ok(Math.hypot(gx - hidden.x, gz - hidden.z) <= 0.11, "pursuers route out through an occluded gallery mouth");
        }
      }
      for (const dir of L.DIRS.filter((dir) => room.links[dir])) {
        assert.equal(L.corridorOffset(room, dir), 0, "linked travel entrances remain centred");
        const spawn = L.spawnAfterTravel(room, L.OPPOSITE[dir]).position;
        assert.ok(L.insideRoom(room, spawn[0], spawn[2], L.PLAYER_CAPSULE_RADIUS), "arrival is on walkable floor");
        landings++;
        for (const body of ["ground", "flying"]) {
          const key = d.keyRoomId === room.id ? L.keyFor(room, d.seed) : null;
          const watcher = L.sentryFor(room, d.seed, floor, key ? [key] : []);
          const blockers = [...L.obstaclesFor(body, room, d.seed, [], [], watcher?.at ?? null), ...L.bitesFor(body, room, d.seed, [])];
          for (const player of [{ x: 0, z: 0 }, { x: spawn[0], z: spawn[2] }]) {
            const at = L.encounterArrival(room, dir, player, blockers);
            assert.ok(L.insideRoom(room, at.x, at.z, 0.6), "arrival stays on the actual room floor");
            assert.ok(Math.hypot(at.x - player.x, at.z - player.z) >= L.ENCOUNTER_CLEARANCE,
              `arrival gives player breathing room: seed ${seed} floor ${floor} room ${room.id}`);
            assert.ok(blockers.every((p) => Math.hypot(at.x - p.x, at.z - p.z) > p.r + 0.6), "arrival avoids furniture and hazards");
            for (const entrance of L.DIRS.filter((other) => room.links[other])) {
              const landing = L.spawnAfterTravel(room, L.OPPOSITE[entrance]).position;
              assert.ok(Math.hypot(at.x - landing[0], at.z - landing[2]) >= L.ENCOUNTER_CLEARANCE, `all entrances remain clear of arriving threats: seed ${seed} floor ${floor} ${room.id} ${room.shape} size ${room.size} at ${JSON.stringify(at)} landing ${landing}`);
            }
            arrivals++;
          }
        }
        const door = L.doorPosition(room, dir);
        const edge = L.wallEdges(room).find((e) => e.x === door[0] && e.z === door[2]);
        assert.ok(edge && edge.length >= L.DOOR_WIDTH, "every portal has a matching physical wall opening");
        if (room.wings?.[dir]) {
          // Walk the new corridor into its chamber at actual movement-step scale.
          let x = spawn[0], z = spawn[2];
          for (let i = 0; i < 500 && Math.hypot(x, z) > 0.1; i++) {
            const dist = Math.hypot(x, z), step = Math.min(0.1, dist);
            [x, z] = L.roomStep(room, x, z, -x / dist * step, -z / dist * step);
          }
          assert.ok(Math.hypot(x, z) <= 0.11, "ground creatures can follow through a wing");
          corridorChecks++;
          const diagonal = (L.floorReach(room, Math.PI / 4) - 1.5) / Math.SQRT2;
          const targets = [[diagonal, diagonal], ...L.DIRS
            .filter((other) => other !== dir && room.wings?.[other])
            .map((other) => {
              const axis = L.DIR_STEP[other], along = L.doorReach(room, other) - 2, shift = L.corridorOffset(room, other);
              return [axis.x * along + (axis.x ? 0 : shift), axis.z * along + (axis.x ? shift : 0)];
            })];
          for (const [tx, tz] of targets) {
            assert.ok(L.insideRoom(room, tx, tz, 0.6), "pursuit target is on the actual gallery floor");
            x = spawn[0]; z = spawn[2];
            for (let i = 0; i < 1500 && Math.hypot(tx - x, tz - z) > 0.11; i++) {
              const heading = L.steerInRoom(room, x, z, tx, tz, [], 0);
              const step = Math.min(0.1, Math.hypot(tx - x, tz - z));
              const [nx, nz] = L.roomStep(room, x, z, heading.dx * step, heading.dz * step);
              assert.ok(L.roomSegmentClear(room, x, z, nx, nz, 0.6), "pursuer never crosses a corner wall");
              x = nx; z = nz;
            }
            assert.ok(Math.hypot(tx - x, tz - z) <= 0.11, "pursuer reaches off-axis chamber and adjacent wings");
            cornerRoutes++;
          }
        }
        const traps = L.trapsFor(room, d.seed, d.endId).filter((t) => t.kind !== "grate");
        const gem = L.gemFor(room, d.seed);
        const spikes = room.kind === "trap" && gem ? L.trapHazards(room, gem).map(([x, , z]) => ({ x, z })) : [];
        for (const t of [...traps, ...spikes]) {
          assert.ok(Math.hypot(t.x - spawn[0], t.z - spawn[2]) > 3, "landing has breathing room from damaging traps");
          trapChecks++;
        }
      }
      // Every boundary separates floor from void, including re-entrant corners.
      for (const e of L.wallEdges(room)) {
        const v = L.DIR_STEP[e.dir];
        assert.ok(L.insideRoom(room, e.x - v.x * 0.1, e.z - v.z * 0.1));
        assert.ok(!L.insideRoom(room, e.x + v.x * 0.1, e.z + v.z * 0.1));
        assert.ok(Math.abs(L.roomRayReach(e.x - v.x * 0.25, e.z - v.z * 0.25, v.x, v.z, 10, L.wallEdges(room)) - 0.25) < 1e-8,
          "watcher beam stops at the first physical wall");
      }
    }
  }
  summary.push({ floor, rooms, meanArea: Math.round(area / rooms), wings, irregular, galleries, shifted });
}
assert.ok(summary[1].meanArea > summary[0].meanArea && summary[2].meanArea > summary[1].meanArea);
assert.ok(summary[2].wings > summary[1].wings && summary[1].wings > summary[0].wings);
assert.ok(summary[2].irregular > summary[1].irregular);
assert.equal(summary[0].galleries, 0, "first floor keeps simpler travel passages");
assert.ok(summary[1].galleries > 0 && summary[2].galleries > summary[1].galleries, "deeper floors add more side galleries");
assert.ok(L.inShoveArc(0, -2, 0, -1));
assert.ok(!L.inShoveArc(0, 2, 0, -1));
assert.ok(!L.inShoveArc(0, -3.1, 0, -1));
assert.ok(!L.inShoveArc(2, 0, 0, -1));
const chamber = L.generateDungeon({ seed: 11 }).rooms[0];
const originalTemplate = L.allTemplates()[0];
try {
  L.registerTemplate({ ...originalTemplate, props: [{ kind: "crate", x: 0, z: 0, scale: 4 },
    { kind: "pillar", x: 5, z: 0, scale: 0.25 }], slots: [] });
  const scaledRoom = { ...chamber, kind: "normal", links: {}, secret: undefined, size: 24, template: originalTemplate.id };
  const ground = L.obstaclesFor("ground", scaledRoom, 11, []), flying = L.obstaclesFor("flying", scaledRoom, 11, []);
  assert.equal(ground.length, 2, "ground mobs avoid both scaled solid props");
  assert.ok(ground.some((p) => Math.abs(p.r - (L.PROP_SPECS.crate.radius * 4 + 0.35)) < 1e-9), "steering keeps the full enlarged crate footprint");
  assert.equal(flying.length, 1, "flying mobs avoid the tall enlarged crate and clear the shortened pillar");
  assert.ok(Math.abs(flying[0].r - (L.PROP_SPECS.crate.radius * 4 + 0.35)) < 1e-9);
} finally { L.registerTemplate(originalTemplate); }
for (const [kind, count] of [["arena", 1], ["memory", 4], ["challenge", 1]]) {
  const room = { ...chamber, kind, size: 24, template: undefined };
  const ground = L.obstaclesFor("ground", room, 11, []), flying = L.obstaclesFor("flying", room, 11, []);
  assert.equal(ground.length - flying.length,
    L.placementsFor(room, 11).filter((p) => L.PROP_SPECS[p.kind].solid && L.clearedInFlight(L.PROP_SPECS[p.kind], p.scale ?? 1)).length + count,
    `${kind} built-in colliders block ground creatures while low fixtures remain flyable`);
}
assert.ok(!L.clearShove(chamber, { x: 0, z: 0 }, { x: 0, z: -2 }, [{ kind: "pillar", x: 0, z: -1 }]));
for (const body of ["ground", "flying"]) {
  const room = { ...chamber, kind: "normal", size: 24, template: undefined };
  const post = L.obstaclesFor(body, room, 11, [], [], [0, 0, 0]).find((p) => p.x === 0 && p.z === 0);
  assert.ok(post, `${body} navigation includes the watcher post`);
  let x = -3, z = 0;
  for (let i = 0; i < 600 && Math.hypot(x - 3, z) > 0.2; i++) {
    const direction = L.steerInRoom(room, x, z, 3, 0, [post], 0.15);
    [x, z] = L.roomStep(room, x, z, direction.dx * 0.05, direction.dz * 0.05);
    assert.ok(Math.hypot(x, z) >= post.r, `${body} routes outside the watcher collider`);
  }
  assert.ok(Math.hypot(x - 3, z) <= 0.2, `${body} reaches the far side of the watcher`);
  assert.deepEqual(L.obstaclesFor("ghost", room, 11, [], [], [0, 0, 0]), [], "ghosts still ignore watcher bodies");
}
assert.ok(L.clearShove(chamber, { x: 0, z: 0 }, { x: 0, z: -2 }, []));
assert.ok(!L.clearShove(chamber, { x: 0, z: 0 }, { x: 0, z: -2 }, [], [0, 0, -1]), "watcher post blocks a shove through its body");
assert.ok(L.clearShove(chamber, { x: 0, z: 0 }, { x: 0, z: -2 }, [], [0.3, 0, -1]), "a shove passing beside the watcher remains clear");
for (const kind of ["table", "chest", "crate", "chair", "barrel"]) {
  assert.ok(L.clearShove(chamber, { x: 0, z: 0 }, { x: 0, z: -2 }, [{ kind, x: 0, z: -1 }]),
    `shove reaches above low ${kind} furniture`);
}
for (const kind of ["bookshelf", "statue", "wall"]) {
  assert.ok(!L.clearShove(chamber, { x: 0, z: 0 }, { x: 0, z: -2 }, [{ kind, x: 0, z: -1 }]),
    `tall ${kind} furniture still provides cover against a shove`);
}
assert.ok(!L.clearShove(chamber, { x: 0, z: 0 }, { x: 0, z: -2 }, [{ kind: "crate", x: 0, z: -1, scale: 2 }]),
  "scaled furniture can grow into the hand's path");
const crossRoom = { ...chamber, size: 20, wings: { north: 10, east: 10 } };
assert.ok(L.insideRoom(crossRoom, 0, -18, 0.6) && L.insideRoom(crossRoom, 18, 0, 0.6));
assert.ok(!L.roomSegmentClear(crossRoom, 0, -18, 18, 0, 0.6), "inside endpoints cannot tunnel through void");
assert.ok(L.insideRoom(crossRoom, 3.3, -10.8) && L.insideRoom(crossRoom, 4.2, -9.8));
assert.ok(!L.roomSegmentClear(crossRoom, 3.3, -10.8, 4.2, -9.8), "nearby bodies across a corner have no attack line");
assert.ok(!L.clearShove(crossRoom, { x: 3.49, z: -10.102 }, { x: 3.52, z: -9.802 }, []),
  "even a narrow corner crossing blocks a shove between floor points");
const swept = L.roomStep(crossRoom, 0, -18, 18, 18);
assert.ok(L.roomSegmentClear(crossRoom, 0, -18, ...swept, 0.6));
assert.ok(summary[1].shifted > 0 && summary[2].shifted > 0, "deeper floors contain genuinely asymmetric galleries");
assert.ok(galleryOcclusions > 0, "closed galleries create real occluded chamber positions where their shapes allow it");
console.log("PASS geometry", JSON.stringify({ summary, landings, trapChecks, corridorChecks, cornerRoutes, galleryOcclusions, arrivals }));
if (process.argv.includes("--geometry-only")) process.exit(0);

const softwareGL = process.env.SOFTWARE_GL === "1" || process.platform !== "win32";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox", ...(softwareGL ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [])] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    localStorage.setItem("gem-dungeon.settings", JSON.stringify({ touchControls: "on", cameraBob: false }));
    window.testPad = null;
    navigator.getGamepads = () => window.testPad ? [window.testPad] : [];
  });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5198"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  assert.match(await page.locator('[data-testid="hud-gems"]').innerText(), /explore for gems/);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__run.getState().shoveReadyAt > window.__derived.clock());
  await page.waitForFunction(() => document.querySelector('[data-testid="shove-status"]')?.textContent.includes("recovering"));
  assert.match(await page.locator('[data-testid="shove-status"]').innerText(), /recovering/);
  console.log("PASS keyboard shove and recovery feedback");
  await page.evaluate(() => window.__run.setState({ shoveReadyAt: 0 }));
  await page.locator('[data-testid="touch-shove"]').dispatchEvent("pointerdown", { pointerType: "touch" });
  await page.waitForFunction(() => window.__run.getState().shoveReadyAt > window.__derived.clock());
  console.log("PASS touch shove");
  await page.evaluate(() => {
    window.__run.setState({ shoveReadyAt: 0 });
    window.testPad = { id: "test", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 7, touched: i === 7, value: i === 7 ? 1 : 0 })) };
  });
  await page.waitForFunction(() => window.__run.getState().shoveReadyAt > window.__derived.clock());
  console.log("PASS controller RT shove");
  await page.evaluate(() => { window.testPad = null; });
  await page.evaluate(() => window.__run.setState({ paused: true, shoveReadyAt: 0, gems: 10, thiefPhase: "stalking" }));
  await page.waitForFunction(() => document.querySelector('[data-testid="shove-status"]')?.textContent.includes("SHOVE button"));
  assert.match(await page.locator('[data-testid="hud-cutpurse"]').innerText(), /face it and shove/);
  assert.match(await page.locator('[data-testid="hud-gems"]').innerText(), /find the stairs/);
  await page.evaluate(() => {
    const s = window.__run.getState();
    const doorway = s.dungeon.rooms.find((r) => Object.values(r.links).includes(s.dungeon.endId));
    window.__run.setState({ visited: [...s.visited, doorway.id], thiefPhase: "fleeing", thiefHolding: 1, thiefKey: true });
  });
  assert.match(await page.locator('[data-testid="hud-cutpurse"]').innerText(), /1 stolen gem and your iron key.*catch or shove it to recover/);
  assert.match(await page.locator('[data-testid="hud-gems"]').innerText(), /return to the stairs/);
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  assert.equal(await page.locator('[data-testid="hud-cutpurse"]').count(), 0, "chase guidance clears on a fresh run");
  console.log("PASS exploration objective, known stairs, theft recovery and touch shove guidance");
  await page.evaluate(() => window.__run.setState({ floor: 2, satchel: [] }));
  await page.waitForFunction(() => document.querySelector('[data-testid="hud-prepare"]')?.textContent.includes("shop 2 gems beyond the toll"));
  await page.evaluate(() => window.__run.getState().takeItem("bomb", "shop"));
  await page.waitForFunction(() => document.querySelector('[data-testid="hud-prepare"]')?.textContent.includes("bomb packed"));
  await page.evaluate(() => window.__run.setState({ floor: 3, gems: 0 }));
  await page.waitForFunction(() => document.querySelector('[data-testid="hud-keeper"]')?.textContent.includes("gather 7 gems before lighting the bomb"));
  await page.evaluate(() => window.__run.setState({ floor: 1, satchel: [] }));
  console.log("PASS pre-descent bomb preparation and live packed-bomb guidance");
  const combat = await page.evaluate(async () => {
    const { harrierAt } = await import("/src/game/mobs/harrierRoost.ts");
    const { wardenAt } = await import("/src/game/warden/position.ts");
    const { playerAt } = await import("/src/game/player/where.ts");
    const { cutpurseAt } = await import("/src/game/thief/position.ts");
    const run = window.__run, id = run.getState().currentRoomId;
    const reset = () => run.setState({ shoveReadyAt: 0, harrierRetreatUntil: 0, wardenStaggerUntil: 0, wardenWounds: 0,
      wardenRoomId: id, harrierAwake: true, harrierSlain: false });
    Object.assign(playerAt, { x: 0, z: 0 });
    Object.assign(harrierAt, { x: 0, z: -2, roomId: id, away: false, down: false });
    Object.assign(wardenAt, { x: 0, z: -2, roomId: id });
    reset();
    const hit = run.getState().shove(0, -1);
    const retreated = run.getState().harrierRetreatUntil > window.__derived.clock();
    const staggered = run.getState().wardenStaggerUntil > window.__derived.clock();
    const noWounds = run.getState().wardenWounds === 0;
    const cooldown = !run.getState().shove(0, -1);
    reset();
    run.getState().shove(0, 1);
    const behindMiss = run.getState().harrierRetreatUntil === 0 && run.getState().wardenStaggerUntil === 0;
    reset();
    run.setState({ paused: true });
    const paused = !run.getState().shove(0, -1) && run.getState().shoveReadyAt === 0;
    Object.assign(cutpurseAt, { x: 0, z: -2, roomId: id });
    run.setState({ paused: false, harrierAwake: false, wardenRoomId: null, thiefPhase: "fleeing", thiefHolding: 2, thiefKey: false,
      shoveReadyAt: 0, gems: 1 });
    run.getState().shove(0, -1);
    const recovered = run.getState().thiefPhase === "away" && run.getState().gems === 3 && run.getState().thiefHolding === 0;
    run.getState().startRun(11);
    return { hit, retreated, staggered, noWounds, cooldown, behindMiss, paused, recovered };
  });
  assert.ok(Object.values(combat).every(Boolean), JSON.stringify(combat));
  console.log("PASS combat range, facing, retreat, stagger, stolen-gem recovery, cooldown and pause guards");
  const immuneDungeon = L.generateDungeon({ seed: 41, floor: 3 });
  const immunePost = immuneDungeon.rooms.find((r) => Object.values(r.links).includes(immuneDungeon.endId));
  const immuneShoves = await page.evaluate(async ({ dungeon, roomId }) => {
    const { keeperPostPosition } = await import("/src/game/keeper/posts.ts");
    const { playerAt } = await import("/src/game/player/where.ts");
    const { reaperAt } = await import("/src/game/reaper/position.ts");
    const { harrierAt } = await import("/src/game/mobs/harrierRoost.ts");
    const { DIR_STEP } = await import("/src/game/dungeon/types.ts");
    const room = dungeon.rooms.find((r) => r.id === roomId);
    const dir = Object.keys(room.links).find((d) => room.links[d] === dungeon.endId);
    const post = keeperPostPosition(room, dir), axis = DIR_STEP[dir], run = window.__run;
    run.setState({ dungeon, floor: 3, currentRoomId: roomId, transitioning: false, paused: false, inputLocks: 0,
      wardenRoomId: null, harrierAwake: false, thiefPhase: "away", reaperAwake: false, shoveReadyAt: 0 });
    Object.assign(playerAt, { x: post.x - axis.x * 2, z: post.z - axis.z * 2 });
    let notice = "";
    const off = window.__bus.on("notice", (line) => { notice = line; });
    run.getState().shove(axis.x, axis.z);
    const keeper = { notice, stalled: window.__derived.keeper().stalled };
    Object.assign(reaperAt, { ...post, roomId });
    run.setState({ reaperAwake: true, shoveReadyAt: 0 });
    run.getState().shove(axis.x, axis.z);
    const reaper = { notice, stalled: window.__derived.reaper().stalled };
    Object.assign(harrierAt, { ...post, roomId, away: false, down: false });
    run.setState({ harrierAwake: true, harrierSlain: false, shoveReadyAt: 0, harrierRetreatUntil: 0 });
    run.getState().shove(axis.x, axis.z);
    const mixed = { notice, retreat: run.getState().harrierRetreatUntil > window.__derived.clock() };
    off();
    reaperAt.roomId = null;
    run.getState().startRun(11);
    return { keeper, reaper, mixed };
  }, { dungeon: immuneDungeon, roomId: immunePost.id });
  assert.match(immuneShoves.keeper.notice, /cannot move the Keeper.*Gather the toll.*bomb/);
  assert.equal(immuneShoves.keeper.stalled, false, "shoving the Keeper grants no escape window");
  assert.match(immuneShoves.reaper.notice, /pass through the Reaper.*Sprint/);
  assert.equal(immuneShoves.reaper.stalled, false, "shoving the Reaper grants no hold");
  assert.ok(immuneShoves.mixed.retreat && immuneShoves.mixed.notice.includes("Move while it recoils"),
    "a successful shove against another threat takes priority over immunity feedback");
  console.log("PASS immune shove feedback and unchanged Keeper and Reaper counterplay");
  const watchedDungeon = L.generateDungeon({ seed: 11, floor: 3 });
  const watchedRoom = watchedDungeon.rooms.find((r) => r.kind === "normal" && L.sentryFor(r, watchedDungeon.seed, 3,
    watchedDungeon.keyRoomId === r.id ? [L.keyFor(r, watchedDungeon.seed)] : []));
  assert.ok(watchedRoom, "a generated room has a real watcher for shove cover");
  const watcherCover = await page.evaluate(async ({ dungeon, roomId }) => {
    const { playerAt } = await import("/src/game/player/where.ts");
    const { harrierAt } = await import("/src/game/mobs/harrierRoost.ts");
    const { sentryFor } = await import("/src/game/sentry/placement.ts");
    const { keyFor } = await import("/src/game/rooms/kinds.ts");
    const run = window.__run, room = dungeon.rooms.find((r) => r.id === roomId);
    const key = dungeon.keyRoomId === roomId ? keyFor(room, dungeon.seed) : null;
    const post = sentryFor(room, dungeon.seed, 3, key ? [key] : []).at;
    run.setState({ dungeon, currentRoomId: roomId, floor: 3, transitioning: false, paused: false, inputLocks: 0,
      wardenRoomId: null, thiefPhase: "away", harrierAwake: true, harrierSlain: false, broken: [] });
    let notice = "";
    const off = window.__bus.on("notice", (line) => { notice = line; });
    const shove = (offset) => {
      Object.assign(playerAt, { x: post[0] - 0.9, z: post[2] + offset });
      Object.assign(harrierAt, { x: post[0] + 0.9, z: post[2] + offset, roomId, away: false, down: false });
      run.setState({ shoveReadyAt: 0, harrierRetreatUntil: 0 });
      run.getState().shove(1, 0);
      return { retreat: run.getState().harrierRetreatUntil > window.__derived.clock(), notice };
    };
    const blocked = shove(0), beside = shove(0.5);
    off();
    run.getState().startRun(11);
    return { blocked, beside };
  }, { dungeon: watchedDungeon, roomId: watchedRoom.id });
  assert.ok(!watcherCover.blocked.retreat, "shove cannot reach the Harrier through a watcher post");
  assert.match(watcherCover.blocked.notice, /blocked by solid cover/);
  assert.ok(watcherCover.beside.retreat, "stepping beside the post restores shove counterplay");
  console.log("PASS watcher cover blocks shoves with actionable feedback; stepping aside reaches the threat");
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  // A real rendered wing: walk from its landing back into the furnished chamber.
  const wing = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { spawnAfterTravel } = await import("/src/game/dungeon/layout.ts");
    const { OPPOSITE } = await import("/src/game/dungeon/types.ts");
    const dungeon = generateDungeon({ seed: 41, floor: 3 });
    const room = dungeon.rooms.find((r) => r.wings?.north);
    window.__run.setState({ dungeon, currentRoomId: room.id, floor: 3, transitioning: true, wardenRoomId: null,
      harrierAwake: false, reaperAwake: false, inputLocks: 0, enteredBy: "north", glim: 3 });
    const spawn = spawnAfterTravel(room, OPPOSITE.north);
    return { roomId: room.id, half: room.size / 2, spawn };
  });
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(({ spawn }) => {
    window.__bus.emit("teleport", { position: spawn.position });
    window.__bus.emit("lookSet", { yaw: spawn.yaw, pitch: 0 });
  }, wing);
  await page.waitForTimeout(700);
  if (process.env.GAMEPLAY_SCREENSHOT) await page.screenshot({ path: process.env.GAMEPLAY_SCREENSHOT });
  await page.keyboard.down("KeyW");
  await page.waitForFunction((half) => window.__playerDebug.z > -half + 0.5, wing.half, { timeout: 20000 });
  await page.keyboard.up("KeyW");
  console.log("PASS physical corridor traversal into chamber");
  let galleryFixture;
  for (let seed = 1; seed <= 120 && !galleryFixture; seed++) {
    const dungeon = L.generateDungeon({ seed, floor: 3 });
    const room = dungeon.rooms.find((r) => r.wings?.north && !r.links.north && !r.wingProfiles?.north && L.corridorOffset(r, "north") > 1
      && ["normal", "treasure"].includes(r.kind));
    if (room) galleryFixture = { dungeon, roomId: room.id, half: room.size / 2,
      reach: L.doorReach(room, "north"), width: L.corridorWidth(room, "north"), shift: L.corridorOffset(room, "north"),
      gem: L.gemFor(room, dungeon.seed) };
  }
  assert.ok(galleryFixture, "a rendered closed north gallery exists");
  await page.evaluate(({ dungeon, roomId }) => {
    window.__run.setState({ dungeon, currentRoomId: roomId, floor: 3, transitioning: true,
      wardenRoomId: null, harrierAwake: false, thiefPhase: "away", reaperAwake: false, enteredBy: null,
      gemRooms: [], visited: [roomId] });
  }, galleryFixture);
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(({ half }) => {
    window.__bus.emit("teleport", { position: [0, 1.5, -half + 1] });
    window.__bus.emit("lookSet", { yaw: 0, pitch: 0 });
  }, galleryFixture);
  await page.waitForTimeout(300);
  const mapGallery = await page.evaluate((roomId) => {
    const room = document.querySelector(`[data-testid="map-room"][data-room-id="${roomId}"]`);
    const footprint = room?.querySelector('[data-testid="map-room-footprint"]');
    const bounds = footprint?.getBBox();
    return { slabs: footprint?.querySelector("path")?.getAttribute("d").match(/M /g)?.length ?? 0,
      width: bounds?.width, height: bounds?.height, links: room?.querySelectorAll("line").length,
      playerHeight: document.querySelector('[data-testid="map-player"]')?.getBoundingClientRect().height,
      unknownOutlines: document.querySelectorAll('[data-map-state="known"] [data-testid="map-room-footprint"]').length };
  }, galleryFixture.roomId);
  assert.equal(mapGallery.slabs, L.floorRects(galleryFixture.dungeon.rooms.find((r) => r.id === galleryFixture.roomId)).length,
    "visited map room includes every travel wing and closed gallery");
  assert.ok(mapGallery.width <= 26.001 && mapGallery.height <= 26.001, "room outlines fit their map cells");
  assert.equal(mapGallery.links, Object.keys(galleryFixture.dungeon.rooms.find((r) => r.id === galleryFixture.roomId).links).length,
    "a closed gallery does not become a map travel connection");
  assert.equal(mapGallery.unknownOutlines, 0, "unexplored rooms do not reveal their internal layouts");
  assert.ok(mapGallery.playerHeight > 7 && mapGallery.playerHeight < 13,
    "corridor room marker remains visible without covering the smaller chamber outline");
  if (process.env.GAMEPLAY_GALLERY_SCREENSHOT) await page.screenshot({ path: process.env.GAMEPLAY_GALLERY_SCREENSHOT });
  console.log("PASS visited minimap footprints, cell bounds, closed galleries and unexplored layout privacy");
  await page.keyboard.down("KeyW");
  await page.waitForFunction((reach) => window.__playerDebug.z < -reach + 1, galleryFixture.reach, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.keyboard.up("KeyW");
  const landingY = await page.evaluate(() => window.__playerDebug.y);
  const galleryRoom = galleryFixture.dungeon.rooms.find(r => r.id === galleryFixture.roomId);
  const terrace = L.terracesFor(galleryRoom).find(t => t.dir === "north");
  assert.ok(terrace && Math.abs(landingY - L.PLAYER_REST_Y - terrace.height) < 0.15,
    `physical ramp reaches its raised landing: ${landingY}`);
  assert.ok(await page.evaluate(({ reach, roomId }) => window.__playerDebug.z > -reach
    && window.__run.getState().currentRoomId === roomId, galleryFixture),
    "gallery end wall stops the player without room travel");
  await page.keyboard.down("KeyD");
  await page.waitForFunction((width) => window.__playerDebug.x > width / 2 + 0.35, galleryFixture.width, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.keyboard.up("KeyD");
  assert.ok(await page.evaluate(({ width, shift, roomId }) => window.__playerDebug.x < width / 2 + shift
    && window.__playerDebug.y > 0.8 && window.__run.getState().currentRoomId === roomId, galleryFixture),
    "player walks beyond the old gallery width and stops at the new solid side wall");
  console.log("PASS physical widened side-gallery traversal and solid end and side walls");
  await page.keyboard.down("KeyA");
  await page.waitForFunction((gem) => window.__playerDebug.x < gem[0] + 0.45, galleryFixture.gem, { timeout: 20000 });
  await page.keyboard.up("KeyA");
  await page.keyboard.down("KeyS");
  await page.waitForFunction((gem) => window.__playerDebug.z > gem[2] - 0.45, galleryFixture.gem, { timeout: 20000 });
  await page.keyboard.up("KeyS");
  await page.waitForFunction((roomId) => window.__run.getState().gemRooms.includes(roomId), galleryFixture.roomId);
  assert.equal(await page.evaluate((roomId) => window.__run.getState().collectGem(roomId), galleryFixture.roomId), false,
    "a gallery gem remains the room's single reward and cannot be collected twice");
  console.log("PASS physical gallery gem pickup and single room reward");
  await page.keyboard.down("KeyS");
  await page.waitForFunction(half => window.__playerDebug.z > -half + 1, galleryFixture.half, { timeout: 20000 });
  await page.keyboard.up("KeyS");
  await page.waitForTimeout(500);
  assert.ok(Math.abs(await page.evaluate(() => window.__playerDebug.y) - L.PLAYER_REST_Y) < 0.15,
    "walking down the ramp returns to the chamber floor");
  console.log("PASS real ramp ascent, elevated reward and descent to the chamber floor");
  let sightFixture;
  for (let seed = 1; seed <= 300 && !sightFixture; seed++) {
    const dungeon = L.generateDungeon({ seed, floor: 3 });
    for (const room of dungeon.rooms.filter((r) => r.kind === "normal")) {
      const sentry = L.sentryFor(room, seed, 3);
      if (!sentry) continue;
      for (const dir of L.DIRS.filter((dir) => room.wings?.[dir])) {
        const axis = L.DIR_STEP[dir], target = [axis.x * (room.size / 2 + 1), 1.5, axis.z * (room.size / 2 + 1)];
        const dx = target[0] - sentry.at[0], dz = target[2] - sentry.at[2];
        if (Math.hypot(dx, dz) < L.SENTRY_RANGE - 0.5 && !L.roomSegmentClear(room, sentry.at[0], sentry.at[2], target[0], target[2])) {
          sightFixture = { dungeon, roomId: room.id, target, bearing: Math.atan2(dx, dz), distance: Math.hypot(dx, dz) }; break;
        }
      }
    }
  }
  assert.ok(sightFixture, "a watcher and player can stand across a corridor corner within beam range");
  await page.evaluate(({ dungeon, roomId }) => {
    delete window.__sentry;
    window.__run.setState({ dungeon, currentRoomId: roomId, floor: 3, transitioning: true, floorRooms: 0, alarm: 0,
      wardenRoomId: null, harrierAwake: false, thiefPhase: "away", reaperAwake: false, noisyUntil: 0 });
  }, sightFixture);
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(({ target }) => window.__bus.emit("teleport", { position: target }), sightFixture);
  await page.waitForFunction(({ bearing, distance, halfAngle }) => {
    const s = window.__sentry;
    if (!s) return false;
    const angle = Math.atan2(Math.sin(s.facing - bearing), Math.cos(s.facing - bearing));
    return Math.abs(s.distance - distance) < 0.2 && Math.abs(angle) < halfAngle * 0.25;
  }, { ...sightFixture, halfAngle: L.SENTRY_HALF_ANGLE }, { timeout: 20000 });
  assert.ok(await page.evaluate(() => !window.__sentry.inside && window.__sentry.lit === 0),
    "watcher looks directly toward the player within range but the corner blocks acquisition");
  console.log("PASS watcher does not acquire through a corridor wall");
  let roostFixture;
  for (let seed = 1; seed <= 300 && !roostFixture; seed++) {
    const dungeon = L.generateDungeon({ seed, floor: 1 });
    for (const room of dungeon.rooms.filter((r) => r.kind === "normal")) {
      const at = L.roostFor(room, seed);
      if (at && L.trapsFor(room, seed, dungeon.endId).length === 0) { roostFixture = { dungeon, roomId: room.id, at }; break; }
    }
  }
  assert.ok(roostFixture, "a quiet live roost fixture exists");
  await page.evaluate(({ dungeon, roomId }) => {
    delete window.__bats;
    window.__run.setState({ dungeon, currentRoomId: roomId, floor: 1, transitioning: true, floorRooms: 0, alarm: 0,
      batsRousedUntil: 0, noisyUntil: 0, wardenRoomId: null, harrierAwake: false, thiefPhase: "away", reaperAwake: false });
  }, roostFixture);
  await page.waitForFunction(() => !window.__run.getState().transitioning && window.__bats?.room === window.__run.getState().currentRoomId);
  await page.evaluate((at) => window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] }), roostFixture.at);
  await page.waitForTimeout(1900);
  await page.evaluate(() => window.__run.setState({ noisyUntil: window.__derived.clock() + 10 }));
  await page.waitForFunction(() => window.__bats.stirring);
  assert.ok(await page.evaluate(() => window.__run.getState().batsRousedUntil <= window.__derived.clock()), "local noise warns before the burst");
  await page.evaluate((at) => window.__bus.emit("teleport", { position: [at.x > 0 ? -7 : 7, 1.5, 0] }), roostFixture.at);
  await page.waitForFunction(() => !window.__bats.stirring);
  await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(() => window.__run.getState().batsRousedUntil), 0, "moving clear cancels the burst");
  await page.evaluate((at) => {
    window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] });
    window.__run.setState({ noisyUntil: window.__derived.clock() + 20 });
  }, roostFixture.at);
  await page.waitForFunction(() => window.__bats.stirring);
  const warningStartedAt = await page.evaluate(() => window.__bats.warningStartedAt);
  assert.ok(Number.isFinite(warningStartedAt), "the live roost publishes the start of its visible warning");
  await page.evaluate(() => window.__run.getState().pause());
  await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(() => window.__run.getState().batsRousedUntil), 0, "warning time freezes while paused");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__bats.roused);
  const burstDelay = await page.evaluate((started) => window.__run.getState().batsRousedUntil - 5 - started, warningStartedAt);
  assert.ok(burstDelay >= 1.15, `staying under the roost allows the full warning before the burst: ${burstDelay}`);
  await page.waitForTimeout(5500);
  assert.ok(await page.evaluate(() => !window.__bats.roused && !window.__bats.stirring), "the flock does not startle itself again");
  await page.evaluate(async () => {
    const din = await import("/src/game/din/din.ts");
    const s = window.__run.getState(), room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
    din.strike("bombBurst", s.dungeon.rooms, room);
  });
  await page.waitForFunction(() => window.__bats.roused && !window.__bats.stirring);
  console.log("PASS roost warning, escape, pause, no repeated self-startling and blast response");
  let dartFixture;
  for (let seed = 1; seed <= 300 && !dartFixture; seed++) {
    const dungeon = L.generateDungeon({ seed, floor: 1 });
    for (const room of dungeon.rooms.filter((r) => r.kind === "normal")) {
      const traps = L.trapsFor(room, seed, dungeon.endId);
      if (traps.length === 1 && traps[0].kind === "darts") { dartFixture = { dungeon, roomId: room.id, trap: traps[0] }; break; }
    }
  }
  assert.ok(dartFixture, "a live dart-room fixture exists");
  await page.evaluate(({ dungeon, roomId }) => window.__run.setState({ dungeon, currentRoomId: roomId, floor: 1,
    transitioning: true, floorRooms: 0, alarm: 0, lives: 3, lastDamageAt: -100, sprung: {},
    wardenRoomId: null, harrierAwake: false, thiefPhase: "away", reaperAwake: false }), dartFixture);
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  const { trap } = dartFixture;
  await page.evaluate((t) => {
    const off = window.__run.subscribe((s, previous) => {
      if (s.sprung[t.key] !== undefined && previous.sprung[t.key] === undefined) {
        off();
        window.__run.getState().pause();
      }
    });
    window.__bus.emit("teleport", { position: [t.x, 1.5, t.z] });
  }, trap);
  await page.waitForFunction((key) => window.__run.getState().paused && window.__run.getState().sprung[key] !== undefined, trap.key);
  assert.equal(await page.evaluate(() => window.__run.getState().lives), 3, "dart plate does not hit on activation");
  await page.evaluate(() => { window.__bus.emit("teleport", { position: [0, 1.5, 0] }); window.__run.getState().resume(); });
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => window.__run.getState().lives), 3, "leaving during the warning avoids the volley");
  await page.evaluate((t) => {
    window.__run.setState({ sprung: {}, lastDamageAt: -100 });
    window.__bus.emit("teleport", { position: [t.x, 1.5, t.z] });
  }, trap);
  await page.waitForFunction(() => window.__run.getState().lives < 3, null, { timeout: 5000 });
  const dartDelay = await page.evaluate((key) => window.__run.getState().lastDamageAt - window.__run.getState().sprung[key], trap.key);
  assert.ok(dartDelay >= 0.65, `dart damage waits for the warning: ${dartDelay}`);
  console.log("PASS dart warning, escape window and delayed damage");
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  const arrival = await page.evaluate(() => {
    delete window.__harrier;
    window.__run.setState({ floor: 2, harrierAwake: true, harrierSlain: false, harrierRetreatUntil: 0, lives: 3, lastDamageAt: -100 });
    return window.__derived.clock();
  });
  await page.waitForFunction(() => window.__harrier?.room === window.__run.getState().currentRoomId);
  assert.ok(await page.evaluate(() => window.__harrier.distance >= 5), "rendered Harrier arrives away from the player");
  await page.evaluate(() => window.__bus.emit("teleport", { position: [window.__harrier.x, 1.5, window.__harrier.z] }));
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.__run.getState().lives), 3, "Harrier cannot strike immediately on arrival");
  await page.waitForFunction(() => window.__run.getState().lives < 3, null, { timeout: 6000 });
  const harrierDelay = await page.evaluate((at) => window.__run.getState().lastDamageAt - at, arrival);
  assert.ok(harrierDelay >= 2.4, `Harrier gives arrival grace plus windup: ${harrierDelay}`);
  console.log("PASS Harrier arrival grace and attack windup");
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(() => {
    const off = window.__bus.on("notice", (text) => {
      if (text === "The Harrier draws back. Dodge or shove.") {
        window.__run.getState().pause();
        off();
      }
    });
    window.__run.setState({ floor: 2, harrierAwake: true, harrierSlain: false,
      harrierRetreatUntil: 0, shoveReadyAt: 0, lives: 3, lastDamageAt: -100 });
  });
  await page.waitForFunction(() => window.__run.getState().paused, null, { timeout: 10000 });
  assert.ok(await page.evaluate(() => window.__harrier.distance <= 3), "natural Harrier warning starts inside shove range");
  const warnedShove = await page.evaluate(() => {
    const p = window.__playerDebug, h = window.__harrier, run = window.__run;
    run.getState().resume();
    run.getState().shove(h.x - p.x, h.z - p.z);
    return { retreat: run.getState().harrierRetreatUntil > window.__derived.clock(), lives: run.getState().lives };
  });
  assert.ok(warnedShove.retreat && warnedShove.lives === 3, "facing and shoving immediately on the warning defends without a hit");
  console.log("PASS natural Harrier warning offers an immediately reachable shove");
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  const memoryRoom = L.generateDungeon({ seed: 41, floor: 3 });
  const memoryWing = memoryRoom.rooms.find((r) => r.wings?.north);
  await page.evaluate(({ dungeon, roomId }) => window.__run.setState({ dungeon, currentRoomId: roomId, floor: 3,
    transitioning: true, wardenRoomId: null, harrierAwake: false, reaperAwake: false, thiefPhase: "away",
    noisyUntil: 0, mothOn: false, floorRooms: 0, alarm: 0 }), { dungeon: memoryRoom, roomId: memoryWing.id });
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(() => window.__bus.emit("teleport", { position: [0, 1.5, 0] }));
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const s = window.__run.getState(), room = s.dungeon.rooms.find((r) => r.id === s.currentRoomId);
    delete window.__warden;
    window.__run.setState({ wardenRoomId: room.id, wardenCameFrom: room.links.north,
      wardenStaggerUntil: window.__derived.clock() + 100 });
  });
  await page.waitForFunction(() => window.__warden?.targetX !== undefined);
  const remembered = await page.evaluate(() => ({ x: window.__warden.targetX, z: window.__warden.targetZ }));
  const hidden = [memoryWing.size / 2 - 1, 1.5, memoryWing.size / 2 - 1];
  await page.evaluate((position) => window.__bus.emit("teleport", { position }), hidden);
  await page.waitForFunction(() => window.__warden.canSee === 0);
  await page.waitForTimeout(400);
  assert.deepEqual(await page.evaluate(() => ({ x: window.__warden.targetX, z: window.__warden.targetZ })), remembered,
    "quiet movement outside sight does not update the Warden's pursuit destination");
  await page.evaluate(() => window.__run.setState({ noisyUntil: window.__derived.clock() + 10 }));
  await page.waitForFunction((position) => Math.hypot(window.__warden.targetX - position[0], window.__warden.targetZ - position[2]) < 0.2, hidden);
  console.log("PASS Warden retains last known position when hidden and reacquires through noise");
  const pausedWarden = await page.evaluate(() => {
    window.__run.getState().pause();
    window.__awareness.reset();
    window.__awareness.wake("cutpurse");
    window.__awareness.report("cutpurse", 2, true, true, window.__run.getState().currentRoomId);
    return { x: window.__warden.x, z: window.__warden.z, facing: window.__warden.facing,
      targetX: window.__warden.targetX, targetZ: window.__warden.targetZ };
  });
  await page.waitForTimeout(1200);
  assert.deepEqual(await page.evaluate(() => ({ x: window.__warden.x, z: window.__warden.z, facing: window.__warden.facing,
    targetX: window.__warden.targetX, targetZ: window.__warden.targetZ })), pausedWarden, "Warden pose and pursuit memory freeze during pause");
  assert.equal(await page.evaluate(() => window.__awareness.rungOf("cutpurse")), 0, "even an immediate awareness report waits while paused");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__awareness.rungOf("cutpurse") === 2);
  console.log("PASS pause freezes Warden facing and awareness; reports apply after resume");
  // Fixture setup isolates the real satchel input and frame-driven fuse; this
  // check does not claim survival or economy evidence for a complete run.
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  const bombDungeon = L.generateDungeon({ seed: 11, floor: 3 });
  const bombHost = bombDungeon.rooms.find((r) => Object.values(r.links).includes(bombDungeon.endId));
  await page.evaluate(({ dungeon, roomId }) => window.__run.setState({ dungeon, currentRoomId: roomId,
    floor: 3, transitioning: true, enteredBy: null, satchel: ["bomb"],
    wardenRoomId: null, harrierAwake: false, harrierSlain: true, reaperAwake: false, thiefPhase: "away", alarm: 0 }),
  { dungeon: bombDungeon, roomId: bombHost.id });
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(() => window.__bus.emit("teleport", { position: [0, 1.5, 0] }));
  await page.waitForTimeout(150);
  await page.keyboard.press("Digit1");
  await page.waitForFunction(() => window.__derived.bombs().length === 1);
  // Stay on the actual polygon floor: a square corner can be outside this
  // room and falling out of it would teleport the player back onto the bomb.
  const escapeInset = (L.inscribedRadius(bombHost) - 1) / Math.SQRT2;
  assert.ok(L.insideRoom(bombHost, escapeInset, escapeInset, 0.5), "blast escape fixture is inside the real room");
  const pausedFuse = await page.evaluate((inset) => {
    window.__bus.emit("teleport", { position: [inset, 1.5, inset] });
    window.__run.getState().pause();
    return window.__derived.bombs()[0].fuseAt - window.__derived.clock();
  }, escapeInset);
  await page.waitForTimeout(3200);
  const heldFuse = await page.evaluate(() => window.__derived.bombs()[0].fuseAt - window.__derived.clock());
  assert.ok(Math.abs(heldFuse - pausedFuse) < 0.02, "pause preserves the remaining bomb fuse");
  assert.ok(await page.evaluate(() => window.__derived.keeper().holds), "paused bomb does not open the stairs");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__derived.keeper().stalled, null, { timeout: 6000 });
  assert.equal(await page.evaluate(() => window.__derived.bombs().length), 0, "frame-driven explosion consumes the bomb");
  assert.equal(await page.evaluate(() => window.__run.getState().lives), 3, "escaping the blast avoids damage");
  console.log("PASS satchel bomb fuse freezes on pause, detonates on resume, and opens Keeper stairs");
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(({ dungeon, roomId }) => window.__run.setState({ dungeon, currentRoomId: roomId,
    floor: 3, transitioning: true, enteredBy: null, wardenRoomId: null,
    harrierAwake: false, reaperAwake: false, thiefPhase: "away", alarm: 0 }), galleryFixture);
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate((reach) => window.__bus.emit("teleport", { position: [0, 1.5, -reach + 1] }), galleryFixture.reach);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__run.getState().wakeReaper());
  await page.waitForFunction((roomId) => window.__reaper?.room === roomId, galleryFixture.roomId);
  assert.ok(await page.evaluate(() => window.__reaper.distance >= 5), "Reaper arrival gives the gallery player room to react");
  const pausedReaper = await page.evaluate(() => {
    window.__run.getState().pause();
    return { x: window.__reaper.x, y: window.__reaper.y, z: window.__reaper.z, facing: window.__reaper.facing };
  });
  await page.waitForTimeout(1200);
  assert.deepEqual(await page.evaluate(() => ({ x: window.__reaper.x, y: window.__reaper.y,
    z: window.__reaper.z, facing: window.__reaper.facing })), pausedReaper, "Reaper movement, bob and facing freeze on pause");
  assert.equal(await page.evaluate(() => window.__run.getState().lives), 3, "paused Reaper cannot strike");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction((half) => window.__reaper.z < -half - 0.5, galleryFixture.half, { timeout: 12000 });
  await page.waitForFunction(() => window.__run.getState().lives < 3, null, { timeout: 12000 });
  assert.equal(await page.evaluate(() => window.__run.getState().lives), 2, "Reaper reaches and strikes a stationary gallery player");
  console.log("PASS Reaper gallery pursuit, arrival clearance and paused pose and damage");
  assert.equal(await page.evaluate(async () => (await import("/src/game/reaper/position.ts")).reaperAt.roomId),
    galleryFixture.roomId, "Reaper publishes its mounted room for combat");
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  assert.equal(await page.evaluate(async () => (await import("/src/game/reaper/position.ts")).reaperAt.roomId), null,
    "Reaper combat position clears when the previous run ends");
  const keeperDir = Object.keys(bombHost.links).find((dir) => bombHost.links[dir] === bombDungeon.endId);
  const keeperPost = L.keeperPostPosition(bombHost, keeperDir), keeperAxis = L.DIR_STEP[keeperDir];
  await page.evaluate(({ dungeon, roomId }) => window.__run.setState({ dungeon, currentRoomId: roomId,
    floor: 3, transitioning: true, enteredBy: null, wardenRoomId: null,
    harrierAwake: false, reaperAwake: false, thiefPhase: "away", alarm: 0 }),
  { dungeon: bombDungeon, roomId: bombHost.id });
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(({ post, axis }) => window.__bus.emit("teleport", {
    position: [post.x - axis.x * 3, 1.5, post.z - axis.z * 3] }), { post: keeperPost, axis: keeperAxis });
  await page.waitForTimeout(200);
  const keeperPose = await page.evaluate(() => {
    window.__run.getState().pause();
    return { y: window.__keeper.y, facing: window.__keeper.facing, halberd: window.__keeper.halberd,
      scaleY: window.__keeper.scaleY, tell: window.__keeper.tell };
  });
  await page.evaluate(({ post, axis }) => window.__bus.emit("teleport", {
    position: [post.x - axis.x + axis.z * 0.4, 1.5, post.z - axis.z + axis.x * 0.4] }),
  { post: keeperPost, axis: keeperAxis });
  await page.waitForTimeout(1200);
  assert.deepEqual(await page.evaluate(() => ({ y: window.__keeper.y, facing: window.__keeper.facing,
    halberd: window.__keeper.halberd, scaleY: window.__keeper.scaleY, tell: window.__keeper.tell })), keeperPose,
  "Keeper bob, facing and attack warning remain frozen even when the controlled camera moves during pause");
  assert.equal(await page.evaluate(() => window.__run.getState().lives), 3, "paused Keeper does not strike");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__keeper.tell > 0.9 && window.__run.getState().lives < 3);
  assert.equal(await page.evaluate(() => window.__run.getState().lives), 2, "Keeper attack resumes inside its reach");
  console.log("PASS Keeper paused pose and warning, and resumed close-range strike");
  assert.deepEqual(errors, [], "no browser exceptions");
  console.log("All gameplay checks passed.");
} finally { await browser.close(); }
