import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run && !window.__run.getState().transitioning);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByTestId("pause-relics").count(), 0, "no empty relic section on a fresh Vagrant");

  for (const [id, partner, name, flag] of [
    ["tally", "chit", "The Full Count", "fullCount"],
    ["cut", "cant", "The Books Balance", "booksBalance"],
    ["hood", "rod", "The Long Dark", "longDark"],
  ]) {
    const offer = await page.evaluate(async ({ id, partner }) => {
      const { offeredAt, RELICS, modifiers } = await import("/src/game/relics/catalog.ts");
      const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
      const { FLOORS } = await import("/src/game/world.ts");
      let selected;
      for (let seed = 1; seed < 100 && !selected; seed++) {
        const dungeon = generateRunFloor(seed, FLOORS);
        const room = dungeon.rooms.find(r => r.kind === "shop" && offeredAt(dungeon.seed, r.id, FLOORS, [partner]).includes(id));
        if (room) selected = { seed, roomId: room.id };
      }
      if (!selected) throw Error(`No generated shop offering ${id}`);
      const run = window.__run;
      run.getState().startRun(selected.seed);
      while (run.getState().floor < FLOORS) {
        run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
        run.getState().roomReady(run.getState().dungeon.endId);
      }
      run.getState().addRelic(partner);
      run.setState({ currentRoomId: selected.roomId, transitioning: true, floorRooms: 0, gems: 30,
        gemRooms: run.getState().dungeon.rooms.map(r => r.id), lastDamageAt: Infinity });
      // Two recipes can select the same seed and shop. Atomic fixture staging
      // then reuses its mounted Room; finish staging through the store owner.
      run.getState().roomReady(selected.roomId);
      window.__planningModifiers = modifiers;
      return { name: RELICS[id].name, price: RELICS[id].price, floor: FLOORS };
    }, { id, partner });
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    await page.waitForFunction(({ relic, pair }) => Object.keys(window.__triggers ?? {})
      .some(label => label.startsWith(`${relic},`) && label.includes(`Completes ${pair}:`)), { relic: offer.name, pair: name });
    await page.evaluate(name => {
      const [, at] = Object.entries(window.__triggers).find(([label]) => label.startsWith(`${name},`));
      window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] });
    }, offer.name);
    try {
      await page.waitForFunction(name => (document.querySelector('[data-testid="prompt-text"]')?.textContent ?? "").startsWith(`${name},`), offer.name);
    } catch (error) {
      console.error(await page.evaluate(() => ({ room: window.__run.getState().currentRoomId,
        paused: window.__run.getState().paused, locks: window.__run.getState().inputLocks,
        prompt: document.querySelector('[data-testid="prompt-text"]')?.textContent, triggers: window.__triggers })));
      throw error;
    }
    const prompt = await page.getByTestId("prompt-text").innerText();
    assert.ok(prompt.includes(`Completes ${name}:`), "the player sees the connection before paying");
    if (id === "tally") assert.match(prompt, /No later floors remain.*paying rooms/s);
    await page.evaluate(async () => {
      const settings = (await import("/src/game/state/settings.ts")).useSettings.getState();
      settings.setUiScale(1.6);
      settings.bind("interact", "NumpadSubtract");
    });
    for (const [width, height] of [[320, 640], [844, 390], [1280, 800]]) {
      await page.setViewportSize({ width, height });
      const fit = await page.getByTestId("prompt").evaluate(el => {
        const b = el.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, width: b.width,
          fits: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight && el.scrollWidth <= el.clientWidth + 1 };
      });
      assert.ok(fit.fits, `${name}'s complete offer fits ${width}x${height} at large text: ${JSON.stringify(fit)}`);
    }
    await page.evaluate(async () => {
      const settings = (await import("/src/game/state/settings.ts")).useSettings.getState();
      settings.setUiScale(1);
      settings.bind("interact", "KeyE");
    });
    await page.keyboard.press("e");
    await page.waitForFunction(id => window.__run.getState().relics.includes(id), id);
    const bought = await page.evaluate(flag => ({ gems: window.__run.getState().gems,
      active: window.__planningModifiers(window.__run.getState().relics)[flag] }), flag);
    assert.deepEqual(bought, { gems: 30 - offer.price, active: true }, "the advertised pair really activates for the quoted cost");
    await page.keyboard.press("Escape");
    await page.getByTestId("pause-relics").click();
    await page.getByTestId(`inspect-relic-${id}`).click();
    let description = await page.getByTestId(`inspect-relic-${id}`).innerText();
    assert.ok(description.includes(name));
    if (id === "tally") {
      const destination = await page.evaluate(() => window.__run.getState().fullCountFloor);
      assert.equal(destination, offer.floor);
      assert.ok(description.includes(`hoard on floor ${destination}`), "remember the recorded destination, not a recalculated one");
    } else if (id === "cut") {
      assert.match(description, /without spending your iron key.*key trade available once/s);
      await page.evaluate(() => {
        const run = window.__run;
        run.setState({ gems: window.__derived.toll(), keys: 1 });
        if (!run.getState().spendAtShop(1)) throw Error("The pair's key trade was refused");
      });
      description = await page.getByTestId(`inspect-relic-${id}`).innerText();
      assert.match(description, /key trade used this run/);
    } else assert.match(description, /The Long Dark: active/);
    console.log(`PASS ${name}: visible offer, real purchase, active effect and paused reminder`);
  }

  await page.evaluate(async () => {
    const { FLOORS } = await import("/src/game/world.ts");
    const run = window.__run;
    run.getState().startRun(11);
    run.getState().addRelic("chit");
    run.getState().addRelic("tally");
    while (run.getState().floor < FLOORS) {
      run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
      run.getState().roomReady(run.getState().dungeon.endId);
    }
  });
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-relics").click();
  await page.getByTestId("inspect-relic-tally").click();
  const earlier = await page.getByTestId("inspect-relic-tally").innerText();
  assert.match(earlier, /You have passed that floor/);
  assert.match(earlier, /This floor was generated with the Tally's room effect/);
  console.log("PASS descent retains the actual Tally effect and marks a passed hoard destination");

  await page.evaluate(() => window.__run.getState().startRun(11, "courier"));
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  await page.keyboard.press("Escape");
  await page.getByTestId("pause-relics").click();
  await page.getByTestId("inspect-relic-cant").click();
  assert.match(await page.getByTestId("inspect-relic-cant").innerText(), /Find Company Seal to complete The Books Balance/);
  assert.equal(await page.getByTestId("inspect-relic-cut").count(), 0, "the missing partner is not claimed as owned");
  const before = await page.evaluate(() => ({ time: window.__derived.clock(), gems: window.__run.getState().gems,
    relics: window.__run.getState().relics, satchel: window.__run.getState().satchel }));
  await page.keyboard.press("1");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => (await import("/src/game/state/settings.ts")).useSettings.getState().setUiScale(1.6));
  await page.getByTestId("inspect-relic-cant").scrollIntoViewIfNeeded();
  assert.ok(await page.getByTestId("inspect-relic-cant").evaluate(el => {
    const box = el.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1 && box.height <= innerHeight - 32;
  }), "the complete reminder fits at maximum phone text size");
  if (process.env.RELIC_REVIEW === "1") await page.screenshot({ path: "output/verification/relic-planning-phone.png" });
  assert.deepEqual(await page.evaluate(() => ({ time: window.__derived.clock(), gems: window.__run.getState().gems,
    relics: window.__run.getState().relics, satchel: window.__run.getState().satchel })), before, "planning cannot spend resources or time");
  await page.getByTestId("pause-relics").click();
  await page.evaluate(() => {
    const pad = { id: "Relic inspection", index: 0, connected: true, mapping: "standard", timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    navigator.getGamepads = () => [pad];
    window.__planningPad = pad;
  });
  const press = async index => {
    await page.evaluate(index => { window.__planningPad.buttons[index] = { pressed: true, touched: true, value: 1 }; }, index);
    await page.waitForTimeout(150);
    await page.evaluate(index => { window.__planningPad.buttons[index] = { pressed: false, touched: false, value: 0 }; }, index);
    await page.waitForTimeout(150);
  };
  await page.getByTestId("pause-resume").focus();
  for (let steps = 0; steps < 5; steps++) {
    if (await page.getByTestId("pause-relics").evaluate(el => el === document.activeElement)) break;
    await press(13);
  }
  assert.ok(await page.getByTestId("pause-relics").evaluate(el => el === document.activeElement));
  await press(0);
  await page.getByTestId("inspect-relic-cant").waitFor();
  await press(13);
  assert.ok(await page.getByTestId("inspect-relic-cant").evaluate(el => el === document.activeElement));
  // The selection survives collapsing the section; close and open it with A.
  await press(0);
  await press(0);
  assert.match(await page.getByTestId("inspect-relic-cant").innerText(), /Find Company Seal/);
  await press(1);
  await page.getByTestId("pause-menu").waitFor({ state: "detached" });
  assert.deepEqual(errors, []);
  console.log("PASS incomplete pair, next-run reset, paused resources, phone text and controller planning");
} finally { await browser.close(); }
