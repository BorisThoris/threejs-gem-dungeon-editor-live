import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { chromium } from "./browser-safety.mjs";

const output = resolve("output/playwright/warden");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5199}/`);
  await page.getByTestId("menu-start").click();
  await page.waitForFunction(() => window.__run?.getState().phase === "playing" && !window.__run.getState().transitioning);
  await page.evaluate(() => window.__run.getState().startRun(11));
  await page.waitForFunction(() => !window.__run.getState().transitioning && !!window.__playerDebug);
  await page.evaluate(() => {
    const s = window.__run.getState();
    window.__run.setState({ floorRooms: 1, alarm: 3, wardenRoomId: s.currentRoomId,
      wardenCameFrom: null, harrierAwake: false, reaperAwake: false, thiefPhase: "away",
      invulnerableUntil: 1e9, glim: 0, noisyUntil: 0 });
  });
  await page.waitForFunction(() => !!window.__scene.getObjectByName("warden-posture") && !!window.__warden);
  await page.evaluate(() => window.__scene.getObjectByName("creature-warden").position.set(0, 0, 0));
  const pose = () => {
    const g = window.__scene.getObjectByName("creature-warden"), p = g.getObjectByName("warden-posture");
    const hood = g.getObjectByName("warden-hood"), arm = g.getObjectByName("warden-arm-0");
    return { tell: window.__warden.tell, scale: p.scale.y, tilt: p.rotation.x,
      hood: hood.rotation.x, arm: arm.rotation.x, facing: g.rotation.y,
      position: g.position.toArray(), clock: window.__derived.clock() };
  };
  const stand = async distance => {
    await page.evaluate(distance => {
      const g = window.__scene.getObjectByName("creature-warden");
      const x = g.position.x + Math.sin(g.rotation.y) * distance;
      const z = g.position.z + Math.cos(g.rotation.y) * distance;
      window.__bus.emit("teleport", { position: [x, 1.5, z] });
      window.__bus.emit("lookSet", { yaw: g.rotation.y, pitch: 0 });
    }, distance);
  };
  const capture = async name => {
    const data = await page.evaluate(async () => {
      const T = await import("/node_modules/three/build/three.module.js");
      const scene = window.__scene, g = scene.getObjectByName("creature-warden");
      scene.updateMatrixWorld(true);
      const camera = new T.PerspectiveCamera(55, 4 / 3, .05, 100);
      camera.position.set(g.position.x + Math.sin(g.rotation.y + .3) * 4,
        g.position.y + 1.6, g.position.z + Math.cos(g.rotation.y + .3) * 4);
      camera.lookAt(g.position.x, g.position.y + 1.25, g.position.z);
      const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true });
      const hand = scene.getObjectByName("shove-hand"), handVisible = hand?.visible;
      if (hand) hand.visible = false;
      renderer.setSize(800, 600); renderer.render(scene, camera);
      if (hand) hand.visible = handVisible;
      const image = renderer.domElement.toDataURL(); renderer.dispose();
      return image.split(",")[1];
    });
    writeFileSync(join(output, `${name}.png`), Buffer.from(data, "base64"));
  };
  await stand(5);
  await page.waitForFunction(() => window.__warden.tell < .1);
  await page.evaluate(() => window.__run.getState().pause());
  const distant = await page.evaluate(pose);
  await capture("distant");
  await page.evaluate(() => window.__run.getState().resume());
  await stand(2);
  await page.waitForFunction(() => window.__warden.tell > .5);
  await page.evaluate(() => window.__run.getState().pause());
  const close = await page.evaluate(pose);
  assert.ok(close.arm < distant.arm - .4, "approach warning reaches forward through body posture");
  await capture("approach");
  await page.waitForTimeout(350);
  assert.deepEqual(await page.evaluate(pose), close, "pause freezes the full warning pose and clock");
  await page.evaluate(() => window.__run.getState().resume());
  await stand(1.8);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__derived.warden().staggered);
  await page.waitForFunction(() => window.__scene.getObjectByName("warden-posture").scale.y < .9);
  await page.evaluate(() => window.__run.getState().pause());
  const stagger = await page.evaluate(pose);
  assert.equal(stagger.tell, 0, "a real shove suppresses the ready-to-strike warning");
  assert.ok(stagger.arm > 0 && stagger.hood > .2 && stagger.tilt > .1, "stagger drops the arms and bows the hood");
  await capture("stagger");
  await page.waitForTimeout(1200);
  assert.deepEqual(await page.evaluate(pose), stagger, "pause preserves the visible escape window");
  const resources = await page.evaluate(async () => {
    const { Box3 } = await import("/node_modules/three/build/three.module.js");
    const { floorHeightAt } = await import("/src/game/worldbuilding/elevation.ts");
    let meshes = 0, triangles = 0;
    const g = window.__scene.getObjectByName("creature-warden");
    g.updateWorldMatrix(true, true);
    g.traverse(o => {
      if (!o.isMesh) return;
      meshes++;
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    });
    const s = window.__run.getState(), room = s.dungeon.rooms.find(r => r.id === s.currentRoomId);
    return { meshes, triangles, clearance: new Box3().setFromObject(g).min.y - floorHeightAt(room, g.position.x, g.position.z) };
  });
  assert.ok(resources.meshes <= 6 && resources.triangles < 486, "readable silhouette stays within the previous body's rendering cost");
  assert.ok(resources.clearance >= 0, "slumping never drives the hem into the floor");
  await page.evaluate(() => window.__run.getState().resume());
  await stand(5);
  await page.waitForFunction(() => !window.__derived.warden().staggered);
  await page.waitForFunction(() => window.__scene.getObjectByName("warden-posture").scale.y === 1);
  assert.equal((await page.evaluate(pose)).tilt, 0, "recovery restores the upright silhouette");
  assert.deepEqual(errors, []);
  console.log("PASS Warden: readable approach, real shove slump, pause, recovery and bounded geometry", resources);
} finally { await browser.close(); }
