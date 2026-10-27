/** Focused live cases: yarn verify --only=known-routes-browser-check.mjs */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(60000);
  const errors = [];
  const output = process.env.ROUTE_REVIEW_DIR;
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && window.__scene && !window.__run.getState().transitioning);
  const fixture = await page.evaluate(() => {
    window.__run.getState().startRun(72);
    const s = window.__run.getState(), d = s.dungeon;
    window.__run.setState({ visited: d.rooms.filter(room => room.kind !== "secret").map(room => room.id),
      gems: 30, gemRooms: d.rooms.map(room => room.id), lastDamageAt: Infinity, wardenRoomId: null,
      harrierSlain: true, reaperAwake: false, thiefPhase: "away", floorRooms: 0 });
    // Independent breadth-first route to a real generated shop.
    const shop = d.rooms.find(room => room.kind === "shop").id;
    const paths = new Map([[s.currentRoomId, [s.currentRoomId]]]), queue = [s.currentRoomId];
    for (const id of queue) for (const to of Object.values(d.rooms.find(room => room.id === id).links)) {
      if (paths.has(to) || to === d.vaultId || to === d.endId) continue;
      paths.set(to, [...paths.get(id), to]); queue.push(to);
    }
    const remote = [...paths].find(([, path]) => path.length >= 3)?.[0];
    if (!remote || !paths.has(shop)) throw Error("Native fixture needs a distant room and reachable shop");
    return { shop, path: paths.get(shop), remote, start: s.currentRoomId };
  });
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  const openMap = async () => {
    await page.keyboard.press("Escape");
    await page.getByTestId("pause-map").click();
    await page.getByTestId("floor-map").waitFor();
  };
  const shopChoice = () => page.locator(`[data-testid="map-service-choice"][data-room-id="${fixture.shop}"]`);
  await openMap();
  const before = await page.evaluate(() => ({ gems: window.__run.getState().gems,
    marks: window.__run.getState().marks, room: window.__run.getState().currentRoomId, clock: window.__derived.clock() }));
  await shopChoice().click();
  await page.getByTestId("map-route-summary").waitFor();
  assert.equal(await page.getByTestId("map-route-summary").getAttribute("data-route-status"), fixture.path.length === 1 ? "arrived" : "follow");
  assert.equal(await page.getByTestId("map-route-edge").count(), fixture.path.length - 1);
  assert.deepEqual(await page.evaluate(() => ({ gems: window.__run.getState().gems,
    marks: window.__run.getState().marks, room: window.__run.getState().currentRoomId, clock: window.__derived.clock() })), before,
  "planning a route changes no run facts or paused time");
  if (output) {
    mkdirSync(output, { recursive: true });
    await page.getByTestId("floor-map").screenshot({ path: `${output}/known-route-map.png` });
  }
  console.log("PASS route case: generated shop, shortest route and read-only planning");

  await page.evaluate(() => {
    const s = window.__run.getState(), room = s.dungeon.rooms.find(room => room.id === s.currentRoomId);
    window.__run.setState({ barricades: Object.values(room.links).map(to => [room.id, to].sort().join("|")) });
  });
  await page.waitForFunction(() => document.querySelector('[data-testid="map-route-summary"]')?.dataset.routeStatus === "blocked");
  assert.equal(await page.getByTestId("map-route-edge").count(), 0, "a fully blocked route cannot draw a passable line");
  assert.match(await page.getByTestId("hud-gems").innerText(), /stairs route blocked/);
  await page.evaluate(path => window.__run.setState({ barricades: [], barredDoor: path.slice(0, 2).sort().join("|"),
    barUntil: window.__derived.clock() + 0.4 }), fixture.path);
  const frozenRoute = await page.getByTestId("map-route-summary").innerText();
  await page.waitForTimeout(700);
  assert.equal(await page.getByTestId("map-route-summary").innerText(), frozenRoute, "pause preserves the timed barrier");
  await page.getByTestId("pause-resume").click();
  await page.waitForFunction(() => !window.__run.getState().barredDoor);
  await openMap();
  await shopChoice().click();
  await page.waitForFunction(() => document.querySelector('[data-testid="map-route-summary"]')?.dataset.routeStatus === "follow");
  console.log("PASS route case: barricades, paused grate and published expiry");

  await page.evaluate(f => window.__run.setState({ visited: [f.start], mapped: false,
    nestRoomId: f.remote, nestSeen: true, nestGems: 1 }), fixture);
  assert.equal(await page.getByTestId("map-service-choice").count(), 0, "undiscovered shops are private");
  await page.locator(`[data-testid="map-destination-choice"][data-room-id="${fixture.remote}"]`).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="map-route-summary"]')?.dataset.routeStatus === "unknown");
  assert.equal(await page.getByTestId("map-route-edge").count(), 0, "a reported nest cannot grant unexplored doorways");
  await page.evaluate(() => window.__run.setState({ mapped: true }));
  await page.waitForFunction(() => document.querySelector('[data-testid="map-route-summary"]')?.dataset.routeStatus === "follow");
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects,
    gloom: window.__derived.clock() + 3 } }));
  await page.getByTestId("map-route-summary").waitFor({ state: "hidden" });
  await page.waitForFunction(() => /chart hidden by Gloom/.test(document.querySelector('[data-testid="hud-gems"]')?.textContent ?? ""));
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects, gloom: 0 } }));
  await page.getByTestId("map-route-summary").waitFor();
  console.log("PASS route case: knowledge boundaries, Mapping, reported nest and Gloom");

  const planBefore = await page.evaluate(() => ({ gems: window.__run.getState().gems,
    marks: window.__run.getState().marks, room: window.__run.getState().currentRoomId, clock: window.__derived.clock() }));
  await page.evaluate(() => window.__run.getState().lockInput());
  assert.equal(await page.getByTestId("map-route-follow").isDisabled(), true, "an open interaction also disables the planning control");
  await page.evaluate(() => window.__run.getState().unlockInput());
  assert.equal(await page.getByTestId("map-route-follow").isEnabled(), true);
  await page.getByTestId("map-route-follow").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => window.__run.getState().routeTargetId), fixture.remote);
  assert.deepEqual(await page.evaluate(() => ({ gems: window.__run.getState().gems,
    marks: window.__run.getState().marks, room: window.__run.getState().currentRoomId, clock: window.__derived.clock() })), planBefore,
  "following a route changes only its explicit destination");
  await page.getByTestId("pause-resume").click();
  await page.getByTestId("hud-route").waitFor();
  assert.match(await page.getByTestId("hud-route").innerText(), /Stolen loot/);
  assert.equal(await page.getByTestId("minimap").getByTestId("map-route-target").getAttribute("data-room-id"), fixture.remote);
  await page.evaluate(() => window.__run.setState({ nestGems: 0, nestKey: false }));
  await page.waitForFunction(() => /Destination/.test(document.querySelector('[data-testid="hud-route"]')?.textContent ?? ""));
  await page.evaluate(() => window.__run.setState({ nestGems: 1 }));
  await page.waitForFunction(() => /Stolen loot/.test(document.querySelector('[data-testid="hud-route"]')?.textContent ?? ""));
  if (output) await page.screenshot({ path: `${output}/followed-route-play.png` });
  const legs = await page.evaluate(target => {
    const s = window.__run.getState(), d = s.dungeon;
    const paths = new Map([[s.currentRoomId, []]]), queue = [s.currentRoomId];
    for (const id of queue) for (const [dir, to] of Object.entries(d.rooms.find(room => room.id === id).links)) {
      if (paths.has(to) || to === d.vaultId || to === d.endId) continue;
      paths.set(to, [...paths.get(id), { dir, to }]); queue.push(to);
    }
    return paths.get(target);
  }, fixture.remote);
  assert.ok(legs?.length >= 2, "the followed native route crosses several real doorways");
  for (const [index, leg] of legs.entries()) {
    await page.evaluate(dir => {
      const s = window.__run.getState(), room = s.dungeon.rooms.find(room => room.id === s.currentRoomId);
      const [x, , z] = window.__layout.doorPosition(room, dir);
      window.__bus.emit("teleport", { position: [x - Math.sign(x) * 0.8, 1.5, z - Math.sign(z) * 0.8] });
    }, leg.dir);
    await page.waitForFunction(() => /^Open /.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
    await page.keyboard.press("KeyE");
    await page.waitForFunction(id => window.__run.getState().currentRoomId === id && !window.__run.getState().transitioning, leg.to);
    const remaining = legs.length - index - 1;
    await page.waitForFunction(remaining => {
      const text = document.querySelector('[data-testid="hud-route"]')?.textContent ?? "";
      return remaining ? text.includes(`${remaining} ${remaining === 1 ? "door" : "doors"}`) : text.includes("you are here");
    }, remaining);
    assert.equal(await page.evaluate(() => window.__run.getState().routeTargetId), fixture.remote);
  }
  await openMap();
  await page.getByTestId("map-active-route").waitFor();
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects, gloom: window.__derived.clock() + 3 } }));
  await page.waitForFunction(() => /chart hidden by Gloom/.test(document.querySelector('[data-testid="hud-route"]')?.textContent ?? ""));
  await page.getByTestId("map-route-stop").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => window.__run.getState().routeTargetId), null);
  await page.getByTestId("hud-route").waitFor({ state: "detached" });
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects, gloom: 0 } }));
  // Retain a route for the existing phone fit and restart checks below.
  await page.locator(`[data-testid="map-destination-choice"][data-room-id="${fixture.remote}"]`).click();
  await page.getByTestId("map-route-follow").click();
  console.log("PASS followed route: keyboard planning, resumed minimap, real doors, progress, arrival and cancellation during Gloom");

  await page.setViewportSize({ width: 390, height: 844 });
  for (let i = 0; i < 8; i++) await page.getByTestId("opt-uiscale-up").click();
  await page.getByTestId("map-route-summary").scrollIntoViewIfNeeded();
  const bounds = await page.getByTestId("map-route-summary").evaluate(element => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, width: element.clientWidth, content: element.scrollWidth };
  });
  assert.ok(bounds.left >= 0 && bounds.right <= 390 && bounds.content <= bounds.width + 1, "phone route guidance wraps without clipping");
  if (output) { mkdirSync(output, { recursive: true }); await page.screenshot({ path: `${output}/known-route-phone.png` }); }
  await page.getByTestId("pause-resume").click();
  await page.evaluate(() => window.__run.getState().startRun(72));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await openMap();
  assert.equal(await page.evaluate(() => window.__run.getState().routeTargetId), null, "replaying the seed clears the followed destination");
  assert.equal(await page.getByTestId("map-route-summary").count(), 0, "a fresh run cannot retain an old selection");
  assert.equal(await page.getByTestId("map-route-edge").count(), 0);
  await page.getByTestId("pause-resume").click();
  await page.evaluate(() => {
    const run = window.__run;
    run.getState().pause();
    if (!run.getState().trackRoute(run.getState().currentRoomId)) throw Error("Could not stage the descent reset case");
    run.getState().resume();
    while (run.getState().floor < 2) {
      run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
      run.getState().roomReady(run.getState().dungeon.endId);
    }
    run.setState({ gems: window.__derived.toll(), satchel: [], bombBought: false,
      lastDamageAt: Infinity, floorRooms: 0, wardenRoomId: null, harrierSlain: true, reaperAwake: false });
  });
  await page.waitForFunction(() => new RegExp(`gather ${window.__world.BOMB_PRICE} more.*beyond the toll`)
    .test(document.querySelector('[data-testid="hud-prepare"]')?.textContent ?? ""));
  await page.evaluate(() => window.__run.setState({ gems: window.__derived.toll() + window.__world.BOMB_PRICE,
    satchel: ["healing", "mapping", "gloom", "snare"] }));
  await page.waitForFunction(() => /free a satchel slot/.test(document.querySelector('[data-testid="hud-prepare"]')?.textContent ?? ""));
  await page.evaluate(() => window.__run.setState({ satchel: [], bombBought: true }));
  await page.waitForFunction(() => /shop bomb sold/.test(document.querySelector('[data-testid="hud-prepare"]')?.textContent ?? ""));
  await page.evaluate(() => window.__run.setState({ satchel: ["bomb"] }));
  await page.waitForFunction(() => /bomb packed/.test(document.querySelector('[data-testid="hud-prepare"]')?.textContent ?? ""));
  await page.getByTestId("moment-descent").waitFor({ state: "detached" });
  await page.getByTestId("deed-toast").waitFor({ state: "detached" });
  await page.getByTestId("hud-prepare").scrollIntoViewIfNeeded();
  const preparationBounds = await page.getByTestId("hud-prepare").evaluate(element => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom,
      width: element.clientWidth, content: element.scrollWidth };
  });
  assert.ok(preparationBounds.left >= 0 && preparationBounds.right <= 390
    && preparationBounds.top >= 0 && preparationBounds.bottom <= 844
    && preparationBounds.content <= preparationBounds.width + 1,
  `phone preparation can be read without clipping: ${JSON.stringify(preparationBounds)}`);
  if (output) await page.screenshot({ path: `${output}/prepared-descent-phone.png` });
  console.log("PASS preparation before the irreversible descent: budget, satchel space, sold stock and packed bomb");
  await page.evaluate(() => {
    const run = window.__run;
    run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
    run.getState().roomReady(run.getState().dungeon.endId);
    run.setState({ gems: window.__derived.toll(), satchel: [], bombBought: false,
      lastDamageAt: Infinity, floorRooms: 0, wardenRoomId: null, harrierSlain: true, reaperAwake: false });
  });
  assert.equal(await page.evaluate(() => window.__run.getState().routeTargetId), null, "descent cannot inherit a destination with a reused room ID");
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.waitForFunction(() => /gather \d+ more for a bomb/.test(document.querySelector('[data-testid="hud-gems"]')?.textContent ?? ""));
  await page.evaluate(() => window.__run.setState({ gems: window.__derived.toll() + window.__world.BOMB_PRICE,
    satchel: ["healing", "mapping", "gloom", "snare"] }));
  await page.waitForFunction(() => /free a satchel slot/.test(document.querySelector('[data-testid="hud-gems"]')?.textContent ?? ""));
  await page.evaluate(() => window.__run.setState({ satchel: [], bombBought: true }));
  await page.waitForFunction(() => /shop bomb sold/.test(document.querySelector('[data-testid="hud-gems"]')?.textContent ?? ""));
  await page.evaluate(() => window.__run.setState({ satchel: ["bomb"] }));
  await page.waitForFunction(() => !/shop bomb sold|free a satchel slot|more for a bomb/.test(document.querySelector('[data-testid="hud-gems"]')?.textContent ?? ""));
  assert.deepEqual(errors, []);
  console.log("PASS route case: phone text, restart, final-floor bomb quote, stock and satchel guidance");
} finally { await browser.close(); }
