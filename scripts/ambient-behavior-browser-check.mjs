/** Focused live check for the moth's light hold and a roost's sprint tell. */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__ambient && window.__run?.getState().phase === "playing");
  const moth = await page.evaluate(async () => {
    const run = window.__run, A = window.__ambient, D = window.__derived;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    run.getState().startRun(5);
    await wait(700);
    const d = run.getState().dungeon, id = A.mothRoom(d);
    if (!id) return { error: "no moth room" };
    run.setState({ transitioning: true, currentRoomId: id, oil: 100, lives: 9,
      wardenRoomId: null, harrierAwake: false, reaperAwake: false });
    run.getState().roomReady(id);
    await wait(1600);
    run.getState().toggleLantern();
    for (let i = 0; i < 60 && !run.getState().mothOn; i++) await wait(200);
    const landed = run.getState().mothOn;
    const steps = [];
    await wait(1600);
    for (let i = 0; i < 6 && run.getState().glim > 0; i++) {
      run.getState().toggleLantern();
      await wait(120);
      steps.push({ glim: run.getState().glim, on: run.getState().mothOn,
        hold: +(run.getState().litUntil - D.clock()).toFixed(2), to: window.__moth?.to });
    }
    await wait(900);
    return { id, landed, steps, final: { glim: run.getState().glim, on: run.getState().mothOn,
      hold: +(run.getState().litUntil - D.clock()).toFixed(2), to: window.__moth?.to } };
  });
  console.log("MOTH", JSON.stringify(moth));
  assert.ok(!moth.error && moth.landed, "moth lands on the raised lantern");
  assert.ok(moth.steps.some(step => !step.on && step.hold > 4.5), "the departing moth leaves a longer light trail");

  const roostSeed = Number(process.env.ROOST_SEED || 8);
  const roost = await page.evaluate(async seed => {
    const run = window.__run, A = window.__ambient, D = window.__derived;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    run.getState().startRun(seed);
    await wait(700);
    const d = run.getState().dungeon;
    const room = d.rooms.find(r => A.roostFor(r, d.seed));
    if (!room) return { error: "no roost room" };
    const at = A.roostFor(room, d.seed);
    run.setState({ transitioning: true, currentRoomId: room.id, lives: 9,
      wardenRoomId: null, harrierAwake: false, reaperAwake: false });
    run.getState().roomReady(room.id);
    await wait(1400);
    window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] });
    await wait(2200);
    const before = { probe: window.__bats, hold: D.noiseHold(), rousedFor: run.getState().batsRousedUntil - D.clock(),
      player: window.__playerDebug &&
      { x: window.__playerDebug.x, z: window.__playerDebug.z }, at };
    return { room: room.id, ratRoom: d.rooms.find(r => A.ratsFor(r, d.seed).length >= 2)?.id,
      mothRoom: A.mothRoom(d), before };
  }, roostSeed);
  assert.ok(!roost.error, roost.error);
  let roused = false;
  await page.evaluate(() => { window.__roostEvents = 0; window.__bus.on("batsRoused", () => window.__roostEvents++); });
  const samples = [];
  await page.keyboard.down("ShiftLeft");
  for (let i = 0; i < 5; i++) {
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(280);
    await page.keyboard.up("KeyW");
    await page.keyboard.down("KeyS");
    await page.waitForTimeout(280);
    await page.keyboard.up("KeyS");
    await page.evaluate(at => window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] }), roost.before.at);
    samples.push(await page.evaluate(at => ({ probe: window.__bats, player: window.__playerDebug &&
      { x: window.__playerDebug.x, z: window.__playerDebug.z },
      distance: window.__playerDebug && Math.hypot(window.__playerDebug.x - at.x, window.__playerDebug.z - at.z),
      noise: window.__run.getState().noisyUntil - window.__derived.clock() }), roost.before.at));
  }
  await page.keyboard.up("ShiftLeft");
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ probe: window.__bats, events: window.__roostEvents,
    hold: window.__derived.noiseHold(), player: { x: window.__playerDebug.x, z: window.__playerDebug.z } }));
  roused = after.events > 0;
  console.log("ROOST", JSON.stringify({ seed: roostSeed, ...roost, samples, after }));
  assert.ok(roused, "sprinting under the roost rouses bats");
  assert.deepEqual(errors, [], "no browser errors");
  console.log("PASS  moth and roost behavior");
} finally {
  await browser.close();
}
