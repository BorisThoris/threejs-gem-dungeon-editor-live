import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { join } from "node:path";

const port = process.argv[2] ?? process.env.PORT ?? "5198";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  for (const [name, width, height, touch] of [["desktop", 1280, 800, false], ["phone", 844, 390, true], ["tablet", 1024, 768, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, screen: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ touchControls: "on" })));
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.locator('[data-testid="menu-start"]').click();
    await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
    await page.evaluate(() => {
      window.__run.getState().lockInput();
      window.__bus.emit("notice", "Bats stir overhead. Move clear of the roost.");
      window.__bus.emit("hint", "Collect gems for the toll, then find the stairs to descend.");
    });
    for (const scale of [1, 1.6]) {
      await page.evaluate(async (value) => {
        (await import("/src/game/state/settings.ts")).useSettings.getState().setUiScale(value);
        window.__run.setState({ floor: 2, satchel: [], thiefPhase: value === 1.6 ? "fleeing" : "away", thiefHolding: 2, thiefKey: true });
      }, scale);
      await page.waitForFunction(() => {
        const g = document.querySelector('[data-testid="guidance"]')?.getBoundingClientRect();
        const boxes = ["hud", "minimap", "touch-pause"].map((id) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect()).filter(Boolean);
        return g && g.left >= 0 && g.right <= innerWidth && boxes.every((b) => g.left >= b.right || g.right <= b.left || g.top >= b.bottom || g.bottom <= b.top);
      });
      assert.ok(await page.locator('[data-testid="guidance"]').evaluate((g) => g.scrollWidth <= g.clientWidth), "guidance text wraps inside its panel");
      assert.match(await page.getByTestId("hud-prepare").innerText(), /final stairs need a bomb/);
      console.log(`PASS ${name}: guidance clears HUD, minimap and pause at text scale ${scale}`);
      if (scale === 1 && process.env.OVERLAY_SCREENSHOTS) await page.screenshot({ path: join(process.env.OVERLAY_SCREENSHOTS, `overlay-${name}.png`) });
    }
    await page.setViewportSize({ width: width - 120, height });
    await page.waitForFunction(() => {
      const g = document.querySelector('[data-testid="guidance"]').getBoundingClientRect();
      const h = document.querySelector('[data-testid="hud"]').getBoundingClientRect();
      return g.right <= innerWidth && (g.left >= h.right || g.top >= h.bottom);
    });
    await page.evaluate(() => window.__bus.emit("keeperBars"));
    await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]').textContent.includes("save 2 extra gems for a shop bomb"));
    const keeperHelp = await page.getByTestId("guidance").innerText();
    assert.match(keeperHelp, /With the toll ready, set a bomb from your satchel/);
    assert.match(keeperHelp, /kneels for 9 seconds/);
    assert.ok(await page.getByTestId("guidance").evaluate((g) => g.scrollWidth <= g.clientWidth), "Keeper instructions wrap inside the guidance panel");
    console.log(`PASS ${name}: Keeper lesson explains bomb budget, satchel use, blast escape and stairs window`);
    await page.evaluate(() => window.__run.getState().wakeReaper());
    await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]').textContent.includes("Sprint with RUN to the stairs"));
    const reaperHelp = await page.getByTestId("guidance").innerText();
    assert.match(reaperHelp, /Shoves cannot stop it/);
    assert.match(reaperHelp, /keep moving while its fuse burns/);
    console.log(`PASS ${name}: Reaper warning explains running, shove immunity and moving during a bomb fuse`);
    if (name === "desktop") {
      await page.evaluate(async () => {
        const settings = (await import("/src/game/state/settings.ts")).useSettings.getState();
        settings.setTouchControls("off");
        settings.bind("shove", "KeyQ");
        settings.bind("lantern", "KeyL");
        settings.bind("sprint", "KeyR");
        window.__bus.emit("wardenEntered", { roomId: window.__run.getState().currentRoomId });
      });
      await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]').textContent.includes("Left click / Q / RT briefly staggers"));
      await page.evaluate(() => window.__bus.emit("harrierWoke"));
      await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]').textContent.includes("Left click / Q / RT to drive it off"));
      await page.evaluate(() => window.__bus.emit("lanternToggled", { raised: true }));
      await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]').textContent.includes("L puts it down"));
      await page.evaluate(() => {
        window.__run.setState({ reaperAwake: false });
        window.__run.getState().wakeReaper();
      });
      await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]').textContent.includes("Sprint with R or L3 to the stairs"));
      await page.evaluate(async () => {
        (await import("/src/game/state/settings.ts")).useSettings.getState().setTouchControls("on");
        window.__bus.emit("thiefCame", { roomId: window.__run.getState().currentRoomId });
      });
      await page.waitForFunction(() => document.querySelector('[data-testid="guidance"]').textContent.includes("use SHOVE when close"));
      console.log("PASS live encounter lessons use rebound keyboard controls and switch to touch guidance");
      await page.evaluate(async () => {
        const settings = (await import("/src/game/state/settings.ts")).useSettings.getState();
        settings.setTouchControls("off");
        settings.bind("forward", "KeyI");
        settings.bind("interact", "KeyU");
        settings.bind("slot1", "Digit7");
        window.__run.getState().quitToMenu();
      });
      await page.getByRole("button", { name: "Controls", exact: true }).click();
      const help = page.getByTestId("controls-help");
      assert.match(await help.innerText(), /Forward: I/);
      assert.match(await help.innerText(), /U at a door/);
      assert.match(await help.innerText(), /Left click, Q, or RT charges and shoves/);
      assert.match(await help.innerText(), /Slots 1–4: 7;/);
      assert.match(await help.innerText(), /L, or click the right stick/);
      await page.evaluate(async () => {
        (await import("/src/game/state/settings.ts")).useSettings.getState().bind("shove", "KeyZ");
      });
      await page.waitForFunction(() => document.querySelector('[data-testid="controls-help"]').textContent.includes("Left click, Z, or RT charges and shoves"));
      console.log("PASS controls menu shows rebound movement, use, shove, satchel and lantern keys and updates live");
    }
    assert.deepEqual(errors, [], "layout has no runtime errors");
    await context.close();
  }
} finally { await browser.close(); }
