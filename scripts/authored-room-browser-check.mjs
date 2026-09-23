import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const ids = [
  "hall-diamond-cutters",
  "vault-round-counting-house",
  "trap-cross-machine-floor",
  "library-hex-scriptorium",
  "hall-sealkeepers-ring",
  "hall-turnkeepers-relay",
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? "5234"}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  const fixtures = await page.evaluate(async ids => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { getTemplate, authoredProps } = await import("/src/game/rooms/templates.ts");
    const found = {};
    for (let seed = 1; seed < 300 && Object.keys(found).length < ids.length; seed++) for (const floor of [1, 2, 3]) {
      const dungeon = generateDungeon({ seed, floor });
      for (const room of dungeon.rooms) if (ids.includes(room.template) && !room.landmark && !room.waterway && !found[room.template]) {
        const template = getTemplate(room.template);
        found[room.template] = { dungeon, floor, roomId: room.id, shape: room.shape,
          name: template.name, story: template.story, props: authoredProps(room).length };
      }
    }
    return found;
  }, ids);
  assert.deepEqual(Object.keys(fixtures).sort(), [...ids].sort(), "all new authored rooms occur in native generation");
  mkdirSync("output/world-review/authored-rooms", { recursive: true });

  for (const id of ids) {
    const fixture = fixtures[id];
    await page.evaluate(fixture => {
      window.__run.setState({ dungeon: fixture.dungeon, floor: fixture.floor, currentRoomId: fixture.roomId,
        phase: "playing", paused: false, inputLocks: 0, transitioning: false, wardenRoomId: null,
        harrierSlain: true, reaperAwake: false, thiefPhase: "away", broken: [], looted: [], invulnerableUntil: 1e9,
        glim: fixture.shape === "elbow" ? 90 : 0, oil: 100 });
      window.__bus.emit("teleport", { position: [0, 1.5, 0] });
    }, fixture);
    await page.waitForFunction(roomId => window.__roomHazards?.roomId === roomId, fixture.roomId);
    if (fixture.shape === "elbow") await page.waitForFunction(() => window.__lantern?.distance > 13);
    const mounted = await page.evaluate(async fixture => {
      const { authoredProps } = await import("/src/game/rooms/templates.ts");
      const { roomPlaceName } = await import("/src/game/rooms/placeName.ts");
      const state = window.__run.getState(), room = state.dungeon.rooms.find(room => room.id === state.currentRoomId);
      const T = await import("/node_modules/three/build/three.module.js");
      const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
      renderer.setSize(720, 540); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace;
      const camera = new T.PerspectiveCamera(58, 4 / 3, 0.1, 120);
      camera.position.set(room.size * 0.34, room.size * 0.54, room.size * 0.48);
      camera.lookAt(0, 0.6, 0); camera.updateMatrixWorld();
      window.__scene.updateMatrixWorld(true); renderer.render(window.__scene, camera);
      if (!renderer.info.render.calls) {
        await new Promise(requestAnimationFrame);
        renderer.render(window.__scene, camera);
      }
      const furniture = {};
      window.__scene.traverseVisible(object => {
        if (object.isInstancedMesh && object.name.startsWith("furniture-"))
          furniture[object.name] = { batches: (furniture[object.name]?.batches ?? 0) + 1, copies: object.count };
      });
      const result = { room: { template: room.template, shape: room.shape, props: authoredProps(room).length }, title: roomPlaceName(room, state.dungeon.seed),
        calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, furniture,
        image: renderer.domElement.toDataURL() };
      renderer.dispose(); return result;
    }, fixture);
    assert.deepEqual(mounted.room, { template: id, shape: fixture.shape, props: fixture.props }, `${id} mounts its complete authored composition`);
    assert.ok(mounted.title.includes(fixture.name), `${id} keeps its authored name in the room readout`);
    assert.ok(mounted.calls > 0 && mounted.triangles > 0, `${id} contributes rendered geometry`);
    if (id === "hall-sealkeepers-ring") {
      for (const part of ["finished-table", "finished-chair"])
        assert.deepEqual(mounted.furniture[`furniture-${part}`], { batches: 1, copies: 4 }, `${part} joins the four repeated stations`);
    }
    if (id === "vault-round-counting-house") {
      const broken = await page.evaluate(async () => {
        const { authoredProps } = await import("/src/game/rooms/templates.ts");
        const { breakKey } = await import("/src/game/props/breakable.ts");
        const state = window.__run.getState(), room = state.dungeon.rooms.find(room => room.id === state.currentRoomId);
        const prop = authoredProps(room).find(p => p.kind === "barrel" || p.kind === "crate");
        if (!prop) throw Error("Counting house has no breakable store");
        window.__run.setState({ broken: [breakKey(room, prop)] });
        return { part: prop.kind === "barrel" ? "barrel-staves" : "finished-crate" };
      });
      const name = `furniture-${broken.part}`, before = mounted.furniture[name].copies;
      await page.waitForFunction(({ name, expected }) => {
        let copies = 0;
        window.__scene.traverseVisible(object => { if (object.isInstancedMesh && object.name === name) copies += object.count; });
        return copies === expected;
      }, { name, expected: before - 1 });
    }
    assert.ok(fixture.name && fixture.story, `${id} keeps its authored name and purpose`);
    if (id === "hall-turnkeepers-relay") {
      const aligned = await page.evaluate(async () => {
        const { elbowMissing } = await import("/src/game/dungeon/types.ts");
        const { orient, orientationOf } = await import("/src/game/dungeon/layout.ts");
        const state = window.__run.getState(), room = state.dungeon.rooms.find(r => r.id === state.currentRoomId);
        const [x, z] = orient(1, 1, orientationOf(room));
        return { missing: elbowMissing(room), authored: { x, z } };
      });
      assert.deepEqual(aligned.missing, aligned.authored, "the uncut elbow quadrant turns with its authored furniture");
    }
    writeFileSync(`output/world-review/authored-rooms/${id}.png`, Buffer.from(mounted.image.split(",")[1], "base64"));
    console.log(`${id}: ${fixture.shape}, ${fixture.props} authored props, ${mounted.calls} calls, ${mounted.triangles} triangles`);
  }
  assert.deepEqual(errors, []);
  console.log("PASS six named irregular authored rooms mount in native generation and render without errors");
} finally {
  await browser.close();
}
