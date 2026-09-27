import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const failures = [];
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(detail)}`);
  if (!ok) failures.push(label);
};
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ touchControls: "on", captions: true, uiScale: 1.6 })));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").tap();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  await page.waitForTimeout(500);
  // A landscape readout can keep the same allotted rectangle while its text
  // grows. Scrolling must follow the content, not just the panel's border box.
  const keeperNotice = await page.evaluate(async () => {
    (await import("/src/game/state/settings.ts")).useSettings.getState().setUiScale(1);
    window.__run.getState().lockInput();
    window.__bus.emit("hint", null);
    let notice;
    const off = window.__bus.on("notice", text => { notice = text; });
    window.__bus.emit("keeperBars");
    off();
    return notice;
  });
  await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]')?.textContent.includes("Shoves cannot move the Keeper"));
  const originalGuidanceStyle = await page.getByTestId("guidance").evaluate(g => {
    const previous = g.style.cssText;
    Object.assign(g.style, { width: "340px", height: "150px", minHeight: "0", flex: "none" });
    return previous;
  });
  await page.waitForFunction(() => {
    const g = document.querySelector('[data-testid="guidance"]');
    return g.scrollHeight <= g.clientHeight + 1 && getComputedStyle(g).pointerEvents === "none";
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const smallBox = await page.getByTestId("guidance").evaluate(g => [g.clientWidth, g.clientHeight]);
  await page.evaluate(async () => (await import("/src/game/state/settings.ts")).useSettings.getState().setUiScale(1.6));
  await page.waitForFunction(() => {
    const g = document.querySelector('[data-testid="guidance"]');
    return g.scrollHeight > g.clientHeight + 1;
  });
  assert.deepEqual(await page.getByTestId("guidance").evaluate(g => [g.clientWidth, g.clientHeight]), smallBox);
  await page.waitForFunction(() => {
    const g = document.querySelector('[data-testid="guidance"]');
    return g.tabIndex === 0 && getComputedStyle(g).pointerEvents === "auto";
  }, null, { timeout: 5000 });
  await page.getByTestId("guidance").focus();
  await page.keyboard.press("End");
  await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]').scrollTop > 0);
  await page.evaluate(async () => (await import("/src/game/state/settings.ts")).useSettings.getState().setUiScale(1));
  await page.waitForFunction(() => {
    const g = document.querySelector('[data-testid="guidance"]');
    return g.scrollHeight <= g.clientHeight + 1 && g.tabIndex === -1 && getComputedStyle(g).pointerEvents === "none";
  });
  await page.getByTestId("guidance").evaluate((g, previous) => { g.blur(); g.style.cssText = previous; }, originalGuidanceStyle);
  await page.evaluate(async () => {
    (await import("/src/game/state/settings.ts")).useSettings.getState().setUiScale(1.6);
    window.__run.getState().unlockInput();
  });
  check(true, "enlarging text enables real scrolling without resizing the panel", null);
  const captionText = await page.evaluate(async () => {
    const { LEDGER_LESSONS } = await import("/src/game/ledger/lessons.ts");
    const longest = LEDGER_LESSONS.reduce((a, b) => a.entry.length > b.entry.length ? a : b);
    window.__bus.emit("lessonLearned", { id: longest.id });
    return longest.entry;
  });
  const caption = page.getByTestId("caption");
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-testid="caption"]');
    return c && c.scrollHeight > c.clientHeight && c.tabIndex === 0;
  });
  await caption.focus();
  const before = await page.evaluate(() => ({ x: window.__playerDebug.x, z: window.__playerDebug.z, ready: window.__run.getState().shoveReadyAt }));
  await caption.click();
  await page.waitForTimeout(400);
  check(await page.evaluate(() => window.__run.getState().shoveReadyAt) === before.ready,
    "clicking a scrollable caption does not shove", null);
  await page.keyboard.press("Space");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(400);
  await page.keyboard.up("KeyW");
  const after = await page.evaluate(() => ({ x: window.__playerDebug.x, z: window.__playerDebug.z, ready: window.__run.getState().shoveReadyAt }));
  check(after.ready === before.ready && Math.hypot(after.x - before.x, after.z - before.z) < 0.1,
    "reading a focused caption cannot shove or move the player", { before, after });
  await page.keyboard.press("End");
  check(await caption.evaluate(c => c.scrollTop > 0), "the focused caption still accepts scrolling", null);
  await page.waitForTimeout(2800);
  check(await caption.count() === 1 && await caption.innerText().catch(() => "") === captionText,
    "a caption stays available while the player is reading it", null);
  if (await caption.count()) await caption.evaluate(c => c.blur());
  await page.waitForFunction(() => !document.querySelector('[data-testid="caption"]'));
  const guidance = page.getByTestId("guidance");
  // Supply enough real status rows to exercise the scrollable HUD consistently.
  await page.evaluate(() => window.__run.setState({ floor: 2, thiefPhase: "fleeing", thiefHolding: 2, thiefKey: true }));
  await page.waitForFunction(() => document.querySelector('[data-testid="hud"]').tabIndex === 0);
  for (const id of ["guidance", "hud"]) {
    await page.getByTestId(id).focus();
    assert.ok(await page.getByTestId(id).evaluate(el => document.activeElement === el), `${id} receives reading focus`);
    await page.keyboard.press("Space");
    await page.waitForTimeout(400);
    check(await page.evaluate(() => window.__run.getState().shoveReadyAt) === before.ready,
      `reading ${id} cannot trigger a shove`, null);
  }
  assert.ok(keeperNotice?.includes("Shoves cannot move the Keeper"));
  await page.evaluate(notice => window.__bus.emit("notice", notice), keeperNotice);
  await guidance.click();
  assert.ok(await guidance.evaluate(el => document.activeElement === el), "pointer reading focuses guidance");
  await page.keyboard.press("End");
  await page.waitForTimeout(7000);
  check((await guidance.innerText()).includes(keeperNotice),
    "the Keeper instructions remain available while the player reads them", null);
  await guidance.evaluate(g => g.blur());
  await page.waitForFunction(notice => !document.querySelector('[data-testid="guidance"]').textContent.includes(notice), keeperNotice);
  check(true, "expired guidance clears when reading ends", null);
  await guidance.focus();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__run.getState().paused);
  check(true, "Escape still opens pause from a readout", null);
  check(errors.length === 0, "no uncaught browser errors", errors);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
