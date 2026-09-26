import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } }), errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() => {
    localStorage.setItem("gem-dungeon.settings", JSON.stringify({ touchControls: "on", cameraBob: false }));
    window.barPad = null; navigator.getGamepads = () => window.barPad ? [window.barPad] : [];
  });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5222}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__pursuit && window.__awareness && window.__blockLighting && window.__playerDebug);
  const stock = await page.evaluate(() => {
    const run = window.__run, s = run.getState(), edges = [], seen = new Set();
    for (const room of s.dungeon.rooms) for (const to of Object.values(room.links)) {
      const target = s.dungeon.rooms.find(r => r.id === to), key = [room.id, to].sort().join("|");
      if (target?.kind === "end" || room.kind === "end" || to === s.dungeon.vaultId || seen.has(key)) continue;
      seen.add(key); edges.push({ from: room.id, to });
    }
    if (edges.length < 4) throw Error("Need four real door edges");
    run.setState({ barricades: [], paused: false, transitioning: false, sealedRoomId: null });
    const placed = edges.slice(0, 3).map(edge => {
      run.setState({ currentRoomId: edge.from }); return run.getState().barDoor(edge.to);
    });
    const saved = [...run.getState().barricades];
    run.setState({ currentRoomId: edges[3].from });
    const exhausted = !run.getState().barDoor(edges[3].to);
    run.setState({ currentRoomId: edges[0].to });
    const reverseRemoval = run.getState().tearDownBar(edges[0].from);
    const noDuplicateRefund = !run.getState().tearDownBar(edges[0].from);
    run.setState({ currentRoomId: edges[3].from });
    const reused = run.getState().barDoor(edges[3].to);
    const beforeGrate = [...run.getState().barricades];
    run.getState().dropGrate(edges[3].to); run.getState().breakBar();
    const grateIndependent = JSON.stringify(beforeGrate) === JSON.stringify(run.getState().barricades);
    run.getState().pause();
    const paused = !run.getState().tearDownBar(edges[3].to);
    const pausedFor = run.getState().pausedFor;
    run.setState({ paused: false, pausedFor: pausedFor - 120 });
    const persistent = beforeGrate.every(key => window.__derived.bars().has(key));
    run.setState({ pausedFor, currentRoomId: run.getState().dungeon.endId, transitioning: true, floor: 1 });
    run.getState().roomReady(run.getState().dungeon.endId);
    const floorReset = run.getState().floor === 2 && run.getState().barricades.length === 0;
    run.getState().startRun(11);
    return { placed, saved, exhausted, reverseRemoval, noDuplicateRefund, reused, grateIndependent, paused, persistent, floorReset,
      reset: run.getState().barricades.length === 0 };
  });
  assert.equal(stock.saved.length, 3); assert.ok(stock.placed.every(Boolean));
  for (const key of ["exhausted", "reverseRemoval", "noDuplicateRefund", "reused", "grateIndependent", "paused", "persistent", "floorReset", "reset"]) assert.ok(stock[key], key);

  await page.evaluate(() => {
    const run = window.__run;
    const room = (id, links, x) => ({ id, kind: "normal", shape: "square", size: 20, links, seed: 5,
      biome: "hewn", grid: { x, z: 0 } });
    const dungeon = { ...run.getState().dungeon, seed: 888, startId: "a", endId: "exit", vaultId: null,
      keyRoomId: null, rooms: [room("a", { east: "b" }, 0), room("b", { west: "a", east: "exit" }, 1),
        { ...room("exit", { west: "b" }, 2), kind: "end" }] };
    run.setState({ dungeon, currentRoomId: "b", floor: 1, floorRooms: 2, visited: ["a", "b"],
      phase: "playing", paused: false, transitioning: false, inputLocks: 0, enteredBy: null,
      wardenRoomId: null, reaperAwake: false, harrierAwake: false, thiefPhase: "away",
      barricades: [], barredDoor: null, barUntil: 0, alarm: 0, noisyUntil: 0 });
  });
  await page.waitForFunction(() => window.__blockLighting.roomId === "b");
  await page.evaluate(() => {
    window.__bus.emit("teleport", { position: [-8.8, 1.8, 0] });
    window.__bus.emit("lookSet", { yaw: Math.PI / 2, pitch: 0 });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const run = window.__run;
    run.setState({ barredDoor: "a|b", barUntil: window.__derived.clock() + 0.8 });
  });
  await page.getByTestId("prompt-text").filter({ hasText: "The grate is still down" }).waitFor();
  await page.waitForFunction(() => window.__run.getState().barredDoor === null, null, { timeout: 3000 });
  await page.getByTestId("prompt-text").filter({ hasText: "Open a chamber" }).waitFor({ timeout: 3000 });
  await page.keyboard.press("KeyB");
  await page.waitForFunction(() => window.__run.getState().barricades.includes("a|b"));
  await page.waitForFunction(() => document.querySelector('[data-testid="bars-stock"]').textContent.includes("2/3"));
  assert.match(await page.locator('[data-testid="bars-stock"]').innerText(), /2\/3/);
  await page.waitForFunction(() => document.body.innerText.includes("Tear down your barricade"));
  await page.keyboard.down("KeyW"); await page.waitForTimeout(600); await page.keyboard.up("KeyW");
  assert.ok(await page.evaluate(() => window.__playerDebug.x > -9.9 && window.__playerDebug.x < -9), "physical barricade stops walking through the gap");
  const blockedTravel = await page.evaluate(() => { window.__run.getState().travel("west"); return window.__run.getState().currentRoomId; });
  assert.equal(blockedTravel, "b", "travel cannot silently dismantle bars");
  mkdirSync("output/playwright/barricades", { recursive: true });
  await page.locator('[data-testid="moment-descent"]').waitFor({ state: "hidden" });
  await page.screenshot({ path: "output/playwright/barricades/built.png" });

  await page.evaluate(() => {
    const run = window.__run, now = window.__derived.clock(), ladder = window.__awareness, pursuit = window.__pursuit;
    window.__din.reset(); pursuit.resetPursuit(); ladder.reset(); ladder.setCeiling("warden", 3);
    run.setState({ wardenRoomId: "a", wardenCameFrom: null, wardenStaggerUntil: 0,
      reaperAwake: true, reaperRoomId: "a", reaperCameFrom: null, reaperStalledUntil: 0,
      harrierAwake: true, harrierRoomId: "a", harrierCameFrom: null, harrierSlain: false,
      harrierRetreatUntil: 0, harrierDownedUntil: 0, thiefPhase: "stalking", thiefRoomId: "a", thiefCameFrom: null,
      noisyUntil: 0, alarm: 0, lives: 3, lastDamageAt: now });
    for (const who of ["warden", "reaper", "harrier", "cutpurse"]) {
      ladder.wake(who); ladder.report(who, 3, true, true, "a"); pursuit.perceive(who, "a", now);
      pursuit.leaveTrail(who, "a", "a", "b", now, true);
    }
    ladder.advance(now);
    run.getState().moveWarden("b");
    if (run.getState().wardenRoomId !== "a") throw Error("store allowed a barred Warden crossing");
  });
  await page.waitForTimeout(3600);
  const locations = await page.evaluate(() => {
    const s = window.__run.getState(); return [s.wardenRoomId, s.reaperRoomId, s.harrierRoomId, s.thiefRoomId];
  });
  assert.deepEqual(locations, ["a", "a", "a", "a"], "all four pursuers stay behind a barricaded doorway");
  assert.deepEqual(await page.evaluate(() => window.__run.getState().barricades), ["a|b"], "Warden cannot instantly destroy the barricade");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().barricades.length === 0);
  assert.equal(await page.evaluate(() => window.__run.getState().currentRoomId), "b", "tearing down does not also travel");
  await page.waitForFunction(() => {
    const s = window.__run.getState(); return s.reaperRoomId === "b" && s.harrierRoomId === "b" && s.thiefRoomId === "b";
  }, null, { timeout: 10000 });
  await page.evaluate(() => window.__run.getState().pause());
  await page.waitForFunction(() => document.querySelector('[data-testid="bars-stock"]').textContent.includes("3/3"));
  assert.match(await page.locator('[data-testid="bars-stock"]').innerText(), /3\/3/);
  await page.evaluate(() => {
    const run = window.__run;
    run.setState({ wardenRoomId: null, reaperAwake: false, harrierAwake: false, thiefPhase: "away" });
    run.getState().resume();
    window.__bus.emit("teleport", { position: [-8.8, 1.8, 0], yaw: Math.PI / 2 });
    window.__bus.emit("lookSet", { yaw: Math.PI / 2, pitch: 0 });
  });
  await page.waitForTimeout(200);
  await page.locator('[data-testid="touch-bar"]').dispatchEvent("pointerdown", { pointerType: "touch" });
  await page.waitForFunction(() => window.__run.getState().barricades.length === 1);
  await page.keyboard.press("KeyB");
  await page.waitForFunction(() => window.__run.getState().barricades.length === 0);
  await page.evaluate(() => {
    window.barPad = { id: "bar-pad", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 13, touched: i === 13, value: i === 13 ? 1 : 0 })) };
  });
  await page.waitForFunction(() => window.__run.getState().barricades.length === 1);
  await page.evaluate(() => { window.barPad = null; window.__run.getState().pause(); });
  assert.deepEqual(errors, [], "no runtime errors");
  console.log("PASS three reusable kits, independent barriers/grates, both sides, pause/reset, physical door, all pursuers, removal, keyboard/touch/controller");
} finally { await browser.close(); }
