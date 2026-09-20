import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5213"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const route = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    for (let seed = 1; seed <= 200; seed++) {
      const dungeon = generateDungeon({ seed, floor: 3 });
      const allowed = new Map(dungeon.rooms.filter(r => r.id !== dungeon.vaultId &&
        ["start", "normal", "treasure", "shrine", "library", "shop"].includes(r.kind)).map(r => [r.id, r]));
      for (const a of allowed.values()) for (const b of Object.values(a.links)) {
        if (!allowed.has(b)) continue;
        const paths = new Map([[a.id, [a.id]]]);
        for (const [id, path] of paths) for (const next of Object.values(allowed.get(id).links)) {
          if (!allowed.has(next) || paths.has(next) || (id === a.id && next === b) || (id === b && next === a.id)) continue;
          paths.set(next, [...path, next]);
        }
        const path = paths.get(b);
        if (!path || path.length < 4) continue;
        window.__run.setState({ dungeon, floor: 3, currentRoomId: a.id, visited: [a.id], transitioning: false,
          wardenRoomId: null, wardenAwake: false, harrierSlain: true, reaperAwake: false,
          thiefPhase: "away", invulnerableUntil: 1e9 });
        return [...path, a.id];
      }
    }
    throw Error("No open exploration circuit");
  });
  for (const next of route.slice(1)) {
    await page.evaluate(async next => {
      const { doorReach } = await import("/src/game/dungeon/footprint.ts");
      const { DIR_STEP, DIR_YAW } = await import("/src/game/dungeon/types.ts");
      const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
      const dir = Object.keys(room.links).find(dir => room.links[dir] === next), axis = DIR_STEP[dir];
      const reach = doorReach(room, dir) - 0.9;
      window.__bus.emit("teleport", { position: [axis.x * reach, 1.5, axis.z * reach] });
      window.__bus.emit("lookSet", { yaw: DIR_YAW[dir], pitch: 0 });
    }, next);
    await page.waitForTimeout(600);
    await page.keyboard.press("KeyE");
    await page.waitForFunction(next => window.__run.getState().currentRoomId === next && !window.__run.getState().transitioning, next);
  }
  const result = await page.evaluate(() => ({ id: window.__run.getState().currentRoomId, visited: window.__run.getState().visited, floor: window.__run.getState().floor }));
  assert.equal(result.id, route[0], "the alternate route returns through a different doorway");
  assert.ok(route.every(id => result.visited.includes(id)), "every circuit room is discovered through real travel");
  assert.equal(result.floor, 3, "optional circuit never forces descent");
  assert.deepEqual(errors, []);
  console.log(`PASS exploration: ${route.length - 1} door circuit, real keyboard travel, alternate return and discovery`);
} finally { await browser.close(); }
