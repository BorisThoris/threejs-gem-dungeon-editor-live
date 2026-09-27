import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [], failures = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && !window.__run.getState().transitioning);
  for (const [source, action, name] of [["warden", "wardenStrike", "Warden"], ["harrier", "harrierStrike", "Harrier"],
    ["keeper", "keeperStrike", "Keeper"], ["reaper", "reaperStrike", "Reaper"]]) {
    const state = await page.evaluate(({ action }) => {
      const run = window.__run;
      run.getState().startRun(17);
      const s = run.getState();
      run.setState({ lives: 1, floor: 3, transitioning: false, lastDamageAt: -Infinity,
        harrierAwake: true, harrierRoomId: s.currentRoomId, reaperAwake: true, reaperRoomId: s.currentRoomId,
        keeperLastStrikeAt: -Infinity, reaperLastStrikeAt: -Infinity });
      run.getState()[action]();
      return { phase: run.getState().phase, cause: run.getState().lastDamageSource };
    }, { action });
    await page.getByTestId("summary-same-seed").waitFor();
    const text = await page.getByTestId("summary-cause").count() ? await page.getByTestId("summary-cause").innerText() : "";
    if (state.phase !== "lost" || state.cause !== source || !text.includes(name)) failures.push({ source, state, text });
  }
  console.log({ failures });
  assert.deepEqual(failures, [], "the fatal strike must be explained by its actual source");
  for (const source of ["pit", "darts", "spikes"]) {
    const target = await page.evaluate(source => {
      const run = window.__run;
      for (let seed = 1; seed <= 30; seed++) {
        run.getState().startRun(seed);
        const dungeon = run.getState().dungeon;
        for (const room of dungeon.rooms) {
          let target;
          if (source === "spikes" && room.kind === "trap") {
            const gem = window.__gemFor(room, dungeon.seed);
            const p = gem && window.__layout.trapHazards(room, gem)[0];
            if (p) target = { x: p[0], z: p[2] };
          } else if (source !== "spikes") target = window.__traps.trapsFor(room, dungeon.seed, dungeon.endId).find(t => t.kind === source);
          if (!target) continue;
          run.setState({ currentRoomId: room.id, transitioning: true, wardenRoomId: null, lives: 1, lastDamageAt: -Infinity });
          return target;
        }
      }
      throw Error(`No generated ${source} fixture`);
    }, source);
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    await page.evaluate(p => window.__bus.emit("teleport", { position: [p.x, 1.5, p.z] }), target);
    await page.waitForFunction(() => window.__run.getState().phase === "lost");
    assert.equal(await page.evaluate(() => window.__run.getState().lastDamageSource), source, `physical ${source} contact records the real cause`);
    assert.ok((await page.getByTestId("summary-cause").innerText()).toLowerCase().includes(source === "darts" ? "dart" : source));
  }
  await page.getByTestId("summary-same-seed").click();
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  assert.equal(await page.evaluate(() => window.__run.getState().lastDamageSource), null, "replay clears the previous death");
  const guarded = await page.evaluate(() => {
    const run = window.__run;
    const first = run.getState().damage("spikes"), blocked = run.getState().damage("pit");
    return { first, blocked, source: run.getState().lastDamageSource };
  });
  assert.deepEqual(guarded, { first: true, blocked: false, source: "spikes" }, "cooldown-refused hits cannot rewrite what happened");
  await page.evaluate(() => {
    const run = window.__run;
    run.setState({ lives: 1, lastDamageAt: -Infinity, satchel: ["bomb"], identified: ["bomb"],
      charges: { ...run.getState().charges, bomb: "plain" } });
  });
  await page.keyboard.press("1");
  await page.waitForFunction(() => window.__run.getState().phase === "lost");
  assert.equal(await page.evaluate(() => window.__run.getState().lastDamageSource), "bomb", "a real satchel bomb names its own blast");
  assert.match(await page.getByTestId("summary-cause").innerText(), /bomb blast/i);
  assert.equal(await page.evaluate(() => window.__run.getState().damage("reaper")), false);
  assert.equal(await page.evaluate(() => window.__run.getState().lastDamageSource), "bomb", "post-run callbacks cannot replace the fatal cause");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => (await import("/src/game/state/settings.ts")).useSettings.getState().setUiScale(1.6));
  await page.getByTestId("summary-cause").scrollIntoViewIfNeeded();
  const readable = await page.getByTestId("summary-cause").evaluate(p => {
    const b = p.getBoundingClientRect();
    return b.left >= 0 && b.right <= innerWidth && p.scrollWidth <= p.clientWidth + 1;
  });
  assert.ok(readable, "the explanation wraps within a phone at maximum text scale");
  if (process.env.DEATH_REVIEW === "1") await page.screenshot({ path: "output/verification/death-review-phone.png" });
  await page.getByTestId("summary-again").click();
  await page.waitForFunction(() => window.__run.getState().phase === "playing" && !window.__run.getState().transitioning);
  assert.equal(await page.evaluate(() => window.__run.getState().lastDamageSource), null, "a fresh dungeon clears the death review too");
  await page.evaluate(() => window.__run.setState({ phase: "won", lastDamageSource: "warden" }));
  await page.getByTestId("summary-demo").waitFor();
  assert.equal(await page.getByTestId("summary-cause").count(), 0, "an escape never blames an earlier nonfatal hit");
  assert.deepEqual(errors, []);
  console.log("PASS fatal strikes, physical hazards, bomb contact, cooldown, replay, phone layout and escape summary");
} finally { await browser.close(); }
