import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5202"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const expectChorus = async state => {
    await page.waitForFunction(state => {
      const text = document.querySelector('[data-testid="hud-ground"]')?.textContent ?? "";
      return state === "absent" ? !text.includes("toads") : text.includes(state === "singing" ? "toads sing here" : "toads are quiet");
    }, state, { timeout: 5000 });
  };
  const fixture = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { croakersFor } = await import("/src/game/mobs/ambient.ts");
    const { croakerHabitats } = await import("/src/game/mobs/croakerHabitat.ts");
    for (let seed = 1; seed < 100; seed++) {
      const dungeon = generateDungeon({ seed, floor: 2 });
      for (const room of dungeon.rooms.filter(r => r.waterway && r.secret)) {
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
  await expectChorus("singing");
  const before = await page.evaluate(() => ({ ...window.__croakers }));
  assert.ok(Math.hypot(before.x - fixture.habitats[0].wet.x, before.z - fixture.habitats[0].wet.z) < 0.01, "colony begins at the live channel");
  await page.evaluate(() => window.__bus.emit("propBroken", { roomId: window.__run.getState().currentRoomId, kind: "barrel", key: "ecology-noise", x: 0, z: 0 }));
  await page.waitForFunction(() => window.__croakers.under === window.__croakers.total);
  await expectChorus("quiet");
  assert.equal(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").visible), false, "loud noise hides diving frogs");
  const diveClock = await page.evaluate(() => window.__derived.clock());
  await page.waitForFunction(at => window.__derived.clock() >= at + 2, diveClock);
  const pausedClock = await page.evaluate(() => {
    window.__run.getState().pause();
    return window.__derived.clock();
  });
  const revisit = async () => {
    await page.evaluate(async id => {
      const { croakersFor } = await import("/src/game/mobs/ambient.ts");
      const d = window.__run.getState().dungeon;
      window.__run.setState({ currentRoomId: d.rooms.find(r => r.id !== id && !croakersFor(r, d.seed).length).id });
    }, fixture.room.id);
    await page.waitForFunction(() => !window.__scene.getObjectByName("croaker-0"));
    await expectChorus("absent");
    await page.evaluate(id => window.__run.setState({ currentRoomId: id }), fixture.room.id);
    await page.waitForFunction(() => !!window.__scene.getObjectByName("croaker-0"));
  };
  await revisit();
  assert.equal(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").visible), false,
    "paused revisit keeps frightened toads hidden before any simulation frame");
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.__derived.clock()), pausedClock, "pause preserves the dive's recovery clock");
  const opened = await page.evaluate(id => {
    const before = window.__run.getState().dungeon.rooms.find(r => r.id === id);
    window.__run.getState().revealSecret(id);
    const after = window.__run.getState().dungeon.rooms.find(r => r.id === id);
    return before !== after && after.links[after.secret.dir] === after.secret.to;
  }, fixture.room.id);
  assert.ok(opened, "opening the real secret replaces the room's topology");
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").visible), false,
    "opening a secret cannot erase a frightened colony's memory");
  await revisit();
  assert.equal(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").visible), false,
    "the opened room keeps that disturbance on later visits too");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(id => window.__croakers?.room === id, fixture.room.id);
  assert.equal(await page.evaluate(() => window.__croakers.singing), 0, "returning to a disturbed room keeps its chorus silent");
  await expectChorus("quiet");
  await page.waitForFunction(() => window.__croakers.under === 0, null, { timeout: 20000 });
  const recovery = await page.evaluate(async () => {
    const { CROAKER_UNDER_S } = await import("/src/game/world.ts");
    return { clock: window.__derived.clock(), duration: CROAKER_UNDER_S };
  });
  assert.ok(recovery.clock - diveClock >= recovery.duration - 0.5, "revisit does not shorten the dive timer");
  assert.ok(recovery.clock - diveClock <= recovery.duration + 1, "revisit does not restart the dive timer");
  assert.equal(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").visible), true, "frogs visibly resurface");
  await expectChorus("singing");
  await page.evaluate(() => window.__run.setState({ waterOpenedAt: window.__derived.clock() }));
  await page.waitForFunction(() => window.__croakers.migrating > 0);
  const frozen = await page.evaluate(() => { window.__run.getState().pause(); return { x: window.__croakers.x, z: window.__croakers.z }; });
  await page.waitForTimeout(1000);
  assert.deepEqual(await page.evaluate(() => ({ x: window.__croakers.x, z: window.__croakers.z })), frozen, "migration freezes while paused");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__croakers.sheltered === window.__croakers.total);
  const after = await page.evaluate(() => ({ ...window.__croakers }));
  assert.equal(after.singing, 0, "dry channel loses its chorus");
  await expectChorus("quiet");
  assert.ok(await page.evaluate(() => {
    for (let i = 0; i < window.__croakers.total; i++) {
      const scale = window.__scene.getObjectByName(`croaker-throat-${i}`).scale;
      if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) return false;
    }
    return true;
  }), "sheltered, silent toads stop the singing throat animation");
  assert.ok(Math.hypot(after.x - fixture.habitats[0].refuge.x, after.z - fixture.habitats[0].refuge.z) < 0.01, "toads reach their real damp refuge");
  assert.ok(await page.evaluate(async habitats => {
    const { floorHeightAt } = await import("/src/game/worldbuilding/elevation.ts");
    const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    return habitats.every((h, i) => {
      const body = window.__scene.getObjectByName(`croaker-${i}`);
      return body && Math.abs(body.position.y - floorHeightAt(room, h.refuge.x, h.refuge.z) - 0.045) < 0.01;
    });
  }, fixture.habitats), "sheltered toads stand on the actual refuge floor");
  await page.evaluate(() => window.__bus.emit("propBroken", { roomId: window.__run.getState().currentRoomId, kind: "barrel", key: "ecology-noise", x: 0, z: 0 }));
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
  await expectChorus("quiet");
  assert.ok(Math.hypot((await page.evaluate(() => window.__croakers.x)) - fixture.habitats[0].refuge.x, (await page.evaluate(() => window.__croakers.z)) - fixture.habitats[0].refuge.z) < 0.01, "revisiting preserves habitat relocation");
  // A fresh floor may reuse room IDs, but it must not inherit animal memory.
  await page.evaluate(() => window.__run.setState({ waterOpenedAt: null }));
  await page.evaluate(() => window.__bus.emit("propBroken", { roomId: window.__run.getState().currentRoomId, kind: "barrel", key: "reset-noise", x: 0, z: 0 }));
  await page.waitForFunction(() => window.__croakers.under === window.__croakers.total);
  await page.evaluate(() => window.__run.getState().pause());
  await revisit();
  assert.equal(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").visible), false, "second disturbance also survives remount");
  await page.evaluate(id => window.__run.setState({ currentRoomId: id }), fixture.dungeon.startId);
  await page.waitForFunction(id => !window.__croakers || window.__croakers.room !== id, fixture.room.id);
  await page.evaluate(({ dungeon, room }) => window.__run.setState({ dungeon, currentRoomId: room.id }), fixture);
  await page.waitForFunction(() => !!window.__scene.getObjectByName("croaker-0"));
  assert.equal(await page.evaluate(() => window.__scene.getObjectByName("croaker-0").visible), true,
    "new floor objects with the same room IDs do not inherit the old disturbance");
  assert.deepEqual(errors, []);
  console.log("PASS ecology: persistent alarm and recovery, pause, fresh-floor reset, migration, dry chorus, refuges and matching HUD/body tells");
} finally { await browser.close(); }
