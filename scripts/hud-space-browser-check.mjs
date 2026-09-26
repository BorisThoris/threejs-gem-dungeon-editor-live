/** Keep a crowded, real gameplay HUD readable without losing the room. */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/?scenario=1&seed=1&floor=3&room=room_11`);
  await page.waitForFunction(() => {
    const state = window.__run?.getState();
    return state?.phase === "playing" && state.floor === 3 && state.currentRoomId === "room_11" && !state.transitioning;
  }, null, { timeout: 20000 });
  await page.getByTestId("hud-keeper").waitFor();
  const measured = await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="hud"]').getBoundingClientRect();
    const guidance = document.querySelector('[data-testid="guidance"]')?.getBoundingClientRect();
    const lines = [...document.querySelectorAll('[data-testid^="hud-"]')]
      .map(element => element.getAttribute("data-testid"));
    return { width: hud.width, height: hud.height, bottom: hud.bottom,
      guidanceClear: !guidance || guidance.left >= hud.right || guidance.top >= hud.bottom,
      lines };
  });
  assert.ok(measured.lines.includes("hud-gems") && measured.lines.includes("hud-lives") &&
    measured.lines.includes("hud-lantern") && measured.lines.includes("hud-floor") &&
    measured.lines.includes("hud-keeper"), "critical and contextual lines remain visible");
  assert.ok(measured.height <= 425 && measured.width <= 465 && measured.guidanceClear,
    `crowded HUD stays within its desktop space budget: ${JSON.stringify(measured)}`);
  if (process.argv.includes("--screenshot")) await page.screenshot({ path: "output/hud-after.png" });
  assert.deepEqual(errors, [], "HUD layout has no browser errors");
  console.log(`PASS  crowded HUD ${Math.round(measured.width)}×${Math.round(measured.height)} px and guidance clear`);
} finally {
  await browser.close();
}
