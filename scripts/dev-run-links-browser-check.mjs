/** A live room can become an exact Atlas selection or fresh replay scenario. */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const base = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(base);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const live = await page.evaluate(() => {
    const run = window.__run;
    const state = run.getState();
    // A relic bought inside this floor must not change the Atlas recipe for
    // the floor that is already standing.
    run.setState({ relics: [...state.relics, "tally"] });
    return { seed: state.runSeed, floor: state.floor, room: state.currentRoomId,
      roomBias: run.getState().dungeon.roomBias };
  });
  assert.equal(live.roomBias, false, "the current floor was built without Tally bias");
  await page.keyboard.press("Escape");
  const tools = page.locator('[data-testid="dev-run-links"]');
  await tools.waitFor();
  if (process.argv.includes("--screenshot")) await page.screenshot({ path: "output/dev-run-links.png", fullPage: true });
  const atlasHref = await page.locator('[data-testid="dev-inspect-atlas"]').getAttribute("href");
  const replayHref = await page.locator('[data-testid="dev-replay-room"]').getAttribute("href");
  const atlas = new URL(atlasHref), replay = new URL(replayHref);
  assert.equal(atlas.searchParams.get("tab"), "world");
  assert.equal(atlas.searchParams.get("seed"), String(live.seed));
  assert.equal(atlas.searchParams.get("floor"), String(live.floor));
  assert.equal(atlas.searchParams.get("room"), live.room);
  assert.equal(atlas.searchParams.has("bias"), false, "Atlas uses the floor's recorded bias, not newly bought relics");
  assert.equal(replay.searchParams.get("room"), live.room);
  assert.equal(replay.searchParams.has("bias"), false, "replay uses the same generation choice");

  const atlasPopupPromise = page.waitForEvent("popup");
  await page.locator('[data-testid="dev-inspect-atlas"]').click();
  const atlasPopup = await atlasPopupPromise;
  await atlasPopup.locator('[data-testid="atlas-play-room"]').waitFor();
  assert.equal(await atlasPopup.getByRole("spinbutton", { name: "Run seed" }).inputValue(), String(live.seed));
  assert.equal(await atlasPopup.getByRole("combobox", { name: "World depth" }).inputValue(), String(live.floor));
  assert.match(await atlasPopup.locator('[data-testid="atlas-play-room"]').getAttribute("href"),
    new RegExp(`room=${live.room}(?:&|$)`), "the World tab selected the current room");
  await atlasPopup.close();

  const replayPopupPromise = page.waitForEvent("popup");
  await page.locator('[data-testid="dev-replay-room"]').click();
  const replayPopup = await replayPopupPromise;
  await replayPopup.waitForFunction(expected => {
    const state = window.__run?.getState();
    return state?.phase === "playing" && state.currentRoomId === expected && !state.transitioning;
  }, live.room, { timeout: 20000 });
  assert.ok(await replayPopup.evaluate(async ({ seed, floor }) => {
    const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
    const state = window.__run.getState();
    return state.runSeed === seed && state.floor === floor &&
      JSON.stringify(state.dungeon) === JSON.stringify(generateRunFloor(seed, floor, false));
  }, live), "the replay opens a fresh copy of the original generated floor");
  await replayPopup.close();
  assert.ok(await page.evaluate(() => window.__run.getState().paused), "the original run remains paused");

  await page.goto(`${base}?scenario=1&seed=2&floor=1&room=start&bias=1`);
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  await page.keyboard.press("Escape");
  await page.locator('[data-testid="dev-inspect-atlas"]').waitFor();
  assert.equal(new URL(await page.locator('[data-testid="dev-inspect-atlas"]').getAttribute("href"))
    .searchParams.get("bias"), "1", "a Tally-built floor keeps its bias in the Atlas link");
  assert.deepEqual(errors, [], "development round trips do not produce browser errors");
  console.log("PASS  live room to Atlas and replay, historical Tally bias, original run preserved");
} finally {
  await browser.close();
}
