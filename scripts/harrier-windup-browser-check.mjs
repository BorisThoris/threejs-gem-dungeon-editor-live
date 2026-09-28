import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const port = process.env.PORT ?? process.argv[2] ?? "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const failures = [];
const check = (condition, message, detail) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${message}: ${JSON.stringify(detail)}`);
  if (!condition) failures.push(message);
};
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ cameraBob: false })));
  const stage = async () => {
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.getByTestId("menu-start").click();
    await page.waitForFunction(() => window.__derived && !window.__run.getState().transitioning);
    await page.evaluate(() => window.__run.getState().startRun(11));
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    await page.evaluate(() => {
      window.__windWarnings = [];
      window.__bus.on("notice", text => {
        if (text !== "The Harrier draws back. Dodge or shove.") return;
        window.__windWarnings.push(window.__derived.clock());
        if (window.__windWarnings.length === 1) window.__run.getState().pause();
      });
      window.__run.setState({ floor: 2, harrierAwake: true, harrierRoomId: window.__run.getState().currentRoomId,
        harrierSlain: false, harrierRetreatUntil: 0, harrierDownedUntil: 0, lives: 3, lastDamageAt: -100,
        wardenRoomId: null, reaperAwake: false, thiefPhase: "away" });
    });
    await page.waitForFunction(() => window.__run.getState().paused, null, { timeout: 15000 });
    return page.evaluate(async () => (await import("/src/game/player/combat.ts")).HARRIER_WINDUP_S);
  };

  const windup = await stage();
  const before = await page.evaluate(() => {
    const p = window.__playerDebug, h = window.__harrier;
    window.__bus.emit("lookSet", { yaw: Math.atan2(h.x - p.x, h.z - p.z), pitch: 0 });
    return { x: p.x, z: p.z };
  });
  await page.keyboard.down("KeyW");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForTimeout(1100);
  await page.keyboard.up("KeyW");
  const retreat = await page.evaluate(from => ({ moved: Math.hypot(window.__playerDebug.x - from.x, window.__playerDebug.z - from.z),
    warnings: window.__windWarnings, lives: window.__run.getState().lives }), before);
  check(retreat.moved > 2 && retreat.lives === 3, "walking away cancels the dive without a hit", retreat);
  check(retreat.warnings.every((time, i, all) => i === 0 || time - all[i - 1] >= windup),
    "an aborted dive cannot restart its warning within one windup beat", retreat.warnings);

  await stage();
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__harrier.tell >= 0.25 && window.__harrier.tell < 1);
  const recoveryAt = await page.evaluate(() => {
    window.__run.getState().downHarrier();
    window.__bus.emit("teleport", { position: [window.__harrier.x, 1.5, window.__harrier.z] });
    return window.__run.getState().harrierDownedUntil;
  });
  await page.waitForFunction(() => window.__run.getState().lives < 3, null, { timeout: 15000 });
  const recovered = await page.evaluate(until => ({ delay: window.__run.getState().lastDamageAt - until,
    warnings: window.__windWarnings }), recoveryAt);
  check(recovered.warnings.length >= 2 && recovered.delay >= windup - 0.05,
    "getting up from a knockdown gives a fresh complete attack warning", recovered);
  check(errors.length === 0, "no uncaught browser errors", errors);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
