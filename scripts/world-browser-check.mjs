import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const output = "output/world-review";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  headless: true, args: ["--no-sandbox"] });
const errors = [], review = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5199"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  for (const wanted of (process.argv[2] ? [process.argv[2]] : ["mossy", "flooded", "fungal", "foundry", "bone", "circle", "hexagon", "triangle", "diamond", "cross", "crossroads"])) {
    const fixture = await page.evaluate(async wanted => {
      const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
      const { bus } = await import("/src/game/events.ts");
      const { PLAYER_SPAWN_Y } = await import("/src/game/world.ts");
      for (let seed = 1; seed <= 200; seed++) {
        const dungeon = generateDungeon({ seed, floor: 2 });
        const room = dungeon.rooms.find(r => wanted === "gallery" ? r.wings?.north >= 6 && !r.links.north
          : wanted === "crossroads" ? r.template === "hall-crossroads"
          : r.biome === wanted || r.shape === wanted);
        if (!room) continue;
        window.__run.setState({ dungeon, floor: 2, currentRoomId: room.id, visited: [room.id],
          transitioning: false, paused: false, inputLocks: 0, wardenRoomId: null, harrierAwake: false,
          thiefPhase: "away", reaperAwake: false, invulnerableUntil: 1e9 });
        bus.emit("teleport", { position: [0, PLAYER_SPAWN_Y, wanted === "gallery" ? -room.size / 2 + 3 : 0] });
        bus.emit("lookSet", { yaw: wanted === "gallery" ? 0 : -0.65, pitch: -0.16 });
        return { roomId: room.id, shape: room.shape, biome: room.biome, district: room.district, size: room.size, seed };
      }
      return null;
    }, wanted);
    assert.ok(fixture, `${wanted} is generated`);
    await page.waitForFunction(id => window.__playerDebug && window.__run.getState().currentRoomId === id, fixture.roomId);
    const frames = await page.evaluate(() => window.__perf.frames);
    await page.waitForFunction(n => window.__perf.frames > n + 8, frames);
    await page.waitForTimeout(1000);
    assert.ok(await page.locator(`[data-testid="map-room-footprint"][data-room-id="${fixture.roomId}"]`).count());
    if (wanted === "foundry") {
      const embers = await page.evaluate(() => window.__foundryEmbers);
      assert.ok(embers?.count > 0, "foundry kiln aprons emit visible embers");
      assert.equal(embers.drawCalls, 1, "foundry embers stay in one instanced draw call");
    }
    await page.screenshot({ path: `${output}/${wanted}.png` });
    review.push({ wanted, ...fixture, player: await page.evaluate(() => ({ ...window.__playerDebug })), perf: await page.evaluate(() => ({ ...window.__perf })) });
  }
  assert.deepEqual(errors, [], "no runtime or shader errors");
  writeFileSync(`${output}/review.json`, JSON.stringify(review, null, 2));
  console.log("PASS world browser review:", JSON.stringify(review));
} finally { await browser.close(); }
