import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const districts = ["gardens", "works", "tombs"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5234"}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);

  const fixtures = await page.evaluate(async districts => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { strataSeamsFor } = await import("/src/game/worldbuilding/strataSeamPattern.ts");
    const found = {};
    for (let seed = 1; seed <= 300 && Object.keys(found).length < districts.length; seed++) for (const floor of [1, 2, 3]) {
      const dungeon = generateDungeon({ seed, floor });
      for (const room of dungeon.rooms) {
        const marks = strataSeamsFor(room, dungeon.rooms);
        if (room.district && districts.includes(room.district) && marks.length && !found[room.district])
          found[room.district] = { dungeon, floor, roomId: room.id, marks };
      }
    }
    return found;
  }, districts);
  assert.deepEqual(Object.keys(fixtures).sort(), [...districts].sort(), "all districts expose a connected-strata threshold");
  mkdirSync("output/world-review/strata", { recursive: true });

  for (const district of districts) {
    const fixture = fixtures[district];
    await page.evaluate(({ dungeon, floor, roomId }) => {
      window.__run.setState({ dungeon, floor, currentRoomId: roomId, phase: "playing", paused: false,
        inputLocks: 0, transitioning: false, wardenRoomId: null, harrierSlain: true,
        reaperAwake: false, thiefPhase: "away", broken: [], looted: [], invulnerableUntil: 1e9 });
      window.__bus.emit("teleport", { position: [0, 1.5, 0] });
    }, fixture);
    await page.waitForFunction(roomId => window.__strataSeams?.roomId === roomId, fixture.roomId);
    const result = await page.evaluate(async fixture => {
      const T = await import("/node_modules/three/build/three.module.js");
      const seams = window.__scene.getObjectByName("strata-seams");
      if (!seams) throw new Error("strata seam batch did not mount");
      const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
      renderer.setSize(720, 540); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
      const box = new T.Box3().setFromObject(seams), center = box.getCenter(new T.Vector3());
      const camera = new T.PerspectiveCamera(55, 4 / 3, 0.1, 120);
      const step = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[fixture.marks[0].dir];
      camera.position.set(center.x - step[0] * 6, 3.6, center.z - step[1] * 6);
      camera.lookAt(center.x, 0, center.z); camera.updateMatrixWorld();
      window.__scene.updateMatrixWorld(true); renderer.render(window.__scene, camera);
      const gl = renderer.getContext(), shown = new Uint8Array(720 * 540 * 4), hidden = new Uint8Array(shown.length);
      gl.readPixels(0, 0, 720, 540, gl.RGBA, gl.UNSIGNED_BYTE, shown);
      const calls = renderer.info.render.calls, triangles = renderer.info.render.triangles;
      seams.visible = false; renderer.render(window.__scene, camera);
      gl.readPixels(0, 0, 720, 540, gl.RGBA, gl.UNSIGNED_BYTE, hidden); seams.visible = true;
      let pixels = 0;
      for (let i = 0; i < shown.length; i += 4)
        if (Math.max(Math.abs(shown[i] - hidden[i]), Math.abs(shown[i + 1] - hidden[i + 1]), Math.abs(shown[i + 2] - hidden[i + 2])) > 3) pixels++;
      renderer.render(window.__scene, camera);
      const image = renderer.domElement.toDataURL(); renderer.dispose();
      return { probe: window.__strataSeams, pixels, calls, triangles, image,
        room: window.__run.getState().dungeon.rooms.find(room => room.id === fixture.roomId) };
    }, fixture);
    assert.equal(result.probe.marks, fixture.marks.length, `${district} mounts every generated seam chip`);
    assert.ok(result.pixels > 30, `${district} seam contributes visible pixels`);
    assert.ok(result.calls < 96, `${district} seam room stays below the draw-call watch band`);
    assert.equal(result.room.district, district);
    writeFileSync(`output/world-review/strata/${district}.png`, Buffer.from(result.image.split(",")[1], "base64"));
    console.log(`${district}: ${result.probe.destinations.length} transition doorway, ${result.probe.marks} chips, ${result.pixels} pixels, ${result.calls} calls, ${result.triangles} triangles`);
  }
  assert.deepEqual(errors, []);
  console.log("PASS connected strata render as one block-cut threshold batch in every district");
} finally {
  await browser.close();
}
