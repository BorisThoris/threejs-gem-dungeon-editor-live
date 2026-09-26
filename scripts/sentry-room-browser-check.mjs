import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const port = process.argv[2] || process.env.PORT || "5199";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixture = await page.evaluate(async () => {
    const { generateRunFloor } = await import("/src/game/dungeon/runFloor.ts");
    const { keyFor } = await import("/src/game/rooms/kinds.ts");
    const { sentryFor } = await import("/src/game/sentry/placement.ts");
    const dungeon = generateRunFloor(2, 2);
    const room = dungeon.rooms.find(candidate => candidate.id === dungeon.keyRoomId);
    const expected = sentryFor(room, dungeon.seed, 2, [keyFor(room, dungeon.seed)]);
    const ignoredKey = sentryFor(room, dungeon.seed, 2);
    if (!expected || !ignoredKey) throw Error("seed 2 depth 2 needs a watched key room");
    const run = window.__run;
    run.setState({ floor: 2, dungeon, currentRoomId: room.id, visited: [room.id], transitioning: true, lastDamageAt: 1e9 });
    return { room: room.id, expected: expected.at, ignoredKey: ignoredKey.at };
  });
  assert.notDeepEqual(fixture.expected, fixture.ignoredKey, "fixture detects a missing key reservation");
  await page.waitForFunction(room => window.__run.getState().currentRoomId === room && !window.__run.getState().transitioning, fixture.room);
  await page.waitForFunction(() => {
    let found = false;
    window.__scene?.traverse(object => { if (object.name === "sentry-post") found = true; });
    return found;
  });
  const drawn = await page.evaluate(() => {
    let at = null;
    window.__scene.traverse(object => {
      if (object.name === "sentry-post") at = [object.position.x, object.position.y, object.position.z];
    });
    return at;
  });
  assert.deepEqual(drawn, fixture.expected, "the rendered Sentry reserves the same key anchor as room dressing and threats");
  assert.deepEqual(errors, [], "key-room Sentry renders without browser errors");
  console.log(`PASS  key-room Sentry at ${drawn.join(", ")} agrees with dressing on seed 2 depth 2`);
} finally {
  await browser.close();
}
