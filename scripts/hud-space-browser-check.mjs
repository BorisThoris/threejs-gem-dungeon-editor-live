/** Keep a crowded, real gameplay HUD readable without losing the room. */
import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--mute-audio", "--no-sandbox"] });
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
  await page.evaluate(() => window.__run.getState().takePledge("unspent"));
  await page.getByTestId("hud-pledge").waitFor();
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
  await page.evaluate(() => {
    const s = window.__run.getState(), room = s.dungeon.rooms.find(room => room.id === s.currentRoomId);
    const target = s.dungeon.rooms.find(room => room.waterway?.role === "outfall")
      ?? s.dungeon.rooms.find(room => room.kind === "shop");
    if (!target || target.id === room.id) throw Error("Crowded route case needs another remembered destination");
    s.pause();
    window.__run.setState({ visited: s.dungeon.rooms.map(room => room.id),
      barricades: Object.values(room.links).map(to => [room.id, to].sort().join("|")) });
    if (!window.__run.getState().trackRoute(target.id)) throw Error("Could not follow the crowded destination");
    window.__run.getState().resume();
  });
  await page.getByTestId("hud-route").waitFor();
  assert.match(await page.getByTestId("hud-route").innerText(), /blocked/);
  assert.equal(await page.getByTestId("secret-trail-guide").count(), 0, "a followed destination takes priority over passive trail directions");
  assert.equal(await page.getByTestId("service-rubbing").count(), 0);
  const routed = await page.getByTestId("hud").evaluate(element => {
    const box = element.getBoundingClientRect();
    const guidance = document.querySelector('[data-testid="guidance"]')?.getBoundingClientRect();
    return { width: box.width, height: box.height, guidanceClear: !guidance || guidance.left >= box.right || guidance.top >= box.bottom,
      rows: [...element.children].map(child => ({ text: child.textContent, height: child.getBoundingClientRect().height })) };
  });
  assert.ok(routed.height <= 425 && routed.width <= 465 && routed.guidanceClear,
    `a followed blocked route preserves the crowded HUD budget: ${JSON.stringify(routed)}`);
  console.log(`PASS  crowded HUD with followed blocked route ${Math.round(routed.width)}×${Math.round(routed.height)} px`);
  await page.evaluate(() => window.__run.setState({ newGamePlus: 1, equippedWeapon: "axe" }));
  await page.getByTestId("ng-status").waitFor();
  await page.getByTestId("shove-status").filter({ hasText: "EXECUTIONER'S AXE" }).waitFor();
  const continued = await page.getByTestId("hud").boundingBox();
  assert.ok(continued.height <= 425 && continued.width <= 465,
    `NG+ and a longer weapon name preserve the crowded HUD budget: ${JSON.stringify(continued)}`);
  assert.match(await page.getByTestId("ng-status").getAttribute("aria-label"), /enemy health and incoming damage ×2/);
  console.log(`PASS  crowded NG+ equipment HUD ${Math.round(continued.width)}×${Math.round(continued.height)} px`);
  const knowledge = await page.evaluate(() => {
    const s = window.__run.getState();
    return { visited: s.visited, rubbing: s.waterCacheTaken,
      trail: !!s.dungeon.secretTrail && s.visited.includes(s.dungeon.secretTrail.sourceId) };
  });
  await page.evaluate(() => { window.__run.getState().pause(); window.__run.getState().trackRoute(null); window.__run.getState().resume(); });
  if (knowledge.trail) await page.getByTestId("secret-trail-guide").waitFor();
  assert.deepEqual(await page.evaluate(() => ({ visited: window.__run.getState().visited, rubbing: window.__run.getState().waterCacheTaken })),
    { visited: knowledge.visited, rubbing: knowledge.rubbing }, "stopping restores passive directions without changing knowledge");
} finally {
  await browser.close();
}
