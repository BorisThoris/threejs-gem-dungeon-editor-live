import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(120000);
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
  // A ward's light is gameplay feedback: it must not advertise protection
  // after the authoritative deadline. Inspect the existing cairn light.
  await page.evaluate(async () => {
    const { wardNow, runClock } = await import("/src/game/state/run.ts");
    window.__wardSample = () => {
      let light;
      window.__scene.traverse(o => {
        if (o.isPointLight && o.parent.children.filter(c => c.geometry?.type === "DodecahedronGeometry").length === 2) light = o;
      });
      const s = window.__run.getState();
      return { room: wardNow(s), clock: runClock(s), intensity: light?.intensity,
        halo: light?.parent.children.find(c => c.geometry?.type === "CircleGeometry")?.material.opacity };
    };
  });
  for (const charge of ["plain", "blessed", "cursed"]) {
    await page.evaluate(() => window.__run.getState().startRun(11));
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    const duration = await page.evaluate(async charge => {
      const { WARD_S } = await import("/src/game/items/catalog.ts");
      const { scaled } = await import("/src/game/items/charge.ts");
      const s = window.__run.getState();
      window.__run.setState({ satchel: ["wardstone", "wardstone"], charges: { ...s.charges, wardstone: charge } });
      return scaled(WARD_S, charge);
    }, charge);
    await page.keyboard.press("1");
    await page.waitForFunction(() => window.__wardSample().intensity > 0);
    await page.evaluate(() => {
      const run = window.__run;
      run.getState().pause();
      // Shorten only the fixture's deadline; expiry still runs through the
      // real paused clock and ward owner, with no timer or light injection.
      run.setState({ wardUntil: window.__wardSample().clock + .3 });
    });
    await page.waitForTimeout(200);
    const frozen = await page.evaluate(() => window.__wardSample());
    await page.waitForTimeout(500);
    assert.deepEqual(await page.evaluate(() => window.__wardSample()), frozen, `${charge}: pause preserves protection and its glow`);
    await page.evaluate(() => window.__run.getState().resume());
    await page.waitForFunction(() => window.__wardSample().room === null);
    await page.waitForTimeout(250);
    const expired = await page.evaluate(() => window.__wardSample());
    assert.equal(expired.intensity, 0, `${charge}: an expired ward cannot keep lighting the room`);
    assert.equal(expired.halo, 0, `${charge}: the protective halo ends with protection`);
    await page.keyboard.press("KeyI");
    await page.getByTestId("inspect-slot-0").click();
    const description = await page.getByTestId("inventory-item-details").innerText();
    assert.ok(description.includes(`${duration} seconds`), `${charge}: inspection names the charged protection duration`);
    assert.match(description, /another.*moves the protection/i);
    console.log(`PASS ${charge} ward: paused glow, expiry and ${duration}s explanation`);
  }
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  const rooms = await page.evaluate(() => {
    const s = window.__run.getState(), here = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    window.__run.setState({ satchel: ["wardstone", "wardstone"], charges: { ...s.charges, wardstone: "blessed" } });
    return { first: here.id, second: Object.values(here.links).find(Boolean) };
  });
  await page.keyboard.press("1");
  await page.waitForFunction(() => window.__wardSample().intensity > 0);
  await page.evaluate(id => window.__run.setState({ currentRoomId: id, transitioning: true }), rooms.second);
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.keyboard.press("1");
  await page.waitForFunction(id => window.__wardSample().room === id && window.__wardSample().intensity > 0, rooms.second);
  await page.evaluate(id => window.__run.setState({ currentRoomId: id, transitioning: true }), rooms.first);
  await page.waitForFunction(() => !window.__run.getState().transitioning && window.__wardSample().intensity === 0);
  const replaced = await page.evaluate(() => window.__wardSample());
  assert.equal(replaced.room, rooms.second, "placing a second ward transfers protection to its room");
  assert.equal(replaced.halo, 0, "returning to a replaced ward cannot relight its protective halo");
  console.log("PASS a replacement ward protects its new room and leaves the old stone dark on return");
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
