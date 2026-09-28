import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() => { window.servicePad = null; navigator.getGamepads = () => window.servicePad ? [window.servicePad] : []; });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && window.__playerDebug && !window.__run.getState().transitioning);
  const fixture = await page.evaluate(async () => {
    const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
    const { secretStory } = await import("/src/game/dungeon/secret.ts");
    let seed = 1;
    for (; seed < 100; seed++) {
      const dungeon = generateRunFloor(seed, 1);
      if (secretStory(dungeon)?.flavour === "shrine" && dungeon.rooms.find(r => r.kind === "shrine")?.id === dungeon.vaultId) break;
    }
    if (seed === 100) throw Error("No native hidden shrine paired with a locked ordinary font");
    window.__run.getState().startRun(seed);
    const d = window.__run.getState().dungeon;
    window.__run.setState({ satchel: ["mapping"], identified: ["mapping"],
      charges: { ...window.__run.getState().charges, mapping: "plain" }, gems: 30, keys: 1,
      gemRooms: d.rooms.map(r => r.id), lastDamageAt: Infinity });
    return { shop: d.rooms.find(r => r.kind === "shop").id,
      shrine: d.rooms.find(r => r.kind === "shrine").id, secret: d.secretId };
  });
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.keyboard.press("1");
  await page.waitForFunction(() => window.__run.getState().mapped);
  const openMap = async () => {
    await page.keyboard.press("Escape");
    await page.getByTestId("pause-map").click();
    await page.getByTestId("floor-map").waitFor();
  };
  const choice = id => page.locator(`[data-testid="map-service-choice"][data-room-id="${id}"]`);
  await openMap();
  assert.equal(await page.getByTestId("map-service-choice").count(), 0, "Mapping alone does not identify services or sealed rewards");
  assert.equal(await page.getByTestId("map-service").count(), 0);
  await page.getByTestId("pause-resume").click();

  // Stage at the neighbouring room, then enter each service with the real
  // door control. The travel owner, not this fixture, records its discovery.
  const visit = async id => {
    const dir = await page.evaluate(id => {
      const run = window.__run, s = run.getState();
      if (id === s.dungeon.secretId) {
        const host = s.dungeon.rooms.find(r => r.secret?.to === id);
        run.getState().revealSecret(host.id);
      }
      const neighbour = run.getState().dungeon.rooms.find(r => Object.values(r.links).includes(id) && r.kind !== "end");
      run.setState({ currentRoomId: neighbour.id, transitioning: neighbour.id !== s.currentRoomId, floorRooms: 0, enteredBy: null,
        wardenRoomId: null, harrierSlain: true, reaperAwake: false, thiefPhase: "away" });
      return Object.keys(neighbour.links).find(dir => neighbour.links[dir] === id);
    }, id);
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    await page.evaluate(async dir => {
      const { doorReach } = await import("/src/game/dungeon/footprint.ts");
      const { DIR_STEP, DIR_YAW } = await import("/src/game/dungeon/types.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const reach = doorReach(room, dir) - 0.9, step = DIR_STEP[dir];
      window.__bus.emit("teleport", { position: [step.x * reach, 1.5, step.z * reach] });
      window.__bus.emit("lookSet", { yaw: DIR_YAW[dir], pitch: 0 });
    }, dir);
    await page.waitForTimeout(350);
    await page.keyboard.press("KeyE");
    try {
      await page.waitForFunction(id => window.__run.getState().currentRoomId === id && !window.__run.getState().transitioning, id);
    } catch (error) {
      console.error(await page.evaluate(({ id, dir }) => ({ target: id, dir,
        room: window.__run.getState().currentRoomId, paused: window.__run.getState().paused,
        transitioning: window.__run.getState().transitioning, inputLocks: window.__run.getState().inputLocks,
        player: window.__playerDebug, prompt: document.querySelector('[data-testid="prompt-text"]')?.textContent,
        triggers: window.__triggers }), { id, dir }));
      throw error;
    }
  };
  const interact = async prefix => {
    await page.waitForFunction(prefix => Object.keys(window.__triggers ?? {}).some(label => label.startsWith(prefix)), prefix);
    await page.evaluate(prefix => {
      const [, at] = Object.entries(window.__triggers).find(([label]) => label.startsWith(prefix));
      window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] });
    }, prefix);
    await page.getByTestId("prompt-text").filter({ hasText: prefix }).waitFor();
    await page.keyboard.press("KeyE");
  };
  await visit(fixture.shop);
  await page.locator('[data-testid="minimap"] [data-service="shop"]').waitFor();
  await openMap();
  await choice(fixture.shop).filter({ hasText: "bomb in stock" }).waitFor();
  const paused = await page.evaluate(() => ({ clock: window.__derived.clock(), gems: window.__run.getState().gems, marks: window.__run.getState().marks }));
  await choice(fixture.shop).focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("map-selected-service").waitFor();
  assert.equal(await page.getByTestId("map-selected-service").getAttribute("data-room-id"), fixture.shop);
  assert.equal(await choice(fixture.shop).getAttribute("aria-pressed"), "true");
  await page.keyboard.press("Enter");
  await page.getByTestId("map-selected-service").waitFor({ state: "detached" });
  await page.evaluate(() => {
    window.servicePad = { id: "services-pad", index: 0, connected: true, mapping: "standard",
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 0, touched: i === 0, value: i === 0 ? 1 : 0 })) };
  });
  await page.getByTestId("map-selected-service").waitFor();
  await page.evaluate(() => { window.servicePad = null; });
  assert.deepEqual(await page.evaluate(() => ({ clock: window.__derived.clock(), gems: window.__run.getState().gems, marks: window.__run.getState().marks })), paused,
    "keyboard and controller selection change only the planning highlight");
  await page.getByTestId("pause-resume").click();
  await interact("Buy a bomb");
  await page.waitForFunction(() => window.__run.getState().bombBought);
  await openMap();
  await choice(fixture.shop).filter({ hasText: "bomb sold" }).waitFor();
  await page.getByTestId("pause-resume").click();

  await visit(fixture.shrine);
  await page.evaluate(() => window.__run.setState({ alarm: 5 }));
  await interact("Kneel at the shrine");
  await page.waitForFunction(id => window.__run.getState().cleared.includes(id), fixture.shrine);
  await visit(fixture.secret);
  await openMap();
  await choice(fixture.shrine).filter({ hasText: "Font used" }).waitFor();
  await choice(fixture.shrine).filter({ hasText: "vault entry needs unlocking" }).waitFor();
  await choice(fixture.secret).filter({ hasText: "Font unused" }).waitFor();
  assert.equal(await page.getByTestId("map-service-choice").count(), 3, "a visited hidden font is remembered without replacing the ordinary shrine");
  for (const map of ["minimap", "floor-map"])
    assert.equal(await page.getByTestId(map).getByTestId("map-service").count(), 3, "both maps remember the same services");
  await choice(fixture.secret).click();
  assert.equal(await page.getByTestId("map-selected-service").getAttribute("data-room-id"), fixture.secret);
  if (process.env.SERVICES_REVIEW === "1") {
    mkdirSync("output/playwright/services", { recursive: true });
    await page.getByTestId("floor-map").screenshot({ path: "output/playwright/services/map.png" });
    await page.getByTestId("map-services").screenshot({ path: "output/playwright/services/desktop.png" });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__settings.getState().setUiScale(1.6));
  for (const id of [fixture.shop, fixture.shrine, fixture.secret]) {
    await choice(id).scrollIntoViewIfNeeded();
    const fits = await choice(id).evaluate(el => {
      const box = el.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1;
    });
    assert.ok(fits, "large phone labels wrap without horizontal clipping");
  }
  if (process.env.SERVICES_REVIEW === "1") await page.getByTestId("map-services").screenshot({ path: "output/playwright/services/phone.png" });
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects, gloom: window.__derived.clock() + 20 } }));
  await page.getByTestId("floor-map").getByText("GLOOM", { exact: true }).waitFor();
  await page.getByTestId("map-services").waitFor({ state: "detached" });
  await page.evaluate(() => window.__run.setState({ effects: { ...window.__run.getState().effects, gloom: 0 } }));
  await choice(fixture.shop).waitFor();
  await page.getByTestId("pause-resume").click();
  await page.evaluate(() => {
    const s = window.__run.getState();
    window.__run.setState({ currentRoomId: s.dungeon.endId, transitioning: true });
    window.__run.getState().roomReady(s.dungeon.endId);
  });
  await page.waitForFunction(() => window.__run.getState().floor === 2 && !window.__run.getState().transitioning);
  await openMap();
  assert.equal(await page.getByTestId("map-service-choice").count(), 0, "descent clears old floor memories and selection");
  assert.equal(await page.getByTestId("map-selected-service").count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS discovered services: real visits and purchases, used/hidden fonts, keyboard/pad selection, mapping privacy, Gloom, large phone text and descent");
} finally { await browser.close(); }
