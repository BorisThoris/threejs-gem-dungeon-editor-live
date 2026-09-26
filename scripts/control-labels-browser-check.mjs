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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByRole("button", { name: "Controls", exact: true }).click();
  const helpRow = (id, label) => page.getByTestId(id).locator("dt").filter({ hasText: new RegExp(`^${label}$`) }).evaluate(term => term.nextElementSibling.textContent);
  check(/^Hold /.test(await helpRow("controls-help", "Run")), "hold mode explains held keyboard sprint");
  await page.getByTestId("opt-sprint").click();
  check(/press .*again to walk/i.test(await helpRow("controls-help", "Run")), "press mode explains how to start and stop sprinting");
  check(/hold L3/i.test(await helpRow("controls-help", "Run")), "controller sprint remains a hold in keyboard press mode");
  for (const touch of [false, true]) {
    await page.evaluate(on => window.__settings.getState().setTouchControls(on ? "on" : "off"), touch);
    const id = touch ? "controls-touch" : "controls-help";
    await page.getByTestId(id).waitFor();
    const lantern = await helpRow(id, "Lantern");
    const bar = await helpRow(id, "Bar a door");
    check(/band/i.test(lantern) && /shop/i.test(lantern) && /enter.*room/i.test(lantern)
      && !/braziers fill/i.test(lantern), `${touch ? "touch" : "keyboard"} help explains the lantern cycle and room-based oil cost`);
    check(/recover.*kit/i.test(bar) && /tear/i.test(bar) && !/forty-five|45/.test(bar),
      `${touch ? "touch" : "keyboard"} help explains reusable barricades without an expiry timer`);
    await page.evaluate(() => window.__settings.getState().setUiScale(1.6));
    for (const [width, height] of [[320, 640], [390, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      const overflow = await page.getByTestId(id).evaluate(list => {
        const box = list.getBoundingClientRect();
        return [...list.children].filter(child => {
          const bounds = child.getBoundingClientRect();
          return bounds.left < box.left - 1 || bounds.right > box.right + 1
            || bounds.left < 0 || bounds.right > innerWidth
            || child.scrollWidth > child.clientWidth + 1;
        }).map(child => child.textContent);
      });
      check(overflow.length === 0, `${touch ? "touch" : "keyboard"} control instructions fit ${width}×${height} at maximum text size: ${overflow.length} overflowing rows`);
      if (width <= 390) {
        check(await page.getByTestId(id).evaluate(list => [...list.querySelectorAll("dd")].every(description => {
          const term = description.previousElementSibling.getBoundingClientRect();
          const box = description.getBoundingClientRect();
          return box.width >= list.clientWidth * 0.9 && box.top >= term.bottom;
        })), "narrow-screen instructions use the available width below their labels");
      }
      await page.getByTestId("controls-back").scrollIntoViewIfNeeded();
      check(await page.getByTestId("controls-back").evaluate(button => {
        const r = button.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight
          && button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }), "the Controls Back button remains visible and reachable");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId(id).locator("dt").first().scrollIntoViewIfNeeded();
    mkdirSync("output/playwright", { recursive: true });
    await page.screenshot({ path: `output/playwright/controls-${touch ? "touch" : "keyboard"}.png` });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => window.__settings.getState().setUiScale(1));
  }
  await page.evaluate(() => {
    window.__settings.getState().setTouchControls("off");
    window.__settings.getState().setToggleSprint(false);
  });
  await page.getByTestId("controls-back").click();
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing"
    && !window.__run.getState().transitioning && window.__layout);
  const door = await page.evaluate(() => {
    const s = window.__run.getState();
    window.__run.setState({ lastDamageAt: 1e9 });
    const room = s.dungeon.rooms.find(room => room.id === s.currentRoomId);
    const dir = Object.keys(room.links).find(dir => room.links[dir] !== s.dungeon.endId && room.links[dir] !== s.dungeon.vaultId);
    const [x, , z] = window.__layout.doorPosition(room, dir);
    window.__bus.emit("teleport", { position: [x - Math.sign(x) * 0.8, 1.5, z - Math.sign(z) * 0.8] });
    return { from: room.id, to: room.links[dir] };
  });
  await page.waitForFunction(() => /open/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  await page.evaluate(() => window.__settings.getState().bind("interact", "KeyU"));
  check(await page.getByTestId("prompt-key").innerText() === "U", "the live interaction prompt follows a rebound Use key");
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(150);
  check(await page.evaluate(from => window.__run.getState().currentRoomId === from, door.from), "the former Use key no longer opens the door");
  await page.keyboard.press("KeyU");
  await page.waitForFunction(to => window.__run.getState().currentRoomId === to && !window.__run.getState().transitioning, door.to);
  check(true, "the rebound Use key opens the offered door");
  await page.evaluate(() => {
    window.__run.getState().takeItem("swiftness");
    window.__settings.getState().bind("slot1", "Digit7");
  });
  check(/^7\s/.test(await page.getByTestId("satchel-0").innerText()), "the satchel advertises its rebound item key");
  await page.evaluate(() => {
    window.__settings.getState().setTouchControls("on");
    window.__run.getState().lockInput();
  });
  await page.waitForFunction(() => !document.querySelector('[data-testid="prompt"]'));
  await page.evaluate(() => {
    window.__bus.emit("prompt", { text: "The Keeper holds the stairs. A blast would make it kneel.", enabled: false });
  });
  check(await page.getByTestId("prompt-key").innerText() === "USE" && /^1\s/.test(await page.getByTestId("satchel-0").innerText()),
    "touch controls keep USE and the tappable slot number");
  await page.evaluate(() => {
    window.__settings.getState().setTouchControls("off");
    window.__settings.getState().bind("interact", "NumpadSubtract");
    window.__settings.getState().setUiScale(1.6);
  });
  for (const [width, height] of [[320, 640], [844, 390], [1280, 800]]) {
    check(await page.getByTestId("prompt-key").innerText() === "Num Subtract", "the long key label is actually displayed");
    await page.setViewportSize({ width, height });
    const fits = await page.getByTestId("prompt").evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
        && [element, ...element.children].every(child => child.scrollWidth <= child.clientWidth + 1);
    });
    check(fits, `long key labels and blocked reasons fit ${width}×${height} at maximum text size`);
  }
  mkdirSync("output/playwright", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "output/playwright/control-labels.png" });
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
