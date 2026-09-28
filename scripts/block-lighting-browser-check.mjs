import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "./browser-safety.mjs";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
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
    const renderer = (await import("/scripts/review-renderer.mjs")).createReviewRenderer(T, window.__scene, { antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(800, 560);

    const camera = new T.PerspectiveCamera(75, 800 / 560, 0.1, 120);
    camera.position.set(0, 1.8, 4); camera.lookAt(0, 1, -5);
    window.__lightingCapture = () => {
      const hand = window.__scene.getObjectByName("shove-hand"), handVisible = hand?.visible;
      if (hand) hand.visible = false;
      renderer.render(window.__scene, camera);
      if (hand) hand.visible = handVisible;
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
  assert.ok(dark.brightness > 12, `empty-lantern room remains navigable (${dark.brightness})`);
  assert.ok(raised.brightness > 35, `raised lantern reveals surface detail (${raised.brightness})`);
  const bands = [];
  for (const glim of [75, 50, 25, 0]) {
    await page.evaluate(glim => window.__run.setState({ glim }), glim);
    await page.waitForTimeout(1600);
    bands.push(await page.evaluate(() => ({ ...window.__lantern })));
  }
  for (let i = 1; i < bands.length; i++) assert.ok(bands[i].intensity < bands[i - 1].intensity, "each band reduces light");
  assert.equal(bands.at(-1).intensity, 0);
  // Oil pays for raising and room entry; the last paid raise still lights
  // this room. Exercise those owners instead of inventing an empty-lit state.
  const lastRaise = await page.evaluate(async () => {
    const { RAISE_OIL } = await import("/src/game/lantern/glim.ts");
    window.__run.setState({ glim: 0, oil: RAISE_OIL });
    window.__run.getState().toggleLantern();
    const { glim, oil } = window.__run.getState();
    return { glim, oil };
  });
  assert.equal(lastRaise.oil, 0, "raising spends the last measure of oil");
  assert.ok(lastRaise.glim > 0, "the paid raise retains its light band");
  await page.waitForFunction(() => window.__lantern?.distance > 14.8);
  assert.ok(await page.evaluate(() => window.__lightingCapture().brightness) > dark.brightness * 2,
    "the last paid raise illuminates the actual room");
  await page.evaluate(() => window.__run.getState().burnOilEntering(false));
  await page.waitForFunction(() => window.__lantern?.intensity === 0);
  assert.equal(await page.evaluate(() => window.__run.getState().glim), 0,
    "entering another room with no oil extinguishes the lantern");
  await page.evaluate(() => window.__run.getState().toggleLantern());
  assert.equal(await page.evaluate(() => window.__run.getState().glim), 0,
    "an empty flask cannot pay for another raise");
  const sources = await page.evaluate(() => {
    let gpu = 0, block = 0;
    window.__scene.traverseVisible(o => { if (o.isPointLight) { if (o.layers.mask & 1) gpu++; else block++; } });
    return { gpu, block };
  });
  assert.equal(sources.gpu, 0, "no per-source point lights enter the GPU lighting loop");
  assert.ok(sources.block > 0);
  const environments = [];
  const biomes = await page.evaluate(async () => (await import("/src/game/rooms/biomes.ts")).BIOMES);
  for (const biome of biomes) {
    await page.evaluate(async biome => {
      const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
      const { bus } = await import("/src/game/events.ts");
      const dungeon = generateDungeon({ seed: 1, floor: 3 });
      // The sanctuary is a deterministic fixture for material readability on
      // the darkest floor, with its own practical lights and an empty lantern.
      const room = dungeon.rooms.find(r => r.id === dungeon.startId);
      room.biome = biome;
      window.__run.setState({ dungeon, floor: 3, currentRoomId: room.id, glim: 0, oil: 100,
        wardenRoomId: null, reaperAwake: false, harrierAwake: false, wispOut: false });
      bus.emit("teleport", { position: [0, 1.8, 4] });
    }, biome);
    await page.waitForTimeout(500);
    const frame = await page.evaluate(() => window.__lightingCapture());
    environments.push({ biome, brightness: frame.brightness });
    writeFileSync(`output/playwright/block-lighting/${biome}.png`, Buffer.from(frame.image.split(",")[1], "base64"));
    assert.ok(frame.brightness > 22, `${biome}: practical lights reveal the environment without a lantern (${frame.brightness})`);
  }
  assert.match(await page.locator('[data-testid="stealth-status"]').innerText(), /VISIBILITY.*(light|shadow)/);
  const depths = [];
  for (const floor of [1, 2, 3]) {
    await page.evaluate(({ fixture, floor }) => window.__run.setState({ dungeon: fixture.dungeon,
      currentRoomId: fixture.roomId, floor, glim: 0, paused: true }), { fixture, floor });
    await page.waitForTimeout(400);
    const frame = await page.evaluate(() => window.__lightingCapture());
    const fill = await page.evaluate(() => {
      let ambient;
      window.__scene.traverse(object => { if (object.isAmbientLight) ambient = object.intensity; });
      return ambient;
    });
    depths.push({ floor, brightness: frame.brightness, ambient: fill });
    writeFileSync(`output/playwright/block-lighting/depth-${floor}.png`, Buffer.from(frame.image.split(",")[1], "base64"));
    assert.ok(frame.brightness > 12, `depth ${floor} retains empty-lantern navigation (${frame.brightness})`);
  }
  assert.ok(depths[0].ambient > depths[1].ambient && depths[1].ambient > depths[2].ambient,
    "mounted fill preserves each descent's lighting change");
  assert.ok(depths[0].brightness > depths[2].brightness * 1.04, "descent is visible in the rendered room");
  const contact = await page.evaluate(async () => {
    const { generateDungeon } = await import("/src/game/dungeon/generate.ts");
    const { gemFor } = await import("/src/game/rooms/kinds.ts");
    const { floorHeightAt } = await import("/src/game/worldbuilding/elevation.ts");
    for (let seed = 1; seed < 100; seed++) {
      const dungeon = generateDungeon({ seed, floor: 2 });
      for (const room of dungeon.rooms) {
        const gem = gemFor(room, dungeon.seed);
        if (gem && floorHeightAt(room, gem[0], gem[2]) > 0.5) {
          window.__run.setState({ dungeon, floor: 2, currentRoomId: room.id, gemRooms: [], paused: true });
          return { roomId: room.id, gem, height: floorHeightAt(room, gem[0], gem[2]) };
        }
      }
    }
    throw Error("No raised gem contact fixture");
  });
  await page.waitForFunction(id => window.__blockLighting.roomId === id && !!window.__scene.getObjectByName("prop-contact-shadows"), contact.roomId);
  const shadowBefore = await page.evaluate(({ gem, height }) => {
    const geometry = window.__scene.getObjectByName("prop-contact-shadows").geometry;
    const points = geometry.attributes.position;
    let raised = 0;
    for (let i = 0; i < points.count; i++) if (Math.abs(points.getX(i) - gem[0]) < 0.56 && Math.abs(points.getZ(i) - gem[2]) < 0.56 && points.getY(i) >= height + 0.03) raised++;
    return { indices: geometry.index.count, raised };
  }, contact);
  assert.ok(shadowBefore.raised >= 4, "the rendered gem contact reaches its actual raised landing");
  await page.evaluate(({ roomId, gem }) => {
    window.__run.setState({ paused: false, transitioning: false, inputLocks: 0 });
    window.__run.getState().collectGem(roomId, [gem[0], gem[2]]);
    window.__run.getState().pause();
  }, contact);
  await page.waitForFunction(before => window.__scene.getObjectByName("prop-contact-shadows").geometry.index.count < before, shadowBefore.indices);
  assert.ok(await page.evaluate(id => window.__run.getState().gemRooms.includes(id), contact.roomId), "pickup and its contact share the collection owner");
  await page.evaluate(fixture => window.__run.setState({ dungeon: fixture.dungeon, floor: 2,
    currentRoomId: fixture.roomId, gemRooms: [], paused: true }), fixture);
  await page.waitForFunction(id => window.__blockLighting.roomId === id, fixture.roomId);
  // Render opposite faces of one real, patched material under a single source.
  // Both camera directions must agree on the world-space light direction, even
  // after rotating an instance. This catches normal-space and batching mistakes.
  await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const originals = window.__scene.children.map(object => [object, object.visible]);
    for (const [object] of originals) object.visible = false;
    const group = new T.Group();
    const geometry = new T.BoxGeometry(0.6, 0.6, 0.6);
    const material = new T.MeshStandardMaterial({ color: "#808080", roughness: 1 });
    const cube = new T.InstancedMesh(geometry, material, 1);
    const matrix = new T.Matrix4().setPosition(0.5, 1, 0.5);
    cube.setMatrixAt(0, matrix); cube.instanceMatrix.needsUpdate = true;
    const light = new T.PointLight("#ffffff", 14, 10); light.position.set(4.5, 1, 0.5);
    group.add(cube, light); window.__scene.add(group);
    const renderer = (await import("/scripts/review-renderer.mjs")).createReviewRenderer(T, window.__scene, { antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(64, 64);

    const camera = new T.PerspectiveCamera(40, 1, 0.1, 20);
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    window.__directionCapture = (side, vertical = false) => {
      camera.up.set(0, vertical ? 0 : 1, vertical ? -1 : 0);
      camera.position.set(0.5 + (vertical ? 0 : side * 3), 1 + (vertical ? side * 3 : 0), 0.5); camera.lookAt(0.5, 1, 0.5);
      renderer.render(window.__scene, camera); ctx.drawImage(renderer.domElement, 0, 0);
      const pixels = ctx.getImageData(28, 28, 8, 8).data;
      let sum = 0;
      for (let i = 0; i < pixels.length; i += 4) sum += pixels[i];
      return sum / 64;
    };
    window.__rotateDirectionFixture = () => {
      matrix.makeRotationY(Math.PI / 2).setPosition(0.5, 1, 0.5);
      cube.setMatrixAt(0, matrix); cube.instanceMatrix.needsUpdate = true;
    };
    window.__heightDirectionFixture = y => light.position.set(0.5, y, 0.5);
    window.__materialDirectionFixture = roughness => {
      light.position.set(4.5, 1, 0.5); material.metalness = 0.8; material.roughness = roughness;
    };
    window.__disposeDirectionFixture = () => {
      window.__scene.remove(group); renderer.dispose(); geometry.dispose(); material.dispose();
      for (const [object, visible] of originals) object.visible = visible;
    };
  });
  await page.waitForFunction(() => window.__blockLighting.sources === 1);
  const angular = await page.evaluate(() => ({ toward: window.__directionCapture(1), away: window.__directionCapture(-1) }));
  assert.ok(angular.toward > angular.away * 1.15, `lamp-facing surfaces gain depth: ${JSON.stringify(angular)}`);
  assert.ok(angular.away > 20, "indirect bounce keeps the opposing face readable");
  await page.evaluate(() => window.__rotateDirectionFixture());
  const rotated = await page.evaluate(() => ({ toward: window.__directionCapture(1), away: window.__directionCapture(-1) }));
  assert.ok(Math.abs(rotated.toward - angular.toward) < 2 && Math.abs(rotated.away - angular.away) < 2,
    "instance rotation preserves world-space shading");
  await page.evaluate(() => window.__heightDirectionFixture(4));
  await page.waitForTimeout(250);
  const overhead = await page.evaluate(() => ({ top: window.__directionCapture(1, true), underside: window.__directionCapture(-1, true) }));
  assert.ok(overhead.top > overhead.underside * 1.15, `overhead lamps light upper surfaces: ${JSON.stringify(overhead)}`);
  await page.evaluate(() => window.__heightDirectionFixture(0.2));
  await page.waitForTimeout(250);
  const beneath = await page.evaluate(() => ({ top: window.__directionCapture(1, true), underside: window.__directionCapture(-1, true) }));
  assert.ok(beneath.underside > beneath.top * 1.15, `lamps below geometry light its underside: ${JSON.stringify(beneath)}`);
  await page.evaluate(() => window.__materialDirectionFixture(1));
  await page.waitForTimeout(250);
  const roughMetal = await page.evaluate(() => window.__directionCapture(1));
  await page.evaluate(() => window.__materialDirectionFixture(0.3));
  const polishedMetal = await page.evaluate(() => window.__directionCapture(1));
  assert.ok(polishedMetal > roughMetal + 8, `authored roughness controls practical highlights: ${roughMetal} → ${polishedMetal}`);
  assert.ok(polishedMetal < 245, "broad highlights retain headroom instead of clipping to white");
  await page.evaluate(() => window.__disposeDirectionFixture());
  // Return to the original floor before resource comparisons; ids are floor-local.
  await page.evaluate(fixture => window.__run.setState({ dungeon: fixture.dungeon, floor: 2, currentRoomId: fixture.roomId }), fixture);
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
  await page.evaluate(async () => {
    window.__run.setState({ glim: 100, oil: 100, paused: false, pausedAt: 0, inputLocks: 0, transitioning: false });
    window.__bus.emit("teleport", { position: [0, 1.8, 4], yaw: 0 });
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "output/playwright/block-lighting/desktop.png" });
  await page.evaluate(() => window.__run.getState().pause());
  await page.waitForTimeout(100);
  const pose = () => {
    const hand = window.__scene.getObjectByName("shove-hand").children[0];
    return [...hand.position.toArray(), ...hand.rotation.toArray()];
  };
  const pausedPose = await page.evaluate(pose);
  await page.waitForTimeout(350);
  assert.deepEqual(await page.evaluate(pose), pausedPose, "hand pose freezes while paused");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__run.getState().resume());
  await page.waitForTimeout(300);
  await page.screenshot({ path: "output/playwright/block-lighting/portrait.png" });
  assert.ok(await page.evaluate(() => window.__scene.getObjectByName("shove-hand").scale.x < 0.5), "hand fits portrait view");
  const portrait = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const root = window.__scene.getObjectByName("shove-hand");
    const camera = new T.PerspectiveCamera(window.__world.CAMERA_FOV, innerWidth / innerHeight, 0.1, 120);
    camera.position.copy(root.position); camera.quaternion.copy(root.quaternion); camera.updateMatrixWorld();
    const palm = root.getObjectByName("hand-palm").getWorldPosition(new T.Vector3()).project(camera);
    const hud = document.querySelector('[data-testid="hud"]').getBoundingClientRect();
    const map = document.querySelector('[data-testid="minimap"]').getBoundingClientRect();
    return { palm: palm.toArray(), hudBottom: hud.bottom, hudRight: hud.right, mapLeft: map.left };
  });
  assert.ok(Math.abs(portrait.palm[0]) < 0.9 && Math.abs(portrait.palm[1]) < 0.9, "palm stays inside the portrait camera frame");
  assert.ok(portrait.hudBottom < 844 * 0.45 && portrait.hudRight < portrait.mapLeft, "compact HUD leaves the view clear and does not overlap the map");
  assert.deepEqual(errors, [], "no runtime or shader errors");
  console.log(JSON.stringify({ pass: true, dark: dark.brightness, raised: raised.brightness, bands,
    sources, settled, environments, depths, angular, rotated, overhead, beneath, roughMetal, polishedMetal, probe: raised.probe }, null, 2));
} finally { await browser.close(); }
