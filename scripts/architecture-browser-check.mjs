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
    for (let seed = 1; seed < 160 && Object.keys(found).length < 10; seed++) for (const floor of [1, 2, 3]) {
      const dungeon = generateDungeon({ seed, floor });
      for (const room of dungeon.rooms) if (!found[room.biome])
        found[room.biome] = { dungeon, floor, roomId: room.id, crown: BIOME_CROWNS[room.biome].name };
    }
    if (Object.keys(found).length !== 10) throw Error(`Missing crown fixtures: ${Object.keys(found).join(", ")}`);
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
  assert.deepEqual(errors, []);
  console.log(`PASS biome crowns: ten purposeful overhead traditions in three existing architecture batches (${signatures.size} face signatures)`);
} finally { await browser.close(); }
