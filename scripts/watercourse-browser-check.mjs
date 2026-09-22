import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

mkdirSync("output/world-review", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5201"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixture = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    for (let seed = 1; seed < 100; seed++) {
      const dungeon = generateDungeon({ seed, floor: 1 });
      const sluice = dungeon.rooms.find(r => r.waterway?.role === "sluice");
      const cache = dungeon.rooms.find(r => r.waterway?.role === "outfall");
      if (sluice && cache && dungeon.serviceTrail && dungeon.serviceTrail.route.every(id => dungeon.rooms.find(r => r.id === id).kind !== "arena"))
        return { dungeon, sluice: sluice.id, cache: cache.id };
    }
    throw Error("No circuit generated");
  });
  await page.evaluate(({ dungeon }) => window.__run.setState({ dungeon, floor: 1, waterOpenedAt: null,
    waterCacheTaken: false, wardenRoomId: null, wardenAwake: false, harrierAwake: false, reaperAwake: false,
    thiefPhase: "away", invulnerableUntil: 1e9, visited: [] }), fixture);
  const visit = async id => {
    await page.evaluate(async id => {
      const { waterStation } = await import("/src/game/worldbuilding/watercourse.ts");
      const { PLAYER_SPAWN_Y } = await import("/src/game/world.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === id), station = waterStation(room);
      window.__run.setState({ currentRoomId: id, visited: [...new Set([...s.visited, id])], transitioning: false });
      window.__bus.emit("teleport", { position: [station.approach.x, PLAYER_SPAWN_Y, station.approach.z] });
      window.__bus.emit("lookSet", { yaw: station.yaw, pitch: 0.12 });
    }, id);
    await page.waitForFunction(id => window.__watercourse?.roomId === id, id);
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      window.__bus.emit("lookSet", { yaw: window.__watercourse.station.yaw, pitch: 0.12 });
    });
    await page.waitForTimeout(150);
  };
  const reviewBasin = async role => {
    if (!process.env.BASIN_REVIEW) return;
    const image = await page.evaluate(async () => {
      const T = await import("/node_modules/three/build/three.module.js");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const dir = room.waterway.upstream ?? room.waterway.downstream;
      const axis = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[dir];
      const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
      renderer.setSize(800, 600); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
      const camera = new T.PerspectiveCamera(72, 4 / 3, 0.1, 100);
      camera.position.set(axis[0] * 4.5, 2.8, axis[1] * 4.5);
      camera.lookAt(0, 0.1, 0); camera.updateMatrixWorld();
      window.__scene.updateMatrixWorld(true); renderer.render(window.__scene, camera);
      const image = renderer.domElement.toDataURL(); renderer.dispose(); return image;
    });
    writeFileSync(`output/world-review/${role}-basin-wet.png`, Buffer.from(image.split(",")[1], "base64"));
  };
  await visit(fixture.cache);
  await reviewBasin("reliquary");
  const waterState = () => page.evaluate(() => {
    let material;
    window.__scene.traverse(o => { if (o.name === "directed-channel-surface") material = o.material; });
    return { travel: material.userData.travel.value, opacity: material.opacity, visible: material.visible };
  });
  const initialFlow = await waterState();
  const currentSound = () => page.evaluate(async () => (await import("/src/game/systems/audio.ts")).ambience.currentLevel());
  assert.ok(await currentSound() > 0, "a live channel starts its current voice in play");
  await page.waitForTimeout(400);
  assert.ok((await waterState()).travel > initialFlow.travel, "the compiled channel material receives an advancing current");
  assert.ok(await page.evaluate(() => {
    const room = window.__run.getState().dungeon.rooms.find(r => r.id === window.__run.getState().currentRoomId);
    const dir = room.waterway.upstream;
    const axis = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[dir];
    let valid = true, count = 0;
    window.__scene.traverse(o => {
      if (o.name !== "directed-channel-surface") return;
      const p = o.geometry.attributes.position, uv = o.geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        valid &&= Math.abs(uv.getX(i) + x * axis[0] + z * axis[1]) < 0.00001;
        count++;
      }
    });
    return valid && count === 8;
  }), "rendered incoming water uses physical coordinates flowing toward the reliquary");
  const joined = await page.evaluate(async () => {
    const s = window.__run.getState(), room = s.dungeon.rooms.find(r =>
      r.waterway?.upstream && r.waterway?.downstream);
    window.__run.setState({ currentRoomId: room.id, transitioning: false,
      visited: [...new Set([...s.visited, room.id])] });
    window.__bus.emit("teleport", { position: [0, 1.5, 0] });
    return room.id;
  });
  await page.waitForFunction(id => window.__watercourse?.roomId === id, joined);
  const bend = await page.evaluate(() => {
    const meshes = [];
    window.__scene.traverse(o => { if (o.name === "directed-channel-surface") meshes.push(o); });
    return { meshes: meshes.length, vertices: meshes[0]?.geometry.attributes.position.count,
      triangles: meshes[0]?.geometry.index.count / 3 };
  });
  assert.deepEqual(bend, { meshes: 1, vertices: 8, triangles: 4 },
    "a two-reach channel draws as one four-triangle water surface");
  await visit(fixture.cache);
  assert.equal(await page.locator('[data-testid="service-rubbing"]').count(), 0, "the route is not explained before the rubbing is found");
  assert.equal(await page.locator('[data-water-role="sluice"]').count(), 0, "unvisited valve is not revealed on the map");
  const visitCatch = async () => {
    await page.evaluate(async () => {
      const { serviceCatch } = await import("/src/game/worldbuilding/serviceTrail.ts");
      const { DIR_YAW } = await import("/src/game/dungeon/types.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.dungeon.serviceTrail.hostId);
      const at = serviceCatch(room);
      window.__run.setState({ currentRoomId: room.id, transitioning: false, visited: [...new Set([...s.visited, room.id])], harrierSlain: true });
      window.__bus.emit("teleport", { position: [at[0], 1.5, at[2]] });
      window.__bus.emit("lookSet", { yaw: DIR_YAW[room.secret.dir], pitch: 0 });
    });
    await page.waitForTimeout(900);
  };
  await visitCatch();
  assert.equal(await page.evaluate(() => window.__run.getState().openServiceCatch()), false, "catch requires the recovered rubbing");
  await visit(fixture.cache);
  const initialGems = await page.evaluate(() => window.__run.getState().gems);
  await page.keyboard.press("KeyE");
  assert.equal(await page.evaluate(() => window.__run.getState().gems), initialGems, "submerged cache cannot be looted");
  await visit(fixture.sluice);
  await reviewBasin("sluice");
  await page.evaluate(() => window.__bus.emit("teleport", { position: [0, 1.5, 0] }));
  await page.waitForTimeout(120);
  await page.evaluate(() => window.__run.getState().operateWaterway());
  assert.equal(await page.evaluate(() => window.__run.getState().waterOpenedAt), null, "valve cannot be operated remotely");
  await visit(fixture.sluice);
  await page.screenshot({ path: "output/world-review/sluice-before.png" });
  await page.evaluate(() => { window.__run.getState().pause(); window.__run.getState().operateWaterway(); });
  assert.equal(await page.evaluate(() => window.__run.getState().waterOpenedAt), null, "paused controls are guarded");
  await page.evaluate(() => window.__run.getState().resume());
  // Capture the noise during the event, before the frame driver can retire
  // this short-lived source while Playwright crosses the process boundary.
  await page.evaluate(async () => {
    const din = await import("/src/game/din/din.ts");
    window.__sluiceNoise = null;
    window.__bus.on("sluiceOpened", ({ roomId }) => {
      queueMicrotask(() => { window.__sluiceNoise = { snapshot: din.snapshot(roomId),
        roomId, currentRoomId: window.__run.getState().currentRoomId,
        rooms: window.__run.getState().dungeon?.rooms.length ?? 0, live: din.liveCount() }; });
    });
  });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().waterOpenedAt !== null);
  const sluiceNoise = await page.evaluate(() => window.__sluiceNoise);
  assert.ok(sluiceNoise?.snapshot?.some(s =>
    s.source === "sluiceOpened" && s.tags.includes("loud") && s.tags.includes("metal")),
  `operating the mechanism creates a real noise signal: ${JSON.stringify(sluiceNoise)}`);
  await page.waitForTimeout(700);
  const pausedLevel = await page.evaluate(async () => {
    const { waterLevel } = await import("/src/game/worldbuilding/watercourse.ts");
    const { runClock } = await import("/src/game/state/run.ts");
    window.__run.getState().pause(); const s = window.__run.getState(); return waterLevel(s.waterOpenedAt, runClock(s));
  });
  await page.waitForTimeout(100);
  const pausedFlow = await waterState();
  assert.equal(await currentSound(), 0, "pause silences the current voice");
  await page.waitForTimeout(1100);
  const still = await page.evaluate(async () => {
    const { waterLevel } = await import("/src/game/worldbuilding/watercourse.ts");
    const { runClock } = await import("/src/game/state/run.ts");
    const s = window.__run.getState(); return waterLevel(s.waterOpenedAt, runClock(s));
  });
  assert.ok(Math.abs(still - pausedLevel) < 1e-9, "drainage freezes while paused");
  const heldFlow = await waterState();
  assert.ok(Math.abs(heldFlow.travel - pausedFlow.travel) < 1e-9 &&
    Math.abs(heldFlow.opacity - pausedFlow.opacity) < 1e-9 && heldFlow.visible === pausedFlow.visible,
  "rendered current and opacity freeze while paused");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__watercourse?.drained);
  const dryFlow = await waterState();
  assert.equal(await currentSound(), 0, "drainage silences the current voice");
  assert.equal(dryFlow.visible, false, "drainage removes the water surface");
  const sediment = await page.evaluate(async () => {
    const { Matrix4 } = await import("/node_modules/.vite/deps/three.js");
    const bed = window.__scene.getObjectByName("channel-sediment");
    const water = window.__scene.getObjectByName("directed-channel-surface");
    const matrix = new Matrix4(), heights = [];
    for (let i = 0; i < bed.count; i++) { bed.getMatrixAt(i, matrix); heights.push(matrix.elements[13]); }
    return { visible: bed.visible && bed.material.visible, separate: bed.material !== water.material,
      trianglesPerSegment: bed.geometry.index.count / 3, heights, textured: !!bed.material.map };
  });
  assert.ok(sediment.visible && sediment.separate && sediment.textured, "textured sediment remains after the separate water cover disappears");
  assert.equal(sediment.trianglesPerSegment, 2, "a bed submits only its visible top face");
  assert.ok(sediment.heights.length > 0 && sediment.heights.every(y => Math.abs(y - 0.041) < 1e-6), "sediment retains the original channel base height");
  await page.waitForTimeout(400);
  assert.deepEqual(await waterState(), dryFlow, "the dry current remains stopped");
  await visit(fixture.cache);
  await page.waitForFunction(() => window.__watercourse?.drained);
  await page.screenshot({ path: "output/world-review/reliquary-drained.png" });
  const before = await page.evaluate(() => window.__run.getState().gems);
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().waterCacheTaken);
  assert.equal(await page.evaluate(() => window.__run.getState().gems), before + 2, "dry cache pays two gems");
  await page.evaluate(() => window.__run.getState().operateWaterway());
  assert.equal(await page.evaluate(() => window.__run.getState().gems), before + 2, "cache pays only once");
  assert.match(await page.locator('[data-testid="service-rubbing"]').innerText(), /three-notch|copper trail/,
    "the rubbing gives either its marked route or a return to that route");
  assert.equal(await page.evaluate(() => window.__run.getState().openServiceCatch()), false, "rubbing cannot open the passage remotely");
  assert.equal(await page.locator('[data-map-state="known"] [data-testid="map-service-mark"]').count(), 0,
    "the rubbing does not mark unexplored room interiors");
  for (const id of fixture.dungeon.serviceTrail.route.slice(1)) {
    const dir = await page.evaluate(async next => {
      const { doorReach } = await import("/src/game/dungeon/footprint.ts");
      const { DIR_STEP, DIR_YAW } = await import("/src/game/dungeon/types.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const dir = Object.keys(room.links).find(dir => room.links[dir] === next), step = DIR_STEP[dir];
      const reach = doorReach(room, dir) - 0.9;
      window.__bus.emit("teleport", { position: [step.x * reach, 1.5, step.z * reach] });
      window.__bus.emit("lookSet", { yaw: DIR_YAW[dir], pitch: 0 });
      return dir;
    }, id);
    assert.ok((await page.locator('[data-testid="service-rubbing"]').innerText()).includes(dir), "the written clue agrees with the actual exit");
    await page.waitForTimeout(500);
    await page.keyboard.press("KeyE");
    await page.waitForFunction(id => window.__run.getState().currentRoomId === id && !window.__run.getState().transitioning, id);
  }
  await visitCatch();
  await page.evaluate(() => window.__run.getState().pause());
  assert.equal(await page.evaluate(() => window.__run.getState().openServiceCatch()), false, "paused catch is guarded");
  await page.evaluate(() => window.__run.getState().resume());
  await page.screenshot({ path: "output/world-review/service-catch.png" });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => {
    const s = window.__run.getState(), host = s.dungeon.rooms.find(r => r.id === s.dungeon.serviceTrail.hostId);
    return host.links[host.secret.dir] === host.secret.to;
  });
  assert.equal(await page.evaluate(() => window.__run.getState().openServiceCatch()), false, "opened catch cannot repeat");
  assert.match(await page.locator('[data-testid="service-rubbing"]').innerText(), /passage opened/);
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().currentRoomId === window.__run.getState().dungeon.secretId);
  console.log("PASS service rubbing: learned guidance, proximity and pause guards, keyboard catch, real passage travel and one-time opening");
  await visit(fixture.sluice);
  assert.equal(await page.evaluate(() => window.__watercourse.drained), true, "drainage persists on revisit");
  await page.evaluate(() => {
    const s = window.__run.getState();
    window.__run.setState({ currentRoomId: s.dungeon.endId, transitioning: true });
    window.__run.getState().roomReady(s.dungeon.endId);
  });
  await page.waitForFunction(() => window.__run.getState().floor === 2);
  assert.equal(await page.locator('[data-testid="service-rubbing"]').count(), 0, "descent clears the learned rubbing");
  assert.deepEqual(await page.evaluate(() => [window.__run.getState().waterOpenedAt, window.__run.getState().waterCacheTaken]), [null, false], "descent resets circuit state");
  await page.evaluate(() => window.__run.setState({ waterOpenedAt: 3, waterCacheTaken: true }));
  await page.evaluate(() => window.__run.getState().startRun(72));
  assert.deepEqual(await page.evaluate(() => [window.__run.getState().waterOpenedAt, window.__run.getState().waterCacheTaken]), [null, false], "new run resets circuit state");
  assert.deepEqual(errors, [], "no browser or shader errors");
  console.log("PASS watercourse: keyboard operation, proximity guard, noise signal, sealed/dry cache, pause, revisits, one-time reward, map privacy, descent and new-run reset");
} finally { await browser.close(); }
