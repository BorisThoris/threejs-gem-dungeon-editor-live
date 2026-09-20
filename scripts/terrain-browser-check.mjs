import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5216"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixture = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { terrainFor } = await import("/src/game/rooms/terrainPattern.ts");
    for (let seed = 1; seed < 100; seed++) {
      const dungeon = generateDungeon({ seed, floor: 2 });
      const room = dungeon.rooms.find(r => r.biome === "flooded" && terrainFor(r).deposits.length);
      if (!room) continue;
      window.__run.setState({ dungeon, floor: 2, currentRoomId: room.id, transitioning: false,
        wardenRoomId: null, harrierSlain: true, reaperAwake: false, thiefPhase: "away" });
      window.__bus.emit("teleport", { position: [0, 1.5, 0] });
      return { roomId: room.id, otherId: dungeon.rooms.find(r => r.id !== room.id).id };
    }
    throw Error("No flooded terrain fixture");
  });
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
  console.log("PASS terrain water: persistent shader clock, stepped glint, pause, remount and resume");
} finally { await browser.close(); }
