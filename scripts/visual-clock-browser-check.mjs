import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__scene && window.__run?.getState().phase === "playing");
  const fixtures = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { placementsFor } = await import("/src/game/rooms/placements.ts");
    const { gemFor } = await import("/src/game/rooms/kinds.ts");
    const found = {};
    for (let seed = 1; seed < 100 && Object.keys(found).length < 4; seed++) {
      const dungeon = generateDungeon({ seed, floor: 2 });
      for (const room of dungeon.rooms) {
        const row = { dungeon, roomId: room.id, seed };
        if (gemFor(room, dungeon.seed)) found.gem ??= row;
        if (room.id === dungeon.keyRoomId) found.key ??= row;
        if (room.kind === "memory") found.crystals ??= row;
        if (placementsFor(room, dungeon.seed).some(p => p.kind === "candle")) found.candle ??= row;
      }
    }
    return found;
  });
  assert.equal(Object.keys(fixtures).length, 4, "generated rooms cover the visual clocks");
  const snapshot = () => {
    const rows = [];
    window.__scene.traverse(object => {
      if (object.isPointLight || ["collectible-gem", "iron-key"].includes(object.name) || object.geometry?.type === "OctahedronGeometry")
        rows.push({ id: object.uuid, name: object.name, position: object.position.toArray(),
          rotation: object.rotation.toArray(), intensity: object.isPointLight ? object.intensity : null });
    });
    return rows;
  };
  for (const [name, fixture] of Object.entries(fixtures)) {
    await page.evaluate(({ dungeon, roomId, seed }) => {
      window.__run.getState().startRun(seed);
      window.__run.setState({ dungeon, floor: 2, currentRoomId: roomId, phase: "playing",
        paused: false, transitioning: false, inputLocks: 0, glim: 0, wardenRoomId: null,
        wardenAwake: false, harrierAwake: false, reaperAwake: false, wispOut: false });
      window.__run.getState().pause();
    }, fixture);
    await page.waitForFunction(id => window.__blockLighting?.roomId === id, fixture.roomId);
    await page.waitForTimeout(500);
    const before = await page.evaluate(snapshot);
    assert.ok(before.length > 0, `${name} has visible animated objects`);
    await page.waitForTimeout(500);
    assert.deepEqual(await page.evaluate(snapshot), before, `${name}: paused poses and practical lights stay still`);
    await page.evaluate(() => window.__run.getState().resume());
    await page.waitForTimeout(140);
    await page.evaluate(() => window.__run.getState().pause());
    await page.waitForTimeout(120);
    assert.notDeepEqual(await page.evaluate(snapshot), before, `${name}: animation resumes with the run`);
    console.log(`PASS ${name}: paused poses and practical light, then resumed animation`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
