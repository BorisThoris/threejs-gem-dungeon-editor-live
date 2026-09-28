import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() => {
    localStorage.setItem("gem-dungeon.ledger", JSON.stringify(["bark"]));
    localStorage.setItem("gem-dungeon.lore", JSON.stringify([1]));
  });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const discovered = await page.evaluate(async () => {
    const { useLedger } = await import("/src/game/state/ledger.ts");
    const { useLore } = await import("/src/game/state/lore.ts");
    const { ledgerLessonBy } = await import("/src/game/ledger/lessons.ts");
    const { FRAGMENTS } = await import("/src/game/deepworks/fragments.ts");
    // Exercise the stores used by actual observation and reading. Repeated and
    // previously known entries must not become new discoveries in the summary.
    useLedger.getState().learn("bark");
    useLedger.getState().learn("draft");
    useLedger.getState().learn("draft");
    useLore.getState().markRead(1);
    useLore.getState().markRead(2);
    useLore.getState().markRead(2);
    window.__run.setState({ lives: 1, lastDamageAt: -Infinity });
    window.__run.getState().damage("spikes");
    return { lesson: ledgerLessonBy("draft"), oldLesson: ledgerLessonBy("bark"), fragment: FRAGMENTS.find(f => f.id === 2) };
  });
  const toggle = page.getByTestId("summary-discoveries-toggle");
  await toggle.waitFor({ timeout: 5000 });
  assert.match(await toggle.innerText(), /1 lesson.*1 inscription/);
  assert.equal(await toggle.getAttribute("aria-expanded"), "false", "review starts compact so replay stays easy to find");
  await toggle.focus();
  await page.keyboard.press("Space");
  const review = page.getByTestId("summary-discoveries");
  await review.waitFor();
  const text = await review.innerText();
  assert.ok(text.includes(discovered.lesson.entry) && text.includes(discovered.lesson.pays), "recorded lesson and its existing benefit are readable");
  assert.ok(text.includes(discovered.fragment.text), "the actual new inscription can be reread");
  assert.ok(!text.includes(discovered.oldLesson.entry), "earlier knowledge is not presented as newly discovered");
  assert.match(text, /kept.*next run/i, "a loss explains that this knowledge survives");
  await page.screenshot({ path: "output/verification/run-discoveries-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => (await import("/src/game/state/settings.ts")).useSettings.getState().setUiScale(1.6));
  await review.scrollIntoViewIfNeeded();
  assert.ok(await review.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && element.scrollWidth <= element.clientWidth + 1;
  }), "knowledge wraps within a phone at maximum text scale");
  await page.screenshot({ path: "output/verification/run-discoveries-phone.png" });
  await toggle.click();
  assert.equal(await review.count(), 0, "the review can be closed without starting another run");
  // The shared menu reader must reach each text block, including below the
  // fold on a phone. This uses the game's controller mapping, not OS input.
  await page.evaluate(() => {
    window.__reviewPad = { id: "Discovery review test", index: 0, connected: true, mapping: "standard", timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    navigator.getGamepads = () => [window.__reviewPad, null, null, null];
  });
  const tapPad = index => page.evaluate(async index => {
    const frames = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => requestAnimationFrame(resolve)); };
    window.__reviewPad.buttons[index] = { pressed: true, touched: true, value: 1 };
    await frames();
    window.__reviewPad.buttons[index] = { pressed: false, touched: false, value: 0 };
    await frames();
  }, index);
  await toggle.focus();
  await tapPad(0);
  await review.waitFor();
  await tapPad(13);
  assert.ok(await page.evaluate(entry => document.activeElement?.textContent.includes(entry), discovered.lesson.entry),
    "controller can focus and scroll to the recorded lesson");
  await tapPad(13);
  assert.ok(await page.evaluate(entry => {
    const element = document.activeElement, box = element.getBoundingClientRect();
    return element.textContent.includes(entry) && box.top >= 0 && box.bottom <= innerHeight;
  }, discovered.fragment.text), "controller brings the inscription fully into view");
  await toggle.click();
  await page.evaluate(() => { window.__reviewPad.connected = false; });
  await page.getByTestId("summary-same-seed").click();
  await page.waitForFunction(() => window.__run.getState().phase === "playing" && !window.__run.getState().transitioning);
  const retained = await page.evaluate(async () => {
    const { useLedger } = await import("/src/game/state/ledger.ts");
    const { useLore } = await import("/src/game/state/lore.ts");
    return { learned: useLedger.getState().learned, read: useLore.getState().read,
      newLessons: useLedger.getState().learnedThisRun, newReadings: useLore.getState().readThisRun };
  });
  assert.ok(retained.learned.includes("draft") && retained.read.includes(2), "replay keeps the discovered knowledge");
  assert.deepEqual(retained.newLessons, []);
  assert.deepEqual(retained.newReadings, []);
  await page.evaluate(() => {
    window.__run.setState({ lives: 1, lastDamageAt: -Infinity });
    window.__run.getState().damage("spikes");
  });
  await page.getByTestId("summary-same-seed").waitFor();
  assert.equal(await toggle.count(), 0, "a run with no new knowledge has no empty review or stale discoveries");
  await page.getByTestId("summary-again").click();
  await page.waitForFunction(() => window.__run.getState().phase === "playing" && !window.__run.getState().transitioning);
  await page.evaluate(async () => {
    const { useLore } = await import("/src/game/state/lore.ts");
    useLore.getState().markRead(3);
    window.__run.setState({ phase: "won" });
  });
  await toggle.waitFor();
  assert.match(await toggle.innerText(), /1 inscription/);
  assert.ok(!(await toggle.innerText()).includes("lesson"), "an inscription-only expedition needs no empty lesson count");
  await toggle.click();
  assert.equal(await page.getByTestId("summary-cause").count(), 0);
  assert.match(await review.innerText(), /kept.*next run/i, "escaped expeditions retain the same knowledge review");
  assert.deepEqual(errors, []);
  console.log("PASS discovery review, duplicate/old knowledge, keyboard/controller, phone layout, loss, escape and both replays");
} finally { await browser.close(); }
