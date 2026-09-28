import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__playerDebug && window.__run && !window.__run.getState().transitioning);
  await page.evaluate(() => {
    const run = window.__run;
    const room = (id, links, x, z) => ({ id, kind: "normal", shape: "square", size: 20,
      links, seed: 5, biome: "hewn", district: "works", grid: { x, z } });
    const rooms = [room("source", { east: "middle", north: "detour" }, 0, 0),
      room("middle", { west: "source", north: "host" }, 1, 0),
      room("host", { south: "middle", west: "detour" }, 1, -1),
      room("detour", { south: "source", east: "host" }, 0, -1),
      { ...room("secret", {}, 2, -1), kind: "secret" }];
    rooms[0].landmark = "hoist";
    rooms[2].secret = { dir: "east", to: "secret" };
    const route = ["source", "middle", "host"];
    const dungeon = { ...run.getState().dungeon, seed: 888, startId: "source", endId: "unused-exit",
      vaultId: null, keyRoomId: null, secretId: "secret", rooms,
      serviceTrail: { route, hostId: "host" },
      secretTrail: { route, sourceId: "source", hostId: "host", landmark: "hoist" } };
    run.setState({ dungeon, currentRoomId: "source", floor: 1, visited: ["source"], mapped: false,
      phase: "playing", paused: false, transitioning: false, inputLocks: 0, enteredBy: null,
      wardenRoomId: null, reaperAwake: false, harrierSlain: true, thiefPhase: "away",
      barricades: [], barredDoor: null, barUntil: 0, sealedRoomId: null, placed: [],
      waterCacheTaken: false, lastDamageAt: Infinity });
  });
  await page.waitForFunction(() => window.__blockLighting?.roomId === "source");
  const rubbing = page.getByTestId("service-rubbing"), tally = page.getByTestId("secret-trail-guide");
  assert.equal(await rubbing.count(), 0, "the service route needs its own discovered rubbing");
  // Mapping gives the outline, but returning to a named landmark requires
  // having discovered it. The same remembered place names the symbol and row.
  await page.evaluate(() => window.__run.setState({ visited: [], mapped: true }));
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-map").click();
  assert.equal(await page.getByTestId("map-landmark-choice").count(), 0);
  assert.equal(await page.getByTestId("map-district-landmark").count(), 0);
  await page.evaluate(() => window.__run.setState({ visited: ["source"] }));
  const landmark = page.getByTestId("map-landmark-choice");
  await landmark.filter({ hasText: "Chain hoist" }).waitFor();
  assert.match(await landmark.innerText(), /landmark tally begins here/);
  for (const map of ["minimap", "floor-map"])
    assert.match(await page.getByTestId(map).getByTestId("map-district-landmark").textContent(), /Chain hoist/);
  const memory = () => {
    const s = window.__run.getState();
    return { clock: window.__derived.clock(), room: s.currentRoomId, visited: s.visited, marks: s.marks, gems: s.gems };
  };
  const beforeSelection = await page.evaluate(memory);
  await landmark.focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.getByTestId("map-selected-service").getAttribute("data-room-id"), "source");
  assert.equal(await landmark.getAttribute("aria-pressed"), "true");
  assert.deepEqual(await page.evaluate(memory), beforeSelection, "landmark selection only highlights the remembered room");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__settings.getState().setUiScale(1.6));
  await landmark.scrollIntoViewIfNeeded();
  assert.ok(await landmark.evaluate(el => {
    const box = el.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1;
  }), "landmark names and directions fit large phone text");
  if (process.env.TRAIL_REVIEW === "1") {
    mkdirSync("output/playwright/trail-guidance", { recursive: true });
    await page.getByTestId("map-landmarks").screenshot({ path: "output/playwright/trail-guidance/landmarks-phone.png" });
  }
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects, gloom: window.__derived.clock() + 20 } }));
  await page.getByTestId("map-landmarks").waitFor({ state: "detached" });
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects, gloom: 0 } }));
  await landmark.waitFor();
  await landmark.click();
  await page.getByTestId("map-selected-service").waitFor({ state: "detached" });
  await page.evaluate(() => { window.__settings.getState().setUiScale(1); window.__run.setState({ mapped: false }); });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByTestId("pause-resume").click();
  await page.evaluate(() => window.__run.setState({ waterCacheTaken: true }));
  const expectBoth = async fragment => {
    await rubbing.filter({ hasText: fragment }).waitFor();
    await tally.filter({ hasText: fragment }).waitFor();
  };
  await expectBoth("east");
  const faceDoor = async dir => {
    await page.evaluate(async dir => {
      const { doorReach } = await import("/src/game/dungeon/footprint.ts");
      const { DIR_STEP, DIR_YAW } = await import("/src/game/dungeon/types.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const step = DIR_STEP[dir], reach = doorReach(room, dir) - 0.9;
      window.__bus.emit("teleport", { position: [step.x * reach, 1.5, step.z * reach] });
      window.__bus.emit("lookSet", { yaw: DIR_YAW[dir], pitch: 0 });
    }, dir);
    await page.waitForTimeout(300);
  };
  await faceDoor("east");
  await page.keyboard.press("KeyB");
  await page.waitForFunction(() => window.__run.getState().barricades.length === 1);
  await expectBoth("east passage barred");
  assert.doesNotMatch(await rubbing.innerText(), /detour north/, "an unexplored bypass is not supplied by the clue");
  await page.evaluate(() => window.__run.setState({ visited: ["source", "detour", "host"] }));
  await expectBoth("detour north");
  const desktopHud = await page.getByTestId("hud").boundingBox();
  assert.ok(desktopHud.height <= 425, "both learned clues fit the desktop HUD budget");
  if (process.env.TRAIL_REVIEW === "1") {
    mkdirSync("output/playwright/trail-guidance", { recursive: true });
    await page.getByTestId("hud").screenshot({ path: "output/playwright/trail-guidance/desktop.png" });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__settings.getState().setUiScale(1.6));
  await page.waitForFunction(() => document.querySelector('[data-testid="hud"]').tabIndex === 0);
  const phoneHud = await page.getByTestId("hud").evaluate(hud => ({
    fits: hud.scrollWidth <= hud.clientWidth + 1,
    interactive: getComputedStyle(hud).pointerEvents === "auto",
  }));
  assert.ok(phoneHud.fits && phoneHud.interactive, "large phone clues wrap and remain available by scrolling");
  await page.getByTestId("hud").focus();
  await page.keyboard.press("End");
  await page.waitForFunction(() => {
    const hud = document.querySelector('[data-testid="hud"]');
    const clue = document.querySelector('[data-testid="secret-trail-guide"]');
    return clue.getBoundingClientRect().bottom <= hud.getBoundingClientRect().bottom;
  });
  if (process.env.TRAIL_REVIEW === "1") await page.getByTestId("hud").screenshot({ path: "output/playwright/trail-guidance/phone.png" });
  await page.getByTestId("hud").evaluate(hud => hud.blur());
  await page.evaluate(() => window.__settings.getState().setUiScale(1));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-menu").waitFor();
  await expectBoth("detour north");
  await page.getByTestId("pause-resume").click();
  await faceDoor("north");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().currentRoomId === "detour" && !window.__run.getState().transitioning);
  await expectBoth("east through");
  await expectBoth("1 door");
  await faceDoor("east");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().currentRoomId === "host" && !window.__run.getState().transitioning);
  await rubbing.filter({ hasText: "east wall" }).waitFor();
  await tally.filter({ hasText: "east wall" }).waitFor();

  // A grate's existing clock publication must update both clues without
  // waiting for another interaction. Pausing does not eat that deadline.
  await page.evaluate(() => window.__run.setState({ currentRoomId: "source", enteredBy: null,
    visited: ["source"], barricades: [] }));
  await page.waitForFunction(() => window.__blockLighting?.roomId === "source");
  await expectBoth("east");
  await page.evaluate(() => {
    window.__run.getState().dropGrate("middle");
    window.__run.setState({ barUntil: window.__derived.clock() + 0.5 });
    window.__run.getState().pause();
  });
  await expectBoth("east passage barred");
  await page.waitForTimeout(700);
  await expectBoth("east passage barred");
  await page.getByTestId("pause-resume").click();
  await page.waitForFunction(() => window.__run.getState().barredDoor === null);
  await expectBoth("2 doors");
  await page.evaluate(() => window.__run.getState().revealSecret("host"));
  await rubbing.filter({ hasText: "passage opened" }).waitFor();
  await tally.filter({ hasText: "stands open" }).waitFor();
  await page.evaluate(() => window.__run.getState().startRun(11));
  await rubbing.waitFor({ state: "detached" });
  await tally.waitFor({ state: "detached" });
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-map").click();
  assert.equal(await page.locator('[data-testid="map-landmark-choice"][data-room-id="source"]').count(), 0,
    "new floors do not retain the previous landmark");
  assert.equal(await page.getByTestId("map-selected-service").count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS learned clues: named landmark selection, mapping privacy, Gloom, large phone text, keyboard barricade and detour traversal, explored-only recovery, shared completion, grate pause/expiry and reset");
} finally { await browser.close(); }
