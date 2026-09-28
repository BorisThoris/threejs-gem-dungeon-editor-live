/** Fast browser gate for the menu, world mount, and one real door transition. */
import assert from "node:assert/strict";
import { chromium } from "./browser-safety.mjs";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const first = await page.evaluate(() => {
    const s = window.__run.getState();
    window.__run.setState({ lastDamageAt: 1e9 });
    const room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    const dir = Object.keys(room.links).find(d => room.links[d] !== s.dungeon.endId && room.links[d] !== s.dungeon.vaultId);
    if (!dir) return { phase: s.phase, room: room.id, count: s.dungeon.rooms.length, dir: null };
    const [dx, , dz] = window.__layout.doorPosition(room, dir);
    return { phase: s.phase, room: room.id, count: s.dungeon.rooms.length, dir,
      position: [dx - Math.sign(dx) * 0.8, dz - Math.sign(dz) * 0.8] };
  });
  assert.ok(first.count >= 6 && first.dir, "a connected dungeon mounted");
  await page.evaluate(([x, z]) => window.__bus.emit("teleport", { position: [x, 1.5, z] }), first.position);
  await page.waitForTimeout(600);
  await page.waitForFunction(() => /open/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  assert.match(await page.locator('[data-testid="prompt-text"]').innerText(), /open/i, "the nearby doorway offers an interaction");
  await page.keyboard.press("KeyE");
  await page.waitForFunction((from) => window.__run.getState().currentRoomId !== from && !window.__run.getState().transitioning, first.room, { timeout: 12000 });
  const after = await page.evaluate(() => ({ phase: window.__run.getState().phase, room: window.__run.getState().currentRoomId }));
  assert.equal(after.phase, "playing", "play continues after door travel");
  assert.notEqual(after.room, first.room, "the door leads to another room");
  const gem = await page.evaluate(async () => {
    const { gemFor } = await import("/src/game/rooms/kinds.ts");
    const { veinsShowing } = await import("/src/game/state/run.ts");
    const run = window.__run;
    const state = run.getState();
    const options = state.dungeon.rooms.filter((room) => room.id !== state.currentRoomId
      && gemFor(room, state.dungeon.seed) && !state.gemRooms.includes(room.id));
    const room = options.find((candidate) => candidate.kind === "shop") ?? options[0];
    const at = gemFor(room, state.dungeon.seed);
    const worth = veinsShowing(state) ? 2 : 1;
    run.setState({ currentRoomId: room.id, transitioning: true, lastDamageAt: 1e9 });
    return { room: room.id, before: state.gems, worth, at: [at[0], at[2]] };
  });
  await page.waitForFunction((room) => window.__run.getState().currentRoomId === room && !window.__run.getState().transitioning, gem.room);
  await page.evaluate(([x, z]) => window.__bus.emit("teleport", { position: [x, 1.5, z] }), gem.at);
  await page.waitForFunction((room) => window.__run.getState().gemRooms.includes(room), gem.room, { timeout: 7000 });
  assert.equal(await page.evaluate(() => window.__run.getState().gems), gem.before + gem.worth,
    "walking onto a gem pays its declared worth");
  const exit = await page.evaluate(() => {
    const run = window.__run;
    const state = run.getState();
    const room = state.dungeon.rooms.find((candidate) => Object.values(candidate.links).includes(state.dungeon.endId));
    const dir = Object.keys(room.links).find((key) => room.links[key] === state.dungeon.endId);
    const [dx, , dz] = window.__layout.doorPosition(room, dir);
    run.setState({ currentRoomId: room.id, transitioning: room.id !== state.currentRoomId, gems: 0, lastDamageAt: 1e9 });
    return { room: room.id, position: [dx - Math.sign(dx) * 0.8, dz - Math.sign(dz) * 0.8] };
  });
  await page.waitForFunction((room) => window.__run.getState().currentRoomId === room && !window.__run.getState().transitioning, exit.room);
  await page.evaluate(([x, z]) => window.__bus.emit("teleport", { position: [x, 1.5, z] }), exit.position);
  await page.waitForFunction(() => /exit needs \d+ gems/i.test(document.body.innerText));
  const needs = Number((await page.locator("body").innerText()).match(/exit needs (\d+) gems/i)?.[1]);
  assert.ok(needs > 0, "the exit states a real toll");
  await page.keyboard.press("KeyE");
  assert.equal(await page.evaluate(() => window.__run.getState().floor), 1, "unpaid exit refuses travel");
  await page.evaluate((gems) => window.__run.setState({ gems }), needs + 1);
  await page.waitForFunction(() => /Pay the toll/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  assert.match(await page.getByTestId("prompt-text").innerText(), new RegExp(`${needs} gems`),
    "an affordable stair still quotes the gems it will spend");
  assert.match(await page.getByTestId("prompt-text").innerText(), /descend to floor 2; no return/,
    "the doorway explains its irreversible destination before use");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().floor === 2 && !window.__run.getState().transitioning, null, { timeout: 12000 });
  assert.equal(await page.evaluate(() => window.__run.getState().gems), 1, "the stair charges exactly its advertised toll");
  const replayFloor = async () => page.evaluate(async () => {
    const { generateRunFloor, runFloorSeed } = await import("/src/game/dungeon/runFloor.ts");
    const state = window.__run.getState();
    const expected = generateRunFloor(state.runSeed, state.floor, false);
    return { same: JSON.stringify(expected) === JSON.stringify(state.dungeon),
      runSeed: state.runSeed, floorSeed: state.dungeon.seed, derived: runFloorSeed(state.runSeed, state.floor) };
  });
  const second = await replayFloor();
  assert.ok(second.same && second.floorSeed === second.derived,
    `the second floor replays from the run seed: ${JSON.stringify(second)}`);
  const lastExit = await page.evaluate(() => {
    const run = window.__run;
    const state = run.getState();
    const room = state.dungeon.rooms.find(candidate => Object.values(candidate.links).includes(state.dungeon.endId));
    const dir = Object.keys(room.links).find(key => room.links[key] === state.dungeon.endId);
    const [dx, , dz] = window.__layout.doorPosition(room, dir);
    run.setState({ currentRoomId: room.id, transitioning: room.id !== state.currentRoomId, lastDamageAt: 1e9 });
    return { room: room.id, position: [dx - Math.sign(dx) * 0.8, dz - Math.sign(dz) * 0.8] };
  });
  await page.waitForFunction(room => window.__run.getState().currentRoomId === room && !window.__run.getState().transitioning, lastExit.room);
  await page.evaluate(([x, z]) => window.__bus.emit("teleport", { position: [x, 1.5, z] }), lastExit.position);
  await page.waitForFunction(() => /exit needs \d+ gems/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  const lastNeeds = Number((await page.locator('[data-testid="prompt-text"]').innerText()).match(/exit needs (\d+) gems/i)?.[1]);
  // One stolen gem is in the nest, one is still carried. The offer must
  // follow both balances, and recovery must remove its warning immediately.
  const stageTheft = async () => page.evaluate(gems => {
    const run = window.__run;
    run.setState({ gems, floorRooms: 0 });
    for (let i = 0; i < 2; i++) {
      run.setState({ thiefPhase: "stalking", thiefRoomId: run.getState().currentRoomId });
      if (!run.getState().thiefSteals()) throw Error("the staged Cutpurse did not steal");
      if (i === 0) run.getState().thiefEscapes();
    }
  }, lastNeeds + 3);
  await stageTheft();
  await page.waitForFunction(() => /Pay the toll/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  await page.waitForFunction(() => /leave 2 stolen gems behind/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  await page.evaluate(() => { window.__run.getState().thiefCaught(); window.__run.getState().emptyNest(); });
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-testid="prompt-text"]')?.textContent ?? "";
    return /Pay the toll/.test(text) && !/stolen/.test(text);
  });
  await stageTheft();
  await page.waitForFunction(() => /leave 2 stolen gems behind/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  assert.match(await page.getByTestId("prompt-text").innerText(), new RegExp(`${lastNeeds} gems.*descend to floor 3; no return`));
  await page.evaluate(async () => {
    const settings = (await import("/src/game/state/settings.ts")).useSettings.getState();
    settings.setUiScale(1.6);
    settings.bind("interact", "NumpadSubtract");
  });
  for (const [width, height] of [[320, 640], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    const fits = await page.getByTestId("prompt").evaluate(el => {
      const b = el.getBoundingClientRect();
      return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight
        && el.scrollWidth <= el.clientWidth + 1;
    });
    assert.ok(fits, `the complete stair offer fits ${width}x${height} at maximum text scale`);
  }
  await page.evaluate(async () => {
    const settings = (await import("/src/game/state/settings.ts")).useSettings.getState();
    settings.setUiScale(1);
    settings.bind("interact", "KeyE");
  });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().floor === 3 && !window.__run.getState().transitioning, null, { timeout: 12000 });
  const third = await replayFloor();
  assert.ok(third.same && third.floorSeed === third.derived,
    `the final floor replays from the run seed: ${JSON.stringify(third)}`);
  assert.deepEqual(await page.evaluate(() => {
    const { gems, thiefHolding, nestGems } = window.__run.getState();
    return { gems, thiefHolding, nestGems };
  }), { gems: 1, thiefHolding: 0, nestGems: 0 }, "the quoted payment and abandoned loot match the real descent");
  const finalExit = await page.evaluate(async () => {
    const { tollNow } = await import("/src/game/state/run.ts");
    const run = window.__run;
    const s = run.getState();
    const room = s.dungeon.rooms.find(r => Object.values(r.links).includes(s.dungeon.endId));
    const dir = Object.keys(room.links).find(d => room.links[d] === s.dungeon.endId);
    const [x, , z] = window.__layout.doorPosition(room, dir);
    const toll = tollNow(s);
    run.setState({ currentRoomId: room.id, transitioning: true, gems: toll + 1, floorRooms: 0, lastDamageAt: 1e9 });
    return { room: room.id, position: [x - Math.sign(x) * 0.8, z - Math.sign(z) * 0.8], toll };
  });
  await page.waitForFunction(room => window.__run.getState().currentRoomId === room && !window.__run.getState().transitioning, finalExit.room);
  await page.evaluate(([x, z]) => window.__bus.emit("teleport", { position: [x, 1.5, z] }), finalExit.position);
  await page.waitForFunction(() => /Keeper holds the stairs/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  await page.keyboard.press("KeyE");
  assert.equal(await page.evaluate(() => window.__run.getState().gems), finalExit.toll + 1, "a held stair cannot charge the player");
  await page.evaluate(() => window.__run.getState().stallKeeper());
  await page.waitForFunction(() => /Pay the toll and go - now/.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  assert.match(await page.getByTestId("prompt-text").innerText(), new RegExp(`${finalExit.toll} gems.*escape`),
    "the final stair advertises escape for its real toll");
  assert.doesNotMatch(await page.getByTestId("prompt-text").innerText(), /descend|stolen/);
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().phase === "won");
  assert.equal(await page.evaluate(() => window.__run.getState().gems), 1, "the final stair charges the quoted price exactly once");
  assert.deepEqual(errors, [], "no browser errors during the core flow");
  console.log(`PASS  menu, ${first.count}-room dungeon, door travel, gem pickup, quoted tolls, stolen-loot choices, two replayable descents and paid escape`);
} finally {
  await browser.close();
}
