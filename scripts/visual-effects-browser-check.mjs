import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
mkdirSync("output/verification/visual-effects", { recursive: true });
try {
  for (const [name, width, height] of [["desktop", 1280, 800], ["phone", 844, 390], ["portrait", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, reducedMotion: "no-preference" });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ touchControls: "on", captions: true, highContrast: true })));
    await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
    await page.getByTestId("menu-start").click();
    await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
    await page.evaluate(() => {
      window.__run.getState().lockInput();
      window.__bus.emit("wardenProximity", { level: 3 });
      window.__bus.emit("damaged");
    });
    await page.getByTestId("screen-hurt").waitFor();
    // Hold the actual rendered effects at their strongest frame for review.
    await page.evaluate(() => {
      for (const id of ["screen-hurt", "screen-dread"]) {
        const element = document.querySelector(`[data-testid="${id}"]`);
        for (const animation of element.getAnimations()) { animation.pause(); animation.currentTime = 0; }
      }
    });
    await page.screenshot({ path: `output/verification/visual-effects/${name}.png` });
    const paintOrder = await page.evaluate(() => {
      // Hit-testing uses the browser's real stacking contexts. Temporarily let
      // pointer-transparent visual layers participate without changing paint.
      const style = document.createElement("style"); style.textContent = "* { pointer-events: auto !important; }";
      document.head.append(style);
      const result = ["hud-lives", "touch-pause", "touch-lantern"].map(id => {
        const element = document.querySelector(`[data-testid="${id}"]`);
        if (!element) throw Error(`Missing ${id}`);
        const box = element.getBoundingClientRect();
        const stack = document.elementsFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        const target = stack.findIndex(node => node === element || element.contains(node));
        return { id, visible: target >= 0, effectsBehind: ["screen-dread", "screen-hurt"].every(effect => {
          const index = stack.indexOf(document.querySelector(`[data-testid="${effect}"]`));
          return index > target;
        }) };
      });
      style.remove(); return result;
    });
    assert.ok(paintOrder.every(row => row.visible && row.effectsBehind), `${name}: danger effects leave critical text and controls undimmed: ${JSON.stringify(paintOrder)}`);
    const readable = await page.evaluate(() => {
      const box = id => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect();
      const caption = box("readouts"), hud = box("hud"), pause = box("touch-pause");
      return { captionWidth: caption.width, pauseClear: pause.left >= hud.right || pause.right <= hud.left || pause.top >= hud.bottom || pause.bottom <= hud.top };
    });
    assert.ok(readable.captionWidth >= 180 && readable.pauseClear, `${name}: captions keep words intact and Pause clears the HUD: ${JSON.stringify(readable)}`);
    await page.evaluate(() => {
      for (const animation of document.querySelector('[data-testid="screen-dread"]').getAnimations()) animation.play();
      window.__run.getState().pause();
    });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-testid="screen-dread"]')).animationPlayState === "paused");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.getByTestId("screen-dread").evaluate(element => getComputedStyle(element).animationName), "none", "reduced motion keeps a steady proximity warning");
    assert.ok(await page.getByTestId("screen-dread").evaluate(element => +getComputedStyle(element).opacity > 0), "reduced motion retains the warning");
    assert.deepEqual(errors, []);
    console.log(`PASS ${name}: combat effects behind HUD and controls, paused pulse, steady reduced-motion warning`);
    await context.close();
  }
} finally { await browser.close(); }
