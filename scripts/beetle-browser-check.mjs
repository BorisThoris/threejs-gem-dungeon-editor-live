import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
mkdirSync("output/world-review", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5209"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixture = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { beetlesFor } = await import("/src/game/mobs/beetleHabitat.ts");
    for (let seed = 1; seed < 200; seed++) {
      const dungeon = generateDungeon({ seed, floor: 2 });
      const room = dungeon.rooms.find(r => r.kind === "normal" && !r.secret && beetlesFor(r).length === 3);
      if (room) return { dungeon, roomId: room.id, home: beetlesFor(room)[0] };
    }
    throw Error("No beetle habitat");
  });
  await page.evaluate(async ({ dungeon, roomId, home }) => {
    const din = await import("/src/game/din/din.ts"); din.reset();
    window.__run.setState({ dungeon, floor: 2, currentRoomId: roomId, transitioning: false, inputLocks: 0, paused: false,
      waterOpenedAt: null, bellcapBursts: {}, glim: 0, oil: 100, wardenRoomId: null, wardenAwake: false,
      reaperAwake: false, harrierSlain: true, thiefPhase: "away", invulnerableUntil: 1e9 });
    window.__bus.emit("teleport", { position: [home.x, 1.5, home.z + 1.5] });
    window.__bus.emit("lookSet", { yaw: 0, pitch: -0.45 });
  }, fixture);
  await page.waitForFunction(() => window.__beetles?.glowing === 3 && window.__beetles.poses.every(p => p.cover === 0));
  await page.screenshot({ path: "output/world-review/beetles-feeding.png" });
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => window.__beetles?.poses.some(p => p.cover > 0.2));
  const paused = await page.evaluate(() => { window.__run.getState().pause(); return window.__beetles.poses; });
  await page.waitForTimeout(800);
  assert.deepEqual(await page.evaluate(() => window.__beetles.poses), paused, "pausing freezes wings, movement and retreat");
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForFunction(() => window.__beetles?.glowing === 0);
  await page.waitForFunction(() => window.__derived.clock() >= window.__run.getState().glimUpAt);
  while (await page.evaluate(() => window.__run.getState().glim > 0)) await page.keyboard.press("KeyF", { delay: 100 });
  await page.waitForFunction(() => window.__beetles?.poses.every(p => p.cover === 0), null, { timeout: 20000 });
  await page.evaluate(({ roomId, home }) => window.__bus.emit("bellcapBurst", { roomId, x: home.x, z: home.z }), fixture);
  await page.waitForFunction(() => window.__beetles?.glowing === 0);
  assert.equal(await page.evaluate(() => window.__run.getState().glim), 0, "the spore noise alone drives retreat in darkness");
  await page.evaluate(() => window.__run.setState({ currentRoomId: window.__run.getState().dungeon.startId }));
  await page.waitForFunction(() => !window.__beetles);
  await page.evaluate(id => window.__run.setState({ currentRoomId: id }), fixture.roomId);
  await page.waitForFunction(() => window.__beetles?.glowing === 0);
  await page.evaluate(async () => {
    const { runClock } = await import("/src/game/state/run.ts");
    window.__run.setState({ waterOpenedAt: runClock(window.__run.getState()) - 6 });
  });
  await page.waitForFunction(() => window.__beetles?.dry && window.__beetles.glowing === 0);
  await page.evaluate(() => window.__run.setState({ currentRoomId: window.__run.getState().dungeon.startId }));
  await page.waitForFunction(() => !window.__beetles);
  await page.evaluate(id => window.__run.setState({ currentRoomId: id }), fixture.roomId);
  await page.waitForFunction(() => window.__beetles?.dry && window.__beetles.glowing === 0);
  assert.deepEqual(errors, [], "no runtime or shader errors");
  console.log("PASS glow beetles: dark foraging, lantern retreat, pause, settling, real spore-noise response, remembered retreat and dry habitat revisit");
} finally { await browser.close(); }
