import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

mkdirSync("output/playwright", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5234}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);

  const fixtures = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { secretStoryFor } = await import("/src/game/dungeon/secret.ts");
    const found = {};
    for (let seed = 1; seed <= 500 && Object.keys(found).length < 9; seed++) {
      for (let floor = 1; floor <= 3; floor++) {
        const dungeon = generateDungeon({ seed, floor });
        const room = dungeon.rooms.find((candidate) => candidate.kind === "secret");
        if (!room) continue;
        const story = secretStoryFor(room, dungeon.seed);
        const key = `${story.district}-${story.flavour}`;
        if (!found[key]) found[key] = { dungeon, roomId: room.id, story, floor };
      }
    }
    return found;
  });
  assert.equal(Object.keys(fixtures).length, 9, "all district and reward combinations need a browser fixture");

  for (const [key, fixture] of Object.entries(fixtures)) {
    await page.evaluate(({ dungeon, roomId, floor }) => {
      const room = dungeon.rooms.find((candidate) => candidate.id === roomId);
      const host = dungeon.rooms.find((candidate) => candidate.secret?.to === roomId);
      const opposite = { north: "south", south: "north", east: "west", west: "east" };
      if (!room || !host?.secret) throw new Error("secret fixture has no host wall");
      host.links[host.secret.dir] = room.id;
      room.links[opposite[host.secret.dir]] = host.id;
      window.__run.setState({ dungeon, currentRoomId: room.id, floor, phase: "playing",
        paused: false, inputLocks: 0, transitioning: false, wardenRoomId: null,
        harrierSlain: true, reaperAwake: false, invulnerableUntil: 1e9 });
      window.__bus.emit("teleport", { position: [0, 1.5, 0] });
    }, fixture);
    await page.waitForTimeout(700);
    const mounted = await page.evaluate(() => {
      const state = window.__run.getState();
      return { probe: window.__secretHistory ?? null, currentRoomId: state.currentRoomId,
        kind: state.dungeon?.rooms.find((room) => room.id === state.currentRoomId)?.kind,
        secretObjects: window.__scene.children.flatMap((child) => {
          const names = [];
          child.traverse((object) => { if (object.name.includes("secret")) names.push(object.name); });
          return names;
        }) };
    });
    assert.equal(mounted.probe?.roomId, fixture.roomId, `secret room did not mount: ${JSON.stringify(mounted)}; errors: ${errors.join(" | ")}`);

    const result = await page.evaluate(async ({ story }) => {
      const T = await import("/node_modules/three/build/three.module.js");
      const history = window.__scene.getObjectByName(`secret-history-${story.material}`);
      const reward = window.__scene.getObjectByName(`secret-reward-${story.flavour}`);
      if (!history || !reward) throw new Error("secret history or reward group did not render");
      const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
      renderer.setSize(640, 480);
      const box = new T.Box3().setFromObject(reward), center = box.getCenter(new T.Vector3());
      const camera = new T.PerspectiveCamera(58, 640 / 480, .05, 100);
      camera.position.set(center.x + 4.5, 3.8, center.z + 4.5);
      camera.lookAt(center.x, .45, center.z);
      renderer.render(window.__scene, camera);
      const gl = renderer.getContext(), withMarks = new Uint8Array(640 * 480 * 4), withoutMarks = new Uint8Array(withMarks.length);
      gl.readPixels(0, 0, 640, 480, gl.RGBA, gl.UNSIGNED_BYTE, withMarks);
      history.visible = false;
      renderer.render(window.__scene, camera);
      gl.readPixels(0, 0, 640, 480, gl.RGBA, gl.UNSIGNED_BYTE, withoutMarks);
      history.visible = true;
      let pixels = 0;
      for (let i = 0; i < withMarks.length; i += 4)
        if (Math.max(Math.abs(withMarks[i] - withoutMarks[i]), Math.abs(withMarks[i + 1] - withoutMarks[i + 1]), Math.abs(withMarks[i + 2] - withoutMarks[i + 2])) > 3) pixels++;
      const image = renderer.domElement.toDataURL();
      const probe = window.__secretHistory;
      renderer.dispose();
      return { pixels, image, probe, historyMeshes: history.children.length, rewardChildren: reward.children.length };
    }, fixture);
    writeFileSync(`output/playwright/secret-history-${key}.png`, Buffer.from(result.image.split(",")[1], "base64"));
    delete result.image;
    assert.equal(result.probe.title, fixture.story.title);
    assert.equal(result.probe.purpose, fixture.story.purpose);
    assert.ok(result.historyMeshes > 0 && result.rewardChildren > 1, `${key} needs history and reward geometry`);
    assert.ok(result.pixels > 8, `${key} history marks need to contribute visible pixels`);
    console.log(key, result);
  }
  assert.deepEqual(errors, []);
  console.log("PASS all nine hidden-room histories render with their matching reward");
} finally {
  await browser.close();
}
