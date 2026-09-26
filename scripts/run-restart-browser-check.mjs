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
  await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ captions: true })));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByTestId("menu-start").click();
  for (const button of ["summary-same-seed", "summary-again"]) {
    await page.waitForFunction(() => window.__run?.getState().phase === "playing"
      && !window.__run.getState().transitioning);
    const seed = await page.evaluate(() => {
      // End a run while its most recent discoveries are still on screen.
      window.__bus.emit("floorDescended", { floor: 2 });
      window.__bus.emit("deedEarned", { id: "throughwall" });
      window.__run.setState({ lives: 1, lastDamageAt: -Infinity });
      window.__run.getState().damage();
      return window.__run.getState().runSeed;
    });
    await page.getByTestId(button).waitFor();
    assert.equal(await page.getByTestId("deed-toast").count(), 1, "fixture has an active deed card");
    assert.equal(await page.getByTestId("moment-descent").count(), 1, "fixture has an active discovery banner");
    assert.equal(await page.getByText("You are hit", { exact: true }).count(), 1, "fixture has an active damage caption");
    await page.getByTestId(button).click();
    const fresh = await page.evaluate(async () => {
      const { floorRules } = await import("/src/game/world.ts");
      return {
        phase: window.__run.getState().phase,
        seed: window.__run.getState().runSeed,
        deed: !!document.querySelector('[data-testid="deed-toast"]'),
        moment: !!document.querySelector('[data-testid="moment-descent"]'),
        caption: document.body.textContent.includes("You are hit"),
        guidance: document.querySelector('[data-testid="guidance"]')?.textContent.includes(floorRules(1).blurb),
      };
    });
    check(fresh.phase === "playing", `${button}: starts a fresh run`);
    if (button === "summary-same-seed") check(fresh.seed === seed, "replaying keeps the requested dungeon seed");
    check(!fresh.deed && !fresh.moment && !fresh.caption, `${button}: previous-run messages are cleared immediately`);
    check(fresh.guidance, `${button}: the new run keeps its own opening guidance`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
