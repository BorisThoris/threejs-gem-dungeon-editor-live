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
  for (const wanted of (process.argv[2] ? [process.argv[2]] : ["mossy", "flooded", "fungal", "foundry", "ash", "salt", "verdigris", "bone", "circle", "hexagon", "triangle", "diamond", "cross", "ring", "elbow", "junction", "crossroads", "rootwell", "hoist", "cantor", "trail-rootwell", "trail-hoist", "trail-cantor"])) {
    const fixture = await page.evaluate(async wanted => {
      const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
      const { isUnlitRoom } = await import("/src/game/lighting/field.ts");
      const { bayHeadDirection, DIR_YAW, ringCoreWidth } = await import("/src/game/dungeon/types.ts");
      const { bus } = await import("/src/game/events.ts");
      const { PLAYER_SPAWN_Y } = await import("/src/game/world.ts");
      for (let seed = 1; seed <= 200; seed++) {
        const floor = wanted === "junction" ? 3 : 2;
        const dungeon = generateDungeon({ seed, floor });
        const trailKind = wanted.startsWith("trail-") ? wanted.slice(6) : null;
        const room = trailKind && dungeon.secretTrail?.landmark === trailKind
          ? dungeon.rooms.find(r => r.id === dungeon.secretTrail?.sourceId)
          : dungeon.rooms.find(r => wanted === "dark-gallery" ? r.wings?.north >= 6 && !r.links.north && isUnlitRoom(r, dungeon.seed)
          : wanted === "gallery" ? r.wings?.north >= 6 && !r.links.north
          : wanted === "salt" ? r.biome === "salt" && r.shape !== "square" && r.kind === "normal"
          : wanted === "elbow" ? r.shape === "elbow" && !r.landmark && !r.waterway && !r.template
          : wanted === "junction" ? r.shape === "junction" && Object.keys(r.links).length >= 3 && !r.landmark && !r.waterway && !r.template
          : wanted === "crossroads" ? r.template === "hall-crossroads"
          : wanted === "relay" ? r.template === "hall-turnkeepers-relay"
          : ["rootwell", "hoist", "cantor"].includes(wanted) ? r.landmark === wanted
          : r.biome === wanted || r.shape === wanted);
        if (!room) continue;
        window.__run.setState({ dungeon, floor, currentRoomId: room.id, visited: [room.id],
          transitioning: false, paused: false, inputLocks: 0, wardenRoomId: null, harrierAwake: false,
          thiefPhase: "away", reaperAwake: false, invulnerableUntil: 1e9,
          glim: wanted === "relay" ? 90 : 0, oil: 100 });
        const spawnZ = wanted === "gallery" || wanted === "dark-gallery" ? -room.size / 2 + 3
          : wanted === "ring" ? -ringCoreWidth(room.size) / 2 - 2.2 : 0;
        bus.emit("teleport", { position: [0, PLAYER_SPAWN_Y, spawnZ] });
        const head = room.shape === "bay" ? bayHeadDirection(room) : null;
        bus.emit("lookSet", { yaw: wanted === "gallery" || wanted === "dark-gallery" ? 0 : wanted === "ring" ? Math.PI : head ? DIR_YAW[head] : -0.65, pitch: -0.12 });
        return { roomId: room.id, shape: room.shape, biome: room.biome, district: room.district, size: room.size, seed, head };
      }
      return null;
    }, wanted);
    assert.ok(fixture, `${wanted} is generated`);
    await page.waitForFunction(id => window.__playerDebug && window.__run.getState().currentRoomId === id, fixture.roomId);
    const frames = await page.evaluate(() => window.__perf.frames);
    await page.waitForFunction(n => window.__perf.frames > n + 8, frames);
    await page.waitForTimeout(1000);
    if (wanted === "dark-gallery") {
      const lamps = await page.evaluate(() => {
        const answer = window.__scene.getObjectByName("gallery-answer-lamp");
        return { answer: !!answer, intensity: answer?.intensity ?? 0,
          carried: window.__lantern?.intensity ?? 0, sources: window.__blockLighting?.sources ?? 0 };
      });
      assert.ok(lamps.answer && lamps.intensity > 0 && lamps.sources > 0,
        "the dark gallery keeps its practical terminal lamp in the block-light field");
      assert.equal(lamps.carried, 0, "its destination cue remains visible with the player lantern lowered");
    }
    assert.ok(await page.locator(`[data-testid="map-room-footprint"][data-room-id="${fixture.roomId}"]`).count());
    if (wanted === "salt") {
      await page.waitForFunction(id => window.__saltFalls?.roomId === id && window.__saltFalls.count > 0, fixture.roomId);
      assert.ok(await page.evaluate(() => !!window.__scene.getObjectByName("salt-falls")), "salt-pan shedding mounts in one room batch");
      const moving = await page.evaluate(() => Array.from(window.__scene.getObjectByName("salt-falls").instanceMatrix.array));
      await page.waitForTimeout(220);
      assert.notDeepEqual(await page.evaluate(() => Array.from(window.__scene.getObjectByName("salt-falls").instanceMatrix.array)), moving,
        "salt chips shed while the run clock advances");
      await page.evaluate(() => window.__run.getState().pause());
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => Array.from(window.__scene.getObjectByName("salt-falls").instanceMatrix.array));
      await page.waitForTimeout(350);
      assert.deepEqual(await page.evaluate(() => Array.from(window.__scene.getObjectByName("salt-falls").instanceMatrix.array)), before,
        "salt shedding freezes exactly with the run clock");
      await page.evaluate(() => window.__run.getState().resume());
    }
    if (wanted === "foundry") {
      const embers = await page.evaluate(() => window.__foundryEmbers);
      assert.ok(embers?.count > 0, "foundry kiln aprons emit visible embers");
      assert.equal(embers.drawCalls, 1, "foundry embers stay in one instanced draw call");
    }
    if (["rootwell", "hoist", "cantor"].includes(wanted)) {
      const landmark = await page.evaluate(() => window.__districtLandmark);
      assert.equal(landmark?.id, wanted, `${wanted} exposes its rendered landmark probe`);
      assert.ok(landmark.structure >= 3 && landmark.marks >= 2 && landmark.drawCalls === 2,
        `${wanted} stays readable in two instanced draw calls`);
      assert.ok(await page.evaluate(name => !!window.__scene.getObjectByName(name), `district-landmark-${wanted}`));
      assert.equal(await page.locator(`[data-testid="map-district-landmark"][data-landmark="${wanted}"]`).count(), 1,
        `${wanted} remains a learned navigation mark on the minimap`);
    }
    if (wanted.startsWith("trail-")) {
      await page.evaluate(() => window.__run.setState({ visited: [] }));
      await page.waitForFunction(() => window.__secretTrail?.learned === false);
      assert.equal(await page.evaluate(() => !!window.__scene.getObjectByName("learned-secret-trail")), false,
        "the route is illegible before its landmark is learned");
      await page.evaluate(id => window.__run.setState({ visited: [id] }), fixture.roomId);
      await page.waitForFunction(() => window.__secretTrail?.learned === true && window.__secretTrail.drawCalls === 2);
      const trail = await page.evaluate(() => window.__secretTrail);
      assert.ok(trail.base > 0 && trail.accents > 0 && trail.onward, "the learned route has a visible direction");
      assert.equal(await page.evaluate(() => window.__run.getState().dungeon.secretTrail.landmark), wanted.slice(6),
        `${wanted} uses its own district alphabet`);
      assert.ok(await page.evaluate(() => !!window.__scene.getObjectByName("learned-secret-trail")));
      assert.equal(await page.locator('[data-testid="secret-trail-guide"]').count(), 1,
        "the learned tally names its live direction");
      assert.equal(await page.locator('[data-testid="map-secret-trail"]').count(), 1,
        "the learned route persists on its visited minimap room");
    }
    await page.screenshot({ path: `${output}/${wanted}.png` });
    review.push({ wanted, ...fixture, player: await page.evaluate(() => ({ ...window.__playerDebug })), perf: await page.evaluate(() => ({ ...window.__perf })) });
  }
  assert.deepEqual(errors, [], "no runtime or shader errors");
  writeFileSync(`${output}/review.json`, JSON.stringify(review, null, 2));
  console.log("PASS world browser review:", JSON.stringify(review));
} finally { await browser.close(); }
