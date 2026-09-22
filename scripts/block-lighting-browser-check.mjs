import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5222"}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__blockLighting && window.__scene && window.__run?.getState().phase === "playing");
  const fixture = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { isUnlitRoom } = await import("/src/game/lighting/field.ts");
    for (let seed = 1; seed < 150; seed++) {
      const dungeon = generateDungeon({ seed, floor: 2 });
      const room = dungeon.rooms.find(r => isUnlitRoom(r, dungeon.seed) && r.shape === "square" && r.biome === "hewn");
      if (room) return { dungeon, roomId: room.id };
    }
    throw Error("No dark test room");
  });
  await page.evaluate(async fixture => {
    window.__run.setState({ dungeon: fixture.dungeon, floor: 2, currentRoomId: fixture.roomId,
      phase: "playing", paused: true, transitioning: false, glim: 0, oil: 100,
      wardenRoomId: null, reaperAwake: false, harrierAwake: false, wispOut: false });
    const { bus } = await import("/src/game/events.ts");
    const { PLAYER_SPAWN_Y } = await import("/src/game/world.ts");
    bus.emit("teleport", { position: [0, PLAYER_SPAWN_Y, 4] });
  }, fixture);
  await page.waitForFunction(id => window.__blockLighting?.roomId === id && window.__lantern?.intensity === 0, fixture.roomId);
  // Render the real scene from a fixed camera so brightness comparisons exclude the HUD.
  await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(800, 560); renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    const camera = new T.PerspectiveCamera(75, 800 / 560, 0.1, 120);
    camera.position.set(0, 1.8, 4); camera.lookAt(0, 1, -5);
    window.__lightingCapture = () => {
      renderer.render(window.__scene, camera);
      const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 560;
      const ctx = canvas.getContext("2d"); ctx.drawImage(renderer.domElement, 0, 0);
      const pixels = ctx.getImageData(0, 0, 800, 560).data;
      let brightness = 0;
      for (let i = 0; i < pixels.length; i += 4) brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      return { brightness: brightness / (800 * 560), image: canvas.toDataURL(), probe: window.__blockLighting };
    };
    window.__disposeLightingCapture = () => renderer.dispose();
  });
  await page.waitForTimeout(300);
  const dark = await page.evaluate(() => window.__lightingCapture());
  await page.evaluate(() => window.__run.setState({ glim: 100 }));
  await page.waitForFunction(() => window.__lantern?.distance > 14.8);
  await page.waitForTimeout(200);
  const raised = await page.evaluate(() => window.__lightingCapture());
  mkdirSync("output/playwright/block-lighting", { recursive: true });
  for (const [name, result] of Object.entries({ dark, raised }))
    writeFileSync(`output/playwright/block-lighting/${name}.png`, Buffer.from(result.image.split(",")[1], "base64"));
  assert.ok(dark.probe.unlit);
  assert.ok(raised.brightness > dark.brightness * 2, `lantern reveals room: ${dark.brightness.toFixed(2)} → ${raised.brightness.toFixed(2)}`);
  assert.ok(dark.brightness < 25, "unlit room remains difficult to read");
  const bands = [];
  for (const glim of [75, 50, 25, 0]) {
    await page.evaluate(glim => window.__run.setState({ glim }), glim);
    await page.waitForTimeout(1600);
    bands.push(await page.evaluate(() => ({ ...window.__lantern })));
  }
  for (let i = 1; i < bands.length; i++) assert.ok(bands[i].intensity < bands[i - 1].intensity, "each band reduces light");
  assert.equal(bands.at(-1).intensity, 0);
  await page.evaluate(() => window.__run.setState({ glim: 100, oil: 0 }));
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.__lantern.intensity), 0, "empty oil cannot light the room");
  const sources = await page.evaluate(() => {
    let gpu = 0, block = 0;
    window.__scene.traverseVisible(o => { if (o.isPointLight) { if (o.layers.mask & 1) gpu++; else block++; } });
    return { gpu, block };
  });
  assert.equal(sources.gpu, 0, "no per-source point lights enter the GPU lighting loop");
  assert.ok(sources.block > 0);
  await page.evaluate(() => window.__disposeLightingCapture());
  // Revisit the same room: texture and shader counts should settle, not grow per visit.
  const settled = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__run.setState({ currentRoomId: window.__run.getState().dungeon.startId }));
    await page.waitForTimeout(400);
    await page.evaluate(id => window.__run.setState({ currentRoomId: id }), fixture.roomId);
    await page.waitForTimeout(600);
    settled.push(await page.evaluate(() => ({ ...window.__perf })));
  }
  assert.equal(settled[2].textures, settled[1].textures, "room textures do not leak on revisit");
  assert.equal(settled[2].programs, settled[1].programs, "shader variants do not grow on revisit");
  assert.deepEqual(errors, [], "no runtime or shader errors");
  console.log(JSON.stringify({ pass: true, dark: dark.brightness, raised: raised.brightness, bands,
    sources, settled, probe: raised.probe }, null, 2));
} finally { await browser.close(); }
