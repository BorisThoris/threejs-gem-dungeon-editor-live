import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const failures = [];
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(detail)}`);
  if (!ok) failures.push(label);
};
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.addInitScript(() => localStorage.setItem("gem-dungeon.settings", JSON.stringify({ captions: true })));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__din && window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  await page.evaluate(() => window.__run.getState().pause());
  for (const [gems, keys] of [[0, 1], [1, 0], [1, 1]]) {
    const before = await page.evaluate(({ gems, keys }) => {
      const run = window.__run, s = run.getState();
      run.setState({ gems, keys, floor: 2, thiefPhase: "stalking", thiefRoomId: s.currentRoomId,
        thiefHolding: 0, thiefKey: false, nestGems: 0, nestKey: false, nestSeen: false,
        nestRoomId: s.dungeon.rooms.find(r => r.id !== s.currentRoomId && r.id !== s.dungeon.vaultId).id });
      window.__din.reset();
      if (keys) window.__bus.emit("keyTaken");
      window.__lootEvents = [];
      const off = window.__bus.on("thiefTook", e => window.__lootEvents.push(e));
      const stole = run.getState().thiefSteals();
      off();
      return { stole, gems: run.getState().gems, keys: run.getState().keys,
        audibleKey: window.__din.holding("carried:key"), events: window.__lootEvents };
    }, { gems, keys });
    const keyStolen = gems === 0;
    const caption = await page.getByTestId("caption").innerText();
    check(before.stole && before.gems === 0 && before.keys === (keyStolen ? 0 : keys), "theft spends the actual carried loot", before);
    check(keyStolen ? /iron key/i.test(caption) && !/gem/i.test(caption) : /gem/i.test(caption), "the theft caption names what was taken", caption);
    check(before.audibleKey === Boolean(keys && !keyStolen), "stealing a gem does not silence a key still being carried", before);
    const escaped = await page.evaluate(() => {
      const run = window.__run;
      let event;
      const off = window.__bus.on("thiefFled", e => { event = e; });
      run.getState().thiefEscapes();
      off();
      const s = run.getState();
      return { seen: s.nestSeen, gems: s.nestGems, key: s.nestKey, event };
    });
    await page.waitForTimeout(100);
    check(escaped.seen && Boolean(escaped.event), "every stolen item announces and reveals its nest", escaped);
    check(await page.locator('[data-testid="minimap"] circle[stroke-dasharray="3 3"]').count() === 1,
      "the map marks a nest holding the stolen item", escaped);
    const stolen = (await page.getByTestId("hud-stolen").allTextContents()).join(" ");
    check(keyStolen ? /iron key.*nest.*map/i.test(stolen) : /gem.*nest.*map/i.test(stolen), "the HUD names the recoverable loot and its destination", stolen);
    const recovered = await page.evaluate(() => {
      const run = window.__run;
      const first = run.getState().emptyNest();
      const second = run.getState().emptyNest();
      const s = run.getState();
      return { first, second, gems: s.gems, keys: s.keys, nestGems: s.nestGems, nestKey: s.nestKey };
    });
    await page.waitForTimeout(100);
    check(recovered.first && !recovered.second && recovered.gems === gems && recovered.keys === keys,
      "nest recovery returns each item exactly once", recovered);
    const recoveryCaption = await page.getByTestId("caption").innerText();
    check(keyStolen ? /iron key.*recovered/i.test(recoveryCaption) : /gem.*recovered/i.test(recoveryCaption),
      "nest recovery captions the returned item", recoveryCaption);
    check(await page.getByTestId("hud-stolen").count() === 0
      && await page.locator('[data-testid="minimap"] circle[stroke-dasharray="3 3"]').count() === 0,
      "recovery clears the HUD and map marker", null);
  }
  for (const [gems, key] of [[2, true], [0, false]]) {
    await page.evaluate(({ gems, key }) => {
      const run = window.__run;
      run.setState({ thiefPhase: "fleeing", thiefHolding: gems, thiefKey: key, gems: 0, keys: 0 });
      run.getState().thiefCaught();
    }, { gems, key });
    const caption = await page.getByTestId("caption").innerText();
    check(key ? /2 gems.*iron key.*recover/i.test(caption) : /driven off/i.test(caption) && !/recover|drop/i.test(caption),
      "catching a Cutpurse reports actual recovery, including empty hands", caption);
  }
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/?scenario=1&seed=1&floor=2&room=room_0`);
  await page.waitForFunction(() => window.__run?.getState().floor === 2 && !window.__run.getState().transitioning);
  await page.evaluate(() => {
    const run = window.__run;
    const nestRoomId = window.__nestRoom(run.getState().dungeon);
    run.setState({ currentRoomId: nestRoomId, nestRoomId, nestGems: 0, nestKey: true,
      keys: 0, thiefPhase: "away", thiefNextAt: Infinity, lastDamageAt: Infinity });
  });
  const offersKey = await page.waitForFunction(() => window.__triggers?.["Take back the iron key"]?.enabled,
    null, { timeout: 3000 }).then(() => true, () => false);
  check(offersKey, "a key-only nest mounts its real pickup interaction", null);
  if (offersKey) {
    check(await page.evaluate(() => !!window.__scene.getObjectByName("cutpurse-hoard")?.getObjectByName("iron-key-model")),
      "the stolen key is visible in the nest", null);
    await page.evaluate(() => {
      const at = window.__triggers["Take back the iron key"];
      window.__run.getState().resume();
      window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] });
    });
    await page.getByTestId("prompt").filter({ hasText: "Take back the iron key" }).waitFor();
    await page.keyboard.press("e");
    await page.waitForFunction(() => window.__run.getState().keys === 1 && !window.__run.getState().nestKey);
    check(true, "the ordinary interaction recovers the stolen key", null);
    await page.waitForFunction(() => !window.__triggers?.["Take back the iron key"] && !window.__scene.getObjectByName("cutpurse-hoard"));
  }
  check(errors.length === 0, "no uncaught browser errors", errors);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
