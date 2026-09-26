/** Fast browser gate for the menu, world mount, and one real door transition. */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
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
  await page.waitForFunction(() => /open the exit/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().floor === 2 && !window.__run.getState().transitioning, null, { timeout: 12000 });
  assert.ok((await page.evaluate(() => window.__run.getState().gems)) >= 1, "a spare gem survives the toll");
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
  await page.evaluate(gems => window.__run.setState({ gems }), lastNeeds + 1);
  await page.waitForFunction(() => /open the exit/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__run.getState().floor === 3 && !window.__run.getState().transitioning, null, { timeout: 12000 });
  const third = await replayFloor();
  assert.ok(third.same && third.floorSeed === third.derived,
    `the final floor replays from the run seed: ${JSON.stringify(third)}`);
  assert.deepEqual(errors, [], "no browser errors during the core flow");
  console.log(`PASS  menu, ${first.count}-room dungeon, door travel, gem pickup, exit refusal and two replayable descents`);
} finally {
  await browser.close();
}
