import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const frames = (page, count = 4) => page.evaluate(n => new Promise(resolve => {
  const tick = () => --n > 0 ? requestAnimationFrame(tick) : resolve();
  requestAnimationFrame(tick);
}), count);
const failures = [];
mkdirSync("output/verification/key-drop", { recursive: true });
try {
  for (const [mode, width, height, side] of [["pad", 1280, 800, "left"],
    ["phone-left", 844, 390, "left"], ["phone-right", 844, 390, "right"],
    ["tablet-left", 1024, 768, "left"], ["tablet-right", 1024, 768, "right"]]) {
    const touch = mode !== "pad";
    const page = await browser.newPage({ viewport: { width, height }, screen: { width, height }, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", e => errors.push(String(e)));
    try {
      await page.addInitScript(({ touch, side }) => {
        localStorage.setItem("gem-dungeon.settings", JSON.stringify({ touchControls: touch ? "on" : "off", stickSide: side, uiScale: 1.6 }));
        const pad = { id: "Key drop test pad", index: 0, connected: !touch, mapping: "standard", timestamp: 0,
          axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
        window.__keyPad = pad;
        navigator.getGamepads = () => [pad];
      }, { touch, side });
      await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
      await page.getByTestId("menu-start").click();
      await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
      const button = page.getByTestId("touch-drop-key");
      if (touch) assert.equal(await button.count(), 0, "no drop control without a carried key");
      await page.evaluate(() => {
        const s = window.__run.getState();
        window.__run.setState({ keys: 1, keyTakenIn: s.dungeon.keyRoomId, keyLyingIn: null, keyLyingAt: null });
        window.__keyDrops = [];
        window.__bus.on("keyDropped", event => window.__keyDrops.push(event));
      });
      await frames(page);
      const setPad = (index, pressed) => page.evaluate(({ index, pressed }) => {
        window.__keyPad.buttons[index] = { pressed, touched: pressed, value: +pressed };
      }, { index, pressed });
      if (touch) {
        assert.equal(await button.count(), 1, "a carried key exposes its touch action");
        assert.match(await button.innerText(), /DROP\s*KEY/);
        assert.ok(await button.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight), "drop label fits maximum text size");
        const box = await button.boundingBox();
        assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, "drop target is on screen");
        await page.getByTestId("touch-buttons").screenshot({ path: `output/verification/key-drop/${mode}.png` });
        await button.tap();
      } else { await setPad(14, true); await frames(page); }
      const dropped = await page.evaluate(() => {
        const s = window.__run.getState();
        return { keys: s.keys, room: s.keyLyingIn, current: s.currentRoomId, at: s.keyLyingAt, events: window.__keyDrops, shove: s.shoveReadyAt };
      });
      assert.equal(dropped.keys, 0, "the input drops the carried key");
      assert.equal(dropped.room, dropped.current);
      assert.equal(dropped.events.length, 1, "one press makes one clatter");
      assert.equal(dropped.events[0].x, dropped.at.x);
      assert.equal(dropped.events[0].z, dropped.at.z);
      assert.equal(dropped.shove, 0, "dropping does not also shove");
      await page.waitForFunction(() => document.querySelector('[data-testid="prompt"]')?.textContent.includes("Pick the iron key back up"));
      if (touch) {
        assert.equal(await button.count(), 0, "the control disappears while the key lies on the floor");
        await page.getByTestId("touch-use").tap();
      } else { await setPad(0, true); await frames(page); await setPad(0, false); }
      await page.waitForFunction(() => window.__run.getState().keys === 1 && window.__run.getState().keyLyingIn === null);
      await frames(page, 8);
      assert.equal(await page.evaluate(() => window.__keyDrops.length), 1, "holding drop cannot discard a freshly recovered key");
      if (!touch) { await setPad(14, false); await frames(page); }
      for (const boundary of ["paused", "inputLocks", "transitioning"]) {
        await page.evaluate(key => window.__run.setState({ [key]: key === "inputLocks" ? 1 : true }), boundary);
        await frames(page);
        if (touch) {
          assert.equal(await button.getAttribute("aria-disabled"), "true");
          await button.dispatchEvent("pointerdown", { pointerId: 2, pointerType: "touch", bubbles: true });
        } else { await setPad(14, true); await frames(page); }
        assert.equal(await page.evaluate(() => window.__run.getState().keys), 1, `${boundary} blocks dropping`);
        await page.evaluate(key => window.__run.setState({ [key]: key === "inputLocks" ? 0 : false }), boundary);
        await frames(page);
        assert.equal(await page.evaluate(() => window.__run.getState().keys), 1, `${boundary} presses cannot queue a later drop`);
        if (!touch) { await setPad(14, false); await frames(page); }
      }
      if (touch) await button.tap();
      else { await setPad(14, true); await frames(page); await setPad(14, false); }
      assert.equal(await page.evaluate(() => window.__run.getState().keys), 0, "a fresh press still works after the control boundaries");
      assert.deepEqual(errors, []);
      console.log(`PASS ${mode}: drop, real pickup, one clatter, fit, held input and control boundaries`);
    } catch (error) { failures.push(`${mode}: ${error.message}`); console.error(`FAIL ${failures.at(-1)}`); }
    finally { await page.close(); }
  }
} finally { await browser.close(); }
assert.deepEqual(failures, []);
