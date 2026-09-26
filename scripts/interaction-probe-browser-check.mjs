import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5199"}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__playerDebug && window.__run);
  await page.evaluate(() => {
    const state = window.__run.getState();
    const shop = state.dungeon.rooms.find(room => room.kind === "shop");
    window.__run.setState({ currentRoomId: shop.id, transitioning: false, paused: false, inputLocks: 0,
      bombBought: false, gems: 20, wardenRoomId: null, harrierSlain: true, reaperAwake: false });
  });
  await page.waitForFunction(() => Object.keys(window.__triggers ?? {}).some(label => label.startsWith("Buy a bomb")));
  await page.evaluate(() => window.__run.getState().markBombBought());
  await page.waitForFunction(() => Object.keys(window.__triggers ?? {}).some(label => label.includes("bomb is sold")));
  assert.ok(await page.evaluate(() => !Object.keys(window.__triggers).some(label => label.startsWith("Buy a bomb"))),
    "changed labels remove the obsolete live interaction");
  await page.evaluate(() => window.__run.getState().quitToMenu());
  await page.getByTestId("menu-start").waitFor();
  await page.waitForFunction(() => Object.keys(window.__triggers ?? {}).length === 0);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => Object.keys(window.__triggers ?? {}).length > 0);
  assert.ok(await page.evaluate(() => !Object.keys(window.__triggers).some(label => label.includes("bomb is sold"))),
    "a new run has no interactions retained from the previous shop");
  assert.deepEqual(errors, []);
  console.log("PASS interaction probe: changed labels, unmount cleanup and fresh-run isolation");
} finally { await browser.close(); }
