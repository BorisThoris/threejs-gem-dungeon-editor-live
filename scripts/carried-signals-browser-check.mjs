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
  assert.deepEqual(errors, []);
  console.log("PASS carried signals: full, dim and dark lanterns, key and wisp through entry, descent and restart");
} finally { await browser.close(); }
