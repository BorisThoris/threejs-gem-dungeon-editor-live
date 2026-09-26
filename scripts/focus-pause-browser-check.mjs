import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] ?? process.env.PORT ?? "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"] });
const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing"
    && !window.__run.getState().transitioning);
  const blur = async () => page.evaluate(() => {
    // Explicitly exercise focus loss with a free cursor, without relying on
    // the test host's window manager to activate a different application.
    window.dispatchEvent(new Event("blur"));
    return window.__run.getState().paused;
  });
  check(await blur(), "losing focus with a free cursor pauses the run");
  await page.evaluate(() => window.__run.getState().pause());
  const clock = await page.evaluate(() => window.__derived.clock());
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__derived.clock()), clock);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  check(await page.evaluate(() => window.__run.getState().paused), "returning focus waits for an explicit resume");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  check(await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    try {
      document.dispatchEvent(new Event("visibilitychange"));
      return window.__run.getState().paused;
    } finally { delete document.hidden; }
  }), "a hidden tab pauses even without a blur event");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.evaluate(() => window.__settings.getState().setCaptions(true));
  await page.evaluate(() => {
    window.__run.setState({ satchel: ["healing"], lives: 1 });
    window.__run.getState().useItem(0);
  });
  const itemFeedback = await page.getByText(/^Potion of Healing\./).innerText();
  await page.getByText(itemFeedback, { exact: true }).waitFor();
  await page.evaluate(() => {
    window.__bus.emit("keeperKnelt");
    window.__bus.emit("deedEarned", { id: "throughwall" });
    window.__bus.emit("notice", "Pause preserves this discovery.");
  });
  await page.getByTestId("moment-kneel").waitFor();
  await page.waitForTimeout(650);
  await blur();
  const fade = await page.getByTestId("moment-kneel").evaluate(element => element.getAnimations()[0]?.currentTime);
  await page.waitForTimeout(5500);
  const heldMessages = await page.evaluate(() => {
    const moment = document.querySelector('[data-testid="moment-kneel"]');
    return {
      moment: !!moment,
      fade: moment?.getAnimations()[0]?.currentTime,
      caption: document.body.textContent.includes("The Keeper kneels"),
      deed: !!document.querySelector('[data-testid="deed-toast"]'),
      notice: document.querySelector('[data-testid="guidance"]')?.textContent.includes("Pause preserves this discovery."),
    };
  });
  check(heldMessages.moment && Math.abs(heldMessages.fade - fade) < 50,
    "a paused discovery banner retains its remaining lifetime and fade position");
  check(heldMessages.caption && heldMessages.deed && heldMessages.notice,
    "captions, deed cards and notices survive a pause longer than their display time");
  check(await page.getByText(itemFeedback, { exact: true }).count() === 1,
    "item feedback survives a pause longer than its display time");
  await page.evaluate(() => {
    // Observe the actual resume boundary. A Playwright round trip after
    // clicking can outlast the fraction of a second left on this banner.
    window.__momentOnResume = false;
    const off = window.__run.subscribe((run, previous) => {
      if (!previous.paused || run.paused) return;
      window.__momentOnResume = !!document.querySelector('[data-testid="moment-kneel"]');
      off();
    });
  });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  check(await page.evaluate(() => window.__momentOnResume),
    "the discovery banner is still available when play resumes");
  await page.waitForTimeout(800);
  check(await page.getByTestId("moment-kneel").count() === 0,
    "resuming spends only the banner's remaining time, without restarting it");
  await page.waitForFunction(() => !document.querySelector('[data-testid="deed-toast"]')
    && !document.body.textContent.includes("The Keeper kneels"));
  check(true, "captions and deeds expire normally after resuming");
  check(await page.getByText(itemFeedback, { exact: true }).count() === 0,
    "item feedback expires normally after resuming");
  await page.evaluate(() => window.__settings.getState().setCaptions(false));
  await page.evaluate(() => {
    window.__run.setState({ lastDamageAt: 1e9 });
    window.__bus.emit("puzzleOpen", { kind: "number", difficulty: "easy", roomId: window.__run.getState().currentRoomId });
  });
  await page.getByTestId("tome-ready").waitFor();
  check(await blur(), "focus loss also pauses an open tome");
  await page.evaluate(() => window.__run.getState().pause());
  await page.waitForTimeout(5500);
  check(await page.getByTestId("tome-ready").count() === 1, "paused memorization does not hide the sequence");
  const reachable = await page.getByRole("button", { name: "Resume", exact: true }).evaluate(button => {
    const box = button.getBoundingClientRect();
    const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return target === button || button.contains(target);
  });
  check(reachable, "the pause menu remains reachable above an open puzzle");
  // Keep the remaining regressions observable against the old layering too.
  if (reachable) await page.getByRole("button", { name: "Resume", exact: true }).click();
  else await page.evaluate(() => window.__run.getState().resume());
  if (await page.getByTestId("tome-ready").count()) await page.getByTestId("tome-ready").click();
  await page.getByTestId("keypad").waitFor();
  await blur();
  await page.evaluate(() => window.__run.getState().pause());
  const sheet = page.getByText("THE TOME OF NUMBERS", { exact: true }).locator("..");
  const before = await sheet.innerText();
  await page.keyboard.press("9");
  await page.waitForTimeout(1200);
  check(await sheet.innerText() === before, "a paused tome accepts no digits and spends no answering time");
  await page.keyboard.press("Escape");
  const resumed = await page.evaluate(() => !window.__run.getState().paused && window.__run.getState().inputLocks === 1);
  check(resumed && await page.getByTestId("keypad").count() === 1,
    "Escape resumes the paused puzzle without closing it");
  if (!resumed) await page.evaluate(() => window.__run.getState().resume());
  const sequence = await page.evaluate(() => window.__numberSequence);
  for (const digit of sequence) await page.keyboard.press(String(digit));
  await page.getByText("Correct. The tome yields a gem.", { exact: true }).waitFor();
  await blur();
  await page.waitForTimeout(2000);
  check(await page.evaluate(() => !window.__run.getState().cleared.includes(window.__run.getState().currentRoomId)),
    "a paused result screen waits to deliver its reward");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.waitForFunction(() => window.__run.getState().inputLocks === 0
    && window.__run.getState().cleared.includes(window.__run.getState().currentRoomId));
  check(true, "resuming delivers the earned reward and releases the puzzle lock");
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
