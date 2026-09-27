import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const errors = [];
try {
  for (const [id, capacity] of [["courier", 2], ["vagrant", 4]]) {
    const page = await browser.newPage();
    page.on("pageerror", error => errors.push(String(error)));
    await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
    await page.getByTestId("menu-delvers").click();
    await page.getByTestId(`delver-${id}`).click();
    await page.getByTestId("delvers-back").click();
    await page.getByTestId("menu-start").click();
    await page.waitForFunction(() => !window.__run.getState().transitioning);
    assert.equal(await page.evaluate(() => window.__run.getState().delver), id, "the menu starts the chosen delver");
    assert.equal(await page.evaluate(() => window.__derived.slots()), capacity);
    const roomId = await page.evaluate(async ({ id, capacity }) => {
      const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
      let seed = 1;
      while (seed < 50 && !generateRunFloor(seed, 1).rooms.some(r => r.kind === "shop")) seed++;
      window.__run.getState().startRun(seed, id);
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.kind === "shop");
      if (!room) throw Error("No generated shop fixture");
      window.__run.setState({ currentRoomId: room.id, transitioning: true, gems: 20,
        satchel: Array(capacity).fill("mapping"), identified: ["mapping"],
        charges: { ...s.charges, mapping: "blessed" }, floorRooms: 0 });
      window.__run.getState().roomReady(room.id);
      return room.id;
    }, { id, capacity });
    await page.waitForFunction(() => Object.keys(window.__triggers ?? {}).some(label => label.startsWith("Buy a bomb")));
    await page.evaluate(() => {
      const [, at] = Object.entries(window.__triggers).find(([label]) => label.startsWith("Buy a bomb"));
      window.__bus.emit("teleport", { position: [at.x, 1.5, at.z] });
    });
    await page.waitForFunction(() => {
      const [, at] = Object.entries(window.__triggers).find(([label]) => label.startsWith("Buy a bomb"));
      return at.dist < .5;
    });
    const full = await page.evaluate(() => ({ gems: window.__run.getState().gems,
      satchel: window.__run.getState().satchel, sold: window.__run.getState().bombBought,
      enabled: Object.entries(window.__triggers).find(([label]) => label.startsWith("Buy a bomb"))[1].enabled }));
    await page.keyboard.press("e");
    await page.waitForTimeout(150);
    const refused = await page.evaluate(() => ({ gems: window.__run.getState().gems,
      satchel: window.__run.getState().satchel, sold: window.__run.getState().bombBought }));
    console.log(id, { roomId, full, refused });
    assert.deepEqual(refused, { gems: full.gems, satchel: full.satchel, sold: full.sold },
      `${id}: a full bag cannot lose gems or consume the shop's bomb`);
    assert.equal(full.enabled, false, `${id}: the offer explains the actual capacity before purchase`);
    assert.match(await page.getByTestId("prompt").innerText(), /satchel is full/i);
    assert.equal(await page.locator('[data-testid^="satchel-"]').count(), capacity);

    await page.keyboard.press("1");
    await page.waitForFunction(() => Object.entries(window.__triggers).find(([label]) => label.startsWith("Buy a bomb"))[1].enabled);
    await page.keyboard.press("e");
    await page.waitForFunction(() => window.__run.getState().bombBought);
    const bought = await page.evaluate(() => ({ gems: window.__run.getState().gems,
      satchel: window.__run.getState().satchel, price: window.__world.BOMB_PRICE }));
    assert.equal(bought.gems, full.gems - bought.price);
    assert.equal(bought.satchel.length, capacity);
    assert.equal(bought.satchel.filter(item => item === "bomb").length, 1);
    await page.keyboard.press("e");
    assert.equal(await page.evaluate(() => window.__run.getState().gems), bought.gems, "a sold bomb cannot charge twice");
    console.log(`PASS ${id}: choose, full-bag refusal, free a slot, purchase exactly once`);
    await page.close();
  }
  const page = await browser.newPage();
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-delvers").click();
  await page.getByTestId("delver-ratcatcher").click();
  await page.getByTestId("delvers-back").click();
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => !window.__run.getState().transitioning);
  const ratcatcher = await page.evaluate(() => ({ known: window.__run.getState().identified, lives: window.__run.getState().lives }));
  assert.equal(ratcatcher.lives, 2, "the knowledge trade still costs a life");
  assert.deepEqual([...ratcatcher.known].sort(), ["rattle", "snare", "wardstone"], "the Ratcatcher knows every device, without learning potions or scrolls");
  await page.evaluate(() => window.__run.getState().takeItem("rattle"));
  await page.getByTestId("satchel-2").filter({ hasText: "Knot of Loose Iron" }).waitFor();
  const resets = await page.evaluate(() => {
    const run = window.__run;
    run.setState({ currentRoomId: run.getState().dungeon.endId, transitioning: true });
    run.getState().roomReady(run.getState().dungeon.endId);
    const floor = run.getState().floor, descended = [...run.getState().identified];
    run.getState().startRun(73, "vagrant");
    return { floor, descended, restarted: run.getState().identified };
  });
  assert.equal(resets.floor, 2);
  assert.deepEqual([...resets.descended].sort(), [...ratcatcher.known].sort(), "earned starting knowledge survives descent");
  assert.deepEqual(resets.restarted, [], "switching delvers starts a fresh knowledge trade");
  console.log("PASS Ratcatcher: the selected knowledge benefit labels a newly found device before using it");
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
