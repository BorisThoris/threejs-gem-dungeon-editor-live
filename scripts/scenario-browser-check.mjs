import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${port}/?editor`);
  await page.getByRole("button", { name: "WORLD", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Run seed" }).fill("72");
  await page.getByRole("combobox", { name: "World depth" }).selectOption("2");
  const roomId = await page.locator('[data-testid="atlas-room"]').nth(1).getAttribute("data-room-id");
  await page.locator(`[data-testid="atlas-room"][data-room-id="${roomId}"]`).click();
  const link = await page.locator('[data-testid="atlas-play-room"]').getAttribute("href");
  assert.match(link, /scenario=1.*seed=72.*floor=2/, "atlas makes a shareable scenario link");
  await page.locator('[data-testid="atlas-play-room"]').click();
  await page.waitForFunction(expected => {
    const state = window.__run?.getState();
    return state?.phase === "playing" && state.floor === 2 && state.currentRoomId === expected && !state.transitioning;
  }, roomId, { timeout: 20000 });
  const first = await page.evaluate(async () => {
    const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
    const { insideRoom } = await import("/src/game/dungeon/footprint.ts");
    const { canControl } = await import("/src/game/state/run.ts");
    const { PLAYER_CAPSULE_RADIUS } = await import("/src/game/world.ts");
    const state = window.__run.getState();
    const room = state.dungeon.rooms.find(candidate => candidate.id === state.currentRoomId);
    const player = window.__playerDebug;
    return { replay: JSON.stringify(state.dungeon) === JSON.stringify(generateRunFloor(72, 2)), control: canControl(state),
      inside: !!player && insideRoom(room, player.x, player.z, PLAYER_CAPSULE_RADIUS),
      runSeed: state.runSeed, floor: state.floor, room: state.currentRoomId };
  });
  assert.ok(first.replay && first.inside && first.control && first.runSeed === 72,
    `scenario stages the actual playable room: ${JSON.stringify(first)}`);
  if (process.argv.includes("--screenshot")) await page.screenshot({ path: "output/scenario.png", fullPage: true });
  await page.getByRole("link", { name: "Back to atlas" }).click();
  await page.getByRole("button", { name: "WORLD", exact: true }).click();
  assert.equal(await page.getByRole("spinbutton", { name: "Run seed" }).inputValue(), "72");
  assert.equal(await page.getByRole("combobox", { name: "World depth" }).inputValue(), "2");
  assert.match(await page.locator('[data-testid="atlas-play-room"]').getAttribute("href"), new RegExp(`room=${roomId}`),
    "returning to the atlas keeps the inspected room");

  await page.getByRole("spinbutton", { name: "Run seed" }).fill("2");
  await page.getByRole("combobox", { name: "World depth" }).selectOption("3");
  await page.locator('[data-testid="atlas-room-bias"]').check();
  const endId = await page.evaluate(async () => (await import("/src/game/dungeon/runFloor.ts")).generateRunFloor(2, 3, true).endId);
  await page.locator(`[data-testid="atlas-room"][data-room-id="${endId}"]`).click();
  await page.locator('[data-testid="atlas-play-room"]').click();
  await page.waitForFunction(expected => {
    const state = window.__run?.getState();
    return state?.phase === "playing" && state.floor === 3 && state.currentRoomId === expected && !state.transitioning;
  }, endId, { timeout: 20000 });
  const final = await page.evaluate(async () => {
    const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
    const state = window.__run.getState();
    return { replay: JSON.stringify(state.dungeon) === JSON.stringify(generateRunFloor(2, 3, true)),
      tally: state.relics.includes("tally"), phase: state.phase, room: state.currentRoomId };
  });
  assert.ok(final.replay && final.tally && final.phase === "playing", `biased last-floor stair remains playable: ${JSON.stringify(final)}`);
  await page.goto(`http://127.0.0.1:${port}/?scenario=1&seed=2&floor=1&room=start&bias=1`);
  await page.waitForFunction(() => {
    const state = window.__run?.getState();
    return state?.phase === "playing" && state.floor === 1 && state.currentRoomId === "start" && !state.transitioning;
  }, null, { timeout: 20000 });
  assert.ok(await page.evaluate(async () => {
    const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
    const state = window.__run.getState();
    return state.relics.includes("tally") && JSON.stringify(state.dungeon) === JSON.stringify(generateRunFloor(2, 1, true));
  }), "room bias also reproduces on the first floor");
  await page.goto(`http://127.0.0.1:${port}/?editor=1&tab=cases`);
  await page.locator('[data-testid="scenario-case"]').first().waitFor();
  assert.match(await page.locator('[data-testid="scenario-coverage"]').innerText(), /12\/12 room kinds.*11\/11 footprints/);
  await page.getByRole("textbox", { name: "Filter scenarios" }).fill("ring");
  assert.ok(await page.locator('[data-testid="scenario-case"]').count() > 0);
  assert.equal(await page.locator('[data-testid="scenario-case"]:not([data-shape="ring"])').count(), 0);
  assert.deepEqual(errors, [], "scenario launches and returns without browser errors");
  console.log(`PASS  shareable atlas scenario, playable rooms, return link, room bias, and coverage shelf`);
} finally {
  await browser.close();
}
