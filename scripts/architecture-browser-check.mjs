import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5216"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixtures = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { BIOME_CROWNS } = await import("/src/game/worldbuilding/biomeCrown.ts");
    const found = {};
    for (let seed = 1; seed < 200 && Object.keys(found).length < 11; seed++) for (const floor of [1, 2, 3]) {
      const dungeon = generateDungeon({ seed, floor });
      for (const room of dungeon.rooms) if (!found[room.biome])
        found[room.biome] = { dungeon, floor, roomId: room.id, crown: BIOME_CROWNS[room.biome].name };
    }
    if (Object.keys(found).length !== 11) throw Error(`Missing crown fixtures: ${Object.keys(found).join(", ")}`);
    return found;
  });

  const signatures = new Set();
  for (const [biome, fixture] of Object.entries(fixtures)) {
    await page.evaluate(fixture => {
      window.__run.setState({ dungeon: fixture.dungeon, floor: fixture.floor, currentRoomId: fixture.roomId,
        phase: "playing", paused: false, inputLocks: 0, transitioning: false, wardenRoomId: null,
        harrierSlain: true, reaperAwake: false, thiefPhase: "away", invulnerableUntil: 1e9 });
      window.__bus.emit("teleport", { position: [0, 1.5, 0] });
    }, fixture);
    await page.waitForFunction(crown => window.__scene.getObjectByName("room-architecture")?.userData.crown === crown, fixture.crown);
    const mounted = await page.evaluate(() => {
      const group = window.__scene.getObjectByName("room-architecture");
      const batches = group.children.filter(child => child.isInstancedMesh);
      return { crown: group.userData.crown, biome: group.userData.crownBiome,
        batches: batches.length, faces: batches.map(batch => batch.count) };
    });
    assert.equal(mounted.crown, fixture.crown, `${biome} publishes its construction rule`);
    assert.equal(mounted.biome, biome, `${biome} keeps architecture tied to its generated material`);
    assert.equal(mounted.batches, 3, `${biome} remains in the existing three architecture submissions`);
    assert.ok(mounted.faces.every(count => count > 0), `${biome} produces visible structure, detail and marks`);
    signatures.add(mounted.faces.join(":"));

    if (process.env.ARCHITECTURE_REVIEW) {
      const image = await page.evaluate(async () => {
        const T = await import("/node_modules/three/build/three.module.js");
        const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
        renderer.setSize(720, 480); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
        const room = window.__run.getState().dungeon.rooms.find(room => room.id === window.__run.getState().currentRoomId);
        const camera = new T.PerspectiveCamera(72, 1.5, 0.1, 100);
        camera.position.set(0, 1.65, room.size * 0.16);
        camera.lookAt(0, 4.35, -room.size * 0.2); camera.updateMatrixWorld();
        window.__scene.updateMatrixWorld(true); renderer.render(window.__scene, camera);
        const result = renderer.domElement.toDataURL(); renderer.dispose(); return result;
      });
      mkdirSync("output/world-review/biome-crowns", { recursive: true });
      writeFileSync(`output/world-review/biome-crowns/${biome}.png`, Buffer.from(image.split(",")[1], "base64"));
    }
  }
  assert.ok(signatures.size >= 7, `biome crown silhouettes do not collapse into one repeated batch (${signatures.size} signatures)`);
  const transept = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { galleryTerminiFor } = await import("/src/game/worldbuilding/galleryTermini.ts");
    for (let seed = 1; seed < 240; seed++) {
      const dungeon = generateDungeon({ seed, floor: 3 });
      const room = dungeon.rooms.find(room => room.secret && galleryTerminiFor(room).sites.length === 2
        && galleryTerminiFor(room).sites.every(site => site.secretFlank));
      if (room) return { dungeon, floor: 3, roomId: room.id,
        name: galleryTerminiFor(room).definition.name, dirs: galleryTerminiFor(room).sites.map(site => site.dir) };
    }
    throw Error("Missing paired secret-host transept fixture");
  });
  await page.evaluate(fixture => {
    window.__run.setState({ dungeon: fixture.dungeon, floor: fixture.floor, currentRoomId: fixture.roomId,
      phase: "playing", paused: false, inputLocks: 0, transitioning: false, wardenRoomId: null,
      harrierSlain: true, reaperAwake: false, thiefPhase: "away", invulnerableUntil: 1e9 });
    window.__bus.emit("teleport", { position: [0, 1.5, 0] });
  }, transept);
  await page.waitForFunction(() => window.__scene.getObjectByName("room-architecture")?.userData.gallerySites === 2);
  const mountedTransept = await page.evaluate(fixture => {
    const architecture = window.__scene.getObjectByName("room-architecture");
    const lamps = [];
    window.__scene.traverse(object => { if (object.name === "gallery-answer-lamp") lamps.push(object); });
    return { name: architecture.userData.galleryTerminus, sites: architecture.userData.gallerySites,
      batches: architecture.children.filter(child => child.isInstancedMesh).length,
      raised: fixture.dirs.filter(dir => !!window.__scene.getObjectByName(`raised-floor-${dir}`)).length,
      terrain: !!window.__scene.getObjectByName("terrain-deposits"), answerLamps: lamps.length,
      responseSites: window.__galleryResponses?.sites.length ?? 0,
      response: window.__galleryResponses?.response ?? "" };
  }, transept);
  assert.deepEqual({ ...mountedTransept, response: undefined }, { name: transept.name, sites: 2, batches: 3,
    raised: 2, terrain: true, answerLamps: 2, responseSites: 2, response: undefined },
    "a secret-host transept mounts both physical landings, responsive lamps, continuous terrain and district architecture in three batches");
  assert.ok(mountedTransept.response.length > 24, "the mounted transept publishes its district acoustic response");
  const responses = await page.evaluate(async () => {
    const events = [];
    const off = window.__bus.on("galleryReached", event => events.push(event));
    const sites = window.__galleryResponses.sites;
    for (const site of sites) {
      window.__bus.emit("teleport", { position: [site.x, site.raised + 1.2, site.z] });
      await new Promise(resolve => setTimeout(resolve, 180));
    }
    // Revisiting a station during the same room visit must not restart its answer.
    const first = sites[0];
    window.__bus.emit("teleport", { position: [first.x, first.raised + 1.2, first.z] });
    await new Promise(resolve => setTimeout(resolve, 180));
    off();
    return events;
  });
  assert.equal(responses.length, 2, "each transept landing answers once per room visit");
  assert.ok(responses.every(event => event.roomId === transept.roomId && event.secretFlank),
    "both answers remain tied to the physical cracked-wall host");
  assert.ok(responses.every(event => Math.hypot(event.answerX - event.x, event.answerZ - event.z) > 2),
    "secret transept answers point from each landing toward the actual cracked wall");
  if (process.env.TRANSEPT_REVIEW) {
    const image = await page.evaluate(async dir => {
      const T = await import("/node_modules/three/build/three.module.js");
      const { DIR_STEP } = await import("/src/game/dungeon/types.ts");
      const { doorReach } = await import("/src/game/dungeon/footprint.ts");
      const { floorHeightAt } = await import("/src/game/worldbuilding/elevation.ts");
      const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
      renderer.setSize(720, 480); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
      const room = window.__run.getState().dungeon.rooms.find(room => room.id === window.__run.getState().currentRoomId);
      const axis = DIR_STEP[dir], camera = new T.PerspectiveCamera(68, 1.5, 0.1, 100);
      const lateral = { x: axis.z, z: -axis.x }, mouth = room.size / 2 + 0.65;
      const px = axis.x * mouth + lateral.x * 0.8, pz = axis.z * mouth + lateral.z * 0.8;
      camera.position.set(px, floorHeightAt(room, px, pz) + 1.55, pz);
      const end = doorReach(room, dir) - 1.15;
      camera.lookAt(axis.x * end, floorHeightAt(room, axis.x * end, axis.z * end) + 1.75, axis.z * end);
      camera.updateMatrixWorld(); window.__scene.updateMatrixWorld(true); renderer.render(window.__scene, camera);
      const result = renderer.domElement.toDataURL(); renderer.dispose(); return result;
    }, transept.dirs[0]);
    mkdirSync("output/world-review", { recursive: true });
    writeFileSync("output/world-review/secret-transept.png", Buffer.from(image.split(",")[1], "base64"));
  }
  assert.deepEqual(errors, []);
  console.log(`PASS biome crowns and transepts: eleven overhead traditions plus a paired secret-host room in three architecture batches (${signatures.size} face signatures)`);
} finally { await browser.close(); }
