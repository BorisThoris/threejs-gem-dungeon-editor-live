import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const port = process.argv[2] ?? process.env.PORT ?? "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
};
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__din && window.__derived && !window.__run.getState().transitioning);
  await page.evaluate(() => {
    const run = window.__run.getState();
    window.__run.setState({ satchel: ["rattle"], charges: { ...run.charges, rattle: "plain" }, lastDamageAt: Infinity });
    window.__din.reset();
    window.__din.advance(window.__derived.clock());
    window.__bus.on("devicePlaced", ({ id }) => {
      if (id !== "rattle") return;
      const run = window.__run.getState();
      const here = run.dungeon.rooms.find(room => room.id === run.currentRoomId);
      const neighbour = Object.values(here.links).find(Boolean);
      const arrival = window.__din.emptyArrival();
      const audible = window.__din.strongest(arrival, "loud", here.id);
      window.__ironSignal = { arrival, audible,
        heardNextDoor: window.__din.answering(window.__din.emptyArrival(), "warden", neighbour) };
    });
  });
  await page.keyboard.press("1");
  await page.waitForFunction(() => window.__run.getState().placed.some(device => device.id === "rattle"));
  const dropped = await page.evaluate(() => ({ device: window.__run.getState().placed.find(d => d.id === "rattle"),
    signal: window.__ironSignal, satchel: window.__run.getState().satchel }));
  check(dropped.satchel.length === 0, "putting down the iron spends its satchel slot");
  check(dropped.signal?.audible && dropped.signal.arrival.source === "ironDropped"
    && dropped.signal.arrival.fromRoomId === dropped.device.roomId
    && dropped.signal.arrival.x === dropped.device.x && dropped.signal.arrival.z === dropped.device.z,
  "the clatter comes from the iron's actual landing position");
  check(dropped.signal?.heardNextDoor, "the Warden can hear the iron through an open neighbouring doorway");
  const offered = await page.waitForFunction(() => window.__triggers?.["Pick up the loose iron"]?.enabled,
    null, { timeout: 3000 }).then(() => true, () => false);
  check(offered, "the dropped iron offers an ordinary pickup interaction");
  if (offered) {
    await page.keyboard.press("e");
    await page.waitForFunction(() => window.__run.getState().satchel.includes("rattle"));
    check(await page.evaluate(() => !window.__run.getState().placed.some(d => d.id === "rattle")),
      "picking up the iron removes its floor copy");
    check(await page.evaluate(key => !window.__run.getState().recoverIron(key)
      && window.__run.getState().satchel.filter(id => id === "rattle").length === 1, dropped.device.key),
    "a recovered knot cannot be collected twice");
    await page.keyboard.press("1");
    await page.waitForFunction(() => window.__run.getState().placed.some(d => d.id === "rattle"));
    const guards = await page.evaluate(() => {
      const run = window.__run.getState();
      const iron = run.placed.find(d => d.id === "rattle");
      run.pause();
      const paused = !run.recoverIron(iron.key);
      run.resume();
      const here = run.dungeon.rooms.find(room => room.id === run.currentRoomId);
      window.__run.setState({ currentRoomId: Object.values(here.links).find(Boolean) });
      const anotherRoom = !run.recoverIron(iron.key);
      window.__run.setState({ currentRoomId: here.id, satchel: ["mapping", "healing", "healing", "healing"],
        charges: { ...run.charges, mapping: "plain" } });
      const full = !run.recoverIron(iron.key) && window.__run.getState().placed.some(d => d.key === iron.key);
      return { paused, anotherRoom, full };
    });
    check(guards.paused && guards.anotherRoom, "iron cannot be recovered while paused or from another room");
    check(guards.full, "a full satchel leaves the iron on the floor");
    await page.waitForFunction(() => window.__triggers?.["Pick up the loose iron"]?.enabled === false);
    await page.keyboard.press("e");
    check(await page.evaluate(() => !window.__run.getState().satchel.includes("rattle")),
      "the blocked pickup prompt cannot overfill the satchel");
    await page.keyboard.press("1");
    await page.waitForFunction(() => window.__triggers?.["Pick up the loose iron"]?.enabled === true);
    await page.keyboard.press("e");
    await page.waitForFunction(() => window.__run.getState().satchel.includes("rattle"));
    check(await page.evaluate(() => window.__run.getState().satchel.length === 4
      && window.__run.getState().placed.every(d => d.id !== "rattle")),
    "freeing a slot allows the same iron to be recovered and reused");
    const sourceRoom = await page.evaluate(() => {
      const run = window.__run.getState();
      const room = run.dungeon.rooms.find(room => room.id === run.currentRoomId);
      window.__din.reset();
      window.__din.advance(window.__derived.clock());
      window.__awareness.reset();
      window.__run.setState({ wardenRoomId: Object.values(room.links).find(Boolean), floorRooms: 2, alarm: 0 });
      run.useItem(run.satchel.indexOf("rattle"));
      return room.id;
    });
    const investigated = await page.waitForFunction(roomId => window.__awareness.rungOf("warden") >= 2
      && window.__awareness.markOf("warden") === roomId, sourceRoom, { timeout: 4000 }).then(() => true, () => false);
    check(investigated, "a resting Warden next door remembers the clatter as a place to investigate");
  }
  // Both reusable metal distractions must sound from their real landing.
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(() => {
    window.__run.setState({ keys: 1 });
    window.__bus.emit("teleport", { position: [2.25, 1.5, 1.75] });
  });
  await page.waitForFunction(() => Math.hypot(window.__playerDebug.x, window.__playerDebug.z) > 2);
  await page.evaluate(() => {
    window.__din.reset();
    window.__din.advance(window.__derived.clock());
    const off = window.__bus.on("keyDropped", event => {
      const arrival = window.__din.emptyArrival();
      const audible = window.__din.strongest(arrival, "loud", event.roomId);
      window.__keySignal = { event, arrival, audible, at: window.__run.getState().keyLyingAt };
      off();
    });
  });
  await page.keyboard.press("g");
  await page.waitForFunction(() => window.__keySignal);
  const key = await page.evaluate(() => window.__keySignal);
  check(key.audible && key.arrival.source === "keyDropped" && key.arrival.fromRoomId === key.event.roomId
    && key.at.x === key.event.x && key.at.z === key.event.z
    && key.at.x === key.arrival.x && key.at.z === key.arrival.z,
  `the dropped key's clatter comes from its landing point: ${JSON.stringify(key)}`);
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
