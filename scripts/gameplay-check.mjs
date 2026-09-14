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
  "dungeon/generate", "dungeon/layout", "dungeon/footprint", "dungeon/types", "world",
  "player/combat", "traps/placement", "rooms/kinds", "rooms/placements", "props/specs", "warden/steer", "dungeon/arrival", "mobs/body", "mobs/ambient", "rooms/corridorPattern", "sentry/placement",
].map((f) => `export * from "${root}src/game/${f}";`).join("\n"));
await build({ entryPoints: [entry], outfile: out, bundle: true, platform: "node", format: "esm",
  jsx: "automatic", logLevel: "error", define: { "import.meta.env.DEV": "false", "import.meta.env": "{}" } });
const L = await import(pathToFileURL(out).href);
const summary = [];
let landings = 0, trapChecks = 0, corridorChecks = 0, cornerRoutes = 0, arrivals = 0;
for (const floor of [1, 2, 3]) {
  let area = 0, wings = 0, rooms = 0, irregular = 0;
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
        const lateralEdge = Math.min(Math.abs(block.position[0]) - block.size[0] / 2,
          Math.abs(block.position[2]) - block.size[2] / 2);
        assert.ok(lateralEdge >= L.CORRIDOR_WIDTH / 2 - L.WALL_THICKNESS / 2 - 0.02,
          "low corridor ribs stay flush with walls and clear of the walking lane");
      }
      rooms++;
      area += L.floorRects(room).reduce((sum, r) => sum + r.width * r.depth, 0);
      wings += Object.keys(room.wings ?? {}).length;
      if (Object.keys(room.wings ?? {}).length > 1) irregular++;
      for (const dir of L.DIRS.filter((dir) => room.links[dir])) {
        const spawn = L.spawnAfterTravel(room, L.OPPOSITE[dir]).position;
        assert.ok(L.insideRoom(room, spawn[0], spawn[2], L.PLAYER_CAPSULE_RADIUS), "arrival is on walkable floor");
        landings++;
        for (const body of ["ground", "flying"]) {
          const blockers = [...L.obstaclesFor(body, room, d.seed, []), ...L.bitesFor(body, room, d.seed, [])];
          for (const player of [{ x: 0, z: 0 }, { x: spawn[0], z: spawn[2] }]) {
            const at = L.encounterArrival(room, dir, player, blockers);
            assert.ok(L.insideRoom(room, at.x, at.z, 0.6), "arrival stays on the actual room floor");
            assert.ok(Math.hypot(at.x - player.x, at.z - player.z) >= L.ENCOUNTER_CLEARANCE,
              `arrival gives player breathing room: seed ${seed} floor ${floor} room ${room.id}`);
            assert.ok(blockers.every((p) => Math.hypot(at.x - p.x, at.z - p.z) > p.r + 0.6), "arrival avoids furniture and hazards");
            for (const entrance of L.DIRS.filter((other) => room.links[other])) {
              const landing = L.spawnAfterTravel(room, L.OPPOSITE[entrance]).position;
              assert.ok(Math.hypot(at.x - landing[0], at.z - landing[2]) >= L.ENCOUNTER_CLEARANCE, "all entrances remain clear of arriving threats");
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
          const targets = [[room.size / 2 - 1, room.size / 2 - 1], ...L.DIRS
            .filter((other) => other !== dir && room.wings?.[other])
            .map((other) => { const p = L.doorPosition(room, other); return [p[0] * 0.9, p[2] * 0.9]; })];
          for (const [tx, tz] of targets) {
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
  summary.push({ floor, rooms, meanArea: Math.round(area / rooms), wings, irregular });
}
assert.ok(summary[1].meanArea > summary[0].meanArea && summary[2].meanArea > summary[1].meanArea);
assert.ok(summary[2].wings > summary[1].wings && summary[1].wings > summary[0].wings);
assert.ok(summary[2].irregular > summary[1].irregular);
assert.ok(L.inShoveArc(0, -2, 0, -1));
assert.ok(!L.inShoveArc(0, 2, 0, -1));
assert.ok(!L.inShoveArc(0, -3.1, 0, -1));
assert.ok(!L.inShoveArc(2, 0, 0, -1));
const chamber = L.generateDungeon({ seed: 11 }).rooms[0];
assert.ok(!L.clearShove(chamber, { x: 0, z: 0 }, { x: 0, z: -2 }, [{ kind: "pillar", x: 0, z: -1 }]));
assert.ok(L.clearShove(chamber, { x: 0, z: 0 }, { x: 0, z: -2 }, []));
const crossRoom = { ...chamber, size: 20, wings: { north: 10, east: 10 } };
assert.ok(L.insideRoom(crossRoom, 0, -18, 0.6) && L.insideRoom(crossRoom, 18, 0, 0.6));
assert.ok(!L.roomSegmentClear(crossRoom, 0, -18, 18, 0, 0.6), "inside endpoints cannot tunnel through void");
assert.ok(L.insideRoom(crossRoom, 3.3, -10.8) && L.insideRoom(crossRoom, 4.2, -9.8));
assert.ok(!L.roomSegmentClear(crossRoom, 3.3, -10.8, 4.2, -9.8), "nearby bodies across a corner have no attack line");
assert.ok(!L.clearShove(crossRoom, { x: 3.49, z: -10.102 }, { x: 3.52, z: -9.802 }, []),
  "even a narrow corner crossing blocks a shove between floor points");
const swept = L.roomStep(crossRoom, 0, -18, 18, 18);
assert.ok(L.roomSegmentClear(crossRoom, 0, -18, ...swept, 0.6));
console.log("PASS geometry", JSON.stringify({ summary, landings, trapChecks, corridorChecks, cornerRoutes, arrivals }));
if (process.argv.includes("--geometry-only")) process.exit(0);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
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
  await page.evaluate(() => window.__run.getState().pause());
  await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(() => window.__run.getState().batsRousedUntil), 0, "warning time freezes while paused");
  const stir = await page.evaluate(() => { const now = window.__derived.clock(); window.__run.getState().resume(); return now; });
  await page.waitForFunction(() => window.__bats.roused);
  const burstDelay = await page.evaluate((started) => window.__run.getState().batsRousedUntil - 5 - started, stir);
  assert.ok(burstDelay >= 1, `staying under the roost allows the warning before the burst: ${burstDelay}`);
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
  assert.deepEqual(errors, [], "no browser exceptions");
  console.log("All gameplay checks passed.");
} finally { await browser.close(); }
