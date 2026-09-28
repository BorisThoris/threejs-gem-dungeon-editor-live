import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5199"}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixtures = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { terrainFor } = await import("/src/game/rooms/terrainPattern.ts");
    const { footingAt } = await import("/src/game/rooms/underfoot.ts");
    const found = {};
    for (let seed = 1; seed < 100 && (!found.moss || !found.channel); seed++) {
      const dungeon = generateDungeon({ seed, floor: 1 });
      for (const room of dungeon.rooms) {
        if (room.kind !== "normal") continue;
        if (!found.moss && room.biome === "mossy") {
          const terrain = terrainFor(room);
          const point = (tiles, surface) => tiles.map(t => ({ x: t.position[0], z: t.position[2] }))
            .find(p => footingAt(room, p.x, p.z, null, 0) === surface);
          const soft = point(terrain.deposits, "soft"), stone = point(terrain.paving, "stone");
          if (soft && stone) found.moss = { dungeon, roomId: room.id, soft, stone };
        }
        if (!found.channel && room.waterway && footingAt(room, 0, 0, null, 0) === "water"
          && footingAt(room, 0, 0, 0, 10) === "silt")
          found.channel = { dungeon, roomId: room.id };
      }
    }
    if (!found.moss || !found.channel) throw Error("Missing generated footing fixtures");
    return found;
  });
  const mount = async fixture => {
    await page.evaluate(f => {
      window.__run.setState({ dungeon: f.dungeon, floor: 1, currentRoomId: f.roomId,
        visited: [f.roomId], waterOpenedAt: null, transitioning: false, wardenRoomId: null,
        harrierSlain: true, reaperAwake: false, thiefPhase: "away", invulnerableUntil: 1e9 });
    }, fixture);
    await page.waitForFunction(id => window.__blockLighting?.roomId === id, fixture.roomId);
  };
  const stand = async (point, surface) => {
    await page.evaluate(p => window.__bus.emit("teleport", { position: [p.x, 1.5, p.z] }), point);
    await page.waitForFunction(async surface => {
      const { footingAt } = await import("/src/game/rooms/underfoot.ts");
      const s = window.__run.getState(), p = window.__playerDebug;
      const room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      return footingAt(room, p.x, p.z, s.waterOpenedAt, window.__derived.clock()) === surface;
    }, surface);
  };
  const read = () => page.getByTestId("hud-ground").textContent();
  const expectGround = async text => {
    await page.waitForFunction(text => document.querySelector('[data-testid="hud-ground"]')?.textContent.includes(text), text);
  };
  await mount(fixtures.moss);
  await stand(fixtures.moss.soft, "soft");
  await expectGround("deep moss · swallows sound");
  await stand(fixtures.moss.stone, "stone");
  await expectGround("bare stone · dead");
  await stand(fixtures.moss.soft, "soft");
  await expectGround("deep moss · swallows sound");
  console.log("PASS one room updates its ground guidance across moss and paving, in both directions");

  await mount(fixtures.channel);
  await stand({ x: 0, z: 0 }, "water");
  await expectGround("standing water · carries");
  await page.evaluate(() => {
    window.__bedSprints = [];
    window.__bus.on("sprinted", event => {
      const s = window.__run.getState();
      window.__bedSprints.push({ surface: event.surface, hold: s.noisyUntil - window.__derived.clock() });
    });
  });
  const sprintOnBed = async surface => {
    await stand({ x: 0, z: 0 }, surface);
    await page.locator("canvas").click();
    await page.waitForFunction(() => document.pointerLockElement === document.querySelector("canvas"));
    await page.evaluate(async () => {
      const { DIR_YAW } = await import("/src/game/dungeon/types.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      window.__bus.emit("lookSet", { yaw: DIR_YAW[room.waterway.downstream ?? room.waterway.upstream], pitch: 0 });
      window.__bedSprints = [];
      window.__run.setState({ noisyUntil: 0 });
    });
    await page.keyboard.down("ShiftLeft");
    await page.keyboard.down("KeyW");
    try {
      await page.waitForFunction(() => Math.hypot(window.__playerDebug.x, window.__playerDebug.z) > 1);
    } finally {
      await page.keyboard.up("KeyW");
      await page.keyboard.up("ShiftLeft");
    }
    const samples = await page.evaluate(() => window.__bedSprints);
    assert.ok(samples.length && samples.every(sample => sample.surface === surface), `real sprint uses ${surface} along the drawn channel`);
    return samples[0].hold;
  };
  const wetHold = await sprintOnBed("water");
  await stand({ x: 0, z: 0 }, "water");
  await page.evaluate(() => {
    window.__run.setState({ waterOpenedAt: window.__derived.clock() });
    window.__run.getState().pause();
  });
  const paused = await read();
  await page.waitForTimeout(6500);
  assert.equal(await read(), paused, "paused drainage cannot change the ground guidance");
  await page.evaluate(() => window.__run.getState().resume());
  const sedimentName = await page.evaluate(async () => {
    const { channelSediment } = await import("/src/game/worldbuilding/channelSediment.ts");
    const s = window.__run.getState();
    return channelSediment(s.dungeon.rooms.find(r => r.id === s.currentRoomId)).name.toLowerCase();
  });
  await expectGround(`${sedimentName} · swallows sound`);
  const dry = await page.evaluate(async () => {
    const { footingAt } = await import("/src/game/rooms/underfoot.ts");
    const s = window.__run.getState(), p = window.__playerDebug;
    return footingAt(s.dungeon.rooms.find(r => r.id === s.currentRoomId), p.x, p.z, s.waterOpenedAt, window.__derived.clock());
  });
  assert.equal(dry, "silt", "stationary HUD and footsteps agree on the exposed sediment after live drainage");
  const dryHold = await sprintOnBed("silt");
  assert.ok(dryHold < wetHold * 0.6, `the same return route carries less sprint noise after drainage: ${wetHold} -> ${dryHold}`);
  mkdirSync("output/playwright/underfoot", { recursive: true });
  await page.screenshot({ path: "output/playwright/underfoot/drained.png" });
  assert.deepEqual(errors, []);
  console.log("PASS live drainage exposes quiet sediment, with matching guidance and real sprint noise; pause freezes drainage");
} finally {
  await browser.close();
}
