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
  await page.waitForFunction(() => window.__run && !window.__run.getState().transitioning && window.__playerDebug);
  const stageExit = () => page.evaluate(() => {
    const run = window.__run;
    run.setState({ floor: 3, currentRoomId: run.getState().dungeon.endId, transitioning: true });
    run.getState().roomReady(run.getState().dungeon.endId);
  });
  await page.evaluate(() => window.__run.setState({ satchel: ["bomb", "healing", "mire", "mapping", "snare"], gems: 17 }));
  await stageExit();
  await page.getByTestId("expedition-choice").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("choose-ng").scrollIntoViewIfNeeded();
  assert.ok(await page.getByTestId("choose-ng").evaluate(el => el.getBoundingClientRect().right <= innerWidth));
  await page.screenshot({ path: `${output}/crossroads-phone.png` });
  await page.getByTestId("choose-ng").click();
  await page.waitForFunction(() => window.__run.getState().newGamePlus === 1 && !window.__run.getState().transitioning);
  assert.deepEqual(await page.evaluate(() => ({ items: window.__run.getState().satchel, gems: window.__run.getState().gems,
    health: window.__run.getState().enemyHealth, floor: window.__run.getState().floor })),
  { items: ["bomb", "healing", "mire", "mapping", "snare"], gems: 17, health: { warden: 24, harrier: 12 }, floor: 1 });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => window.__run.getState().startRun(11, "vagrant"));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await stageExit();
  await page.getByTestId("choose-boss").click();
  await page.waitForFunction(() => window.__run.getState().bossActive && !window.__run.getState().transitioning);
  await page.getByTestId("boss-status").waitFor();
  await page.screenshot({ path: `${output}/boss-arena.png` });
  await page.evaluate(async () => { window.__bossTestRules = await import("/src/game/progression.ts"); });
  // From here: real movement and attack inputs, with no teleports, health grants or cooldown edits.
  let movement = null, hits = 0, previousHealth = 24, previousBeat = -1;
  // Use the player's sprint for warning dodges. Walking the entire distance
  // left little margin for the capped browser's input-delivery latency.
  await page.keyboard.down("ShiftLeft");
  const deadline = Date.now() + 100000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const s = window.__run.getState(), now = window.__derived.clock();
      const beat = window.__bossTestRules.bossBeat(now - s.bossStartedAt);
      return { phase: s.phase, health: s.bossHealth, lives: s.lives, z: window.__playerDebug.z,
        warning: beat.warning, outer: beat.outer, beat: beat.index,
        ready: now >= s.shoveReadyAt && s.shoveChargingAt === null };
    });
    if (s.phase === "won") break;
    assert.equal(s.phase, "playing", `boss attempt ended unexpectedly: ${JSON.stringify(s)}`);
    if (s.beat !== previousBeat) { console.log("BEAT", JSON.stringify(s)); previousBeat = s.beat; }
    const target = s.warning && !s.outer ? 4.15 : 2.35;
    const key = s.z > target + 0.12 ? "KeyW" : s.z < target - 0.12 ? "KeyS" : null;
    if (key !== movement) {
      if (movement) await page.keyboard.up(movement);
      if (key) await page.keyboard.down(key);
      movement = key;
    }
    if (s.ready && s.z < 2.7 && (!s.warning || s.outer)) await page.keyboard.press("Space");
    if (s.health < previousHealth) { hits++; previousHealth = s.health; console.log("HIT", JSON.stringify(s)); }
    await page.waitForTimeout(70);
  }
  if (movement) await page.keyboard.up(movement);
  await page.keyboard.up("ShiftLeft");
  assert.equal(await page.evaluate(() => window.__run.getState().phase), "won", "movement and melee defeat the boss");
  assert.ok(hits >= 10, "the encounter used repeated real attacks");
  await page.getByTestId("summary-ng").waitFor();
  await page.screenshot({ path: `${output}/boss-victory.png` });
  await page.getByTestId("summary-ng").click();
  await page.waitForFunction(() => window.__run.getState().newGamePlus === 1 && !window.__run.getState().transitioning);
  assert.equal(await page.evaluate(() => window.__run.getState().gems), 10, "boss reward carries into NG+");
  assert.deepEqual(errors, []);
  console.log("PASS crossroads phone UI, NG+ carryover, boss arena, real movement/melee victory and victory-to-NG+");
} finally { await browser.close(); }
