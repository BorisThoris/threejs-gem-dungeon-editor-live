import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

mkdirSync("output/world-review", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5205"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixture = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { bellcapsFor } = await import("/src/game/worldbuilding/bellcaps.ts");
    const { mothRoom } = await import("/src/game/mobs/ambient.ts");
    for (let seed = 1; seed < 200; seed++) {
      const dungeon = generateDungeon({ seed, floor: 1 });
      const room = dungeon.rooms.find(r => r.kind === "normal" && !r.secret && r.id !== mothRoom(dungeon) && bellcapsFor(r).length === 1);
      if (room) return { dungeon, roomId: room.id, cap: bellcapsFor(room)[0] };
    }
    throw Error("No colony fixture");
  });
  await page.evaluate(({ dungeon, roomId, cap }) => {
    window.__run.setState({ dungeon, floor: 1, currentRoomId: roomId, transitioning: false, paused: false, inputLocks: 0,
      waterOpenedAt: null, bellcapBursts: {}, glim: 0, oil: 100, wardenRoomId: null, wardenAwake: false,
      harrierSlain: true, thiefPhase: "away", reaperAwake: false, invulnerableUntil: 1e9 });
    window.__bus.emit("teleport", { position: [cap.x, 1.5, cap.z + 1.5] });
    window.__bus.emit("lookSet", { yaw: 0, pitch: -0.45 });
  }, fixture);
  await page.waitForFunction(() => window.__bellcaps?.charge === 0);
  assert.equal(await page.evaluate(() => window.__run.getState().burstBellcap(0)), false, "dark plants cannot discharge");
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => window.__bellcaps?.charge > 0.3);
  await page.waitForFunction(() => !!document.querySelector('[data-testid="bellcap-warning"]'));
  await page.waitForFunction(() => window.__derived.clock() >= window.__run.getState().glimUpAt);
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => window.__bellcaps?.charge === 0);
  await page.waitForFunction(() => !document.querySelector('[data-testid="bellcap-warning"]'));
  assert.equal(await page.evaluate(() => Object.keys(window.__run.getState().bellcapBursts).length), 0, "lowering the lantern prevents the burst");
  while (await page.evaluate(() => window.__run.getState().glim > 0)) await page.keyboard.press("KeyF", { delay: 100 });
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => window.__bellcaps?.charge > 0.3);
  const frozen = await page.evaluate(() => { window.__run.getState().pause(); return window.__bellcaps.charge; });
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => window.__bellcaps.charge), frozen, "paused warning does not advance");
  await page.evaluate(() => window.__run.getState().resume());
  await page.screenshot({ path: "output/world-review/bellcap-warning.png" });
  await page.waitForFunction(() => Object.keys(window.__run.getState().bellcapBursts).length === 1);
  assert.ok(await page.evaluate(async () => {
    const din = await import("/src/game/din/din.ts");
    return din.snapshot(window.__run.getState().currentRoomId).some(e => e.source === "bellcapBurst" && e.tags.includes("loud"));
  }), "spore discharge sends a real spatial noise signal");
  await page.screenshot({ path: "output/world-review/bellcap-puff.png" });
  assert.equal(await page.evaluate(() => window.__run.getState().burstBellcap(0)), false, "colony needs time to recover");
  const bursts = await page.evaluate(() => window.__run.getState().bellcapBursts);
  await page.evaluate(() => window.__run.setState({ currentRoomId: window.__run.getState().dungeon.startId }));
  await page.waitForTimeout(400);
  await page.evaluate(id => window.__run.setState({ currentRoomId: id }), fixture.roomId);
  await page.waitForFunction(id => window.__bellcaps?.roomId === id && window.__bellcaps.recovering, fixture.roomId);
  assert.deepEqual(await page.evaluate(() => window.__run.getState().bellcapBursts), bursts, "revisiting preserves recovery");
  await page.evaluate(async () => {
    const { runClock } = await import("/src/game/state/run.ts");
    const s = window.__run.getState();
    window.__run.setState({ waterOpenedAt: runClock(s) - 6, bellcapBursts: {}, glim: 100 });
  });
  await page.waitForFunction(() => window.__bellcaps?.dormant);
  assert.equal(await page.evaluate(() => window.__run.getState().burstBellcap(0)), false, "drained colonies cannot discharge");
  await page.waitForTimeout(2000);
  assert.equal(await page.evaluate(() => window.__bellcaps.charge), 0, "light cannot wake a drained colony");
  await page.screenshot({ path: "output/world-review/bellcap-dormant.png" });
  await page.evaluate(() => {
    const s = window.__run.getState();
    window.__run.setState({ bellcapBursts: { fixture: 3 }, currentRoomId: s.dungeon.endId, gems: 20, transitioning: true });
    window.__run.getState().roomReady(s.dungeon.endId);
  });
  await page.waitForFunction(() => window.__run.getState().floor === 2);
  assert.deepEqual(await page.evaluate(() => window.__run.getState().bellcapBursts), {}, "descent clears colony history");
  await page.evaluate(() => { window.__run.setState({ bellcapBursts: { fixture: 3 } }); window.__run.getState().startRun(72); });
  assert.deepEqual(await page.evaluate(() => window.__run.getState().bellcapBursts), {}, "new run clears colony history");
  assert.deepEqual(errors, [], "no runtime or shader errors");
  console.log("PASS bellcaps: lantern warning/cancellation, pause, spore noise, recovery, revisits, drained dormancy and floor/run resets");
} finally { await browser.close(); }
