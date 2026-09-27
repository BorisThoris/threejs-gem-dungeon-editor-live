import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__din && window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  for (const stall of [0, 1400]) {
    const result = await page.evaluate(async stall => {
      const { EMISSIONS } = await import("/src/game/din/emissions.ts");
      const run = window.__run, din = window.__din;
      const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      run.getState().resume();
      await frames();
      const roomId = run.getState().currentRoomId;
      const began = performance.now();
      // The event happens AFTER a long task, not before it. Its lifetime
      // must not include the time spent waiting for the previous frame.
      while (performance.now() - began < stall) { /* Delayed frame. */ }
      window.__bus.emit("propBroken", { roomId, kind: "barrel", key: "clock-check" });
      run.getState().pause();
      await frames();
      const strength = () => din.snapshot(roomId).filter(s => s.source === "propBroken").at(-1)?.here;
      const fresh = strength();
      const heard = din.answering(din.emptyArrival(), "rat", roomId);
      await wait(800);
      await frames();
      const paused = strength();
      run.getState().resume();
      await wait(350);
      await frames();
      return { stall, expected: EMISSIONS.propBroken.magnitude, fresh, heard, paused, resumed: strength() };
    }, stall);
    console.log(result);
    assert.ok(Math.abs(result.fresh - result.expected) < 0.01, "a new event retains its declared strength after a delayed frame");
    assert.equal(result.heard, true, "the fresh sound reaches the rat's declared threshold");
    assert.equal(result.paused, result.fresh, "pausing preserves the event's remaining strength");
    assert.ok(result.resumed < result.paused && result.resumed > 0, "resuming lets the same event decay");
  }
  assert.deepEqual(errors, []);
  console.log("PASS sound event time: fresh after a delayed frame, frozen on pause, decaying on resume");
} finally { await browser.close(); }
