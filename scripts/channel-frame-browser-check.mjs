import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const port = process.env.PORT ?? "5234";
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixtures = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { channelFrameFor } = await import("/src/game/worldbuilding/channelFrames.ts");
    const found = {};
    for (let seed = 1; seed <= 120 && Object.keys(found).length < 3; seed++) for (const floor of [1, 2, 3]) {
      const dungeon = generateDungeon({ seed, floor });
      for (const room of dungeon.rooms) {
        const frame = channelFrameFor(room);
        if (!frame || found[room.district]) continue;
        found[room.district] = { dungeon, floor, roomId: room.id, name: frame.site.name, site: frame.site };
      }
    }
    return found;
  });
  assert.deepEqual(Object.keys(fixtures).sort(), ["gardens", "tombs", "works"]);
  for (const [district, fixture] of Object.entries(fixtures)) {
    await page.evaluate(({ dungeon, floor, roomId }) => {
      window.__run.setState({ dungeon, floor, currentRoomId: roomId, phase: "playing", paused: false,
        transitioning: false, inputLocks: 0, wardenRoomId: null, harrierSlain: true,
        reaperAwake: false, thiefPhase: "away" });
      window.__bus.emit("teleport", { position: [0, 1.5, 0] });
    }, fixture);
    await page.waitForFunction(name => window.__scene?.getObjectByName("room-architecture")?.userData.channelFrame === name,
      fixture.name);
    const mounted = await page.evaluate(() => {
      const group = window.__scene.getObjectByName("room-architecture");
      return { name: group.userData.channelFrame,
        batches: group.children.filter(child => child.isInstancedMesh).length };
    });
    assert.equal(mounted.name, fixture.name, `${district} names its overhead channel construction`);
    assert.equal(mounted.batches, 3, `${district} stays in the shared architecture batches`);
    if (process.env.CHANNEL_FRAME_REVIEW) {
      const image = await page.evaluate(async site => {
        const T = await import("/node_modules/three/build/three.module.js");
        const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
        renderer.setSize(800, 600); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
        const camera = new T.PerspectiveCamera(72, 4 / 3, 0.1, 100);
        camera.position.set(0, 1.65, 0);
        camera.lookAt(site.x, 4.15, site.z); camera.updateMatrixWorld();
        window.__scene.updateMatrixWorld(true); renderer.render(window.__scene, camera);
        const result = renderer.domElement.toDataURL(); renderer.dispose(); return result;
      }, fixture.site);
      mkdirSync("output/world-review/channel-frames", { recursive: true });
      writeFileSync(`output/world-review/channel-frames/${district}.png`, Buffer.from(image.split(",")[1], "base64"));
    }
  }
  assert.deepEqual(errors, [], "channel frames mount without browser errors");
  console.log("PASS channel frames: three directed district forms render in three shared architecture batches");
} finally {
  await browser.close();
}
