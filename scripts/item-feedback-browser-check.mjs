import assert from "node:assert/strict";
import { join } from "node:path";
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
  for (const [name, width, height, touch, scale] of [["desktop", 1280, 800, false, 1], ["phone", 844, 390, true, 1.6]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.addInitScript(({ touch, scale }) => localStorage.setItem("gem-dungeon.settings", JSON.stringify({
      touchControls: touch ? "on" : "off", uiScale: scale,
    })), { touch, scale });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.getByTestId("menu-start").click();
    await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
    // An exhausted lantern has already been carried lit. Let its first-use
    // wisp lesson run before testing the later out-of-oil instruction.
    await page.evaluate(() => window.__run.getState().toggleLantern());
    await page.waitForFunction(() => window.__run.getState().wispOut);
    await page.evaluate(async () => {
      const { GLIM_MAX } = await import("/src/game/lantern/glim.ts");
      window.__run.setState({ glim: GLIM_MAX, glimUpAt: 0, oil: 0.01 });
      window.__run.getState().burnOilEntering(false);
    });
    const dryHelp = await page.getByTestId("guidance").innerText();
    check(/shop/i.test(dryHelp) && !/brazier/i.test(dryHelp), `${name}: an empty lantern directs the player to shop oil`);
    for (const lowOil of [true, false]) {
      await page.evaluate(async low => {
        const { GLIM_MAX, RAISE_OIL } = await import("/src/game/lantern/glim.ts");
        window.__settings.getState().bind("lantern", "KeyL");
        window.__run.setState({ glim: GLIM_MAX, glimUpAt: 0, oil: RAISE_OIL - (low ? 0.1 : 0) });
        window.__run.getState().snuffLantern();
      }, lowOil);
      const help = await page.getByTestId("guidance").innerText();
      check(lowOil ? /shop/i.test(help) : (touch ? /LAMP/.test(help) : /\bL\b/.test(help)) && !/shop|brazier/i.test(help),
        `${name}: a snuffed lantern ${lowOil ? "without enough oil suggests a refill" : "with enough oil explains the current relight control"}`);
      if (!lowOil) {
        check(await page.evaluate(() => {
          window.__run.getState().toggleLantern();
          return window.__run.getState().glim > 0;
        }), `${name}: the advertised relight action succeeds at exactly the oil cost`);
        check(await page.waitForFunction(() => window.__derived.lantern().lit
          && window.__lantern?.intensity > 0, null, { timeout: 3000 }).then(() => true, () => false),
        `${name}: the last measure of oil lights the current room in the scene`);
        check(await page.evaluate(() => {
          window.__run.getState().burnOilEntering(false);
          return window.__run.getState().oil === 0 && window.__run.getState().glim === 0;
        }), `${name}: spending the last oil to relight does not grant free light in later rooms`);
        check(await page.waitForFunction(() => !window.__derived.lantern().lit
          && window.__lantern?.intensity === 0, null, { timeout: 3000 }).then(() => true, () => false),
        `${name}: entering the next room extinguishes the scene light`);
      }
    }
    for (const id of ["mire", "gloom", "dread"]) {
      const expected = await page.evaluate(async id => {
        const { ITEMS } = await import("/src/game/items/catalog.ts");
        const { afflictionFor } = await import("/src/game/items/afflictions.ts");
        window.__run.getState().resume();
        window.__run.setState({ satchel: [id], lastDamageAt: Infinity,
          charges: { ...window.__run.getState().charges, [id]: "plain" } });
        window.__run.getState().useItem(0);
        window.__run.getState().pause();
        const run = window.__run.getState();
        const bite = afflictionFor(id);
        return {
          description: `${ITEMS[id].name}. ${bite.lands} ${bite.edge} ${bite.cure}`,
          cure: bite.cure,
          applied: !run.satchel.includes(id) && run.identified.includes(id)
            && (id === "dread" ? !!run.wardenLure && run.wardenLure !== run.currentRoomId
              : run.effects[id] > window.__derived.clock() && (id !== "gloom" || run.glim === 0)),
        };
      }, id);
      await page.getByRole("button", { name: "Resume", exact: true }).waitFor();
      check(expected.applied, `${name}: ${id} applies through the real item action`);
      const description = page.getByText(expected.description, { exact: true });
      const shown = await description.count() === 1;
      check(shown && (await page.getByTestId("guidance").innerText()).includes(expected.cure),
        `${name}: ${id} shows its effect, useful side and cure together`);
      if (shown) {
        check(await description.evaluate(element => {
          const box = element.getBoundingClientRect();
          return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
            && element.scrollWidth <= element.clientWidth;
        }), `${name}: ${id} explanation fits at text scale ${scale}`);
        if (process.env.ITEM_FEEDBACK_SCREENSHOTS) {
          await page.getByRole("button", { name: "Resume", exact: true }).click();
          await page.screenshot({ path: join(process.env.ITEM_FEEDBACK_SCREENSHOTS, `${name}-${id}.png`) });
        }
      }
      if (id === "gloom") {
        // Repeat the same event after the item's own notice, so the teacher's
        // recovery advice is checked independently of the item-use feedback.
        await page.evaluate(() => window.__bus.emit("lanternOut"));
        check((await page.getByTestId("guidance").innerText()).includes(expected.cure),
          `${name}: Gloom points to its firelight cure even with an empty flask`);
        const blocked = await page.evaluate(() => {
          const run = window.__run.getState();
          run.resume();
          const oil = run.oil;
          run.toggleLantern();
          run.pause();
          return window.__run.getState().glim === 0 && window.__run.getState().oil === oil;
        });
        check(blocked && (await page.getByTestId("guidance").innerText()).includes(expected.cure),
          `${name}: a refused relight repeats the cure without spending oil`);
      }
    }
    for (const charge of ["plain", "blessed", "cursed"]) {
      const result = await page.evaluate(async charge => {
        const { GLIM_MAX } = await import("/src/game/lantern/glim.ts");
        const { mapIsDark, veinsShowing } = await import("/src/game/state/run.ts");
        const { afflictionFor, afflictionBlurb } = await import("/src/game/items/afflictions.ts");
        window.__run.getState().resume();
        window.__run.setState({ satchel: ["mapping"], mapped: false, oil: 60,
          glim: GLIM_MAX, glimUpAt: 0, effects: { swift: 0, mire: 0, gloom: 0 },
          charges: { ...window.__run.getState().charges, mapping: charge } });
        window.__run.getState().useItem(0);
        window.__run.getState().pause();
        const run = window.__run.getState();
        return { mapped: run.mapped, spent: !run.satchel.includes("mapping"),
          dark: mapIsDark(run), veins: veinsShowing(run), glim: run.glim,
          cure: afflictionFor("gloom").cure, gloomText: afflictionBlurb("gloom") };
      }, charge);
      check(result.mapped && result.spent, `${name}: ${charge} Mapping still reveals the floor`);
      if (charge === "cursed") {
        const description = page.getByText("Scroll of Mapping. ", { exact: false });
        check((await description.innerText()).includes(result.gloomText),
          `${name}: cursed Mapping describes its darkness, useful side and cure`);
        check(await description.evaluate(element => {
          const box = element.getBoundingClientRect();
          return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
            && element.scrollWidth <= element.clientWidth;
        }), `${name}: cursed Mapping feedback fits at text scale ${scale}`);
        check(result.dark && result.veins && result.glim === 0,
          `${name}: cursed Mapping applies Gloom's darkness bargain`);
        check(await page.waitForFunction(() => window.__lantern?.intensity === 0,
          null, { timeout: 3000 }).then(() => true, () => false),
        `${name}: cursed Mapping extinguishes the rendered lantern`);
        check((await page.getByTestId("guidance").innerText()).includes(result.cure),
          `${name}: cursed Mapping explains the firelight cure`);
        check(await page.evaluate(() => {
          const run = window.__run.getState();
          run.resume();
          run.clearGloom();
          run.toggleLantern();
          run.pause();
          const after = window.__run.getState();
          return after.effects.gloom === 0 && after.glim > 0 && after.mapped;
        }), `${name}: curing cursed Mapping allows relighting and keeps the revealed floor`);
      } else {
        check(!result.dark && !result.veins && result.glim > 0,
          `${name}: ${charge} Mapping leaves the lantern and visibility intact`);
      }
    }
    for (const id of ["avarice", "healing"]) for (const charge of ["plain", "blessed", "cursed"]) {
      const result = await page.evaluate(async ({ id, charge }) => {
        const { ITEMS } = await import("/src/game/items/catalog.ts");
        window.__run.getState().resume();
        window.__run.setState({ satchel: [id], lives: 1, maxLives: 3, gems: 0,
          charges: { ...window.__run.getState().charges, [id]: charge } });
        window.__run.getState().useItem(0);
        window.__run.getState().pause();
        const after = window.__run.getState();
        const amount = id === "avarice" ? after.gems : after.lives - 1;
        return { name: ITEMS[id].name, amount,
          unit: id === "avarice" ? (amount === 1 ? "gem" : "gems") : (amount === 1 ? "life" : "lives") };
      }, { id, charge });
      const feedback = await page.getByText(`${result.name}. `, { exact: false }).innerText();
      const counts = [String(result.amount), ["zero", "one", "two", "three"][result.amount],
        result.amount === 1 ? "a" : null].filter(Boolean).join("|");
      check(new RegExp(`\\b(?:${counts}) ${result.unit}\\b`, "i").test(feedback),
        `${name}: ${charge} ${id} feedback agrees with the actual reward`);
      if (id === "healing" && charge === "cursed") check(/floor hears/i.test(feedback),
        `${name}: cursed Healing explains its noise cost`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
