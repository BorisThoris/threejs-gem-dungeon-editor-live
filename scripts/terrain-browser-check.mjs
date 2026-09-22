import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5216"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixtures = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { terrainFor } = await import("/src/game/rooms/terrainPattern.ts");
    const { TERRAIN_EFFECTS } = await import("/src/game/rooms/terrainMaterial.ts");
    const found = {};
    for (let seed = 1; seed < 140 && Object.keys(found).length < 10; seed++) for (const floor of [1, 2, 3]) {
      const dungeon = generateDungeon({ seed, floor });
      for (const room of dungeon.rooms) if (!found[room.biome] && terrainFor(room).deposits.length)
        found[room.biome] = { dungeon, floor, roomId: room.id,
          otherId: dungeon.rooms.find(candidate => candidate.id !== room.id).id,
          effect: TERRAIN_EFFECTS[room.biome].name };
    }
    if (Object.keys(found).length !== 10) throw Error(`Missing terrain fixtures: ${Object.keys(found).join(", ")}`);
    return found;
  });

  const cacheKeys = new Set();
  for (const [biome, fixture] of Object.entries(fixtures)) {
    await page.evaluate(({ fixture }) => {
      window.__run.setState({ dungeon: fixture.dungeon, floor: fixture.floor, currentRoomId: fixture.roomId,
        phase: "playing", paused: false, inputLocks: 0, transitioning: false, wardenRoomId: null,
        harrierSlain: true, reaperAwake: false, thiefPhase: "away" });
      window.__bus.emit("teleport", { position: [0, 1.5, 0] });
    }, { fixture });
    await page.waitForFunction(effect =>
      window.__scene.getObjectByName("terrain-deposits")?.material.userData.terrainEffect === effect, fixture.effect);
    const style = await page.evaluate(async biome => {
      const { TERRAIN_EFFECTS } = await import("/src/game/rooms/terrainMaterial.ts");
      const material = window.__scene.getObjectByName("terrain-deposits").material;
      const shader = { uniforms: {}, vertexShader: "#include <project_vertex>", fragmentShader: "#include <color_fragment>" };
      material.onBeforeCompile(shader);
      return { effect: material.userData.terrainEffect, animated: material.userData.terrainAnimated,
        cache: material.customProgramCacheKey(), uniform: shader.uniforms.terrainTime === material.userData.terrainTime,
        injected: shader.fragmentShader.includes(TERRAIN_EFFECTS[biome].fragment) };
    }, biome);
    assert.equal(style.effect, fixture.effect, `${biome} publishes its terrain effect`);
    assert.equal(style.animated, ["flooded", "foundry", "crystal", "fungal", "ash"].includes(biome));
    assert.ok(style.uniform && style.injected, `${biome} compiles its world-space terrain rule`);
    cacheKeys.add(style.cache);
    if (process.env.TERRAIN_REVIEW) {
      const image = await page.evaluate(async () => {
        const T = await import("/node_modules/three/build/three.module.js");
        const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
        renderer.setSize(640, 480); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
        const room = window.__run.getState().dungeon.rooms.find(room => room.id === window.__run.getState().currentRoomId);
        const reach = room.size * 0.72;
        const camera = new T.OrthographicCamera(-reach, reach, reach * 0.75, -reach * 0.75, 0.1, 100);
        camera.position.set(0, room.size * 0.7, room.size * 0.42); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
        window.__scene.updateMatrixWorld(true); renderer.render(window.__scene, camera);
        const result = renderer.domElement.toDataURL(); renderer.dispose(); return result;
      });
      mkdirSync("output/world-review/terrain-styles", { recursive: true });
      writeFileSync(`output/world-review/terrain-styles/${biome}.png`, Buffer.from(image.split(",")[1], "base64"));
    }
  }
  assert.equal(cacheKeys.size, 10, "each biome owns a stable shader cache variant");

  const fixture = fixtures.flooded;
  await page.evaluate(fixture => {
    window.__run.setState({ dungeon: fixture.dungeon, floor: fixture.floor, currentRoomId: fixture.roomId,
      phase: "playing", paused: false, inputLocks: 0, transitioning: false });
    window.__bus.emit("teleport", { position: [0, 1.5, 0] });
  }, fixture);
  await page.waitForFunction(() => !!window.__scene.getObjectByName("terrain-deposits")?.material.userData.terrainTime);
  const sample = () => page.evaluate(() => ({
    time: window.__scene.getObjectByName("terrain-deposits").material.userData.terrainTime.value,
    clock: window.__derived.clock(),
  }));
  const before = await sample();
  await page.waitForTimeout(350);
  const moving = await sample();
  assert.ok(moving.time > before.time, "pool glint advances during play");
  assert.ok(Math.abs(moving.time - moving.clock) < 0.2, "pool glint tracks the persistent clock");
  await page.evaluate(() => window.__run.getState().pause());
  await page.waitForTimeout(150);
  const frozen = await sample();
  await page.waitForTimeout(400);
  assert.equal((await sample()).time, frozen.time, "pool glint freezes while paused");
  await page.evaluate(id => window.__run.setState({ currentRoomId: id }), fixture.otherId);
  await page.waitForTimeout(250);
  await page.evaluate(id => window.__run.setState({ currentRoomId: id }), fixture.roomId);
  await page.waitForTimeout(250);
  assert.equal((await sample()).time, frozen.time, "paused room revisit preserves the exact ripple phase");
  const uniformIsLive = await page.evaluate(() => {
    const material = window.__scene.getObjectByName("terrain-deposits").material;
    const shader = { uniforms: {}, vertexShader: "#include <project_vertex>", fragmentShader: "#include <color_fragment>" };
    material.onBeforeCompile(shader);
    return shader.uniforms.terrainTime === material.userData.terrainTime && shader.fragmentShader.includes("floor((sin(");
  });
  assert.ok(uniformIsLive, "the stepped water shader consumes the tested clock uniform");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForTimeout(350);
  assert.ok((await sample()).time > frozen.time, "pool glint resumes");
  assert.deepEqual(errors, []);
  console.log("PASS terrain styles: ten quantized biome shaders plus persistent water clock, pause, remount and resume");
} finally { await browser.close(); }
