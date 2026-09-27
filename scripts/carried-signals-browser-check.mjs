import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__din && window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const cases = await page.evaluate(() => {
    const run = window.__run, din = window.__din;
    const sample = () => {
      const s = run.getState();
      return { floor: s.floor, glim: s.glim, keys: s.keys, wisp: s.wispOut,
        lantern: din.holding("lantern"), key: din.holding("carried:key"), wispHeld: din.holding("wisp"),
        sources: din.snapshot(s.currentRoomId).filter(source => ["lantern", "carriedKey", "wisp"].includes(source.source)) };
    };
    return [100, 51, 0].map(band => {
      run.getState().startRun(72);
      run.getState().roomReady(run.getState().dungeon.startId);
      if (band > 0) {
        run.getState().toggleLantern();
        while (run.getState().glim > band) run.getState().toggleLantern();
      }
      run.getState().takeKey(run.getState().dungeon.keyRoomId);
      run.getState().setWisp(band > 0);
      const before = sample();
      const s = run.getState(), room = s.dungeon.rooms.find(room => room.id === s.currentRoomId);
      const dir = Object.keys(room.links).find(dir => room.links[dir] !== s.dungeon.endId && room.links[dir] !== s.dungeon.vaultId);
      run.getState().travel(dir);
      run.getState().roomReady(run.getState().currentRoomId);
      const entered = sample();
      run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
      run.getState().roomReady(run.getState().dungeon.endId);
      run.getState().roomReady(run.getState().dungeon.startId);
      const descended = sample();
      run.getState().startRun(73);
      const restarted = sample();
      return { band, before, entered, descended, restarted };
    });
  });
  for (const test of cases) {
    console.log(JSON.stringify(test));
    assert.equal(test.descended.floor, 2, "fixture descends through the real floor action");
    assert.equal(test.descended.glim, test.band, "the selected lantern band survives descent");
    for (const sample of [test.before, test.entered, test.descended, test.restarted]) {
      assert.equal(sample.lantern, sample.glim > 0, "the lantern's signal follows its actual carried light");
      assert.equal(sample.key, sample.keys > 0, "the key's signal follows inventory across resets");
      assert.equal(sample.wispHeld, sample.wisp, "the wisp signal follows its current presence");
      assert.equal(sample.sources.filter(s => s.source === "lantern").length, sample.glim > 0 ? 1 : 0, "moving leaves one lantern source");
      if (sample.glim > 0) assert.equal(sample.sources.find(s => s.source === "lantern").here, sample.glim / 100, "receivers in the destination get the actual band strength");
    }
  }
  const vaults = await page.evaluate(() => [false, true].map(seal => {
    const run = window.__run;
    run.getState().startRun(72);
    run.getState().roomReady(run.getState().dungeon.startId);
    run.getState().takeKey(run.getState().dungeon.keyRoomId);
    run.setState({ relics: seal ? ["cut"] : [] });
    const opened = run.getState().unlockRoom(run.getState().dungeon.vaultId);
    return { seal, opened, keys: run.getState().keys, held: window.__din.holding("carried:key") };
  }));
  for (const vault of vaults) {
    assert.equal(vault.opened, true);
    assert.equal(vault.keys, vault.seal ? 1 : 0);
    assert.equal(vault.held, vault.keys > 0, "opening a vault only silences a key that was actually spent");
  }
  console.log("PASS Company Seal: a retained key remains audible; a spent key does not");
  const routes = await page.evaluate(async () => {
    const { expireGrate, runClock } = await import("/src/game/state/run.ts");
    const { aged } = await import("/src/game/din/carry.ts");
    const run = window.__run, din = window.__din;
    run.getState().startRun(72);
    run.getState().roomReady(run.getState().dungeon.startId);
    const room = (id, links, x) => ({ id, links, grid: { x, z: 0 }, kind: "normal",
      shape: "square", size: 20, seed: 5, biome: "hewn" });
    const rooms = [room("a", { east: "b" }, 0), room("b", { west: "a" }, 1)];
    run.setState({ dungeon: { ...run.getState().dungeon, rooms, startId: "a", endId: "b", vaultId: null },
      currentRoomId: "a", paused: false, transitioning: false, inputLocks: 0, sealedRoomId: null });
    run.getState().toggleLantern();
    run.getState().takeKey("a");
    const sample = () => ({ light: din.arriving("bright", "b"), carried: din.arriving("carried", "b"),
      thiefHearsKey: din.reaches("cutpurse", "carried", "b"),
      key: din.holding("carried:key"), lamp: din.holding("lantern") });
    const open = sample();
    // An already heard impulse must not be erased by the later barricade.
    din.advance(runClock(run.getState()));
    din.strike("keyDropped", rooms, rooms[0], 2, 3);
    const emittedAt = din.dinClock();
    const impulse = () => {
      const arrival = din.emptyArrival();
      din.strongest(arrival, "metal", "b", "impulse");
      return arrival.magnitude;
    };
    const beforeImpulse = impulse();
    const built = run.getState().barDoor("b");
    const barred = sample(), afterImpulse = impulse();
    const expectedImpulse = aged(beforeImpulse, din.dinClock() - emittedAt);
    const removed = run.getState().tearDownBar("b");
    const reopened = sample();
    run.getState().dropGrate("b");
    const grated = sample();
    // Expiry goes through the same publisher that opens the rendered grate.
    run.setState({ barUntil: runClock(run.getState()) - 1 });
    expireGrate();
    const expired = sample();
    run.getState().dropGrate("b");
    run.getState().breakBar(false);
    const broken = sample();
    return { open, built, barred, expectedImpulse, afterImpulse, removed, reopened, grated, expired, broken };
  });
  console.log(JSON.stringify(routes));
  assert.equal(routes.built, true);
  assert.ok(routes.open.light > 0 && routes.open.carried > 0, "open doorway carries ongoing sources");
  for (const sample of [routes.barred, routes.grated]) {
    assert.equal(sample.light, 0, "a closed doorway stops ongoing light");
    assert.equal(sample.carried, 0, "a closed doorway stops ongoing carried-key signals");
    assert.equal(sample.thiefHearsKey, false, "the Cutpurse cannot detect the key through a blocked route");
    assert.equal(sample.key && sample.lamp, true, "blocking a route does not extinguish its sources");
  }
  assert.equal(routes.afterImpulse, routes.expectedImpulse, "closing a door cannot un-hear an earlier impulse");
  assert.equal(routes.removed, true);
  for (const sample of [routes.reopened, routes.expired, routes.broken]) assert.deepEqual(sample, routes.open,
    "removing, expiring or breaking a bar restores ongoing signals without retoggling them");
  console.log("PASS ongoing signals follow barricades and grates while earlier impulses retain their reach");
  const secret = await page.evaluate(() => {
    const run = window.__run, din = window.__din;
    run.getState().startRun(72);
    run.getState().roomReady(run.getState().dungeon.startId);
    const host = run.getState().dungeon.rooms.find(room => room.secret);
    if (!host) throw Error("Seed 72 needs a generated secret wall");
    run.setState({ currentRoomId: host.id });
    run.getState().toggleLantern();
    run.getState().takeKey(host.id);
    const before = din.arriving("bright", host.secret.to);
    run.getState().revealSecret(host.id);
    return { before, after: din.arriving("bright", host.secret.to),
      thiefHearsKey: din.reaches("cutpurse", "carried", host.secret.to) };
  });
  assert.equal(secret.before, 0, "a secret wall blocks existing ongoing sources");
  assert.equal(secret.after, routes.open.light, "opening the real secret passage carries existing light into it");
  assert.equal(secret.thiefHearsKey, true, "opening a route exposes the existing carried key to listeners");
  console.log("PASS opening a generated secret passage updates ongoing light and creature hearing");
  assert.deepEqual(errors, []);
  console.log("PASS carried signals: full, dim and dark lanterns, key and wisp through entry, descent and restart");
} finally { await browser.close(); }
