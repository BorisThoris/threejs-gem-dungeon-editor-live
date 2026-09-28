import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5199"}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  const deadline = await page.evaluate(async () => {
    const { NOTICE_HOLD_S } = await import("/src/game/world.ts");
    window.__run.getState().pause();
    window.__teachingLines = [];
    window.__bus.on("notice", line => window.__teachingLines.push(line));
    const roomId = window.__run.getState().currentRoomId;
    window.__bus.emit("wardenEntered", { roomId });
    window.__bus.emit("beetlesScattered", { roomId });
    window.__bus.emit("croakersDove", { roomId });
    return { clock: window.__derived.clock(), hold: NOTICE_HOLD_S };
  });
  await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]')?.textContent.includes("The Warden is here"));
  assert.equal((await page.evaluate(() => window.__teachingLines)).length, 1,
    "concurrent wildlife reactions cannot erase the first Warden lesson");
  await page.waitForTimeout((deadline.hold + .2) * 1000);
  await page.evaluate(() => window.__bus.emit("beetlesScattered", { roomId: window.__run.getState().currentRoomId }));
  assert.equal((await page.evaluate(() => window.__teachingLines)).length, 1, "pausing preserves the protected reading window");
  await page.getByTestId("pause-resume").click();
  await page.waitForFunction(end => window.__derived.clock() > end, deadline.clock + deadline.hold, { timeout: 15000 });
  assert.ok(!(await page.evaluate(() => document.querySelector('[data-testid="guidance"]')?.textContent ?? "")).includes("Glow beetles"),
    "a suppressed observation is not replayed after its moment has passed");
  await page.evaluate(() => window.__bus.emit("beetlesScattered", { roomId: window.__run.getState().currentRoomId }));
  await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]')?.textContent.includes("Glow beetles"));
  assert.equal((await page.evaluate(() => window.__teachingLines)).filter(line => line?.startsWith("Glow beetles")).length, 1,
    "a suppressed observation can teach at its next occurrence");
  await page.evaluate(() => {
    const roomId = window.__run.getState().currentRoomId;
    window.__bus.emit("beetlesScattered", { roomId });
    window.__bus.emit("harrierWoke");
    window.__bus.emit("mitesBurrowed", { roomId });
  });
  await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]')?.textContent.includes("The Harrier hovers"));
  const lines = await page.evaluate(() => window.__teachingLines);
  assert.equal(lines.filter(line => line?.startsWith("Glow beetles")).length, 1, "shown observations remain once per run");
  assert.equal(lines.filter(line => line?.startsWith("The ash mites")).length, 0);
  await page.evaluate(() => window.__bus.emit("notice", "The fuse is lit. Move clear."));
  await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]')?.textContent.includes("The fuse is lit"));
  await page.evaluate(() => window.__bus.emit("mitesBurrowed", { roomId: window.__run.getState().currentRoomId }));
  assert.ok((await page.getByTestId("guidance").innerText()).includes("The fuse is lit"),
    "passive wildlife cannot erase direct action feedback either");
  await page.evaluate(() => {
    window.__bus.emit("notice", null);
    window.__bus.emit("mitesBurrowed", { roomId: window.__run.getState().currentRoomId });
  });
  await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]')?.textContent.includes("The ash mites"));
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.evaluate(() => window.__bus.emit("wardenEntered", { roomId: window.__run.getState().currentRoomId }));
  await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]')?.textContent.includes("The Warden is here"));
  assert.equal((await page.evaluate(() => window.__teachingLines)).filter(line => line?.startsWith("The Warden is here")).length, 2,
    "a fresh run resets the first-encounter lesson");
  assert.deepEqual(errors, []);
  console.log("PASS teaching priority: danger survives wildlife reactions, pause holds reading time, observations retry on a later occurrence, actions still report and new runs reset");
} finally { await browser.close(); }
