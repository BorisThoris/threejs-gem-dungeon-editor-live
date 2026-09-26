/** Mount representative generated room kinds and footprints in the real game. */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const base = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`${base}?editor=1&tab=cases`);
  await page.locator('[data-testid="scenario-case"]').first().waitFor();
  const { cases, declaredKinds, declaredShapes } = await page.evaluate(async () => {
    const { scenarioCoverageCases } = await import("/src/editor/scenarioCases.ts");
    const { ROOM_KINDS, SHAPES } = await import("/src/game/dungeon/types.ts");
    return { cases: scenarioCoverageCases(), declaredKinds: ROOM_KINDS, declaredShapes: SHAPES };
  });
  assert.deepEqual([...new Set(cases.map(test => test.kind))].sort(), [...declaredKinds].sort(),
    "all room kinds have a generated scenario");
  assert.deepEqual([...new Set(cases.map(test => test.shape))].sort(), [...declaredShapes].sort(),
    "all footprints have a generated scenario");
  assert.ok(cases.every(test => test.coversKind || test.coversShape), "each case adds coverage");
  assert.equal(await page.locator('[data-testid="scenario-case"]').count(), cases.length,
    "every generated case is visible in the editor shelf");
  const firstCard = page.locator('[data-testid="scenario-case"]').first();
  assert.equal(await firstCard.getAttribute("data-room"), cases[0].roomId);
  assert.match(await firstCard.locator('[data-testid="case-play"]').getAttribute("href"),
    new RegExp(`room=${cases[0].roomId}(?:&|$)`), "the shelf launches its selected room");
  if (process.argv.includes("--screenshot")) await page.screenshot({ path: "output/scenario-shelf.png", fullPage: true });
  await page.getByRole("textbox", { name: "Filter scenarios" }).fill("ring");
  assert.ok(await page.locator('[data-testid="scenario-case"]').count() > 0, "a footprint can be filtered");
  assert.equal(await page.locator('[data-testid="scenario-case"]:not([data-shape="ring"])').count(), 0);
  await page.getByRole("textbox", { name: "Filter scenarios" }).fill("");
  for (const [index, scenario] of cases.entries()) {
    console.log(`CHECK ${scenario.seed}/${scenario.floor}/${scenario.roomId} ${scenario.kind}/${scenario.shape}`);
    const query = new URLSearchParams({ scenario: "1", seed: String(scenario.seed),
      floor: String(scenario.floor), room: scenario.roomId });
    if (index === 0) await firstCard.locator('[data-testid="case-play"]').click();
    else await page.goto(`${base}?${query}`);
    try {
      await page.waitForFunction(({ roomId, floor }) => {
        const state = window.__run?.getState();
        return state?.phase === "playing" && state.floor === floor && state.currentRoomId === roomId && !state.transitioning;
      }, scenario, { timeout: 20000 });
    } catch (error) {
      const state = await page.evaluate(() => {
        const run = window.__run?.getState();
        return run && { phase: run.phase, floor: run.floor, room: run.currentRoomId,
          transitioning: run.transitioning, endId: run.dungeon?.endId };
      });
      throw Error(`scenario ${JSON.stringify(scenario)} stalled: ${JSON.stringify(state)}; browser errors: ${errors.join(" | ")}`, { cause: error });
    }
    const mounted = await page.evaluate(async () => {
      const { insideRoom } = await import("/src/game/dungeon/footprint.ts");
      const { canControl } = await import("/src/game/state/run.ts");
      const { PLAYER_CAPSULE_RADIUS } = await import("/src/game/world.ts");
      const state = window.__run.getState();
      const room = state.dungeon.rooms.find(candidate => candidate.id === state.currentRoomId);
      const player = window.__playerDebug;
      const host = room?.kind === "secret"
        ? state.dungeon.rooms.find(candidate => candidate.secret?.to === room.id) : null;
      return { kind: room?.kind, shape: room?.shape, control: canControl(state),
        inside: !!player && insideRoom(room, player.x, player.z, PLAYER_CAPSULE_RADIUS),
        drawn: !!window.__scene?.children.length,
        secretReturn: room?.kind !== "secret" || !!host &&
          Object.values(room.links).includes(host.id) && Object.values(host.links).includes(room.id) };
    });
    assert.ok(mounted.control && mounted.inside && mounted.drawn && mounted.secretReturn &&
      mounted.kind === scenario.kind && mounted.shape === scenario.shape,
      `mounted ${JSON.stringify(scenario)}: ${JSON.stringify(mounted)}`);
    assert.deepEqual(errors, [], `no browser errors in ${scenario.kind}/${scenario.shape}`);
    if (scenario.kind === "secret") {
      const hostId = await page.evaluate(async () => {
        const { doorReach } = await import("/src/game/dungeon/footprint.ts");
        const { DIR_STEP } = await import("/src/game/dungeon/types.ts");
        const state = window.__run.getState();
        const room = state.dungeon.rooms.find(candidate => candidate.id === state.currentRoomId);
        const host = state.dungeon.rooms.find(candidate => candidate.secret?.to === room.id);
        const dir = Object.keys(room.links).find(key => room.links[key] === host.id);
        const step = DIR_STEP[dir], nearDoor = doorReach(room, dir) - 1.2;
        window.__bus.emit("teleport", { position: [step.x * nearDoor, 1.5, step.z * nearDoor] });
        return host.id;
      });
      await page.waitForFunction(() => /open/i.test(document.querySelector('[data-testid="prompt-text"]')?.textContent ?? ""));
      await page.keyboard.press("KeyE");
      await page.waitForFunction(host => {
        const state = window.__run?.getState();
        return state?.currentRoomId === host && !state.transitioning;
      }, hostId, { timeout: 12000 });
      assert.deepEqual(errors, [], "secret return door works through the player's interact key");
    }
  }
  console.log(`PASS  ${cases.length} live scenarios cover ${declaredKinds.length} room kinds and ${declaredShapes.length} footprints across generated floors`);
} finally {
  await browser.close();
}
