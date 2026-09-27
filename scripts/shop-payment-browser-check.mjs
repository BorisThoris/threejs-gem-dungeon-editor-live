import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const failures = [], errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  async function check(label, action) {
    try { await action(); console.log(`PASS ${label}`); }
    catch (error) { failures.push(`${label}: ${error.message}`); console.error(`FAIL ${label}: ${error.message}`); }
  }
  await check("paying an exit cannot spend the shop's one-use pair", async () => {
    const result = await page.evaluate(() => {
      const run = window.__run;
      run.getState().startRun(11);
      run.setState({ relics: ["cant", "cut"], gems: window.__derived.toll(), keys: 1 });
      const paid = run.getState().spendGems(window.__derived.toll());
      return { paid, gems: run.getState().gems, spent: run.getState().booksSpent, keys: run.getState().keys };
    });
    console.log("exit payment", result);
    assert.deepEqual(result, { paid: true, gems: 0, spent: false, keys: 1 });
  });
  await check("free relics do not require the exit toll in hand", async () => {
    assert.equal(await page.evaluate(() => {
      window.__run.setState({ relics: [], gems: 0 });
      return window.__derived.canSpend(0);
    }), true);
    await page.evaluate(async () => {
      const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
      const { secretStory } = await import("/src/game/dungeon/secret.ts");
      let seed = 1;
      while (seed < 300 && secretStory(generateRunFloor(seed, 1))?.flavour !== "reliquary") seed++;
      if (seed === 300) throw Error("No generated reliquary fixture");
      const run = window.__run;
      run.getState().startRun(seed);
      const s = run.getState(), host = s.dungeon.rooms.find(r => r.secret?.to === s.dungeon.secretId);
      run.getState().revealSecret(host.id);
      run.setState({ currentRoomId: s.dungeon.secretId, transitioning: true, gems: 0, floorRooms: 0,
        gemRooms: s.dungeon.rooms.map(r => r.id) });
    });
    await page.waitForFunction(() => Object.keys(window.__triggers ?? {}).some(label => label.includes(", free -")));
    await page.evaluate(() => {
      const [, at] = Object.entries(window.__triggers).find(([label]) => label.includes(", free -"));
      window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] });
    });
    await page.waitForFunction(() => (document.querySelector('[data-testid="prompt-text"]')?.textContent ?? "").includes(", free -"));
    await page.keyboard.press("e");
    await page.waitForFunction(() => window.__run.getState().relics.length === 1);
    assert.equal(await page.evaluate(() => window.__run.getState().gems), 0);
  });
  await check("a life offer uses the same payment that its prompt advertises", async () => {
    await page.evaluate(async () => {
      const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
      let seed = 1;
      while (seed < 50 && !generateRunFloor(seed, 1).rooms.some(r => r.kind === "shop")) seed++;
      const run = window.__run;
      run.getState().startRun(seed);
      const s = run.getState(), room = s.dungeon.rooms.find(r => r.kind === "shop");
      run.setState({ currentRoomId: room.id, transitioning: true, gems: window.__derived.toll(),
        relics: ["cant", "cut"], lives: 1, floorRooms: 0 });
      run.getState().roomReady(room.id);
      run.getState().takeKey(s.dungeon.keyRoomId);
    });
    await page.waitForFunction(() => Object.keys(window.__triggers ?? {}).some(label => label.startsWith("Buy a life")));
    await page.evaluate(() => {
      const [, at] = Object.entries(window.__triggers).find(([label]) => label.startsWith("Buy a life"));
      window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] });
    });
    await page.waitForFunction(() => Object.entries(window.__triggers).find(([label]) => label.startsWith("Buy a life"))[1].dist < .5);
    const before = await page.evaluate(() => ({ lives: window.__run.getState().lives, gems: window.__run.getState().gems,
      prompt: Object.keys(window.__triggers).find(label => label.startsWith("Buy a life")) }));
    if (process.env.SHOP_REVIEW === "1") await page.screenshot({ path: "output/verification/shop-key-payment.png" });
    await page.keyboard.press("e");
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ lives: window.__run.getState().lives, gems: window.__run.getState().gems,
      keys: window.__run.getState().keys, spent: window.__run.getState().booksSpent, audibleKey: window.__din.holding("carried:key") }));
    console.log("life offer", { before, after });
    assert.equal(after.lives, before.lives + 1);
    assert.match(before.prompt, /iron key/i, "the key cost is visible before accepting");
    assert.equal(after.gems, before.gems, "passage money remains in hand");
    assert.equal(after.keys, 0);
    assert.equal(after.spent, true);
    assert.equal(after.audibleKey, false, "traded keys stop advertising the player to listeners");
    const lostAccess = await page.evaluate(() => {
      const run = window.__run, s = run.getState();
      const opened = run.getState().unlockRoom(s.dungeon.vaultId);
      run.getState().takeKey(s.dungeon.keyRoomId);
      return { opened, keys: run.getState().keys };
    });
    assert.deepEqual(lostAccess, { opened: false, keys: 0 }, "trading a found key gives up vault access and does not respawn it");
  });
  await check("shop payments conserve resources across every floor and pair state", async () => {
    const result = await page.evaluate(() => {
      const run = window.__run, problems = [];
      let count = 0;
      for (const floor of [1, 2, 3]) for (const relics of [[], ["cant"], ["cut"], ["cant", "cut"]])
        for (const booksSpent of [false, true]) for (const keys of [0, 1])
          for (const gems of [0, 1, 3, 5, 7, 12]) for (const price of [0, 1, 2, 5, 10, -1, NaN, Infinity]) {
            run.setState({ floor, relics, booksSpent, keys, gems });
            const offered = window.__derived.canSpend(price), paid = run.getState().spendAtShop(price), s = run.getState();
            count++;
            const changedKey = s.keys !== keys;
            let problem;
            if (offered !== paid) problem = "quote disagrees with payment";
            else if (!paid && (s.gems !== gems || s.keys !== keys || s.booksSpent !== booksSpent)) problem = "refusal takes payment";
            else if (paid && price === 0 && (s.gems !== gems || s.keys !== keys || s.booksSpent !== booksSpent)) problem = "free reward costs resources";
            else if (paid && changedKey && (s.gems !== gems || s.keys !== keys - 1 || !s.booksSpent || booksSpent || relics.length !== 2)) problem = "invalid key trade";
            else if (paid && !changedKey && (s.gems !== gems - price || s.booksSpent !== booksSpent)) problem = "cash changes the pair";
            else if (paid && s.gems < Math.min(gems, window.__derived.toll())) problem = "payment eats passage money";
            if (problem) problems.push({ problem, floor, relics, booksSpent, keys, gems, price });
          }
      return { count, problems: problems.slice(0, 10) };
    });
    assert.deepEqual(result.problems, []);
    console.log(`${result.count} payment states conserve gems, keys and passage`);
  });
  for (const kind of ["bomb", "oil", "naming", "blessing", "relic"]) {
    await check(`${kind}: real offer shows and takes the key exactly once`, async () => {
      const prefix = await page.evaluate(async kind => {
        const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
        const { offeredAt, RELICS } = await import("/src/game/relics/catalog.ts");
        let seed = 1;
        while (seed < 50 && !generateRunFloor(seed, 1).rooms.some(r => r.kind === "shop")) seed++;
        const run = window.__run;
        run.getState().startRun(seed);
        const s = run.getState(), room = s.dungeon.rooms.find(r => r.kind === "shop"), relics = ["cant", "cut"];
        const selected = offeredAt(s.dungeon.seed, room.id, 1, relics)[0];
        window.__paymentRelic = selected;
        run.setState({ currentRoomId: room.id, transitioning: true, floorRooms: 0,
          gemRooms: s.dungeon.rooms.map(r => r.id), gems: window.__derived.toll(), relics, keys: 1,
          satchel: ["gloom"], identified: kind === "naming" ? [] : ["gloom"],
          oil: kind === "oil" ? 0 : s.oil, charges: { ...s.charges, gloom: "plain" } });
        run.getState().roomReady(room.id);
        window.__bus.emit("keyTaken");
        return { bomb: "Buy a bomb", oil: "Buy oil", naming: "Ask about ", blessing: "Have ", relic: RELICS[selected].name }[kind];
      }, kind);
      await page.waitForFunction(prefix => Object.keys(window.__triggers ?? {}).some(label => label.startsWith(prefix) && /your iron key/.test(label)), prefix);
      await page.evaluate(prefix => {
        const [, at] = Object.entries(window.__triggers).find(([label]) => label.startsWith(prefix));
        window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] });
      }, prefix);
      await page.waitForFunction(prefix => (document.querySelector('[data-testid="prompt-text"]')?.textContent ?? "").startsWith(prefix), prefix);
      assert.match(await page.getByTestId("prompt-text").innerText(), /your iron key/);
      await page.keyboard.press("e");
      await page.waitForFunction(() => window.__run.getState().booksSpent);
      const result = await page.evaluate(() => {
        const s = window.__run.getState();
        return { gems: s.gems, toll: window.__derived.toll(), keys: s.keys, satchel: s.satchel, oil: s.oil,
          identified: s.identified, charge: s.charges.gloom, relicTaken: s.relics.includes(window.__paymentRelic) };
      });
      assert.equal(result.gems, result.toll);
      assert.equal(result.keys, 0);
      if (kind === "bomb") assert.ok(result.satchel.includes("bomb"));
      if (kind === "oil") assert.ok(result.oil > 0);
      if (kind === "naming") assert.ok(result.identified.includes("gloom"));
      if (kind === "blessing") assert.equal(result.charge, "blessed");
      if (kind === "relic") assert.equal(result.relicTaken, true);
      await page.evaluate(() => window.__run.setState({ keys: 1 }));
      assert.equal(await page.evaluate(() => window.__run.getState().spendAtShop(1)), false, "another key cannot reuse the spent pair");
    });
  }
  for (const spent of [false, true]) {
    await check(`real exit preserves ${spent ? "spent" : "unspent"} allowance through descent`, async () => {
      const exit = await page.evaluate(spent => {
        const run = window.__run;
        run.getState().startRun(11);
        const s = run.getState(), room = s.dungeon.rooms.find(r => Object.values(r.links).includes(s.dungeon.endId));
        const dir = Object.keys(room.links).find(dir => room.links[dir] === s.dungeon.endId);
        const [x, , z] = window.__layout.doorPosition(room, dir);
        run.setState({ currentRoomId: room.id, transitioning: true, floorRooms: 0, gems: window.__derived.toll(),
          relics: ["cant", "cut"], booksSpent: spent, keys: 1, gemRooms: s.dungeon.rooms.map(r => r.id) });
        return [x - Math.sign(x) * .8, z - Math.sign(z) * .8];
      }, spent);
      await page.waitForFunction(() => !window.__run.getState().transitioning);
      await page.evaluate(([x, z]) => window.__bus.emit("teleport", { position: [x, 1.5, z] }), exit);
      await page.waitForFunction(() => /open the exit/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
      await page.keyboard.press("e");
      await page.waitForFunction(() => window.__run.getState().floor === 2 && !window.__run.getState().transitioning);
      const descended = await page.evaluate(() => ({ spent: window.__run.getState().booksSpent, gems: window.__run.getState().gems }));
      assert.deepEqual(descended, { spent, gems: 0 });
      assert.equal(await page.evaluate(() => { window.__run.getState().startRun(11); return window.__run.getState().booksSpent; }), false);
    });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
} finally { await browser.close(); }
