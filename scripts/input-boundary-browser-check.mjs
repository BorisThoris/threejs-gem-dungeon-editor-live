import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const port = process.argv[2] ?? process.env.PORT ?? "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"] });
const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing"
    && !window.__run.getState().transitioning && window.__keyboard);
  await page.evaluate(() => window.__run.setState({ lastDamageAt: 1e9 }));
  const aliases = await page.evaluate(() => {
    const keyboard = window.__keyboard;
    const codes = window.__settings.getState().bindings.sprint;
    // Deliver both physical alternatives before the next animation frame.
    for (const code of codes) window.dispatchEvent(new KeyboardEvent("keydown", { code }));
    keyboard.pressAction("sprint");
    const first = keyboard.consumeAction("sprint");
    const twice = keyboard.consumeAction("sprint");
    const held = keyboard.actionDown("sprint");
    while (keyboard.consumeAction("sprint")) { /* clear the old implementation's remaining alias */ }
    for (const code of codes) window.dispatchEvent(new KeyboardEvent("keyup", { code }));
    keyboard.pressAction("sprint");
    const later = keyboard.consumeAction("sprint");
    return { first, twice, held, later, released: !keyboard.actionDown("sprint") };
  });
  check(aliases.first && !aliases.twice && aliases.held && aliases.later && aliases.released,
    "simultaneous bindings for one action fire once, preserve held state, and allow a later press");
  const shortcuts = await page.evaluate(() => {
    const keyboard = window.__keyboard, bindings = window.__settings.getState().bindings;
    const leaked = [];
    for (const modifier of ["ctrlKey", "altKey", "metaKey"]) for (const action of ["forward", "interact"]) {
      const code = bindings[action][0];
      // Inspect before a frame consumes the press or browser focus changes.
      window.dispatchEvent(new KeyboardEvent("keydown", { code, [modifier]: true, cancelable: true }));
      const held = keyboard.actionDown(action), pressed = keyboard.consumeAction(action);
      window.dispatchEvent(new KeyboardEvent("keyup", { code }));
      if (held || pressed) leaked.push({ modifier, action, held, pressed });
    }
    return leaked;
  });
  check(shortcuts.length === 0, `shortcut chords cannot queue movement or Use: ${JSON.stringify(shortcuts)}`);
  for (const boundary of ["pause", "puzzle", "transition"]) {
    const queued = await page.evaluate(boundary => {
      const run = window.__run;
      const keyboard = window.__keyboard;
      keyboard.pressAction("interact");
      if (boundary === "pause") run.getState().pause();
      else if (boundary === "puzzle") run.getState().lockInput();
      else run.setState({ transitioning: true });
      return keyboard.peekAction("interact");
    }, boundary);
    check(!queued, `${boundary}: entering the boundary clears an earlier buffered action`);
    await page.keyboard.press("KeyB");
    const blocked = await page.evaluate(() => {
      const keyboard = window.__keyboard;
      const physical = keyboard.peekAction("bar");
      keyboard.pressAction("interact");
      return physical || keyboard.peekAction("interact");
    });
    check(!blocked, `${boundary}: physical and on-screen presses cannot queue gameplay`);
    const resumed = await page.evaluate(boundary => {
      const run = window.__run;
      if (boundary === "pause") run.getState().resume();
      else if (boundary === "puzzle") run.getState().unlockInput();
      else run.setState({ transitioning: false });
      const keyboard = window.__keyboard;
      const stale = keyboard.consumeAction("bar") || keyboard.consumeAction("interact");
      keyboard.pressAction("interact");
      const fresh = keyboard.consumeAction("interact");
      const twice = keyboard.consumeAction("interact");
      return { stale, fresh, twice };
    }, boundary);
    check(!resumed.stale && resumed.fresh && !resumed.twice,
      `${boundary}: resuming accepts a fresh press exactly once without replaying overlay input`);
  }
  // A real door verifies that the event gate still reaches the frame reader.
  const door = await page.evaluate(() => {
    const state = window.__run.getState();
    const room = state.dungeon.rooms.find(room => room.id === state.currentRoomId);
    const direction = Object.keys(room.links).find(dir => room.links[dir] !== state.dungeon.endId
      && room.links[dir] !== state.dungeon.vaultId);
    const [x, , z] = window.__layout.doorPosition(room, direction);
    window.__bus.emit("teleport", { position: [x - Math.sign(x) * 0.8, 1.5, z - Math.sign(z) * 0.8] });
    return { from: room.id, to: room.links[direction] };
  });
  await page.waitForFunction(() => /open/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  await page.keyboard.press("KeyE");
  await page.waitForFunction(to => window.__run.getState().currentRoomId === to
    && !window.__run.getState().transitioning, door.to);
  check(true, "a fresh physical Use key still travels through the offered door");
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
