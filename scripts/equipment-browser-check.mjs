import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "./browser-safety.mjs";

const output = process.env.AGENT_SCRATCH || "D:/agent-work/gem-dungeon/2026-10-27-crawler";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--mute-audio"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && !window.__run.getState().transitioning);
  await page.evaluate(() => {
    const run = window.__run;
    run.getState().startRun(1);
    const shop = run.getState().dungeon.rooms.find(r => r.kind === "shop");
    if (!shop) throw Error("Seed 1 shop fixture missing");
    run.setState({ currentRoomId: shop.id, gems: 30, transitioning: true });
    run.getState().roomReady(shop.id);
  });
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.keyboard.press("KeyI");
  await page.getByTestId("weapon-spear").click();
  assert.equal(await page.evaluate(() => window.__run.getState().equippedWeapon), "spear");
  assert.equal(await page.evaluate(() => window.__run.getState().gems), 26);
  await page.getByTestId("weapon-axe").click();
  assert.equal(await page.evaluate(() => window.__run.getState().gems), 21);
  await page.getByTestId("weapon-spear").click();
  assert.equal(await page.evaluate(() => window.__run.getState().gems), 21, "equipping owned gear is free");
  // A palette refresh must preserve canonical colours, not capture the last
  // frame's dimmed colour and multiply it again on every equipment change.
  for (let i = 0; i < 3; i++) {
    await page.getByTestId("weapon-axe").click();
    await page.waitForTimeout(100);
    await page.getByTestId("weapon-spear").click();
    await page.waitForTimeout(100);
  }
  const palmBrightness = await page.evaluate(() => window.__scene.getObjectByName("hand-palm").material.color.r);
  assert.ok(palmBrightness >= 0.23, `repeated swaps retain the hand's minimum ambient brightness: ${palmBrightness}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("weapon-spear").scrollIntoViewIfNeeded();
  assert.equal(await page.getByTestId("weapon-spear").evaluate(el => {
    const b = el.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1;
  }), true, "equipment controls fit a phone");
  await page.screenshot({ path: `${output}/equipment-phone.png` });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByTestId("inventory-close").click();
  await page.getByTestId("shove-status").filter({ hasText: "WATCHMAN'S SPEAR" }).waitFor();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__run.getState().shoveReadyAt > 0);
  await page.screenshot({ path: `${output}/spear-gameplay.png` });
  const carried = await page.evaluate(() => {
    const run = window.__run;
    run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
    run.getState().roomReady(run.getState().dungeon.endId);
    return { floor: run.getState().floor, equipped: run.getState().equippedWeapon, owned: run.getState().weapons,
      health: run.getState().enemyHealth };
  });
  assert.deepEqual(carried, { floor: 2, equipped: "spear", owned: ["fists", "sword", "spear", "axe"], health: { warden: 12, harrier: 6 } });
  await page.evaluate(() => window.__run.getState().startRun(2));
  assert.deepEqual(await page.evaluate(() => window.__run.getState().weapons), ["fists", "sword"], "fresh run resets acquired gear");
  assert.deepEqual(errors, []);
  console.log("PASS equipment UI: buy, equip, phone fit, real attack key, descent carryover, fresh-run reset");
} finally { await browser.close(); }
