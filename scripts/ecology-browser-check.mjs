import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5202"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixture = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { croakersFor } = await import("/src/game/mobs/ambient.ts");
    const { croakerHabitats } = await import("/src/game/mobs/croakerHabitat.ts");
    for (let seed = 1; seed < 100; seed++) {
      const dungeon = generateDungeon({ seed, floor: 2 });
      for (const room of dungeon.rooms.filter(r => r.waterway)) {
        const habitats = croakerHabitats(room, croakersFor(room, dungeon.seed), dungeon.seed);
        if (habitats.length >= 2 && habitats.every(h => h.followsChannel)) return { dungeon, room, habitats };
      }
    }
    throw Error("No migrating colony found");
  });
  await page.evaluate(({ dungeon, room }) => {
    window.__run.setState({ dungeon, currentRoomId: room.id, floor: 2, waterOpenedAt: null, waterCacheTaken: false,
      transitioning: false, floorRooms: 0, wardenRoomId: null, harrierAwake: false, harrierSlain: true, reaperAwake: false, thiefPhase: "away" });
    window.__bus.emit("teleport", { position: [0, 1.5, 0] });
  }, fixture);
  await page.waitForFunction(id => window.__croakers?.room === id && window.__croakers.singing > 0, fixture.room.id);
  const before = await page.evaluate(() => ({ ...window.__croakers }));
  assert.ok(Math.hypot(before.x - fixture.habitats[0].wet.x, before.z - fixture.habitats[0].wet.z) < 0.01, "colony begins at the live channel");
  await page.evaluate(() => window.__bus.emit("propBroken", { roomId: window.__run.getState().currentRoomId }));
  await page.waitForFunction(() => window.__croakers.under === window.__croakers.total);
  assert.equal(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").visible), false, "loud noise hides diving frogs");
  await page.waitForFunction(() => window.__croakers.under === 0, null, { timeout: 20000 });
  assert.equal(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").visible), true, "frogs visibly resurface");
  await page.evaluate(() => window.__run.setState({ waterOpenedAt: window.__derived.clock() }));
  await page.waitForFunction(() => window.__croakers.migrating > 0);
  const frozen = await page.evaluate(() => { window.__run.getState().pause(); return { x: window.__croakers.x, z: window.__croakers.z }; });
  await page.waitForTimeout(1000);
  assert.deepEqual(await page.evaluate(() => ({ x: window.__croakers.x, z: window.__croakers.z })), frozen, "migration freezes while paused");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__croakers.sheltered === window.__croakers.total);
  const after = await page.evaluate(() => ({ ...window.__croakers }));
  assert.equal(after.singing, 0, "dry channel loses its chorus");
  assert.ok(Math.hypot(after.x - fixture.habitats[0].refuge.x, after.z - fixture.habitats[0].refuge.z) < 0.01, "toads reach their real damp refuge");
  assert.ok(await page.evaluate(async habitats => {
    const { floorHeightAt } = await import("/src/game/worldbuilding/elevation.ts");
    const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    return habitats.every((h, i) => {
      const body = window.__scene.getObjectByName(`croaker-${i}`);
      return body && Math.abs(body.position.y - floorHeightAt(room, h.refuge.x, h.refuge.z) - 0.045) < 0.01;
    });
  }, fixture.habitats), "sheltered toads stand on the actual refuge floor");
  await page.evaluate(() => window.__bus.emit("propBroken", { roomId: window.__run.getState().currentRoomId }));
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.__croakers.under), 0, "sheltered toads cannot dive into a dry channel");
  await page.evaluate(() => { window.__run.getState().pause(); window.__run.setState({ currentRoomId: window.__run.getState().dungeon.startId }); });
  await page.waitForTimeout(300);
  await page.evaluate(id => window.__run.setState({ currentRoomId: id }), fixture.room.id);
  await page.waitForFunction(() => !!window.__scene.getObjectByName("croaker-0"));
  const pausedBody = await page.evaluate(() => window.__scene.getObjectByName("croaker-0").position.toArray());
  assert.ok(Math.hypot(pausedBody[0] - fixture.habitats[0].refuge.x, pausedBody[2] - fixture.habitats[0].refuge.z) < 0.01,
    "paused remount starts at the persistent refuge without waiting for an active frame");
  await page.waitForTimeout(400);
  assert.deepEqual(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").position.toArray()), pausedBody, "paused refuge stays still");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(id => window.__croakers?.room === id && window.__croakers.sheltered === window.__croakers.total, fixture.room.id);
  assert.ok(Math.hypot((await page.evaluate(() => window.__croakers.x)) - fixture.habitats[0].refuge.x, (await page.evaluate(() => window.__croakers.z)) - fixture.habitats[0].refuge.z) < 0.01, "revisiting preserves habitat relocation");
  assert.deepEqual(errors, []);
  console.log("PASS ecology: channel gathering, migration, paused movement, dry chorus, no dry diving and persistent refuges");
} finally { await browser.close(); }
