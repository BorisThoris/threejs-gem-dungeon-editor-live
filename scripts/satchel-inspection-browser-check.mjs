import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox", "--mute-audio"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && !window.__run.getState().transitioning);
  await page.evaluate(() => {
    const run = window.__run;
    run.setState({ satchel: ["healing", "mapping", "mire", "bomb"], identified: ["healing", "mapping"],
      charges: { ...run.getState().charges, healing: "blessed", mapping: "cursed", mire: "cursed", bomb: "plain" } });
  });
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-menu").waitFor();
  const pausedClock = await page.evaluate(() => window.__derived.clock());
  assert.equal(await page.getByTestId("pause-satchel").count(), 1,
    "a paused player can review carried items before spending them");
  await page.getByTestId("pause-satchel").click();
  const row = i => page.getByTestId(`inspect-slot-${i}`);
  await row(0).click();
  assert.match(await row(0).innerText(), /blessed.*Potion of Healing/s);
  assert.match(await row(0).innerText(), /Restores up to 2 lives/);
  await row(1).click();
  assert.match(await row(1).innerText(), /cursed.*Scroll of Mapping/s);
  assert.match(await row(1).innerText(), /lantern goes out.*brazier/s);
  await row(2).click();
  assert.match(await row(2).innerText(), /cursed/);
  assert.match(await row(2).innerText(), /still unknown/);
  assert.doesNotMatch(await row(2).innerText(), /Mire|fifth|containers/, "inspection cannot identify a hidden kind for free");
  await row(3).click();
  assert.match(await row(3).innerText(), /cracked walls/, "a bomb's visible identity needs no discovery");
  await page.keyboard.press("1");
  assert.deepEqual(await page.evaluate(() => ({ satchel: window.__run.getState().satchel,
    known: window.__run.getState().identified, paused: window.__run.getState().paused })),
  { satchel: ["healing", "mapping", "mire", "bomb"], known: ["healing", "mapping"], paused: true });
  assert.equal(await page.evaluate(() => window.__derived.clock()), pausedClock, "inspection does not spend run time");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => (await import("/src/game/state/settings.ts")).useSettings.getState().setUiScale(1.6));
  await row(1).click();
  const fit = await row(1).evaluate(el => {
    const b = el.getBoundingClientRect();
    return b.left >= 0 && b.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1;
  });
  assert.ok(fit, "charged effects fit at maximum phone text size");
  if (process.env.SATCHEL_REVIEW === "1") await page.screenshot({ path: "output/verification/satchel-inspection-phone.png" });
  await page.getByTestId("pause-resume").click();
  await page.keyboard.press("1");
  await page.waitForFunction(() => window.__run.getState().satchel.length === 3);
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-satchel").click();
  assert.match(await row(0).innerText(), /Mapping/, "inspection follows the real slot after consumption");
  assert.equal(await page.getByTestId("inspect-slot-3").count(), 0);
  await page.getByTestId("pause-satchel").click();
  await page.evaluate(() => {
    const pad = { id: "Inspection check", index: 0, connected: true, mapping: "standard", timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    navigator.getGamepads = () => [pad];
    window.__inspectionPad = pad;
  });
  const press = async index => {
    await page.evaluate(index => { window.__inspectionPad.buttons[index] = { pressed: true, touched: true, value: 1 }; }, index);
    await page.waitForTimeout(100);
    await page.evaluate(index => { window.__inspectionPad.buttons[index] = { pressed: false, touched: false, value: 0 }; }, index);
    await page.waitForTimeout(100);
  };
  await page.getByTestId("pause-resume").focus();
  for (let step = 0; step < 4; step++) {
    if (await page.getByTestId("pause-satchel").evaluate(el => el === document.activeElement)) break;
    await press(13);
  }
  assert.ok(await page.getByTestId("pause-satchel").evaluate(el => el === document.activeElement));
  await press(0);
  await row(0).waitFor();
  await press(13);
  assert.ok(await row(0).evaluate(el => el === document.activeElement));
  await press(0);
  assert.match(await row(0).innerText(), /brazier/, "d-pad and A open the learned effect at phone text size");
  await press(1);
  await page.getByTestId("pause-menu").waitFor({ state: "detached" });
  await page.evaluate(() => {
    window.__run.setState({ satchel: ["healing", "mapping", "mire", "snare", "bomb", "wardstone"],
      identified: ["healing", "mapping"], paused: false });
  });
  assert.equal(await page.evaluate(() => window.__run.getState().swapItems(4, 0)), false,
    "combat cannot silently rearrange the belt");
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-satchel").click();
  await row(4).click();
  const beforeSwap = await page.evaluate(() => ({ items: window.__run.getState().satchel,
    known: window.__run.getState().identified, clock: window.__derived.clock() }));
  await page.getByTestId("inventory-to-0").click();
  const afterSwap = await page.evaluate(() => ({ items: window.__run.getState().satchel,
    known: window.__run.getState().identified, clock: window.__derived.clock() }));
  assert.deepEqual(afterSwap.items, ["bomb", "mapping", "mire", "snare", "healing", "wardstone"]);
  assert.deepEqual([...afterSwap.items].sort(), [...beforeSwap.items].sort(), "all loot survives exchange");
  assert.deepEqual(afterSwap.known, beforeSwap.known, "moving loot grants no identification");
  assert.equal(afterSwap.clock, beforeSwap.clock);
  for (const [from, to] of [[-1, 0], [6, 0], [1.5, 0], [0, 99], [0, 0]]) {
    assert.equal(await page.evaluate(([from, to]) => window.__run.getState().swapItems(from, to), [from, to]), false);
  }
  assert.deepEqual(await page.evaluate(() => window.__run.getState().satchel), afterSwap.items);
  await page.getByTestId("pause-resume").click();
  await page.keyboard.press("1");
  await page.waitForFunction(() => window.__run.getState().placed.some(p => p.id === "bomb"));
  assert.deepEqual(await page.evaluate(() => window.__run.getState().satchel), afterSwap.items.slice(1),
    "the promoted item is usable through the existing belt key");
  assert.deepEqual(errors, []);
  console.log("PASS known effects, charge costs, unknown privacy, paused input/clock, phone layout, changed inventory and controller inspection");
} finally { await browser.close(); }
