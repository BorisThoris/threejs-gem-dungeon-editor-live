import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "./browser-safety.mjs";
const output = process.env.AGENT_SCRATCH || "D:/agent-work/gem-dungeon/2026-10-27-inventory-performance";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox", "--mute-audio"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.argv[2] ?? process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && !window.__run.getState().transitioning);
  await page.evaluate(() => window.__settings.getState().setTouchControls("on"));
  for (const [width, height] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.getByTestId("inventory-open").waitFor();
    const overlap = await page.getByTestId("inventory-open").evaluate(el => {
      const a = el.getBoundingClientRect();
      return [...document.querySelectorAll('button[data-testid^="touch-"]')].filter(other => {
        const b = other.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      }).map(other => other.getAttribute("data-testid"));
    });
    assert.deepEqual(overlap, [], `Inventory clears the touch controls at ${width}x${height}`);
  }
  await page.evaluate(() => window.__settings.getState().setTouchControls("off"));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.keyboard.press("KeyI");
  await page.getByTestId("inventory-panel").waitFor();
  assert.equal(await page.getByTestId("pause-menu").count(), 0, "inventory opens independently of the Escape menu");
  assert.equal(await page.locator('[data-testid^="inspect-slot-"]').count(), 16, "empty backpack still shows its capacity");
  await page.evaluate(() => {
    const s = window.__run.getState();
    for (const id of ["healing", "mapping", "mire", "gloom", "snare", "bomb"]) s.takeItem(id);
  });
  await page.screenshot({ path: `${output}/inventory-overview.png` });
  await page.getByTestId("inspect-slot-0").click();
  assert.match(await page.getByTestId("inventory-item-details").innerText(), /effect is unknown/);
  const before = await page.evaluate(() => ({ items: [...window.__run.getState().satchel], clock: window.__derived.clock(), known: [...window.__run.getState().identified] }));
  await page.getByTestId("inspect-slot-5").click();
  await page.getByTestId("inventory-to-0").click();
  const swapped = await page.evaluate(() => ({ items: window.__run.getState().satchel, clock: window.__derived.clock(), known: window.__run.getState().identified }));
  assert.equal(swapped.items[0], "bomb");
  assert.deepEqual([...swapped.items].sort(), [...before.items].sort());
  assert.deepEqual(swapped.known, before.known);
  assert.equal(swapped.clock, before.clock, "inventory planning does not advance the game clock");
  await page.screenshot({ path: `${output}/inventory-desktop.png` });
  await page.evaluate(() => window.__settings.getState().setTouchControls("on"));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.getByTestId("inventory-panel").evaluate(el => el.scrollWidth <= innerWidth), "inventory fits phone width");
  await page.screenshot({ path: `${output}/inventory-phone.png` });
  await page.getByTestId("inventory-close").click();
  await page.getByTestId("inventory-open").click();
  await page.getByTestId("inventory-panel").waitFor();
  await page.getByTestId("inspect-slot-0").click();
  await page.getByTestId("inventory-use").click();
  await page.waitForFunction(() => !window.__run.getState().paused);
  assert.equal(await page.getByTestId("inventory-panel").count(), 0);
  assert.equal(await page.evaluate(() => window.__run.getState().satchel.includes("bomb")), false, "Use & return consumes the selected item through the run store");
  await page.evaluate(() => {
    window.__settings.getState().setTouchControls("off");
    window.__settings.getState().bind("inventory", "KeyO");
  });
  await page.keyboard.press("KeyI");
  assert.equal(await page.getByTestId("inventory-panel").count(), 0, "the old key stops opening a rebound inventory");
  await page.keyboard.press("KeyO");
  await page.getByTestId("inventory-panel").waitFor();
  const beforeDrag = await page.evaluate(() => [...window.__run.getState().satchel]);
  await page.getByTestId("inspect-slot-0").dragTo(page.getByTestId("inspect-slot-1"));
  assert.deepEqual(await page.evaluate(() => window.__run.getState().satchel),
    [beforeDrag[1], beforeDrag[0], ...beforeDrag.slice(2)], "dragging uses the same inventory swap");
  for (const [width, height] of [[390, 844], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.__settings.getState().setUiScale(1.6));
    await page.getByTestId("inventory-identify").scrollIntoViewIfNeeded();
    assert.ok(await page.getByTestId("inventory-close").evaluate(el => {
      const b = el.getBoundingClientRect();
      return b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth;
    }), "Return stays visible after scrolling at maximum text size");
  }
  await page.evaluate(() => {
    window.__settings.getState().setUiScale(1);
    const pad = { id: "Inventory controller", index: 0, connected: true, mapping: "standard", timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    navigator.getGamepads = () => [pad]; window.__inventoryPad = pad;
  });
  const press = async index => {
    await page.evaluate(index => { window.__inventoryPad.buttons[index] = { pressed: true, touched: true, value: 1 }; }, index);
    await page.waitForTimeout(100);
    await page.evaluate(index => { window.__inventoryPad.buttons[index] = { pressed: false, touched: false, value: 0 }; }, index);
    await page.waitForTimeout(100);
  };
  await press(8);
  await page.getByTestId("inventory-panel").waitFor({ state: "detached" });
  await press(8);
  await page.getByTestId("inventory-panel").waitFor();
  await press(1);
  await page.getByTestId("inventory-panel").waitFor({ state: "detached" });
  assert.deepEqual(errors, []);
  console.log("PASS direct inventory: empty grid, privacy, belt swap, paused clock, desktop/phone layout, touch entry and use/return");
} finally { await browser.close(); }
