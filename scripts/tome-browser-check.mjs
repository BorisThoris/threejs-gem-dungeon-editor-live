import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const port = process.argv[2] ?? process.env.PORT ?? "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"] });
const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
};
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing"
    && !window.__run.getState().transitioning && window.__bus);
  const openTome = async () => page.evaluate(() => {
    window.__run.setState({ lastDamageAt: 1e9 });
    window.__bus.emit("puzzleOpen", { kind: "number", difficulty: "hard",
      roomId: window.__run.getState().currentRoomId });
  });
  await openTome();
  await page.getByTestId("tome-ready").waitFor();
  const sheet = page.getByText("THE TOME OF NUMBERS", { exact: true }).locator("..");
  const time = async () => (await sheet.innerText()).match(/\b(\d+)s\b/)?.[1];
  const limit = await time();
  await page.waitForTimeout(1200);
  check(await time() === limit, "memorizing does not spend the answer timer");
  const fits = async () => sheet.evaluate(element => {
    const panel = element.parentElement;
    const box = panel.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && panel.scrollWidth <= panel.clientWidth;
  });
  check(await fits(), "all six digits fit a portrait phone without horizontal scrolling");
  await page.getByTestId("tome-ready").click();
  await page.getByTestId("keypad").waitFor();
  const initialSize = await sheet.evaluate(element => getComputedStyle(element.firstElementChild).fontSize);
  await page.evaluate(() => window.__settings.getState().setUiScale(1.6));
  await page.waitForFunction(before => getComputedStyle(document.querySelector('[role="dialog"] > div > div')).fontSize !== before, initialSize);
  for (const [width, height] of [[320, 640], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    check(await fits(), `tome fits ${width}×${height} at maximum text size`);
    await page.getByTestId("tome-leave").scrollIntoViewIfNeeded();
    check(await page.getByTestId("tome-leave").evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight;
    }), "the Leave button remains reachable when the panel scrolls");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  mkdirSync("output/playwright", { recursive: true });
  await page.screenshot({ path: "output/playwright/tome-portrait.png" });
  await page.waitForFunction(initial => {
    const value = document.querySelector('[role="dialog"]').innerText.match(/\b(\d+)s\b/);
    return value && Number(value[1]) < Number(initial);
  }, limit);
  check(true, "the answer timer starts when input opens");
  check(await page.getByTestId("keypad").getByRole("button", { name: "OK", exact: true }).count() === 0,
    "single-digit entry has no redundant confirmation button");
  const sequence = await page.evaluate(() => window.__numberSequence);
  await page.keyboard.press(String((sequence[0] + 1) % 10));
  await page.keyboard.press("Backspace");
  await page.keyboard.down(String(sequence[0]));
  await page.keyboard.down(String(sequence[0]));
  await page.keyboard.down(String(sequence[0]));
  await page.keyboard.up(String(sequence[0]));
  // A held key must occupy one slot. Complete the rest with real on-screen keys.
  for (const digit of sequence.slice(1)) {
    await page.getByTestId("keypad").getByRole("button", { name: String(digit), exact: true }).click();
  }
  check((await sheet.innerText()).includes("Correct."), "holding a digit enters one slot and the keypad completes the answer");
  await page.waitForFunction(() => window.__run.getState().cleared.includes(window.__run.getState().currentRoomId)
    && window.__run.getState().inputLocks === 0);
  check(true, "a correct answer reaches the run store and releases its input lock");
  await openTome();
  await page.getByTestId("tome-ready").waitFor();
  await page.getByTestId("tome-leave").click();
  await page.waitForFunction(() => window.__run.getState().inputLocks === 0);
  check(await page.evaluate(() => !window.__run.getState().failed.includes(window.__run.getState().currentRoomId)),
    "leaving during memorization does not fail the room");
  check(errors.length === 0, `no runtime errors: ${errors.join("; ")}`);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
