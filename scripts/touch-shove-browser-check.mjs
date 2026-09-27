import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
mkdirSync("output/verification/touch-shove", { recursive: true });
try {
  for (const [name, width, height] of [["phone", 844, 390], ["tablet", 1024, 768]]) {
    const page = await browser.newPage({ viewport: { width, height }, screen: { width, height }, hasTouch: true, isMobile: true });
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ touchControls: "on", uiScale: 1.6 })));
    await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
    await page.getByTestId("menu-start").tap();
    await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
    const button = page.getByTestId("touch-shove");
    assert.match(await button.innerText(), /READY/, "readiness is visible on the control itself");
    await page.getByTestId("touch-buttons").screenshot({ path: `output/verification/touch-shove/${name}-ready.png` });
    await button.evaluate(el => {
      window.__touchShoveLabels = [el.textContent];
      const observer = new MutationObserver(() => {
        window.__touchShoveLabels.push(el.textContent);
        if (el.textContent.includes("WAIT")) observer.disconnect();
      });
      observer.observe(el, { childList: true, subtree: true, characterData: true });
    });
    await button.tap();
    await page.waitForFunction(() => window.__run.getState().shoveReadyAt > window.__derived.clock());
    await page.waitForFunction(() => document.querySelector('[data-testid="touch-shove"]')?.textContent.includes("WAIT"));
    assert.ok(await page.evaluate(() => window.__touchShoveLabels.some(line => line.includes("WINDUP"))),
      "the actual tap visibly passes through windup before recovery");
    await page.evaluate(() => window.__run.getState().pause());
    await page.waitForFunction(() => document.querySelector('[data-testid="touch-shove"]')?.textContent.includes("WAIT"));
    // Capturing a software-rendered image can outlast the entire cooldown.
    await page.getByTestId("touch-buttons").screenshot({ path: `output/verification/touch-shove/${name}-recovering.png`,
      style: '[data-testid="pause-menu"] { visibility: hidden !important; }' });
    const recovery = await button.innerText();
    assert.equal(await button.getAttribute("aria-disabled"), "true");
    const remaining = recovery.match(/\d+\.\ds/)[0];
    await page.waitForFunction(value => document.querySelector('[data-testid="shove-status"]')?.textContent.includes(value), remaining);
    await page.waitForTimeout(600);
    assert.equal(await button.innerText(), recovery, "pause freezes the button's recovery countdown");
    assert.ok(await button.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight),
      "both button lines fit at maximum text scale");
    await page.evaluate(() => window.__run.getState().resume());
    const deadline = await page.evaluate(() => window.__run.getState().shoveReadyAt);
    const box = await button.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await page.evaluate(() => window.__run.getState().shoveReadyAt), deadline,
      "tapping during recovery cannot restart or extend it");
    await page.waitForFunction(() => document.querySelector('[data-testid="touch-shove"]')?.textContent.includes("READY"));
    assert.notEqual(await button.getAttribute("aria-disabled"), "true");
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__run.getState().shoveChargingAt), null,
      "a recovery tap is not queued for a surprise shove");
    await button.tap();
    await page.waitForFunction(previous => window.__run.getState().shoveReadyAt > previous, deadline);
    assert.deepEqual(errors, []);
    console.log(`PASS ${name}: visible recovery, shared HUD countdown, pause, fit, ignored early tap and next shove`);
    await page.close();
  }
} finally { await browser.close(); }
