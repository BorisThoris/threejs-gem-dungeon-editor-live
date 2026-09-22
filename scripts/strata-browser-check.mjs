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
    const { strataSeamsFor, strataVeinsFor } = await import("/src/game/worldbuilding/strataSeamPattern.ts");
    const found = {};
    for (let seed = 1; seed <= 300 && Object.keys(found).length < districts.length; seed++) for (const floor of [1, 2, 3]) {
      const dungeon = generateDungeon({ seed, floor });
      for (const room of dungeon.rooms) {
        const marks = strataSeamsFor(room, dungeon.rooms);
        const veins = strataVeinsFor(room, dungeon.rooms);
        if (room.district && districts.includes(room.district) && marks.length && veins.length && !found[room.district])
          found[room.district] = { dungeon, floor, roomId: room.id, marks, veins };
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
      const camera = new T.PerspectiveCamera(55, 4 / 3, 0.1, 120);
      const step = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[fixture.marks[0].dir];
      const target = fixture.marks.reduce((sum, mark) => ({ x: sum.x + mark.position[0] / fixture.marks.length,
        z: sum.z + mark.position[2] / fixture.marks.length }), { x: 0, z: 0 });
      camera.position.set(target.x - step[0] * 5.5, 3.6, target.z - step[1] * 5.5);
      camera.lookAt(target.x, 0, target.z); camera.updateMatrixWorld();
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
    assert.ok(fixture.marks.some(mark => mark.kind === "threshold") && fixture.marks.some(mark => mark.kind === "fan"),
      `${district} material transitions show both threshold chips and inward contact fans`);
    assert.equal(result.probe.veins, fixture.veins.length, `${district} mounts every connected geological vein in the same batch`);
    assert.ok(result.probe.continuities.length > 0, `${district} exposes a matching-stratum doorway`);
    assert.ok(result.pixels > 30, `${district} seam contributes visible pixels`);
    assert.ok(result.calls < 96, `${district} seam room stays below the draw-call watch band`);
    assert.equal(result.room.district, district);
    writeFileSync(`output/world-review/strata/${district}.png`, Buffer.from(result.image.split(",")[1], "base64"));
    console.log(`${district}: ${result.probe.destinations.length} transition doorway, ${fixture.marks.filter(mark => mark.kind === "threshold").length} chips, ${fixture.marks.filter(mark => mark.kind === "fan").length} contact cuts and ${result.probe.veins} continuity marks, ${result.pixels} pixels, ${result.calls} calls, ${result.triangles} triangles`);
  }
  const border = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { districtHandoverFor } = await import("/src/game/worldbuilding/districtThresholds.ts");
    for (let seed = 1; seed <= 100; seed++) for (const floor of [1, 2, 3]) {
      const dungeon = generateDungeon({ seed, floor });
      for (const room of dungeon.rooms) {
        const handovers = districtHandoverFor(room, dungeon.rooms);
        if (handovers.length === 4 && new Set(handovers.map(mark => mark.dir)).size === 1
          && room.kind === "normal" && !room.wings?.[handovers[0].dir])
          return { dungeon, floor, roomId: room.id, handovers };
      }
    }
    return null;
  });
  assert.ok(border, "a generated ordinary room has a district handover");
  await page.evaluate(({ dungeon, floor, roomId }) => {
    window.__run.setState({ dungeon, floor, currentRoomId: roomId, phase: "playing", paused: false,
      inputLocks: 0, transitioning: false, wardenRoomId: null, harrierSlain: true,
      reaperAwake: false, thiefPhase: "away", broken: [], looted: [], invulnerableUntil: 1e9 });
    window.__bus.emit("teleport", { position: [0, 1.5, 0] });
  }, border);
  await page.waitForFunction(roomId => window.__strataSeams?.roomId === roomId, border.roomId);
  const handoverReview = await page.evaluate(async fixture => {
    const T = await import("/node_modules/three/build/three.module.js");
    const batch = window.__scene.getObjectByName("strata-seams");
    if (!batch) throw new Error("threshold batch did not mount");
    const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
    renderer.setSize(720, 540); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
    const camera = new T.PerspectiveCamera(55, 4 / 3, 0.1, 120);
    const step = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[fixture.handovers[0].dir];
    const target = fixture.handovers.reduce((sum, mark) => ({ x: sum.x + mark.position[0] / fixture.handovers.length,
      z: sum.z + mark.position[2] / fixture.handovers.length }), { x: 0, z: 0 });
    camera.position.set(target.x - step[0] * 0.2, 2.6, target.z - step[1] * 0.2);
    camera.lookAt(target.x, 0, target.z); camera.updateMatrixWorld();
    window.__scene.updateMatrixWorld(true); renderer.render(window.__scene, camera);
    const gl = renderer.getContext(), shown = new Uint8Array(720 * 540 * 4), hidden = new Uint8Array(shown.length);
    gl.readPixels(0, 0, 720, 540, gl.RGBA, gl.UNSIGNED_BYTE, shown);
    const calls = renderer.info.render.calls, triangles = renderer.info.render.triangles;
    batch.visible = false; renderer.render(window.__scene, camera);
    gl.readPixels(0, 0, 720, 540, gl.RGBA, gl.UNSIGNED_BYTE, hidden); batch.visible = true;
    let pixels = 0;
    for (let i = 0; i < shown.length; i += 4)
      if (Math.max(Math.abs(shown[i] - hidden[i]), Math.abs(shown[i + 1] - hidden[i + 1]), Math.abs(shown[i + 2] - hidden[i + 2])) > 3) pixels++;
    renderer.render(window.__scene, camera);
    const image = renderer.domElement.toDataURL(); renderer.dispose();
    return { probe: window.__strataSeams, pixels, calls, triangles, image };
  }, border);
  assert.equal(handoverReview.probe.handovers, border.handovers.length, "district handover mounts in the shared batch");
  assert.ok(handoverReview.probe.districts.includes(border.handovers[0].destination), "probe follows the real destination");
  writeFileSync("output/world-review/strata/district-handover.png", Buffer.from(handoverReview.image.split(",")[1], "base64"));
  assert.ok(handoverReview.pixels > 30, "boundary paving contributes visible pixels from inside the room");
  assert.ok(handoverReview.calls < 96, "boundary room remains below the draw-call budget");
  console.log(`district handover: ${handoverReview.probe.handovers} paving cuts, ${handoverReview.pixels} changed pixels, ${handoverReview.calls} calls, ${handoverReview.triangles} triangles`);
  assert.deepEqual(errors, []);
  console.log("PASS connected strata and district handovers render in one block-cut batch");
} finally {
  await browser.close();
}
